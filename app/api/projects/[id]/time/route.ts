import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const entries = await prisma.timeEntry.findMany({
    where: { projectId: params.id },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  if (!body.minutes || body.minutes <= 0) {
    return NextResponse.json({ error: "Geçerli bir süre girin" }, { status: 400 });
  }
  const entry = await prisma.timeEntry.create({
    data: {
      projectId: params.id,
      description: body.description ?? null,
      minutes: parseInt(body.minutes),
      staffName: body.staffName ?? null,
      date: body.date ? new Date(body.date) : new Date(),
    },
  });
  return NextResponse.json(entry, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const entryId = req.nextUrl.searchParams.get("entryId");
  if (!entryId) return NextResponse.json({ error: "entryId required" }, { status: 400 });
  await prisma.timeEntry.deleteMany({ where: { id: entryId, projectId: params.id } });
  return NextResponse.json({ ok: true });
}
