"use client";

const STEPS = [
  { key: "new", label: "Yeni", shortLabel: "Y", color: "#9CA3AF", activeColor: "#6B7280" },
  { key: "word_conversion", label: "Word", shortLabel: "W", color: "#F59E0B", activeColor: "#D97706" },
  { key: "translation", label: "Tercüme", shortLabel: "T", color: "#8B5CF6", activeColor: "#7C3AED" },
  { key: "review", label: "İnceleme", shortLabel: "İ", color: "#3B82F6", activeColor: "#2563EB" },
  { key: "completed", label: "Tamam", shortLabel: "✓", color: "#10B981", activeColor: "#059669" },
  { key: "invoiced", label: "Fatura", shortLabel: "F", color: "#6366F1", activeColor: "#4F46E5" },
];

/**
 * Mini pipeline — projeler tablosunda her satırda gösterilecek kompakt versiyon
 */
export function MiniPipeline({ status }: { status: string }) {
  const currentIdx = STEPS.findIndex((s) => s.key === status);

  return (
    <div className="flex items-center gap-0.5">
      {STEPS.map((step, idx) => {
        const done = idx < currentIdx;
        const active = idx === currentIdx;
        return (
          <div key={step.key} className="flex items-center">
            <div
              className="w-[14px] h-[14px] rounded-full flex items-center justify-center text-[7px] font-bold transition-all"
              style={{
                background: done ? step.color : active ? step.activeColor : "#E5E7EB",
                color: done || active ? "white" : "#D1D5DB",
                boxShadow: active ? `0 0 0 2px white, 0 0 0 3.5px ${step.activeColor}` : undefined,
              }}
              title={step.label}
            >
              {done ? "✓" : step.shortLabel}
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className="w-2 h-[2px]"
                style={{ background: idx < currentIdx ? step.color : "#E5E7EB" }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Toplu Pipeline Özeti — Dashboard'da tüm projelerin aşama dağılımını gösteren
 * büyük grafiksel bileşen
 */
interface PipelineSummaryProps {
  statusCounts: { status: string; count: number }[];
}

export function PipelineSummary({ statusCounts }: PipelineSummaryProps) {
  const total = statusCounts.reduce((s, c) => s + c.count, 0);
  if (total === 0) return null;

  const getCount = (key: string) => statusCounts.find((s) => s.status === key)?.count ?? 0;

  return (
    <div className="card p-5 mb-6">
      <h2 className="text-sm font-semibold text-gray-900 mb-4">Proje Süreç Hattı</h2>

      {/* Büyük pipeline görünümü */}
      <div className="flex items-stretch gap-0">
        {STEPS.map((step, idx) => {
          const count = getCount(step.key);
          const pct = total > 0 ? (count / total) * 100 : 0;

          return (
            <div key={step.key} className="flex items-center flex-1 min-w-0">
              <div className="flex flex-col items-center flex-1 min-w-0">
                {/* Daire + sayı */}
                <div className="relative mb-2">
                  <div
                    className="w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center text-white font-bold text-lg md:text-xl shadow-sm transition-all"
                    style={{
                      background: count > 0
                        ? `linear-gradient(135deg, ${step.color}, ${step.activeColor})`
                        : "#E5E7EB",
                      color: count > 0 ? "white" : "#9CA3AF",
                    }}
                  >
                    {count}
                  </div>
                  {/* Yüzde badge */}
                  {count > 0 && (
                    <span
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white"
                      style={{ background: step.activeColor }}
                    >
                      %{Math.round(pct)}
                    </span>
                  )}
                </div>
                {/* Label */}
                <span
                  className="text-[10px] md:text-xs font-medium text-center leading-tight mt-1"
                  style={{ color: count > 0 ? step.activeColor : "#9CA3AF" }}
                >
                  {step.label}
                </span>
              </div>
              {/* Bağlantı çizgisi */}
              {idx < STEPS.length - 1 && (
                <div className="flex flex-col items-center mb-6">
                  <svg width="24" height="12" viewBox="0 0 24 12" className="text-gray-300 hidden md:block">
                    <path d="M0 6h18l-4-4M18 6l-4 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="w-3 h-[2px] bg-gray-200 md:hidden" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Stacked progress bar */}
      <div className="flex h-3 rounded-full overflow-hidden mt-4">
        {STEPS.map((step) => {
          const count = getCount(step.key);
          if (count === 0) return null;
          const pct = (count / total) * 100;
          return (
            <div
              key={step.key}
              className="transition-all relative group"
              style={{
                width: `${pct}%`,
                background: `linear-gradient(135deg, ${step.color}, ${step.activeColor})`,
              }}
              title={`${step.label}: ${count} proje (%${Math.round(pct)})`}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 justify-center">
        {STEPS.map((step) => {
          const count = getCount(step.key);
          if (count === 0) return null;
          return (
            <div key={step.key} className="flex items-center gap-1.5 text-xs text-gray-500">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: step.color }} />
              <span>{step.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
