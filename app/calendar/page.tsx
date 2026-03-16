"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { MONTHS_TR } from "@/lib/constants";
import Link from "next/link";

interface Project {
  id: string;
  projectNo: string;
  status: string;
  deliveryDate: string | null;
  customer: { company: string };
}

const DAY_NAMES = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  // 0=Pazar → convert to Monday-first
  const d = new Date(year, month - 1, 1).getDay();
  return d === 0 ? 6 : d - 1;
}

export default function CalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // Load current + next month projects that have delivery dates
    const params = new URLSearchParams({ year: String(year), month: String(month) });
    fetch(`/api/projects?${params}`)
      .then((r) => r.json())
      .then((d) => { setProjects(Array.isArray(d) ? d.filter((p: Project) => p.deliveryDate) : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [year, month]);

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  const getProjectsForDay = (day: number) => {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return projects.filter((p) => p.deliveryDate?.startsWith(dateStr));
  };

  const isToday = (day: number) =>
    day === now.getDate() && month === now.getMonth() + 1 && year === now.getFullYear();

  const isOverdue = (day: number) => {
    const d = new Date(year, month - 1, day);
    return d < new Date(now.getFullYear(), now.getMonth(), now.getDate());
  };

  const getProjectColor = (p: Project, day: number) => {
    if (["completed", "invoiced"].includes(p.status)) return "bg-emerald-100 text-emerald-700 border-emerald-200";
    if (isOverdue(day)) return "bg-red-100 text-red-700 border-red-200";
    const d = new Date(year, month - 1, day);
    const diff = Math.ceil((d.getTime() - Date.now()) / 86400000);
    if (diff <= 3) return "bg-orange-100 text-orange-700 border-orange-200";
    return "bg-brand-100 text-brand-700 border-brand-200";
  };

  // Stats
  const overdueCount = projects.filter((p) => {
    if (!p.deliveryDate || ["completed", "invoiced"].includes(p.status)) return false;
    return new Date(p.deliveryDate) < now;
  }).length;

  const thisWeekCount = projects.filter((p) => {
    if (!p.deliveryDate || ["completed", "invoiced"].includes(p.status)) return false;
    const diff = Math.ceil((new Date(p.deliveryDate).getTime() - Date.now()) / 86400000);
    return diff >= 0 && diff <= 7;
  }).length;

  return (
    <AppLayout>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Takvim</h1>
          <p className="page-subtitle">Teslim tarihlerine göre proje takvimi</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Legend */}
          <div className="hidden lg:flex items-center gap-3 mr-4">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <div className="w-3 h-3 rounded bg-red-200" /> Gecikmiş
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <div className="w-3 h-3 rounded bg-orange-200" /> Bu Hafta
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <div className="w-3 h-3 rounded bg-brand-200" /> Gelecek
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <div className="w-3 h-3 rounded bg-emerald-200" /> Tamamlandı
            </div>
          </div>
          {/* Month navigation */}
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <button onClick={prevMonth} className="px-3 py-2 hover:bg-gray-50 transition-colors text-gray-600">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth() + 1); }}
              className="px-4 py-2 font-semibold text-sm text-gray-900 hover:bg-gray-50 min-w-32 text-center transition-colors">
              {MONTHS_TR[month - 1]} {year}
            </button>
            <button onClick={nextMonth} className="px-3 py-2 hover:bg-gray-50 transition-colors text-gray-600">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{projects.length}</p>
            <p className="text-xs text-gray-400">Bu Ay Teslim</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{thisWeekCount}</p>
            <p className="text-xs text-gray-400">Bu Hafta Teslim</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{overdueCount}</p>
            <p className="text-xs text-gray-400">Gecikmiş</p>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="card overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-gray-100">
          {DAY_NAMES.map((d) => (
            <div key={d} className="py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-widest">
              {d}
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-7">
            {Array.from({ length: totalCells }).map((_, i) => {
              const day = i - firstDay + 1;
              const isCurrentMonth = day >= 1 && day <= daysInMonth;
              const dayProjects = isCurrentMonth ? getProjectsForDay(day) : [];
              const todayClass = isToday(day) && isCurrentMonth;
              const isWeekend = i % 7 >= 5;

              return (
                <div key={i}
                  className={`min-h-28 p-2 border-b border-r border-gray-50 transition-colors
                    ${!isCurrentMonth ? "bg-gray-50/50" : isWeekend ? "bg-gray-50/30" : "bg-white"}
                    ${isCurrentMonth ? "hover:bg-brand-50/30" : ""}`}>
                  {isCurrentMonth && (
                    <>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full
                          ${todayClass ? "bg-brand-600 text-white font-bold" : isOverdue(day) && dayProjects.length > 0 ? "text-red-500" : "text-gray-700"}`}>
                          {day}
                        </span>
                        {dayProjects.length > 2 && (
                          <span className="text-xs text-gray-400">{dayProjects.length}</span>
                        )}
                      </div>
                      <div className="space-y-1">
                        {dayProjects.slice(0, 3).map((p) => (
                          <Link key={p.id} href={`/projects/${p.id}`} onClick={(e) => e.stopPropagation()}
                            className={`block text-xs px-1.5 py-0.5 rounded border truncate hover:opacity-80 transition-opacity ${getProjectColor(p, day)}`}
                            title={`${p.projectNo} — ${p.customer.company}`}>
                            <span className="font-mono font-semibold">{p.projectNo.split("-").slice(-2).join("-")}</span>
                          </Link>
                        ))}
                        {dayProjects.length > 3 && (
                          <p className="text-xs text-gray-400 pl-1">+{dayProjects.length - 3} daha</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
