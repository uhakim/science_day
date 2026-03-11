"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";

/* ─────────────────────── types ─────────────────────── */
interface Student {
  id: string;
  grade: number;
  class: number;
  name: string;
  birthDate: string | null;
  hasPassword: boolean;
  created_at: string;
}

interface LabRegistration {
  lab_id: string;
  lab_number: number;
  group_type: string;
  registration_id: number;
  status: string;
  timestamp: string;
  student_id: string;
  grade: number;
  class: number;
  name: string;
}

type Tab = "students" | "by-lab" | "by-class" | "settings";

/* ─────────────────────── helpers ─────────────────────── */
function groupByLab(rows: LabRegistration[]) {
  const map = new Map<number, { groupType: string; confirmed: LabRegistration[]; waiting: LabRegistration[] }>();
  for (const r of rows) {
    if (!map.has(r.lab_number)) {
      map.set(r.lab_number, { groupType: r.group_type, confirmed: [], waiting: [] });
    }
    const entry = map.get(r.lab_number)!;
    if (r.status === "confirmed") entry.confirmed.push(r);
    else if (r.status === "waiting") entry.waiting.push(r);
  }
  return map;
}

function groupByClass(rows: LabRegistration[]) {
  // grade-class → list of registrations
  const map = new Map<string, LabRegistration[]>();
  for (const r of rows) {
    const key = `${r.grade}-${r.class}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }
  return map;
}

/* ─────────────────────── sub-components ─────────────────────── */

function StudentsTab() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterGrade, setFilterGrade] = useState("all");
  const [filterClass, setFilterClass] = useState("all");

  // add form
  const [grade, setGrade] = useState("1");
  const [cls, setCls] = useState("1");
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // bulk register
  const [bulkText, setBulkText] = useState("");
  const [bulking, setBulking] = useState(false);
  const [bulkMsg, setBulkMsg] = useState<string | null>(null);
  const [bulkError, setBulkError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // selection & delete
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [tableMessage, setTableMessage] = useState<string | null>(null);
  const [tableError, setTableError] = useState<string | null>(null);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/students");
    const data = await res.json();
    setStudents(data.students ?? []);
    setLoading(false);
  }, []);

  // Initial data load for admin table.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void fetchStudents(); }, [fetchStudents]);

  const filtered = students.filter((s) => {
    if (filterGrade !== "all" && s.grade !== Number(filterGrade)) return false;
    if (filterClass !== "all" && s.class !== Number(filterClass)) return false;
    return true;
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    setAddError(null);
    const res = await fetch("/api/admin/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grade: Number(grade),
        class: Number(cls),
        name: name.trim(),
        birthDate,
      }),
    });
    if (res.ok) {
      setName("");
      setBirthDate("");
      await fetchStudents();
    } else {
      const data = await res.json().catch(() => null);
      setAddError(data?.error?.message ?? "추가에 실패했습니다.");
    }
    setAdding(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const wb = XLSX.read(data, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<(string | number)[]>(ws, { header: 1, raw: false });
        const lines = rows
          .filter((r) => r.length >= 4 && r[0] !== undefined)
          .map((r) => `${r[0]},${r[1]},${r[2]},${r[3]}`);
        setBulkText(lines.join("\n"));
        setBulkMsg(null);
        setBulkError(false);
      } catch {
        setBulkMsg("파일을 읽을 수 없습니다.");
        setBulkError(true);
      }
    };
    reader.readAsBinaryString(file);
    // 같은 파일 재선택 가능하도록 초기화
    e.target.value = "";
  };

  const handleBulk = async () => {
    setBulking(true);
    setBulkMsg(null);
    setBulkError(false);
    const lines = bulkText.split("\n").map((l) => l.trim()).filter(Boolean);
    const rows = lines.map((l) => {
      const parts = l.split(",");
      return {
        grade: Number(parts[0]?.trim()),
        class: Number(parts[1]?.trim()),
        name: parts[2]?.trim() ?? "",
        birthDate: parts[3]?.trim() ?? "",
      };
    });
    const res = await fetch("/api/admin/students/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ students: rows }),
    });
    if (res.ok) {
      const d = await res.json();
      setBulkMsg(`${d.inserted}명 등록 완료`);
      setBulkError(false);
      setBulkText("");
      await fetchStudents();
    } else {
      const data = await res.json().catch(() => null);
      setBulkMsg(data?.error?.message ?? "일괄 등록 실패. 형식을 확인하세요.");
      setBulkError(true);
    }
    setBulking(false);
  };

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((s) => selectedIds.has(s.id));
  const someSelected = filtered.some((s) => selectedIds.has(s.id));

  const toggleAll = () => {
    if (allFilteredSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((s) => next.delete(s.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((s) => next.add(s.id));
        return next;
      });
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleDelete = async (ids: string[]) => {
    if (!confirm(`${ids.length}명을 삭제하시겠습니까?\n삭제 시 해당 학생의 신청 내역도 함께 삭제됩니다.`)) return;
    setDeleting(true);
    setTableMessage(null);
    setTableError(null);
    const res = await fetch("/api/admin/students", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    if (res.ok) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      await fetchStudents();
      setTableMessage("학생 정보가 삭제되었습니다.");
    } else {
      setTableError("학생 삭제에 실패했습니다.");
    }
    setDeleting(false);
  };

  const handleResetPassword = async (student: Student) => {
    if (!confirm(`${student.grade}학년 ${student.class}반 ${student.name}의 비밀번호를 생년월일 초기값으로 재설정하시겠습니까?`)) {
      return;
    }

    setResettingId(student.id);
    setTableMessage(null);
    setTableError(null);

    const res = await fetch("/api/admin/students/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: student.id }),
    });

    if (res.ok) {
      setTableMessage("비밀번호가 생년월일 초기값으로 재설정되었습니다.");
      await fetchStudents();
    } else {
      const data = await res.json().catch(() => null);
      setTableError(data?.error?.message ?? "비밀번호 초기화에 실패했습니다.");
    }

    setResettingId(null);
  };

  return (
    <div className="space-y-6">
      {/* individual add */}
      <div className="rounded-xl border border-[var(--line)] bg-white p-4">
        <h2 className="mb-3 font-bold text-slate-700">개별 학생 추가</h2>
        <form onSubmit={handleAdd} className="flex flex-wrap gap-2">
          <select
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="rounded-lg border border-[var(--line)] px-2 py-1.5 text-sm"
          >
            {[1,2,3,4,5,6].map((v) => <option key={v} value={v}>{v}학년</option>)}
          </select>
          <select
            value={cls}
            onChange={(e) => setCls(e.target.value)}
            className="rounded-lg border border-[var(--line)] px-2 py-1.5 text-sm"
          >
            {[1,2,3,4].map((v) => <option key={v} value={v}>{v}반</option>)}
          </select>
          <input
            type="text"
            placeholder="이름"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-[var(--line)] px-2 py-1.5 text-sm"
            required
          />
          <input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            className="rounded-lg border border-[var(--line)] px-2 py-1.5 text-sm"
            required
          />
          <button
            type="submit"
            disabled={adding}
            className="rounded-lg bg-[var(--accent)] px-4 py-1.5 text-sm font-bold text-white hover:bg-[var(--accent-strong)] disabled:bg-slate-400"
          >
            {adding ? "추가 중..." : "추가"}
          </button>
        </form>
        {addError && <p className="mt-2 text-sm text-red-600">{addError}</p>}
      </div>

      {/* bulk */}
      <div className="rounded-xl border border-[var(--line)] bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-bold text-slate-700">일괄 등록</h2>
          <button
            type="button"
            onClick={() => {
              const wb = XLSX.utils.book_new();
              const ws = XLSX.utils.aoa_to_sheet([
                ["학년", "반", "이름", "생년월일"],
                [1, 1, "홍길동", "20140312"],
                [1, 2, "김철수", "20140521"],
              ]);
              XLSX.utils.book_append_sheet(wb, ws, "학생명단");
              XLSX.writeFile(wb, "학생명단_서식.xlsx");
            }}
            className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
          >
            📄 서식 파일 다운로드
          </button>
        </div>
        <p className="mb-3 text-xs text-slate-500">
          엑셀(.xlsx/.xls) 또는 CSV 파일을 업로드하거나, 아래에 직접 입력하세요.
          <br />형식: 첫 번째 열 = 학년, 두 번째 열 = 반, 세 번째 열 = 이름, 네 번째 열 = 생년월일
          <br />생년월일은 `YYYYMMDD` 또는 `YYYY-MM-DD` 형식을 사용하세요.
        </p>

        {/* 파일 업로드 */}
        <div className="mb-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-lg border border-[var(--accent)] px-4 py-2 text-sm font-bold text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-colors"
          >
            📂 파일 선택 (.xlsx / .xls / .csv)
          </button>
        </div>

        <textarea
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
          rows={6}
          placeholder={"1,1,홍길동,20140312\n1,2,김철수,20140521\n2,1,이영희,20130208"}
          className="w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm font-mono"
        />
        <div className="mt-2 flex items-center gap-3">
          <button
            onClick={handleBulk}
            disabled={bulking || !bulkText.trim()}
            className="rounded-lg bg-[var(--accent)] px-4 py-1.5 text-sm font-bold text-white hover:bg-[var(--accent-strong)] disabled:bg-slate-400"
          >
            {bulking ? "등록 중..." : "일괄 등록"}
          </button>
          {bulkMsg && (
            <span className={`text-sm font-semibold ${bulkError ? "text-red-600" : "text-emerald-600"}`}>
              {bulkMsg}
            </span>
          )}
        </div>
      </div>

      {/* list */}
      <div className="rounded-xl border border-[var(--line)] bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="font-bold text-slate-700">학생 목록</h2>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
            {filtered.length}명
          </span>
          {someSelected && (
            <button
              onClick={() => handleDelete(Array.from(selectedIds).filter((id) => filtered.some((s) => s.id === id)))}
              disabled={deleting}
              className="rounded-lg bg-red-500 px-3 py-1 text-xs font-bold text-white hover:bg-red-600 disabled:opacity-50"
            >
              {deleting ? "삭제 중..." : `선택 삭제 (${Array.from(selectedIds).filter((id) => filtered.some((s) => s.id === id)).length}명)`}
            </button>
          )}
          <select
            value={filterGrade}
            onChange={(e) => { setFilterGrade(e.target.value); setSelectedIds(new Set()); }}
            className="ml-auto rounded-lg border border-[var(--line)] px-2 py-1 text-sm"
          >
            <option value="all">전체 학년</option>
            {[1,2,3,4,5,6].map((v) => <option key={v} value={v}>{v}학년</option>)}
          </select>
          <select
            value={filterClass}
            onChange={(e) => { setFilterClass(e.target.value); setSelectedIds(new Set()); }}
            className="rounded-lg border border-[var(--line)] px-2 py-1 text-sm"
          >
            <option value="all">전체 반</option>
            {[1,2,3,4].map((v) => <option key={v} value={v}>{v}반</option>)}
          </select>
        </div>
        {tableMessage ? (
          <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
            {tableMessage}
          </p>
        ) : null}
        {tableError ? (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-600">
            {tableError}
          </p>
        ) : null}
        {loading ? (
          <p className="text-sm text-slate-500">불러오는 중...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--line)] text-left text-xs text-slate-500">
                  <th className="pb-2 pr-2 w-8">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      ref={(el) => { if (el) el.indeterminate = someSelected && !allFilteredSelected; }}
                      onChange={toggleAll}
                      className="cursor-pointer"
                    />
                  </th>
                  <th className="pb-2 pr-3">학년</th>
                  <th className="pb-2 pr-3">반</th>
                  <th className="pb-2 pr-3">이름</th>
                  <th className="pb-2 pr-3">생년월일</th>
                  <th className="pb-2 pr-3">비밀번호</th>
                  <th className="pb-2">등록일시</th>
                  <th className="pb-2 text-right">관리</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr
                    key={s.id}
                    className={`border-b border-slate-50 hover:bg-slate-50 ${selectedIds.has(s.id) ? "bg-red-50" : ""}`}
                  >
                    <td className="py-1.5 pr-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(s.id)}
                        onChange={() => toggleOne(s.id)}
                        className="cursor-pointer"
                      />
                    </td>
                    <td className="py-1.5 pr-3">{s.grade}학년</td>
                    <td className="py-1.5 pr-3">{s.class}반</td>
                    <td className="py-1.5 pr-3 font-medium">{s.name}</td>
                    <td className="py-1.5 pr-3 text-xs text-slate-500">
                      {s.birthDate ? s.birthDate.replaceAll("-", ".") : "-"}
                    </td>
                    <td className="py-1.5 pr-3 text-xs text-slate-500">
                      {s.hasPassword ? "설정됨" : "미설정"}
                    </td>
                    <td className="py-1.5 text-xs text-slate-400">
                      {new Date(s.created_at).toLocaleString("ko-KR")}
                    </td>
                    <td className="py-1.5">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => {
                            void handleResetPassword(s);
                          }}
                          disabled={resettingId === s.id}
                          className="rounded px-2 py-0.5 text-xs text-blue-600 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-40"
                        >
                          {resettingId === s.id ? "초기화 중..." : "비밀번호 초기화"}
                        </button>
                      <button
                        onClick={() => handleDelete([s.id])}
                        disabled={deleting}
                        className="rounded px-2 py-0.5 text-xs text-red-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-40"
                      >
                        삭제
                      </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-4 text-center text-slate-400">
                      학생이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────── shared helpers ─────────────────────── */

interface LabInfo { id: string; lab_number: number; group_type: string; }

function fmtTime(iso: string): string {
  const d = new Date(iso);
  const base = d.toLocaleString("ko-KR", {
    month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const ms = String(d.getMilliseconds()).padStart(3, "0");
  return `${base}.${ms}`;
}

function useRegistrationActions() {
  const [rows, setRows] = useState<LabRegistration[]>([]);
  const [labs, setLabs] = useState<LabInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [changingId, setChangingId] = useState<number | null>(null);
  const [changeLabId, setChangeLabId] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [regRes, labRes] = await Promise.all([
      fetch("/api/admin/registrations").then((r) => r.json()),
      fetch("/api/admin/labs").then((r) => r.json()),
    ]);
    setRows(regRes.registrations ?? []);
    setLabs(labRes.labs ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadInitialData() {
      const [regRes, labRes] = await Promise.all([
        fetch("/api/admin/registrations").then((r) => r.json()),
        fetch("/api/admin/labs").then((r) => r.json()),
      ]);

      if (!active) return;

      setRows(regRes.registrations ?? []);
      setLabs(labRes.labs ?? []);
      setLoading(false);
    }

    void loadInitialData();

    return () => {
      active = false;
    };
  }, []);

  const handleCancel = async (r: LabRegistration) => {
    if (!confirm(`${r.grade}학년 ${r.class}반 ${r.name}의 신청을 취소하시겠습니까?`)) return;
    setProcessingId(r.registration_id);
    const res = await fetch("/api/admin/registrations/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: r.student_id }),
    });
    if (!res.ok) alert("취소에 실패했습니다.");
    await fetchData();
    setProcessingId(null);
    setChangingId(null);
  };

  const handleChange = async (r: LabRegistration) => {
    if (!changeLabId || changeLabId === r.lab_id) return;
    const targetLab = labs.find((l) => l.id === changeLabId);
    if (!confirm(`${r.name}을(를) ${r.lab_number}조 → ${targetLab?.lab_number}조로 변경하시겠습니까?`)) return;
    setProcessingId(r.registration_id);
    const res = await fetch("/api/admin/registrations/change", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: r.student_id, newLabId: changeLabId }),
    });
    if (!res.ok) alert("변경에 실패했습니다.");
    await fetchData();
    setProcessingId(null);
    setChangingId(null);
    setChangeLabId("");
  };

  const startChanging = (r: LabRegistration) => {
    setChangingId(r.registration_id);
    setChangeLabId(r.lab_id);
  };

  const cancelChanging = () => { setChangingId(null); setChangeLabId(""); };

  return { rows, labs, loading, processingId, changingId, changeLabId,
           setChangeLabId, fetchData, handleCancel, handleChange, startChanging, cancelChanging };
}

function RegistrationRow({ r, labs, processingId, changingId, changeLabId, setChangeLabId,
  handleCancel, handleChange, startChanging, cancelChanging, compact = false }:
{
  r: LabRegistration; labs: LabInfo[]; processingId: number | null;
  changingId: number | null; changeLabId: string;
  setChangeLabId: (v: string) => void;
  handleCancel: (r: LabRegistration) => void;
  handleChange: (r: LabRegistration) => void;
  startChanging: (r: LabRegistration) => void;
  cancelChanging: () => void;
  compact?: boolean;
}) {
  const busy = processingId === r.registration_id;
  const isChanging = changingId === r.registration_id;
  const otherLabs = labs.filter((l) => l.group_type === r.group_type && l.id !== r.lab_id);

  return (
    <li className="border-b border-slate-50 py-2 last:border-0">
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <div className="flex items-center gap-1.5 text-sm">
          {!compact && (
            <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${
              r.status === "confirmed" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
            }`}>
              {r.status === "confirmed" ? "확정" : "대기"}
            </span>
          )}
          <span className="font-medium">{r.grade}학년 {r.class}반 {r.name}</span>
          {compact && (
            <span className="text-xs text-slate-400">{r.lab_number}조</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-400">{fmtTime(r.timestamp)}</span>
          {!isChanging ? (
            <>
              <button onClick={() => startChanging(r)} disabled={busy}
                className="rounded px-2 py-0.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 disabled:opacity-40">
                변경
              </button>
              <button onClick={() => handleCancel(r)} disabled={busy}
                className="rounded px-2 py-0.5 text-xs font-semibold text-red-500 hover:bg-red-50 disabled:opacity-40">
                {busy ? "..." : "취소"}
              </button>
            </>
          ) : (
            <span className="flex items-center gap-1">
              <select value={changeLabId} onChange={(e) => setChangeLabId(e.target.value)}
                className="rounded border border-[var(--line)] px-1 py-0.5 text-xs">
                <option value={r.lab_id}>{r.lab_number}조 (현재)</option>
                {otherLabs.map((l) => (
                  <option key={l.id} value={l.id}>{l.lab_number}조</option>
                ))}
              </select>
              <button onClick={() => handleChange(r)} disabled={busy || changeLabId === r.lab_id}
                className="rounded bg-blue-600 px-2 py-0.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-40">
                확인
              </button>
              <button onClick={cancelChanging}
                className="rounded px-1.5 py-0.5 text-xs text-slate-400 hover:bg-slate-100">
                ✕
              </button>
            </span>
          )}
        </div>
      </div>
    </li>
  );
}

function downloadLabExcel(rows: LabRegistration[]) {
  const labNumbers = Array.from(new Set(rows.map((r) => r.lab_number))).sort((a, b) => a - b);
  const labMap = groupByLab(rows);
  const wb = XLSX.utils.book_new();
  for (const labNo of labNumbers) {
    const entry = labMap.get(labNo)!;
    const sheetData = [
      ["상태", "학년", "반", "이름", "신청시각"],
      ...entry.confirmed.map((r) => ["확정", r.grade, r.class, r.name, fmtTime(r.timestamp)]),
      ...entry.waiting.map((r, i) => [`대기 ${i + 1}`, r.grade, r.class, r.name, fmtTime(r.timestamp)]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sheetData), `${labNo}조`);
  }
  XLSX.writeFile(wb, "조별_신청현황.xlsx");
}

function downloadClassExcel(rows: LabRegistration[]) {
  const sheetData = [
    ["학년", "반", "이름", "조", "상태", "신청시각"],
    ...rows.slice()
      .sort((a, b) => a.grade - b.grade || a.class - b.class || a.name.localeCompare(b.name))
      .map((r) => [r.grade, r.class, r.name, `${r.lab_number}조`,
        r.status === "confirmed" ? "확정" : "대기", fmtTime(r.timestamp)]),
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sheetData), "반별현황");
  XLSX.writeFile(wb, "반별_신청현황.xlsx");
}

function ByLabTab() {
  const actions = useRegistrationActions();
  const { rows, loading } = actions;

  const labMap = groupByLab(rows);
  const labNumbers = Array.from(new Set(rows.map((r) => r.lab_number))).sort((a, b) => a - b);

  if (loading) return <p className="text-sm text-slate-500">불러오는 중...</p>;
  if (labNumbers.length === 0) return <p className="text-sm text-slate-500">신청 내역이 없습니다.</p>;

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button onClick={() => downloadLabExcel(rows)}
          className="rounded-lg border border-emerald-600 px-4 py-1.5 text-sm font-bold text-emerald-600 hover:bg-emerald-600 hover:text-white transition-colors">
          📥 엑셀 다운로드
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {labNumbers.map((labNo) => {
          const entry = labMap.get(labNo)!;
          return (
            <div key={labNo} className="rounded-xl border border-[var(--line)] bg-white p-4">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-extrabold text-[var(--foreground)]">
                  {labNo}조
                  <span className="ml-2 text-xs font-normal text-slate-400">
                    {entry.groupType === "LOW" ? "저학년" : "고학년"}
                  </span>
                </h2>
                <span className="text-xs text-slate-500">
                  확정 {entry.confirmed.length} / 대기 {entry.waiting.length}
                </span>
              </div>
              {entry.confirmed.length > 0 && (
                <>
                  <p className="mb-1 mt-2 text-xs font-bold text-emerald-600">확정</p>
                  <ul>
                    {entry.confirmed.map((r) => (
                      <RegistrationRow key={r.registration_id} r={r} {...actions} />
                    ))}
                  </ul>
                </>
              )}
              {entry.waiting.length > 0 && (
                <>
                  <p className="mb-1 mt-2 text-xs font-bold text-amber-600">대기</p>
                  <ul>
                    {entry.waiting.map((r) => (
                      <RegistrationRow key={r.registration_id} r={r} {...actions} />
                    ))}
                  </ul>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ByClassTab() {
  const actions = useRegistrationActions();
  const { rows, loading } = actions;

  const classMap = groupByClass(rows);
  const keys = Array.from(classMap.keys()).sort();

  if (loading) return <p className="text-sm text-slate-500">불러오는 중...</p>;
  if (keys.length === 0) return <p className="text-sm text-slate-500">신청 내역이 없습니다.</p>;

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button onClick={() => downloadClassExcel(rows)}
          className="rounded-lg border border-emerald-600 px-4 py-1.5 text-sm font-bold text-emerald-600 hover:bg-emerald-600 hover:text-white transition-colors">
          📥 엑셀 다운로드
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {keys.map((key) => {
          const list = classMap.get(key)!;
          const [g, c] = key.split("-");
          return (
            <div key={key} className="rounded-xl border border-[var(--line)] bg-white p-4">
              <h2 className="mb-2 font-extrabold text-[var(--foreground)]">
                {g}학년 {c}반
                <span className="ml-2 text-xs font-normal text-slate-400">{list.length}명</span>
              </h2>
              <ul>
                {list.map((r) => (
                  <RegistrationRow key={r.registration_id} r={r} compact {...actions} />
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────── settings tab ─────────────────────── */

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending: { label: "신청 대기 중", color: "text-amber-600" },
  open:    { label: "신청 진행 중", color: "text-emerald-600" },
  closed:  { label: "신청 마감", color: "text-slate-500" },
};

function toLocalDatetimeValue(iso: string | null): string {
  if (!iso) return "";
  // datetime-local input requires "YYYY-MM-DDTHH:mm"
  return new Date(iso).toISOString().slice(0, 16);
}

function SettingsTab() {
  const [openAt, setOpenAt] = useState("");
  const [closeAt, setCloseAt] = useState("");
  const [status, setStatus] = useState<string>("pending");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [msgError, setMsgError] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        setOpenAt(toLocalDatetimeValue(d.openAt));
        setCloseAt(toLocalDatetimeValue(d.closeAt));
        setStatus(d.status ?? "pending");
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMsg(null);
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        openAt: openAt ? new Date(openAt).toISOString() : null,
        closeAt: closeAt ? new Date(closeAt).toISOString() : null,
      }),
    });
    if (res.ok) {
      const d = await res.json();
      setStatus(d.status);
      setMsg("저장되었습니다.");
      setMsgError(false);
    } else {
      setMsg("저장에 실패했습니다.");
      setMsgError(true);
    }
    setSaving(false);
  };

  const handleClear = async () => {
    if (!confirm("신청 시간 설정을 초기화하시겠습니까?\n학생들이 신청 화면에 접근할 수 없게 됩니다.")) return;
    setSaving(true);
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ openAt: null, closeAt: null }),
    });
    if (res.ok) {
      setOpenAt("");
      setCloseAt("");
      setStatus("pending");
      setMsg("초기화되었습니다.");
      setMsgError(false);
    }
    setSaving(false);
  };

  const info = STATUS_LABEL[status] ?? STATUS_LABEL.pending;

  return (
    <div className="mx-auto max-w-lg">
      <div className="rounded-xl border border-[var(--line)] bg-white p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-slate-700">신청 가능 시간 설정</h2>
          <span className={`text-sm font-bold ${info.color}`}>● {info.label}</span>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-600">시작 시각</label>
            <input
              type="datetime-local"
              value={openAt}
              onChange={(e) => setOpenAt(e.target.value)}
              className="w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-600">
              종료 시각 <span className="font-normal text-slate-400">(비워두면 무제한)</span>
            </label>
            <input
              type="datetime-local"
              value={closeAt}
              onChange={(e) => setCloseAt(e.target.value)}
              className="w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving || !openAt}
            className="rounded-lg bg-[var(--accent)] px-5 py-2 text-sm font-bold text-white hover:bg-[var(--accent-strong)] disabled:bg-slate-400"
          >
            {saving ? "저장 중..." : "저장"}
          </button>
          <button
            onClick={handleClear}
            disabled={saving}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 disabled:opacity-50"
          >
            초기화
          </button>
          {msg && (
            <span className={`text-sm font-semibold ${msgError ? "text-red-600" : "text-emerald-600"}`}>
              {msg}
            </span>
          )}
        </div>

        <p className="text-xs text-slate-400">
          * 저장 후 즉시 적용됩니다. 시작 시각이 되면 학생들 화면이 자동으로 전환됩니다.
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────── main ─────────────────────── */

export function AdminClient() {
  const [tab, setTab] = useState<Tab>("students");

  const tabs: { id: Tab; label: string }[] = [
    { id: "students", label: "학생 명단" },
    { id: "by-lab", label: "조별 현황" },
    { id: "by-class", label: "반별 현황" },
    { id: "settings", label: "시간 설정" },
  ];

  return (
    <div>
      {/* tab bar */}
      <div className="mb-6 flex gap-1 border-b border-[var(--line)]">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-bold transition-colors ${
              tab === t.id
                ? "border-b-2 border-[var(--accent)] text-[var(--accent)]"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "students" && <StudentsTab />}
      {tab === "by-lab" && <ByLabTab />}
      {tab === "by-class" && <ByClassTab />}
      {tab === "settings" && <SettingsTab />}
    </div>
  );
}
