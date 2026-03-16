import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST: Birden fazla müşteri için toplu fatura oluştur
// body: { groups: [{ customerId, year, month, projectIds: string[] }] }
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { groups } = body as {
    groups: { customerId: string; year: number; month: number; projectIds: string[] }[];
  };

  if (!groups || groups.length === 0) {
    return NextResponse.json({ error: "Grup gerekli" }, { status: 400 });
  }

  const createdInvoices = [];

  for (const group of groups) {
    if (!group.projectIds || group.projectIds.length === 0) continue;

    // Projeleri ve çıktılarını getir
    const projects = await prisma.project.findMany({
      where: { id: { in: group.projectIds } },
      include: { outputs: true },
    });

    const items = projects.map((p) => {
      const amount = p.outputs.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
      return { projectId: p.id, amount, description: p.projectNo };
    });

    const total = items.reduce((sum, i) => sum + i.amount, 0);

    // Fatura numarası oluştur
    const count = await prisma.invoice.count({
      where: { year: group.year, month: group.month },
    });
    const invoiceNo = `INV-${group.year}${String(group.month).padStart(2, "0")}-${String(count + 1).padStart(3, "0")}`;

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNo,
        customerId: group.customerId,
        year: group.year,
        month: group.month,
        totalAmount: total,
        items: { create: items },
      },
      include: {
        customer: true,
        items: { include: { project: true } },
      },
    });

    // Projeleri "invoiced" yap
    await prisma.project.updateMany({
      where: { id: { in: group.projectIds } },
      data: { status: "invoiced" },
    });

    createdInvoices.push(invoice);
  }

  return NextResponse.json({ created: createdInvoices.length, invoices: createdInvoices }, { status: 201 });
}
