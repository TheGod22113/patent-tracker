import { PrismaClient } from '@prisma/client'

async function migrate() {
  // 1. Google Drive'daki SQLite (Kaynak)
  const sqlite = new PrismaClient({
    datasources: { db: { url: "file:G:/Drive'ım/patent-tracker-db/patent.db" } }
  })

  // 2. Railway PostgreSQL (Hedef) 
  // BURAYA DİKKAT: Alttaki tırnak içine Railway'den aldığın "External Connection URL" linkini yapıştır!
// seed.ts içinde pg kısmını şu şekilde güncelle:
const pg = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:QtYllFMaUjMZaAQCNLmzWhWHtQuRChth@interchange.proxy.rlwy.net:51556/railway"
    }
  }
})

  console.log('🚀 Veri göçü başlıyor...');

  try {
    console.log('📦 Temel tablolar aktarılıyor...');
    
    const customers = await sqlite.customer.findMany();
    for (const item of customers) await pg.customer.create({ data: item });

    const staff = await sqlite.staff.findMany();
    for (const item of staff) await pg.staff.create({ data: item });

    const tags = await sqlite.tag.findMany();
    for (const item of tags) await pg.tag.create({ data: item });

    const monthlyTargets = await sqlite.monthlyTarget.findMany();
    for (const item of monthlyTargets) await pg.monthlyTarget.create({ data: item });

    const pricing = await sqlite.pricing.findMany();
    for (const item of pricing) await pg.pricing.create({ data: item });

    console.log('📂 Projeler ve detaylar aktarılıyor...');
    
    const projects = await sqlite.project.findMany();
    for (const item of projects) await pg.project.create({ data: item });

    const projectFiles = await sqlite.projectFile.findMany();
    for (const item of projectFiles) await pg.projectFile.create({ data: item });

    const projectOutputs = await sqlite.projectOutput.findMany();
    for (const item of projectOutputs) await pg.projectOutput.create({ data: item });

    console.log('💰 Faturalar aktarılıyor...');
    
    const invoices = await sqlite.invoice.findMany();
    for (const item of invoices) await pg.invoice.create({ data: item });

    const invoiceItems = await sqlite.invoiceItem.findMany();
    for (const item of invoiceItems) await pg.invoiceItem.create({ data: item });

    console.log('📝 Notlar ve geçmiş verileri aktarılıyor...');
    
    const histories = await sqlite.projectStatusHistory.findMany();
    for (const item of histories) await pg.projectStatusHistory.create({ data: item });

    const timeEntries = await sqlite.timeEntry.findMany();
    for (const item of timeEntries) await pg.timeEntry.create({ data: item });

    const checklistItems = await sqlite.checklistItem.findMany();
    for (const item of checklistItems) await pg.checklistItem.create({ data: item });

    console.log('✅ Göç işlemi başarıyla tamamlandı!');
  } catch (error) {
    console.error('❌ Hata oluştu:', error);
  } finally {
    await sqlite.$disconnect();
    await pg.$disconnect();
  }
}

migrate();