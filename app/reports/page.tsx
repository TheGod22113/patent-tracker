"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { formatCurrency } from "@/lib/utils";
import { LANGUAGE_MAP } from "@/lib/constants";

interface ReportData {
  year: number;
  summary: {
    totalRevenue: number;
    totalProjects: number;
    completedProjects: number;
    avgProjectValue: number;
  };
  customerRevenue: { company: string; name: string; revenue: number; projectCount: number }[];
  languagePairStats: { source: string; target: string; count: number; revenue: number }[];
  translatorStats: { name: string; active: number; completed: number; revenue: number }[];
  monthlyProjects: { month: number; count: number; revenue: number }[];
}

const MONTHS_SHORT = ["Oca","Şub","Mar","Nis","May","Haz","Tem","Ağu","Eyl","Eki","Kas","Ara"];

export default function ReportsPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/reports?year=${year}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [year]);

  return (
    <AppLayout>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Raporlar & Analitik</h1>
          <p className="page-subtitle">{year} yılı detaylı performans analizi</p>
        </div>
        <select value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="input w-28">
          {[2024, 2025, 2026, 2027].map((y) => (<option key={y} value={y}>{y}</option>))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
        </div>
      ) : data ? (
        <>
          {/* Özet Kartlar */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Toplam Ciro", value: formatCurrency(data.summary.totalRevenue), color: "#7A4899", iconBg: "bg-brand-100", iconText: "text-brand-700",
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /> },
              { label: "Toplam Proje", value: data.summary.totalProjects, color: "#6366F1", iconBg: "bg-indigo-100", iconText: "text-indigo-700",
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /> },
              { label: "Tamamlanan", value: data.summary.completedProjects, color: "#10B981", iconBg: "bg-emerald-100", iconText: "text-emerald-700",
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /> },
              { label: "Ort. Proje Değeri", value: formatCurrency(data.summary.avgProjectValue), color: "#F59E0B", iconBg: "bg-amber-100", iconText: "text-amber-700",
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /> },
            ].map((c) => (
              <div key={c.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 relative overflow-hidden hover:shadow-md transition-shadow">
                <div className="absolute left-0 inset-y-0 w-1 rounded-l-2xl" style={{ background: c.color }} />
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${c.iconBg} ${c.iconText}`}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">{c.icon}</svg>
                </div>
                <p className="text-2xl font-bold text-gray-900 leading-none">{c.value}</p>
                <p className="text-xs text-gray-400 mt-1.5">{c.label}</p>
              </div>
            ))}
          </div>

          {/* Aylık Trend */}
          <div className="card p-6 mb-6">
            <h2 className="card-title mb-5">Aylık Trend — {year}</h2>
            <MonthlyChart data={data.monthlyProjects} />
          </div>

          {/* Alt Grid */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            {/* Top Müşteriler */}
            <div className="card p-5">
              <h2 className="card-title mb-4">En Yüksek Cirolu Müşteriler</h2>
              {data.customerRevenue.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Veri yok</p>
              ) : (
                <div className="space-y-3">
                  {data.customerRevenue.map((c, i) => {
                    const max = data.customerRevenue[0].revenue || 1;
                    const pct = Math.max((c.revenue / max) * 100, 2);
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                            <span className="text-sm font-medium text-gray-800 truncate">{c.company}</span>
                          </div>
                          <div className="text-right ml-3 flex-shrink-0">
                            <span className="text-sm font-semibold text-gray-900">{formatCurrency(c.revenue)}</span>
                            <span className="text-xs text-gray-400 ml-1">({c.projectCount} proje)</span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div className="h-2 rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Dil Çifti */}
            <div className="card p-5">
              <h2 className="card-title mb-4">Dil Çifti Analizi</h2>
              {data.languagePairStats.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Veri yok</p>
              ) : (
                <div className="overflow-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-400 border-b border-gray-100">
                        <th className="text-left pb-2">Dil Çifti</th>
                        <th className="text-right pb-2">Proje</th>
                        <th className="text-right pb-2">Ciro</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {data.languagePairStats.map((l, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="py-2">
                            <div className="flex items-center gap-1 text-xs">
                              <span className="bg-gray-100 px-1.5 py-0.5 rounded font-medium">{LANGUAGE_MAP[l.source] ?? l.source}</span>
                              <span className="text-gray-400">→</span>
                              <span className="bg-gray-100 px-1.5 py-0.5 rounded font-medium">{LANGUAGE_MAP[l.target] ?? l.target}</span>
                            </div>
                          </td>
                          <td className="py-2 text-right font-semibold text-gray-900">{l.count}</td>
                          <td className="py-2 text-right text-gray-600">{l.revenue > 0 ? formatCurrency(l.revenue) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Tercüman Performansı */}
          {data.translatorStats.length > 0 && (
            <div className="card p-5">
              <h2 className="card-title mb-4">Tercüman Performansı</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 border-b border-gray-100">
                    <th className="text-left pb-3">Tercüman</th>
                    <th className="text-center pb-3">Aktif</th>
                    <th className="text-center pb-3">Tamamlanan</th>
                    <th className="text-center pb-3">Toplam</th>
                    <th className="text-right pb-3">Ciro</th>
                    <th className="text-right pb-3">Verimlilik</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.translatorStats.map((t, i) => {
                    const total = t.active + t.completed;
                    const efficiency = total > 0 ? Math.round((t.completed / total) * 100) : 0;
                    return (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-700">
                              {t.name.charAt(0)}
                            </div>
                            <span className="font-medium text-gray-900">{t.name}</span>
                          </div>
                        </td>
                        <td className="py-3 text-center">
                          <span className={`badge ${t.active > 0 ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"}`}>{t.active}</span>
                        </td>
                        <td className="py-3 text-center">
                          <span className="badge bg-emerald-100 text-emerald-700">{t.completed}</span>
                        </td>
                        <td className="py-3 text-center font-semibold text-gray-900">{total}</td>
                        <td className="py-3 text-right text-gray-700 font-medium">{t.revenue > 0 ? formatCurrency(t.revenue) : "—"}</td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 bg-gray-100 rounded-full h-1.5">
                              <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${efficiency}%` }} />
                            </div>
                            <span className="text-xs font-semibold text-gray-600">%{efficiency}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}
    </AppLayout>
  );
}

function MonthlyChart({ data }: { data: { month: number; count: number; revenue: number }[] }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const maxRev = Math.max(...data.map((d) => d.revenue), 1);
  const barW = 36;
  const gap = 10;
  const chartH = 100;
  const totalW = data.length * (barW + gap) - gap + 40;

  return (
    <div className="overflow-x-auto">
      <svg width={totalW} height={chartH + 56} className="min-w-full">
        {[0, 0.5, 1].map((f) => (
          <line key={f} x1={20} x2={totalW - 20}
            y1={chartH - f * chartH + 4} y2={chartH - f * chartH + 4}
            stroke="#f3eeff" strokeWidth={1} />
        ))}
        {data.map((d, i) => {
          const x = i * (barW + gap) + 20;
          const barH = d.count > 0 ? Math.max((d.count / maxCount) * chartH, 6) : 2;
          const revH = d.revenue > 0 ? Math.max((d.revenue / maxRev) * chartH, 4) : 0;
          return (
            <g key={i}>
              {/* Revenue bar (background) */}
              {revH > 0 && (
                <rect x={x} y={chartH - revH + 4} width={barW} height={revH} rx={6}
                  fill="#dccbee" fillOpacity={0.5} />
              )}
              {/* Project count bar */}
              <rect x={x + barW * 0.2} y={chartH - barH + 4} width={barW * 0.6} height={barH} rx={4}
                fill="#7A4899" fillOpacity={d.count > 0 ? 0.9 : 0.2} />
              {d.count > 0 && (
                <text x={x + barW / 2} y={chartH - barH} textAnchor="middle" fontSize={9} fill="#7A4899" fontWeight="700">
                  {d.count}
                </text>
              )}
              <text x={x + barW / 2} y={chartH + 20} textAnchor="middle" fontSize={10} fill="#9D7FB5">
                {MONTHS_SHORT[d.month - 1]}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="flex items-center gap-4 mt-1 justify-end">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <div className="w-3 h-3 rounded bg-brand-500" /> Proje Sayısı
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <div className="w-3 h-3 rounded bg-brand-200" /> Ciro
        </div>
      </div>
    </div>
  );
}
