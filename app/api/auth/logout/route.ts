import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/sessions";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    maxAge: 0,
    path: "/",
  });
  return response;
}

