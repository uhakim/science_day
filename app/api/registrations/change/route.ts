import { extractErrorCode } from "@/lib/errors";
import { readApiSession } from "@/lib/api-auth";
import { jsonError } from "@/lib/http";
import { getSupabaseAdmin } from "@/lib/supabase";
import { fetchRegistrationSettings, isRegistrationOpen } from "@/lib/registration-settings";

interface ChangeRow {
  old_registration_id: number;
  new_registration_id: number;
  new_lab_id: string;
  new_status: "confirmed" | "waiting";
  new_timestamp: string;
  promoted_count: number;
  promoted_registration_ids: number[];
}

export async function POST(request: Request) {
  const session = await readApiSession();
  if (!session) {
    return jsonError("UNAUTHORIZED", 401);
  }

  try {
    const settings = await fetchRegistrationSettings();
    if (!isRegistrationOpen(settings)) return jsonError("REGISTRATION_CLOSED", 403);

    const body = (await request.json()) as { newLabId?: string };
    const newLabId = String(body.newLabId ?? "").trim();
    if (!newLabId) {
      return jsonError("BAD_REQUEST");
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc("rpc_change_lab", {
      p_student_id: session.studentId,
      p_new_lab_id: newLabId,
    });

    if (error) {
      return jsonError(extractErrorCode(error.message), 400);
    }

    const row = (data as ChangeRow[])[0];
    return Response.json({
      oldRegistrationId: row.old_registration_id,
      newRegistrationId: row.new_registration_id,
      newLabId: row.new_lab_id,
      newStatus: row.new_status,
      newTimestamp: row.new_timestamp,
      promotedCount: row.promoted_count,
      promotedRegistrationIds: row.promoted_registration_ids,
    });
  } catch {
    return jsonError("BAD_REQUEST");
  }
}

