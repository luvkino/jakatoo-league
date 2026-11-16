import { NextResponse, type NextRequest } from "next/server";
import { CASINO_COOKIE, casinoCookieOptions, isCasinoAuthorizedRequest } from "@/lib/casino-security";

export const dynamic = "force-dynamic";

/**
 * GET /api/casino/access
 * Returns ONLY the boolean authorization state. It never exposes whether a
 * server secret exists, the code itself, or any internal state.
 * `Cache-Control: no-store` so proxies never cache the auth result.
 */
export async function GET(req: NextRequest) {
  const authorized = isCasinoAuthorizedRequest(req);
  return NextResponse.json(
    { authorized },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}

/**
 * DELETE /api/casino/access — lock the session again by clearing the cookie.
 */
export async function DELETE(req: NextRequest) {
  const res = NextResponse.json(
    { authorized: false },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
  res.cookies.set(CASINO_COOKIE, "", {
    ...casinoCookieOptions,
    maxAge: 0,
  });
  return res;
}
