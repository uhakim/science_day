"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";

/* ─────────────────────── types ─────────────────────── */
interface Student {
  id: string;
  grade: number;
  class: number;
  name: string;
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

type Tab = "students" | "by-lab" | "by-class";

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
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // bulk
  const [bulkText, setBulkText] = useState("");
  const [bulking, setBulking] = useState(false);
  const [bulkMsg, setBulkMsg] = useState<string | null>(null);
  const [bulkError, setBulkError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      body: JSON.stringify({ grade: Number(grade), class: Number(cls), name: name.trim() }),
    });
    if (res.ok) {
      setName("");
      await fetchStudents();
    } else {
      setAddError("추가에 실패했습니다.");
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
        const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 });
        const lines = rows
          .filter((r) => r.length >= 3 && r[0] !== undefined)
          .map((r) => `${r[0]},${r[1]},${r[2]}`);
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
      setBulkMsg("일괄 등록 실패. 형식을 확인하세요.");
      setBulkError(true);
    }
    setBulking(false);
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
        <h2 className="mb-1 font-bold text-slate-700">일괄 등록</h2>
        <p className="mb-3 text-xs text-slate-500">
          엑셀(.xlsx/.xls) 또는 CSV 파일을 업로드하거나, 아래에 직접 입력하세요.
          <br />형식: 첫 번째 열 = 학년, 두 번째 열 = 반, 세 번째 열 = 이름
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
          placeholder={"1,1,홍길동\n1,2,김철수\n2,1,이영희"}
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
          <select
            value={filterGrade}
            onChange={(e) => setFilterGrade(e.target.value)}
            className="ml-auto rounded-lg border border-[var(--line)] px-2 py-1 text-sm"
          >
            <option value="all">전체 학년</option>
            {[1,2,3,4,5,6].map((v) => <option key={v} value={v}>{v}학년</option>)}
          </select>
          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            className="rounded-lg border border-[var(--line)] px-2 py-1 text-sm"
          >
            <option value="all">전체 반</option>
            {[1,2,3,4].map((v) => <option key={v} value={v}>{v}반</option>)}
          </select>
        </div>
        {loading ? (
          <p className="text-sm text-slate-500">불러오는 중...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--line)] text-left text-xs text-slate-500">
                  <th className="pb-2 pr-3">학년</th>
                  <th className="pb-2 pr-3">반</th>
                  <th className="pb-2 pr-3">이름</th>
                  <th className="pb-2">등록일시</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="py-1.5 pr-3">{s.grade}학년</td>
                    <td className="py-1.5 pr-3">{s.class}반</td>
                    <td className="py-1.5 pr-3 font-medium">{s.name}</td>
                    <td className="py-1.5 text-xs text-slate-400">
                      {new Date(s.created_at).toLocaleString("ko-KR")}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-slate-400">
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

function downloadLabExcel(rows: LabRegistration[]) {
  const labNumbers = Array.from(new Set(rows.map((r) => r.lab_number))).sort((a, b) => a - b);
  const labMap = groupByLab(rows);
  const wb = XLSX.utils.book_new();

  for (const labNo of labNumbers) {
    const entry = labMap.get(labNo)!;
    const sheetData = [
      ["상태", "학년", "반", "이름"],
      ...entry.confirmed.map((r) => ["확정", r.grade, r.class, r.name]),
      ...entry.waiting.map((r, i) => [`대기 ${i + 1}`, r.grade, r.class, r.name]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    XLSX.utils.book_append_sheet(wb, ws, `Lab${labNo}`);
  }

  XLSX.writeFile(wb, "Lab별_신청현황.xlsx");
}

function downloadClassExcel(rows: LabRegistration[]) {
  const sheetData = [
    ["학년", "반", "이름", "Lab", "상태"],
    ...rows
      .slice()
      .sort((a, b) => a.grade - b.grade || a.class - b.class || a.name.localeCompare(b.name))
      .map((r) => [r.grade, r.class, r.name, `Lab ${r.lab_number}`, r.status === "confirmed" ? "확정" : "대기"]),
  ];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  XLSX.utils.book_append_sheet(wb, ws, "반별현황");
  XLSX.writeFile(wb, "반별_신청현황.xlsx");
}

function ByLabTab() {
  const [rows, setRows] = useState<LabRegistration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/registrations")
      .then((r) => r.json())
      .then((d) => { setRows(d.registrations ?? []); setLoading(false); });
  }, []);

  const labMap = groupByLab(rows);
  const labNumbers = Array.from(new Set(rows.map((r) => r.lab_number))).sort((a, b) => a - b);

  if (loading) return <p className="text-sm text-slate-500">불러오는 중...</p>;
  if (labNumbers.length === 0) return <p className="text-sm text-slate-500">신청 내역이 없습니다.</p>;

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => downloadLabExcel(rows)}
          className="rounded-lg border border-emerald-600 px-4 py-1.5 text-sm font-bold text-emerald-600 hover:bg-emerald-600 hover:text-white transition-colors"
        >
          📥 엑셀 다운로드
        </button>
      </div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {labNumbers.map((labNo) => {
        const entry = labMap.get(labNo)!;
        return (
          <div key={labNo} className="rounded-xl border border-[var(--line)] bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-extrabold text-[var(--foreground)]">
                Lab {labNo}
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
                <p className="mb-1 text-xs font-bold text-emerald-600">확정</p>
                <ul className="mb-3 space-y-0.5">
                  {entry.confirmed.map((r) => (
                    <li key={r.registration_id} className="text-sm">
                      {r.grade}학년 {r.class}반 {r.name}
                    </li>
                  ))}
                </ul>
              </>
            )}
            {entry.waiting.length > 0 && (
              <>
                <p className="mb-1 text-xs font-bold text-amber-600">대기</p>
                <ul className="space-y-0.5">
                  {entry.waiting.map((r, i) => (
                    <li key={r.registration_id} className="text-sm text-slate-500">
                      {i + 1}. {r.grade}학년 {r.class}반 {r.name}
                    </li>
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
  const [rows, setRows] = useState<LabRegistration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/registrations")
      .then((r) => r.json())
      .then((d) => { setRows(d.registrations ?? []); setLoading(false); });
  }, []);

  const classMap = groupByClass(rows);
  const keys = Array.from(classMap.keys()).sort();

  if (loading) return <p className="text-sm text-slate-500">불러오는 중...</p>;
  if (keys.length === 0) return <p className="text-sm text-slate-500">신청 내역이 없습니다.</p>;

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => downloadClassExcel(rows)}
          className="rounded-lg border border-emerald-600 px-4 py-1.5 text-sm font-bold text-emerald-600 hover:bg-emerald-600 hover:text-white transition-colors"
        >
          📥 엑셀 다운로드
        </button>
      </div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {keys.map((key) => {
        const list = classMap.get(key)!;
        const [g, c] = key.split("-");
        return (
          <div key={key} className="rounded-xl border border-[var(--line)] bg-white p-4">
            <h2 className="mb-3 font-extrabold text-[var(--foreground)]">
              {g}학년 {c}반
              <span className="ml-2 text-xs font-normal text-slate-400">{list.length}명 신청</span>
            </h2>
            <ul className="space-y-1">
              {list.map((r) => (
                <li key={r.registration_id} className="flex items-center justify-between text-sm">
                  <span>{r.name}</span>
                  <span className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400">Lab {r.lab_number}</span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-xs font-semibold ${
                        r.status === "confirmed"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {r.status === "confirmed" ? "확정" : "대기"}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
    </div>
  );
}

/* ─────────────────────── main ─────────────────────── */

export function AdminClient() {
  const [tab, setTab] = useState<Tab>("students");

  const tabs: { id: Tab; label: string }[] = [
    { id: "students", label: "학생 명단" },
    { id: "by-lab", label: "Lab별 현황" },
    { id: "by-class", label: "반별 현황" },
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
    </div>
  );
}
