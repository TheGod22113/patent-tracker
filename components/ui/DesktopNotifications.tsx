"use client";

import { useEffect, useRef, useState } from "react";

export default function DesktopNotifications() {
  const [permission, setPermission] = useState<NotificationPermission | null>(
    null
  );
  const notifiedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    setPermission(Notification.permission);
  }, []);

  useEffect(() => {
    if (permission !== "granted" || notifiedRef.current) return;

    notifiedRef.current = true;

    fetch("/api/notifications")
      .then((r) => r.json())
      .then((data: { overdueCount?: number }) => {
        const overdueCount = data?.overdueCount ?? 0;
        if (overdueCount > 0) {
          new Notification("Gecikmiş Projeler", {
            body: `${overdueCount} proje teslim tarihini geçti!`,
            icon: "/logo.png",
          });
        }
      })
      .catch(() => {
        // Silently ignore notification fetch errors
      });
  }, [permission]);

  const requestPermission = async () => {
    const result = await Notification.requestPermission();
    setPermission(result);
  };

  if (permission !== "default") return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 bg-white border border-gray-200 shadow-lg rounded-xl px-4 py-3 text-sm text-gray-700 max-w-xs">
      <span className="text-base">🔔</span>
      <span className="flex-1">
        Masaüstü bildirimleri için izin verin
      </span>
      <button
        onClick={requestPermission}
        className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
      >
        İzin Ver
      </button>
    </div>
  );
}
