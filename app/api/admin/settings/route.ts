import { NextResponse } from "next/server";
import { readAdminApiSession } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { jsonError } from "@/lib/http";
import { fetchRegistrationSettings, getRegistrationStatus } from "@/lib/registration-settings";

export async function GET() {
  const session = await readAdminApiSession();
  if (!session) return jsonError("UNAUTHORIZED", 401);

  const settings = await fetchRegistrationSettings();
  return NextResponse.json({
    openAt: settings.openAt,
    closeAt: settings.closeAt,
    status: getRegistrationStatus(settings),
  });
}

export async function POST(request: Request) {
  const session = await readAdminApiSession();
  if (!session) return jsonError("UNAUTHORIZED", 401);

  try {
    const body = (await request.json()) as { openAt?: string | null; closeAt?: string | null };

    const openAt = body.openAt ? new Date(body.openAt).toISOString() : null;
    const closeAt = body.closeAt ? new Date(body.closeAt).toISOString() : null;

    if (openAt && isNaN(new Date(openAt).getTime())) return jsonError("BAD_REQUEST");
    if (closeAt && isNaN(new Date(closeAt).getTime())) return jsonError("BAD_REQUEST");
    if (openAt && closeAt && new Date(closeAt) <= new Date(openAt)) {
      return jsonError("BAD_REQUEST");
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("registration_settings")
      .update({ open_at: openAt, close_at: closeAt, updated_at: new Date().toISOString() })
      .eq("id", 1);

    if (error) return jsonError("INTERNAL_ERROR", 500);

    const updated = { openAt, closeAt };
    return NextResponse.json({ ...updated, status: getRegistrationStatus(updated) });
  } catch {
    return jsonError("BAD_REQUEST");
  }
}
