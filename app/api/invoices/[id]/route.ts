import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      customer: true,
      items: {
        include: {
          project: { include: { outputs: true } },
        },
      },
    },
  });
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(invoice);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const invoice = await prisma.invoice.update({
    where: { id },
    data: {
      status: body.status,
      invoiceNo: body.invoiceNo,
      issuedAt: body.issuedAt ? new Date(body.issuedAt) : null,
      paidAt: body.paidAt ? new Date(body.paidAt) : null,
      notes: body.notes !== undefined ? body.notes : undefined,
    },
  });
  return NextResponse.json(invoice);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Faturaya bağlı projeleri bul — silinince "tamamlandı" durumuna dönsünler
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { items: { select: { projectId: true } } },
    });

    if (invoice) {
      // İlgili projelerin durumunu "invoiced" → "completed" geri al
      const projectIds = invoice.items.map((i) => i.projectId);
      if (projectIds.length > 0) {
        await prisma.project.updateMany({
          where: { id: { in: projectIds }, status: "invoiced" },
          data: { status: "completed" },
        });
      }
    }

    await prisma.invoice.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Fatura silme hatası:", error);
    return NextResponse.json({ error: "Fatura silinemedi" }, { status: 500 });
  }
}
