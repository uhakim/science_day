import type { LabSummary } from "@/lib/types";

interface LabCardProps {
  lab: LabSummary;
  buttonText: "신청" | "변경" | "취소";
  isSelected?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export function LabCard({ lab, buttonText, isSelected, disabled, onClick }: LabCardProps) {
  const fillRatio = lab.capacity > 0 ? lab.confirmedCount / lab.capacity : 0;
  const isFull = lab.confirmedCount >= lab.capacity;
  const remaining = lab.capacity - lab.confirmedCount;

  const buttonClass =
    buttonText === "취소"
      ? "bg-red-500 hover:bg-red-600"
      : buttonText === "변경"
        ? "bg-slate-700 hover:bg-slate-800"
        : "bg-[var(--accent)] hover:bg-[var(--accent-strong)]";

  return (
    <article
      className={`rounded-2xl border p-5 shadow-sm transition-all ${
        isSelected
          ? "border-[var(--accent)] bg-blue-50 ring-2 ring-[var(--accent)]/20"
          : "border-[var(--line)] bg-[var(--surface)]"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-xl font-extrabold text-[var(--foreground)]">Lab {lab.labNumber}</h3>
        {isSelected && (
          <span className="shrink-0 rounded-full bg-[var(--accent)] px-2.5 py-0.5 text-xs font-bold text-white">
            신청됨
          </span>
        )}
      </div>

      <div className="mt-3 space-y-1.5">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>신청 현황</span>
          <span className="font-semibold text-slate-700">
            {lab.confirmedCount} / {lab.capacity}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all ${isFull ? "bg-red-400" : "bg-[var(--accent)]"}`}
            style={{ width: `${Math.min(100, fillRatio * 100)}%` }}
          />
        </div>
        <p className="text-xs text-slate-500">
          {isFull ? (
            <span className="font-semibold text-red-500">마감</span>
          ) : (
            <span>잔여 {remaining}석</span>
          )}
          {lab.waitingCount > 0 && <span className="ml-2 text-[var(--warning)]">· 대기 {lab.waitingCount}명</span>}
        </p>
      </div>

      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`mt-4 w-full rounded-xl px-4 py-2 font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${buttonClass}`}
      >
        {buttonText}
      </button>
    </article>
  );
}
