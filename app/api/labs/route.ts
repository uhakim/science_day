import { readApiSession } from "@/lib/api-auth";
import { jsonError } from "@/lib/http";
import { getSupabaseAdmin } from "@/lib/supabase";

interface LabRow {
  id: string;
  group_type: "LOW" | "HIGH";
  lab_number: number;
  capacity: number;
  confirmed_count: number;
  waiting_count: number;
}

export async function GET() {
  const session = await readApiSession();
  if (!session) {
    return jsonError("UNAUTHORIZED", 401);
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc("rpc_get_labs_for_group", {
    p_group_type: session.groupType,
  });

  if (error) {
    return jsonError("INTERNAL_ERROR", 500);
  }

  const rows = (data ?? []) as LabRow[];
  return Response.json({
    groupType: session.groupType,
    labs: rows.map((row) => ({
      id: row.id,
      groupType: row.group_type,
      labNumber: row.lab_number,
      capacity: row.capacity,
      confirmedCount: row.confirmed_count,
      waitingCount: row.waiting_count,
    })),
  });
}

