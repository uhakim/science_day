"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LabCard } from "@/components/lab-card";
import { LogoutButton } from "@/components/logout-button";
import { RegistrationSummaryCard } from "@/components/registration-summary-card";
import type { LabSummary, RegistrationSummary, StudentSession } from "@/lib/types";

interface LabsResponse {
  groupType: "LOW" | "HIGH";
  labs: LabSummary[];
}

interface MeResponse {
  registration: RegistrationSummary | null;
}

interface LabsClientProps {
  student: Omit<StudentSession, "iat" | "exp">;
}

export function LabsClient({ student }: LabsClientProps) {
  const [labs, setLabs] = useState<LabSummary[]>([]);
  const [registration, setRegistration] = useState<RegistrationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyLabId, setBusyLabId] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);

    try {
      const [labsRes, meRes] = await Promise.all([
        fetch("/api/labs", { cache: "no-store" }),
        fetch("/api/registrations/me", { cache: "no-store" }),
      ]);

      const [labsData, meData] = (await Promise.all([labsRes.json(), meRes.json()])) as [
        LabsResponse,
        MeResponse,
      ];

      if (!labsRes.ok || !meRes.ok) {
        throw new Error(
          (labsData as { error?: { message?: string } }).error?.message ??
            (meData as { error?: { message?: string } }).error?.message ??
            "조회에 실패했습니다.",
        );
      }

      setLabs(labsData.labs);
      setRegistration(meData.registration);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "데이터를 불러오지 못했습니다.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = setInterval(() => {
      void load(true);
    }, 5000);
    return () => clearInterval(timer);
  }, [load]);

  const runAction = async (labId: string) => {
    setBusyLabId(labId);
    setError(null);
    setNotice(null);

    try {
      if (!registration) {
        const response = await fetch("/api/registrations/apply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ labId }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error?.message ?? "신청 실패");
        }
        setNotice(data.status === "confirmed" ? "신청 완료" : "대기 등록 완료");
      } else if (registration.labId === labId) {
        setCancelLoading(true);
        const response = await fetch("/api/registrations/cancel", {
          method: "POST",
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error?.message ?? "취소 실패");
        }
        setNotice("신청이 취소되었습니다.");
      } else {
        const response = await fetch("/api/registrations/change", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newLabId: labId }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error?.message ?? "변경 실패");
        }
        setNotice(data.newStatus === "confirmed" ? "변경 완료" : "변경 후 대기 등록");
      }
      await load();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "처리 중 오류가 발생했습니다.",
      );
    } finally {
      setCancelLoading(false);
      setBusyLabId(null);
    }
  };

  const groupLabel = useMemo(
    () => (student.groupType === "LOW" ? "저학년부 (1~3학년)" : "고학년부 (4~6학년)"),
    [student.groupType],
  );

  const buttonTextFor = (labId: string): "신청" | "변경" | "취소" => {
    if (!registration) {
      return "신청";
    }
    return registration.labId === labId ? "취소" : "변경";
  };

  return (
    <main className="paper-bg min-h-screen p-4 sm:p-6">
      <section className="mx-auto max-w-6xl space-y-5">
        <header className="rounded-2xl border border-[var(--line)] bg-white/95 p-5 shadow">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold text-[var(--accent)]">🔬 과학의 날 Lab 신청 · {groupLabel}</p>
              <h1 className="mt-0.5 text-2xl font-extrabold text-[var(--foreground)]">
                {student.grade}학년 {student.classNumber}반 {student.name}
              </h1>
            </div>
            <div className="flex gap-2">
              <Link
                href="/status"
                className="rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-sm font-bold"
              >
                신청 현황 화면
              </Link>
              <LogoutButton />
            </div>
          </div>
        </header>

        {notice ? (
          <p className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-800">
            {notice}
          </p>
        ) : null}
        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">
            {error}
          </p>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
          <section className="rounded-2xl border border-[var(--line)] bg-white/95 p-5 shadow">
            <h2 className="text-xl font-extrabold">Lab 선택</h2>
            {loading ? (
              <p className="mt-4 text-sm text-slate-600">목록을 불러오는 중...</p>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {labs.map((lab) => (
                  <LabCard
                    key={lab.id}
                    lab={lab}
                    buttonText={buttonTextFor(lab.id)}
                    isSelected={registration?.labId === lab.id}
                    disabled={busyLabId !== null}
                    onClick={() => {
                      void runAction(lab.id);
                    }}
                  />
                ))}
              </div>
            )}
          </section>

          <RegistrationSummaryCard
            registration={registration}
            onCancel={
              registration
                ? () => {
                    void runAction(registration.labId);
                  }
                : undefined
            }
            cancelLoading={cancelLoading || busyLabId === registration?.labId}
          />
        </div>
      </section>
    </main>
  );
}

