import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const year = parseInt(req.nextUrl.searchParams.get("year") ?? String(new Date().getFullYear()));

  const [
    allInvoices,
    allProjects,
    allStaff,
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

  return NextResponse.json({
    year,
    summary: { totalRevenue, totalProjects, completedProjects, avgProjectValue },
    customerRevenue,
    languagePairStats,
    translatorStats,
    monthlyProjects,
  });
}
