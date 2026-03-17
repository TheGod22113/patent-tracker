import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const notes = await prisma.projectNote.findMany({
      where: { projectId: id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(notes);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    if (!body.content?.trim()) {
      return NextResponse.json({ error: "Content required" }, { status: 400 });
    }
    const note = await prisma.projectNote.create({
      data: {
        projectId: id,
        content: body.content.trim(),
        createdBy: body.createdBy || null,
      },
    });
    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    console.error("Not ekleme hatası:", error);
    return NextResponse.json({ error: "Not eklenemedi" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const noteId = req.nextUrl.searchParams.get("noteId");
    if (!noteId) return NextResponse.json({ error: "noteId required" }, { status: 400 });
    await prisma.projectNote.deleteMany({
      where: { id: noteId, projectId: id },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Not silme hatası:", error);
    return NextResponse.json({ error: "Not silinemedi" }, { status: 500 });
  }
}
