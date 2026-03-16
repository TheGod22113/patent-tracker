import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const templates = await prisma.projectTemplate.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(templates);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.name || !body.sourceLanguage || !body.targetLanguage) {
    return NextResponse.json({ error: "Required fields missing" }, { status: 400 });
  }

  const template = await prisma.projectTemplate.create({
    data: {
      name: body.name,
      sourceLanguage: body.sourceLanguage,
      targetLanguage: body.targetLanguage,
      pricePerThousandChars: body.pricePerThousandChars ?? 0,
      pricePerFigurePage: body.pricePerFigurePage ?? 0,
    },
  });
  return NextResponse.json(template, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await prisma.projectTemplate.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
