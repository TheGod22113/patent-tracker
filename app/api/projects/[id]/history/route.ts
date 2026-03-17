import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const history = await prisma.projectStatusHistory.findMany({
      where: { projectId: id },
      orderBy: { changedAt: "desc" },
    });
    return NextResponse.json(history);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
