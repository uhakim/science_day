import { NextResponse } from "next/server";
import { readAdminApiSession } from "@/lib/admin-auth";
import { extractErrorCode } from "@/lib/errors";
import { getSupabaseAdmin } from "@/lib/supabase";
import { jsonError } from "@/lib/http";
import { upsertStudentCredentials } from "@/lib/student-credentials";

export async function POST(request: Request) {
  const session = await readAdminApiSession();
  if (!session) return jsonError("UNAUTHORIZED", 401);

  try {
    const body = (await request.json()) as {
      students?: { grade: number; class: number; name: string; birthDate: string }[];
    };

    if (!Array.isArray(body.students) || body.students.length === 0) {
      return jsonError("BAD_REQUEST");
    }

    const rows = body.students.map((s) => ({
      grade: Number(s.grade),
      class: Number(s.class),
      name: String(s.name ?? "").trim(),
      birthDate: String(s.birthDate ?? "").trim(),
    }));

    for (const r of rows) {
      if (!Number.isInteger(r.grade) || r.grade < 1 || r.grade > 6) return jsonError("BAD_REQUEST");
      if (!Number.isInteger(r.class) || r.class < 1) return jsonError("BAD_REQUEST");
      if (!r.name) return jsonError("BAD_REQUEST");
      if (!r.birthDate) return jsonError("BAD_REQUEST");
    }

    const supabase = getSupabaseAdmin();
    for (const row of rows) {
      await upsertStudentCredentials(supabase, {
        grade: row.grade,
        classNumber: row.class,
        name: row.name,
        birthDate: row.birthDate,
      });
    }

    return NextResponse.json({ inserted: rows.length }, { status: 201 });
  } catch (error) {
    return jsonError(extractErrorCode(error instanceof Error ? error.message : undefined));
  }
}
