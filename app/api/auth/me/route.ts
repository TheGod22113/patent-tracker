import { NextResponse } from "next/server";
import { getSession, ensureAdminExists } from "@/lib/auth";

export async function GET() {
  try {
    // İlk çalışmada admin yoksa oluştur
    await ensureAdminExists();

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ user: null }, { status: 401 });
    }
    return NextResponse.json({ user: session });
  } catch {
    return NextResponse.json({ user: null }, { status: 401 });
  }
}
