import { NextResponse } from "next/server";
import { readAdminApiSession } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { jsonError } from "@/lib/http";
import { extractErrorCode } from "@/lib/errors";

export async function POST(request: Request) {
  const session = await readAdminApiSession();
  if (!session) return jsonError("UNAUTHORIZED", 401);

  try {
    const body = (await request.json()) as { studentId?: string };
    const studentId = String(body.studentId ?? "").trim();
    if (!studentId) return jsonError("BAD_REQUEST");

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc("rpc_cancel_lab", {
      p_student_id: studentId,
    });

    if (error) return jsonError(extractErrorCode(error.message), 400);

    const row = (data as { cancelled_registration_id: number }[])[0];
    return NextResponse.json({ cancelledRegistrationId: row.cancelled_registration_id });
  } catch {
    return jsonError("BAD_REQUEST");
  }
}
