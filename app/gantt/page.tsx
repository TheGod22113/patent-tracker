"use client";

import { useEffect, useState, useMemo } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { STATUS_MAP } from "@/lib/constants";
import Link from "next/link";

const DAY_PX = 30; // px per day

const STATUS_COLORS: Record<string, string> = {
  new: "#9CA3AF",
  word_conversion: "#F59E0B",
  translation: "#8B5CF6",
  review: "#A855F7",
  completed: "#10B981",
  invoiced: "#6366F1",
};

interface GanttProject {
  id: string;
  projectNo: string;
  status: string;
  createdAt: string;
  deliveryDate: string | null;
  customer: { company: string };
  translator: { name: string } | null;
}

const MONTHS_TR = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

export default function GanttPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [projects, setProjects] = useState<GanttProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/projects?year=${year}`)
      .then((r) => r.json())
      .then((d) => { setProjects(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [year]);

  // Range: full year
  const rangeStart = useMemo(() => {
    const d = new Date(year, 0, 1);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [year]);

  const totalDays = year % 4 === 0 ? 366 : 365;

  // Today's offset in days from rangeStart
  const todayOffset = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.floor((today.getTime() - rangeStart.getTime()) / 86400000);
  }, [rangeStart]);

  // Month headers
  const monthHeaders = useMemo(() => {
    return Array.from({ length: 12 }, (_, m) => {
      const first = new Date(year, m, 1);
      const last = new Date(year, m + 1, 0);
      const startDay = Math.floor((first.getTime() - rangeStart.getTime()) / 86400000);
      return { label: MONTHS_TR[m], startDay, days: last.getDate() };
    });
  }, [year, rangeStart]);

  const visibleProjects = useMemo(() => {
    let filtered = projects;
    if (statusFilter) filtered = filtered.filter((p) => p.status === statusFilter);
    return filtered
      .filter((p) => {
        const start = new Date(p.createdAt);
        const end = p.deliveryDate ? new Date(p.deliveryDate) : new Date();
        return end >= rangeStart && start <= new Date(year, 11, 31);
      })
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [projects, statusFilter, rangeStart, year]);

  const totalWidth = 280 + totalDays * DAY_PX;

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Gantt / Zaman Çizelgesi</h1>
          <p className="page-subtitle">{visibleProjects.length} proje görüntüleniyor</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input w-44">
            <option value="">Tüm Durumlar</option>
            {Object.entries(STATUS_MAP).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <select value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="input w-24">
            {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto" style={{ maxHeight: "calc(100vh - 200px)" }}>
            <div style={{ minWidth: totalWidth }}>

              {/* Month header row */}
              <div className="flex sticky top-0 z-20 bg-white border-b border-gray-100 shadow-sm">
                <div
                  className="flex-shrink-0 border-r border-gray-100 bg-gray-50 flex items-center px-4"
                  style={{ width: 280, minWidth: 280 }}
                >
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Proje</span>
                </div>
                <div className="flex">
                  {monthHeaders.map((m) => (
                    <div
                      key={m.label}
                      style={{ width: m.days * DAY_PX, minWidth: m.days * DAY_PX }}
                      className="border-r border-gray-100 bg-gray-50 px-2 py-2.5 text-xs font-semibold text-gray-500"
                    >
                      {m.label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Project rows */}
              {visibleProjects.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-sm text-gray-400">
                  Bu yılda proje bulunamadı
                </div>
              ) : (
                visibleProjects.map((p) => {
                  const start = new Date(p.createdAt);
                  start.setHours(0, 0, 0, 0);
                  const rawEnd = p.deliveryDate ? new Date(p.deliveryDate) : new Date();
                  rawEnd.setHours(0, 0, 0, 0);

                  const barStart = Math.max(0, Math.floor((start.getTime() - rangeStart.getTime()) / 86400000));
                  const barEnd = Math.min(totalDays, Math.ceil((rawEnd.getTime() - rangeStart.getTime()) / 86400000));
                  const barWidthDays = Math.max(1, barEnd - barStart);

                  const today = new Date(); today.setHours(0,0,0,0);
                  const isOverdue = !["completed","invoiced"].includes(p.status)
                    && p.deliveryDate
                    && new Date(p.deliveryDate) < today;

                  const color = isOverdue ? "#EF4444" : (STATUS_COLORS[p.status] ?? "#7A4899");

                  return (
                    <div
                      key={p.id}
                      className="flex border-b border-gray-50 hover:bg-gray-50/40 transition-colors"
                      style={{ height: 48 }}
                    >
                      {/* Left info panel */}
                      <div
                        className="flex-shrink-0 border-r border-gray-100 flex items-center px-4 gap-2"
                        style={{ width: 280, minWidth: 280 }}
                      >
                        <Link href={`/projects/${p.id}`} className="flex-1 min-w-0 group">
                          <p className="font-mono text-xs font-bold text-gray-900 group-hover:text-brand-600 transition-colors truncate">
                            {p.projectNo}
                          </p>
                          <p className="text-xs text-gray-400 truncate">{p.customer.company}</p>
                        </Link>
                        <span
                          className={`badge ${STATUS_MAP[p.status]?.color ?? "bg-gray-100 text-gray-600"} text-xs flex-shrink-0`}
                        >
                          {STATUS_MAP[p.status]?.label}
                        </span>
                      </div>

                      {/* Timeline bar area */}
                      <div
                        className="relative flex-1"
                        style={{
                          background: "repeating-linear-gradient(90deg,transparent,transparent calc(30px - 1px),#f3f4f6 calc(30px - 1px),#f3f4f6 30px)",
                        }}
                      >
                        {/* Today marker */}
                        {todayOffset >= 0 && todayOffset <= totalDays && (
                          <div
                            className="absolute top-0 bottom-0 w-0.5 bg-red-400 z-10 opacity-70"
                            style={{ left: todayOffset * DAY_PX }}
                          />
                        )}

                        {/* Project bar */}
                        <div
                          className="absolute top-2.5 rounded-md flex items-center justify-center px-2 overflow-hidden transition-all hover:brightness-110 cursor-pointer"
                          style={{
                            left: barStart * DAY_PX + 2,
                            width: Math.max(barWidthDays * DAY_PX - 4, 6),
                            height: 26,
                            background: color,
                            opacity: 0.88,
                          }}
                          title={`${p.projectNo} · ${p.customer.company}\nBaşlangıç: ${start.toLocaleDateString("tr-TR")}\nTeslim: ${p.deliveryDate ? new Date(p.deliveryDate).toLocaleDateString("tr-TR") : "Belirsiz"}`}
                          onClick={() => window.location.href = `/projects/${p.id}`}
                        >
                          {barWidthDays * DAY_PX > 70 && (
                            <span className="text-white text-xs font-semibold truncate drop-shadow-sm">
                              {p.projectNo}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Legend */}
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center gap-4 flex-wrap">
            <span className="text-xs font-medium text-gray-500">Durum:</span>
            {Object.entries(STATUS_MAP).map(([key, val]) => (
              <div key={key} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded" style={{ background: STATUS_COLORS[key] }} />
                <span className="text-xs text-gray-500">{val.label}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-red-400" />
              <span className="text-xs text-gray-500">Gecikmiş</span>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <div className="w-0.5 h-4 bg-red-400" />
              <span className="text-xs text-gray-500">Bugün</span>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
