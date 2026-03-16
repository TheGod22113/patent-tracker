# Patent Tercüme Takip Sistemi — Kurulum

## Gereksinimler
- Node.js 18+ (https://nodejs.org)
- Google Drive for Desktop (her iki ofiste de kurulu olmalı)

---

## İlk Kurulum (Her iki ofiste de yapılır)

### 1. Bağımlılıkları kur
```
npm install
```

### 2. Veritabanı ayarları

`.env` dosyasını açın ve `DATABASE_URL` satırını Google Drive yolunuza göre düzenleyin:

**Ofis 1 (sizin bilgisayarınız):**
```
DATABASE_URL="file:C:/Users/mobil/Google Drive/My Drive/patent-tracker-db/patent.db"
```

**Ofis 2 (diğer bilgisayar):**
```
DATABASE_URL="file:C:/Users/KULLANICI_ADI/Google Drive/My Drive/patent-tracker-db/patent.db"
```

> Google Drive klasör yolu bilgisayara göre değişir. Google Drive uygulamasını açıp dosya konumunu kontrol edin.
> `patent-tracker-db` klasörünü Google Drive'da oluşturun (bir kez).

### 3. Veritabanını oluştur
```
npm run db:push
```

### 4. Başlangıç verilerini ekle (sadece bir kez, bir bilgisayardan)
```
npm run db:seed
```
Bu komut personeli (Halil Köşger, Meral TOY, Meral Köşger) ve 2026 fiyat listesini ekler.

---

## Uygulamayı Başlatma

### Geliştirme modu (tarayıcıdan)
```
npm run dev
```
Tarayıcıda açın: **http://localhost:3001**

### Her gün başlarken
1. Google Drive'ın senkronize olduğundan emin olun
2. `npm run dev` komutu ile başlatın
3. http://localhost:3001 adresine gidin

---

## Veritabanı Yönetimi
```
npm run db:studio   # Veritabanını görsel arayüzle görüntüle
```

---

## İş Akışı Özeti

1. **Yeni Proje** → Projeler → + Yeni Proje
2. **Müşteri seç** veya önce Müşteriler sayfasından ekle
3. **Dil çifti + teslim tarihi + dosyalar** gir
4. **Personel ata** (Word dönüşümü + tercüman)
5. **Proje detayında** iş akışını ilerlet (adımlara tıkla)
6. **Çıktı ekle** → karakter sayısı/sayfa sayısı gir → fiyat otomatik hesaplanır
7. **Ay sonunda** Faturalar → + Fatura Oluştur → müşteri seç → projeleri seç
8. Fatura gönderildiğinde "Gönderildi", ödendiğinde "Ödendi" olarak işaretle

---

## Sık Sorulan Sorular

**İki kişi aynı anda çalışabilir mi?**
Evet, ancak aynı projeyi aynı anda düzenlemeyin. Biri kaydedince diğeri sayfayı yenilemeli.

**Google Drive senkronizasyonu ne kadar sürer?**
Küçük veritabanı dosyası genellikle 1-2 saniyede senkronize olur.

**Uygulamayı farklı bir portta çalıştırmak istersem?**
`package.json` dosyasında `--port 3001` kısmını değiştirin.
