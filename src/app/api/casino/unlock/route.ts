import { NextResponse, type NextRequest } from "next/server";
import {
  CASINO_COOKIE,
  casinoCookieOptions,
  checkUnlockRate,
  makeCasinoToken,
  verifyCasinoCode,
} from "@/lib/casino-security";

export const dynamic = "force-dynamic";

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? req.headers.get("cf-connecting-ip") ?? "unknown";
}

/**
 * POST /api/casino/unlock
 * Body: { code } — the completed candidate sequence.
 *
 * Rate-limited (5 / min / IP). On success sets the signed session cookie.
 * Failures are generic: the response never reveals whether the code exists,
 * whether the server is configured, or how many attempts remain.
 */
export async function POST(req: NextRequest) {
  if (!checkUnlockRate(clientIp(req))) {
    return NextResponse.json(
      { ok: false, code: "RATE_LIMITED", message: "محاولة أخرى لاحقاً." },
      { status: 429, headers: { "Cache-Control": "no-store" } },
    );
  }

  let code: unknown;
  try {
    const body = await req.json();
    code = body && typeof body === "object" ? (body as { code?: unknown }).code : undefined;
  } catch {
    code = undefined;
  }

  if (!verifyCasinoCode(code)) {
    return NextResponse.json(
      { ok: false, code: "UNAUTHORIZED", message: "بيانات غير صالحة." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const res = NextResponse.json(
    { ok: true, authorized: true },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
  res.cookies.set(CASINO_COOKIE, makeCasinoToken(), casinoCookieOptions);
  return res;
}
