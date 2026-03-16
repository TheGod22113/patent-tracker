import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const notes = await prisma.projectNote.findMany({
    where: { projectId: params.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(notes);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  if (!body.content?.trim()) {
    return NextResponse.json({ error: "Content required" }, { status: 400 });
  }

  const note = await prisma.projectNote.create({
    data: {
      projectId: params.id,
      content: body.content.trim(),
      createdBy: body.createdBy || null,
    },
  });
  return NextResponse.json(note, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const noteId = req.nextUrl.searchParams.get("noteId");
  if (!noteId) return NextResponse.json({ error: "noteId required" }, { status: 400 });

  await prisma.projectNote.deleteMany({
    where: { id: noteId, projectId: params.id },
  });
  return NextResponse.json({ ok: true });
}
