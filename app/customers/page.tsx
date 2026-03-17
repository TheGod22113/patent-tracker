"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import Modal from "@/components/ui/Modal";
import { formatDate, formatCurrency } from "@/lib/utils";
import { LANGUAGES, LANGUAGE_MAP } from "@/lib/constants";
import Link from "next/link";

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

const emptyForm = {
  name: "",
  company: "",
  email: "",
  phone: "",
  address: "",
  notes: "",
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Fiyatlandırma modal
  const [pricingModal, setPricingModal] = useState(false);
  const [pricingCustomer, setPricingCustomer] = useState<Customer | null>(null);
  const [pricingForm, setPricingForm] = useState({
    sourceLanguage: "en",
    targetLanguage: "tr",
    pricePerThousandChars: "",
    pricePerFigurePage: "",
  });
  const [savingPricing, setSavingPricing] = useState(false);

  const load = (q = search) => {
    setLoading(true);
    fetch(`/api/customers?search=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d) ? d : [];
        setCustomers(list);
        setLoading(false);
        // Refresh pricing customer if open
        if (pricingCustomer) {
          const updated = list.find((c: Customer) => c.id === pricingCustomer.id);
          if (updated) setPricingCustomer(updated);
        }
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const openNew = () => {
    setEditCustomer(null);
    setForm(emptyForm);
    setModal(true);
  };

  const openEdit = (c: Customer) => {
    setEditCustomer(c);
    setForm({
      name: c.name,
      company: c.company,
      email: c.email ?? "",
      phone: c.phone ?? "",
      address: c.address ?? "",
      notes: c.notes ?? "",
    });
    setModal(true);
  };

  const save = async () => {
    if (!form.name || !form.company) return alert("Ad ve Firma zorunludur.");
    setSaving(true);
    const url = editCustomer
      ? `/api/customers/${editCustomer.id}`
      : "/api/customers";
    const method = editCustomer ? "PUT" : "POST";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setModal(false);
    load();
  };

  const del = async (id: string, company: string) => {
    if (!confirm(`"${company}" müşterisini silmek istiyor musunuz?`)) return;
    await fetch(`/api/customers/${id}`, { method: "DELETE" });
    load();
  };

  const openPricing = (c: Customer) => {
    setPricingCustomer(c);
    setPricingForm({
      sourceLanguage: "en",
      targetLanguage: "tr",
      pricePerThousandChars: "",
      pricePerFigurePage: "",
    });
    setPricingModal(true);
  };

  const savePricing = async () => {
    if (!pricingCustomer) return;
    if (!pricingForm.pricePerThousandChars || !pricingForm.pricePerFigurePage)
      return alert("Fiyatlar zorunludur.");
    setSavingPricing(true);
    await fetch(`/api/customers/${pricingCustomer.id}/pricing`, {
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
    setPricingForm({
      sourceLanguage: "en",
      targetLanguage: "tr",
      pricePerThousandChars: "",
      pricePerFigurePage: "",
    });
    load();
  };

  const deletePricing = async (customerId: string, pricingId: string) => {
    if (!confirm("Bu fiyatı silmek istiyor musunuz?")) return;
    await fetch(
      `/api/customers/${customerId}/pricing?pricingId=${pricingId}`,
      { method: "DELETE" }
    );
    load();
  };

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Müşteriler</h1>
          <p className="text-sm text-gray-500 mt-1">
            {customers.length} kayıt
          </p>
        </div>
        <button onClick={openNew} className="btn-primary">
          + Yeni Müşteri
        </button>
      </div>

      <div className="card mb-6">
        <div className="p-4 border-b border-gray-100">
          <input
            type="text"
            placeholder="Müşteri veya firma ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input max-w-sm"
          />
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-2">👤</p>
            <p>Müşteri bulunamadı</p>
            <button onClick={openNew} className="btn-primary mt-4">
              İlk müşteriyi ekle
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                <th className="text-left px-4 py-3">Ad / Firma</th>
                <th className="text-left px-4 py-3">İletişim</th>
                <th className="text-left px-4 py-3">Fiyatlar</th>
                <th className="text-left px-4 py-3">Projeler</th>
                <th className="text-left px-4 py-3">Kayıt</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/customers/${c.id}`} className="group">
                      <p className="font-medium text-gray-900 group-hover:text-blue-600">
                        {c.name}
                      </p>
                      <p className="text-sm text-gray-500">{c.company}</p>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {c.email && <p>{c.email}</p>}
                    {c.phone && <p>{c.phone}</p>}
                  </td>
                  <td className="px-4 py-3">
                    {c.pricing.length > 0 ? (
                      <button
                        onClick={() => openPricing(c)}
                        className="badge bg-green-100 text-green-700 hover:bg-green-200 cursor-pointer"
                      >
                        {c.pricing.length} dil çifti
                      </button>
                    ) : (
                      <button
                        onClick={() => openPricing(c)}
                        className="badge bg-amber-100 text-amber-700 hover:bg-amber-200 cursor-pointer"
                      >
                        Fiyat ekle
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/projects?customerId=${c.id}`}
                      className="badge bg-blue-100 text-blue-700 hover:bg-blue-200"
                    >
                      {c._count.projects} proje
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatDate(c.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => openEdit(c)}
                        className="btn-secondary btn-sm"
                      >
                        Düzenle
                      </button>
                      <button
                        onClick={() => del(c.id, c.company)}
                        className="btn-danger btn-sm"
                      >
                        Sil
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Müşteri Ekle/Düzenle Modal */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editCustomer ? "Müşteri Düzenle" : "Yeni Müşteri"}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Ad Soyad *</label>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ahmet Yılmaz"
              />
            </div>
            <div>
              <label className="label">Firma *</label>
              <input
                className="input"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                placeholder="ABC Patent Ltd."
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">E-posta</label>
              <input
                type="email"
                className="input"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="ornek@firma.com"
              />
            </div>
            <div>
              <label className="label">Telefon</label>
              <input
                className="input"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+90 212 000 0000"
              />
            </div>
          </div>
          <div>
            <label className="label">Adres</label>
            <input
              className="input"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Notlar</label>
            <textarea
              className="input h-20 resize-none"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setModal(false)} className="btn-secondary">
              İptal
            </button>
            <button onClick={save} disabled={saving} className="btn-primary">
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Fiyatlandırma Modal */}
      {pricingCustomer && (
        <Modal
          open={pricingModal}
          onClose={() => setPricingModal(false)}
          title={`Fiyatlandırma — ${pricingCustomer.company}`}
          size="xl"
        >
          <div className="space-y-5">
            {/* Mevcut Fiyatlar */}
            {pricingCustomer.pricing.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Tanımlı Fiyatlar
                </h3>
                <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-3 py-2">Kaynak</th>
                      <th className="text-left px-3 py-2">Hedef</th>
                      <th className="text-right px-3 py-2">Tercüme (1000 kar.)</th>
                      <th className="text-right px-3 py-2">Şekil (sayfa)</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pricingCustomer.pricing.map((p) => (
                      <tr key={p.id}>
                        <td className="px-3 py-2">
                          {LANGUAGE_MAP[p.sourceLanguage]}
                        </td>
                        <td className="px-3 py-2">
                          {LANGUAGE_MAP[p.targetLanguage]}
                        </td>
                        <td className="px-3 py-2 text-right font-medium">
                          {formatCurrency(p.pricePerThousandChars)}
                        </td>
                        <td className="px-3 py-2 text-right font-medium">
                          {formatCurrency(p.pricePerFigurePage)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            onClick={() =>
                              deletePricing(pricingCustomer.id, p.id)
                            }
                            className="text-red-400 hover:text-red-600 text-xs"
                          >
                            Sil
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Yeni Fiyat Ekle */}
            <div className="border-t border-gray-100 pt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                Fiyat Ekle / Güncelle
              </h3>
              <div className="grid grid-cols-2 gap-3">
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
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </div>
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
                    placeholder="30.00"
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
                    placeholder="50.00"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Aynı dil çifti zaten varsa fiyat güncellenir. Müşteri fiyatı
                yoksa genel fiyat listesi kullanılır.
              </p>
              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => setPricingModal(false)}
                  className="btn-secondary"
                >
                  Kapat
                </button>
                <button
                  onClick={savePricing}
                  disabled={savingPricing}
                  className="btn-primary"
                >
                  {savingPricing ? "Kaydediliyor..." : "Fiyat Ekle"}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </AppLayout>
  );
}
