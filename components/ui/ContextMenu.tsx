"use client";

import { useEffect, useRef } from "react";

export type ContextMenuItemType =
  | { type: "action"; label: string; icon?: React.ReactNode; onClick: () => void; danger?: boolean }
  | { type: "header"; label: string }
  | { type: "divider" };

interface Props {
  x: number;
  y: number;
  items: ContextMenuItemType[];
  onClose: () => void;
}

export default function ContextMenu({ x, y, items, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const clickHandler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    // Delay so the right-click event that opened us doesn't immediately close us
    const t = setTimeout(() => {
      document.addEventListener("mousedown", clickHandler);
      document.addEventListener("keydown", keyHandler);
    }, 50);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", clickHandler);
      document.removeEventListener("keydown", keyHandler);
    };
  }, [onClose]);

  // Keep menu inside viewport
  const menuWidth = 220;
  const menuHeight = items.length * 36;
  const left = x + menuWidth > window.innerWidth ? x - menuWidth : x;
  const top = y + menuHeight > window.innerHeight ? y - menuHeight : y;

  return (
    <div
      ref={ref}
      style={{ position: "fixed", top, left, zIndex: 9999, minWidth: menuWidth }}
      className="bg-white rounded-xl shadow-2xl border border-gray-100 py-1.5 overflow-hidden"
    >
      {items.map((item, i) => {
        if (item.type === "divider") {
          return <div key={i} className="my-1 border-t border-gray-100" />;
        }
        if (item.type === "header") {
          return (
            <p key={i} className="px-4 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {item.label}
            </p>
          );
        }
        return (
          <button
            key={i}
            onClick={() => { item.onClick(); onClose(); }}
            className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2.5 transition-colors ${
              item.danger
                ? "text-red-600 hover:bg-red-50"
                : "text-gray-700 hover:bg-brand-50 hover:text-brand-700"
            }`}
          >
            {item.icon && <span className="w-4 h-4 opacity-60 flex-shrink-0">{item.icon}</span>}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
