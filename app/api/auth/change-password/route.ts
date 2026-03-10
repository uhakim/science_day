import { NextResponse } from "next/server";
import { readApiSession } from "@/lib/api-auth";
import { extractErrorCode } from "@/lib/errors";
import { jsonError } from "@/lib/http";
import { hashPassword, validatePassword, verifyPassword } from "@/lib/password";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(request: Request) {
  const session = await readApiSession();
  if (!session) return jsonError("UNAUTHORIZED", 401);

  try {
    const body = (await request.json()) as {
      currentPassword?: string;
      newPassword?: string;
    };

    const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

    if (!currentPassword || !newPassword) {
      return jsonError("BAD_REQUEST");
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      return jsonError(passwordError);
    }

    const supabase = getSupabaseAdmin();
    const studentQuery = await supabase
      .from("students")
      .select("password_hash")
      .eq("id", session.studentId)
      .single();

    if (studentQuery.error || !studentQuery.data) {
      return jsonError("STUDENT_NOT_FOUND", 404);
    }
    if (!(await verifyPassword(currentPassword, studentQuery.data.password_hash))) {
      return jsonError("CURRENT_PASSWORD_MISMATCH", 400);
    }

    const now = new Date().toISOString();
    const updateQuery = await supabase
      .from("students")
      .update({
        password_hash: await hashPassword(newPassword),
        password_updated_at: now,
        updated_at: now,
      })
      .eq("id", session.studentId);

    if (updateQuery.error) {
      return jsonError("INTERNAL_ERROR", 500);
    }

    return NextResponse.json({ changed: true });
  } catch (error) {
    return jsonError(extractErrorCode(error instanceof Error ? error.message : undefined));
  }
}
