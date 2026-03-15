import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/server-auth";
import { LabsClient } from "@/app/labs/labs-client";
import { fetchRegistrationSettingsForGrade, getRegistrationStatus } from "@/lib/registration-settings";

export default async function LabsPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  const settings = await fetchRegistrationSettingsForGrade(session.grade);
  const registrationStatus = getRegistrationStatus(settings);

  return (
    <LabsClient
      student={{
        studentId: session.studentId,
        grade: session.grade,
        classNumber: session.classNumber,
        name: session.name,
        groupType: session.groupType,
      }}
      registrationStatus={registrationStatus}
      openAt={settings.openAt}
      closeAt={settings.closeAt}
    />
  );
}
