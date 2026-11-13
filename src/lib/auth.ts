import { createHmac, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

export const COOKIE = "jl_session";
const MAX_AGE = 60 * 60 * 24 * 30;

function adminPassword(): string {
  return process.env.ADMIN_PASSWORD || "jackaroo";
}
function secret(): string {
  return process.env.SESSION_SECRET || `jl::${adminPassword()}`;
}
function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}
function safeEq(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function checkPassword(input: string): boolean {
  return safeEq(sign(`pw:${input}`), sign(`pw:${adminPassword()}`));
}

export function makeToken(): string {
  const exp = Date.now() + MAX_AGE * 1000;
  const payload = `admin.${exp}`;
  return `${payload}.${sign(payload)}`;
}

export function isAdminToken(token: string | undefined): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "admin") return false;
  const exp = Number(parts[1]);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  return safeEq(parts[2], sign(`${parts[0]}.${parts[1]}`));
}

export function isAdminRequest(req: NextRequest): boolean {
  return isAdminToken(req.cookies.get(COOKIE)?.value);
}

export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: MAX_AGE,
};
