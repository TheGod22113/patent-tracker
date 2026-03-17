import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Kaç saniye önce gönderilen mesajlar "yeni" sayılsın
const UNREAD_WINDOW_SECONDS = 300; // 5 dakika

export async function GET(req: NextRequest) {
  try {
    const since = new Date(Date.now() - UNREAD_WINDOW_SECONDS * 1000);
    const count = await prisma.message.count({
      where: {
        channel: "genel",
        createdAt: { gt: since },
      },
    });
    return NextResponse.json({ count });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
