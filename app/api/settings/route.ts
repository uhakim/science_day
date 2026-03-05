import { NextResponse } from "next/server";
import { fetchRegistrationSettings, getRegistrationStatus } from "@/lib/registration-settings";

export async function GET() {
  const settings = await fetchRegistrationSettings();
  return NextResponse.json({
    openAt: settings.openAt,
    closeAt: settings.closeAt,
    status: getRegistrationStatus(settings),
  });
}
