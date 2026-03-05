import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/server-auth";
import { LabsClient } from "@/app/labs/labs-client";

export default async function LabsPage() {
  const session = await getServerSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <LabsClient
      student={{
        studentId: session.studentId,
        grade: session.grade,
        classNumber: session.classNumber,
        name: session.name,
        groupType: session.groupType,
      }}
    />
  );
}

