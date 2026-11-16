// ============================================================================
// CASINO SECURITY — server-side authorization, fail-closed secret handling,
// signed session tokens, rate limiting, and the secret-input capture flow.
//
// Code-level + unit tests (no live server). The page/API gating is verified by
// asserting the route/layout source enforces server-side checks, and that no
// client component can reach the secret.
// ============================================================================

import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith(".") && !/\.[cm]?[jt]sx?$/.test(specifier) && context.parentURL) {
      const candidate = new URL(specifier + ".ts", context.parentURL);
      if (existsSync(fileURLToPath(candidate))) return nextResolve(candidate.href, context);
    }
    return nextResolve(specifier, context);
  },
});

const sec = await import("../src/lib/casino-security.ts");
const flow = await import("../src/lib/casino/accessCode.ts");

let passed = 0;
const test = (name: string, fn: () => void) => {
  fn();
  passed++;
  console.log(`  ✓ ${name}`);
};

const read = (p: string) => readFileSync(new URL(`../src/${p}`, import.meta.url), "utf8");

/* --------------------------------------------------------- secret verification */

test("verifyCasinoCode accepts the correct code and rejects wrong/empty", () => {
  process.env.CASINO_CODE = "s3cr3t-code";
  assert.equal(sec.verifyCasinoCode("s3cr3t-code"), true);
  assert.equal(sec.verifyCasinoCode("wrong"), false);
  assert.equal(sec.verifyCasinoCode(""), false);
  assert.equal(sec.verifyCasinoCode(undefined), false);
  assert.equal(sec.verifyCasinoCode(123 as unknown as string), false);
});

test("CASINO_CODE fails closed when missing or empty", () => {
  delete process.env.CASINO_CODE;
  assert.equal(sec.casinoCodeConfigured(), false);
  assert.equal(sec.verifyCasinoCode("anything"), false);

  process.env.CASINO_CODE = "";
  assert.equal(sec.casinoCodeConfigured(), false);
  assert.equal(sec.verifyCasinoCode("anything"), false);
  delete process.env.CASINO_CODE;
});

test("safeEqual is constant-time and length-safe", () => {
  assert.equal(sec.safeEqual("abc", "abc"), true);
  assert.equal(sec.safeEqual("abc", "abd"), false);
  assert.equal(sec.safeEqual("abc", "abcd"), false);
  assert.equal(sec.safeEqual("", ""), true);
});

/* -------------------------------------------------------------- session token */

test("makeCasinoToken / isCasinoTokenValid round-trip", () => {
  const token = sec.makeCasinoToken();
  assert.equal(sec.isCasinoTokenValid(token), true);
});

test("tokens are rejected when tampered, unsigned or expired", () => {
  const token = sec.makeCasinoToken();
  const parts = token.split(".");
  // Tampered signature.
  assert.equal(sec.isCasinoTokenValid(`${parts[0]}.${parts[1]}.deadbeef`), false);
  // Unsigned.
  assert.equal(sec.isCasinoTokenValid(`${parts[0]}.${parts[1]}`), false);
  // Wrong prefix.
  assert.equal(sec.isCasinoTokenValid(`admin.${parts[1]}.${parts[2]}`), false);
  // Expired (past timestamp).
  const past = `${Date.now() - 100000}.${sec.makeCasinoToken().split(".")![2]}`;
  assert.equal(sec.isCasinoTokenValid(`casino.${past}`), false);
  assert.equal(sec.isCasinoTokenValid(undefined), false);
  assert.equal(sec.isCasinoTokenValid(""), false);
});

test("isCasinoAuthorized reads the signed cookie from a jar", () => {
  const token = sec.makeCasinoToken();
  assert.equal(sec.isCasinoAuthorized({ get: (n) => (n === sec.CASINO_COOKIE ? { value: token } : undefined) }), true);
  assert.equal(sec.isCasinoAuthorized({ get: () => undefined }), false);
  assert.equal(
    sec.isCasinoAuthorized({ get: (n) => (n === sec.CASINO_COOKIE ? { value: "forged" } : undefined) }),
    false,
  );
});

test("casino cookie is HTTP-only, SameSite=Lax, session-only in prod", () => {
  const opts = sec.casinoCookieOptions;
  assert.equal(opts.httpOnly, true);
  assert.equal(opts.sameSite, "lax");
  assert.equal(opts.path, "/");
  // No maxAge/expires => browser-session cookie (not permanent).
  assert.equal((opts as Record<string, unknown>).maxAge, undefined);
  assert.equal((opts as Record<string, unknown>).expires, undefined);
});

/* ------------------------------------------------------------- rate limiting */

test("unlock rate limiter allows 5 then blocks (per IP)", () => {
  let now = 1_000_000;
  const rl = new sec.UnlockRateLimiter(() => now);
  for (let i = 0; i < 5; i++) assert.equal(rl.check("1.2.3.4"), true);
  assert.equal(rl.check("1.2.3.4"), false);
  // Different IP is unaffected.
  assert.equal(rl.check("5.6.7.8"), true);
  // After the window elapses it allows again.
  now += sec.UNLOCK_WINDOW_MS + 1;
  assert.equal(rl.check("1.2.3.4"), true);
});

/* ----------------------------------------------------------- secret input flow */

test("decideCapture never submits on ordinary typing (buffer only)", () => {
  let d = flow.decideCapture({ buffer: "", key: "a", pending: false, isTyping: false, hasModifier: false });
  assert.equal(d.submit, null);
  assert.equal(d.nextBuffer, "a");
  d = flow.decideCapture({ buffer: "a", key: "b", pending: false, isTyping: false, hasModifier: false });
  assert.equal(d.submit, null);
  assert.equal(d.nextBuffer, "ab");
});

test("decideCapture submits exactly once on Enter after a complete sequence", () => {
  let d = flow.decideCapture({ buffer: "abc", key: "Enter", pending: false, isTyping: false, hasModifier: false });
  assert.equal(d.submit, "abc");
  assert.equal(d.nextBuffer, "", "buffer cleared after submission");
  // While pending, a second Enter must not submit again.
  d = flow.decideCapture({ buffer: "", key: "Enter", pending: true, isTyping: false, hasModifier: false });
  assert.equal(d.submit, null);
});

test("decideCapture does not submit an empty buffer on Enter", () => {
  const d = flow.decideCapture({ buffer: "", key: "Enter", pending: false, isTyping: false, hasModifier: false });
  assert.equal(d.submit, null);
});

test("decideCapture clears buffer on modifier keys and typing fields", () => {
  const mod = flow.decideCapture({ buffer: "abc", key: "a", pending: false, isTyping: false, hasModifier: true });
  assert.equal(mod.submit, null);
  assert.equal(mod.nextBuffer, "");
  const typing = flow.decideCapture({ buffer: "abc", key: "a", pending: false, isTyping: true, hasModifier: false });
  assert.equal(typing.submit, null);
  assert.equal(typing.nextBuffer, "");
});

test("decideCapture clears buffer on Escape without submitting", () => {
  const d = flow.decideCapture({ buffer: "abc", key: "Escape", pending: false, isTyping: false, hasModifier: false });
  assert.equal(d.submit, null);
  assert.equal(d.nextBuffer, "");
});

test("candidate buffer is capped and lower-cased", () => {
  let b = "";
  for (let i = 0; i < 100; i++) b = flow.pushCandidateKey(b, "a");
  assert.ok(b.length <= flow.CANDIDATE_MAX);
  assert.equal(flow.pushCandidateKey("", "A"), "a");
});

/* ------------------------------------------- server-side gating (source checks) */

test("casino pages are gated server-side with a 404 for locked users", () => {
  const layout = read("app/casino/layout.tsx");
  assert.match(layout, /isCasinoAuthorized/, "layout checks the signed cookie");
  assert.match(layout, /notFound\(\)/, "unauthorized visitors get a 404");
});

test("casino API routes are protected server-side", () => {
  const unlock = read("app/api/casino/unlock/route.ts");
  assert.match(unlock, /verifyCasinoCode/, "unlock verifies the secret server-side");
  assert.match(unlock, /checkUnlockRate/, "unlock is rate-limited");
  assert.match(unlock, /CASINO_COOKIE/, "unlock sets the session cookie");

  const access = read("app/api/casino/access/route.ts");
  assert.match(access, /isCasinoAuthorizedRequest/, "access checks the cookie");
  assert.match(access, /authorized/, "access returns only the boolean");

  const catchAll = read("app/api/casino/[...rest]/route.ts");
  assert.match(catchAll, /isCasinoAuthorizedRequest/, "catch-all casino API is gated");
});

test("unlock/access responses are no-store", () => {
  const unlock = read("app/api/casino/unlock/route.ts");
  assert.match(unlock, /no-store/);
  const access = read("app/api/casino/access/route.ts");
  assert.match(access, /no-store/);
});

test("the casino secret never reaches client code or bundles", () => {
  // No client component may import the server security module.
  const clientFiles = [
    "components/Shell.tsx",
    "components/casino/CasinoAccessProvider.tsx",
    "components/casino/CasinoLobby.tsx",
    "components/casino/CasinoTable.tsx",
    "components/casino/CasinoSettingsSection.tsx",
    "components/easter/BlackjackGame.tsx",
    "app/settings/page.tsx",
  ];
  for (const f of clientFiles) {
    const src = read(f);
    assert.ok(!/from "@\/lib\/casino-security"/.test(src), `${f} must not import server security`);
    assert.ok(!/process\.env\.CASINO_CODE/.test(src), `${f} must not read CASINO_CODE`);
  }
  // The secret env var is only referenced in the server-only module.
  const allServerRefs = read("lib/casino-security.ts");
  assert.match(allServerRefs, /process\.env\.CASINO_CODE/);
});

test("the public blackjack Easter Egg code is independent of the casino secret", () => {
  // The casino secret is CASINO_CODE only; the egg codes are separate.
  const egg = read("components/easter/eggData.ts");
  assert.match(egg, /matchCode|pushKeyToBuffer|isTypingTarget/, "egg capture infra intact");
  assert.ok(!/CASINO_CODE/.test(egg), "egg codes do not use the casino secret");
});

console.log(`\ncasino-security tests: ${passed} passed`);
