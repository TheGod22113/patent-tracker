import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";

  if (!q || q.length < 2) {
    return NextResponse.json({ projects: [], customers: [] });
  }

  const [projects, customers] = await Promise.all([
    prisma.project.findMany({
      where: {
        OR: [
          { projectNo: { contains: q } },
          { customer: { company: { contains: q } } },
          { customer: { name: { contains: q } } },
        ],
      },
      include: {
        customer: true,
        translator: true,
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.customer.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { company: { contains: q } },
        ],
      },
      orderBy: { company: "asc" },
      take: 5,
    }),
  ]);

  return NextResponse.json({ projects, customers });
}
