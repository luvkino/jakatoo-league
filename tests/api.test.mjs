// Integration tests against a running server: BASE=http://127.0.0.1:3100 BAD=http://127.0.0.1:3101 node tests/api.test.mjs
import assert from "node:assert/strict";

const BASE = process.env.BASE ?? "http://127.0.0.1:3100";
const BAD = process.env.BAD; // server started with an unreachable DATABASE_URL
const PASSWORD = process.env.ADMIN_PASSWORD ?? "jackaroo";
let cookie = "";
let passed = 0;
const ok = (name) => console.log(`  ✓ ${name}`) || passed++;

async function req(path, { method = "GET", body, auth = true, base = BASE, ck } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: { "Content-Type": "application/json", ...(auth && (ck ?? cookie) ? { cookie: ck ?? cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, json, res, text };
}
const addPlayer = (name, opts) => req("/api/players", { method: "POST", body: { name }, ...opts });

// ---- permissions
let r = await addPlayer("زائر", { auth: false });
assert.equal(r.status, 403); assert.equal(r.json.code, "FORBIDDEN"); assert.match(r.json.message, /صلاحية/);
ok("unauthorized viewer cannot add players (403 + Arabic message)");

r = await req("/api/session", { method: "POST", body: { password: "wrong" }, auth: false });
assert.equal(r.status, 401);
ok("wrong password rejected");
r = await req("/api/session", { method: "POST", body: { password: PASSWORD }, auth: false });
assert.equal(r.status, 200);
cookie = r.res.headers.get("set-cookie").split(";")[0];
r = await req("/api/session");
assert.equal(r.json.isAdmin, true);
r = await req("/api/session", { auth: false });
assert.equal(r.json.isAdmin, false);
ok("admin recognised via session; viewer is viewer");

r = await req("/api/session", { auth: true, ck: "jl_session=admin.9999999999999.deadbeef" });
assert.equal(r.json.isAdmin, false);
ok("forged session cookie rejected");

// ---- validation
for (const bad of ["", "   ", "\u200b "]) {
  r = await addPlayer(bad);
  assert.equal(r.status, 400); assert.equal(r.json.code, "EMPTY_NAME");
}
ok("empty / whitespace name rejected with Arabic error");

// ---- add players
r = await addPlayer("أحمد"); assert.equal(r.status, 201); assert.equal(r.json.player.name, "أحمد");
assert.ok(r.json.player.id); assert.equal(r.json.player.archived, false);
ok("add one Arabic player");
r = await addPlayer("Ali"); assert.equal(r.status, 201);
ok("add English player");
r = await addPlayer("   سالم   بن   علي  "); assert.equal(r.status, 201); assert.equal(r.json.player.name, "سالم بن علي");
ok("leading/trailing/multiple spaces trimmed");

for (const dup of ["أحمد", "احمد", "إحمد", "  أحمد  ", "ali", "ALI ", "سالم بن علي"]) {
  r = await addPlayer(dup);
  assert.equal(r.status, 409, `dup ${dup}`); assert.equal(r.json.code, "DUPLICATE"); assert.match(r.json.message, /موجود بالفعل/);
}
ok("duplicates rejected (case-insensitive, Arabic-normalised, spaces)");

// 25 more players, consecutively (> 8, > 20)
for (let i = 1; i <= 25; i++) {
  r = await addPlayer(`لاعب ${i}`);
  assert.equal(r.status, 201, `player ${i}: ${r.text}`);
}
ok("added 25 consecutive players (no 8-player limit)");

// concurrent duplicate race -> exactly one wins
const race = await Promise.all(Array.from({ length: 6 }, () => addPlayer("سباق")));
assert.equal(race.filter((x) => x.status === 201).length, 1);
assert.equal(race.filter((x) => x.status === 409).length, 5);
ok("concurrent duplicate submissions create exactly one player");

// persistence + other device (no cookie = fresh viewer)
r = await req("/api/data", { auth: false });
assert.equal(r.status, 200);
const names = r.json.players.map((p) => p.name);
assert.ok(names.length >= 29, `players=${names.length}`);
for (const n of ["أحمد", "Ali", "سالم بن علي", "لاعب 25", "سباق"]) assert.ok(names.includes(n), n);
assert.equal(r.json.isAdmin, false);
assert.equal(r.json.seasons.filter((s) => s.status === "active").length, 1);
ok("all players persisted and visible to another device (viewer)");

// ---- matches
const P = Object.fromEntries(r.json.players.map((p) => [p.name, p.id]));
const [a, b, c, d, e] = [P["أحمد"], P["Ali"], P["لاعب 1"], P["لاعب 2"], P["لاعب 3"]];
const match = (over = {}) => req("/api/matches", { method: "POST", body: { t1: [a, b], t2: [c, d], winningTeam: 1, stones: 4, comeback: false, ...over } });
r = await match({ winningTeam: 0 }); assert.equal(r.status, 400); assert.equal(r.json.code, "NO_WINNER");
r = await match({ t2: [c, a] }); assert.equal(r.status, 400); assert.equal(r.json.code, "DUPLICATE_PLAYERS");
r = await match({ stones: 9 }); assert.equal(r.status, 400); assert.equal(r.json.code, "INVALID_STONES");
r = await match({ stones: -1 }); assert.equal(r.status, 400);
r = await match({ stones: 2.5 }); assert.equal(r.status, 400);
r = await match({ t1: [a] }); assert.equal(r.status, 400);
ok("match validation (4 distinct players, winner, stones 0-8)");
r = await req("/api/matches", { method: "POST", auth: false, body: { t1: [a, b], t2: [c, d], winningTeam: 1, stones: 4 } });
assert.equal(r.status, 403);
ok("viewer cannot record matches");
r = await match(); assert.equal(r.status, 201); const m1 = r.json.match;
assert.equal(m1.stones, 4); assert.equal(m1.winningTeam, 1);
r = await match({ stones: 0, winningTeam: 2 }); assert.equal(r.status, 201);
r = await match({ t1: [a, e], t2: [c, d], stones: 8, comeback: true }); assert.equal(r.status, 201);
ok("matches recorded with stones 0..8");

// edit + delete
r = await req(`/api/matches/${m1.id}`, { method: "PATCH", body: { t1: [a, b], t2: [c, d], winningTeam: 2, stones: 3, comeback: false } });
assert.equal(r.status, 200); assert.equal(r.json.match.winningTeam, 2); assert.equal(r.json.match.stones, 3);
r = await req("/api/matches/" + "00000000-0000-4000-8000-000000000000", { method: "DELETE" });
assert.equal(r.status, 404);
ok("match edit works; unknown match 404");

// safe player archival keeps history
r = await req(`/api/players/${d}`, { method: "DELETE" });
assert.equal(r.status, 409); assert.equal(r.json.code, "HAS_MATCHES");
r = await req(`/api/players/${d}`, { method: "PATCH", body: { archived: true } });
assert.equal(r.status, 200); assert.equal(r.json.player.archived, true);
r = await match({ t2: [c, d] }); assert.equal(r.status, 400); assert.equal(r.json.code, "ARCHIVED_PLAYER");
r = await req("/api/data", { auth: false });
assert.ok(r.json.matches.some((m) => m.t2.includes(d)), "history preserved");
ok("player with matches cannot be hard-deleted; archive keeps history; archived excluded from new matches");
const fresh = P["لاعب 25"];
r = await req(`/api/players/${fresh}`, { method: "DELETE" });
assert.equal(r.status, 200);
ok("player without matches can be deleted");
r = await req(`/api/players/${P["لاعب 24"]}`, { method: "PATCH", body: { name: "أحمد" } });
assert.equal(r.status, 409);
r = await req(`/api/players/${P["لاعب 24"]}`, { method: "PATCH", body: { name: "لاعب جديد" } });
assert.equal(r.status, 200);
ok("rename with duplicate check");

// seasons keep history
const before = (await req("/api/data", { auth: false })).json;
r = await req("/api/seasons", { method: "POST", body: { name: "موسم 2" } });
assert.equal(r.status, 201);
const after = (await req("/api/data", { auth: false })).json;
assert.equal(after.matches.length, before.matches.length);
assert.equal(after.seasons.filter((s) => s.status === "active").length, 1);
assert.equal(after.seasons.length, before.seasons.length + 1);
r = await req("/api/matches", { method: "POST", body: { t1: [a, b], t2: [c, e], winningTeam: 1, stones: 1 } });
assert.equal(r.status, 201);
assert.notEqual(r.json.match.seasonId, m1.seasonId);
ok("new season keeps old matches/seasons; new matches go to the active season");

// export / import
r = await req("/api/export?format=json");
assert.equal(r.status, 200); const backup = JSON.parse(r.text);
r = await req("/api/export?format=json", { auth: false }); assert.equal(r.status, 403);
r = await req("/api/export?format=csv&kind=matches"); assert.equal(r.status, 200); assert.ok(r.text.includes("الفريق الأول"));
r = await req("/api/export?format=csv&kind=players"); assert.equal(r.status, 200);
r = await req("/api/import", { method: "POST", body: { data: { ...backup, matches: [{ ...backup.matches[0], stones: 99 }] }, confirm: true } });
assert.equal(r.status, 400);
r = await req("/api/import", { method: "POST", body: { data: { version: 1, players: [], seasons: [], matches: "x" }, confirm: true } });
assert.equal(r.status, 400);
assert.equal((await req("/api/data", { auth: false })).json.players.length, after.players.length - 0);
r = await req("/api/import", { method: "POST", body: { data: backup } });
assert.equal(r.status, 200); assert.equal(r.json.validated, true); assert.equal(r.json.summary.matches, backup.matches.length);
r = await req("/api/import", { method: "POST", body: { data: backup, confirm: true } });
assert.equal(r.status, 200);
const restored = (await req("/api/data", { auth: false })).json;
assert.equal(restored.players.length, backup.players.length);
assert.equal(restored.matches.length, backup.matches.length);
ok("export (json/csv), validated import (invalid rejected, nothing changed), restore round-trips");

r = await req("/api/audit");
assert.equal(r.status, 200); assert.ok(r.json.entries.some((x) => x.action === "player.create"));
assert.ok(r.json.entries.some((x) => x.action === "match.create") && r.json.entries.some((x) => x.action === "season.create"));
r = await req("/api/audit", { auth: false }); assert.equal(r.status, 403);
ok("audit log recorded (admin only)");

// ---- database unavailable
if (BAD) {
  r = await req("/api/session", { base: BAD, ck: cookie });
  assert.equal(r.json.isAdmin, true);
  r = await req("/api/players", { base: BAD, method: "POST", body: { name: "لن يُحفظ" }, ck: cookie });
  assert.equal(r.status, 503); assert.equal(r.json.code, "DB_UNAVAILABLE"); assert.match(r.json.message, /قاعدة البيانات/);
  r = await req("/api/data", { base: BAD });
  assert.equal(r.status, 503);
  ok("DB down: clear 503 Arabic error, never a fake success; session still recognises admin");
}
console.log(`\n${passed} API test groups passed`);
