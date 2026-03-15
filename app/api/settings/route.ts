import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import {
  fetchAllRegistrationGradeSettings,
  fetchRegistrationSettingsForGrade,
  getRegistrationStatus,
} from "@/lib/registration-settings";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const gradeParam = url.searchParams.get("grade");

  if (gradeParam) {
    const grade = Number(gradeParam);
    if (!Number.isInteger(grade) || grade < 1 || grade > 6) return jsonError("BAD_REQUEST");

    const settings = await fetchRegistrationSettingsForGrade(grade);
    return NextResponse.json({
      grade: settings.grade,
      openAt: settings.openAt,
      closeAt: settings.closeAt,
      status: getRegistrationStatus(settings),
    });
  }

  const settings = await fetchAllRegistrationGradeSettings();
  return NextResponse.json({
    settings: settings.map((entry) => ({
      grade: entry.grade,
      openAt: entry.openAt,
      closeAt: entry.closeAt,
      status: getRegistrationStatus(entry),
    })),
  });
}
