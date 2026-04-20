# ITManager Proje Yapısı 📂

Bu dosya, projenin klasör yapısını ve hangi dizinde neyin bulunduğunu Türkçe olarak açıklar.

## 🏗️ Genel Klasör Yapısı

```text
ITManager/
├── data/              # SQLite veritabanı (itmanager.db - Tek Kaynak Gerçekliği)
├── frontend/          # Vue 3 modern kullanıcı arayüzü (Composition API + Tailwind)
│   ├── src/           
│   │   ├── stores/    # Pinia state yönetimi (Auth, MasterData, UI)
│   │   ├── views/     # Modüler sayfalar (Inventory, Monitoring, Costs)
│   │   └── components/# Yeniden kullanılabilir premium UI bileşenleri
│   └── public/        # Statik assetler
├── src/               # Express.js Backend (API)
│   ├── database/      # db.js - Veritabanı bağlantısı ve tablo tanımları
│   ├── modules/       # Modüler Backend mantığı
│   │   ├── core/      # Master Data zekası ve Silme Etki Analizi
│   │   ├── auth/      # Kimlik doğrulama sistemleri
│   │   ├── sim-takip/ # Telekom ve varlık ilişkilendirme
│   │   └── monitoring/# Sunucu izleme ve sağlık raporları
│   └── app.js         # Sunucu giriş noktası
├── .env               # Yapılandırma değişkenleri
├── package.json       # Bağımlılık yönetimi
└── PROJE_YAPISI.md    # Güncel proje rehberi (Şu an okuduğunuz)
```

## 🔍 Kritik Sistemler & Yenilikler

### 🛡️ Silme Etki Analizi (Delete Impact Analysis)
Sistem genelinde bir kayıt silinmeden önce veritabanı şeması dinamik olarak taranır. Silinecek kayda bağlı diğer veriler (Personel -> SIM Kart, Şirket -> Personel vb.) tespit edilerek kullanıcıya detaylı bir etki raporu sunulur. Bu sayede `FOREIGN KEY` hatalarının önüne geçilir.

### 🏢 Merkezi Master Data Yönetimi
Şirketler, Departmanlar, Masraf Yerleri, Personeller, Araçlar ve Lokasyonlar `/master-data` altındaki tek bir konsoldan yönetilir. Tüm modüller (SIM Takip, Maliyet, İzleme) bu verileri ortak bir "Tek Kaynak Gerçekliği" (Single Source of Truth) prensibiyle kullanır.

## 🚀 Projeyi Çalıştırma (KRİTİK)

Bağlantı hatası almamak için her iki terminalin de çalıştığından emin olun:

### 1️⃣ Backend (API) - Port 3000
1. Kök dizinde terminal açın.
2. `npm run dev` komutunu çalıştırın.
   - *Mesaj: "ITManager server running at http://localhost:3000" görülmelidir.*

### 2️⃣ Frontend (Arayüz) - Port 5173
1. `frontend` klasöründe terminal açın (`cd frontend`).
2. `npm run dev` komutunu çalıştırın.
   - *Mesaj: "VITE v... ready in ... ms" görülmelidir.*

---
> 💡 *Not: Login olurken "Connection Error" alıyorsanız, Backend (Port 3000) terminalinin açık ve hatasız olduğundan emin olun.*
