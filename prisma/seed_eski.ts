import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seed verisi ekleniyor...");

  // Personel
  const halilK = await prisma.staff.upsert({
    where: { id: "staff-halil-kosger" },
    update: {},
    create: {
      id: "staff-halil-kosger",
      name: "Halil Köşger",
      role: "both",
      email: "halil@eu-pa.com",
    },
  });

  const meralT = await prisma.staff.upsert({
    where: { id: "staff-meral-toy" },
    update: {},
    create: {
      id: "staff-meral-toy",
      name: "Meral TOY",
      role: "coordinator",
      email: "meral.toy@eu-pa.com",
    },
  });

  const meralK = await prisma.staff.upsert({
    where: { id: "staff-meral-kosger" },
    update: {},
    create: {
      id: "staff-meral-kosger",
      name: "Meral Köşger",
      role: "translator",
      email: "meral.kosger@eu-pa.com",
    },
  });

  console.log("Personel eklendi:", halilK.name, meralT.name, meralK.name);

  // Fiyat Listesi 2026
  const pricingData = [
    { source: "en", target: "tr", chars: 30, fig: 50 },
    { source: "de", target: "tr", chars: 35, fig: 50 },
    { source: "fr", target: "tr", chars: 35, fig: 50 },
    { source: "ru", target: "tr", chars: 38, fig: 50 },
    { source: "tr", target: "en", chars: 30, fig: 50 },
    { source: "tr", target: "de", chars: 35, fig: 50 },
  ];

  for (const p of pricingData) {
    await prisma.pricing.upsert({
      where: {
        year_sourceLanguage_targetLanguage: {
          year: 2026,
          sourceLanguage: p.source,
          targetLanguage: p.target,
        },
      },
      update: {},
      create: {
        year: 2026,
        sourceLanguage: p.source,
        targetLanguage: p.target,
        pricePerThousandChars: p.chars,
        pricePerFigurePage: p.fig,
      },
    });
  }

  console.log("Fiyat listesi eklendi (2026)");

  // Örnek Müşteri
  const customer = await prisma.customer.upsert({
    where: { id: "customer-abc-patent" },
    update: {},
    create: {
      id: "customer-abc-patent",
      name: "Ahmet Yılmaz",
      company: "ABC Patent Danışmanlık Ltd.",
      email: "info@abcpatent.com",
      phone: "+90 212 000 0000",
    },
  });

  console.log("Örnek müşteri eklendi:", customer.company);
  console.log("✅ Seed tamamlandı!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
