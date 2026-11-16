import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { isCasinoAuthorized } from "@/lib/casino-security";

export const dynamic = "force-dynamic";

/**
 * SERVER-SIDE CASINO GATE — every page under /casino is authorized here, before
 * any client component renders. An unauthenticated (or stale/tampered cookie)
 * visitor receives a generic 404, identical to a non-existent route. No
 * client-side boolean is trusted for protection.
 */
export default async function CasinoLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  if (!isCasinoAuthorized(jar)) {
    notFound();
  }
  return <>{children}</>;
}
