"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { StatusBadge } from "@/components/ui/Badge";
import { formatDate, formatCurrency, getMonthName } from "@/lib/utils";
import { MONTHS_TR, STATUS_MAP } from "@/lib/constants";
import Link from "next/link";
import { PipelineSummary } from "@/components/ui/ProjectPipeline";

interface WeekProject {
  id: string;
  projectNo: string;
  deliveryDate: string;
  customer: { name: string; company: string };
}

interface DashboardData {
  monthProjects: number;
  totalByStatus: { status: string; _count: number }[];
  pendingProjects: {
    id: string;
    projectNo: string;
    status: string;
    deliveryDate: string | null;
    customer: { name: string; company: string };
    coordinator: { name: string } | null;
    translator: { name: string } | null;
  }[];
  overdueProjects: {
    id: string;
    projectNo: string;
    status: string;
    deliveryDate: string;
    customer: { name: string; company: string };
  }[];
  thisWeekProjects: WeekProject[];
  monthInvoiceTotal: number;
  monthInvoiceCount: number;
  monthlyRevenue: { year: number; month: number; total: number }[];
  year: number;
  month: number;
}

export default function DashboardPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState(0);
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState("");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/dashboard?year=${year}&month=${month}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
    fetch(`/api/targets?year=${year}&month=${month}`)
      .then((r) => r.json())
      .then((d) => setTarget(d.target ?? 0))
      .catch(() => {});
  }, [year, month]);

  const saveTarget = async () => {
    const val = parseFloat(targetInput);
    if (isNaN(val) || val < 0) return;
    await fetch("/api/targets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year, month, target: val }),
    });
    setTarget(val);
    setEditingTarget(false);
  };

  const activeCount = data?.totalByStatus
    .filter((s) => ["new", "word_conversion", "translation", "review"].includes(s.status))
    .reduce((sum, s) => sum + s._count, 0) ?? 0;

  const completedCount = data?.totalByStatus
    .filter((s) => ["completed", "invoiced"].includes(s.status))
    .reduce((sum, s) => sum + s._count, 0) ?? 0;

  return (
    <AppLayout>
      {/* Page Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
          <p className="text-sm text-gray-400 mt-1">{getMonthName(month)} {year} — Genel Bakış</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))} className="input w-auto text-sm py-2 pr-8">
            {MONTHS_TR.map((m, i) => (<option key={i + 1} value={i + 1}>{m}</option>))}
          </select>
          <select value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="input w-24 text-sm py-2">
            {[2024, 2025, 2026, 2027].map((y) => (<option key={y} value={y}>{y}</option>))}
          </select>
        </div>
      </div>

      {/* Gecikme Uyarısı */}
      {data?.overdueProjects?.length ? (
        <div className="mb-6 p-4 rounded-2xl flex items-center justify-between gap-4"
          style={{ background: "linear-gradient(135deg, #FEE2E2 0%, #FEF2F2 100%)", border: "1px solid #FECACA" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-red-900 text-sm">{data.overdueProjects.length} Gecikmiş Proje</h3>
              <p className="text-xs text-red-600 mt-0.5">Teslim tarihi geçmiş projeler için harekete geçin</p>
            </div>
          </div>
          <Link href="/projects?status=&deliveryDate=overdue"
            className="flex-shrink-0 px-4 py-2 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition-colors shadow-sm">
            Gözden Geçir →
          </Link>
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-brand-200 border-t-brand-600 rounded-full animate-spin" style={{ borderWidth: 3 }} />
            <p className="text-sm text-gray-400">Yükleniyor...</p>
          </div>
        </div>
      ) : data ? (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            <StatCard label="Bu Aydaki Projeler" value={data.monthProjects} color="purple"
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>} />
            <StatCard label="Devam Eden" value={activeCount} color="amber"
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
            <StatCard label="Tamamlanan (Yıllık)" value={completedCount} color="emerald"
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
            <StatCard label="Bu Ay Fatura" value={formatCurrency(data.monthInvoiceTotal)} color="indigo" small
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>} />
          </div>

          {/* Proje Süreç Hattı */}
          {data.totalByStatus.length > 0 && (
            <PipelineSummary
              statusCounts={data.totalByStatus.map((s) => ({
                status: s.status,
                count: s._count,
              }))}
            />
          )}

          {/* KPI Hedef Widget */}
          <KpiWidget
            current={data.monthInvoiceTotal}
            target={target}
            label={`${getMonthName(month)} ${year} Ciro Hedefi`}
            editing={editingTarget}
            inputVal={targetInput}
            onEdit={() => { setTargetInput(String(target || "")); setEditingTarget(true); }}
            onInputChange={setTargetInput}
            onSave={saveTarget}
            onCancel={() => setEditingTarget(false)}
          />

          {/* Bu Hafta Teslim */}
          {data.thisWeekProjects?.length > 0 && (
            <div className="card p-5 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">Bu Hafta Teslim</h2>
                  <p className="text-xs text-gray-400">{data.thisWeekProjects.length} proje teslim tarihi yaklaşıyor</p>
                </div>
                <Link href="/calendar" className="ml-auto text-xs text-brand-600 font-medium hover:text-brand-700">
                  Takvimde Gör →
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {data.thisWeekProjects.map((p) => {
                  const daysLeft = Math.ceil((new Date(p.deliveryDate).getTime() - Date.now()) / 86400000);
                  return (
                    <Link key={p.id} href={`/projects/${p.id}`}
                      className="flex items-center justify-between p-3 rounded-xl bg-orange-50 border border-orange-100 hover:border-orange-300 hover:bg-orange-100/60 transition-all group">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-1.5 h-8 rounded-full bg-orange-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="font-mono text-xs font-semibold text-gray-900">{p.projectNo}</p>
                          <p className="text-xs text-gray-500 truncate">{p.customer.company}</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${daysLeft <= 1 ? "bg-red-100 text-red-700" : daysLeft <= 3 ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"}`}>
                          {daysLeft === 0 ? "Bugün" : daysLeft === 1 ? "Yarın" : `${daysLeft} gün`}
                        </span>
                        <p className="text-xs text-gray-400 mt-0.5">{formatDate(p.deliveryDate)}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Aylık Gelir Grafiği */}
          {data.monthlyRevenue?.some((m) => m.total > 0) && (
            <div className="card p-6 mb-6">
              <div className="card-header">
                <div>
                  <h2 className="card-title">Son 12 Ay Geliri</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Fatura edilen toplam ciro</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">
                    {formatCurrency(data.monthlyRevenue.reduce((s, m) => s + m.total, 0))}
                  </p>
                  <p className="text-xs text-gray-400">12 aylık toplam</p>
                </div>
              </div>
              <MonthlyRevenueChart data={data.monthlyRevenue} />
            </div>
          )}

          {/* Alt Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Durum Dağılımı */}
            <div className="card p-5">
              <h2 className="card-title mb-4">Durum Dağılımı</h2>
              <div className="space-y-2.5">
                {Object.entries(STATUS_MAP).map(([s, info]) => {
                  const found = data.totalByStatus.find((x) => x.status === s);
                  const count = found?._count ?? 0;
                  const total = data.totalByStatus.reduce((sum, x) => sum + x._count, 0) || 1;
                  const pct = Math.round((count / total) * 100);
                  return (
                    <div key={s}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`badge ${info.color} text-xs`}>{info.label}</span>
                        <span className="text-sm font-semibold text-gray-900">{count}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full bg-brand-500 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bekleyen Projeler */}
            <div className="card p-5 col-span-2">
              <div className="card-header">
                <div>
                  <h2 className="card-title">Devam Eden Projeler</h2>
                  <p className="text-xs text-gray-400 mt-0.5">{data.pendingProjects.length} aktif proje</p>
                </div>
                <Link href="/projects" className="text-xs text-brand-600 font-medium hover:text-brand-700">
                  Tümünü gör →
                </Link>
              </div>
              {data.pendingProjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                    <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-gray-500">Bekleyen proje yok</p>
                  <p className="text-xs text-gray-400 mt-1">Tüm projeler tamamlandı</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {data.pendingProjects.map((p) => {
                    const overdue = p.deliveryDate && new Date(p.deliveryDate) < new Date();
                    return (
                      <Link key={p.id} href={`/projects/${p.id}`}
                        className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-brand-200 hover:bg-brand-50/50 transition-all group">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-100 transition-colors">
                            <span className="text-xs font-bold text-brand-700">
                              {p.projectNo.split("-").pop()?.slice(0, 2)}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-semibold text-gray-900">{p.projectNo}</span>
                              <StatusBadge status={p.status} />
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5 truncate">
                              {p.customer.company}
                              {p.translator ? ` · ${p.translator.name}` : p.coordinator ? ` · ${p.coordinator.name}` : ""}
                            </p>
                          </div>
                        </div>
                        {p.deliveryDate && (
                          <span className={`text-xs font-medium flex-shrink-0 ml-2 px-2 py-1 rounded-full ${overdue ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"}`}>
                            {formatDate(p.deliveryDate)}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      ) : null}
    </AppLayout>
  );
}

// ─── KPI Widget ───────────────────────────────────────────────────────────────
function KpiWidget({
  current, target, label, editing, inputVal,
  onEdit, onInputChange, onSave, onCancel,
}: {
  current: number; target: number; label: string;
  editing: boolean; inputVal: string;
  onEdit: () => void; onInputChange: (v: string) => void;
  onSave: () => void; onCancel: () => void;
}) {
  const pct = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;
  const over = target > 0 && current >= target;
  const barColor = over ? "#10B981" : pct >= 75 ? "#7A4899" : pct >= 40 ? "#F59E0B" : "#EF4444";

  return (
    <div className="card p-5 mb-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-brand-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700">🎯 {label}</p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl font-bold text-gray-900">{formatCurrency(current)}</span>
              {target > 0 && (
                <>
                  <span className="text-sm text-gray-400">/</span>
                  <span className="text-sm text-gray-500">{formatCurrency(target)}</span>
                  <span className={`text-sm font-bold ${over ? "text-emerald-600" : "text-brand-600"}`}>
                    {over ? "🎉 Hedefe Ulaşıldı!" : `%${pct}`}
                  </span>
                </>
              )}
              {target === 0 && <span className="text-xs text-gray-400">Henüz hedef belirlenmedi</span>}
            </div>
          </div>
        </div>
        {editing ? (
          <div className="flex items-center gap-2">
            <input type="number" value={inputVal} onChange={(e) => onInputChange(e.target.value)}
              placeholder="Hedef tutar (TRY)" className="input w-44 text-sm" autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") onSave(); if (e.key === "Escape") onCancel(); }} />
            <button onClick={onSave} className="btn-primary btn-sm">Kaydet</button>
            <button onClick={onCancel} className="btn-secondary btn-sm">İptal</button>
          </div>
        ) : (
          <button onClick={onEdit} className="btn-secondary btn-sm flex-shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            {target > 0 ? "Hedefi Düzenle" : "Hedef Belirle"}
          </button>
        )}
      </div>
      {target > 0 && (
        <div className="mt-4">
          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
            <div className="h-3 rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: barColor }} />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-xs text-gray-400">₺0</span>
            <span className="text-xs text-gray-400">{formatCurrency(target)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Stat Card ──────────────────────────────────────────────────────────────
function StatCard({
  label, value, icon, color, small,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: "purple" | "amber" | "emerald" | "indigo";
  small?: boolean;
}) {
  const styles = {
    purple:  { bar: "#7A4899", iconBg: "bg-brand-100",  iconText: "text-brand-700" },
    amber:   { bar: "#F59E0B", iconBg: "bg-amber-100",  iconText: "text-amber-700" },
    emerald: { bar: "#10B981", iconBg: "bg-emerald-100", iconText: "text-emerald-700" },
    indigo:  { bar: "#6366F1", iconBg: "bg-indigo-100", iconText: "text-indigo-700" },
  };
  const s = styles[color];
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4 relative overflow-hidden hover:shadow-md transition-shadow">
      <div className="absolute left-0 inset-y-0 w-1 rounded-l-2xl" style={{ background: s.bar }} />
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.iconBg} ${s.iconText}`}>
        {icon}
      </div>
      <div>
        <p className={`font-bold text-gray-900 leading-none ${small ? "text-xl" : "text-3xl"}`}>{value}</p>
        <p className="text-xs text-gray-400 mt-1.5 font-medium">{label}</p>
      </div>
    </div>
  );
}

// ─── Monthly Revenue Chart ───────────────────────────────────────────────────
const MONTHS_SHORT = ["Oca","Şub","Mar","Nis","May","Haz","Tem","Ağu","Eyl","Eki","Kas","Ara"];

function MonthlyRevenueChart({ data }: { data: { year: number; month: number; total: number }[] }) {
  const maxVal = Math.max(...data.map((d) => d.total), 1);
  const chartH = 120;
  const barW = 32;
  const gap = 10;
  const paddingLeft = 10;
  const totalW = data.length * (barW + gap) - gap + paddingLeft * 2;
  const now = new Date();

  return (
    <div className="overflow-x-auto -mx-1">
      <svg width={totalW} height={chartH + 52} className="min-w-full">
        {/* Gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1={paddingLeft} x2={totalW - paddingLeft}
            y1={chartH - f * chartH + 8} y2={chartH - f * chartH + 8}
            stroke="#f3eeff" strokeWidth={1} />
        ))}
        {/* Bars */}
        {data.map((d, i) => {
          const x = i * (barW + gap) + paddingLeft;
          const barH = d.total > 0 ? Math.max((d.total / maxVal) * chartH, 6) : 3;
          const y = chartH - barH + 8;
          const isCurrent = d.year === now.getFullYear() && d.month === now.getMonth() + 1;
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={barH} rx={6}
                fill={isCurrent ? "#7A4899" : "#C3A5E0"} fillOpacity={d.total > 0 ? 1 : 0.3} />
              {d.total > 0 && (
                <text x={x + barW / 2} y={y - 5} textAnchor="middle" fontSize={8} fill="#7A4899" fontWeight="700">
                  {d.total >= 1000 ? `${(d.total / 1000).toFixed(0)}K` : Math.round(d.total)}
                </text>
              )}
              <text x={x + barW / 2} y={chartH + 24} textAnchor="middle" fontSize={10}
                fill={isCurrent ? "#7A4899" : "#9D7FB5"} fontWeight={isCurrent ? "700" : "400"}>
                {MONTHS_SHORT[d.month - 1]}
              </text>
              <text x={x + barW / 2} y={chartH + 38} textAnchor="middle" fontSize={8} fill="#C3A5E0">
                {String(d.year).slice(-2)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
