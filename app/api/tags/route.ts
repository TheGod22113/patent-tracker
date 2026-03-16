import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const tags = await prisma.tag.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { projects: true } } },
  });
  return NextResponse.json(tags);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "İsim gerekli" }, { status: 400 });
  }
  const tag = await prisma.tag.create({
    data: { name: body.name.trim(), color: body.color ?? "#7A4899" },
  });
  return NextResponse.json(tag, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, name, color } = body;
  const tag = await prisma.tag.update({
    where: { id },
    data: { name, color },
  });
  return NextResponse.json(tag);
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await prisma.tag.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
