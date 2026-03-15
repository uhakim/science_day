import { NextResponse } from "next/server";
import { readAdminApiSession } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { jsonError } from "@/lib/http";
import {
  fetchAllRegistrationGradeSettings,
  getRegistrationStatus,
  REGISTRATION_GRADES,
} from "@/lib/registration-settings";

function serializeSettings(
  settings: Awaited<ReturnType<typeof fetchAllRegistrationGradeSettings>>,
) {
  return settings.map((entry) => ({
    grade: entry.grade,
    openAt: entry.openAt,
    closeAt: entry.closeAt,
    status: getRegistrationStatus(entry),
  }));
}

function parseIsoDatetime(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return Number.NaN;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return Number.NaN;
  return parsed.toISOString();
}

export async function GET() {
  const session = await readAdminApiSession();
  if (!session) return jsonError("UNAUTHORIZED", 401);

  const settings = await fetchAllRegistrationGradeSettings();
  return NextResponse.json({ settings: serializeSettings(settings) });
}

export async function POST(request: Request) {
  const session = await readAdminApiSession();
  if (!session) return jsonError("UNAUTHORIZED", 401);

  try {
    const body = (await request.json()) as {
      grades?: number[];
      openAt?: string | null;
      closeAt?: string | null;
    };

    const grades = Array.isArray(body.grades)
      ? Array.from(new Set(body.grades.map((grade) => Number(grade))))
      : [];
    const openAt = parseIsoDatetime(body.openAt);
    const closeAt = parseIsoDatetime(body.closeAt);

    if (grades.length === 0) return jsonError("BAD_REQUEST");
    if (grades.some((grade) => !REGISTRATION_GRADES.includes(grade as (typeof REGISTRATION_GRADES)[number]))) {
      return jsonError("BAD_REQUEST");
    }
    if (typeof openAt === "number" || typeof closeAt === "number") return jsonError("BAD_REQUEST");
    if (openAt && closeAt && new Date(closeAt) <= new Date(openAt)) {
      return jsonError("BAD_REQUEST");
    }

    const supabase = getSupabaseAdmin();
    const updatedAt = new Date().toISOString();
    const { error } = await supabase
      .from("registration_grade_settings")
      .upsert(
        grades.map((grade) => ({
          grade,
          open_at: openAt,
          close_at: closeAt,
          updated_at: updatedAt,
        })),
        { onConflict: "grade" },
      );

    if (error) return jsonError("INTERNAL_ERROR", 500);

    const settings = await fetchAllRegistrationGradeSettings();
    return NextResponse.json({ settings: serializeSettings(settings) });
  } catch {
    return jsonError("BAD_REQUEST");
  }
}
