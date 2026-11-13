import assert from "node:assert/strict";
import { computeLeague, computeAchievements, headToHead, computeHallOfFame, fmtRate } from "../src/lib/stats.ts";

const names = ["A", "B", "C", "D", "E", "F"];
const players = names.map((n) => ({ id: n, name: n, archived: false, createdAt: "2025-01-01T00:00:00Z" }));
const season = { id: "s1", name: "S1", startDate: "2025-01-01T00:00:00Z", endDate: null, status: "active" as const };
let t = 0;
const mk = (t1: [string, string], t2: [string, string], w: 1 | 2, stones: number, comeback = false) => ({
  id: `m${++t}`, seasonId: "s1", t1, t2, winningTeam: w, stones, comeback, note: null,
  playedAt: new Date(Date.UTC(2025, 0, 1, 0, t)).toISOString(),
});

// A+B beat C+D 4 stones; A+B beat C+D 0 stones; C+D beat A+B 2 stones
const ms = [mk(["A", "B"], ["C", "D"], 1, 4), mk(["A", "B"], ["C", "D"], 1, 0), mk(["A", "B"], ["C", "D"], 2, 2)];
const lg = computeLeague(players, ms);
const A = lg.stats.get("A")!;
assert.equal(A.games, 3); assert.equal(A.wins, 2); assert.equal(A.losses, 1);
assert.equal(A.points, 6);
assert.equal(fmtRate(A.winRate), "66.67%");
assert.equal(A.stoneDiff, 4 + 0 - 2);
const C = lg.stats.get("C")!;
assert.equal(C.points, 3); assert.equal(C.stoneDiff, -4 - 0 + 2);
assert.equal(lg.stats.get("E")!.winRate, null);
assert.equal(fmtRate(null), "لم يلعب");
// ranking: A,B (6) first; C,D (3); E,F (0) at the bottom, but present
assert.deepEqual(lg.ranking.map((r) => r.id).slice(0, 2).sort(), ["A", "B"]);
assert.deepEqual(lg.ranking.slice(-2).map((r) => r.id), ["E", "F"]);
assert.equal(lg.ranking.length, 6);
// streaks: A: W W L
assert.equal(A.maxWin, 2); assert.equal(A.curWin, 0); assert.equal(A.curLose, 1); assert.equal(A.maxLose, 1);
assert.deepEqual(A.last5, ["W", "W", "L"]);
// partnerships
const ab = lg.pairs.find((p) => p.a === "A" && p.b === "B")!;
assert.equal(ab.games, 3); assert.equal(ab.wins, 2); assert.equal(ab.stoneDiff, 2);
// head to head: never teammates
const h = headToHead(ms, "A", "C");
assert.equal(h.games, 3); assert.equal(h.aWins, 2); assert.equal(h.aStoneDiff, 2);
assert.equal(headToHead(ms, "A", "B").games, 0);
assert.equal(lg.h2h.get("A")?.get("B"), undefined);
// stones 0 -> no stone diff but still points
const z = computeLeague(players, [mk(["E", "F"], ["A", "B"], 1, 0)]);
assert.equal(z.stats.get("E")!.points, 3); assert.equal(z.stats.get("E")!.stoneDiff, 0);
assert.equal(z.stats.get("A")!.stoneDiff, 0);

// achievements
const ach = computeAchievements(players, [...ms, mk(["A", "B"], ["E", "F"], 1, 5, true)], [season]);
const has = (p: string, k: string) => ach.some((u) => u.playerId === p && u.key === k);
assert.ok(has("A", "first_victory")); assert.ok(has("A", "first_season_victory"));
assert.ok(!has("C", "first_season_victory")); assert.ok(has("C", "first_victory"));
assert.ok(has("A", "clean")); assert.ok(has("A", "dominant")); assert.ok(has("A", "comeback"));
assert.ok(!has("A", "win3"));
assert.equal(ach.filter((u) => u.playerId === "A" && u.key === "first_victory").length, 1);
// editing/removing the first match recalculates (deleting m1 removes dominant? no, m4 has 5 stones) -> remove comeback match
const ach2 = computeAchievements(players, ms, [season]);
assert.ok(!ach2.some((u) => u.key === "comeback"));
// win streak 3 + perfect partnership
const streak = Array.from({ length: 3 }, () => mk(["A", "B"], ["E", "F"], 1, 3));
const ach3 = computeAchievements(players, streak, [season]);
assert.ok(ach3.some((u) => u.playerId === "A" && u.key === "win3"));
assert.ok(ach3.some((u) => u.playerId === "A" && u.key === "perfect_partner"));
// hall of fame works with empty data
const hof = computeHallOfFame(players, [], [season]);
assert.equal(hof.champions.length, 0);
// empty league
assert.equal(computeLeague([], []).ranking.length, 0);
console.log("stats tests passed");
