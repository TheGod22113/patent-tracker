import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";

export async function POST(req: NextRequest) {
  const { path } = await req.json();
  if (!path || typeof path !== "string") {
    return NextResponse.json({ error: "path required" }, { status: 400 });
  }

  // Güvenlik: sadece yerel dosya yollarına izin ver
  if (path.includes("..") || path.startsWith("http")) {
    return NextResponse.json({ error: "Geçersiz yol" }, { status: 400 });
  }

  return new Promise<NextResponse>((resolve) => {
    // Windows: start komutuyla varsayılan uygulamada aç
    const cmd = `start "" "${path.replace(/"/g, '')}"`;
    exec(cmd, { shell: "cmd.exe" }, (err) => {
      if (err) {
        resolve(NextResponse.json({ error: String(err) }, { status: 500 }));
      } else {
        resolve(NextResponse.json({ ok: true }));
      }
    });
  });
}
