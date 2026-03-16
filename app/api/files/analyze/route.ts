import { NextRequest, NextResponse } from "next/server";
import zlib from "zlib";

/**
 * .docx (ZIP) dosyasından sayfa sayısını okur.
 * docProps/app.xml içindeki <Pages>N</Pages> değerini döner.
 */
function readDocxPageCount(buffer: Buffer): number | null {
  try {
    let pos = 0;
    while (pos < buffer.length - 30) {
      // ZIP local file header signature: PK\x03\x04
      if (
        buffer[pos] === 0x50 && buffer[pos + 1] === 0x4b &&
        buffer[pos + 2] === 0x03 && buffer[pos + 3] === 0x04
      ) {
        const compression = buffer.readUInt16LE(pos + 8);
        const compressedSize = buffer.readUInt32LE(pos + 18);
        const fileNameLen = buffer.readUInt16LE(pos + 26);
        const extraLen = buffer.readUInt16LE(pos + 28);
        const fileName = buffer.toString("utf8", pos + 30, pos + 30 + fileNameLen);
        const dataOffset = pos + 30 + fileNameLen + extraLen;

        if (fileName === "docProps/app.xml") {
          let xmlContent: string;
          if (compression === 0) {
            xmlContent = buffer.toString("utf8", dataOffset, dataOffset + compressedSize);
          } else if (compression === 8) {
            const compressed = buffer.subarray(dataOffset, dataOffset + compressedSize);
            xmlContent = zlib.inflateRawSync(compressed).toString("utf8");
          } else {
            return null;
          }
          const match = xmlContent.match(/<Pages>(\d+)<\/Pages>/);
          if (match) return parseInt(match[1]);
          return null;
        }

        pos = dataOffset + compressedSize;
      } else {
        pos++;
      }
    }
  } catch {
    // ZIP parse hatası — sayfa sayısı bilinmiyor
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Dosya gerekli" }, { status: 400 });
    }

    const fileName = file.name;
    const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
    const buffer = Buffer.from(await file.arrayBuffer());

    let charCount: number | null = null;
    let pageCount: number | null = null;
    let fileType = "other";

    if (["doc", "docx"].includes(ext)) {
      fileType = "docx";
      // Word dosyasından metin çıkar ve karakter say
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      // Boşluksuz karakter sayısı
      const text = result.value;
      charCount = text.replace(/\s/g, "").length;
      // docProps/app.xml'den sayfa sayısını oku
      pageCount = readDocxPageCount(buffer);
    } else if (ext === "pdf") {
      fileType = "pdf";
      // PDF'den sayfa sayısını al
      const pdfParse = (await import("pdf-parse")).default;
      const pdfData = await pdfParse(buffer);
      pageCount = pdfData.numpages;
      // PDF'deki metin varsa karakter de say
      if (pdfData.text) {
        charCount = pdfData.text.replace(/\s/g, "").length;
      }
    } else if (["txt", "xml"].includes(ext)) {
      fileType = "other";
      const text = buffer.toString("utf-8");
      charCount = text.replace(/\s/g, "").length;
    } else if (["tif", "tiff", "png", "jpg", "jpeg"].includes(ext)) {
      fileType = "image";
      pageCount = 1;
    }

    return NextResponse.json({
      fileName,
      fileType,
      charCount,
      pageCount,
    });
  } catch (error) {
    console.error("Dosya analiz hatası:", error);
    return NextResponse.json(
      { error: "Dosya analiz edilemedi", detail: String(error) },
      { status: 500 }
    );
  }
}
