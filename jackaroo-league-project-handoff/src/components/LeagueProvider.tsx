"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { call, type Res } from "@/lib/client";
import { cleanName, nameKey } from "@/lib/normalize";
import {
  ACH_MAP,
  computeAchievements,
  computeLeague,
  type League,
  type MatchRec,
  type PlayerRec,
  type SeasonRec,
  type Unlock,
} from "@/lib/stats";

export type AdminState = "unknown" | "admin" | "viewer";
export interface Toast {
  id: number;
  msg: string;
  kind: "ok" | "err" | "info" | "ach";
}
export interface MatchPayload {
  t1: [string, string];
  t2: [string, string];
  winningTeam: 1 | 2;
  stones: number;
  comeback: boolean;
  note?: string;
  playedAt?: string;
}

interface Ctx {
  players: PlayerRec[];
  activePlayers: PlayerRec[];
  matches: MatchRec[];
  seasons: SeasonRec[];
  loaded: boolean;
  loadError: string | null;
  admin: AdminState;
  scope: string;
  setScope: (s: string) => void;
  activeSeason: SeasonRec | null;
  scopeMatches: MatchRec[];
  league: League;
  unlocks: Unlock[];
  nameOf: (id: string) => string;
  refresh: () => Promise<void>;
  login: (pw: string) => Promise<Res>;
  logout: () => Promise<void>;
  addPlayer: (name: string) => Promise<Res<{ player: PlayerRec }>>;
  renamePlayer: (id: string, name: string) => Promise<Res>;
  setArchived: (id: string, archived: boolean) => Promise<Res>;
  deletePlayer: (id: string) => Promise<Res>;
  addMatch: (m: MatchPayload) => Promise<Res>;
  updateMatch: (id: string, m: MatchPayload) => Promise<Res>;
  deleteMatch: (id: string) => Promise<Res>;
  createSeason: (name: string, startDate?: string) => Promise<Res>;
  updateSeason: (id: string, p: { name?: string; status?: string; startDate?: string }) => Promise<Res>;
  toast: (msg: string, kind?: Toast["kind"]) => void;
  toasts: Toast[];
  dismissToast: (id: number) => void;
}

const LeagueCtx = createContext<Ctx | null>(null);
export const useLeague = () => {
  const c = useContext(LeagueCtx);
  if (!c) throw new Error("LeagueProvider missing");
  return c;
};

const SCOPE_KEY = "jl_scope";
const unlockKey = (u: Unlock) => `${u.seasonId}|${u.playerId}|${u.key}`;

interface DataRes {
  players: PlayerRec[];
  matches: MatchRec[];
  seasons: SeasonRec[];
  isAdmin: boolean;
}

export function LeagueProvider({ children }: { children: ReactNode }) {
  const [players, setPlayers] = useState<PlayerRec[]>([]);
  const [matches, setMatches] = useState<MatchRec[]>([]);
  const [seasons, setSeasons] = useState<SeasonRec[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [admin, setAdmin] = useState<AdminState>("unknown");
  const [scopeRaw, setScopeRaw] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);

  const pending = useRef(0);
  const writeVersion = useRef(0);
  const inflight = useRef<Promise<void> | null>(null);
  const toastId = useRef(0);
  const snapshot = useRef({ players, matches, seasons });
  snapshot.current = { players, matches, seasons };

  const toast = useCallback((msg: string, kind: Toast["kind"] = "info") => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-5), { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === "err" ? 7000 : 4500);
  }, []);
  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  // ---- loading (never blocks the UI; keeps old data on failure; dedupes requests)
  const refresh = useCallback(async () => {
    if (inflight.current) return inflight.current;
    const p = (async () => {
      // A response is applied only if no write happened while it was in flight,
      // otherwise a stale poll could briefly hide a freshly saved player/match.
      for (let attempt = 0; attempt < 3; attempt++) {
        const v = writeVersion.current;
        const r = await call<DataRes>("/api/data", undefined, 2);
        if (!r.ok) {
          setLoadError(r.message);
          return;
        }
        setAdmin(r.isAdmin ? "admin" : "viewer");
        if (pending.current === 0 && writeVersion.current === v) {
          setPlayers(r.players);
          setMatches(r.matches);
          setSeasons(r.seasons);
          setLoaded(true);
          setLoadError(null);
          return;
        }
        await new Promise((res) => setTimeout(res, 250));
      }
    })().finally(() => {
      inflight.current = null;
    });
    inflight.current = p;
    return p;
  }, []);

  useEffect(() => {
    try {
      setScopeRaw(localStorage.getItem(SCOPE_KEY) ?? "");
    } catch {
      /* ignore */
    }
    // Session does not depend on the DB, so the admin is recognised even if the DB is down.
    call<{ isAdmin: boolean }>("/api/session", undefined, 1).then((r) => {
      if (r.ok) setAdmin(r.isAdmin ? "admin" : "viewer");
      else setAdmin((a) => (a === "unknown" ? "viewer" : a));
    });
    refresh();
    const tick = () => {
      if (document.visibilityState === "visible" && pending.current === 0) refresh();
    };
    const iv = setInterval(tick, 15000);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("focus", tick);
    return () => {
      clearInterval(iv);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("focus", tick);
    };
  }, [refresh]);

  // ---- derived data
  const activeSeason = useMemo(() => seasons.find((s) => s.status === "active") ?? null, [seasons]);
  const scope = useMemo(() => {
    if (scopeRaw === "all") return "all";
    if (scopeRaw && seasons.some((s) => s.id === scopeRaw)) return scopeRaw;
    return activeSeason?.id ?? "all";
  }, [scopeRaw, seasons, activeSeason]);
  const setScope = useCallback((s: string) => {
    setScopeRaw(s);
    try {
      localStorage.setItem(SCOPE_KEY, s);
    } catch {
      /* ignore */
    }
  }, []);
  const scopeMatches = useMemo(
    () => (scope === "all" ? matches : matches.filter((m) => m.seasonId === scope)),
    [matches, scope],
  );
  const league = useMemo(() => computeLeague(players, scopeMatches), [players, scopeMatches]);
  const allUnlocks = useMemo(() => computeAchievements(players, matches, seasons), [players, matches, seasons]);
  const unlocks = useMemo(
    () => (scope === "all" ? allUnlocks : allUnlocks.filter((u) => u.seasonId === scope)),
    [allUnlocks, scope],
  );
  const nameMap = useMemo(() => new Map(players.map((p) => [p.id, p.name])), [players]);
  const nameOf = useCallback((id: string) => nameMap.get(id) ?? "لاعب محذوف", [nameMap]);
  const activePlayers = useMemo(() => players.filter((p) => !p.archived), [players]);

  // ---- mutations (nothing is reported as success unless the server confirmed it)
  const mutate = useCallback(async <T extends object = object>(path: string, method: string, body?: unknown) => {
    pending.current++;
    writeVersion.current++;
    try {
      const r = await call<T>(path, { method, body });
      // session expired / not an admin: resync so the UI shows the true permission state
      if (!r.ok && r.code === "FORBIDDEN") setTimeout(() => refresh(), 0);
      return r;
    } finally {
      pending.current--;
      writeVersion.current++;
    }
  }, [refresh]);

  const announceUnlocks = useCallback(
    (nextMatches: MatchRec[]) => {
      const s = snapshot.current;
      const before = new Set(computeAchievements(s.players, s.matches, s.seasons).map(unlockKey));
      const fresh = computeAchievements(s.players, nextMatches, s.seasons).filter((u) => !before.has(unlockKey(u)));
      const nm = new Map(s.players.map((p) => [p.id, p.name]));
      const byPlayer = new Map<string, string[]>();
      for (const u of fresh) {
        const t = ACH_MAP.get(u.key)?.title;
        if (t) byPlayer.set(u.playerId, [...(byPlayer.get(u.playerId) ?? []), t]);
      }
      [...byPlayer.entries()].slice(0, 4).forEach(([pid, titles]) =>
        toast(
          `🏆 ${nm.get(pid) ?? "لاعب"} فتح ${titles.length > 1 ? "إنجازات" : "إنجاز"}: ${titles.map((t) => `«${t}»`).join("، ")}`,
          "ach",
        ),
      );
    },
    [toast],
  );

  const addPlayer = useCallback(
    async (raw: string): Promise<Res<{ player: PlayerRec }>> => {
      const name = cleanName(raw);
      if (!name) return { ok: false, code: "EMPTY_NAME", message: "اكتب اسم اللاعب أولاً." };
      const key = nameKey(name);
      const dup = snapshot.current.players.find((p) => nameKey(p.name) === key);
      if (dup)
        return {
          ok: false,
          code: "DUPLICATE",
          message: dup.archived
            ? `اللاعب «${dup.name}» موجود بالفعل في الأرشيف. يمكنك استعادته من قائمة اللاعبين المؤرشفين.`
            : `اللاعب «${dup.name}» موجود بالفعل.`,
        };
      const r = await mutate<{ player: PlayerRec }>("/api/players", "POST", { name });
      if (r.ok) {
        // appears immediately everywhere (list, selectors, leaderboard)
        setPlayers((ps) => (ps.some((p) => p.id === r.player.id) ? ps : [...ps, r.player]));
        setLoaded(true);
        setTimeout(refresh, 300);
      }
      return r;
    },
    [mutate, refresh],
  );

  const renamePlayer = useCallback(
    async (id: string, name: string) => {
      const r = await mutate<{ player: PlayerRec }>(`/api/players/${id}`, "PATCH", { name });
      if (r.ok) setPlayers((ps) => ps.map((p) => (p.id === id ? r.player : p)));
      return r;
    },
    [mutate],
  );
  const setArchived = useCallback(
    async (id: string, archived: boolean) => {
      const r = await mutate<{ player: PlayerRec }>(`/api/players/${id}`, "PATCH", { archived });
      if (r.ok) setPlayers((ps) => ps.map((p) => (p.id === id ? r.player : p)));
      return r;
    },
    [mutate],
  );
  const deletePlayer = useCallback(
    async (id: string) => {
      const r = await mutate(`/api/players/${id}`, "DELETE");
      if (r.ok) setPlayers((ps) => ps.filter((p) => p.id !== id));
      return r;
    },
    [mutate],
  );

  const addMatch = useCallback(
    async (m: MatchPayload) => {
      const r = await mutate<{ match: MatchRec }>("/api/matches", "POST", m);
      if (r.ok) {
        const next = [...snapshot.current.matches, r.match];
        announceUnlocks(next);
        setMatches(next);
        setTimeout(refresh, 300);
      }
      return r;
    },
    [mutate, refresh, announceUnlocks],
  );
  const updateMatch = useCallback(
    async (id: string, m: MatchPayload) => {
      const r = await mutate<{ match: MatchRec }>(`/api/matches/${id}`, "PATCH", m);
      if (r.ok) {
        const next = snapshot.current.matches.map((x) => (x.id === id ? r.match : x));
        announceUnlocks(next);
        setMatches(next);
        setTimeout(refresh, 300);
      }
      return r;
    },
    [mutate, refresh, announceUnlocks],
  );
  const deleteMatch = useCallback(
    async (id: string) => {
      const r = await mutate(`/api/matches/${id}`, "DELETE");
      if (r.ok) {
        setMatches((ms) => ms.filter((x) => x.id !== id));
        setTimeout(refresh, 300);
      }
      return r;
    },
    [mutate, refresh],
  );

  const createSeason = useCallback(
    async (name: string, startDate?: string) => {
      const r = await mutate("/api/seasons", "POST", { name, startDate });
      if (r.ok) {
        setScopeRaw("");
        try {
          localStorage.removeItem(SCOPE_KEY);
        } catch {
          /* ignore */
        }
        await refresh();
      }
      return r;
    },
    [mutate, refresh],
  );
  const updateSeason = useCallback(
    async (id: string, p: { name?: string; status?: string; startDate?: string }) => {
      const r = await mutate(`/api/seasons/${id}`, "PATCH", p);
      if (r.ok) await refresh();
      return r;
    },
    [mutate, refresh],
  );

  const login = useCallback(
    async (password: string) => {
      const r = await call<{ isAdmin: boolean }>("/api/session", { method: "POST", body: { password } });
      if (r.ok) {
        setAdmin("admin");
        toast("تم تسجيل الدخول كمشرف.", "ok");
      }
      return r;
    },
    [toast],
  );
  const logout = useCallback(async () => {
    await call("/api/session", { method: "DELETE" });
    setAdmin("viewer");
    toast("تم تسجيل الخروج.", "info");
  }, [toast]);

  const value: Ctx = {
    players, activePlayers, matches, seasons, loaded, loadError, admin, scope, setScope, activeSeason,
    scopeMatches, league, unlocks, nameOf, refresh, login, logout, addPlayer, renamePlayer, setArchived,
    deletePlayer, addMatch, updateMatch, deleteMatch, createSeason, updateSeason, toast, toasts, dismissToast,
  };
  return <LeagueCtx.Provider value={value}>{children}</LeagueCtx.Provider>;
}
