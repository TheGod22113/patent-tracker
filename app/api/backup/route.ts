import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const [customers, staff, projects, invoices, pricing, templates] =
    await Promise.all([
      prisma.customer.findMany(),
      prisma.staff.findMany(),
      prisma.project.findMany({
        include: {
          outputs: true,
          sourceFiles: true,
        },
      }),
      prisma.invoice.findMany({
        include: {
          items: true,
        },
      }),
      prisma.pricing.findMany(),
      prisma.projectTemplate.findMany(),
    ]);

  return NextResponse.json({
    exportedAt: new Date().toISOString(),
    customers,
    staff,
    projects,
    invoices,
    pricing,
    templates,
  });
}
