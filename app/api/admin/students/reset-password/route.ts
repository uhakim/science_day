import { NextResponse } from "next/server";
import { readAdminApiSession } from "@/lib/admin-auth";
import { extractErrorCode } from "@/lib/errors";
import { jsonError } from "@/lib/http";
import { resetStudentPasswordToBirthDate } from "@/lib/student-credentials";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(request: Request) {
  const session = await readAdminApiSession();
  if (!session) return jsonError("UNAUTHORIZED", 401);

  try {
    const body = (await request.json()) as { studentId?: string };
    const studentId = String(body.studentId ?? "").trim();

    if (!studentId) {
      return jsonError("BAD_REQUEST");
    }

    await resetStudentPasswordToBirthDate(getSupabaseAdmin(), studentId);
    return NextResponse.json({ reset: true });
  } catch (error) {
    return jsonError(extractErrorCode(error instanceof Error ? error.message : undefined));
  }
}
