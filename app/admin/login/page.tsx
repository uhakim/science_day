import { redirect } from "next/navigation";
import { getAdminServerSession } from "@/lib/admin-auth";
import { AdminLoginForm } from "@/app/admin/login/login-form";

export default async function AdminLoginPage() {
  const session = await getAdminServerSession();
  if (session) redirect("/admin");

  return (
    <main className="paper-bg flex min-h-screen items-center justify-center p-6">
      <section className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-white/95 p-8 shadow-lg backdrop-blur">
        <div className="mb-6 text-center">
          <div className="mb-3 text-5xl">🔐</div>
          <h1 className="text-2xl font-extrabold text-[var(--foreground)]">관리자 로그인</h1>
          <p className="mt-2 text-sm text-slate-500">관리자 비밀번호를 입력하세요.</p>
        </div>
        <AdminLoginForm />
      </section>
    </main>
  );
}
