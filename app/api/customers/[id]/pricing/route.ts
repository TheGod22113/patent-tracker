import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const pricing = await prisma.customerPricing.findMany({
    where: { customerId: params.id },
    orderBy: { sourceLanguage: "asc" },
  });
  return NextResponse.json(pricing);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const pricing = await prisma.customerPricing.upsert({
    where: {
      customerId_sourceLanguage_targetLanguage: {
        customerId: params.id,
        sourceLanguage: body.sourceLanguage,
        targetLanguage: body.targetLanguage,
      },
    },
    update: {
      pricePerThousandChars: body.pricePerThousandChars,
      pricePerFigurePage: body.pricePerFigurePage,
    },
    create: {
      customerId: params.id,
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
  { params }: { params: { id: string } }
) {
  const pricingId = req.nextUrl.searchParams.get("pricingId");
  if (!pricingId)
    return NextResponse.json({ error: "pricingId required" }, { status: 400 });
  await prisma.customerPricing.delete({
    where: { id: pricingId, customerId: params.id },
  });
  return NextResponse.json({ ok: true });
}
