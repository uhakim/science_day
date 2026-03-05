"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const [grade, setGrade] = useState("1");
  const [classNumber, setClassNumber] = useState("1");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grade: Number(grade),
          class: Number(classNumber),
          name: name.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data?.error?.message ?? "로그인에 실패했습니다.");
        return;
      }

      router.replace("/labs");
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="mt-5 space-y-4" onSubmit={onSubmit}>
      <div>
        <label className="mb-1 block text-sm font-bold text-slate-700">학년</label>
        <select
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
          className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 outline-none focus:border-[var(--accent)]"
        >
          {[1, 2, 3, 4, 5, 6].map((v) => (
            <option key={v} value={v}>
              {v}학년
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-bold text-slate-700">반</label>
        <select
          value={classNumber}
          onChange={(e) => setClassNumber(e.target.value)}
          className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 outline-none focus:border-[var(--accent)]"
        >
          {Array.from({ length: 4 }, (_, i) => i + 1).map((v) => (
            <option key={v} value={v}>
              {v}반
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-bold text-slate-700">이름</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 outline-none focus:border-[var(--accent)]"
          required
        />
      </div>

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
        {submitting ? "로그인 중..." : "로그인"}
      </button>
    </form>
  );
}

