import type { Metadata } from "next";
import "./globals.css";
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: "Patent Tercüme Takip",
  description: "Patent tercüme proje takip sistemi",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
