import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  calculateTranslationPrice,
  calculateFiguresPrice,
} from "@/lib/utils";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();

  // Proje bilgisini al
  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: {
      sourceLanguage: true,
      targetLanguage: true,
      year: true,
      customerId: true,
    },
  });

  let totalPrice = 0;
  let unitPrice = 0;

  if (project) {
    // Önce müşteri fiyatına bak (tablo yoksa atla)
    let customerPricing = null;
    try {
      customerPricing = await prisma.customerPricing.findFirst({
        where: {
          customerId: project.customerId,
          sourceLanguage: project.sourceLanguage,
          targetLanguage: project.targetLanguage,
        },
      });
    } catch { /* CustomerPricing tablosu henüz oluşturulmamış */ }

    // Müşteri fiyatı yoksa genel fiyata bak
    const pricing = customerPricing ?? await prisma.pricing.findFirst({
      where: {
        year: project.year,
        sourceLanguage: project.sourceLanguage,
        targetLanguage: project.targetLanguage,
      },
    });

    if (pricing) {
      if (body.outputType === "figures" && body.pageCount) {
        unitPrice = pricing.pricePerFigurePage;
        totalPrice = calculateFiguresPrice(body.pageCount, pricing.pricePerFigurePage);
      } else if (body.charCount) {
        unitPrice = pricing.pricePerThousandChars;
        totalPrice = calculateTranslationPrice(body.charCount, pricing.pricePerThousandChars);
      }
    }
  }

  const output = await prisma.projectOutput.create({
    data: {
      projectId: params.id,
      outputType: body.outputType,
      fileName: body.fileName || null,
      driveLink: body.driveLink || null,
      filePath: body.filePath || null,
      charCount: body.charCount || null,
      pageCount: body.pageCount || null,
      unitPrice,
      totalPrice,
    },
  });

  return NextResponse.json(output, { status: 201 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const outputId = req.nextUrl.searchParams.get("outputId");
  if (!outputId) return NextResponse.json({ error: "outputId required" }, { status: 400 });
  await prisma.projectOutput.delete({ where: { id: outputId, projectId: params.id } });
  return NextResponse.json({ ok: true });
}
