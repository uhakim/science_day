import { getSupabaseAdmin } from "@/lib/supabase";

export type RegistrationStatus = "pending" | "open" | "closed";
export const REGISTRATION_GRADES = [1, 2, 3, 4, 5, 6] as const;

export interface RegistrationSettings {
  openAt: string | null;
  closeAt: string | null;
}

export interface GradeRegistrationSettings extends RegistrationSettings {
  grade: number;
}

function normalizeSettings(
  row: { grade: number; open_at: string | null; close_at: string | null } | null | undefined,
  grade: number,
): GradeRegistrationSettings {
  return {
    grade,
    openAt: row?.open_at ?? null,
    closeAt: row?.close_at ?? null,
  };
}

export async function fetchRegistrationSettingsForGrade(grade: number): Promise<GradeRegistrationSettings> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("registration_grade_settings")
    .select("grade, open_at, close_at")
    .eq("grade", grade)
    .maybeSingle();

  return normalizeSettings(data, grade);
}

export async function fetchAllRegistrationGradeSettings(): Promise<GradeRegistrationSettings[]> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("registration_grade_settings")
    .select("grade, open_at, close_at")
    .order("grade", { ascending: true });

  const rows = new Map((data ?? []).map((row) => [row.grade, row]));
  return REGISTRATION_GRADES.map((grade) => normalizeSettings(rows.get(grade), grade));
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
