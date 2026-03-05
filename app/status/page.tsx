import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/server-auth";
import { StatusClient } from "@/app/status/status-client";

export default async function StatusPage() {
  const session = await getServerSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <StatusClient
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

