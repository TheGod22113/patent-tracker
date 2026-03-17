import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const staff = await prisma.staff.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(staff);
  } catch (error) {
    console.error("Personel listeleme hatası:", error);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
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
  } catch (error) {
    console.error("Personel ekleme hatası:", error);
    return NextResponse.json({ error: "Personel eklenemedi" }, { status: 500 });
  }
}
