"use client";

import { useEffect, useState, Suspense, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import { StatusBadge } from "@/components/ui/Badge";
import { formatDate, getMonthName } from "@/lib/utils";
import { MONTHS_TR, LANGUAGE_MAP, LANGUAGES, STATUS_MAP } from "@/lib/constants";
import Link from "next/link";
import ContextMenu, { ContextMenuItemType } from "@/components/ui/ContextMenu";
import { MiniPipeline, PipelineSummary } from "@/components/ui/ProjectPipeline";
export const dynamic = 'force-dynamic';
interface Project {
  id: string;
  projectNo: string;
  year: number;
  month: number;
  status: string;
  sourceLanguage: string;
  targetLanguage: string;
  createdAt: string;
  deliveryDate: string | null;
  notes: string | null;
  customer: { id: string; name: string; company: string };
  coordinator: { name: string } | null;
  translator: { id: string; name: string } | null;
  outputs: { totalPrice: number | null }[];
  tags: { tag: { id: string; name: string; color: string } }[];
}

interface Staff {
  id: string;
  name: string;
  role: string;
}

type SortKey = "deliveryDate" | "createdAt" | "customer" | "notes";
type SortDir = "asc" | "desc";

// ── Satır rengi: teslim tarihine göre yeşil → kırmızı ─────────────────────
function getRowStyle(p: Project): string {
  if (["completed", "invoiced"].includes(p.status)) {
    return "bg-white"; // tamamlanmış → nötr
  }
  if (!p.deliveryDate) return "bg-white";

  const daysLeft = Math.ceil(
    (new Date(p.deliveryDate).setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / 86400000
  );

  if (daysLeft < 0)  return "bg-red-50 border-l-4 border-l-red-400";       // gecikmiş
  if (daysLeft === 0) return "bg-red-50/70 border-l-4 border-l-red-300";    // bugün
  if (daysLeft <= 2)  return "bg-orange-50 border-l-4 border-l-orange-400"; // 1-2 gün
  if (daysLeft <= 5)  return "bg-yellow-50 border-l-4 border-l-yellow-300"; // 3-5 gün
  if (daysLeft <= 10) return "bg-lime-50 border-l-4 border-l-lime-300";     // 6-10 gün
  return "bg-emerald-50/40 border-l-4 border-l-emerald-200";                // 10+ gün
}

// ── Sıralama yardımcıları ───────────────────────────────────────────────────
function sortProjects(projects: Project[], key: SortKey, dir: SortDir): Project[] {
  return [...projects].sort((a, b) => {
    let va: string | number | null = null;
    let vb: string | number | null = null;

    if (key === "deliveryDate") {
      va = a.deliveryDate ? new Date(a.deliveryDate).getTime() : Infinity;
      vb = b.deliveryDate ? new Date(b.deliveryDate).getTime() : Infinity;
    } else if (key === "createdAt") {
      va = new Date(a.createdAt).getTime();
      vb = new Date(b.createdAt).getTime();
    } else if (key === "customer") {
      va = a.customer.company.toLowerCase();
      vb = b.customer.company.toLowerCase();
    } else if (key === "notes") {
      va = a.notes?.toLowerCase() ?? "";
      vb = b.notes?.toLowerCase() ?? "";
    }

    if (va === null || va === undefined) return 1;
    if (vb === null || vb === undefined) return -1;
    if (va < vb) return dir === "asc" ? -1 : 1;
    if (va > vb) return dir === "asc" ? 1 : -1;
    return 0;
  });
}

// ── Sütun başlığı bileşeni ─────────────────────────────────────────────────
function SortTh({
  label, sortKey, current, dir, onSort,
}: {
  label: string;
  sortKey: SortKey;
  current: SortKey | null;
  dir: SortDir;
  onSort: (k: SortKey) => void;
}) {
  const active = current === sortKey;
  return (
    <th
      className="text-left px-4 py-3 cursor-pointer select-none hover:text-brand-700 transition-colors group"
      onClick={() => onSort(sortKey)}
    >
      <span className="flex items-center gap-1">
        {label}
        <span className={`text-xs transition-all ${active ? "text-brand-600" : "text-gray-300 group-hover:text-gray-400"}`}>
          {active ? (dir === "asc" ? "▲" : "▼") : "⇅"}
        </span>
      </span>
    </th>
  );
}

// ── Toplu Fatura Modal ────────────────────────────────────────────────────────
interface BulkInvoiceGroup {
  customerId: string;
  customerName: string;
  projects: { id: string; projectNo: string; amount: number }[];
  total: number;
}

function BulkInvoiceModal({
  groups,
  year,
  month,
  onClose,
  onConfirm,
}: {
  groups: BulkInvoiceGroup[];
  year: number;
  month: number;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const grandTotal = groups.reduce((s, g) => s + g.total, 0);

  const handleConfirm = async () => {
    setLoading(true);
    await fetch("/api/invoices/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        groups: groups.map((g) => ({
          customerId: g.customerId,
          year,
          month,
          projectIds: g.projects.map((p) => p.id),
        })),
      }),
    });
    setLoading(false);
    onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(26,15,46,0.6)", backdropFilter: "blur(4px)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Toplu Fatura Oluştur</h2>
          <p className="text-sm text-gray-500 mt-1">{groups.length} müşteri için {groups.reduce((s, g) => s + g.projects.length, 0)} proje faturalandırılacak</p>
        </div>
        <div className="p-6 space-y-4 max-h-80 overflow-y-auto">
          {groups.map((g) => (
            <div key={g.customerId} className="rounded-xl border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-brand-50">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-brand-600 text-white text-xs font-bold flex items-center justify-center">{g.customerName.charAt(0)}</div>
                  <span className="font-semibold text-brand-900 text-sm">{g.customerName}</span>
                </div>
                <span className="font-bold text-brand-700 text-sm">{g.total.toLocaleString("tr-TR", { style: "currency", currency: "TRY" })}</span>
              </div>
              <div className="divide-y divide-gray-50">
                {g.projects.map((p) => (
                  <div key={p.id} className="flex items-center justify-between px-4 py-2 text-sm">
                    <span className="font-mono text-gray-600">{p.projectNo}</span>
                    <span className="text-gray-500">{p.amount > 0 ? p.amount.toLocaleString("tr-TR", { style: "currency", currency: "TRY" }) : "—"}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="p-6 border-t border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-gray-700">Toplam Tutar</span>
            <span className="text-xl font-bold text-gray-900">{grandTotal.toLocaleString("tr-TR", { style: "currency", currency: "TRY" })}</span>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1" disabled={loading}>İptal</button>
            <button onClick={handleConfirm} disabled={loading}
              className="btn-primary flex-1">
              {loading ? "Oluşturuluyor..." : `${groups.length} Fatura Oluştur`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════

function ProjectsContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const now = new Date();

  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState<number | "">(now.getMonth() + 1);
  const [status, setStatus] = useState("");
  const [customerId] = useState(sp.get("customerId") ?? "");
  const [search, setSearch] = useState("");
  const [sourceLanguage, setSourceLanguage] = useState("");
  const [translatorId, setTranslatorId] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const [projects, setProjects] = useState<Project[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkInvoiceModal, setBulkInvoiceModal] = useState(false);

  // Inline status dropdown
  const [statusDropdown, setStatusDropdown] = useState<string | null>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  // Context menu (sağ tık)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; project: Project } | null>(null);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (year) params.set("year", String(year));
    if (month) params.set("month", String(month));
    if (status) params.set("status", status);
    if (customerId) params.set("customerId", customerId);
    if (search) params.set("search", search);
    if (sourceLanguage) params.set("sourceLanguage", sourceLanguage);
    if (translatorId) params.set("translatorId", translatorId);

    fetch(`/api/projects?${params}`)
      .then((r) => r.json())
      .then((d) => { setProjects(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetch("/api/staff").then((r) => r.json()).then((d) => setStaff(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [year, month, status, customerId, search, sourceLanguage, translatorId]);

  // Close status dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) {
        setStatusDropdown(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Sıralama
  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const displayProjects = useMemo(
    () => sortKey ? sortProjects(projects, sortKey, sortDir) : projects,
    [projects, sortKey, sortDir]
  );

  const quickUpdateStatus = async (id: string, newStatus: string) => {
    setStatusDropdown(null);
    await fetch(`/api/projects/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus, changedBy: "kullanıcı" }),
    });
    load();
  };

  const deleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Bu projeyi silmek istiyor musunuz?")) return;
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    setSelectedIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
    load();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === displayProjects.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(displayProjects.map((p) => p.id)));
  };

  const bulkDelete = async () => {
    if (!selectedIds.size) return;
    if (!confirm(`${selectedIds.size} projeyi silmek istiyor musunuz?`)) return;
    await fetch("/api/projects/bulk", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selectedIds) }),
    });
    setSelectedIds(new Set());
    load();
  };

  const bulkMarkAsInvoiced = async () => {
    if (!selectedIds.size) return;
    if (!confirm(`${selectedIds.size} projeyi "Faturalandı" olarak işaretlemek istiyor musunuz?`)) return;
    await fetch("/api/projects/bulk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selectedIds), status: "invoiced" }),
    });
    setSelectedIds(new Set());
    load();
  };

  const totalAmount = projects.reduce((sum, p) => sum + p.outputs.reduce((s, o) => s + (o.totalPrice ?? 0), 0), 0);
  const activeFilterCount = [sourceLanguage, translatorId].filter(Boolean).length;

  // Toplu fatura: seçili projeleri müşteriye göre grupla
  const bulkInvoiceGroups: BulkInvoiceGroup[] = useMemo(() => {
    const selected = projects.filter((p) => selectedIds.has(p.id));
    const map = new Map<string, BulkInvoiceGroup>();
    for (const p of selected) {
      const amount = p.outputs.reduce((s, o) => s + (o.totalPrice ?? 0), 0);
      const existing = map.get(p.customer.id) ?? {
        customerId: p.customer.id,
        customerName: p.customer.company,
        projects: [],
        total: 0,
      };
      existing.projects.push({ id: p.id, projectNo: p.projectNo, amount });
      existing.total += amount;
      map.set(p.customer.id, existing);
    }
    return [...map.values()];
  }, [projects, selectedIds]);

  return (
    <AppLayout>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Projeler</h1>
          <p className="page-subtitle">
            {projects.length} proje
            {totalAmount > 0 && (
              <span className="text-emerald-600 font-semibold ml-1">
                · {totalAmount.toLocaleString("tr-TR", { style: "currency", currency: "TRY" })}
              </span>
            )}
          </p>
        </div>
        <Link href="/projects/new" className="btn-primary">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Yeni Proje
        </Link>
      </div>

      {/* Toplu İşlem Toolbar */}
      {selectedIds.size > 0 && (
        <div className="card p-4 mb-4 flex items-center justify-between"
          style={{ background: "linear-gradient(135deg, #f7f3fb 0%, #ede5f6 100%)", borderColor: "#dccbee" }}>
          <div className="flex items-center gap-3">
            <input type="checkbox" checked={selectedIds.size === displayProjects.length}
              onChange={toggleSelectAll} className="rounded w-4 h-4 cursor-pointer accent-brand-600" />
            <span className="text-sm font-semibold text-brand-900">{selectedIds.size} proje seçildi</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setBulkInvoiceModal(true)}
              className="btn btn-sm bg-emerald-600 text-white hover:bg-emerald-700">
              🧾 Fatura Kes
            </button>
            <button onClick={bulkMarkAsInvoiced} className="btn btn-sm bg-brand-600 text-white hover:bg-brand-700">✓ Faturalandı</button>
            <button onClick={bulkDelete} className="btn btn-sm bg-red-600 text-white hover:bg-red-700">🗑 Sil</button>
            <button onClick={() => setSelectedIds(new Set())} className="btn-secondary btn-sm">✕ İptal</button>
          </div>
        </div>
      )}

      {/* Filtreler */}
      <div className="filter-bar mb-4">
        <div className="flex items-end gap-2 md:gap-3 flex-wrap">
          <div className="flex-1 min-w-0 md:min-w-52">
            <label className="label">Ara</label>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input type="text" placeholder="Proje no veya müşteri..." value={search}
                onChange={(e) => setSearch(e.target.value)} className="input pl-9" />
            </div>
          </div>
          <div className="w-20 md:w-24">
            <label className="label">Yıl</label>
            <select value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="input w-full">
              {[2024, 2025, 2026, 2027].map((y) => (<option key={y} value={y}>{y}</option>))}
            </select>
          </div>
          <div className="w-28 md:w-32">
            <label className="label">Ay</label>
            <select value={month} onChange={(e) => setMonth(e.target.value ? parseInt(e.target.value) : "")} className="input w-full">
              <option value="">Tüm Aylar</option>
              {MONTHS_TR.map((m, i) => (<option key={i + 1} value={i + 1}>{m}</option>))}
            </select>
          </div>
          <div className="w-36 md:w-40">
            <label className="label">Durum</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="input w-full">
              <option value="">Tüm Durumlar</option>
              {Object.entries(STATUS_MAP).map(([k, v]) => (<option key={k} value={k}>{v.label}</option>))}
            </select>
          </div>
          <button onClick={() => setShowAdvanced(!showAdvanced)}
            className={`btn btn-sm mb-0.5 ${showAdvanced || activeFilterCount > 0 ? "bg-brand-100 text-brand-700 border border-brand-200" : "btn-secondary"}`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filtreler
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 text-xs bg-brand-600 text-white rounded-full flex items-center justify-center">{activeFilterCount}</span>
            )}
          </button>
          {/* Sıralama temizle */}
          {sortKey && (
            <button onClick={() => { setSortKey(null); setSortDir("asc"); }}
              className="btn-secondary btn-sm mb-0.5 text-xs">
              ↺ Sıralamayı Sıfırla
            </button>
          )}
        </div>

        {/* Gelişmiş filtreler */}
        {showAdvanced && (
          <div className="flex items-end gap-3 flex-wrap mt-3 pt-3 border-t border-gray-100">
            <div>
              <label className="label">Kaynak Dil</label>
              <select value={sourceLanguage} onChange={(e) => setSourceLanguage(e.target.value)} className="input w-36">
                <option value="">Tüm Diller</option>
                {LANGUAGES.map((l) => (<option key={l.code} value={l.code}>{l.label}</option>))}
              </select>
            </div>
            <div>
              <label className="label">Tercüman</label>
              <select value={translatorId} onChange={(e) => setTranslatorId(e.target.value)} className="input w-44">
                <option value="">Tüm Tercümanlar</option>
                {staff.filter((s) => s.role === "translator").map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
              </select>
            </div>
            {(sourceLanguage || translatorId) && (
              <button onClick={() => { setSourceLanguage(""); setTranslatorId(""); }}
                className="btn-secondary btn-sm mb-0.5 text-red-500 border-red-200 hover:bg-red-50">
                Filtreleri Sıfırla
              </button>
            )}
          </div>
        )}
      </div>

      {/* Renk Açıklaması */}
      <div className="flex items-center gap-4 mb-3 px-1 flex-wrap">
        <span className="text-xs text-gray-400 font-medium">Teslim durumu:</span>
        {[
          { color: "border-l-red-400 bg-red-50", label: "Gecikmiş" },
          { color: "border-l-orange-400 bg-orange-50", label: "1-2 gün" },
          { color: "border-l-yellow-300 bg-yellow-50", label: "3-5 gün" },
          { color: "border-l-lime-300 bg-lime-50", label: "6-10 gün" },
          { color: "border-l-emerald-200 bg-emerald-50/40", label: "10+ gün" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className={`w-5 h-3.5 rounded-sm border-l-4 ${item.color}`} />
            <span className="text-xs text-gray-500">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Süreç Hattı Özeti */}
      {!loading && projects.length > 0 && (
        <PipelineSummary
          statusCounts={
            ["new", "word_conversion", "translation", "review", "completed", "invoiced"].map((s) => ({
              status: s,
              count: projects.filter((p) => p.status === s).length,
            }))
          }
        />
      )}

      {/* Tablo */}
      <div className="table-wrapper">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
              <p className="text-xs text-gray-400">Yükleniyor...</p>
            </div>
          </div>
        ) : displayProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-brand-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <p className="font-semibold text-gray-500">Proje bulunamadı</p>
            <p className="text-sm text-gray-400 mt-1">Filtre kriterlerinizi değiştirin veya yeni proje ekleyin</p>
            <Link href="/projects/new" className="btn-primary mt-4">+ Yeni Proje</Link>
          </div>
        ) : (
          <>
          {/* Mobil kart görünümü */}
          <div className="md:hidden divide-y divide-gray-50">
            {displayProjects.map((p) => {
              const amount = p.outputs.reduce((s: number, o: {totalPrice: number | null}) => s + (o.totalPrice ?? 0), 0);
              return (
                <div
                  key={p.id}
                  className="p-4 hover:bg-gray-50 cursor-pointer active:bg-gray-100 transition-colors"
                  onClick={() => router.push(`/projects/${p.id}`)}
                  onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, project: p }); }}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-gray-900">{p.projectNo}</span>
                        <StatusBadge status={p.status} />
                      </div>
                      <MiniPipeline status={p.status} />
                    </div>
                    {amount > 0 && (
                      <span className="text-xs font-semibold text-gray-700 flex-shrink-0">
                        {amount.toLocaleString("tr-TR", { style: "currency", currency: "TRY" })}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-800">{p.customer.company}</p>
                  {p.notes && <p className="text-xs text-gray-500 truncate mt-0.5">{p.notes}</p>}
                  <div className="flex items-center gap-3 flex-wrap mt-1.5">
                    {p.deliveryDate && (() => {
                      const daysLeft = Math.ceil((new Date(p.deliveryDate).setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / 86400000);
                      const isDone = ["completed", "invoiced"].includes(p.status);
                      return (
                        <span className={`text-xs font-medium ${!isDone && daysLeft < 0 ? "text-red-600" : !isDone && daysLeft <= 2 ? "text-orange-600" : "text-gray-500"}`}>
                          📅 {formatDate(p.deliveryDate)}{!isDone && daysLeft < 0 ? ` (${Math.abs(daysLeft)}g geçti)` : !isDone && daysLeft <= 5 ? ` (${daysLeft}g kaldı)` : ""}
                        </span>
                      );
                    })()}
                    {p.translator && <span className="text-xs text-gray-400">T: {p.translator.name}</span>}
                    {p.coordinator && <span className="text-xs text-gray-400">K: {p.coordinator.name}</span>}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="overflow-x-auto hidden md:block">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="table-header">
                <th className="px-4 py-3 w-8">
                  <input type="checkbox"
                    checked={selectedIds.size === displayProjects.length && displayProjects.length > 0}
                    onChange={toggleSelectAll} className="rounded accent-brand-600" />
                </th>
                <SortTh label="Notlar" sortKey="notes" current={sortKey} dir={sortDir} onSort={handleSort} />
                <SortTh label="Teslim Tarihi" sortKey="deliveryDate" current={sortKey} dir={sortDir} onSort={handleSort} />
                <th className="text-left px-4 py-3">Durum</th>
                <th className="text-left px-4 py-3">Dil Çifti</th>
                <SortTh label="Müşteri" sortKey="customer" current={sortKey} dir={sortDir} onSort={handleSort} />
                <th className="text-left px-4 py-3">Personel</th>
                <SortTh label="Eklenme Tarihi" sortKey="createdAt" current={sortKey} dir={sortDir} onSort={handleSort} />
                <th className="text-left px-4 py-3">Proje No</th>
                <th className="text-right px-4 py-3">Tutar</th>
                <th className="px-4 py-3 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {displayProjects.map((p) => {
                const amount = p.outputs.reduce((s, o) => s + (o.totalPrice ?? 0), 0);
                const rowStyle = getRowStyle(p);
                const isSelected = selectedIds.has(p.id);

                return (
                  <tr key={p.id}
                    className={`cursor-pointer transition-all border-b border-gray-50 last:border-0
                      ${rowStyle} ${isSelected ? "opacity-90 ring-1 ring-inset ring-brand-300" : "hover:brightness-95"}`}
                    onClick={() => router.push(`/projects/${p.id}`)}
                    onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, project: p }); }}>

                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(p.id)}
                        className="rounded accent-brand-600" />
                    </td>

                    {/* Notlar */}
                    <td className="px-4 py-3 max-w-40">
                      {p.notes ? (
                        <p className="text-xs text-gray-500 truncate" title={p.notes}>{p.notes}</p>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </td>

                    {/* Teslim Tarihi */}
                    <td className="px-4 py-3">
                      {p.deliveryDate ? (() => {
                        const daysLeft = Math.ceil(
                          (new Date(p.deliveryDate).setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / 86400000
                        );
                        const isDone = ["completed", "invoiced"].includes(p.status);
                        return (
                          <div>
                            <span className="text-xs font-medium text-gray-700">{formatDate(p.deliveryDate)}</span>
                            {!isDone && (
                              <p className={`text-xs mt-0.5 font-semibold ${
                                daysLeft < 0 ? "text-red-600" :
                                daysLeft === 0 ? "text-red-500" :
                                daysLeft <= 2 ? "text-orange-600" :
                                daysLeft <= 5 ? "text-yellow-600" : "text-emerald-600"}`}>
                                {daysLeft < 0 ? `${Math.abs(daysLeft)} gün geçti` :
                                 daysLeft === 0 ? "Bugün!" :
                                 daysLeft === 1 ? "Yarın" : `${daysLeft} gün kaldı`}
                              </p>
                            )}
                          </div>
                        );
                      })() : <span className="text-gray-300 text-xs">—</span>}
                    </td>

                    {/* Durum */}
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="relative" ref={statusDropdown === p.id ? statusDropdownRef : null}>
                        <button
                          onClick={(e) => { e.stopPropagation(); setStatusDropdown(statusDropdown === p.id ? null : p.id); }}
                          className="cursor-pointer hover:opacity-80 transition-opacity group flex flex-col gap-1">
                          <div className="flex items-center gap-0.5">
                            <StatusBadge status={p.status} />
                            <span className="text-gray-300 group-hover:text-gray-500 text-xs">▾</span>
                          </div>
                          <MiniPipeline status={p.status} />
                        </button>
                        {statusDropdown === p.id && (
                          <div className="absolute top-full left-0 mt-1 z-50 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 min-w-44">
                            {Object.entries(STATUS_MAP).map(([key, val]) => (
                              <button key={key} onClick={() => quickUpdateStatus(p.id, key)}
                                className={`w-full text-left px-3 py-1.5 hover:bg-brand-50 transition-colors flex items-center gap-2 ${key === p.status ? "bg-brand-50/50" : ""}`}>
                                <span className={`badge ${val.color} text-xs`}>{val.label}</span>
                                {key === p.status && (
                                  <svg className="w-3 h-3 text-brand-600 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Dil Çifti */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-xs">
                        <span className="bg-white/70 border border-gray-200 px-1.5 py-0.5 rounded">
                          {LANGUAGE_MAP[p.sourceLanguage] ?? p.sourceLanguage}
                        </span>
                        <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        <span className="bg-white/70 border border-gray-200 px-1.5 py-0.5 rounded">
                          {LANGUAGE_MAP[p.targetLanguage] ?? p.targetLanguage}
                        </span>
                      </div>
                    </td>

                    {/* Müşteri */}
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800 text-xs">{p.customer.company}</p>
                      <p className="text-xs text-gray-400">{p.customer.name}</p>
                    </td>

                    {/* Personel */}
                    <td className="px-4 py-3">
                      <div className="text-xs text-gray-600 space-y-0.5">
                        {p.translator && <p><span className="text-gray-400">T:</span> {p.translator.name}</p>}
                        {p.coordinator && <p><span className="text-gray-400">K:</span> {p.coordinator.name}</p>}
                        {!p.translator && !p.coordinator && <span className="text-gray-300">—</span>}
                      </div>
                    </td>

                    {/* Eklenme Tarihi */}
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-400">{formatDate(p.createdAt)}</span>
                    </td>

                    {/* Proje No */}
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs font-bold text-gray-900">{p.projectNo}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{getMonthName(p.month)} {p.year}</p>
                      {p.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {p.tags.slice(0, 3).map(({ tag }) => (
                            <span key={tag.id}
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium"
                              style={{ background: tag.color + "20", color: tag.color, border: `1px solid ${tag.color}40` }}>
                              <span className="w-1.5 h-1.5 rounded-full" style={{ background: tag.color }} />
                              {tag.name}
                            </span>
                          ))}
                          {p.tags.length > 3 && (
                            <span className="text-xs text-gray-400">+{p.tags.length - 3}</span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Tutar */}
                    <td className="px-4 py-3 text-right">
                      <span className={`text-xs font-semibold ${amount > 0 ? "text-gray-900" : "text-gray-300"}`}>
                        {amount > 0 ? amount.toLocaleString("tr-TR", { style: "currency", currency: "TRY" }) : "—"}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <button onClick={(e) => deleteProject(p.id, e)}
                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
          </>
        )}
      </div>
      {/* Sağ Tık Context Menu */}
      {contextMenu && (() => {
        const p = contextMenu.project;
        const items: ContextMenuItemType[] = [
          {
            type: "action", label: "Projeyi Aç",
            icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>,
            onClick: () => router.push(`/projects/${p.id}`),
          },
          {
            type: "action", label: "Kanban'da Gör",
            icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" /></svg>,
            onClick: () => router.push(`/kanban`),
          },
          { type: "divider" },
          { type: "header", label: "Durumu Değiştir" },
          ...Object.entries(STATUS_MAP).map(([key, val]): ContextMenuItemType => ({
            type: "action",
            label: val.label,
            onClick: () => quickUpdateStatus(p.id, key),
          })),
          { type: "divider" },
          {
            type: "action", label: "Projeyi Sil", danger: true,
            icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
            onClick: () => { if (confirm("Bu projeyi silmek istiyor musunuz?")) { fetch(`/api/projects/${p.id}`, { method: "DELETE" }).then(() => load()); } },
          },
        ];
        return <ContextMenu x={contextMenu.x} y={contextMenu.y} items={items} onClose={() => setContextMenu(null)} />;
      })()}

      {/* Toplu Fatura Modal */}
      {bulkInvoiceModal && (
        <BulkInvoiceModal
          groups={bulkInvoiceGroups}
          year={year}
          month={typeof month === "number" ? month : now.getMonth() + 1}
          onClose={() => setBulkInvoiceModal(false)}
          onConfirm={() => {
            setBulkInvoiceModal(false);
            setSelectedIds(new Set());
            load();
          }}
        />
      )}
    </AppLayout>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense>
      <ProjectsContent />
    </Suspense>
  );
}
