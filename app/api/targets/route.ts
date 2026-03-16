import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const year = req.nextUrl.searchParams.get("year");
  const month = req.nextUrl.searchParams.get("month");

  if (year && month) {
    const target = await prisma.monthlyTarget.findUnique({
      where: { year_month: { year: parseInt(year), month: parseInt(month) } },
    });
    return NextResponse.json(target ?? { year: parseInt(year), month: parseInt(month), target: 0 });
  }

  const targets = await prisma.monthlyTarget.findMany({
    where: year ? { year: parseInt(year) } : undefined,
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });
  return NextResponse.json(targets);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { year, month, target } = body;

  const record = await prisma.monthlyTarget.upsert({
    where: { year_month: { year, month } },
    update: { target },
    create: { year, month, target },
  });
  return NextResponse.json(record);
}
