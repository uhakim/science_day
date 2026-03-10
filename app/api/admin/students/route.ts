import { NextResponse } from "next/server";
import { readAdminApiSession } from "@/lib/admin-auth";
import { extractErrorCode } from "@/lib/errors";
import { getSupabaseAdmin } from "@/lib/supabase";
import { jsonError } from "@/lib/http";
import { upsertStudentCredentials } from "@/lib/student-credentials";

export async function GET() {
  const session = await readAdminApiSession();
  if (!session) return jsonError("UNAUTHORIZED", 401);

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("students")
    .select("id, grade, class, name, birth_date, password_hash, created_at")
    .order("grade", { ascending: true })
    .order("class", { ascending: true })
    .order("name", { ascending: true });

  if (error) return jsonError("INTERNAL_ERROR", 500);
  return NextResponse.json({
    students: (data ?? []).map((student) => ({
      id: student.id,
      grade: student.grade,
      class: student.class,
      name: student.name,
      birthDate: student.birth_date,
      hasPassword: Boolean(student.password_hash),
      created_at: student.created_at,
    })),
  });
}

export async function POST(request: Request) {
  const session = await readAdminApiSession();
  if (!session) return jsonError("UNAUTHORIZED", 401);

  try {
    const body = (await request.json()) as {
      grade?: number;
      class?: number;
      name?: string;
      birthDate?: string;
    };
    const grade = Number(body.grade);
    const classNumber = Number(body.class);
    const name = String(body.name ?? "").trim();
    const birthDate = String(body.birthDate ?? "").trim();

    if (!Number.isInteger(grade) || grade < 1 || grade > 6) return jsonError("BAD_REQUEST");
    if (!Number.isInteger(classNumber) || classNumber < 1) return jsonError("BAD_REQUEST");
    if (!name) return jsonError("BAD_REQUEST");
    if (!birthDate) return jsonError("BAD_REQUEST");

    const supabase = getSupabaseAdmin();
    const student = await upsertStudentCredentials(supabase, {
      grade,
      classNumber,
      name,
      birthDate,
    });

    return NextResponse.json(
      {
        student: {
          id: student.id,
          grade: student.grade,
          class: student.class,
          name: student.name,
          birthDate: student.birth_date,
          hasPassword: Boolean(student.password_hash),
          created_at: student.created_at,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return jsonError(extractErrorCode(error instanceof Error ? error.message : undefined));
  }
}

export async function DELETE(request: Request) {
  const session = await readAdminApiSession();
  if (!session) return jsonError("UNAUTHORIZED", 401);

  try {
    const body = (await request.json()) as { ids?: string[] };
    const ids = body.ids;

    if (!Array.isArray(ids) || ids.length === 0) return jsonError("BAD_REQUEST");

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("students").delete().in("id", ids);

    if (error) return jsonError("INTERNAL_ERROR", 500);
    return NextResponse.json({ deleted: ids.length });
  } catch {
    return jsonError("BAD_REQUEST");
  }
}
