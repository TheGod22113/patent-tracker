"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { InvoiceStatusBadge } from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import { formatDate, formatCurrency, getMonthName } from "@/lib/utils";
import { MONTHS_TR, OUTPUT_TYPE_MAP } from "@/lib/constants";
import { getDirHandle, openFileFromDir } from "@/lib/fileHandleStore";

interface Customer {
  id: string;
  name: string;
  company: string;
}

interface ProjectOutput {
  id: string;
  outputType: string;
  fileName: string | null;
  filePath: string | null;
  totalPrice: number | null;
}

interface ProjectFile {
  id: string;
  fileName: string;
  filePath: string | null;
  fileType: string;
}

interface Project {
  id: string;
  projectNo: string;
  status: string;
  outputs: ProjectOutput[];
  sourceFiles: ProjectFile[];
  customer: { id: string };
}

interface Invoice {
  id: string;
  invoiceNo: string | null;
  year: number;
  month: number;
  totalAmount: number;
  status: string;
  issuedAt: string | null;
  paidAt: string | null;
  notes: string | null;
  createdAt: string;
  customer: { id: string; name: string; company: string };
  items: {
    id: string;
    amount: number;
    description: string | null;
    project: {
      id: string;
      projectNo: string;
      outputs: ProjectOutput[];
      sourceFiles: ProjectFile[];
    };
  }[];
}

export default function InvoicesPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  // Create invoice modal
  const [createModal, setCreateModal] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [completedProjects, setCompletedProjects] = useState<Project[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [invoiceNotes, setInvoiceNotes] = useState("");
  const [creating, setCreating] = useState(false);

  // Detail modal
  const [detailModal, setDetailModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  // projectId → FileSystemDirectoryHandle
  const [projectHandles, setProjectHandles] = useState<Map<string, FileSystemDirectoryHandle>>(new Map());

  const loadInvoices = () => {
    setLoading(true);
    fetch(`/api/invoices?year=${year}&month=${month}`)
      .then((r) => r.json())
      .then((d) => {
        setInvoices(d);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadInvoices();
  }, [year, month]);

  const openCreateModal = async () => {
    const [c, p] = await Promise.all([
      fetch("/api/customers").then((r) => r.json()),
      fetch(`/api/projects?status=completed`).then((r) => r.json()),
    ]);
    setCustomers(c);
    setCompletedProjects(p);
    setSelectedCustomer("");
    setSelectedProjects([]);
    setInvoiceNotes("");
    setCreateModal(true);
  };

  const filteredProjects = completedProjects.filter(
    (p) => p.customer.id === selectedCustomer
  );

  const toggleProject = (id: string) => {
    setSelectedProjects((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectedTotal = completedProjects
    .filter((p) => selectedProjects.includes(p.id))
    .reduce(
      (sum, p) =>
        sum + p.outputs.reduce((s, o) => s + (o.totalPrice ?? 0), 0),
      0
    );

  const createInvoice = async () => {
    if (!selectedCustomer) return alert("Müşteri seçin.");
    if (selectedProjects.length === 0) return alert("En az bir proje seçin.");
    setCreating(true);
    await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: selectedCustomer,
        year,
        month,
        projectIds: selectedProjects,
        notes: invoiceNotes,
      }),
    });
    setCreating(false);
    setCreateModal(false);
    loadInvoices();
  };

  const updateStatus = async (invoiceId: string, status: string) => {
    setUpdatingStatus(true);
    const data: Record<string, unknown> = { status };
    if (status === "sent") data.issuedAt = new Date().toISOString();
    if (status === "paid") data.paidAt = new Date().toISOString();

    await fetch(`/api/invoices/${invoiceId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setUpdatingStatus(false);
    loadInvoices();
    // Refresh detail
    if (selectedInvoice?.id === invoiceId) {
      const updated = await fetch(`/api/invoices/${invoiceId}`).then((r) => r.json());
      setSelectedInvoice(updated);
    }
  };

  const openFile = async (fileName: string, filePath: string | null, projectId?: string) => {
    if (projectId) {
      const handle = projectHandles.get(projectId);
      if (handle) {
        try {
          await openFileFromDir(handle, fileName);
          return;
        } catch { /* handle geçersiz, devam et */ }
      }
    }
    if (filePath) {
      await fetch("/api/files/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: filePath }),
      });
    }
  };

  const deleteOutput = async (projectId: string, outputId: string) => {
    if (!confirm("Bu çıktıyı silmek istiyor musunuz?")) return;
    await fetch(`/api/projects/${projectId}/outputs?outputId=${outputId}`, { method: "DELETE" });
    loadInvoices();
  };

  const downloadPDF = (invoiceId: string, _invoiceNo: string | null) => {
    // Fatura HTML sayfasını yeni sekmede aç → Ctrl+P ile PDF kaydet
    window.open(`/api/invoices/${invoiceId}/pdf`, "_blank");
  };

  const totalInvoiced = invoices.reduce((s, i) => s + i.totalAmount, 0);
  const totalPaid = invoices
    .filter((i) => i.status === "paid")
    .reduce((s, i) => s + i.totalAmount, 0);

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Faturalar</h1>
          <p className="text-sm text-gray-500 mt-1">
            {invoices.length} fatura — Toplam:{" "}
            <span className="font-medium text-gray-700">
              {formatCurrency(totalInvoiced)}
            </span>{" "}
            | Ödenen:{" "}
            <span className="font-medium text-green-600">
              {formatCurrency(totalPaid)}
            </span>
          </p>
        </div>
        <button onClick={openCreateModal} className="btn-primary">
          + Fatura Oluştur
        </button>
      </div>

      {/* Dönem Filtresi */}
      <div className="card p-4 mb-6 flex items-center gap-4">
        <div>
          <label className="label">Yıl</label>
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="input w-28"
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Ay</label>
          <select
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value))}
            className="input w-36"
          >
            {MONTHS_TR.map((m, i) => (
              <option key={i + 1} value={i + 1}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Fatura Listesi */}
      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-2">🧾</p>
            <p>Bu dönem için fatura yok</p>
            <button onClick={openCreateModal} className="btn-primary mt-4">
              Fatura oluştur
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                <th className="text-left px-4 py-3">Fatura No</th>
                <th className="text-left px-4 py-3">Müşteri</th>
                <th className="text-left px-4 py-3">Dönem</th>
                <th className="text-left px-4 py-3">Durum</th>
                <th className="text-left px-4 py-3">Proje Sayısı</th>
                <th className="text-right px-4 py-3">Tutar</th>
                <th className="text-right px-4 py-3">Tarih</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-medium text-gray-900">
                    {inv.invoiceNo || "-"}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{inv.customer.company}</p>
                    <p className="text-xs text-gray-500">{inv.customer.name}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {getMonthName(inv.month)} {inv.year}
                  </td>
                  <td className="px-4 py-3">
                    <InvoiceStatusBadge status={inv.status} />
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {inv.items.length} proje
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">
                    {formatCurrency(inv.totalAmount)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500 text-xs">
                    {inv.issuedAt ? formatDate(inv.issuedAt) : formatDate(inv.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={async () => {
                        setSelectedInvoice(inv);
                        setDetailModal(true);
                        // Her proje için handle yükle
                        const map = new Map<string, FileSystemDirectoryHandle>();
                        await Promise.all(
                          inv.items.map(async (item) => {
                            try {
                              const h = await getDirHandle(`project-${item.project.id}`);
                              if (h) map.set(item.project.id, h);
                            } catch { /* ignore */ }
                          })
                        );
                        setProjectHandles(map);
                      }}
                      className="btn-secondary btn-sm"
                    >
                      Detay
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Fatura Oluşturma Modal */}
      <Modal
        open={createModal}
        onClose={() => setCreateModal(false)}
        title={`Fatura Oluştur — ${getMonthName(month)} ${year}`}
        size="xl"
      >
        <div className="space-y-4">
          <div>
            <label className="label">Müşteri</label>
            <select
              value={selectedCustomer}
              onChange={(e) => {
                setSelectedCustomer(e.target.value);
                setSelectedProjects([]);
              }}
              className="input"
            >
              <option value="">Müşteri seçin...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company} — {c.name}
                </option>
              ))}
            </select>
          </div>

          {selectedCustomer && (
            <div>
              <label className="label">
                Tamamlanan Projeler{" "}
                <span className="text-gray-400 font-normal">
                  ({filteredProjects.length} proje)
                </span>
              </label>
              {filteredProjects.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">
                  Bu müşteriye ait tamamlanmış proje yok
                </p>
              ) : (
                <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-64 overflow-y-auto">
                  {filteredProjects.map((p) => {
                    const amount = p.outputs.reduce(
                      (s, o) => s + (o.totalPrice ?? 0),
                      0
                    );
                    return (
                      <div key={p.id} className="hover:bg-gray-50">
                        <label className="flex items-center gap-3 px-4 py-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedProjects.includes(p.id)}
                            onChange={() => toggleProject(p.id)}
                            className="rounded"
                          />
                          <div className="flex-1">
                            <span className="font-mono text-sm font-medium">
                              {p.projectNo}
                            </span>
                          </div>
                          <span className="font-medium text-gray-900">
                            {formatCurrency(amount)}
                          </span>
                        </label>
                        {/* Çıktı dosyaları */}
                        {p.outputs.length > 0 && (
                          <div className="px-10 pb-2 space-y-1">
                            {p.outputs.map((o) => (
                              <div key={o.id} className="flex items-center gap-2 text-xs text-gray-600">
                                <span className="text-gray-400">{OUTPUT_TYPE_MAP[o.outputType] ?? o.outputType}:</span>
                                <span className="flex-1 truncate">{o.fileName || "-"}</span>
                                {o.filePath && o.fileName && (
                                  <button
                                    onClick={() => openFile(o.fileName!, o.filePath)}
                                    className="text-green-700 bg-green-50 hover:bg-green-100 px-2 py-0.5 rounded font-medium"
                                  >
                                    Aç
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {selectedProjects.length > 0 && (
                <div className="mt-3 flex justify-between items-center bg-blue-50 rounded-lg px-4 py-3">
                  <span className="text-sm text-blue-700">
                    {selectedProjects.length} proje seçildi
                  </span>
                  <span className="font-bold text-blue-800">
                    {formatCurrency(selectedTotal)}
                  </span>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="label">Notlar</label>
            <textarea
              className="input h-16 resize-none"
              value={invoiceNotes}
              onChange={(e) => setInvoiceNotes(e.target.value)}
              placeholder="Fatura notları..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setCreateModal(false)}
              className="btn-secondary"
            >
              İptal
            </button>
            <button
              onClick={createInvoice}
              disabled={creating || selectedProjects.length === 0}
              className="btn-primary"
            >
              {creating ? "Oluşturuluyor..." : "Fatura Oluştur"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Fatura Detay Modal */}
      {selectedInvoice && (
        <Modal
          open={detailModal}
          onClose={() => setDetailModal(false)}
          title={selectedInvoice.invoiceNo || "Fatura Detayı"}
          size="xl"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Müşteri</p>
                <p className="font-medium">{selectedInvoice.customer.company}</p>
                <p className="text-gray-600">{selectedInvoice.customer.name}</p>
              </div>
              <div>
                <p className="text-gray-500">Dönem</p>
                <p className="font-medium">
                  {getMonthName(selectedInvoice.month)} {selectedInvoice.year}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Durum</p>
                <InvoiceStatusBadge status={selectedInvoice.status} />
              </div>
              <div>
                <p className="text-gray-500">Oluşturulma</p>
                <p className="font-medium">{formatDate(selectedInvoice.createdAt)}</p>
              </div>
              {selectedInvoice.issuedAt && (
                <div>
                  <p className="text-gray-500">Gönderilme</p>
                  <p className="font-medium">{formatDate(selectedInvoice.issuedAt)}</p>
                </div>
              )}
              {selectedInvoice.paidAt && (
                <div>
                  <p className="text-gray-500">Ödeme</p>
                  <p className="font-medium">{formatDate(selectedInvoice.paidAt)}</p>
                </div>
              )}
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2">Kalemler</h3>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                {selectedInvoice.items.map((item, idx) => (
                  <div key={item.id} className={idx > 0 ? "border-t border-gray-100" : ""}>
                    <div className="flex items-center justify-between px-3 py-2 bg-gray-50">
                      <span className="font-mono text-sm font-medium">{item.project.projectNo}</span>
                      <span className="font-medium text-gray-900">{formatCurrency(item.amount)}</span>
                    </div>
                    {item.project.outputs.length > 0 && (
                      <div className="px-3 py-2 space-y-1.5">
                        {item.project.outputs.map((o) => (
                          <div key={o.id} className="flex items-center gap-2 text-xs">
                            <span className="text-gray-400 w-20 shrink-0">{OUTPUT_TYPE_MAP[o.outputType] ?? o.outputType}</span>
                            <span className="flex-1 text-gray-700 truncate">{o.fileName || "-"}</span>
                            <div className="flex items-center gap-1 shrink-0">
                              {o.fileName && (
                                <button
                                  onClick={() => openFile(o.fileName!, o.filePath, item.project.id)}
                                  disabled={!o.filePath && !projectHandles.has(item.project.id)}
                                  className="text-green-700 bg-green-50 hover:bg-green-100 px-2 py-0.5 rounded font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                                  title={!o.filePath && !projectHandles.has(item.project.id) ? "Dosya yolu bulunamadı" : "Dosyayı aç"}
                                >
                                  Aç
                                </button>
                              )}
                              <button
                                onClick={() => deleteOutput(item.project.id, o.id)}
                                className="text-red-400 hover:text-red-600 px-2 py-0.5 rounded"
                              >
                                Sil
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                <div className="border-t border-gray-200 bg-gray-50 flex justify-between px-3 py-2">
                  <span className="font-bold">Toplam</span>
                  <span className="font-bold text-blue-600 text-base">
                    {formatCurrency(selectedInvoice.totalAmount)}
                  </span>
                </div>
              </div>
            </div>

            {/* PDF Download */}
            <div className="flex items-center gap-3 pb-4">
              <button
                onClick={() => downloadPDF(selectedInvoice.id, selectedInvoice.invoiceNo)}
                className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
              >
                📄 PDF İndir
              </button>
            </div>

            {/* Durum Güncelleme */}
            <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
              <span className="text-sm text-gray-600">Durumu güncelle:</span>
              {selectedInvoice.status === "draft" && (
                <button
                  onClick={() => updateStatus(selectedInvoice.id, "sent")}
                  disabled={updatingStatus}
                  className="btn-primary btn-sm"
                >
                  Gönderildi olarak işaretle
                </button>
              )}
              {selectedInvoice.status === "sent" && (
                <button
                  onClick={() => updateStatus(selectedInvoice.id, "paid")}
                  disabled={updatingStatus}
                  className="btn-primary btn-sm"
                >
                  Ödendi olarak işaretle
                </button>
              )}
              {selectedInvoice.status === "paid" && (
                <span className="text-sm text-green-600 font-medium">
                  ✓ Ödendi
                </span>
              )}
            </div>
          </div>
        </Modal>
      )}
    </AppLayout>
  );
}
