export const LANGUAGES = [
  { code: "en", label: "İngilizce" },
  { code: "de", label: "Almanca" },
  { code: "fr", label: "Fransızca" },
  { code: "ru", label: "Rusça" },
  { code: "tr", label: "Türkçe" },
];

export const LANGUAGE_MAP: Record<string, string> = {
  en: "İngilizce",
  de: "Almanca",
  fr: "Fransızca",
  ru: "Rusça",
  tr: "Türkçe",
};

export const STATUS_MAP: Record<string, { label: string; color: string }> = {
  new: { label: "Yeni", color: "bg-gray-100 text-gray-700" },
  word_conversion: {
    label: "Word Dönüşümü",
    color: "bg-yellow-100 text-yellow-700",
  },
  translation: { label: "Tercüme", color: "bg-violet-100 text-violet-700" },
  review: { label: "İnceleme", color: "bg-purple-100 text-purple-700" },
  completed: { label: "Tamamlandı", color: "bg-green-100 text-green-700" },
  invoiced: { label: "Faturalandı", color: "bg-indigo-100 text-indigo-700" },
};

export const MONTHS_TR = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
];

export const INVOICE_STATUS_MAP: Record<string, { label: string; color: string }> = {
  draft: { label: "Taslak", color: "bg-gray-100 text-gray-700" },
  sent: { label: "Gönderildi", color: "bg-blue-100 text-blue-700" },
  paid: { label: "Ödendi", color: "bg-green-100 text-green-700" },
};

export const OUTPUT_TYPE_MAP: Record<string, string> = {
  translation: "Tercüme (Word)",
  figures: "Şekiller",
  sequence: "Sequence Dosyası",
};
