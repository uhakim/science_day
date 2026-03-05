import { NextResponse } from "next/server";
import { readAdminApiSession } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { jsonError } from "@/lib/http";

export async function GET() {
  const session = await readAdminApiSession();
  if (!session) return jsonError("UNAUTHORIZED", 401);

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("students")
    .select("id, grade, class, name, created_at")
    .order("grade", { ascending: true })
    .order("class", { ascending: true })
    .order("name", { ascending: true });

  if (error) return jsonError("INTERNAL_ERROR", 500);
  return NextResponse.json({ students: data });
}

export async function POST(request: Request) {
  const session = await readAdminApiSession();
  if (!session) return jsonError("UNAUTHORIZED", 401);

  try {
    const body = (await request.json()) as { grade?: number; class?: number; name?: string };
    const grade = Number(body.grade);
    const classNumber = Number(body.class);
    const name = String(body.name ?? "").trim();

    if (!Number.isInteger(grade) || grade < 1 || grade > 6) return jsonError("BAD_REQUEST");
    if (!Number.isInteger(classNumber) || classNumber < 1) return jsonError("BAD_REQUEST");
    if (!name) return jsonError("BAD_REQUEST");

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("students")
      .upsert({ grade, class: classNumber, name }, { onConflict: "grade,class,name" })
      .select("id, grade, class, name, created_at")
      .single();

    if (error || !data) return jsonError("INTERNAL_ERROR", 500);
    return NextResponse.json({ student: data }, { status: 201 });
  } catch {
    return jsonError("BAD_REQUEST");
  }
}
