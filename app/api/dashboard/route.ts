import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const year = parseInt(req.nextUrl.searchParams.get("year") ?? String(new Date().getFullYear()));
  const month = parseInt(req.nextUrl.searchParams.get("month") ?? String(new Date().getMonth() + 1));

  const now = new Date();

  // Bu hafta sonu (7 gün sonra)
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + 7);

  // Son 12 ay için başlangıç tarihi
  const twelveMonthsAgo = new Date(now);
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);

  const [
    monthProjects,
    totalByStatus,
    pendingProjects,
    overdueProjects,
    thisWeekProjects,
    monthInvoices,
    allInvoices,
  ] = await Promise.all([
    // Bu aydaki projeler
    prisma.project.count({ where: { year, month } }),
    // Durum dağılımı
    prisma.project.groupBy({
      by: ["status"],
      _count: true,
      where: { year },
    }),
    // Bekleyen projeler (tamamlanmamış)
    prisma.project.findMany({
      where: {
        status: { notIn: ["completed", "invoiced"] },
      },
      orderBy: { deliveryDate: "asc" },
      take: 10,
      include: { customer: true, coordinator: true, translator: true },
    }),
    // Gecikmiş projeler (teslim tarihi geçmiş, tamamlanmamış)
    prisma.project.findMany({
      where: {
        deliveryDate: { lt: now },
        status: { notIn: ["completed", "invoiced"] },
      },
      orderBy: { deliveryDate: "asc" },
      include: { customer: true },
    }),
    // Bu hafta teslim edilecek projeler
    prisma.project.findMany({
      where: {
        deliveryDate: { gte: now, lte: weekEnd },
        status: { notIn: ["completed", "invoiced"] },
      },
      orderBy: { deliveryDate: "asc" },
      take: 8,
      include: { customer: true },
    }),
    // Bu aydaki fatura toplamı
    prisma.invoice.aggregate({
      where: { year, month },
      _sum: { totalAmount: true },
      _count: true,
    }),
    // Son 12 ay fatura toplamları (grafik için)
    prisma.invoice.findMany({
      where: {
        createdAt: { gte: twelveMonthsAgo },
      },
      select: { year: true, month: true, totalAmount: true, status: true },
    }),
  ]);

  // Son 12 ayı hesapla (grafik veri noktaları)
  const monthlyRevenue: { year: number; month: number; total: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const total = allInvoices
      .filter((inv) => inv.year === y && inv.month === m)
      .reduce((sum, inv) => sum + inv.totalAmount, 0);
    monthlyRevenue.push({ year: y, month: m, total });
  }

  return NextResponse.json({
    monthProjects,
    totalByStatus,
    pendingProjects,
    overdueProjects,
    thisWeekProjects,
    monthInvoiceTotal: monthInvoices._sum.totalAmount ?? 0,
    monthInvoiceCount: monthInvoices._count,
    monthlyRevenue,
    year,
    month,
  });
}
