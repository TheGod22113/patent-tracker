import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const items = await prisma.checklistItem.findMany({
      where: { projectId: params.id },
      orderBy: { sortOrder: "asc" },
    });
    return NextResponse.json(items);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const body = await req.json();
    const { text, sortOrder } = body as { text: string; sortOrder?: number };
    if (!text) return NextResponse.json({ error: "text is required" }, { status: 400 });
    const item = await prisma.checklistItem.create({
      data: { projectId: params.id, text, sortOrder: sortOrder ?? 0 },
    });
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("Checklist ekleme hatası:", error);
    return NextResponse.json({ error: "Eklenemedi" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, completed, text } = body as { id: string; completed?: boolean; text?: string };
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    const data: Record<string, unknown> = {};
    if (completed !== undefined) data.completed = completed;
    if (text !== undefined) data.text = text;
    const item = await prisma.checklistItem.update({ where: { id }, data });
    return NextResponse.json(item);
  } catch (error) {
    console.error("Checklist güncelleme hatası:", error);
    return NextResponse.json({ error: "Güncellenemedi" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get("itemId");
    if (!itemId) return NextResponse.json({ error: "itemId is required" }, { status: 400 });
    await prisma.checklistItem.delete({ where: { id: itemId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Checklist silme hatası:", error);
    return NextResponse.json({ error: "Silinemedi" }, { status: 500 });
  }
}
