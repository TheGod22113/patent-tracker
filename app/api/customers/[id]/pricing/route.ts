import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const pricing = await prisma.customerPricing.findMany({
    where: { customerId: id },
    orderBy: { sourceLanguage: "asc" },
  });
  return NextResponse.json(pricing);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const pricing = await prisma.customerPricing.upsert({
    where: {
      customerId_sourceLanguage_targetLanguage: {
        customerId: id,
        sourceLanguage: body.sourceLanguage,
        targetLanguage: body.targetLanguage,
      },
    },
    update: {
      pricePerThousandChars: body.pricePerThousandChars,
      pricePerFigurePage: body.pricePerFigurePage,
    },
    create: {
      customerId: id,
      sourceLanguage: body.sourceLanguage,
      targetLanguage: body.targetLanguage,
      pricePerThousandChars: body.pricePerThousandChars,
      pricePerFigurePage: body.pricePerFigurePage,
    },
  });
  return NextResponse.json(pricing, { status: 201 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const pricingId = req.nextUrl.searchParams.get("pricingId");
  if (!pricingId)
    return NextResponse.json({ error: "pricingId required" }, { status: 400 });
  await prisma.customerPricing.delete({
    where: { id: pricingId, customerId: id },
  });
  return NextResponse.json({ ok: true });
}
