import { NextResponse } from "next/server";
import { readAdminApiSession } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { jsonError } from "@/lib/http";
import { extractErrorCode } from "@/lib/errors";

export async function POST(request: Request) {
  const session = await readAdminApiSession();
  if (!session) return jsonError("UNAUTHORIZED", 401);

  try {
    const body = (await request.json()) as { studentId?: string; newLabId?: string };
    const studentId = String(body.studentId ?? "").trim();
    const newLabId = String(body.newLabId ?? "").trim();
    if (!studentId || !newLabId) return jsonError("BAD_REQUEST");

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc("rpc_change_lab", {
      p_student_id: studentId,
      p_new_lab_id: newLabId,
    });

    if (error) return jsonError(extractErrorCode(error.message), 400);

    const row = (data as { new_lab_id: string; new_status: string }[])[0];
    return NextResponse.json({ newLabId: row.new_lab_id, newStatus: row.new_status });
  } catch {
    return jsonError("BAD_REQUEST");
  }
}
