import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const year = req.nextUrl.searchParams.get("year");
  const month = req.nextUrl.searchParams.get("month");
  const customerId = req.nextUrl.searchParams.get("customerId");

  const where: Record<string, unknown> = {};
  if (year) where.year = parseInt(year);
  if (month) where.month = parseInt(month);
  if (customerId) where.customerId = customerId;

  const invoices = await prisma.invoice.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      customer: true,
      items: {
        include: {
          project: {
            include: { outputs: true, sourceFiles: true },
          },
        },
      },
    },
  });
  return NextResponse.json(invoices);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  // body: { customerId, year, month, projectIds: string[], notes? }

  // Proje çıktılarından toplam fiyatı hesapla
  const projects = await prisma.project.findMany({
    where: { id: { in: body.projectIds } },
    include: { outputs: true },
  });

  const items = projects.map((p) => {
    const amount = p.outputs.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
    return { projectId: p.id, amount, description: p.projectNo };
  });

  const total = items.reduce((sum, i) => sum + i.amount, 0);

  // Fatura numarası oluştur
  const count = await prisma.invoice.count({
    where: { year: body.year, month: body.month },
  });
  const invoiceNo = `INV-${body.year}${String(body.month).padStart(2, "0")}-${String(count + 1).padStart(3, "0")}`;

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNo,
      customerId: body.customerId,
      year: body.year,
      month: body.month,
      totalAmount: total,
      notes: body.notes || null,
      items: {
        create: items,
      },
    },
    include: {
      customer: true,
      items: {
        include: {
          project: {
            include: { outputs: true, sourceFiles: true },
          },
        },
      },
    },
  });

  // Projelerin durumunu "invoiced" yap
  await prisma.project.updateMany({
    where: { id: { in: body.projectIds } },
    data: { status: "invoiced" },
  });

  return NextResponse.json(invoice, { status: 201 });
}
