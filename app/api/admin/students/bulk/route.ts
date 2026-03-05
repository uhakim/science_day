import { NextResponse } from "next/server";
import { readAdminApiSession } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { jsonError } from "@/lib/http";

export async function POST(request: Request) {
  const session = await readAdminApiSession();
  if (!session) return jsonError("UNAUTHORIZED", 401);

  try {
    const body = (await request.json()) as {
      students?: { grade: number; class: number; name: string }[];
    };

    if (!Array.isArray(body.students) || body.students.length === 0) {
      return jsonError("BAD_REQUEST");
    }

    const rows = body.students.map((s) => ({
      grade: Number(s.grade),
      class: Number(s.class),
      name: String(s.name ?? "").trim(),
    }));

    for (const r of rows) {
      if (!Number.isInteger(r.grade) || r.grade < 1 || r.grade > 6) return jsonError("BAD_REQUEST");
      if (!Number.isInteger(r.class) || r.class < 1) return jsonError("BAD_REQUEST");
      if (!r.name) return jsonError("BAD_REQUEST");
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("students")
      .upsert(rows, { onConflict: "grade,class,name" })
      .select("id, grade, class, name");

    if (error) return jsonError("INTERNAL_ERROR", 500);
    return NextResponse.json({ inserted: data?.length ?? 0 }, { status: 201 });
  } catch {
    return jsonError("BAD_REQUEST");
  }
}
