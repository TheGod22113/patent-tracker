import { STATUS_MAP, INVOICE_STATUS_MAP } from "@/lib/constants";

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? { label: status, color: "bg-gray-100 text-gray-700" };
  return <span className={`badge ${s.color}`}>{s.label}</span>;
}

export function InvoiceStatusBadge({ status }: { status: string }) {
  const s = INVOICE_STATUS_MAP[status] ?? { label: status, color: "bg-gray-100 text-gray-700" };
  return <span className={`badge ${s.color}`}>{s.label}</span>;
}
