import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { createAdminToken, getAdminSessionMaxAgeSeconds, ADMIN_SESSION_COOKIE_NAME } from "@/lib/sessions";
import { jsonError } from "@/lib/http";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { password?: string };
    const password = String(body.password ?? "");

    if (!password || password !== getEnv().adminPassword) {
      return jsonError("UNAUTHORIZED", 401);
    }

    const token = createAdminToken();
    const response = NextResponse.json({ ok: true });
    response.cookies.set({
      name: ADMIN_SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: getAdminSessionMaxAgeSeconds(),
    });
    return response;
  } catch {
    return jsonError("BAD_REQUEST");
  }
}
