"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import { StatusBadge } from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import {
  formatDate,
  formatCurrency,
  getMonthName,
  calculateTranslationPrice,
  calculateFiguresPrice,
} from "@/lib/utils";
import {
  LANGUAGE_MAP,
  OUTPUT_TYPE_MAP,
} from "@/lib/constants";
import { getDirHandle, openFileFromDir } from "@/lib/fileHandleStore";
import Link from "next/link";

interface ProjectOutput {
  id: string;
  outputType: string;
  fileName: string | null;
  driveLink: string | null;
  filePath: string | null;
  charCount: number | null;
  pageCount: number | null;
  unitPrice: number | null;
  totalPrice: number | null;
}

interface ProjectFile {
  id: string;
  fileName: string;
  driveLink: string | null;
  filePath: string | null;
  fileType: string;
}

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
  customer: { id: string; name: string; company: string; phone: string | null; email: string | null };
  coordinator: { id: string; name: string } | null;
  translator: { id: string; name: string } | null;
  sourceFiles: ProjectFile[];
  outputs: ProjectOutput[];
  invoiceItem: { invoice: { invoiceNo: string | null; status: string } } | null;
}

interface Staff {
  id: string;
  name: string;
  role: string;
}

interface Pricing {
  pricePerThousandChars: number;
  pricePerFigurePage: number;
}

interface ProjectNote {
  id: string;
  content: string;
  createdAt: string;
  createdBy: string | null;
}

interface StatusHistory {
  id: string;
  oldStatus: string;
  newStatus: string;
  changedAt: string;
  changedBy: string | null;
}

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface TimeEntry {
  id: string;
  description: string | null;
  minutes: number;
  staffName: string | null;
  date: string;
}

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  sortOrder: number;
}

const WORKFLOW = [
  { key: "new", label: "Yeni Kayıt" },
  { key: "word_conversion", label: "Word Dönüşümü" },
  { key: "translation", label: "Tercüme" },
  { key: "review", label: "İnceleme" },
  { key: "completed", label: "Tamamlandı" },
  { key: "invoiced", label: "Faturalandı" },
];

function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h > 0 && m > 0) return `${h}s ${m}d`;
  if (h > 0) return `${h}s`;
  return `${m}d`;
}

export default function ProjectDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [loading, setLoading] = useState(true);
  const [dirHandle, setDirHandle] = useState<FileSystemDirectoryHandle | null>(null);

  // Notes & History
  const [projectNotes, setProjectNotes] = useState<ProjectNote[]>([]);
  const [statusHistory, setStatusHistory] = useState<StatusHistory[]>([]);
  const [newNote, setNewNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // Output modal
  const [outputModal, setOutputModal] = useState(false);
  const [outputForm, setOutputForm] = useState({
    outputType: "translation",
    fileName: "",
    driveLink: "",
    charCount: "",
    pageCount: "",
  });
  const [savingOutput, setSavingOutput] = useState(false);
  const [analyzingFile, setAnalyzingFile] = useState(false);

  // Edit modal
  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    deliveryDate: "",
    coordinatorId: "",
    translatorId: "",
    notes: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Tags
  const [projectTags, setProjectTags] = useState<Tag[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const tagDropdownRef = useRef<HTMLDivElement>(null);

  // Checklist
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newCheckItem, setNewCheckItem] = useState("");
  const [savingCheck, setSavingCheck] = useState(false);

  // Time Tracking
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [timeForm, setTimeForm] = useState({
    description: "",
    hours: "",
    minutes: "",
    staffName: "",
    date: new Date().toISOString().substring(0, 10),
  });
  const [savingTime, setSavingTime] = useState(false);

  const load = () => {
    Promise.all([
      fetch(`/api/projects/${params.id}`).then((r) => r.json()),
      fetch("/api/staff").then((r) => r.json()),
    ]).then(([p, s]) => {
      if (p && !p.error) setProject(p);
      setStaff(Array.isArray(s) ? s : []);
      setLoading(false);
      if (p && !p.error) {
        fetch(`/api/pricing?year=${p.year}`)
          .then((r) => r.json())
          .then((prices: { sourceLanguage: string; targetLanguage: string; pricePerThousandChars: number; pricePerFigurePage: number }[]) => {
            if (!Array.isArray(prices)) return;
            const pr = prices.find(
              (x) =>
                x.sourceLanguage === p.sourceLanguage &&
                x.targetLanguage === p.targetLanguage
            );
            if (pr) setPricing(pr);
          })
          .catch(() => {});
      }
    }).catch(() => setLoading(false));
  };

  const loadNotes = () => {
    fetch(`/api/projects/${params.id}/notes`)
      .then((r) => r.json())
      .then((d) => setProjectNotes(Array.isArray(d) ? d : []))
      .catch(() => setProjectNotes([]));
    fetch(`/api/projects/${params.id}/history`)
      .then((r) => r.json())
      .then((d) => setStatusHistory(Array.isArray(d) ? d : []))
      .catch(() => setStatusHistory([]));
  };

  const loadTags = () => {
    fetch(`/api/projects/${params.id}/tags`)
      .then((r) => r.json())
      .then((d) => setProjectTags(Array.isArray(d) ? d : []))
      .catch(() => setProjectTags([]));
    fetch("/api/tags")
      .then((r) => r.json())
      .then((d) => setAllTags(Array.isArray(d) ? d : []))
      .catch(() => setAllTags([]));
  };

  const addTag = async (tagId: string) => {
    await fetch(`/api/projects/${params.id}/tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tagId }),
    });
    setShowTagDropdown(false);
    loadTags();
  };

  const removeTag = async (tagId: string) => {
    await fetch(`/api/projects/${params.id}/tags?tagId=${tagId}`, {
      method: "DELETE",
    });
    loadTags();
  };

  const loadChecklist = () => {
    fetch(`/api/projects/${params.id}/checklist`)
      .then((r) => r.json())
      .then((d) => setChecklist(Array.isArray(d) ? d : []))
      .catch(() => setChecklist([]));
  };

  const addCheckItem = async () => {
    if (!newCheckItem.trim()) return;
    setSavingCheck(true);
    await fetch(`/api/projects/${params.id}/checklist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: newCheckItem, sortOrder: checklist.length }),
    });
    setSavingCheck(false);
    setNewCheckItem("");
    loadChecklist();
  };

  const toggleCheckItem = async (id: string, completed: boolean) => {
    await fetch(`/api/projects/${params.id}/checklist`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, completed: !completed }),
    });
    loadChecklist();
  };

  const deleteCheckItem = async (id: string) => {
    await fetch(`/api/projects/${params.id}/checklist?itemId=${id}`, {
      method: "DELETE",
    });
    loadChecklist();
  };

  const loadTimeEntries = () => {
    fetch(`/api/projects/${params.id}/time`)
      .then((r) => r.json())
      .then((d) => setTimeEntries(Array.isArray(d) ? d : []))
      .catch(() => setTimeEntries([]));
  };

  const addTimeEntry = async () => {
    const h = parseInt(timeForm.hours) || 0;
    const m = parseInt(timeForm.minutes) || 0;
    const totalMinutes = h * 60 + m;
    if (totalMinutes <= 0) return;
    setSavingTime(true);
    await fetch(`/api/projects/${params.id}/time`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: timeForm.description || null,
        minutes: totalMinutes,
        staffName: timeForm.staffName || null,
        date: timeForm.date,
      }),
    });
    setSavingTime(false);
    setTimeForm({
      description: "",
      hours: "",
      minutes: "",
      staffName: "",
      date: new Date().toISOString().substring(0, 10),
    });
    loadTimeEntries();
  };

  const deleteTimeEntry = async (entryId: string) => {
    await fetch(`/api/projects/${params.id}/time?entryId=${entryId}`, {
      method: "DELETE",
    });
    loadTimeEntries();
  };

  const addNote = async () => {
    if (!newNote.trim()) return;
    setSavingNote(true);
    await fetch(`/api/projects/${params.id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newNote }),
    });
    setNewNote("");
    setSavingNote(false);
    loadNotes();
  };

  const deleteNote = async (noteId: string) => {
    await fetch(`/api/projects/${params.id}/notes?noteId=${noteId}`, { method: "DELETE" });
    loadNotes();
  };

  // Close tag dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(e.target as Node)) {
        setShowTagDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    load();
    loadNotes();
    loadTags();
    loadTimeEntries();
    loadChecklist();
    getDirHandle(`project-${params.id}`)
      .then((h) => setDirHandle(h))
      .catch(() => {});
  }, [params.id]);

  const changeStatus = async (newStatus: string) => {
    await fetch(`/api/projects/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    load();
  };

  const openEdit = () => {
    if (!project) return;
    setEditForm({
      deliveryDate: project.deliveryDate
        ? project.deliveryDate.substring(0, 10)
        : "",
      coordinatorId: project.coordinator?.id ?? "",
      translatorId: project.translator?.id ?? "",
      notes: project.notes ?? "",
    });
    setEditModal(true);
  };

  const saveEdit = async () => {
    setSavingEdit(true);
    await fetch(`/api/projects/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    setSavingEdit(false);
    setEditModal(false);
    load();
  };

  const addOutput = async () => {
    setSavingOutput(true);
    await fetch(`/api/projects/${params.id}/outputs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...outputForm,
        charCount: outputForm.charCount ? parseInt(outputForm.charCount) : null,
        pageCount: outputForm.pageCount ? parseInt(outputForm.pageCount) : null,
      }),
    });
    setSavingOutput(false);
    setOutputModal(false);
    setOutputForm({
      outputType: "translation",
      fileName: "",
      driveLink: "",
      charCount: "",
      pageCount: "",
    });
    load();
  };

  const openFile = async (fileName: string, filePath: string | null) => {
    if (dirHandle) {
      try {
        await openFileFromDir(dirHandle, fileName);
        return;
      } catch {
        // handle geçersiz, filePath'e dön
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

  const deleteOutput = async (outputId: string) => {
    if (!confirm("Bu tercümeyi silmek istiyor musunuz?")) return;
    await fetch(
      `/api/projects/${params.id}/outputs?outputId=${outputId}`,
      { method: "DELETE" }
    );
    load();
  };

  const deleteProject = async () => {
    if (!confirm("Bu projeyi silmek istiyor musunuz? Bu işlem geri alınamaz."))
      return;
    await fetch(`/api/projects/${params.id}`, { method: "DELETE" });
    router.push("/projects");
  };

  const coordinators = staff.filter((s) =>
    ["coordinator", "both"].includes(s.role)
  );
  const translators = staff.filter((s) =>
    ["translator", "both"].includes(s.role)
  );

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!project || (project as unknown as { error: string }).error) {
    return (
      <AppLayout>
        <p className="text-gray-500">Proje bulunamadı.</p>
      </AppLayout>
    );
  }

  const totalAmount = project.outputs.reduce(
    (sum, o) => sum + (o.totalPrice ?? 0),
    0
  );

  const currentStepIdx = WORKFLOW.findIndex((w) => w.key === project.status);

  // Estimated price preview for output modal
  let estimatedPrice = 0;
  if (pricing) {
    if (outputForm.outputType === "figures" && outputForm.pageCount) {
      estimatedPrice = calculateFiguresPrice(
        parseInt(outputForm.pageCount),
        pricing.pricePerFigurePage
      );
    } else if (outputForm.charCount) {
      estimatedPrice = calculateTranslationPrice(
        parseInt(outputForm.charCount),
        pricing.pricePerThousandChars
      );
    }
  }

  const totalTimeMinutes = timeEntries.reduce((sum, e) => sum + e.minutes, 0);
  const availableTags = allTags.filter(
    (t) => !projectTags.some((pt) => pt.id === t.id)
  );

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/projects" className="text-gray-400 hover:text-gray-600">
            ← Projeler
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 font-mono">
                {project.projectNo}
              </h1>
              <StatusBadge status={project.status} />
              {project.invoiceItem && (
                <span className="badge bg-indigo-100 text-indigo-700">
                  {project.invoiceItem.invoice.invoiceNo || "Fatura"}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500">
              {getMonthName(project.month)} {project.year} •{" "}
              {LANGUAGE_MAP[project.sourceLanguage]} →{" "}
              {LANGUAGE_MAP[project.targetLanguage]}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={openEdit} className="btn-secondary">
            Düzenle
          </button>
          <button onClick={deleteProject} className="btn-danger btn-sm">
            Sil
          </button>
        </div>
      </div>

      {/* İş Akışı */}
      <div className="card p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">İş Akışı</h2>
        <div className="flex items-center gap-0">
          {WORKFLOW.map((step, idx) => {
            const done = idx < currentStepIdx;
            const active = idx === currentStepIdx;
            const future = idx > currentStepIdx;
            return (
              <div key={step.key} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <button
                    onClick={() =>
                      project.status !== step.key && changeStatus(step.key)
                    }
                    className={`w-8 h-8 rounded-full text-xs font-bold transition-all border-2 ${
                      done
                        ? "bg-green-500 border-green-500 text-white"
                        : active
                        ? "bg-blue-600 border-blue-600 text-white scale-110"
                        : "bg-white border-gray-300 text-gray-400 hover:border-blue-400"
                    }`}
                  >
                    {done ? "✓" : idx + 1}
                  </button>
                  <span
                    className={`text-xs mt-1 text-center leading-tight ${
                      active
                        ? "text-blue-600 font-medium"
                        : done
                        ? "text-green-600"
                        : "text-gray-400"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {idx < WORKFLOW.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 mb-5 ${
                      idx < currentStepIdx ? "bg-green-400" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Sol Kolon */}
        <div className="col-span-2 space-y-6">
          {/* Müşteri + Personel */}
          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Bilgiler</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                  Müşteri
                </p>
                <Link
                  href={`/customers`}
                  className="font-medium text-blue-600 hover:underline"
                >
                  {project.customer.company}
                </Link>
                <p className="text-sm text-gray-600">{project.customer.name}</p>
                {project.customer.phone && (
                  <p className="text-sm text-gray-500">{project.customer.phone}</p>
                )}
                {project.customer.email && (
                  <p className="text-sm text-gray-500">{project.customer.email}</p>
                )}
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                  Personel
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Word Dönüşümü: </span>
                  {project.coordinator?.name ?? (
                    <span className="text-gray-400">Atanmadı</span>
                  )}
                </p>
                <p className="text-sm text-gray-700 mt-1">
                  <span className="font-medium">Tercüman: </span>
                  {project.translator?.name ?? (
                    <span className="text-gray-400">Atanmadı</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                  Tarihler
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Oluşturulma: </span>
                  {formatDate(project.createdAt)}
                </p>
                <p className="text-sm text-gray-700 mt-1">
                  <span className="font-medium">Teslim: </span>
                  {project.deliveryDate ? (
                    <span
                      className={
                        new Date(project.deliveryDate) < new Date() &&
                        !["completed", "invoiced"].includes(project.status)
                          ? "text-red-600 font-medium"
                          : ""
                      }
                    >
                      {formatDate(project.deliveryDate)}
                    </span>
                  ) : (
                    <span className="text-gray-400">Belirlenmedi</span>
                  )}
                </p>
              </div>
              {project.notes && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                    Genel Not
                  </p>
                  <p className="text-sm text-gray-700">{project.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Kaynak Dosyalar */}
          {project.sourceFiles.length > 0 && (
            <div className="card p-6">
              <h2 className="font-semibold text-gray-900 mb-4">
                Kaynak Dosyalar
              </h2>
              <div className="space-y-2">
                {project.sourceFiles.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <span className="text-lg">
                      {f.fileType === "pdf"
                        ? "📄"
                        : f.fileType === "docx"
                        ? "📝"
                        : "📎"}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">
                        {f.fileName}
                      </p>
                      <p className="text-xs text-gray-400 uppercase">
                        {f.fileType}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {(dirHandle || f.filePath) && (
                        <button
                          onClick={() => openFile(f.fileName, f.filePath)}
                          className="text-xs text-green-700 bg-green-50 hover:bg-green-100 px-2 py-1 rounded font-medium"
                        >
                          Aç
                        </button>
                      )}
                      {f.driveLink && (
                        <a
                          href={f.driveLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-xs"
                        >
                          Drive →
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tercümeler */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">
                Tercüme & Fiyatlandırma
              </h2>
              <button
                onClick={() => setOutputModal(true)}
                className="btn-secondary btn-sm"
              >
                + Tercüme Ekle
              </button>
            </div>

            {project.outputs.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p>Henüz çıktı eklenmedi</p>
                <button
                  onClick={() => setOutputModal(true)}
                  className="btn-secondary btn-sm mt-3"
                >
                  İlk çıktıyı ekle
                </button>
              </div>
            ) : (
              <>
                <table className="w-full text-sm mb-4">
                  <thead>
                    <tr className="text-xs text-gray-500 uppercase border-b border-gray-100">
                      <th className="text-left py-2">Tür</th>
                      <th className="text-left py-2">Dosya</th>
                      <th className="text-right py-2">Adet</th>
                      <th className="text-right py-2">Birim Fiyat</th>
                      <th className="text-right py-2">Toplam</th>
                      <th className="py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {project.outputs.map((o) => (
                      <tr key={o.id}>
                        <td className="py-2 font-medium text-gray-800">
                          {OUTPUT_TYPE_MAP[o.outputType] ?? o.outputType}
                        </td>
                        <td className="py-2">
                          {o.driveLink ? (
                            <a
                              href={o.driveLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-xs"
                            >
                              {o.fileName || "Drive →"}
                            </a>
                          ) : (
                            <span className="text-gray-500 text-xs">
                              {o.fileName || "-"}
                            </span>
                          )}
                        </td>
                        <td className="py-2 text-right text-gray-600">
                          {o.outputType === "figures"
                            ? `${o.pageCount ?? "-"} sayfa`
                            : `${(o.charCount ?? 0).toLocaleString("tr-TR")} kar.`}
                        </td>
                        <td className="py-2 text-right text-gray-600">
                          {o.unitPrice != null
                            ? o.outputType === "figures"
                              ? `${formatCurrency(o.unitPrice)}/sayfa`
                              : `${formatCurrency(o.unitPrice)}/1000`
                            : "-"}
                        </td>
                        <td className="py-2 text-right font-semibold text-gray-900">
                          {o.totalPrice != null
                            ? formatCurrency(o.totalPrice)
                            : "-"}
                        </td>
                        <td className="py-2 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {(dirHandle || o.filePath) && o.fileName && (
                              <button
                                onClick={() => openFile(o.fileName!, o.filePath)}
                                className="text-xs text-green-700 bg-green-50 hover:bg-green-100 px-2 py-1 rounded font-medium"
                              >
                                Aç
                              </button>
                            )}
                            <button
                              onClick={() => deleteOutput(o.id)}
                              className="text-red-400 hover:text-red-600 text-xs"
                            >
                              Sil
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-200">
                      <td colSpan={4} className="pt-3 font-semibold text-gray-700">
                        Toplam
                      </td>
                      <td className="pt-3 text-right font-bold text-lg text-blue-600">
                        {formatCurrency(totalAmount)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
                {!pricing && (
                  <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                    ⚠ Bu dil çifti için{" "}
                    {project.year} yılı fiyat tanımı bulunamadı.{" "}
                    <Link href="/settings" className="underline">
                      Ayarlar
                    </Link>{" "}
                    sayfasından ekleyin.
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Sağ Kolon */}
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 mb-3">Özet</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Proje No</span>
                <span className="font-mono font-medium">{project.projectNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Dönem</span>
                <span>
                  {getMonthName(project.month)} {project.year}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Dil</span>
                <span>
                  {LANGUAGE_MAP[project.sourceLanguage]} →{" "}
                  {LANGUAGE_MAP[project.targetLanguage]}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Tercüme Sayısı</span>
                <span>{project.outputs.length}</span>
              </div>
              <div className="border-t border-gray-100 pt-2 mt-2 flex justify-between">
                <span className="font-medium text-gray-700">Toplam Tutar</span>
                <span className="font-bold text-blue-600">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>
          </div>

          {project.invoiceItem && (
            <div className="card p-6 bg-indigo-50 border-indigo-200">
              <h2 className="font-semibold text-indigo-900 mb-2">Fatura</h2>
              <p className="text-sm text-indigo-700">
                {project.invoiceItem.invoice.invoiceNo || "Fatura kesildi"}
              </p>
              <Link
                href="/invoices"
                className="text-xs text-indigo-600 hover:underline mt-1 block"
              >
                Faturalara git →
              </Link>
            </div>
          )}

          {/* Etiketler */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900">Etiketler</h2>
              <div className="relative" ref={tagDropdownRef}>
                <button
                  onClick={() => setShowTagDropdown((v) => !v)}
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-lg leading-none transition-colors"
                  title="Etiket ekle"
                >
                  +
                </button>
                {showTagDropdown && (
                  <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1 max-h-56 overflow-y-auto">
                    {availableTags.length === 0 ? (
                      <p className="text-xs text-gray-400 px-3 py-2 text-center">
                        {allTags.length === 0
                          ? "Henüz etiket tanımlanmamış"
                          : "Tüm etiketler eklendi"}
                      </p>
                    ) : (
                      availableTags.map((tag) => (
                        <button
                          key={tag.id}
                          onClick={() => addTag(tag.id)}
                          className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 flex items-center gap-2"
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: tag.color }}
                          />
                          {tag.name}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
            {projectTags.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-3">
                Etiket eklenmemiş
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {projectTags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: tag.color + "22",
                      color: tag.color,
                      border: `1px solid ${tag.color}44`,
                    }}
                  >
                    {tag.name}
                    <button
                      onClick={() => removeTag(tag.id)}
                      className="ml-0.5 hover:opacity-70 transition-opacity font-bold leading-none"
                      title="Etiketi kaldır"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Zaman Takibi */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Zaman Takibi</h2>
              {totalTimeMinutes > 0 && (
                <span className="text-sm font-semibold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full">
                  Toplam: {formatMinutes(totalTimeMinutes)}
                </span>
              )}
            </div>

            {/* Yeni Giriş Formu */}
            <div className="space-y-2 mb-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
              <input
                type="text"
                placeholder="Açıklama (opsiyonel)"
                value={timeForm.description}
                onChange={(e) => setTimeForm({ ...timeForm, description: e.target.value })}
                className="input text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    placeholder="0"
                    min={0}
                    value={timeForm.hours}
                    onChange={(e) => setTimeForm({ ...timeForm, hours: e.target.value })}
                    className="input text-sm w-full"
                  />
                  <span className="text-xs text-gray-500 whitespace-nowrap">saat</span>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    placeholder="0"
                    min={0}
                    max={59}
                    value={timeForm.minutes}
                    onChange={(e) => setTimeForm({ ...timeForm, minutes: e.target.value })}
                    className="input text-sm w-full"
                  />
                  <span className="text-xs text-gray-500 whitespace-nowrap">dk</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Personel adı"
                  value={timeForm.staffName}
                  onChange={(e) => setTimeForm({ ...timeForm, staffName: e.target.value })}
                  className="input text-sm"
                />
                <input
                  type="date"
                  value={timeForm.date}
                  onChange={(e) => setTimeForm({ ...timeForm, date: e.target.value })}
                  className="input text-sm"
                />
              </div>
              <button
                onClick={addTimeEntry}
                disabled={
                  savingTime ||
                  ((!timeForm.hours || parseInt(timeForm.hours) === 0) &&
                    (!timeForm.minutes || parseInt(timeForm.minutes) === 0))
                }
                className="btn-primary btn-sm w-full"
              >
                {savingTime ? "Kaydediliyor..." : "+ Giriş Ekle"}
              </button>
            </div>

            {/* Girişler Listesi */}
            {timeEntries.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-3">
                Henüz zaman girişi yok
              </p>
            ) : (
              <div className="space-y-2">
                {timeEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-2 p-2.5 bg-white border border-gray-100 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-blue-700">
                          {formatMinutes(entry.minutes)}
                        </span>
                        {entry.staffName && (
                          <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                            {entry.staffName}
                          </span>
                        )}
                        <span className="text-xs text-gray-400">
                          {new Date(entry.date).toLocaleDateString("tr-TR", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      {entry.description && (
                        <p className="text-xs text-gray-600 mt-0.5 truncate">
                          {entry.description}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => deleteTimeEntry(entry.id)}
                      className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0 text-sm"
                      title="Girişi sil"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Görev Listesi */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">✅ Görev Listesi</h2>
              {checklist.length > 0 && (
                <span className="text-xs font-semibold bg-green-100 text-green-700 px-2.5 py-0.5 rounded-full">
                  {checklist.filter((i) => i.completed).length}/{checklist.length}
                </span>
              )}
            </div>
            {/* Yeni Görev Formu */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newCheckItem}
                onChange={(e) => setNewCheckItem(e.target.value)}
                placeholder="Görev ekle..."
                className="input flex-1 text-sm"
                onKeyDown={(e) => { if (e.key === "Enter") addCheckItem(); }}
              />
              <button
                onClick={addCheckItem}
                disabled={savingCheck || !newCheckItem.trim()}
                className="btn-primary btn-sm"
              >
                {savingCheck ? "..." : "Ekle"}
              </button>
            </div>
            {/* Görev Listesi */}
            {checklist.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Henüz görev eklenmemiş</p>
            ) : (
              <div className="space-y-1">
                {checklist.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 group">
                    <button
                      onClick={() => toggleCheckItem(item.id, item.completed)}
                      className={`w-5 h-5 flex-shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
                        item.completed
                          ? "bg-green-500 border-green-500 text-white"
                          : "border-gray-300 hover:border-green-400"
                      }`}
                    >
                      {item.completed && <span className="text-xs leading-none">✓</span>}
                    </button>
                    <span
                      className={`flex-1 text-sm ${
                        item.completed ? "line-through text-gray-400" : "text-gray-800"
                      }`}
                    >
                      {item.text}
                    </span>
                    <button
                      onClick={() => deleteCheckItem(item.id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all text-xs"
                      title="Görevi sil"
                    >
                      🗑
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* İç Notlar */}
          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 mb-4">İç Notlar</h2>
            {/* Not Ekleme */}
            <div className="flex gap-2 mb-4">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Not ekle..."
                rows={2}
                className="input flex-1 resize-none"
                onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey) addNote(); }}
              />
              <button
                onClick={addNote}
                disabled={savingNote || !newNote.trim()}
                className="btn-primary btn-sm self-end"
              >
                {savingNote ? "..." : "Ekle"}
              </button>
            </div>
            {/* Not Listesi */}
            {projectNotes.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Henüz not eklenmemiş</p>
            ) : (
              <div className="space-y-2">
                {projectNotes.map((note) => (
                  <div key={note.id} className="flex items-start gap-2 p-3 bg-brand-50 rounded-lg border border-brand-100">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800">{note.content}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(note.createdAt).toLocaleString("tr-TR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteNote(note.id)}
                      className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"
                      title="Notu sil"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Süreç Analizi */}
          {statusHistory.length > 0 && project && (() => {
            const sorted = [...statusHistory].sort((a, b) =>
              new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime()
            );
            const phases: { status: string; durationMs: number }[] = [];
            let curStatus = "new";
            let curStart = new Date(project.createdAt).getTime();
            for (const h of sorted) {
              const end = new Date(h.changedAt).getTime();
              phases.push({ status: curStatus, durationMs: end - curStart });
              curStatus = h.newStatus;
              curStart = end;
            }
            phases.push({ status: curStatus, durationMs: Date.now() - curStart });
            const totalMs = phases.reduce((s, p) => s + p.durationMs, 0);

            const STATUS_COLORS: Record<string, string> = {
              new: "#9CA3AF", word_conversion: "#F59E0B",
              translation: "#8B5CF6", review: "#A855F7",
              completed: "#10B981", invoiced: "#6366F1",
            };
            const fmtDur = (ms: number) => {
              const d = Math.floor(ms / 86400000);
              const h = Math.floor((ms % 86400000) / 3600000);
              if (d >= 1) return `${d}g ${h > 0 ? h + "s" : ""}`.trim();
              return `${h}s`;
            };

            return (
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-semibold text-gray-900">Süreç Analizi</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Her aşamada harcanan süre · Toplam: {fmtDur(totalMs)}</p>
                  </div>
                </div>
                {/* Segmented bar */}
                <div className="flex rounded-xl overflow-hidden h-9 gap-px mb-4">
                  {phases.map((phase, i) => {
                    const pct = totalMs > 0 ? (phase.durationMs / totalMs) * 100 : 0;
                    return (
                      <div
                        key={i}
                        className="relative group flex items-center justify-center transition-all hover:brightness-110"
                        style={{ width: `${Math.max(pct, 1.5)}%`, background: STATUS_COLORS[phase.status] ?? "#7A4899" }}
                        title={`${STATUS_MAP[phase.status]?.label ?? phase.status}: ${fmtDur(phase.durationMs)}`}
                      >
                        {pct > 12 && (
                          <span className="text-white text-xs font-semibold drop-shadow-sm">{fmtDur(phase.durationMs)}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
                {/* Labels */}
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {phases.map((phase, i) => {
                    const pct = totalMs > 0 ? (phase.durationMs / totalMs) * 100 : 0;
                    return (
                      <div key={i} className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: STATUS_COLORS[phase.status] ?? "#7A4899" }} />
                        <span className="text-xs text-gray-500">{STATUS_MAP[phase.status]?.label ?? phase.status}</span>
                        <span className="text-xs font-semibold text-gray-900">{fmtDur(phase.durationMs)}</span>
                        <span className="text-xs text-gray-300">%{pct.toFixed(0)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Durum Geçmişi */}
          {statusHistory.length > 0 && (
            <div className="card p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Durum Geçmişi</h2>
              <div className="relative">
                <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-brand-100" />
                <div className="space-y-4">
                  {statusHistory.map((h) => (
                    <div key={h.id} className="flex items-start gap-4 pl-8 relative">
                      <div className="absolute left-2 top-1.5 w-2.5 h-2.5 rounded-full bg-brand-500 border-2 border-white ring-2 ring-brand-200" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{h.oldStatus}</span>
                          <span className="text-gray-400 text-xs">→</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 font-medium">{h.newStatus}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(h.changedAt).toLocaleString("tr-TR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          {h.changedBy && <span className="ml-1">· {h.changedBy}</span>}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tercüme Ekleme Modal */}
      <Modal
        open={outputModal}
        onClose={() => setOutputModal(false)}
        title="Tercüme Ekle"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="label">Tercüme Türü</label>
            <select
              value={outputForm.outputType}
              onChange={(e) =>
                setOutputForm({
                  ...outputForm,
                  outputType: e.target.value,
                  fileName: "",
                  charCount: "",
                  pageCount: "",
                })
              }
              className="input"
            >
              <option value="translation">Tercüme (Word)</option>
              <option value="figures">Şekiller</option>
              <option value="sequence">Sequence Dosyası</option>
            </select>
          </div>

          {/* Dosya Seçici */}
          <div>
            <label className="label">Dosya Seç</label>
            {outputForm.fileName ? (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <span className="text-xl">
                  {outputForm.outputType === "figures" ? "🖼️" : "📝"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {outputForm.fileName}
                  </p>
                  {outputForm.charCount && (
                    <p className="text-xs text-green-600">
                      {parseInt(outputForm.charCount).toLocaleString("tr-TR")} karakter (boşluksuz)
                    </p>
                  )}
                  {outputForm.pageCount && (
                    <p className="text-xs text-green-600">
                      {outputForm.pageCount} sayfa
                    </p>
                  )}
                </div>
                <button
                  onClick={() =>
                    setOutputForm({
                      ...outputForm,
                      fileName: "",
                      charCount: "",
                      pageCount: "",
                    })
                  }
                  className="text-gray-400 hover:text-gray-600 text-sm"
                >
                  Değiştir
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                {analyzingFile ? (
                  <>
                    <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-blue-600">Dosya analiz ediliyor...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span className="text-sm text-gray-600">
                      {outputForm.outputType === "translation"
                        ? "Word dosyası seçin (.docx)"
                        : outputForm.outputType === "figures"
                        ? "Şekil dosyası seçin (PDF, Word veya resim)"
                        : "Sequence dosyası seçin"}
                    </span>
                    <span className="text-xs text-gray-400">
                      Karakter / sayfa sayısı otomatik hesaplanır
                    </span>
                  </>
                )}
                <input
                  type="file"
                  className="hidden"
                  accept={
                    outputForm.outputType === "figures"
                      ? ".pdf,.doc,.docx,.tif,.tiff,.png,.jpg,.jpeg"
                      : ".doc,.docx,.txt,.xml,.pdf"
                  }
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setAnalyzingFile(true);
                    try {
                      const formData = new FormData();
                      formData.append("file", file);
                      const res = await fetch("/api/files/analyze", {
                        method: "POST",
                        body: formData,
                      });
                      const data = await res.json();
                      setOutputForm({
                        ...outputForm,
                        fileName: data.fileName || file.name,
                        charCount: data.charCount ? String(data.charCount) : "",
                        pageCount: data.pageCount ? String(data.pageCount) : "",
                      });
                    } catch {
                      setOutputForm({
                        ...outputForm,
                        fileName: file.name,
                      });
                    }
                    setAnalyzingFile(false);
                    e.target.value = "";
                  }}
                />
              </label>
            )}
          </div>

          {/* Sayıları elle düzeltme imkanı */}
          {outputForm.fileName && (
            <div className="grid grid-cols-2 gap-4">
              {outputForm.outputType === "figures" ? (
                <div>
                  <label className="label">
                    Sayfa Sayısı
                    <span className="text-xs text-gray-400 font-normal ml-1">(otomatik, düzenlenebilir)</span>
                  </label>
                  <input
                    type="number"
                    className="input"
                    value={outputForm.pageCount}
                    onChange={(e) =>
                      setOutputForm({ ...outputForm, pageCount: e.target.value })
                    }
                    placeholder="15"
                  />
                </div>
              ) : (
                <div>
                  <label className="label">
                    Karakter Sayısı
                    <span className="text-xs text-gray-400 font-normal ml-1">(otomatik, düzenlenebilir)</span>
                  </label>
                  <input
                    type="number"
                    className="input"
                    value={outputForm.charCount}
                    onChange={(e) =>
                      setOutputForm({ ...outputForm, charCount: e.target.value })
                    }
                    placeholder="12500"
                  />
                </div>
              )}
              <div className="flex items-end">
                {pricing && (
                  <div className="p-3 bg-green-50 rounded-lg w-full">
                    <p className="text-xs text-gray-500">Hesaplanan Tutar</p>
                    <p className="text-lg font-bold text-green-700">
                      {outputForm.outputType === "figures" && outputForm.pageCount
                        ? formatCurrency(
                            calculateFiguresPrice(
                              parseInt(outputForm.pageCount),
                              pricing.pricePerFigurePage
                            )
                          )
                        : outputForm.charCount
                        ? formatCurrency(
                            calculateTranslationPrice(
                              parseInt(outputForm.charCount),
                              pricing.pricePerThousandChars
                            )
                          )
                        : formatCurrency(0)}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {outputForm.outputType === "figures"
                        ? `${formatCurrency(pricing.pricePerFigurePage)} / sayfa`
                        : `${formatCurrency(pricing.pricePerThousandChars)} / 1000 karakter`}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {!pricing && outputForm.fileName && (
            <p className="text-xs text-amber-600 bg-amber-50 p-3 rounded-lg">
              ⚠ Bu dil çifti için fiyat tanımı yok. Fiyat 0 olarak kaydedilecek.{" "}
              <Link href="/settings" className="underline">
                Ayarlar&apos;dan ekleyin.
              </Link>
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setOutputModal(false)}
              className="btn-secondary"
            >
              İptal
            </button>
            <button
              onClick={addOutput}
              disabled={savingOutput || !outputForm.fileName}
              className="btn-primary"
            >
              {savingOutput ? "Kaydediliyor..." : "Ekle"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Düzenleme Modal */}
      <Modal
        open={editModal}
        onClose={() => setEditModal(false)}
        title="Proje Düzenle"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="label">Teslim Tarihi</label>
            <input
              type="date"
              className="input"
              value={editForm.deliveryDate}
              onChange={(e) =>
                setEditForm({ ...editForm, deliveryDate: e.target.value })
              }
            />
          </div>
          <div>
            <label className="label">Word Dönüşüm Sorumlusu</label>
            <select
              value={editForm.coordinatorId}
              onChange={(e) =>
                setEditForm({ ...editForm, coordinatorId: e.target.value })
              }
              className="input"
            >
              <option value="">Seçin...</option>
              {coordinators.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Tercüman</label>
            <select
              value={editForm.translatorId}
              onChange={(e) =>
                setEditForm({ ...editForm, translatorId: e.target.value })
              }
              className="input"
            >
              <option value="">Seçin...</option>
              {translators.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Notlar</label>
            <textarea
              className="input h-20 resize-none"
              value={editForm.notes}
              onChange={(e) =>
                setEditForm({ ...editForm, notes: e.target.value })
              }
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setEditModal(false)}
              className="btn-secondary"
            >
              İptal
            </button>
            <button
              onClick={saveEdit}
              disabled={savingEdit}
              className="btn-primary"
            >
              {savingEdit ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
