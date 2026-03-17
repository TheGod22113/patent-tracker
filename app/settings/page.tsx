"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import Modal from "@/components/ui/Modal";
import { LANGUAGE_MAP, LANGUAGES } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useAuth } from "@/components/AuthProvider";

interface Staff {
  id: string;
  name: string;
  role: string;
  email: string | null;
  phone: string | null;
  active: boolean;
}

interface Pricing {
  id: string;
  year: number;
  sourceLanguage: string;
  targetLanguage: string;
  pricePerThousandChars: number;
  pricePerFigurePage: number;
}

interface ProjectTemplate {
  id: string;
  name: string;
  sourceLanguage: string;
  targetLanguage: string;
  pricePerThousandChars: number;
  pricePerFigurePage: number;
}

interface Tag {
  id: string;
  name: string;
  color: string;
  _count: { projects: number };
}

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  active: boolean;
  createdAt: string;
}

const ROLE_OPTIONS = [
  { value: "admin", label: "Yönetici" },
  { value: "coordinator", label: "Koordinatör" },
  { value: "translator", label: "Tercüman" },
  { value: "user", label: "Kullanıcı" },
];

const TAG_COLORS = [
  "#EF4444", "#F97316", "#EAB308", "#22C55E",
  "#06B6D4", "#3B82F6", "#8B5CF6", "#EC4899",
  "#7A4899", "#6B7280",
];

export default function SettingsPage() {
  const now = new Date();
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";

  const [staff, setStaff] = useState<Staff[]>([]);
  const [pricing, setPricing] = useState<Pricing[]>([]);
  const [pricingYear, setPricingYear] = useState(now.getFullYear());
  const [downloadingBackup, setDownloadingBackup] = useState(false);

  // Kullanıcı yönetimi
  const [users, setUsers] = useState<User[]>([]);
  const [userModal, setUserModal] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({ name: "", email: "", password: "", role: "user" });
  const [savingUser, setSavingUser] = useState(false);

  const [staffModal, setStaffModal] = useState(false);
  const [editStaff, setEditStaff] = useState<Staff | null>(null);
  const [staffForm, setStaffForm] = useState({
    name: "",
    role: "both",
    email: "",
    phone: "",
  });
  const [savingStaff, setSavingStaff] = useState(false);

  const [pricingModal, setPricingModal] = useState(false);
  const [editPricingRow, setEditPricingRow] = useState<Pricing | null>(null);
  const [pricingForm, setPricingForm] = useState({
    year: now.getFullYear(),
    sourceLanguage: "en",
    targetLanguage: "tr",
    pricePerThousandChars: "",
    pricePerFigurePage: "",
  });
  const [savingPricing, setSavingPricing] = useState(false);

  // Templates
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [templateModal, setTemplateModal] = useState(false);
  const [templateForm, setTemplateForm] = useState({
    name: "",
    sourceLanguage: "en",
    targetLanguage: "tr",
    pricePerThousandChars: "",
    pricePerFigurePage: "",
  });
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Tags
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagForm, setTagForm] = useState({ name: "", color: "#7A4899" });
  const [savingTag, setSavingTag] = useState(false);

  const loadStaff = () =>
    fetch("/api/staff")
      .then((r) => r.json())
      .then((d) => setStaff(Array.isArray(d) ? d : []))
      .catch(() => setStaff([]));

  const loadPricing = () =>
    fetch(`/api/pricing?year=${pricingYear}`)
      .then((r) => r.json())
      .then((d) => setPricing(Array.isArray(d) ? d : []))
      .catch(() => setPricing([]));

  const loadTemplates = () =>
    fetch("/api/templates")
      .then((r) => r.json())
      .then((d) => setTemplates(Array.isArray(d) ? d : []))
      .catch(() => setTemplates([]));

  const loadTags = () =>
    fetch("/api/tags").then((r) => r.json()).then((d) => setTags(Array.isArray(d) ? d : [])).catch(() => setTags([]));

  const loadUsers = () => {
    if (!isAdmin) return;
    fetch("/api/users").then((r) => r.json()).then((d) => setUsers(Array.isArray(d) ? d : [])).catch(() => setUsers([]));
  };

  const openNewUser = () => {
    setEditUser(null);
    setUserForm({ name: "", email: "", password: "", role: "user" });
    setUserModal(true);
  };

  const openEditUser = (u: User) => {
    setEditUser(u);
    setUserForm({ name: u.name, email: u.email, password: "", role: u.role });
    setUserModal(true);
  };

  const saveUser = async () => {
    if (!userForm.name || !userForm.email) return alert("Ad ve e-posta zorunludur.");
    if (!editUser && !userForm.password) return alert("Yeni kullanıcı için şifre zorunludur.");
    setSavingUser(true);
    const url = editUser ? `/api/users/${editUser.id}` : "/api/users";
    const method = editUser ? "PUT" : "POST";
    const body: Record<string, string> = {
      name: userForm.name,
      email: userForm.email,
      role: userForm.role,
    };
    if (userForm.password) body.password = userForm.password;
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "Hata oluştu");
    }
    setSavingUser(false);
    setUserModal(false);
    loadUsers();
  };

  const toggleUserActive = async (u: User) => {
    const action = u.active ? "pasif yapmak" : "aktif yapmak";
    if (!confirm(`"${u.name}" kullanıcısını ${action} istiyor musunuz?`)) return;
    await fetch(`/api/users/${u.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !u.active }),
    });
    loadUsers();
  };

  const deleteUser = async (u: User) => {
    if (!confirm(`"${u.name}" kullanıcısını silmek istiyor musunuz? Bu işlem geri alınamaz.`)) return;
    const res = await fetch(`/api/users/${u.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "Silinemedi");
      return;
    }
    loadUsers();
  };

  const saveTemplate = async () => {
    if (!templateForm.name) return alert("Şablon adı zorunludur.");
    setSavingTemplate(true);
    await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: templateForm.name,
        sourceLanguage: templateForm.sourceLanguage,
        targetLanguage: templateForm.targetLanguage,
        pricePerThousandChars: parseFloat(templateForm.pricePerThousandChars) || 0,
        pricePerFigurePage: parseFloat(templateForm.pricePerFigurePage) || 0,
      }),
    });
    setSavingTemplate(false);
    setTemplateModal(false);
    setTemplateForm({ name: "", sourceLanguage: "en", targetLanguage: "tr", pricePerThousandChars: "", pricePerFigurePage: "" });
    loadTemplates();
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm("Bu şablonu silmek istiyor musunuz?")) return;
    await fetch(`/api/templates?id=${id}`, { method: "DELETE" });
    loadTemplates();
  };

  const saveTag = async () => {
    if (!tagForm.name.trim()) return alert("Etiket adı zorunludur.");
    setSavingTag(true);
    await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: tagForm.name.trim(), color: tagForm.color }),
    });
    setSavingTag(false);
    setTagForm({ name: "", color: "#7A4899" });
    loadTags();
  };

  const deleteTag = async (id: string) => {
    if (!confirm("Bu etiketi silmek istiyor musunuz?")) return;
    await fetch(`/api/tags?id=${id}`, { method: "DELETE" });
    loadTags();
  };

  useEffect(() => {
    loadStaff();
    loadTemplates();
    loadTags();
    loadUsers();
  }, []);

  useEffect(() => {
    loadPricing();
  }, [pricingYear]);

  const openNewStaff = () => {
    setEditStaff(null);
    setStaffForm({ name: "", role: "both", email: "", phone: "" });
    setStaffModal(true);
  };

  const openEditStaff = (s: Staff) => {
    setEditStaff(s);
    setStaffForm({
      name: s.name,
      role: s.role,
      email: s.email ?? "",
      phone: s.phone ?? "",
    });
    setStaffModal(true);
  };

  const saveStaff = async () => {
    if (!staffForm.name) return alert("Ad zorunludur.");
    setSavingStaff(true);
    const url = editStaff ? `/api/staff/${editStaff.id}` : "/api/staff";
    const method = editStaff ? "PUT" : "POST";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(staffForm),
    });
    setSavingStaff(false);
    setStaffModal(false);
    loadStaff();
  };

  const deactivateStaff = async (id: string) => {
    if (!confirm("Bu personeli pasif yapmak istiyor musunuz?")) return;
    await fetch(`/api/staff/${id}`, { method: "DELETE" });
    loadStaff();
  };

  const savePricing = async () => {
    if (!pricingForm.pricePerThousandChars || !pricingForm.pricePerFigurePage)
      return alert("Fiyatlar zorunludur.");
    setSavingPricing(true);
    await fetch("/api/pricing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        year: pricingForm.year,
        sourceLanguage: pricingForm.sourceLanguage,
        targetLanguage: pricingForm.targetLanguage,
        pricePerThousandChars: parseFloat(pricingForm.pricePerThousandChars),
        pricePerFigurePage: parseFloat(pricingForm.pricePerFigurePage),
      }),
    });
    setSavingPricing(false);
    setPricingModal(false);
    loadPricing();
  };

  const deletePricing = async (id: string) => {
    if (!confirm("Bu fiyatı silmek istiyor musunuz?")) return;
    await fetch(`/api/pricing?id=${id}`, { method: "DELETE" });
    loadPricing();
  };

  const downloadBackup = async () => {
    setDownloadingBackup(true);
    try {
      const res = await fetch("/api/backup");
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const date = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `jagadamba-backup-${date}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      alert("Yedekleme sırasında bir hata oluştu.");
    } finally {
      setDownloadingBackup(false);
    }
  };

  const roleLabel = (role: string) =>
    role === "coordinator"
      ? "Koordinatör"
      : role === "translator"
      ? "Tercüman"
      : "Her ikisi";

  return (
    <AppLayout>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Ayarlar</h1>

      {/* Personel */}
      <div className="card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 text-lg">Personel</h2>
          <button onClick={openNewStaff} className="btn-primary btn-sm">
            + Personel Ekle
          </button>
        </div>
        {staff.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-6">
            Henüz personel yok
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase border-b border-gray-100">
                <th className="text-left py-2">Ad</th>
                <th className="text-left py-2">Rol</th>
                <th className="text-left py-2">E-posta</th>
                <th className="text-left py-2">Telefon</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {staff.map((s) => (
                <tr key={s.id}>
                  <td className="py-2 font-medium text-gray-900">{s.name}</td>
                  <td className="py-2">
                    <span className="badge bg-gray-100 text-gray-700">
                      {roleLabel(s.role)}
                    </span>
                  </td>
                  <td className="py-2 text-gray-600">{s.email ?? "-"}</td>
                  <td className="py-2 text-gray-600">{s.phone ?? "-"}</td>
                  <td className="py-2">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => openEditStaff(s)}
                        className="btn-secondary btn-sm"
                      >
                        Düzenle
                      </button>
                      <button
                        onClick={() => deactivateStaff(s.id)}
                        className="btn-danger btn-sm"
                      >
                        Pasif Yap
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Fiyatlandırma */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h2 className="font-semibold text-gray-900 text-lg">
              Fiyat Listesi
            </h2>
            <select
              value={pricingYear}
              onChange={(e) => setPricingYear(parseInt(e.target.value))}
              className="input w-24"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => {
              setEditPricingRow(null);
              setPricingForm({
                year: pricingYear,
                sourceLanguage: "en",
                targetLanguage: "tr",
                pricePerThousandChars: "",
                pricePerFigurePage: "",
              });
              setPricingModal(true);
            }}
            className="btn-primary btn-sm"
          >
            + Fiyat Ekle
          </button>
        </div>

        <p className="text-xs text-gray-500 mb-4">
          Tercüme fiyatı: hedef Word dosyasındaki her 1000 karakter başına TL.
          Şekil fiyatı: her sayfa başına TL.
        </p>

        {pricing.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-6">
            {pricingYear} yılı için fiyat tanımı yok
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase border-b border-gray-100">
                <th className="text-left py-2">Kaynak Dil</th>
                <th className="text-left py-2">Hedef Dil</th>
                <th className="text-right py-2">Tercüme (1000 kar.)</th>
                <th className="text-right py-2">Şekil (sayfa)</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pricing.map((p) => (
                <tr key={p.id}>
                  <td className="py-2 font-medium">
                    {LANGUAGE_MAP[p.sourceLanguage]}
                  </td>
                  <td className="py-2 font-medium">
                    {LANGUAGE_MAP[p.targetLanguage]}
                  </td>
                  <td className="py-2 text-right">
                    {formatCurrency(p.pricePerThousandChars)}
                  </td>
                  <td className="py-2 text-right">
                    {formatCurrency(p.pricePerFigurePage)}
                  </td>
                  <td className="py-2 text-right">
                    <div className="flex gap-3 justify-end">
                      <button
                        onClick={() => {
                          setEditPricingRow(p);
                          setPricingForm({
                            year: p.year,
                            sourceLanguage: p.sourceLanguage,
                            targetLanguage: p.targetLanguage,
                            pricePerThousandChars: String(p.pricePerThousandChars),
                            pricePerFigurePage: String(p.pricePerFigurePage),
                          });
                          setPricingModal(true);
                        }}
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Proje Şablonları */}
      <div className="card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-gray-900 text-lg">Proje Şablonları</h2>
            <p className="text-xs text-gray-400 mt-0.5">Yeni proje oluştururken hızlı seçim için şablonlar</p>
          </div>
          <button onClick={() => setTemplateModal(true)} className="btn-primary btn-sm">
            + Şablon Ekle
          </button>
        </div>
        {templates.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-6">Henüz şablon yok</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase border-b border-gray-100">
                <th className="text-left py-2">Şablon Adı</th>
                <th className="text-left py-2">Dil Çifti</th>
                <th className="text-right py-2">Tercüme (TL/1000 kr)</th>
                <th className="text-right py-2">Şekil (TL/sayfa)</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {templates.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="py-3 font-medium text-gray-900">{t.name}</td>
                  <td className="py-3 text-gray-600">
                    {LANGUAGE_MAP[t.sourceLanguage]} → {LANGUAGE_MAP[t.targetLanguage]}
                  </td>
                  <td className="py-3 text-right">{formatCurrency(t.pricePerThousandChars)}</td>
                  <td className="py-3 text-right">{formatCurrency(t.pricePerFigurePage)}</td>
                  <td className="py-3 text-right">
                    <button onClick={() => deleteTemplate(t.id)} className="text-red-400 hover:text-red-600 text-xs">
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Etiket Yönetimi */}
      <div className="card p-6 mb-6">
        <div className="mb-4">
          <h2 className="font-semibold text-gray-900 text-lg">🏷️ Etiket Yönetimi</h2>
          <p className="text-xs text-gray-400 mt-0.5">Projeleri etiketleyerek kategorize edin</p>
        </div>

        {/* Inline tag creation form */}
        <div className="flex flex-wrap items-end gap-3 mb-5 p-4 bg-gray-50 rounded-lg border border-gray-100">
          <div className="flex-1 min-w-[160px]">
            <label className="label">Etiket Adı</label>
            <input
              className="input"
              value={tagForm.name}
              onChange={(e) => setTagForm({ ...tagForm, name: e.target.value })}
              onKeyDown={(e) => { if (e.key === "Enter") saveTag(); }}
              placeholder="Örn: Acil, EP, PCT..."
            />
          </div>
          <div>
            <label className="label">Renk</label>
            <div className="flex gap-1.5 mt-1">
              {TAG_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setTagForm({ ...tagForm, color })}
                  title={color}
                  className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 focus:outline-none"
                  style={{
                    backgroundColor: color,
                    borderColor: tagForm.color === color ? "#1e293b" : "transparent",
                    transform: tagForm.color === color ? "scale(1.2)" : undefined,
                  }}
                />
              ))}
            </div>
          </div>
          <button
            onClick={saveTag}
            disabled={savingTag || !tagForm.name.trim()}
            className="btn-primary btn-sm"
          >
            {savingTag ? "Ekleniyor..." : "+ Ekle"}
          </button>
        </div>

        {/* Tag chips list */}
        {tags.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-6">Henüz etiket yok</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-sm font-medium border"
                style={{
                  backgroundColor: tag.color + "1A",
                  borderColor: tag.color + "4D",
                  color: tag.color,
                }}
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: tag.color }}
                />
                <span>{tag.name}</span>
                {tag._count.projects > 0 && (
                  <span
                    className="text-xs opacity-70 ml-0.5"
                    title={`${tag._count.projects} projede kullanılıyor`}
                  >
                    ({tag._count.projects})
                  </span>
                )}
                <button
                  onClick={() => deleteTag(tag.id)}
                  className="ml-0.5 w-4 h-4 rounded-full flex items-center justify-center hover:bg-black/10 transition-colors flex-shrink-0"
                  title="Etiketi sil"
                  style={{ color: tag.color }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Kullanıcı Yönetimi (Sadece Admin) */}
      {isAdmin && (
        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-gray-900 text-lg">Kullanıcı Yönetimi</h2>
              <p className="text-xs text-gray-400 mt-0.5">Sisteme giriş yapabilecek kullanıcıları yönetin</p>
            </div>
            <button onClick={openNewUser} className="btn-primary btn-sm">
              + Kullanıcı Ekle
            </button>
          </div>
          {users.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">Henüz kullanıcı yok</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase border-b border-gray-100">
                    <th className="text-left py-2">Ad</th>
                    <th className="text-left py-2">E-posta</th>
                    <th className="text-left py-2">Rol</th>
                    <th className="text-left py-2">Durum</th>
                    <th className="text-left py-2">Kayıt</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.map((u) => (
                    <tr key={u.id} className={!u.active ? "opacity-50" : ""}>
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-700">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-900">{u.name}</span>
                        </div>
                      </td>
                      <td className="py-2 text-gray-600">{u.email}</td>
                      <td className="py-2">
                        <span className={`badge ${u.role === "admin" ? "bg-purple-100 text-purple-700" : u.role === "coordinator" ? "bg-blue-100 text-blue-700" : u.role === "translator" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                          {ROLE_OPTIONS.find((r) => r.value === u.role)?.label || u.role}
                        </span>
                      </td>
                      <td className="py-2">
                        {u.active ? (
                          <span className="badge bg-emerald-100 text-emerald-700">Aktif</span>
                        ) : (
                          <span className="badge bg-red-100 text-red-700">Pasif</span>
                        )}
                      </td>
                      <td className="py-2 text-gray-500 text-xs">{formatDate(u.createdAt)}</td>
                      <td className="py-2">
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => openEditUser(u)} className="btn-secondary btn-sm">
                            Düzenle
                          </button>
                          <button onClick={() => toggleUserActive(u)} className="text-xs text-amber-600 hover:text-amber-800 px-2 py-1">
                            {u.active ? "Pasif Yap" : "Aktif Yap"}
                          </button>
                          {u.id !== currentUser?.id && (
                            <button onClick={() => deleteUser(u)} className="text-xs text-red-400 hover:text-red-600 px-2 py-1">
                              Sil
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Veri Yedekleme */}
      <div className="card p-6 mb-6">
        <div className="mb-4">
          <h2 className="font-semibold text-gray-900 text-lg">💾 Veri Yedekleme</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Tüm verilerinizi (projeler, müşteriler, faturalar) tek bir JSON dosyasına aktarın.
          </p>
        </div>
        <button
          onClick={downloadBackup}
          disabled={downloadingBackup}
          className="btn-primary"
        >
          {downloadingBackup ? "İndiriliyor..." : "JSON Olarak İndir"}
        </button>
      </div>

      {/* Template Modal */}
      <Modal open={templateModal} onClose={() => setTemplateModal(false)} title="Yeni Şablon">
        <div className="space-y-4">
          <div>
            <label className="label">Şablon Adı *</label>
            <input className="input" value={templateForm.name} onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })} placeholder="İngilizce-Türkçe Standart" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Kaynak Dil</label>
              <select value={templateForm.sourceLanguage} onChange={(e) => setTemplateForm({ ...templateForm, sourceLanguage: e.target.value })} className="input">
                {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Hedef Dil</label>
              <select value={templateForm.targetLanguage} onChange={(e) => setTemplateForm({ ...templateForm, targetLanguage: e.target.value })} className="input">
                {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Tercüme (TL / 1000 kr)</label>
              <input type="number" step="0.01" className="input" value={templateForm.pricePerThousandChars} onChange={(e) => setTemplateForm({ ...templateForm, pricePerThousandChars: e.target.value })} placeholder="30.00" />
            </div>
            <div>
              <label className="label">Şekil (TL / sayfa)</label>
              <input type="number" step="0.01" className="input" value={templateForm.pricePerFigurePage} onChange={(e) => setTemplateForm({ ...templateForm, pricePerFigurePage: e.target.value })} placeholder="50.00" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setTemplateModal(false)} className="btn-secondary">İptal</button>
            <button onClick={saveTemplate} disabled={savingTemplate} className="btn-primary">{savingTemplate ? "Kaydediliyor..." : "Kaydet"}</button>
          </div>
        </div>
      </Modal>

      {/* Staff Modal */}
      <Modal
        open={staffModal}
        onClose={() => setStaffModal(false)}
        title={editStaff ? "Personel Düzenle" : "Yeni Personel"}
      >
        <div className="space-y-4">
          <div>
            <label className="label">Ad Soyad *</label>
            <input
              className="input"
              value={staffForm.name}
              onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
              placeholder="Halil Köşger"
            />
          </div>
          <div>
            <label className="label">Rol</label>
            <select
              value={staffForm.role}
              onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
              className="input"
            >
              <option value="coordinator">Koordinatör (Word Dönüşümü)</option>
              <option value="translator">Tercüman</option>
              <option value="both">Her İkisi</option>
            </select>
          </div>
          <div>
            <label className="label">E-posta</label>
            <input
              type="email"
              className="input"
              value={staffForm.email}
              onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Telefon</label>
            <input
              className="input"
              value={staffForm.phone}
              onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setStaffModal(false)} className="btn-secondary">
              İptal
            </button>
            <button onClick={saveStaff} disabled={savingStaff} className="btn-primary">
              {savingStaff ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </div>
        </div>
      </Modal>

      {/* User Modal */}
      {isAdmin && (
        <Modal open={userModal} onClose={() => setUserModal(false)} title={editUser ? "Kullanıcı Düzenle" : "Yeni Kullanıcı"}>
          <div className="space-y-4">
            <div>
              <label className="label">Ad Soyad *</label>
              <input
                className="input"
                value={userForm.name}
                onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                placeholder="Ahmet Yılmaz"
              />
            </div>
            <div>
              <label className="label">E-posta *</label>
              <input
                type="email"
                className="input"
                value={userForm.email}
                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                placeholder="ahmet@jagadamba.com"
              />
            </div>
            <div>
              <label className="label">
                Şifre {editUser ? "(boş bırakılırsa değişmez)" : "*"}
              </label>
              <input
                type="password"
                className="input"
                value={userForm.password}
                onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                placeholder={editUser ? "Değiştirmek için yeni şifre girin" : "Şifre belirleyin"}
              />
            </div>
            <div>
              <label className="label">Rol</label>
              <select
                value={userForm.role}
                onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                className="input"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                Yönetici: tam erişim. Koordinatör/Tercüman/Kullanıcı: temel erişim.
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setUserModal(false)} className="btn-secondary">İptal</button>
              <button onClick={saveUser} disabled={savingUser} className="btn-primary">
                {savingUser ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Pricing Modal */}
      <Modal
        open={pricingModal}
        onClose={() => setPricingModal(false)}
        title={editPricingRow ? "Fiyat Düzenle" : "Fiyat Tanımı Ekle"}
      >
        <div className="space-y-4">
          <div>
            <label className="label">Yıl</label>
            <select
              value={pricingForm.year}
              onChange={(e) =>
                setPricingForm({ ...pricingForm, year: parseInt(e.target.value) })
              }
              className="input"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Kaynak Dil</label>
              <select
                value={pricingForm.sourceLanguage}
                onChange={(e) =>
                  setPricingForm({ ...pricingForm, sourceLanguage: e.target.value })
                }
                className="input"
                disabled={!!editPricingRow}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Hedef Dil</label>
              <select
                value={pricingForm.targetLanguage}
                onChange={(e) =>
                  setPricingForm({ ...pricingForm, targetLanguage: e.target.value })
                }
                className="input"
                disabled={!!editPricingRow}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>{l.label}</option>
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
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setPricingModal(false)} className="btn-secondary">
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
