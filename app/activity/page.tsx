"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { STATUS_MAP } from "@/lib/constants";
import Link from "next/link";

interface ActivityItem {
  id: string;
  type: "status_change" | "note" | "invoice" | "project_created";
  timestamp: string;
  title: string;
  description: string;
  projectId?: string;
  projectNo?: string;
  customerId?: string;
  customerName?: string;
  meta?: Record<string, string>;
}

const TYPE_CONFIG = {
  status_change: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
    bg: "bg-brand-100", text: "text-brand-700", label: "Durum",
  },
  note: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
      </svg>
    ),
    bg: "bg-blue-100", text: "text-blue-700", label: "Not",
  },
  invoice: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
      </svg>
    ),
    bg: "bg-emerald-100", text: "text-emerald-700", label: "Fatura",
  },
  project_created: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    ),
    bg: "bg-indigo-100", text: "text-indigo-700", label: "Yeni Proje",
  },
};

function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return "Az önce";
  if (minutes < 60) return `${minutes} dakika önce`;
  if (hours < 24) return `${hours} saat önce`;
  if (days < 7) return `${days} gün önce`;
  return new Date(timestamp).toLocaleDateString("tr-TR");
}

function formatFull(timestamp: string): string {
  return new Date(timestamp).toLocaleString("tr-TR", {
    day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function ActivityPage() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    fetch("/api/activity?limit=100")
      .then((r) => r.json())
      .then((d) => { setItems(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = filter === "all" ? items : items.filter((i) => i.type === filter);

  // Group by date
  const grouped: Record<string, ActivityItem[]> = {};
  for (const item of filtered) {
    const date = new Date(item.timestamp).toLocaleDateString("tr-TR", {
      day: "numeric", month: "long", year: "numeric"
    });
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(item);
  }

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Aktivite Akışı</h1>
          <p className="page-subtitle">Sistemdeki tüm değişikliklerin kaydı</p>
        </div>
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1">
          {[
            { key: "all", label: "Tümü" },
            { key: "status_change", label: "Durumlar" },
            { key: "note", label: "Notlar" },
            { key: "invoice", label: "Faturalar" },
            { key: "project_created", label: "Projeler" },
          ].map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${filter === f.key ? "bg-brand-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-gray-400">Henüz aktivite kaydı yok.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, dateItems]) => (
            <div key={date}>
              <div className="flex items-center gap-3 mb-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{date}</p>
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-xs text-gray-300">{dateItems.length} etkinlik</span>
              </div>

              <div className="card overflow-hidden">
                {dateItems.map((item, idx) => {
                  const cfg = TYPE_CONFIG[item.type];
                  return (
                    <div key={item.id}
                      className={`flex items-start gap-4 p-4 transition-colors hover:bg-gray-50/50 ${idx < dateItems.length - 1 ? "border-b border-gray-50" : ""}`}>
                      {/* Icon */}
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg} ${cfg.text}`}>
                        {cfg.icon}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`badge ${cfg.bg} ${cfg.text} text-xs`}>{cfg.label}</span>
                          {item.type === "status_change" && item.meta && (
                            <div className="flex items-center gap-1">
                              <span className={`badge ${STATUS_MAP[item.meta.oldStatus]?.color ?? "bg-gray-100 text-gray-600"} text-xs`}>
                                {STATUS_MAP[item.meta.oldStatus]?.label ?? item.meta.oldStatus}
                              </span>
                              <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                              <span className={`badge ${STATUS_MAP[item.meta.newStatus]?.color ?? "bg-gray-100 text-gray-600"} text-xs`}>
                                {STATUS_MAP[item.meta.newStatus]?.label ?? item.meta.newStatus}
                              </span>
                            </div>
                          )}
                          {item.type !== "status_change" && (
                            <p className="text-sm text-gray-700 truncate">{item.description}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {item.projectNo && (
                            <Link href={`/projects/${item.projectId}`}
                              className="font-mono text-xs text-brand-600 hover:text-brand-700 hover:underline">
                              {item.projectNo}
                            </Link>
                          )}
                          {item.customerName && (
                            <span className="text-xs text-gray-400">· {item.customerName}</span>
                          )}
                          {item.type === "status_change" && item.meta?.changedBy && (
                            <span className="text-xs text-gray-400">· {item.meta.changedBy}</span>
                          )}
                        </div>
                      </div>

                      {/* Time */}
                      <div className="text-right flex-shrink-0" title={formatFull(item.timestamp)}>
                        <p className="text-xs text-gray-400">{timeAgo(item.timestamp)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
