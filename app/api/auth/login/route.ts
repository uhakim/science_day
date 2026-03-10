import { NextResponse } from "next/server";
import { createSessionToken, getSessionMaxAgeSeconds, SESSION_COOKIE_NAME } from "@/lib/sessions";
import { verifyPassword } from "@/lib/password";
import { getSupabaseAdmin } from "@/lib/supabase";
import { jsonError } from "@/lib/http";

function resolveGroupType(grade: number): "LOW" | "HIGH" {
  return grade <= 3 ? "LOW" : "HIGH";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      grade?: number;
      class?: number;
      name?: string;
      password?: string;
    };

    const grade = Number(body.grade);
    const classNumber = Number(body.class);
    const name = String(body.name ?? "").trim();
    const password = typeof body.password === "string" ? body.password : "";

    if (!Number.isInteger(grade) || grade < 1 || grade > 6) {
      return jsonError("BAD_REQUEST");
    }
    if (!Number.isInteger(classNumber) || classNumber < 1) {
      return jsonError("BAD_REQUEST");
    }
    if (!name) {
      return jsonError("BAD_REQUEST");
    }
    if (!password) {
      return jsonError("BAD_REQUEST");
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("students")
      .select("id, grade, class, name, password_hash")
      .eq("grade", grade)
      .eq("class", classNumber)
      .eq("name", name)
      .single();

    if (error || !data || !(await verifyPassword(password, data.password_hash))) {
      return jsonError("INVALID_CREDENTIALS", 401);
    }

    const groupType = resolveGroupType(data.grade);
    const token = createSessionToken({
      studentId: data.id,
      grade: data.grade,
      classNumber: data.class as number,
      name: data.name as string,
      groupType,
    });

    const response = NextResponse.json({
      student: {
        id: data.id,
        grade: data.grade,
        class: data.class,
        name: data.name,
        groupType,
      },
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: getSessionMaxAgeSeconds(),
    });

    return response;
  } catch {
    return jsonError("BAD_REQUEST");
  }
}
