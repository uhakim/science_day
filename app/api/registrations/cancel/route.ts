import { extractErrorCode } from "@/lib/errors";
import { readApiSession } from "@/lib/api-auth";
import { jsonError } from "@/lib/http";
import { getSupabaseAdmin } from "@/lib/supabase";
import { fetchRegistrationSettings, isRegistrationOpen } from "@/lib/registration-settings";

interface CancelRow {
  cancelled_registration_id: number;
  cancelled_lab_id: string;
  promoted_count: number;
  promoted_registration_ids: number[];
}

export async function POST() {
  const session = await readApiSession();
  if (!session) return jsonError("UNAUTHORIZED", 401);

  const settings = await fetchRegistrationSettings();
  if (!isRegistrationOpen(settings)) return jsonError("REGISTRATION_CLOSED", 403);

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc("rpc_cancel_lab", {
    p_student_id: session.studentId,
  });

  if (error) {
    return jsonError(extractErrorCode(error.message), 400);
  }

  const row = (data as CancelRow[])[0];
  return Response.json({
    cancelledRegistrationId: row.cancelled_registration_id,
    cancelledLabId: row.cancelled_lab_id,
    promotedCount: row.promoted_count,
    promotedRegistrationIds: row.promoted_registration_ids,
  });
}

