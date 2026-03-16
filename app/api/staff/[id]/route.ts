import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const staff = await prisma.staff.update({
    where: { id: params.id },
    data: {
      name: body.name,
      role: body.role,
      email: body.email || null,
      phone: body.phone || null,
      active: body.active ?? true,
    },
  });
  return NextResponse.json(staff);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  await prisma.staff.update({
    where: { id: params.id },
    data: { active: false },
  });
  return NextResponse.json({ ok: true });
}
