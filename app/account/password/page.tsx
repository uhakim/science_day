import { redirect } from "next/navigation";
import { PasswordForm } from "@/app/account/password/password-form";
import { getServerSession } from "@/lib/server-auth";

export default async function PasswordPage() {
  const session = await getServerSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <PasswordForm
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
