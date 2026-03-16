import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const year = req.nextUrl.searchParams.get("year");
  const pricing = await prisma.pricing.findMany({
    where: year ? { year: parseInt(year) } : undefined,
    orderBy: [{ year: "desc" }, { sourceLanguage: "asc" }],
  });
  return NextResponse.json(pricing);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const pricing = await prisma.pricing.upsert({
    where: {
      year_sourceLanguage_targetLanguage: {
        year: body.year,
        sourceLanguage: body.sourceLanguage,
        targetLanguage: body.targetLanguage,
      },
    },
    update: {
      pricePerThousandChars: body.pricePerThousandChars,
      pricePerFigurePage: body.pricePerFigurePage,
    },
    create: {
      year: body.year,
      sourceLanguage: body.sourceLanguage,
      targetLanguage: body.targetLanguage,
      pricePerThousandChars: body.pricePerThousandChars,
      pricePerFigurePage: body.pricePerFigurePage,
    },
  });
  return NextResponse.json(pricing, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await prisma.pricing.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
