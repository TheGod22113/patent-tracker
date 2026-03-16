import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const search = req.nextUrl.searchParams.get("search") ?? "";
    const where = search
      ? {
          OR: [
            { name: { contains: search } },
            { company: { contains: search } },
          ],
        }
      : undefined;

    try {
      const customers = await prisma.customer.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { projects: true } },
          pricing: true,
        },
      });
      return NextResponse.json(customers);
    } catch {
      // CustomerPricing table may not exist yet (prisma db push not run)
      const customers = await prisma.customer.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { projects: true } },
        },
      });
      return NextResponse.json(customers.map((c: any) => ({ ...c, pricing: [] })));
    }
  } catch (error) {
    console.error("Müşteri listeleme hatası:", error);
    return NextResponse.json({ error: "Müşteriler yüklenemedi" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const customer = await prisma.customer.create({
    data: {
      name: body.name,
      company: body.company,
      email: body.email || null,
      phone: body.phone || null,
      address: body.address || null,
      notes: body.notes || null,
    },
  });
  return NextResponse.json(customer, { status: 201 });
}
