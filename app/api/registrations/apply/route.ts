import { extractErrorCode } from "@/lib/errors";
import { readApiSession } from "@/lib/api-auth";
import { jsonError } from "@/lib/http";
import { getSupabaseAdmin } from "@/lib/supabase";
import { fetchRegistrationSettings, isRegistrationOpen } from "@/lib/registration-settings";

interface ApplyRow {
  registration_id: number;
  status: "confirmed" | "waiting";
  timestamp: string;
  lab_id: string;
}

export async function POST(request: Request) {
  const session = await readApiSession();
  if (!session) {
    return jsonError("UNAUTHORIZED", 401);
  }

  try {
    const settings = await fetchRegistrationSettings();
    if (!isRegistrationOpen(settings)) return jsonError("REGISTRATION_CLOSED", 403);

    const body = (await request.json()) as { labId?: string };
    const labId = String(body.labId ?? "").trim();
    if (!labId) {
      return jsonError("BAD_REQUEST");
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc("rpc_apply_lab", {
      p_student_id: session.studentId,
      p_lab_id: labId,
    });

    if (error) {
      console.error("[apply] supabase error:", JSON.stringify(error));
      return jsonError(extractErrorCode(error.message), 400);
    }

    const row = (data as ApplyRow[])[0];
    return Response.json({
      registrationId: row.registration_id,
      status: row.status,
      timestamp: row.timestamp,
      labId: row.lab_id,
    });
  } catch {
    return jsonError("BAD_REQUEST");
  }
}

