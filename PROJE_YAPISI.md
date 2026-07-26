# ITManager Proje Haritası 🗺️

Bu dosya, projenin klasör yapısını, hangi dosyanın ne işe yaradığını ve nasıl çalıştırılacağını gösteren güncel bir referanstır. Kod değiştikçe bu dosyanın da güncellenmesi gerekir.

---

## ⚡ Hızlı Başlangıç

```powershell
# Backend (kök dizinde) - http://localhost:3001
npm install
npm run dev

# Frontend (ayrı bir terminalde) - http://localhost:5173
cd frontend
npm install
npm run dev
```

Tarayıcıdan **http://localhost:5173** adresine gidin. Varsayılan giriş: `admin@itmanager.com` / `admin123`.

Vite dev server, `/auth`, `/admin/api`, `/monitoring/api`, `/sim-takip/api`, `/api/*` gibi tüm backend isteklerini otomatik olarak `http://localhost:3001`'e proxy'ler (bkz. `frontend/vite.config.js`). Bu yüzden geliştirme sırasında CORS sorunu yaşanmaz.

---

## 🗂️ Kök Dizin

| Yol | Ne işe yarar |
|---|---|
| `src/` | Backend kaynak kodu (Express.js) |
| `frontend/` | Frontend kaynak kodu (Vue 3 SPA) |
| `agent/` | Ayrı bir Electron masaüstü uygulaması — sunuculara kurulup CPU/RAM/güncelleme bilgisini `/monitoring/api/agent/report`'a raporlar. Ana projeden bağımsız çalışır, kendi `package.json`'ı vardır |
| `data/itmanager.db` | Tek SQLite veritabanı dosyası (git'e girmez) |
| `uploads/` | Kullanıcı yüklemeleri (fatura, garanti belgesi, İK fotoğrafları vb. — git'e girmez) |
| `backups/` | Manuel/otomatik veritabanı yedekleri (git'e girmez) |
| `scripts/` | Tek seferlik veritabanı migrasyon/yardımcı script'leri |
| `.env` | Ortam değişkenleri: `PORT`, `SESSION_SECRET`, `DATABASE_PATH` |
| `DESIGN_GUIDE.md` | UI/UX tasarım rehberi (renkler, tipografi, komponent kuralları) |
| `README.md` | Genel proje tanıtımı, modül listesi, kurulum |

---

## 🔧 Backend (`src/`)

```
src/
├── app.js                 # Express giriş noktası — sadece route mount + global middleware (bkz. aşağı)
├── database/
│   └── db.js               # better-sqlite3 bağlantısı + initDb() (tüm CREATE TABLE / migration'lar burada)
├── middleware/
│   └── auth.js             # requireAuth (oturum kontrolü) ve hasPermission(key) (rol/izin kontrolü)
├── services/                # Modüller-arası paylaşılan servisler
│   ├── MailerService.js       # SMTP e-posta gönderimi (İK bildirimleri, alarm mailleri)
│   ├── MailFetcherService.js  # IMAP ile gelen kutusunu periyodik tarama
│   ├── MicrosoftGraphService.js # M365/Entra ID senkronizasyonu (Graph API)
│   └── auditService.js        # Genel audit_logs kaydı yardımcı fonksiyonu
└── modules/                 # Her modül kendi route + controller + (varsa) service dosyalarını barındırır
    ├── auth/                  # Giriş/çıkış, JWT/session üretimi
    ├── admin/                 # Kullanıcı-rol yönetimi, izin matrisi, kullanıcı aktif/pasif + şifre sıfırlama
    ├── core/                  # Master Data: şirket, departman, masraf merkezi, personel, sunucu, lokasyon, operatör/paket CRUD + "Delete Impact Analysis"
    ├── assets/                # Envanter (zimmet) yönetimi — bkz. aşağıdaki alt bölüm
    ├── m365/                  # Microsoft 365 lisans takibi (Graph senkronizasyonu dahil)
    ├── monitoring/            # Sunucu sağlık izleme; `agent/` uygulamasından gelen raporları karşılar
    ├── simcardtracking/       # SIM kart (M2M/Data/Ses) hat yönetimi, operatör fatura içe aktarma/eşleştirme
    ├── hr-requests/           # İK: işe giriş/çıkış, donanım talebi bildirimleri (fotoğraf yükleme + mail tetikleme)
    ├── helpdesk/               # IT Destek Merkezi: ticket, teknisyen havuzu, SLA/CSAT
    └── update/                # Uygulama sürüm/güncelleme kontrolü
```

### `assets` modülü — controller ayrımı
`controller.js` eskiden 1271 satırlık tek dosyaydı; artık `controllers/` altında concern'e göre bölünmüş, `controllers/index.js` hepsini tek objede birleştirip `routes.js`'e sunuyor:

| Dosya | İçerik |
|---|---|
| `crud.controller.js` | Varlık listeleme/ekleme/güncelleme/silme |
| `checkout.controller.js` | Zimmetleme / iade (checkout-checkin) |
| `history.controller.js` | İşlem logları, notlar |
| `analytics.controller.js` | Finansal özet, matrix analitik |
| `personnel-assets.controller.js` | "Benim zimmetlerim" ve personel bazlı zimmet listesi |
| `metadata.controller.js` | Kategori/marka/model/durum tanımları |
| `label-templates.controller.js` | Termal etiket şablonları |
| `form-templates.controller.js` | A4 zimmet form şablonları |
| `audit.controller.js` | QR/barkod ile saha sayımı (envanter denetimi) akışı |

### Route yetkilendirme deseni
Her modülün `routes.js`/`routes/index.js` dosyası, kendi başında `router.use(hasPermission('...'))` ile o modülün genel erişim iznini tanımlar; yazma işlemleri (`POST`/`PUT`/`DELETE`) ayrıca rota bazında daha spesifik bir izin (`asset:edit`, `hr:edit` gibi) ister. `app.js` sadece hangi path'in hangi router'a gittiğini listeler — yetki mantığı barındırmaz.

---

## 🎨 Frontend (`frontend/src/`)

```
frontend/src/
├── main.js, App.vue        # Uygulama girişi ve kök layout
├── api/                     # axios instance (base URL, interceptor'lar)
├── router/                  # Vue Router — tüm route'lar lazy-load (dynamic import), meta.permission ile korunuyor
├── stores/                  # Pinia store'ları
│   ├── auth.js                # Giriş yapan kullanıcı, izinler
│   ├── masterData.js          # Şirket/departman/personel/araç/lokasyon/sunucu/lisans vb. veri + CRUD action'ları
│   └── assetStore.js          # Envanter modülüne özel state
├── composables/              # Bileşenler arası paylaşılan mantık
│   ├── useToast.js             # Bildirim (toast) sistemi
│   ├── useConfirm.js           # Onay modalı (silme vb. için)
│   ├── useTableFilter.js        # AppTable filtreleme mantığı
│   ├── useSimApi.js             # SIM takip modülüne özel API çağrıları
│   └── useMasterDataListPage.js # Basit CRUD liste ekranları için ortak loading/modal/kaydet/sil akışı (bkz. aşağı)
├── components/               # Paylaşılan UI bileşenleri (AppTable, AppHeader, AppConfirmModal, modal'lar vb.)
├── layouts/                   # Sayfa düzeni bileşenleri (sidebar + içerik gibi)
└── views/                    # Modüle göre klasörlenmiş sayfalar
    ├── master-data/             # Şirket/departman/personel/araç/lokasyon/sunucu/operatör-paket/izin ekranları
    ├── inventory/                # Envanter listesi, kişi bazlı zimmet, denetim, matrix, etiket/form tasarımcı
    ├── sim-tracking/             # M2M/Data/Ses hat ekranları, fatura transferi
    ├── m365/                     # Lisans ve Entra ayarları
    ├── hr-requests/              # İK talep ekranları
    ├── cost-management/          # Fatura ve maliyet dağıtım raporları
    ├── helpdesk/                 # Ticket detay, teknisyen havuzu, ayarlar, CSAT
    ├── reports/                  # Amortisman, envanter matrix, audit log raporları
    └── DashboardView.vue, LoginView.vue, MonitoringView.vue vb. — üst seviye tekil sayfalar
```

### `useMasterDataListPage` composable
`master-data` altındaki basit CRUD liste ekranlarının (Araçlar, Lokasyonlar gibi) hepsi aynı iskeleti tekrarlıyordu: yükleniyor durumu, ekle/düzenle modalı, kaydet, ve "etki analizi + onay + sil" akışı. Bu composable bu tekrarı tek yerde topluyor. Şu an `VehicleListView.vue` ve `LocationListView.vue` bunu kullanıyor; `ServiceListView`/`ServerListView`/`SimCardListView` henüz taşınmadı (daha fazla özel state taşıdıkları için ayrı bir adımda ele alınacak).

---

## 🗄️ Veritabanı
Tek dosya: `data/itmanager.db` (SQLite, `better-sqlite3` ile). Şema `src/database/db.js` içindeki `initDb()` fonksiyonunda tanımlı — her sunucu başlangıcında çalışır, eksik tablo/kolon varsa oluşturur/ekler (idempotent migration mantığı, ayrı migration dosyaları yok).

---

## 🖥️ Üretim Dağıtımı — IIS + iisnode

Uygulama üretimde bir Windows Server üzerinde **IIS + iisnode** ile çalıştırılır. Node/Express tek başına hem API'yi hem statik frontend build'ini sunar; IIS sadece iisnode üzerinden tüm istekleri `src/app.js`'e yönlendirir (bkz. kök dizindeki `web.config`).

**Sunucuda tek seferlik kurulum adımları** (bunlar sunucu erişimi gerektirir, buradan otomatikleştirilemez):
1. IIS rolü + **URL Rewrite** modülü + **iisnode** modülü kurulu olmalı.
2. Bu repo bir klasöre çekilir (`git clone` veya zip), `npm install` ve `cd frontend && npm install && npm run build` en az bir kez elle çalıştırılır (`frontend/dist` oluşmalı).
3. `.env` dosyası oluşturulur (bkz. `.env.example`).
4. IIS'te bu klasörü gösteren bir site/uygulama tanımlanır; Application Pool **"No Managed Code"** olmalı.
5. Siteye ilk istek atıldığında iisnode `src/app.js`'i başlatır; loglar `iisnode-logs/` klasöründe oluşur (git'e girmez).

**Kendi kendini güncelleme**: Admin panelindeki "Sistem Güncelleme" ekranından tetiklenen güncelleme akışı otomatik DB yedeği alır, `git reset --hard origin/main` ile kodu günceller, backend+frontend bağımlılıklarını kurar, frontend'i yeniden derler ve `web.config`'in değişiklik zamanını güncelleyerek iisnode'un process'i yeniden başlatmasını (recycle) tetikler. Detaylar için `src/modules/update/controller.js`.

---

## 📌 Bilinen Sınırlamalar (harita doğruluğu için not edilmeli)
- `InventoryView.vue`, `TicketDetailView.vue`, `PersonnelAssetsView.vue` hâlâ 1000+ satırlık büyük, bölünmemiş dosyalar.
- `getAuditCampaigns`/`getAuditLiveStats` (assets/audit) endpoint'lerinde önceden var olan bir sorgu hatası var (`u.name` yerine `u.full_name` olmalı).
- Otomatik test suite yok (`npm test` sadece stub).
