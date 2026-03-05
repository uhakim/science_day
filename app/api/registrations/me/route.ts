import { readApiSession } from "@/lib/api-auth";
import { jsonError } from "@/lib/http";
import { getSupabaseAdmin } from "@/lib/supabase";

interface RegistrationRow {
  registration_id: number;
  student_id: string;
  lab_id: string;
  lab_number: number;
  group_type: "LOW" | "HIGH";
  status: "confirmed" | "waiting";
  timestamp: string;
  queue_position: number | null;
}

export async function GET() {
  const session = await readApiSession();
  if (!session) {
    return jsonError("UNAUTHORIZED", 401);
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc("rpc_get_my_registration", {
    p_student_id: session.studentId,
  });

  if (error) {
    return jsonError("INTERNAL_ERROR", 500);
  }

  const rows = (data ?? []) as RegistrationRow[];
  if (rows.length === 0) {
    return Response.json({ registration: null });
  }

  const row = rows[0];
  return Response.json({
    registration: {
      registrationId: row.registration_id,
      studentId: row.student_id,
      labId: row.lab_id,
      labNumber: row.lab_number,
      groupType: row.group_type,
      status: row.status,
      timestamp: row.timestamp,
      queuePosition: row.queue_position,
    },
  });
}

