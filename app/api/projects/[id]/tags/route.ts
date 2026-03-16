import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const tags = await prisma.projectTag.findMany({
    where: { projectId: params.id },
    include: { tag: true },
  });
  return NextResponse.json(tags.map((pt) => pt.tag));
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { tagId } = body;
  await prisma.projectTag.upsert({
    where: { projectId_tagId: { projectId: params.id, tagId } },
    update: {},
    create: { projectId: params.id, tagId },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const tagId = req.nextUrl.searchParams.get("tagId");
  if (!tagId) return NextResponse.json({ error: "tagId required" }, { status: 400 });
  await prisma.projectTag.delete({
    where: { projectId_tagId: { projectId: params.id, tagId } },
  });
  return NextResponse.json({ ok: true });
}
