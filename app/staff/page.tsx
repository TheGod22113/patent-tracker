"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { StatusBadge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

interface StaffMember {
  id: string;
  name: string;
  role: string;
  email: string | null;
  phone: string | null;
  active: boolean;
}

interface Project {
  id: string;
  projectNo: string;
  status: string;
  deliveryDate: string | null;
  customer: { company: string };
  translator: { id: string } | null;
  coordinator: { id: string } | null;
}

const ROLE_MAP: Record<string, string> = {
  coordinator: "Koordinatör",
  translator: "Tercüman",
  both: "Koordinatör & Tercüman",
};

export default function StaffPage() {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/staff").then((r) => r.json()),
      fetch(`/api/projects?year=${new Date().getFullYear()}`).then((r) => r.json()),
    ])
      .then(([staff, proj]) => {
        setStaffList(Array.isArray(staff) ? staff : []);
        setProjects(Array.isArray(proj) ? proj : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const getStaffProjects = (staffId: string) => ({
    active: projects.filter(
      (p) =>
        (p.translator?.id === staffId || p.coordinator?.id === staffId) &&
        !["completed", "invoiced"].includes(p.status)
    ),
    completed: projects.filter(
      (p) =>
        (p.translator?.id === staffId || p.coordinator?.id === staffId) &&
        ["completed", "invoiced"].includes(p.status)
    ),
  });

  const activeStaff = staffList.filter((s) => s.active);
  const totalActive = projects.filter((p) => !["completed", "invoiced"].includes(p.status)).length;

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Personel Yönetimi</h1>
          <p className="page-subtitle">{activeStaff.length} aktif personel · {totalActive} devam eden proje</p>
        </div>
        <Link href="/settings" className="btn-secondary">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Personel Düzenle
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
        </div>
      ) : activeStaff.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-gray-400">Henüz personel eklenmemiş.</p>
          <Link href="/settings" className="btn-primary mt-4">Personel Ekle</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {activeStaff.map((s) => {
            const { active, completed } = getStaffProjects(s.id);
            const total = active.length + completed.length;
            const workloadPct = total > 0 ? Math.min(Math.round((active.length / Math.max(total, 5)) * 100), 100) : 0;
            const isExpanded = expandedId === s.id;

            const workloadColor =
              workloadPct >= 80 ? "bg-red-500" :
              workloadPct >= 50 ? "bg-amber-500" :
              workloadPct >= 20 ? "bg-emerald-500" : "bg-gray-300";

            return (
              <div key={s.id} className="card overflow-hidden">
                {/* Kart Başlığı */}
                <div className="p-5 flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 text-lg font-bold text-white"
                      style={{ background: "linear-gradient(135deg, #8B54A8 0%, #5A2E7A 100%)" }}>
                      {s.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900">{s.name}</p>
                      <span className="badge bg-brand-100 text-brand-700 text-xs">{ROLE_MAP[s.role] ?? s.role}</span>
                      {s.email && <p className="text-xs text-gray-400 mt-1">{s.email}</p>}
                    </div>
                  </div>
                  {/* İstatistikler */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-center">
                      <p className="text-xl font-bold text-amber-600">{active.length}</p>
                      <p className="text-xs text-gray-400">Aktif</p>
                    </div>
                    <div className="w-px h-8 bg-gray-100" />
                    <div className="text-center">
                      <p className="text-xl font-bold text-emerald-600">{completed.length}</p>
                      <p className="text-xs text-gray-400">Bitti</p>
                    </div>
                  </div>
                </div>

                {/* Yoğunluk Çubuğu */}
                <div className="px-5 pb-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-gray-400 font-medium">İş Yoğunluğu</span>
                    <span className="text-xs font-semibold text-gray-600">%{workloadPct}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className={`h-2 rounded-full transition-all ${workloadColor}`} style={{ width: `${workloadPct}%` }} />
                  </div>
                </div>

                {/* Aktif Projeler */}
                {active.length > 0 && (
                  <div className="border-t border-gray-50 px-5 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Aktif Projeler</p>
                      {active.length > 3 && (
                        <button onClick={() => setExpandedId(isExpanded ? null : s.id)}
                          className="text-xs text-brand-600 hover:text-brand-700 font-medium">
                          {isExpanded ? "Gizle" : `+${active.length - 3} daha`}
                        </button>
                      )}
                    </div>
                    <div className="space-y-2">
                      {(isExpanded ? active : active.slice(0, 3)).map((p) => {
                        const overdue = p.deliveryDate && new Date(p.deliveryDate) < new Date();
                        return (
                          <Link key={p.id} href={`/projects/${p.id}`}
                            className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 hover:bg-brand-50 border border-transparent hover:border-brand-100 transition-all">
                            <div className="flex items-center gap-2 min-w-0">
                              <StatusBadge status={p.status} />
                              <span className="font-mono text-xs text-gray-600 truncate">{p.projectNo}</span>
                              <span className="text-xs text-gray-400 truncate hidden sm:block">· {p.customer.company}</span>
                            </div>
                            {p.deliveryDate && (
                              <span className={`text-xs font-medium flex-shrink-0 ml-2 ${overdue ? "text-red-600" : "text-gray-400"}`}>
                                {formatDate(p.deliveryDate)}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}

                {active.length === 0 && (
                  <div className="border-t border-gray-50 px-5 py-4">
                    <p className="text-xs text-gray-400 text-center">Aktif proje yok</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}
