import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/server-auth";
import { LoginForm } from "@/app/login/login-form";

export default async function LoginPage() {
  const session = await getServerSession();
  if (session) {
    redirect("/labs");
  }

  return (
    <main className="paper-bg flex min-h-screen items-center justify-center p-6">
      <section className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-white/95 p-8 shadow-lg backdrop-blur">
        <div className="mb-6 text-center">
          <div className="mb-3 text-5xl">🔬</div>
          <h1 className="text-2xl font-extrabold text-[var(--foreground)]">
            과학의 날 조 신청
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            학년, 반, 이름과 비밀번호를 입력하면 신청 화면으로 이동합니다.
          </p>
        </div>
        <LoginForm />
      </section>
    </main>
  );
}
