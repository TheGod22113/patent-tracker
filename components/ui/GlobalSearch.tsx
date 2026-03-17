"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/ui/Badge";

interface Customer {
  id: string;
  name: string;
  company: string;
}

interface Translator {
  id: string;
  name: string;
}

interface Project {
  id: string;
  projectNo: string;
  status: string;
  customer: Customer;
  translator: Translator | null;
}

interface SearchResults {
  projects: Project[];
  customers: Customer[];
}

export default function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>({ projects: [], customers: [] });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keyboard shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Auto-focus input when modal opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResults({ projects: [], customers: [] });
    }
  }, [open]);

  const fetchResults = useCallback(async (q: string) => {
    if (!q || q.length < 2) {
      setResults({ projects: [], customers: [] });
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data: SearchResults = await res.json();
      setResults(data);
    } catch {
      setResults({ projects: [], customers: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchResults(val);
    }, 300);
  };

  const handleProjectClick = (projectId: string) => {
    setOpen(false);
    router.push(`/projects/${projectId}`);
  };

  const handleCustomerClick = (customerId: string) => {
    setOpen(false);
    router.push(`/customers/${customerId}`);
  };

  const hasResults =
    results.projects.length > 0 || results.customers.length > 0;
  const showEmpty =
    !loading && query.length >= 2 && !hasResults;

  return (
    <>
      {/* Trigger button — fixed top-right, doesn't affect layout */}
      <button
        onClick={() => setOpen(true)}
        className="fixed top-4 right-5 z-40 flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 bg-white border border-gray-200 rounded-lg shadow-sm hover:border-brand-500 hover:text-brand-600 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-brand-600/30"
        aria-label="Ara (Ctrl+K)"
      >
        <SearchIcon className="w-4 h-4 flex-shrink-0" />
        <span className="hidden sm:inline text-left">Ara...</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs font-mono bg-gray-100 text-gray-400 rounded">
          Ctrl+K
        </kbd>
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4"
          style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
              <SearchIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={handleQueryChange}
                placeholder="Proje no, müşteri adı veya firma ara..."
                className="flex-1 text-sm text-gray-900 placeholder-gray-400 bg-transparent outline-none"
              />
              {loading && (
                <svg
                  className="w-4 h-4 text-brand-600 animate-spin flex-shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
              )}
              <button
                onClick={() => setOpen(false)}
                className="text-xs text-gray-400 hover:text-gray-600 px-1.5 py-0.5 rounded border border-gray-200 font-mono transition-colors"
              >
                Esc
              </button>
            </div>

            {/* Results */}
            <div className="max-h-96 overflow-y-auto">
              {/* Projects section */}
              {results.projects.length > 0 && (
                <section>
                  <div className="px-4 pt-3 pb-1">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Projeler
                    </span>
                  </div>
                  <ul>
                    {results.projects.map((project) => (
                      <li key={project.id}>
                        <button
                          onClick={() => handleProjectClick(project.id)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-purple-50 transition-colors text-left group"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-sm font-semibold text-[#7A4899] group-hover:text-[#5d3674]">
                                {project.projectNo}
                              </span>
                              <StatusBadge status={project.status} />
                            </div>
                            <p className="text-xs text-gray-500 truncate mt-0.5">
                              {project.customer.company}
                              {project.translator && (
                                <span className="ml-1 text-gray-400">
                                  · {project.translator.name}
                                </span>
                              )}
                            </p>
                          </div>
                          <ArrowIcon className="w-4 h-4 text-gray-300 group-hover:text-[#7A4899] flex-shrink-0 transition-colors" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Customers section */}
              {results.customers.length > 0 && (
                <section>
                  <div className="px-4 pt-3 pb-1">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Müşteriler
                    </span>
                  </div>
                  <ul>
                    {results.customers.map((customer) => (
                      <li key={customer.id}>
                        <button
                          onClick={() => handleCustomerClick(customer.id)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-purple-50 transition-colors text-left group"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 group-hover:text-[#7A4899] truncate transition-colors">
                              {customer.company}
                            </p>
                            <p className="text-xs text-gray-400 truncate">
                              {customer.name}
                            </p>
                          </div>
                          <ArrowIcon className="w-4 h-4 text-gray-300 group-hover:text-[#7A4899] flex-shrink-0 transition-colors" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Empty state */}
              {showEmpty && (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <SearchIcon className="w-8 h-8 mb-2 opacity-40" />
                  <p className="text-sm">Sonuç bulunamadı</p>
                  <p className="text-xs mt-1 text-gray-300">
                    &ldquo;{query}&rdquo; için eşleşme yok
                  </p>
                </div>
              )}

              {/* Initial hint */}
              {!loading && query.length < 2 && (
                <div className="flex items-center justify-center py-10 text-gray-300">
                  <p className="text-sm">En az 2 karakter girin...</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-gray-50 flex items-center gap-4 text-xs text-gray-300">
              <span className="flex items-center gap-1">
                <kbd className="font-mono bg-gray-100 text-gray-400 px-1 rounded">↑↓</kbd>
                gezin
              </span>
              <span className="flex items-center gap-1">
                <kbd className="font-mono bg-gray-100 text-gray-400 px-1 rounded">↵</kbd>
                seç
              </span>
              <span className="flex items-center gap-1">
                <kbd className="font-mono bg-gray-100 text-gray-400 px-1 rounded">Esc</kbd>
                kapat
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
      />
    </svg>
  );
}

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 18l6-6-6-6"
      />
    </svg>
  );
}
