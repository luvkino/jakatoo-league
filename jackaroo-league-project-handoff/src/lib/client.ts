export type Fail = { ok: false; code: string; message: string };
export type Res<T extends object = object> = ({ ok: true } & T) | Fail;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Fetch wrapper that ALWAYS resolves with either {ok:true,...} or
 * {ok:false, code, message(Arabic)}. It never throws, and never reports
 * success when the server rejected the operation.
 */
export async function call<T extends object = object>(
  path: string,
  init?: { method?: string; body?: unknown },
  retries = 0,
): Promise<Res<T>> {
  let last: Fail = { ok: false, code: "NETWORK", message: "تعذر الاتصال بالخادم. تحقق من اتصال الإنترنت وحاول مرة أخرى." };
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(path, {
        method: init?.method ?? "GET",
        headers: init?.body !== undefined ? { "Content-Type": "application/json" } : undefined,
        body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
        cache: "no-store",
        credentials: "same-origin",
      });
      let json: Record<string, unknown> | null = null;
      try {
        json = await res.json();
      } catch {
        json = null;
      }
      if (res.ok && json && json.ok === true) return json as unknown as Res<T>;
      if (json && json.ok === false && typeof json.message === "string") {
        last = { ok: false, code: String(json.code ?? "ERROR"), message: json.message };
      } else if (res.status === 403 || res.status === 401) {
        last = { ok: false, code: "FORBIDDEN", message: "ليس لديك صلاحية تنفيذ هذه العملية. سجّل الدخول كمشرف أولاً." };
      } else if (res.status >= 500) {
        last = { ok: false, code: "SERVER", message: "الخادم غير متاح حالياً. حاول مرة أخرى بعد قليل." };
      } else {
        last = { ok: false, code: "FAILED", message: "فشلت العملية. حاول مرة أخرى." };
      }
      // only retry temporary failures
      if (!(last.code === "DB_UNAVAILABLE" || last.code === "SERVER")) return last;
    } catch {
      last = { ok: false, code: "NETWORK", message: "تعذر الاتصال بالخادم. تحقق من اتصال الإنترنت وحاول مرة أخرى." };
    }
    if (attempt < retries) await sleep(500 * 2 ** attempt);
  }
  return last;
}

export const AUDIT_LABELS: Record<string, string> = {
  "player.create": "إضافة لاعب",
  "player.update": "تعديل لاعب",
  "player.archive": "أرشفة لاعب",
  "player.restore": "استعادة لاعب",
  "player.delete": "حذف لاعب نهائياً",
  "match.create": "تسجيل مباراة",
  "match.update": "تعديل مباراة",
  "match.delete": "حذف مباراة",
  "season.create": "إنشاء موسم",
  "season.update": "تعديل موسم",
  "season.close": "إغلاق موسم",
  "data.restore": "استعادة نسخة احتياطية",
};
