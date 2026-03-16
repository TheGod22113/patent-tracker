"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import { formatDate } from "@/lib/utils";

interface Project {
  id: string;
  projectNo: string;
  year: number;
  month: number;
  status: string;
  deliveryDate: string | null;
  customer: { id: string; name: string; company: string };
  translator: { id: string; name: string } | null;
}

const COLUMNS = [
  { key: "new", label: "Yeni", color: "#6B7280", bg: "bg-gray-50" },
  { key: "word_conversion", label: "Word Dönüşümü", color: "#F59E0B", bg: "bg-amber-50" },
  { key: "translation", label: "Tercüme", color: "#8B5CF6", bg: "bg-violet-50" },
  { key: "review", label: "İnceleme", color: "#7A4899", bg: "bg-purple-50" },
  { key: "completed", label: "Tamamlandı", color: "#10B981", bg: "bg-emerald-50" },
  { key: "invoiced", label: "Faturalandı", color: "#6366F1", bg: "bg-indigo-50" },
] as const;

type ColumnKey = (typeof COLUMNS)[number]["key"];

function isOverdue(deliveryDate: string | null, status: string): boolean {
  if (!deliveryDate) return false;
  if (status === "completed" || status === "invoiced") return false;
  return new Date(deliveryDate).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0);
}

function ProjectCard({
  project,
  columnColor,
  onDragStart,
}: {
  project: Project;
  columnColor: string;
  onDragStart: (e: React.DragEvent, id: string) => void;
}) {
  const router = useRouter();
  const overdue = isOverdue(project.deliveryDate, project.status);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, project.id)}
      onClick={() => router.push(`/projects/${project.id}`)}
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-all select-none group"
      style={{ borderLeft: `4px solid ${columnColor}` }}
    >
      {/* Project number */}
      <p className="font-mono text-xs font-bold text-gray-500 mb-1 tracking-wide">
        {project.projectNo}
      </p>

      {/* Company */}
      <p className="text-sm font-semibold text-gray-800 truncate leading-snug" title={project.customer.company}>
        {project.customer.company}
      </p>

      {/* Delivery date */}
      {project.deliveryDate && (
        <p className={`text-xs mt-1.5 font-medium flex items-center gap-1 ${overdue ? "text-red-600" : "text-gray-400"}`}>
          {overdue && (
            <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          )}
          {formatDate(project.deliveryDate)}
        </p>
      )}

      {/* Translator */}
      {project.translator && (
        <p className="text-xs text-gray-400 mt-1.5 truncate">
          <span className="text-gray-300">T: </span>
          {project.translator.name}
        </p>
      )}
    </div>
  );
}

function KanbanColumn({
  column,
  projects,
  onDragStart,
  onDragOver,
  onDrop,
  isDragOver,
}: {
  column: (typeof COLUMNS)[number];
  projects: Project[];
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragOver: (e: React.DragEvent, key: ColumnKey) => void;
  onDrop: (e: React.DragEvent, key: ColumnKey) => void;
  isDragOver: boolean;
}) {
  return (
    <div
      className={`flex flex-col rounded-2xl border transition-all ${
        isDragOver
          ? "border-2 border-dashed scale-[1.01]"
          : "border border-gray-200"
      }`}
      style={{
        minWidth: 220,
        width: 220,
        borderColor: isDragOver ? column.color : undefined,
        background: isDragOver ? column.color + "10" : undefined,
      }}
      onDragOver={(e) => onDragOver(e, column.key)}
      onDrop={(e) => onDrop(e, column.key)}
    >
      {/* Column header */}
      <div className={`flex items-center gap-2 px-3 py-3 rounded-t-2xl ${column.bg} border-b border-gray-100`}>
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ background: column.color }}
        />
        <span className="text-sm font-semibold text-gray-700 flex-1 truncate">
          {column.label}
        </span>
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
          style={{ background: column.color }}
        >
          {projects.length}
        </span>
      </div>

      {/* Cards */}
      <div
        className={`flex-1 overflow-y-auto p-2 space-y-2 ${column.bg}`}
        style={{ minHeight: 120, maxHeight: "calc(100vh - 220px)" }}
      >
        {projects.length === 0 && (
          <div className="flex items-center justify-center h-16 text-gray-300 text-xs select-none">
            Proje yok
          </div>
        )}
        {projects.map((p) => (
          <ProjectCard
            key={p.id}
            project={p}
            columnColor={column.color}
            onDragStart={onDragStart}
          />
        ))}
      </div>
    </div>
  );
}

export default function KanbanPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<ColumnKey | null>(null);
  const [updating, setUpdating] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    // Fetch all projects without status filter; filter client-side by year
    fetch("/api/projects")
      .then((r) => r.json())
      .then((d) => {
        const all = Array.isArray(d) ? d : [];
        const filtered = all.filter((p: Project) => p.year === year);
        setProjects(filtered);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [year]);

  useEffect(() => {
    load();
  }, [load]);

  const getColumnProjects = (key: ColumnKey) =>
    projects.filter((p) => p.status === key);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("projectId", id);
  };

  const handleDragOver = (e: React.DragEvent, key: ColumnKey) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(key);
  };

  const handleDrop = async (e: React.DragEvent, newStatus: ColumnKey) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("projectId") || draggingId;
    setDragOverColumn(null);
    setDraggingId(null);

    if (!id) return;

    const project = projects.find((p) => p.id === id);
    if (!project || project.status === newStatus) return;

    setUpdating(true);

    // Optimistic update
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p))
    );

    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, changedBy: "kanban" }),
      });
      if (!res.ok) throw new Error("Update failed");
    } catch {
      // Revert on failure
      setProjects((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: project.status } : p))
      );
    } finally {
      setUpdating(false);
    }
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverColumn(null);
  };

  const totalActive = projects.filter(
    (p) => p.status !== "completed" && p.status !== "invoiced"
  ).length;

  return (
    <AppLayout>
      {/* Header */}
      <div className="page-header mb-4">
        <div>
          <h1 className="page-title">Kanban Panosu</h1>
          <p className="page-subtitle">
            {projects.length} proje
            {totalActive > 0 && (
              <span className="text-brand-600 font-semibold ml-1">
                · {totalActive} aktif
              </span>
            )}
            {updating && (
              <span className="text-amber-500 ml-2 text-xs animate-pulse">
                Kaydediliyor...
              </span>
            )}
          </p>
        </div>

        {/* Year filter */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500 font-medium">Yıl:</label>
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="input w-24 text-sm"
          >
            {[2023, 2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
            <p className="text-xs text-gray-400">Yükleniyor...</p>
          </div>
        </div>
      ) : (
        /* Board — full-width horizontal scroll */
        <div
          className="flex gap-3 overflow-x-auto pb-4"
          style={{ minHeight: "calc(100vh - 160px)" }}
          onDragEnd={handleDragEnd}
        >
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.key}
              column={col}
              projects={getColumnProjects(col.key)}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              isDragOver={dragOverColumn === col.key}
            />
          ))}
        </div>
      )}
    </AppLayout>
  );
}
