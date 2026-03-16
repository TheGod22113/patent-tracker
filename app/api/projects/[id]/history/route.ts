import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const history = await prisma.projectStatusHistory.findMany({
    where: { projectId: params.id },
    orderBy: { changedAt: "desc" },
  });
  return NextResponse.json(history);
}
