import { NextResponse, type NextRequest } from "next/server";
import { isCasinoAuthorizedRequest } from "@/lib/casino-security";

export const dynamic = "force-dynamic";

/**
 * Catch-all guard for any *other* `/api/casino/*` route.
 * The specific routes (`unlock`, `access`) take precedence over this wildcard.
 *
 * Every casino API surface is authorized server-side: an unauthenticated caller
 * receives a generic 404 (the route doesn't exist for them), an authenticated
 * caller receives a normal 404 because there is no such endpoint. No handler
 * is ever exposed without a valid signed session.
 */
export async function GET(req: NextRequest) {
  if (!isCasinoAuthorizedRequest(req)) {
    return NextResponse.json(
      { ok: false, code: "NOT_FOUND", message: "غير موجود." },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }
  return NextResponse.json(
    { ok: false, code: "NOT_FOUND", message: "غير موجود." },
    { status: 404, headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(req: NextRequest) {
  if (!isCasinoAuthorizedRequest(req)) {
    return NextResponse.json(
      { ok: false, code: "NOT_FOUND", message: "غير موجود." },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }
  return NextResponse.json(
    { ok: false, code: "NOT_FOUND", message: "غير موجود." },
    { status: 404, headers: { "Cache-Control": "no-store" } },
  );
}
