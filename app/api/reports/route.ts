import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const year = parseInt(req.nextUrl.searchParams.get("year") ?? String(new Date().getFullYear()));

  const [
    allInvoices,
    allProjects,
    allStaff,
    unpaidInvoices,
  ] = await Promise.all([
    prisma.invoice.findMany({
      where: { year },
      include: { customer: true },
    }),
    prisma.project.findMany({
      where: { year },
      include: {
        customer: true,
        translator: true,
        coordinator: true,
        outputs: true,
      },
    }),
    prisma.staff.findMany({ where: { active: true } }),
    // Ödenmemiş tüm faturalar (yaşlandırma raporu için)
    prisma.invoice.findMany({
      where: { status: { not: "paid" } },
      include: { customer: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  // ── 1. Müşteri Bazlı Ciro ────────────────────────────────────────────────
  const customerMap = new Map<string, { company: string; name: string; revenue: number; projectCount: number }>();
  for (const inv of allInvoices) {
    const key = inv.customerId;
    const existing = customerMap.get(key) ?? { company: inv.customer.company, name: inv.customer.name, revenue: 0, projectCount: 0 };
    existing.revenue += inv.totalAmount;
    customerMap.set(key, existing);
  }
  for (const p of allProjects) {
    const existing = customerMap.get(p.customerId);
    if (existing) existing.projectCount += 1;
    else customerMap.set(p.customerId, { company: p.customer.company, name: p.customer.name, revenue: 0, projectCount: 1 });
  }
  const customerRevenue = [...customerMap.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // ── 2. Dil Çifti Analizi ─────────────────────────────────────────────────
  const langMap = new Map<string, { source: string; target: string; count: number; revenue: number }>();
  for (const p of allProjects) {
    const key = `${p.sourceLanguage}-${p.targetLanguage}`;
    const projectRevenue = p.outputs.reduce((s, o) => s + (o.totalPrice ?? 0), 0);
    const ex = langMap.get(key) ?? { source: p.sourceLanguage, target: p.targetLanguage, count: 0, revenue: 0 };
    ex.count += 1;
    ex.revenue += projectRevenue;
    langMap.set(key, ex);
  }
  const languagePairStats = [...langMap.values()].sort((a, b) => b.count - a.count);

  // ── 3. Tercüman Performansı ───────────────────────────────────────────────
  const translatorMap = new Map<string, { name: string; active: number; completed: number; revenue: number }>();
  for (const s of allStaff.filter((s) => ["translator", "both"].includes(s.role))) {
    translatorMap.set(s.id, { name: s.name, active: 0, completed: 0, revenue: 0 });
  }
  for (const p of allProjects) {
    if (!p.translatorId) continue;
    const entry = translatorMap.get(p.translatorId);
    if (!entry) continue;
    const rev = p.outputs.reduce((s, o) => s + (o.totalPrice ?? 0), 0);
    if (["completed", "invoiced"].includes(p.status)) entry.completed += 1;
    else entry.active += 1;
    entry.revenue += rev;
  }
  const translatorStats = [...translatorMap.values()].sort((a, b) => b.completed - a.completed);

  // ── 4. Aylık Proje Sayısı ────────────────────────────────────────────────
  const monthlyProjects: { month: number; count: number; revenue: number }[] = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    count: 0,
    revenue: 0,
  }));
  for (const p of allProjects) {
    const entry = monthlyProjects[p.month - 1];
    if (entry) entry.count += 1;
  }
  for (const inv of allInvoices) {
    const entry = monthlyProjects[inv.month - 1];
    if (entry) entry.revenue += inv.totalAmount;
  }

  // ── 5. Özet İstatistikler ────────────────────────────────────────────────
  const totalRevenue = allInvoices.reduce((s, inv) => s + inv.totalAmount, 0);
  const totalProjects = allProjects.length;
  const completedProjects = allProjects.filter((p) => ["completed", "invoiced"].includes(p.status)).length;
  const avgProjectValue = totalRevenue > 0 && completedProjects > 0 ? totalRevenue / completedProjects : 0;

  // ── 6. Fatura Yaşlandırma Raporu ─────────────────────────────────────────
  const now = new Date();
  const agingBuckets = { current: 0, days30: 0, days60: 0, days90: 0, over90: 0 };
  const agingDetails: {
    id: string;
    invoiceNo: string | null;
    company: string;
    amount: number;
    status: string;
    daysPast: number;
    issuedAt: string | null;
    createdAt: string;
  }[] = [];

  for (const inv of unpaidInvoices) {
    const refDate = inv.issuedAt ?? inv.createdAt;
    const daysPast = Math.floor((now.getTime() - new Date(refDate).getTime()) / (1000 * 60 * 60 * 24));
    if (daysPast <= 0) agingBuckets.current += inv.totalAmount;
    else if (daysPast <= 30) agingBuckets.days30 += inv.totalAmount;
    else if (daysPast <= 60) agingBuckets.days60 += inv.totalAmount;
    else if (daysPast <= 90) agingBuckets.days90 += inv.totalAmount;
    else agingBuckets.over90 += inv.totalAmount;

    agingDetails.push({
      id: inv.id,
      invoiceNo: inv.invoiceNo,
      company: inv.customer.company,
      amount: inv.totalAmount,
      status: inv.status,
      daysPast,
      issuedAt: inv.issuedAt?.toISOString() ?? null,
      createdAt: inv.createdAt.toISOString(),
    });
  }

  // ── 7. SLA Takibi ──────────────────────────────────────────────────────────
  const slaStats: {
    customerId: string;
    company: string;
    slaDeliveryDays: number;
    totalProjects: number;
    onTime: number;
    breached: number;
    avgDeliveryDays: number;
  }[] = [];

  // Müşteriler ve SLA'ları
  const customersWithSla = await prisma.customer.findMany({
    where: { slaDeliveryDays: { not: null } },
    select: { id: true, company: true, slaDeliveryDays: true },
  });

  for (const cust of customersWithSla) {
    const custProjects = allProjects.filter(
      (p) => p.customerId === cust.id && ["completed", "invoiced"].includes(p.status) && p.deliveryDate
    );
    if (custProjects.length === 0) continue;

    let onTime = 0;
    let breached = 0;
    let totalDays = 0;

    for (const p of custProjects) {
      // createdAt → deliveryDate arası kaç iş günü?
      const created = new Date(p.createdAt);
      const delivered = p.deliveryDate ? new Date(p.deliveryDate) : new Date();
      const calendarDays = Math.floor((delivered.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      // Basit iş günü hesabı (hafta sonları hariç)
      let bizDays = 0;
      const d = new Date(created);
      while (d <= delivered) {
        const dow = d.getDay();
        if (dow !== 0 && dow !== 6) bizDays++;
        d.setDate(d.getDate() + 1);
      }
      totalDays += bizDays;
      if (bizDays <= (cust.slaDeliveryDays ?? 999)) onTime++;
      else breached++;
    }

    slaStats.push({
      customerId: cust.id,
      company: cust.company,
      slaDeliveryDays: cust.slaDeliveryDays!,
      totalProjects: custProjects.length,
      onTime,
      breached,
      avgDeliveryDays: custProjects.length > 0 ? Math.round(totalDays / custProjects.length) : 0,
    });
  }

  return NextResponse.json({
    year,
    summary: { totalRevenue, totalProjects, completedProjects, avgProjectValue },
    customerRevenue,
    languagePairStats,
    translatorStats,
    monthlyProjects,
    aging: {
      buckets: agingBuckets,
      details: agingDetails.sort((a, b) => b.daysPast - a.daysPast),
      totalUnpaid: unpaidInvoices.reduce((s, i) => s + i.totalAmount, 0),
    },
    slaStats,
  });
}
