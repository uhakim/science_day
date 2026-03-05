import { redirect } from "next/navigation";
import { getAdminServerSession } from "@/lib/admin-auth";
import { AdminClient } from "@/app/admin/admin-client";
import { AdminLogoutButton } from "@/components/admin-logout-button";

export default async function AdminPage() {
  const session = await getAdminServerSession();
  if (!session) redirect("/admin/login");

  return (
    <main className="paper-bg min-h-screen p-6">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-extrabold text-[var(--foreground)]">
            과학의 날 관리자
          </h1>
          <AdminLogoutButton />
        </header>
        <AdminClient />
      </div>
    </main>
  );
}
