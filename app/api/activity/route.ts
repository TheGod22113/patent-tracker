import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "50");

  const [statusHistory, projectNotes, invoices, projects] = await Promise.all([
    prisma.projectStatusHistory.findMany({
      orderBy: { changedAt: "desc" },
      take: limit,
      include: { project: { include: { customer: true } } },
    }),
    prisma.projectNote.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { project: { include: { customer: true } } },
    }),
    prisma.invoice.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { customer: true },
    }),
    prisma.project.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { customer: true },
    }),
  ]);

  type ActivityItem = {
    id: string;
    type: "status_change" | "note" | "invoice" | "project_created";
    timestamp: string;
    title: string;
    description: string;
    projectId?: string;
    projectNo?: string;
    customerId?: string;
    customerName?: string;
    meta?: Record<string, string>;
  };

  const items: ActivityItem[] = [];

  for (const h of statusHistory) {
    items.push({
      id: `sh-${h.id}`,
      type: "status_change",
      timestamp: h.changedAt.toISOString(),
      title: `Durum Değişti`,
      description: `${h.oldStatus} → ${h.newStatus}`,
      projectId: h.projectId,
      projectNo: h.project.projectNo,
      customerId: h.project.customerId,
      customerName: h.project.customer.company,
      meta: { oldStatus: h.oldStatus, newStatus: h.newStatus, changedBy: h.changedBy ?? "" },
    });
  }

  for (const n of projectNotes) {
    items.push({
      id: `note-${n.id}`,
      type: "note",
      timestamp: n.createdAt.toISOString(),
      title: "Not Eklendi",
      description: n.content.slice(0, 120),
      projectId: n.projectId,
      projectNo: n.project.projectNo,
      customerId: n.project.customerId,
      customerName: n.project.customer.company,
    });
  }

  for (const inv of invoices) {
    items.push({
      id: `inv-${inv.id}`,
      type: "invoice",
      timestamp: inv.createdAt.toISOString(),
      title: "Fatura Oluşturuldu",
      description: `${inv.invoiceNo ?? "—"} · ${inv.totalAmount.toLocaleString("tr-TR", { style: "currency", currency: "TRY" })}`,
      customerId: inv.customerId,
      customerName: inv.customer.company,
    });
  }

  for (const p of projects) {
    items.push({
      id: `proj-${p.id}`,
      type: "project_created",
      timestamp: p.createdAt.toISOString(),
      title: "Proje Oluşturuldu",
      description: `${p.projectNo} · ${p.customer.company}`,
      projectId: p.id,
      projectNo: p.projectNo,
      customerId: p.customerId,
      customerName: p.customer.company,
    });
  }

  // Tarih sırasına göre sırala (en yeni önce)
  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return NextResponse.json(items.slice(0, limit));
}
