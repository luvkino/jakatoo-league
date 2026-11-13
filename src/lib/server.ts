import { NextResponse, type NextRequest } from "next/server";
import { ensureDb } from "@/db/init";
import { auditLog, type matches as matchesTable } from "@/db/schema";
import { isAdminRequest } from "@/lib/auth";
import type { MatchRec } from "@/lib/stats";

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export function ok<T extends object>(data: T, status = 200) {
  return NextResponse.json({ ok: true, ...data }, { status, headers: { "Cache-Control": "no-store" } });
}
export function fail(code: string, message: string, status = 400) {
  return NextResponse.json({ ok: false, code, message }, { status, headers: { "Cache-Control": "no-store" } });
}

const CONN_CODES = new Set(["ECONNREFUSED", "ETIMEDOUT", "ENOTFOUND", "ECONNRESET", "57P01", "57P02", "57P03", "08000", "08001", "08003", "08006"]);

function dig(err: unknown): { code?: string; message?: string } {
  const out: { code?: string; message?: string } = {};
  let cur: unknown = err;
  for (let i = 0; i < 4 && cur && typeof cur === "object"; i++) {
    const e = cur as { code?: string; message?: string; cause?: unknown };
    if (e.code && !out.code) out.code = e.code;
    if (e.message && !out.message) out.message = e.message;
    if (e.code && CONN_CODES.has(e.code)) {
      out.code = e.code;
      break;
    }
    cur = e.cause;
  }
  return out;
}

export function toResponse(err: unknown) {
  if (err instanceof ApiError) return fail(err.code, err.message, err.status);
  const { code, message } = dig(err);
  console.error("[api] error:", code, message);
  if ((code && CONN_CODES.has(code)) || /Connection terminated|timeout exceeded|connect/i.test(message ?? "")) {
    return fail("DB_UNAVAILABLE", "قاعدة البيانات غير متاحة حالياً. حاول مرة أخرى بعد قليل.", 503);
  }
  if (code === "23505") return fail("DUPLICATE", "هذا العنصر موجود بالفعل.", 409);
  if (code === "23503") return fail("IN_USE", "لا يمكن تنفيذ العملية لأن العنصر مرتبط ببيانات أخرى.", 409);
  return fail("SAVE_FAILED", "تعذر إتمام العملية بسبب خطأ في الخادم. لم يتم حفظ أي شيء.", 500);
}

/** Wraps a route handler: initialises the DB, enforces admin permission, maps errors. */
export function api<C = unknown>(
  opts: { admin?: boolean; db?: boolean },
  fn: (req: NextRequest, ctx: C, isAdmin: boolean) => Promise<Response>,
) {
  return async (req: NextRequest, ctx: C): Promise<Response> => {
    try {
      const admin = isAdminRequest(req);
      if (opts.admin && !admin) {
        return fail("FORBIDDEN", "ليس لديك صلاحية تنفيذ هذه العملية. سجّل الدخول كمشرف أولاً.", 403);
      }
      if (opts.db !== false) await ensureDb();
      return await fn(req, ctx, admin);
    } catch (e) {
      return toResponse(e);
    }
  };
}

export async function readJson(req: NextRequest): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    if (body && typeof body === "object" && !Array.isArray(body)) return body as Record<string, unknown>;
  } catch {
    /* fallthrough */
  }
  throw new ApiError("BAD_REQUEST", "البيانات المرسلة غير صالحة.", 400);
}

type Exec = { insert: (t: typeof auditLog) => { values: (v: typeof auditLog.$inferInsert) => PromiseLike<unknown> } };
export async function audit(
  exec: Exec,
  action: string,
  entity: string,
  entityId: string | null,
  previous: unknown,
  next: unknown,
) {
  await exec.insert(auditLog).values({
    action,
    entity,
    entityId,
    previous: (previous ?? null) as never,
    next: (next ?? null) as never,
  });
}

export function toMatchRec(r: typeof matchesTable.$inferSelect): MatchRec {
  return {
    id: r.id,
    seasonId: r.seasonId,
    t1: [r.t1p1, r.t1p2],
    t2: [r.t2p1, r.t2p2],
    winningTeam: r.winningTeam === 2 ? 2 : 1,
    stones: r.stones,
    comeback: r.comeback,
    note: r.note,
    playedAt: r.playedAt.toISOString(),
  };
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
