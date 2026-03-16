"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import Modal from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/Badge";
import {
  formatDate,
  formatCurrency,
} from "@/lib/utils";
import {
  LANGUAGES,
  LANGUAGE_MAP,
  STATUS_MAP,
  MONTHS_TR,
} from "@/lib/constants";

interface CustomerPricing {
  id: string;
  sourceLanguage: string;
  targetLanguage: string;
  pricePerThousandChars: number;
  pricePerFigurePage: number;
}

interface Customer {
  id: string;
  name: string;
  company: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  createdAt: string;
  _count: { projects: number };
  pricing: CustomerPricing[];
}

interface ProjectOutput {
  totalPrice: number | null;
}

interface Project {
  id: string;
  projectNo: string;
  year: number;
  month: number;
  sourceLanguage: string;
  targetLanguage: string;
  status: string;
  deliveryDate: string | null;
  createdAt: string;
  outputs: ProjectOutput[];
  invoiceItem: { amount: number } | null;
}

const STATUS_VALUES = [
  { value: "", label: "Tüm Durumlar" },
  { value: "new", label: "Yeni" },
  { value: "word_conversion", label: "Word Dönüşümü" },
  { value: "translation", label: "Tercüme" },
  { value: "review", label: "İnceleme" },
  { value: "completed", label: "Tamamlandı" },
  { value: "invoiced", label: "Faturalandı" },
];

const currentYear = new Date().getFullYear();
const YEARS = [currentYear - 1, currentYear, currentYear + 1];

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingCustomer, setLoadingCustomer] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(true);

  // Filtreler
  const [filterYear, setFilterYear] = useState<string>("");
  const [filterMonth, setFilterMonth] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");

  // Fiyat modal
  const [pricingModal, setPricingModal] = useState(false);
  const [editPricing, setEditPricing] = useState<CustomerPricing | null>(null);
  const [pricingForm, setPricingForm] = useState({
    sourceLanguage: "en",
    targetLanguage: "tr",
    pricePerThousandChars: "",
    pricePerFigurePage: "",
  });
  const [savingPricing, setSavingPricing] = useState(false);

  const loadCustomer = () => {
    setLoadingCustomer(true);
    fetch(`/api/customers/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setCustomer(d);
        setLoadingCustomer(false);
      });
  };

  const loadProjects = () => {
    setLoadingProjects(true);
    const params = new URLSearchParams({ customerId: id });
    if (filterYear) params.set("year", filterYear);
    if (filterMonth) params.set("month", filterMonth);
    if (filterStatus) params.set("status", filterStatus);
    fetch(`/api/projects?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setProjects(Array.isArray(d) ? d : []);
        setLoadingProjects(false);
      });
  };

  useEffect(() => {
    loadCustomer();
  }, [id]);

  useEffect(() => {
    loadProjects();
  }, [id, filterYear, filterMonth, filterStatus]);

  const openAddPricing = () => {
    setEditPricing(null);
    setPricingForm({
      sourceLanguage: "en",
      targetLanguage: "tr",
      pricePerThousandChars: "",
      pricePerFigurePage: "",
    });
    setPricingModal(true);
  };

  const openEditPricing = (p: CustomerPricing) => {
    setEditPricing(p);
    setPricingForm({
      sourceLanguage: p.sourceLanguage,
      targetLanguage: p.targetLanguage,
      pricePerThousandChars: String(p.pricePerThousandChars),
      pricePerFigurePage: String(p.pricePerFigurePage),
    });
    setPricingModal(true);
  };

  const savePricing = async () => {
    if (!pricingForm.pricePerThousandChars || !pricingForm.pricePerFigurePage)
      return alert("Fiyatlar zorunludur.");
    setSavingPricing(true);
    await fetch(`/api/customers/${id}/pricing`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceLanguage: pricingForm.sourceLanguage,
        targetLanguage: pricingForm.targetLanguage,
        pricePerThousandChars: parseFloat(pricingForm.pricePerThousandChars),
        pricePerFigurePage: parseFloat(pricingForm.pricePerFigurePage),
      }),
    });
    setSavingPricing(false);
    setPricingModal(false);
    loadCustomer();
  };

  const deletePricing = async (pricingId: string) => {
    if (!confirm("Bu fiyatı silmek istiyor musunuz?")) return;
    await fetch(`/api/customers/${id}/pricing?pricingId=${pricingId}`, {
      method: "DELETE",
    });
    loadCustomer();
  };

  const totalOutputPrice = (p: Project) =>
    p.outputs.reduce((s, o) => s + (o.totalPrice ?? 0), 0);

  if (loadingCustomer) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-60">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!customer) {
    return (
      <AppLayout>
        <p className="text-gray-500 text-center py-20">Müşteri bulunamadı.</p>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/customers" className="hover:text-blue-600">
          Müşteriler
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{customer.company}</span>
      </div>

      {/* Müşteri Başlık */}
      <div className="card p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {customer.name}
            </h1>
            <p className="text-lg text-gray-500">{customer.company}</p>
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-600">
              {customer.email && (
                <span>📧 {customer.email}</span>
              )}
              {customer.phone && (
                <span>📞 {customer.phone}</span>
              )}
              {customer.address && (
                <span>📍 {customer.address}</span>
              )}
            </div>
            {customer.notes && (
              <p className="mt-2 text-sm text-gray-500 italic">
                {customer.notes}
              </p>
            )}
          </div>
          <div className="text-right text-sm text-gray-500">
            <p>Kayıt: {formatDate(customer.createdAt)}</p>
            <p className="mt-1">
              <span className="font-medium text-gray-900">
                {customer._count.projects}
              </span>{" "}
              proje
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Fiyatlandırma */}
        <div className="xl:col-span-1">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">
                Uygulanan Fiyatlar
              </h2>
              <button
                onClick={openAddPricing}
                className="btn-primary btn-sm"
              >
                + Ekle
              </button>
            </div>

            {customer.pricing.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400 text-sm mb-3">
                  Henüz fiyat tanımlanmamış.
                </p>
                <p className="text-xs text-gray-400">
                  Fiyat yoksa genel fiyat listesi kullanılır.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {customer.pricing.map((p) => (
                  <div
                    key={p.id}
                    className="border border-gray-100 rounded-lg p-3 bg-gray-50"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        {LANGUAGE_MAP[p.sourceLanguage]} →{" "}
                        {LANGUAGE_MAP[p.targetLanguage]}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditPricing(p)}
                          className="text-blue-500 hover:text-blue-700 text-xs"
                        >
                          Düzenle
                        </button>
                        <button
                          onClick={() => deletePricing(p.id)}
                          className="text-red-400 hover:text-red-600 text-xs"
                        >
                          Sil
                        </button>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 space-y-0.5">
                      <p>
                        Tercüme:{" "}
                        <span className="font-medium text-gray-700">
                          {formatCurrency(p.pricePerThousandChars)} / 1000 kar.
                        </span>
                      </p>
                      <p>
                        Şekil:{" "}
                        <span className="font-medium text-gray-700">
                          {formatCurrency(p.pricePerFigurePage)} / sayfa
                        </span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Projeler */}
        <div className="xl:col-span-2">
          <div className="card">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-900">Projeler</h2>
                <Link
                  href={`/projects/new?customerId=${id}`}
                  className="btn-primary btn-sm"
                >
                  + Yeni Proje
                </Link>
              </div>
              {/* Filtreler */}
              <div className="flex flex-wrap gap-2">
                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                  className="input w-28"
                >
                  <option value="">Tüm Yıllar</option>
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <select
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="input w-32"
                >
                  <option value="">Tüm Aylar</option>
                  {MONTHS_TR.map((m, i) => (
                    <option key={i + 1} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="input w-40"
                >
                  {STATUS_VALUES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
                {(filterYear || filterMonth || filterStatus) && (
                  <button
                    onClick={() => {
                      setFilterYear("");
                      setFilterMonth("");
                      setFilterStatus("");
                    }}
                    className="btn-secondary btn-sm"
                  >
                    Temizle
                  </button>
                )}
              </div>
            </div>

            {loadingProjects ? (
              <div className="flex items-center justify-center h-40">
                <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">
                <p>Proje bulunamadı</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase border-b border-gray-100">
                    <th className="text-left px-4 py-3">Proje No</th>
                    <th className="text-left px-4 py-3">Dil Çifti</th>
                    <th className="text-left px-4 py-3">Durum</th>
                    <th className="text-left px-4 py-3">Ay / Yıl</th>
                    <th className="text-left px-4 py-3">Teslim</th>
                    <th className="text-right px-4 py-3">Toplam</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {projects.map((p) => (
                    <tr
                      key={p.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => router.push(`/projects/${p.id}`)}
                    >
                      <td className="px-4 py-3 font-mono text-xs font-medium text-blue-700">
                        {p.projectNo}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {LANGUAGE_MAP[p.sourceLanguage]} →{" "}
                        {LANGUAGE_MAP[p.targetLanguage]}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {MONTHS_TR[p.month - 1]} {p.year}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {p.deliveryDate ? formatDate(p.deliveryDate) : "-"}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {totalOutputPrice(p) > 0
                          ? formatCurrency(totalOutputPrice(p))
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Fiyat Modal */}
      <Modal
        open={pricingModal}
        onClose={() => setPricingModal(false)}
        title={editPricing ? "Fiyat Düzenle" : "Fiyat Ekle"}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Kaynak Dil</label>
              <select
                value={pricingForm.sourceLanguage}
                onChange={(e) =>
                  setPricingForm({
                    ...pricingForm,
                    sourceLanguage: e.target.value,
                  })
                }
                className="input"
                disabled={!!editPricing}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Hedef Dil</label>
              <select
                value={pricingForm.targetLanguage}
                onChange={(e) =>
                  setPricingForm({
                    ...pricingForm,
                    targetLanguage: e.target.value,
                  })
                }
                className="input"
                disabled={!!editPricing}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Tercüme (TL / 1000 karakter)</label>
              <input
                type="number"
                step="0.01"
                className="input"
                value={pricingForm.pricePerThousandChars}
                onChange={(e) =>
                  setPricingForm({
                    ...pricingForm,
                    pricePerThousandChars: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <label className="label">Şekil (TL / sayfa)</label>
              <input
                type="number"
                step="0.01"
                className="input"
                value={pricingForm.pricePerFigurePage}
                onChange={(e) =>
                  setPricingForm({
                    ...pricingForm,
                    pricePerFigurePage: e.target.value,
                  })
                }
              />
            </div>
          </div>
          <p className="text-xs text-gray-400">
            Müşteriye özel fiyat tanımlanmazsa genel fiyat listesi kullanılır.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setPricingModal(false)}
              className="btn-secondary"
            >
              İptal
            </button>
            <button
              onClick={savePricing}
              disabled={savingPricing}
              className="btn-primary"
            >
              {savingPricing ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
