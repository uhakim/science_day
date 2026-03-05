"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { LogoutButton } from "@/components/logout-button";
import { RegistrationSummaryCard } from "@/components/registration-summary-card";
import type { RegistrationSummary, StudentSession } from "@/lib/types";

interface MeResponse {
  registration: RegistrationSummary | null;
}

interface StatusClientProps {
  student: Omit<StudentSession, "iat" | "exp">;
}

export function StatusClient({ student }: StatusClientProps) {
  const [registration, setRegistration] = useState<RegistrationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/registrations/me", { cache: "no-store" });
      const data = (await response.json()) as MeResponse & {
        error?: { message?: string };
      };
      if (!response.ok) {
        throw new Error(data.error?.message ?? "신청 현황 조회 실패");
      }
      setRegistration(data.registration);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "조회 실패");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onCancel = async () => {
    setCancelLoading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/registrations/cancel", { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error?.message ?? "취소 실패");
      }
      setMessage("신청이 취소되었습니다.");
      await load();
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : "취소 실패");
    } finally {
      setCancelLoading(false);
    }
  };

  return (
    <main className="paper-bg min-h-screen p-4 sm:p-6">
      <section className="mx-auto max-w-3xl space-y-5">
        <header className="rounded-2xl border border-[var(--line)] bg-white/95 p-5 shadow">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold text-[var(--accent)]">🔬 과학의 날 Lab 신청</p>
              <h1 className="mt-0.5 text-2xl font-extrabold text-[var(--foreground)]">
                신청 현황
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
                Lab 선택 화면
              </Link>
              <LogoutButton />
            </div>
          </div>
        </header>

        {message ? (
          <p className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-800">
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">
            {error}
          </p>
        ) : null}

        {loading ? (
          <section className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-700">신청 정보를 불러오는 중...</p>
          </section>
        ) : (
          <RegistrationSummaryCard
            registration={registration}
            onCancel={registration ? onCancel : undefined}
            cancelLoading={cancelLoading}
            showManageLink
          />
        )}
      </section>
    </main>
  );
}

