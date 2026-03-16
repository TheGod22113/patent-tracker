import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  const items = await prisma.checklistItem.findMany({
    where: { projectId: params.id },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest, { params }: Params) {
  const body = await req.json();
  const { text, sortOrder } = body as { text: string; sortOrder?: number };

  if (!text) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const item = await prisma.checklistItem.create({
    data: {
      projectId: params.id,
      text,
      sortOrder: sortOrder ?? 0,
    },
  });

  return NextResponse.json(item, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, completed, text } = body as {
    id: string;
    completed?: boolean;
    text?: string;
  };

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (completed !== undefined) data.completed = completed;
  if (text !== undefined) data.text = text;

  const item = await prisma.checklistItem.update({
    where: { id },
    data,
  });

  return NextResponse.json(item);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const itemId = searchParams.get("itemId");

  if (!itemId) {
    return NextResponse.json({ error: "itemId is required" }, { status: 400 });
  }

  await prisma.checklistItem.delete({ where: { id: itemId } });

  return NextResponse.json({ success: true });
}
