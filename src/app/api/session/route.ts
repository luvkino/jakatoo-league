import { NextRequest, NextResponse } from "next/server";
import { COOKIE, checkPassword, cookieOptions, isAdminRequest, makeToken } from "@/lib/auth";
import { fail, readJson } from "@/lib/server";

export const dynamic = "force-dynamic";

// Session never touches the database, so the admin is always recognised
// correctly - even when the database is temporarily unavailable.
export async function GET(req: NextRequest) {
  return NextResponse.json({ ok: true, isAdmin: isAdminRequest(req) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await readJson(req);
  } catch {
    return fail("BAD_REQUEST", "البيانات المرسلة غير صالحة.", 400);
  }
  const password = typeof body.password === "string" ? body.password : "";
  await new Promise((r) => setTimeout(r, 400)); // slow down brute force
  if (!checkPassword(password)) {
    return fail("BAD_PASSWORD", "كلمة المرور غير صحيحة.", 401);
  }
  const res = NextResponse.json({ ok: true, isAdmin: true });
  res.cookies.set(COOKIE, makeToken(), cookieOptions);
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true, isAdmin: false });
  res.cookies.set(COOKIE, "", { ...cookieOptions, maxAge: 0 });
  return res;
}
