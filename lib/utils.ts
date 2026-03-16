import { MONTHS_TR } from "./constants";

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = new Date(date);
  return d.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function getMonthName(month: number): string {
  return MONTHS_TR[month - 1] || "";
}

export function generateProjectNo(
  year: number,
  month: number,
  count: number
): string {
  const seq = String(count).padStart(3, "0");
  return `${year}-${String(month).padStart(2, "0")}-${seq}`;
}

export function calculateTranslationPrice(
  charCount: number,
  pricePerThousand: number
): number {
  return Math.ceil(charCount / 1000) * pricePerThousand;
}

export function calculateFiguresPrice(
  pageCount: number,
  pricePerPage: number
): number {
  return pageCount * pricePerPage;
}
