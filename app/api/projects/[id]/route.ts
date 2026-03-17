import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // Önce fatura bilgisiyle dene, tablo yoksa faturasız fallback
  try {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        customer: true,
        coordinator: true,
        translator: true,
        sourceFiles: true,
        outputs: true,
        invoiceItem: { include: { invoice: true } },
      },
    });
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(project);
  } catch {
    // invoiceItem/Invoice tablosu henüz oluşturulmamış — faturasız dene
    try {
      const project = await prisma.project.findUnique({
        where: { id },
        include: {
          customer: true,
          coordinator: true,
          translator: true,
          sourceFiles: true,
          outputs: true,
        },
      });
      if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({ ...project, invoiceItem: null });
    } catch (error) {
      console.error("Proje getirme hatası:", error);
      return NextResponse.json({ error: "Proje yüklenemedi" }, { status: 500 });
    }
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await req.json();

    // Status geçmişini kaydet (status değişiyorsa — tablo yoksa atla)
    if (body.status) {
      try {
        const current = await prisma.project.findUnique({
          where: { id },
          select: { status: true },
        });
        if (current && current.status !== body.status) {
          await prisma.projectStatusHistory.create({
            data: {
              projectId: id,
              oldStatus: current.status,
              newStatus: body.status,
              changedBy: body.changedBy || "sistem",
            },
          });
        }
      } catch {
        // ProjectStatusHistory tablosu henüz oluşturulmamış — atla
      }
    }

    const project = await prisma.project.update({
      where: { id },
      data: {
        status: body.status,
        deliveryDate: body.deliveryDate ? new Date(body.deliveryDate) : undefined,
        coordinatorId: body.coordinatorId !== undefined ? (body.coordinatorId || null) : undefined,
        translatorId: body.translatorId !== undefined ? (body.translatorId || null) : undefined,
        notes: body.notes !== undefined ? (body.notes || null) : undefined,
        sourceLanguage: body.sourceLanguage,
        targetLanguage: body.targetLanguage,
      },
      include: {
        customer: true,
        coordinator: true,
        translator: true,
        sourceFiles: true,
        outputs: true,
      },
    });
    return NextResponse.json(project);
  } catch (error) {
    console.error("Proje güncelleme hatası:", error);
    return NextResponse.json({ error: "Proje güncellenemedi" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.project.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Proje silme hatası:", error);
    return NextResponse.json({ error: "Proje silinemedi" }, { status: 500 });
  }
}
