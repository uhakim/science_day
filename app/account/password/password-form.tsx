"use client";

import Link from "next/link";
import { useState } from "react";
import { LogoutButton } from "@/components/logout-button";
import type { StudentSession } from "@/lib/types";

interface PasswordFormProps {
  student: Omit<StudentSession, "iat" | "exp">;
}

export function PasswordForm({ student }: PasswordFormProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("새 비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data?.error?.message ?? "비밀번호 변경에 실패했습니다.");
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("비밀번호가 변경되었습니다.");
    } catch {
      setError("비밀번호 변경 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="paper-bg min-h-screen p-4 sm:p-6">
      <section className="mx-auto max-w-2xl space-y-5">
        <header className="rounded-2xl border border-[var(--line)] bg-white/95 p-5 shadow">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold text-[var(--accent)]">🔐 계정 관리</p>
              <h1 className="mt-0.5 text-2xl font-extrabold text-[var(--foreground)]">
                비밀번호 변경
              </h1>
              <p className="mt-0.5 text-sm text-slate-600">
                {student.grade}학년 {student.classNumber}반 {student.name}
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/labs"
                className="rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-sm font-bold"
              >
                조 선택
              </Link>
              <Link
                href="/status"
                className="rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-sm font-bold"
              >
                신청 현황
              </Link>
              <LogoutButton />
            </div>
          </div>
        </header>

        <section className="rounded-2xl border border-[var(--line)] bg-white/95 p-5 shadow">
          <form className="space-y-4" onSubmit={onSubmit}>
            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">현재 비밀번호</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 outline-none focus:border-[var(--accent)]"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">새 비밀번호</label>
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 outline-none focus:border-[var(--accent)]"
                required
              />
              <p className="mt-1 text-xs text-slate-500">새 비밀번호는 4자 이상 입력하세요.</p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">새 비밀번호 확인</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 outline-none focus:border-[var(--accent)]"
                required
              />
            </div>

            {message ? (
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                {message}
              </p>
            ) : null}
            {error ? (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-600">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-[var(--accent)] px-4 py-3 font-bold text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {submitting ? "변경 중..." : "비밀번호 변경"}
            </button>
          </form>
        </section>
      </section>
    </main>
  );
}
