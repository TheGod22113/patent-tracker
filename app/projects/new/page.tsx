"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import Modal from "@/components/ui/Modal";
import { LANGUAGES, MONTHS_TR, LANGUAGE_MAP } from "@/lib/constants";
import { saveDirHandle } from "@/lib/fileHandleStore";
import Link from "next/link";

interface Customer {
  id: string;
  name: string;
  company: string;
}

interface Staff {
  id: string;
  name: string;
  role: string;
}

interface ProjectTemplate {
  id: string;
  name: string;
  sourceLanguage: string;
  targetLanguage: string;
  pricePerThousandChars: number;
  pricePerFigurePage: number;
}

interface SourceFile {
  fileName: string;
  driveLink: string;
  fileType: string;
  filePath: string;
}

interface ScannedFile {
  file: File;
  name: string;
  ext: string;
  category: "source" | "output_translation" | "output_figures" | "skip";
  charCount: number | null;
  pageCount: number | null;
  analyzed: boolean;
  filePath?: string;
}

// Dosya adından dil çiftini tespit et (örn: 86760_EN_TR.doc → en, tr)
const LANG_CODES: Record<string, string> = {
  EN: "en", DE: "de", FR: "fr", RU: "ru", TR: "tr",
};

function detectLangPair(fileName: string): { source: string; target: string } | null {
  const codes = Object.keys(LANG_CODES).join("|");
  const pattern = new RegExp(`_(${codes})_(${codes})(?:\\.|_|$)`, "i");
  const match = fileName.match(pattern);
  if (match) {
    return {
      source: LANG_CODES[match[1].toUpperCase()] ?? match[1].toLowerCase(),
      target: LANG_CODES[match[2].toUpperCase()] ?? match[2].toLowerCase(),
    };
  }
  return null;
}

function categorizeFile(name: string): ScannedFile["category"] {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const nameNoExt = name.substring(0, name.lastIndexOf(".")).toUpperCase();

  if (ext === "pdf") return "source";
  if (["tif", "tiff", "png", "jpg", "jpeg"].includes(ext)) return "output_figures";
  if (["doc", "docx"].includes(ext)) {
    // _TR ile biten Word dosyası → hedef tercüme dosyası
    if (/_TR$/.test(nameNoExt)) return "output_translation";
    return "source";
  }
  return "skip";
}

const CATEGORY_LABELS: Record<string, string> = {
  source: "Kaynak Dosya",
  output_translation: "Tercüme (Hedef)",
  output_figures: "Şekil Dosyası",
};

const CATEGORY_COLORS: Record<string, string> = {
  source: "bg-blue-100 text-blue-700",
  output_translation: "bg-green-100 text-green-700",
  output_figures: "bg-purple-100 text-purple-700",
};

export default function NewProjectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const now = new Date();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    customerId: searchParams?.get("customerId") ?? "",
    sourceLanguage: "en",
    targetLanguage: "tr",
    deliveryDate: "",
    coordinatorId: "",
    translatorId: "",
    notes: "",
  });

  const [sourceFiles, setSourceFiles] = useState<SourceFile[]>([
    { fileName: "", driveLink: "", fileType: "pdf", filePath: "" },
  ]);

  // Klasör taraması
  const [scanModal, setScanModal] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scannedFiles, setScannedFiles] = useState<ScannedFile[]>([]);
  const [detectedLang, setDetectedLang] = useState<{ source: string; target: string } | null>(null);
  const [detectedOutputs, setDetectedOutputs] = useState<ScannedFile[]>([]);
  const dirHandleRef = useRef<FileSystemDirectoryHandle | null>(null);

  useEffect(() => {
    fetch("/api/customers").then((r) => r.json()).then((c) => setCustomers(Array.isArray(c) ? c : [])).catch(() => {});
    fetch("/api/staff").then((r) => r.json()).then((s) => setStaff(Array.isArray(s) ? s : [])).catch(() => {});
    fetch("/api/templates").then((r) => r.json()).then((t) => setTemplates(Array.isArray(t) ? t : [])).catch(() => {});
  }, []);

  // ───── Klasör Tarama ─────
  const scanFolder = async () => {
    if (!("showDirectoryPicker" in window)) {
      alert("Bu özellik sadece Chrome/Edge tarayıcılarında desteklenmektedir.");
      return;
    }
    try {
      const dirHandle = await (window as any).showDirectoryPicker({ mode: "read" });
      dirHandleRef.current = dirHandle;
      // Klasör adını hemen notes alanına yaz
      setForm((prev) => ({
        ...prev,
        notes: prev.notes
          ? `${prev.notes}\n📁 Klasör: ${dirHandle.name}`
          : `📁 Klasör: ${dirHandle.name}`,
      }));
      setScanning(true);
      setScanModal(true);
      setScannedFiles([]);
      setDetectedLang(null);

      const found: ScannedFile[] = [];

      for await (const [name, handle] of dirHandle.entries()) {
        if (handle.kind !== "file") continue;
        const category = categorizeFile(name);
        if (category === "skip") continue;
        const file = await handle.getFile();
        const ext = name.split(".").pop()?.toLowerCase() ?? "";
        found.push({ file, name, ext, category, charCount: null, pageCount: null, analyzed: false });
      }

      // Dil çiftini tespit et (ilk eşleşen dosyadan)
      let lang: { source: string; target: string } | null = null;
      for (const f of found) {
        const pair = detectLangPair(f.name);
        if (pair) { lang = pair; break; }
      }
      setDetectedLang(lang);
      setScannedFiles([...found]);

      // Word ve PDF dosyalarını analiz et
      const toAnalyze = found.filter((f) =>
        ["doc", "docx", "pdf"].includes(f.ext)
      );

      for (const sf of toAnalyze) {
        const fd = new FormData();
        fd.append("file", sf.file);
        try {
          const res = await fetch("/api/files/analyze", { method: "POST", body: fd });
          const data = await res.json();
          setScannedFiles((prev) =>
            prev.map((x) =>
              x.name === sf.name
                ? { ...x, charCount: data.charCount ?? null, pageCount: data.pageCount ?? null, analyzed: true }
                : x
            )
          );
        } catch {
          setScannedFiles((prev) =>
            prev.map((x) => (x.name === sf.name ? { ...x, analyzed: true } : x))
          );
        }
      }

      setScanning(false);
    } catch (err: any) {
      setScanning(false);
      if (err?.name !== "AbortError") {
        alert("Klasör okunamadı: " + String(err));
      }
    }
  };

  const changeCategory = (name: string, category: ScannedFile["category"]) => {
    setScannedFiles((prev) =>
      prev.map((f) => (f.name === name ? { ...f, category } : f))
    );
  };

  const applyDetectedFiles = () => {
    const sources = scannedFiles.filter((f) => f.category === "source");
    const outputs = scannedFiles.filter(
      (f) => f.category === "output_translation" || f.category === "output_figures"
    );

    // Kaynak dosyaları uygula (max 3)
    if (sources.length > 0) {
      setSourceFiles(
        sources.slice(0, 3).map((f) => ({
          fileName: f.name,
          driveLink: "",
          fileType:
            f.ext === "pdf" ? "pdf" : ["doc", "docx"].includes(f.ext) ? "docx" : "other",
          filePath: "",
        }))
      );
    }

    // Dil çiftini uygula
    if (detectedLang) {
      setForm((prev) => ({
        ...prev,
        sourceLanguage: detectedLang.source,
        targetLanguage: detectedLang.target,
      }));
    }

    // Çıktı dosyalarını kaydet
    setDetectedOutputs(outputs);
    setScanModal(false);
  };

  // ───── Manuel Dosya Ekleme ─────
  const addFile = () => {
    if (sourceFiles.length >= 3) return;
    setSourceFiles([...sourceFiles, { fileName: "", driveLink: "", fileType: "pdf", filePath: "" }]);
  };

  const removeFile = (i: number) => {
    setSourceFiles(sourceFiles.filter((_, idx) => idx !== i));
  };

  const submit = async () => {
    if (!form.customerId) return alert("Müşteri seçiniz.");
    if (!form.sourceLanguage || !form.targetLanguage) return alert("Dil seçiniz.");

    setSaving(true);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        sourceFiles: sourceFiles.filter((f) => f.fileName.trim()),
      }),
    });
    const project = await res.json();

    // Tespit edilen çıktı dosyalarını otomatik ekle
    for (const out of detectedOutputs) {
      try {
        await fetch(`/api/projects/${project.id}/outputs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            outputType: out.category === "output_translation" ? "translation" : "figures",
            fileName: out.name,
            filePath: out.filePath || null,
            charCount: out.charCount ?? null,
            pageCount: out.pageCount ?? null,
          }),
        });
      } catch (e) {
        console.error("Çıktı eklenemedi:", out.name, e);
      }
    }

    // Klasör handle'ını IndexedDB'ye kaydet (proje ID ile ilişkilendir)
    if (dirHandleRef.current && project.id) {
      const folderName = dirHandleRef.current.name;
      try {
        await saveDirHandle(`project-${project.id}`, dirHandleRef.current);
      } catch {
        // IndexedDB hatası kritik değil
      }
      // Klasör adını otomatik not olarak ekle
      try {
        await fetch(`/api/projects/${project.id}/notes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: `📁 Klasör: ${folderName}`,
            createdBy: "sistem",
          }),
        });
      } catch {
        // Not eklenemezse kritik değil
      }
    }

    setSaving(false);
    router.push(`/projects/${project.id}`);
  };

  const coordinators = staff.filter((s) => ["coordinator", "both"].includes(s.role));
  const translators = staff.filter((s) => ["translator", "both"].includes(s.role));

  const sourcesInScan = scannedFiles.filter((f) => f.category === "source");
  const outputsInScan = scannedFiles.filter(
    (f) => f.category === "output_translation" || f.category === "output_figures"
  );
  const pendingAnalysis = scannedFiles.some((f) => !f.analyzed && ["doc", "docx", "pdf"].includes(f.ext));

  return (
    <AppLayout>
      <div className="max-w-2xl">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/projects" className="text-gray-400 hover:text-gray-600">
            ← Projeler
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Yeni Proje</h1>
        </div>

        <div className="space-y-6">
          {/* Klasörden Yükle */}
          <div className="card p-5 border-2 border-dashed border-blue-200 bg-blue-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-blue-900">Klasörden Otomatik Yükle</p>
                <p className="text-sm text-blue-700 mt-0.5">
                  Bir klasör seçin — PDF kaynak, _TR Word tercüme dosyaları otomatik tespit edilir.
                </p>
              </div>
              <button onClick={scanFolder} className="btn-primary whitespace-nowrap">
                📁 Klasör Seç
              </button>
            </div>
            {detectedOutputs.length > 0 && (
              <div className="mt-3 pt-3 border-t border-blue-200 text-sm text-blue-800">
                ✓ {detectedOutputs.length} çıktı dosyası tespit edildi ve projeye eklenecek
              </div>
            )}
          </div>

          {/* Şablon Seçici */}
          {templates.length > 0 && (
            <div className="card p-4 bg-brand-50 border-brand-200">
              <div className="flex items-center gap-3">
                <span className="text-brand-600 font-medium text-sm">⚡ Şablon:</span>
                <select
                  className="input flex-1"
                  defaultValue=""
                  onChange={(e) => {
                    const tpl = templates.find((t) => t.id === e.target.value);
                    if (tpl) {
                      setForm((prev) => ({
                        ...prev,
                        sourceLanguage: tpl.sourceLanguage,
                        targetLanguage: tpl.targetLanguage,
                      }));
                    }
                  }}
                >
                  <option value="">Şablon seçin (opsiyonel)...</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Dönem */}
          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Dönem</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Yıl</label>
                <select
                  value={form.year}
                  onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) })}
                  className="input"
                >
                  {[2024, 2025, 2026, 2027].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Ay</label>
                <select
                  value={form.month}
                  onChange={(e) => setForm({ ...form, month: parseInt(e.target.value) })}
                  className="input"
                >
                  {MONTHS_TR.map((m, i) => (
                    <option key={i + 1} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Müşteri */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Müşteri</h2>
              <Link href="/customers" className="text-xs text-blue-600 hover:underline">
                + Yeni müşteri ekle
              </Link>
            </div>
            <select
              value={form.customerId}
              onChange={(e) => setForm({ ...form, customerId: e.target.value })}
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

          {/* Dil Çifti */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Dil Çifti</h2>
              {detectedLang && (
                <span className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded-full">
                  ✓ Dosya adından tespit edildi
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Kaynak Dil</label>
                <select
                  value={form.sourceLanguage}
                  onChange={(e) => setForm({ ...form, sourceLanguage: e.target.value })}
                  className="input"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>{l.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Hedef Dil</label>
                <select
                  value={form.targetLanguage}
                  onChange={(e) => setForm({ ...form, targetLanguage: e.target.value })}
                  className="input"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>{l.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Tarihler */}
          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Tarihler</h2>
            <div>
              <label className="label">Teslim Tarihi</label>
              <input
                type="date"
                className="input max-w-xs"
                value={form.deliveryDate}
                onChange={(e) => setForm({ ...form, deliveryDate: e.target.value })}
              />
            </div>
          </div>

          {/* Kaynak Dosyalar */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Kaynak Dosyalar</h2>
              <button onClick={addFile} className="btn-secondary btn-sm">
                + Dosya Ekle
              </button>
            </div>
            <div className="space-y-3">
              {sourceFiles.map((f, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex-1">
                    {f.fileName ? (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <span className="text-xl">
                          {f.fileType === "pdf" ? "📄" : f.fileType === "docx" ? "📝" : "📎"}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{f.fileName}</p>
                          <p className="text-xs text-gray-500 uppercase">{f.fileType}</p>
                        </div>
                        <button
                          onClick={() => {
                            const updated = [...sourceFiles];
                            updated[i] = { fileName: "", driveLink: "", fileType: "pdf", filePath: "" };
                            setSourceFiles(updated);
                          }}
                          className="text-gray-400 hover:text-gray-600 text-sm"
                        >
                          Değiştir
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                        <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <span className="text-sm text-gray-600">Dosya seçmek için tıklayın</span>
                        <span className="text-xs text-gray-400">
                          PDF, Word veya diğer dosyalar (birden fazla seçilebilir)
                        </span>
                        <input
                          type="file"
                          className="hidden"
                          multiple
                          accept=".pdf,.doc,.docx,.txt,.xml,.tif,.tiff,.png,.jpg,.jpeg"
                          onChange={(e) => {
                            const files = Array.from(e.target.files ?? []);
                            if (!files.length) return;
                            const newEntries: SourceFile[] = files.map((file) => {
                              const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
                              let fileType = "other";
                              if (ext === "pdf") fileType = "pdf";
                              else if (["doc", "docx"].includes(ext)) fileType = "docx";
                              return { fileName: file.name, driveLink: "", fileType, filePath: file.name };
                            });
                            const current = sourceFiles.filter((_, idx) => idx !== i);
                            const merged = [newEntries[0], ...current];
                            for (let j = 1; j < newEntries.length; j++) {
                              merged.push(newEntries[j]);
                            }
                            setSourceFiles(merged);
                          }}
                        />
                      </label>
                    )}
                  </div>
                  {sourceFiles.length > 1 && (
                    <button onClick={() => removeFile(i)} className="text-red-400 hover:text-red-600">
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Personel Atama */}
          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Personel Atama</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Word Dönüşüm Sorumlusu</label>
                <select
                  value={form.coordinatorId}
                  onChange={(e) => setForm({ ...form, coordinatorId: e.target.value })}
                  className="input"
                >
                  <option value="">Seçin...</option>
                  {coordinators.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Tercüman</label>
                <select
                  value={form.translatorId}
                  onChange={(e) => setForm({ ...form, translatorId: e.target.value })}
                  className="input"
                >
                  <option value="">Seçin...</option>
                  {translators.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Notlar */}
          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Notlar</h2>
            <textarea
              className="input h-24 resize-none"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Proje hakkında notlar..."
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pb-8">
            <Link href="/projects" className="btn-secondary">İptal</Link>
            <button onClick={submit} disabled={saving} className="btn-primary">
              {saving ? "Kaydediliyor..." : "Projeyi Oluştur"}
            </button>
          </div>
        </div>
      </div>

      {/* Klasör Tarama Modalı */}
      <Modal
        open={scanModal}
        onClose={() => !scanning && setScanModal(false)}
        title="Klasör Tarama Sonuçları"
        size="xl"
      >
        <div className="space-y-4">
          {scanning && (
            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
              <div className="w-5 h-5 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <div>
                <p className="text-sm font-medium text-blue-900">Dosyalar analiz ediliyor...</p>
                <p className="text-xs text-blue-700">Karakter ve sayfa sayıları hesaplanıyor</p>
              </div>
            </div>
          )}

          {!scanning && scannedFiles.length === 0 && (
            <p className="text-center text-gray-400 py-8">Desteklenen dosya bulunamadı.</p>
          )}

          {/* Tespit edilen dil çifti */}
          {detectedLang && (
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
              <span className="text-green-700 font-medium text-sm">🌐 Tespit edilen dil çifti:</span>
              <span className="font-bold text-green-900">
                {LANGUAGE_MAP[detectedLang.source]} → {LANGUAGE_MAP[detectedLang.target]}
              </span>
            </div>
          )}

          {/* Dosya listesi */}
          {scannedFiles.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-2">
                Kategoriyi değiştirmek için açılır menüyü kullanın.
              </p>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                    <tr>
                      <th className="text-left px-3 py-2">Dosya Adı</th>
                      <th className="text-left px-3 py-2">Kategori</th>
                      <th className="text-right px-3 py-2">Karakter</th>
                      <th className="text-right px-3 py-2">Sayfa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {scannedFiles.map((f) => (
                      <tr key={f.name} className="hover:bg-gray-50">
                        <td className="px-3 py-2">
                          <span className="font-medium text-gray-900 text-xs">{f.name}</span>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={f.category}
                            onChange={(e) =>
                              changeCategory(f.name, e.target.value as ScannedFile["category"])
                            }
                            className="text-xs border border-gray-200 rounded px-2 py-1"
                          >
                            <option value="source">Kaynak Dosya</option>
                            <option value="output_translation">Tercüme (Hedef)</option>
                            <option value="output_figures">Şekil Dosyası</option>
                            <option value="skip">Atla</option>
                          </select>
                        </td>
                        <td className="px-3 py-2 text-right text-gray-600">
                          {!f.analyzed && ["doc", "docx", "pdf"].includes(f.ext) ? (
                            <span className="text-blue-500">...</span>
                          ) : f.charCount != null ? (
                            f.charCount.toLocaleString("tr-TR")
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-600">
                          {!f.analyzed && ["doc", "docx", "pdf"].includes(f.ext) ? (
                            <span className="text-blue-500">...</span>
                          ) : f.pageCount != null ? (
                            f.pageCount
                          ) : (
                            "-"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Özet */}
          {!scanning && scannedFiles.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-blue-700">{sourcesInScan.length}</p>
                <p className="text-xs text-blue-600">Kaynak Dosya</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-700">
                  {scannedFiles.filter((f) => f.category === "output_translation").length}
                </p>
                <p className="text-xs text-green-600">Tercüme Dosyası</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-purple-700">
                  {scannedFiles.filter((f) => f.category === "output_figures").length}
                </p>
                <p className="text-xs text-purple-600">Şekil Dosyası</p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setScanModal(false)}
              className="btn-secondary"
              disabled={scanning}
            >
              İptal
            </button>
            <button
              onClick={applyDetectedFiles}
              disabled={scanning || pendingAnalysis || scannedFiles.length === 0}
              className="btn-primary"
            >
              {pendingAnalysis ? "Analiz bekleniyor..." : "Projeye Uygula"}
            </button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
