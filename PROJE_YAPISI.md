# ITManager Proje Yapısı 📂

Bu dosya, projenin klasör yapısını ve hangi dizinde neyin bulunduğunu Türkçe olarak açıklar.

## 🏗️ Genel Klasör Yapısı

```text
ITManager/
├── _archived_scripts/  # Eski/gereksiz scriptlerin arşivi (Temizlik sonrası)
├── agent/             # Uzak sunuculara kurulan izleme ajanı (Node/Electron)
├── data/              # SQLite veritabanları (simcardtracking.db ve itmanager.db)
├── frontend/          # Vue 3 tabanlı modern kullanıcı arayüzü (Vite + Tailwind)
│   ├── src/           # Vue kaynak dosyaları (components, views, composables)
│   └── public/        # Statik assetler
├── src/               # Express tabanlı Headless API (Backend)
│   ├── database/      # Veritabanı bağlantısı ve şemalar
│   └── modules/       # Modüler API yapıları (SIM Takip, Auth vb.)
├── .env               # Çevresel değişkenler (Port=3000)
├── package.json       # Backend bağımlılıkları
└── PROJE_YAPISI.md    # Bu dosya
```

## 🔍 SIM Takip Modülü Değişiklikleri
- **İlişkisel Yapı**: Artık Personeller, Departmanlar, Araçlar ve Lokasyonlar birbirine ID'ler üzerinden bağlıdır.
- **Global Departmanlar**: Departmanlar şirketlerden bağımsız global bir listeden seçilir.
- **Araç-Plaka Linki**: M2M hatları doğrudan "Araçlar" tablosuna bağlıdır; plaka değişirse tüm sistemde güncellenir.

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
