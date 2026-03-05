import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE_NAME, verifyAdminToken, type AdminSession } from "@/lib/sessions";

export async function getAdminServerSession(): Promise<AdminSession | null> {
  const store = await cookies();
  const rawToken = store.get(ADMIN_SESSION_COOKIE_NAME)?.value;
  if (!rawToken) return null;
  return verifyAdminToken(rawToken);
}

export async function readAdminApiSession(): Promise<AdminSession | null> {
  const store = await cookies();
  const rawToken = store.get(ADMIN_SESSION_COOKIE_NAME)?.value;
  if (!rawToken) return null;
  return verifyAdminToken(rawToken);
}
