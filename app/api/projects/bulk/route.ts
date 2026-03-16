import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: NextRequest) {
  const body = await req.json();
  const { ids } = body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "Invalid ids" }, { status: 400 });
  }

  const deleted = await prisma.project.deleteMany({
    where: { id: { in: ids } },
  });

  return NextResponse.json({ deletedCount: deleted.count });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { ids, status } = body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "Invalid ids" }, { status: 400 });
  }

  if (!status) {
    return NextResponse.json({ error: "Status required" }, { status: 400 });
  }

  const updated = await prisma.project.updateMany({
    where: { id: { in: ids } },
    data: { status },
  });

  return NextResponse.json({ updatedCount: updated.count });
}
