import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const staff = await prisma.staff.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(staff);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const staff = await prisma.staff.create({
    data: {
      name: body.name,
      role: body.role,
      email: body.email || null,
      phone: body.phone || null,
    },
  });
  return NextResponse.json(staff, { status: 201 });
}
