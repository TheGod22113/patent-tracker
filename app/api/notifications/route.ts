import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const now = new Date();
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const [overdueCount, thisWeekCount, draftInvoiceCount] = await Promise.all([
    prisma.project.count({
      where: {
        deliveryDate: { lt: now },
        status: { notIn: ["completed", "invoiced"] },
      },
    }),
    prisma.project.count({
      where: {
        deliveryDate: { gte: now, lte: weekEnd },
        status: { notIn: ["completed", "invoiced"] },
      },
    }),
    prisma.invoice.count({
      where: { status: "draft" },
    }),
  ]);

  return NextResponse.json({ overdueCount, thisWeekCount, draftInvoiceCount });
}
