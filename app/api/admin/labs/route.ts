import { NextResponse } from "next/server";
import { readAdminApiSession } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { jsonError } from "@/lib/http";

export async function GET() {
  const session = await readAdminApiSession();
  if (!session) return jsonError("UNAUTHORIZED", 401);

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("labs")
    .select("id, group_type, lab_number")
    .order("group_type")
    .order("lab_number");

  if (error) return jsonError("INTERNAL_ERROR", 500);
  return NextResponse.json({ labs: data });
}
