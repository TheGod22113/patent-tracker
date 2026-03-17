import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const MONTHS_TR = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
];

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      customer: true,
      items: {
        include: {
          project: {
            include: { outputs: true },
          },
        },
      },
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const monthName = MONTHS_TR[invoice.month - 1];
  const issueDate = invoice.issuedAt
    ? new Date(invoice.issuedAt).toLocaleDateString("tr-TR")
    : new Date(invoice.createdAt).toLocaleDateString("tr-TR");

  const statusText =
    invoice.status === "draft" ? "TASLAK" : invoice.status === "sent" ? "GÖNDERİLDİ" : "ÖDENDİ";

  // Generate HTML content for PDF
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${invoice.invoiceNo || "Fatura"}</title>
  <style>
    * { margin: 0; padding: 0; }
    body { font-family: 'Arial', sans-serif; color: #333; line-height: 1.6; }
    .page { width: 210mm; height: 297mm; padding: 20mm; background: white; box-sizing: border-box; }
    .header { display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 3px solid #7A4899; padding-bottom: 15px; }
    .company { font-size: 32px; font-weight: bold; color: #7A4899; }
    .invoice-info { text-align: right; }
    .invoice-number { font-size: 24px; font-weight: bold; color: #333; }
    .invoice-label { font-size: 12px; color: #666; }
    .details-section { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 30px; }
    .detail-box { }
    .detail-title { font-size: 11px; font-weight: bold; color: #7A4899; margin-bottom: 8px; text-transform: uppercase; }
    .detail-text { font-size: 13px; margin-bottom: 4px; }
    .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    .table thead { background: #f5f0f9; }
    .table th { padding: 10px; text-align: left; font-size: 12px; font-weight: bold; color: #7A4899; border: 1px solid #dccbee; }
    .table td { padding: 8px 10px; font-size: 12px; border: 1px solid #e0e0e0; }
    .table .amount { text-align: right; font-family: monospace; }
    .total-row td { background: #f5f0f9; font-weight: bold; }
    .total-label { text-align: right; padding-right: 10px; }
    .total-amount { font-size: 14px; color: #7A4899; }
    .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; text-align: center; font-size: 11px; color: #666; }
    @media print { body { margin: 0; padding: 0; } .page { width: 100%; height: 100%; padding: 20mm; } }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="company">JAGADAMBA</div>
      <div class="invoice-info">
        <div class="invoice-number">FATURA</div>
        <div class="invoice-label">${invoice.invoiceNo || "TASLAK"}</div>
      </div>
    </div>

    <div class="details-section">
      <div class="detail-box">
        <div class="detail-title">Müşteri</div>
        <div class="detail-text" style="font-weight: bold; font-size: 14px;">${invoice.customer.company}</div>
        <div class="detail-text">${invoice.customer.name}</div>
      </div>
      <div class="detail-box">
        <div class="detail-title">Fatura Bilgileri</div>
        <div class="detail-text"><strong>Tarih:</strong> ${issueDate}</div>
        <div class="detail-text"><strong>Dönem:</strong> ${monthName} ${invoice.year}</div>
        <div class="detail-text"><strong>Durum:</strong> ${statusText}</div>
      </div>
    </div>

    <table class="table">
      <thead>
        <tr>
          <th style="width: 25%;">Proje No</th>
          <th style="width: 50%;">Açıklama</th>
          <th style="width: 25%;" class="amount">Tutar</th>
        </tr>
      </thead>
      <tbody>
        ${invoice.items
          .map(
            (item) => `
          <tr>
            <td>${item.project.projectNo}</td>
            <td>${item.description || "-"}</td>
            <td class="amount">₺ ${Number(item.amount).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
        `
          )
          .join("")}
        <tr class="total-row">
          <td colspan="2" class="total-label">TOPLAM</td>
          <td class="amount total-amount">₺ ${Number(invoice.totalAmount).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
      </tbody>
    </table>

    <div class="footer">
      <p>Bu fatura otomatik olarak oluşturulmuştur.</p>
      <p style="margin-top: 8px;">Jagadamba Patent & Tercüme Hizmetleri</p>
    </div>
  </div>
</body>
</html>
  `;

  // Return HTML response so user can print/save as PDF from browser
  return new NextResponse(htmlContent, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
