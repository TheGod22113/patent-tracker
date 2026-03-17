import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const channel = req.nextUrl.searchParams.get("channel") ?? "genel";
    const after = req.nextUrl.searchParams.get("after");

    const messages = await prisma.message.findMany({
      where: {
        channel,
        ...(after ? { createdAt: { gt: new Date(after) } } : {}),
      },
      orderBy: { createdAt: "asc" },
      take: 100,
    });
    return NextResponse.json(messages);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { content, senderName, channel = "genel" } = body;
    if (!content?.trim() || !senderName?.trim()) {
      return NextResponse.json({ error: "content ve senderName zorunlu" }, { status: 400 });
    }
    const message = await prisma.message.create({
      data: {
        content: content.trim(),
        senderName: senderName.trim(),
        channel,
      },
    });
    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error("Mesaj gönderilemedi:", error);
    return NextResponse.json({ error: "Mesaj gönderilemedi" }, { status: 500 });
  }
}
