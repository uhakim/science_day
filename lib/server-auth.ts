import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/sessions";
import type { StudentSession } from "@/lib/types";

export async function getServerSession(): Promise<StudentSession | null> {
  const store = await cookies();
  const rawToken = store.get(SESSION_COOKIE_NAME)?.value;
  if (!rawToken) {
    return null;
  }
  return verifySessionToken(rawToken);
}

