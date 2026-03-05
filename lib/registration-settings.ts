import { getSupabaseAdmin } from "@/lib/supabase";

export type RegistrationStatus = "pending" | "open" | "closed";

export interface RegistrationSettings {
  openAt: string | null;
  closeAt: string | null;
}

export async function fetchRegistrationSettings(): Promise<RegistrationSettings> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("registration_settings")
    .select("open_at, close_at")
    .eq("id", 1)
    .single();

  return {
    openAt: data?.open_at ?? null,
    closeAt: data?.close_at ?? null,
  };
}

export function getRegistrationStatus(settings: RegistrationSettings): RegistrationStatus {
  if (!settings.openAt) return "pending";
  const now = new Date();
  if (now < new Date(settings.openAt)) return "pending";
  if (settings.closeAt && now >= new Date(settings.closeAt)) return "closed";
  return "open";
}

export function isRegistrationOpen(settings: RegistrationSettings): boolean {
  return getRegistrationStatus(settings) === "open";
}
