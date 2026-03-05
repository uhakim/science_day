import { NextResponse } from "next/server";
import { resolveErrorMessage } from "@/lib/errors";

export function jsonError(code: string, status = 400) {
  return NextResponse.json(
    {
      error: {
        code,
        message: resolveErrorMessage(code),
      },
    },
    { status },
  );
}

