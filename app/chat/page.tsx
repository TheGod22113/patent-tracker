"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import AppLayout from "@/components/layout/AppLayout";

interface Message {
  id: string;
  content: string;
  senderName: string;
  channel: string;
  createdAt: string;
}

interface StaffMember {
  id: string;
  name: string;
  active: boolean;
}

function dmChannel(a: string, b: string) {
  return [a, b].sort().join("|");
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

function formatDay(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Bugün";
  if (d.toDateString() === yesterday.toDateString()) return "Dün";
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "long" });
}

function groupByDay(messages: Message[]) {
  const groups: { day: string; messages: Message[] }[] = [];
  for (const msg of messages) {
    const day = formatDay(msg.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.day === day) {
      last.messages.push(msg);
    } else {
      groups.push({ day, messages: [msg] });
    }
  }
  return groups;
}

// İsim için renk üret
function nameColor(name: string) {
  const colors = [
    "#7A4899", "#2563eb", "#059669", "#d97706",
    "#dc2626", "#0891b2", "#7c3aed", "#be185d",
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return colors[Math.abs(h) % colors.length];
}

function Avatar({ name, size = 8 }: { name: string; size?: number }) {
  return (
    <div
      className={`w-${size} h-${size} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`}
      style={{ background: nameColor(name), fontSize: size <= 8 ? "0.7rem" : "1rem" }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export default function ChatPage() {
  const [myName, setMyName] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [channel, setChannel] = useState("genel");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [onlineNames, setOnlineNames] = useState<Set<string>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastMsgIdRef = useRef<string | null>(null);

  // Adı session'dan veya localStorage'dan yükle
  useEffect(() => {
    // Önce auth session'dan dene
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user?.name) {
          setMyName(d.user.name);
          localStorage.setItem("chat-name", d.user.name);
        } else {
          const saved = localStorage.getItem("chat-name");
          if (saved) setMyName(saved);
        }
      })
      .catch(() => {
        const saved = localStorage.getItem("chat-name");
        if (saved) setMyName(saved);
      });

    fetch("/api/staff")
      .then((r) => r.json())
      .then((d) => setStaff(Array.isArray(d) ? d.filter((s: StaffMember) => s.active) : []))
      .catch(() => {});
  }, []);

  // İsim kaydet
  const saveName = (name: string) => {
    localStorage.setItem("chat-name", name);
    setMyName(name);
  };

  // Mesajları getir (polling)
  const fetchMessages = useCallback(async (ch: string) => {
    try {
      const res = await fetch(`/api/chat?channel=${encodeURIComponent(ch)}`);
      const data: Message[] = await res.json();
      if (Array.isArray(data)) {
        setMessages(data);
        // Online kullanıcıları hesapla (son 3 dakikada mesaj gönderenler)
        const cutoff = Date.now() - 3 * 60 * 1000;
        const online = new Set(
          data
            .filter((m) => new Date(m.createdAt).getTime() > cutoff)
            .map((m) => m.senderName)
        );
        setOnlineNames(online);
      }
    } catch { /* sessiz */ }
  }, []);

  // Kanal değişince mesajları yenile
  useEffect(() => {
    if (!myName) return;
    setMessages([]);
    lastMsgIdRef.current = null;
    fetchMessages(channel);

    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(() => fetchMessages(channel), 3000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [channel, myName, fetchMessages]);

  // Yeni mesaj gelince scroll
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last && last.id !== lastMsgIdRef.current) {
      lastMsgIdRef.current = last.id;
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Mesaj gönder
  const send = async () => {
    if (!input.trim() || !myName || sending) return;
    setSending(true);
    const content = input.trim();
    setInput("");
    try {
      await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, senderName: myName, channel }),
      });
      await fetchMessages(channel);
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch { /* sessiz */ } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  // Kanal başlığı
  const channelLabel = channel === "genel"
    ? "💬 Genel"
    : channel.split("|").find((n) => n !== myName) ?? channel;

  // DM kanalları (staff'tan türet)
  const dmStaff = staff.filter((s) => s.name !== myName);

  // İsim seçim ekranı
  if (!myName) {
    return (
      <AppLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="card p-8 w-full max-w-sm text-center">
            <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Chat'e Hoş Geldin</h2>
            <p className="text-sm text-gray-500 mb-6">Devam etmek için adını seç</p>

            {/* Personel listesinden seç */}
            {staff.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mb-4">
                {staff.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => saveName(s.name)}
                    className="flex items-center gap-2 p-3 rounded-xl border-2 border-gray-100 hover:border-brand-400 hover:bg-brand-50 transition-all text-left"
                  >
                    <Avatar name={s.name} size={8} />
                    <span className="text-sm font-medium text-gray-800 truncate">{s.name}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-2 mt-2">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && nameInput.trim() && saveName(nameInput.trim())}
                placeholder="veya isim yaz..."
                className="input flex-1 text-sm"
              />
              <button
                onClick={() => nameInput.trim() && saveName(nameInput.trim())}
                className="btn-primary"
              >
                Gir
              </button>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  const groups = groupByDay(messages);

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Mesajlaşma</h1>
          <p className="page-subtitle">
            <span className="font-medium text-brand-600">{myName}</span> olarak bağlısın
            <button
              onClick={() => { localStorage.removeItem("chat-name"); setMyName(null); }}
              className="ml-2 text-xs text-gray-400 hover:text-gray-600 underline"
            >
              değiştir
            </button>
          </p>
        </div>
      </div>

      <div className="flex gap-4 h-[calc(100vh-200px)] min-h-[500px]">

        {/* Sol panel — kanallar */}
        <div className="w-56 flex-shrink-0 flex flex-col gap-1">
          <div className="card p-3 flex-1 overflow-y-auto">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2">Kanallar</p>

            {/* Genel */}
            <button
              onClick={() => setChannel("genel")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                channel === "genel"
                  ? "bg-brand-600 text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <span className="text-base">#</span>
              <span className="font-medium">Genel</span>
            </button>

            {/* DM'ler */}
            {dmStaff.length > 0 && (
              <>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mt-4 mb-2">Doğrudan</p>
                {dmStaff.map((s) => {
                  const ch = dmChannel(myName, s.name);
                  const isOnline = onlineNames.has(s.name);
                  return (
                    <button
                      key={s.id}
                      onClick={() => setChannel(ch)}
                      className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-colors ${
                        channel === ch
                          ? "bg-brand-600 text-white"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      <div className="relative">
                        <Avatar name={s.name} size={7} />
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
                            isOnline ? "bg-emerald-400" : "bg-gray-300"
                          }`}
                        />
                      </div>
                      <span className="truncate font-medium">{s.name}</span>
                    </button>
                  );
                })}
              </>
            )}
          </div>

          {/* Kendi kartı */}
          <div className="card p-3 flex items-center gap-2">
            <div className="relative">
              <Avatar name={myName} size={8} />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white bg-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-800 truncate">{myName}</p>
              <p className="text-xs text-emerald-600">Çevrimiçi</p>
            </div>
          </div>
        </div>

        {/* Sağ panel — mesajlar */}
        <div className="flex-1 flex flex-col card overflow-hidden min-w-0">

          {/* Başlık */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3 flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm">
              {channel === "genel" ? "#" : channelLabel.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">{channelLabel}</p>
              <p className="text-xs text-gray-400">
                {channel === "genel"
                  ? `${onlineNames.size} aktif kullanıcı`
                  : onlineNames.has(channelLabel) ? "Çevrimiçi" : "Çevrimdışı"}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-gray-400">Canlı</span>
            </div>
          </div>

          {/* Mesajlar */}
          <div className="flex-1 overflow-y-auto p-4 space-y-1">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-300 gap-3">
                <svg className="w-12 h-12 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-sm">Henüz mesaj yok. İlk mesajı sen gönder!</p>
              </div>
            ) : (
              groups.map((group) => (
                <div key={group.day}>
                  {/* Gün ayırıcı */}
                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px bg-gray-100" />
                    <span className="text-xs text-gray-400 font-medium px-2">{group.day}</span>
                    <div className="flex-1 h-px bg-gray-100" />
                  </div>

                  {/* Mesajlar */}
                  {group.messages.map((msg, i) => {
                    const isMe = msg.senderName === myName;
                    const prev = group.messages[i - 1];
                    const sameAuthor = prev && prev.senderName === msg.senderName;

                    return (
                      <div
                        key={msg.id}
                        className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : ""} ${sameAuthor ? "mt-0.5" : "mt-3"}`}
                      >
                        {/* Avatar — sadece ilk mesajda veya farklı göndericideyse */}
                        <div className="w-7 flex-shrink-0">
                          {!sameAuthor && !isMe && <Avatar name={msg.senderName} size={7} />}
                        </div>

                        <div className={`flex flex-col ${isMe ? "items-end" : "items-start"} max-w-[70%]`}>
                          {/* Sender name — sadece ilk mesajda */}
                          {!sameAuthor && !isMe && (
                            <span
                              className="text-xs font-semibold mb-1 px-1"
                              style={{ color: nameColor(msg.senderName) }}
                            >
                              {msg.senderName}
                            </span>
                          )}

                          {/* Mesaj balonu */}
                          <div
                            className={`px-3 py-2 rounded-2xl text-sm leading-relaxed break-words ${
                              isMe
                                ? "text-white rounded-br-sm"
                                : "bg-gray-100 text-gray-800 rounded-bl-sm"
                            }`}
                            style={isMe ? { background: nameColor(myName) } : {}}
                          >
                            {msg.content}
                          </div>

                          {/* Saat */}
                          <span className="text-[10px] text-gray-400 mt-0.5 px-1">
                            {formatTime(msg.createdAt)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-gray-100 flex-shrink-0">
            <div className="flex items-center gap-2 bg-gray-50 rounded-xl border border-gray-200 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-400/20 transition-all px-3 py-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`${channelLabel} kanalına yaz...`}
                className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none"
                maxLength={1000}
              />
              <button
                onClick={send}
                disabled={!input.trim() || sending}
                className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-30"
                style={{ background: input.trim() ? nameColor(myName) : undefined }}
              >
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
            <p className="text-[10px] text-gray-300 mt-1.5 text-center">Enter ile gönder · Her 3 saniyede güncellenir</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
