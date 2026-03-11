import Link from "next/link";
import { formatTimestamp } from "@/lib/format";
import type { RegistrationSummary } from "@/lib/types";

interface RegistrationSummaryCardProps {
  registration: RegistrationSummary | null;
  onCancel?: () => void;
  cancelLoading?: boolean;
  showManageLink?: boolean;
}

export function RegistrationSummaryCard({
  registration,
  onCancel,
  cancelLoading = false,
  showManageLink = false,
}: RegistrationSummaryCardProps) {
  if (!registration) {
    return (
      <section className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-extrabold">신청 현황</h2>
        <p className="mt-2 text-sm text-slate-700">현재 신청된 조가 없습니다.</p>
        {showManageLink ? (
          <Link
            href="/labs"
            className="mt-4 inline-flex rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-bold text-white"
          >
            조 선택 화면으로
          </Link>
        ) : null}
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
      <h2 className="text-lg font-extrabold">신청 현황</h2>
      <dl className="mt-3 space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-slate-600">조</dt>
          <dd className="font-bold">{registration.labNumber}조</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-slate-600">상태</dt>
          <dd className="font-bold">
            {registration.status === "confirmed" ? (
              <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-bold text-green-700">
                신청 완료
              </span>
            ) : (
              <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-bold text-orange-700">
                대기 중
              </span>
            )}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-slate-600">대기 순번</dt>
          <dd className="font-bold">
            {registration.status === "waiting"
              ? `${registration.queuePosition ?? "-"}번`
              : "-"}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-slate-600">신청 시간</dt>
          <dd className="font-bold">{formatTimestamp(registration.timestamp)}</dd>
        </div>
      </dl>

      <div className="mt-4 flex gap-2">
        {showManageLink ? (
          <Link
            href="/labs"
            className="rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-bold text-white"
          >
            변경하러 가기
          </Link>
        ) : (
          <Link
            href="/status"
            className="rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-sm font-bold"
          >
            상세 보기
          </Link>
        )}
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            disabled={cancelLoading}
            className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-70"
          >
            {cancelLoading ? "취소 중..." : "취소"}
          </button>
        ) : null}
      </div>
    </section>
  );
}

