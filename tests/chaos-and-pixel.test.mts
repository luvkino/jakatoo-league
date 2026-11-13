import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath } from "node:url";

// Allow Node --experimental-strip-types to resolve extensionless relative .ts imports used by Next.js/TS
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith(".") && !specifier.endsWith(".ts") && !specifier.endsWith(".mts") && context.parentURL) {
      const candidate = new URL(specifier + ".ts", context.parentURL);
      if (existsSync(fileURLToPath(candidate))) {
        return nextResolve(candidate.href, context);
      }
    }
    return nextResolve(specifier, context);
  },
});

const { computeLeague } = await import("../src/lib/stats.ts");
const {
  getLeagueSpotlight,
  getPlayerRpgProfile,
  LAST_PLACE_TITLES,
  LEADER_MESSAGES,
} = await import("../src/lib/chaos.ts");
const { getPlayerSpecificTrashTalk, getTrashPoolSize, pickTrashTalk } = await import("../src/lib/trashTalk.ts");
const { generateRandomChaosEvent, rollRarity } = await import("../src/lib/events.ts");

const names = ["أحمد", "سالم", "خالد", "فيصل", "عمر", "بدر"];
const players = names.map((n, i) => ({
  id: `p${i + 1}`,
  name: n,
  archived: false,
  createdAt: "2026-01-01T00:00:00Z",
}));
const nameMap = new Map(players.map((p) => [p.id, p.name]));
const nameOf = (id: string) => nameMap.get(id) ?? "غير معروف";

const mk = (id: string, t1: [string, string], t2: [string, string], w: 1 | 2, stones: number, comeback = false) => ({
  id,
  seasonId: "s1",
  t1,
  t2,
  winningTeam: w,
  stones,
  comeback,
  note: null,
  playedAt: "2026-01-02T00:00:00Z",
});

// 1. Empty league spotlight
const emptyLg = computeLeague(players, []);
const emptySpot = getLeagueSpotlight(emptyLg);
assert.equal(emptySpot.leader, null);
assert.equal(emptySpot.lastPlace, null);

// 2. Active matches: p1+p2 dominate p3+p4; p5+p6 never played so they are NOT marked last place
const ms1 = [
  mk("m1", ["p1", "p2"], ["p3", "p4"], 1, 6, true),
  mk("m2", ["p1", "p2"], ["p3", "p4"], 1, 4, false),
];
const lg1 = computeLeague(players, ms1);
const spot1 = getLeagueSpotlight(lg1);
assert.ok(spot1.leader);
assert.ok(spot1.lastPlace);
assert.equal(spot1.playedCount, 4);
assert.ok(["p1", "p2"].includes(spot1.leader!.id));
assert.ok(["p3", "p4"].includes(spot1.lastPlace!.id));
assert.notEqual(spot1.leader!.id, spot1.lastPlace!.id);

// 3. Dynamic update when standings flip (tied first -> gap 0, then solo leader -> gap 3)
const ms2 = [
  ...ms1,
  mk("m3", ["p1", "p2"], ["p3", "p4"], 2, 7, true),
  mk("m4", ["p1", "p2"], ["p3", "p4"], 2, 5, false),
  mk("m5", ["p1", "p2"], ["p3", "p4"], 2, 3, false),
];
const lg2 = computeLeague(players, ms2);
const spot2 = getLeagueSpotlight(lg2);
assert.ok(["p3", "p4"].includes(spot2.leader!.id));
assert.ok(["p1", "p2"].includes(spot2.lastPlace!.id));
assert.equal(spot2.leaderGap, 0);

const ms3 = [...ms2, mk("m6", ["p3", "p5"], ["p1", "p2"], 1, 2, false)];
const lg3 = computeLeague(players, ms3);
const spot3 = getLeagueSpotlight(lg3);
assert.equal(spot3.leader!.id, "p3");
assert.equal(spot3.leaderGap, 3);

// 4. Required Arabic titles/messages exist
assert.ok(LEADER_MESSAGES.includes("ملك الدوري بلا منازع."));
assert.ok(LEADER_MESSAGES.includes("الزعيم وصل، انتهى النقاش."));
for (const expected of [
  "حصالة الدوري",
  "ذيل الدوري",
  "قاع الترتيب",
  "وزارة الهزائم",
  "مشروع لاعب",
  "مواطن المركز الأخير",
  "آخر الناجين",
  "صاحب المقعد الدائم",
]) {
  assert.ok(LAST_PLACE_TITLES.includes(expected as (typeof LAST_PLACE_TITLES)[number]));
}

// 5. RPG profile bounds and pure derivation
for (const r of lg2.ranking) {
  const rpg = getPlayerRpgProfile(r, {
    isLeader: r.id === spot2.leader?.id,
    isLastPlace: r.id === spot2.lastPlace?.id,
  });
  assert.ok(rpg.level >= 1);
  assert.ok(rpg.xpPct >= 0 && rpg.xpPct <= 100);
  for (const attr of rpg.attributes) {
    assert.ok(attr.value >= 0 && attr.value <= 100);
  }
}

// 6. Trash talk pool size, context awareness & anti-repeat
assert.ok(getTrashPoolSize() >= 45, "Trash talk pool should be large");
const seenIds = new Set<string>();
for (let i = 0; i < 15; i++) {
  const msg = pickTrashTalk(lg2, ms2, nameOf, { allowRare: false });
  assert.ok(msg.text.length > 0);
  assert.ok(!seenIds.has(msg.id), `Should not repeat message ${msg.id} within 15 picks`);
  seenIds.add(msg.id);
}
const leaderBanter = getPlayerSpecificTrashTalk(players[2], lg2, ms2, nameOf);
assert.ok(leaderBanter.text.length > 0);

// 7. Event rarity distribution & generation
assert.equal(rollRarity(0.005), "LEGENDARY");
assert.equal(rollRarity(0.05), "EPIC");
assert.equal(rollRarity(0.20), "RARE");
assert.equal(rollRarity(0.80), "COMMON");
for (const rarity of ["COMMON", "RARE", "EPIC", "LEGENDARY"] as const) {
  const ev = generateRandomChaosEvent(lg2, ms2, nameOf, rarity);
  assert.equal(ev.rarity, rarity);
  assert.ok(ev.title.length > 0 && ev.message.length > 0);
  assert.ok(ev.effects.length > 0);
}

console.log("chaos & pixel tests passed");
