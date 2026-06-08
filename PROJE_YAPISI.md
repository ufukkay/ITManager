# ITManager Proje Yapısı 📂

Bu dosya, **ITManager** projesinin klasör yapısını, kullanılan teknolojileri, çalışma prensiplerini ve geliştirme/çalıştırma adımlarını ayrıntılı bir şekilde açıklar.

---

## 🗂️ Klasör ve Dosya Yapısı

```text
ITManager/
├── data/                 # SQLite veritabanı dosyası (itmanager.db) – Tek Kaynak Gerçekliği
├── frontend/             # Vue 3 SPA – Vite, Composition API, TailwindCSS, Pinia
│   ├── public/           # Statik dosyalar (favicon, images vb.)
│   └── src/
│       ├── assets/       # UI görselleri, ikonlar
│       ├── components/   # Yeniden kullanılabilir, premium UI bileşenleri
│       ├── router/       # Vue Router yapılandırması
│       ├── stores/       # Pinia store'ları (auth, master‑data, ui)
│       ├── views/        # Modüler sayfalar (Inventory, Monitoring, Costs, Reports...)
│       └── App.vue       # Uygulama kökü
├── src/                  # Express.js backend – API katmanı
│   ├── app.js            # Sunucu giriş noktası, middleware ayarları
│   ├── database/         # DB bağlantısı ve tablo tanımları (db.js)
│   └── modules/          # İş mantığı modülleri (core, auth, sim‑takip, monitoring ...)
│       ├── core/         # Master‑data, Delete Impact Analysis vb.
│       ├── auth/         # JWT, oturum yönetimi
│       ├── sim-takip/    # SIM kart – varlık ilişkileri
│       └── monitoring/  # Sunucu izleme, health check API'leri
├── .env                  # Ortam değişkenleri (DB yolu, JWT secret, vb.)
├── package.json          # Bağımlılık yönetimi, script tanımları
├── vite.config.js        # Frontend Vite proxy ayarları (backend yönlendirme)
└── PROJE_YAPISI.md       # Bu dosya – Proje rehberi
```

---

## ⚙️ Teknoloji Stack'i

| Katman | Teknoloji | Açıklama |
|--------|-----------|----------|
| **Backend** | Node.js (v18+), Express.js, better‑sqlite3 | Hafif, dosya‑tabanlı SQLite veritabanı; yüksek performanslı sorgular için native binding. |
| **Authentication** | JSON Web Tokens (JWT), bcrypt | Kullanıcı oturumu ve yetkilendirme. |
| **Frontend** | Vue 3 (Composition API), Vite, Pinia, TailwindCSS, DaisyUI | Modüler, tip‑güvenli, hızlı HMR geliştirme deneyimi. |
| **Database** | SQLite (itmanager.db) | Tek dosyada tüm veri – *Single Source of Truth*.
| **Dev Tools** | nodemon (backend), vite (frontend), eslint, prettier | Otomatik yeniden başlatma ve kod formatlama. |

---

## 🚀 Çalıştırma (Development) 

> **Not:** Node.js ve npm'in sistem PATH'ine eklendiğinden emin olun.

1. **Kurulum**
   ```powershell
   # Proje dizinine girin
   cd C:\Users\ufuk.kaya\Desktop\Projeler\ITManager

   # Bağımlılıkları yükle
   npm install
   # Frontend bağımlılıkları
   cd frontend
   npm install
   cd ..
   ```

2. **Backend (API) – Port 3000**
   ```powershell
   # Kök dizinde terminal açın
   npm run dev   # nodemon otomatik yeniden başlatır
   ```
   Çıktı örneği: `ITManager server running at http://localhost:3000`

3. **Frontend (UI) – Port 5173**
   ```powershell
   cd frontend
   npm run dev   # Vite Development Server
   ```
   Çıktı örneği: `VITE v5.0.0 ready in 450 ms`

4. **Tarayıcıda Aç**
   - Frontend: `http://localhost:5173`
   - Backend (API test): `http://localhost:3000/api/health`

---

## 🛠️ Önemli Modüller & Özellikler

### 🔐 Kimlik Doğrulama (`auth`)
- Kullanıcı kayıt, giriş ve JWT tabanlı token yenileme.
- `middleware/requireAuth.js` ile korunan rotalar.

### 📦 Delete Impact Analysis (`core`)
- Bir kayıt silinmeden önce tüm referansları tarar.
- Kullanıcıya etki raporu göstererek veri bütünlüğünü korur.

### 📡 SIM‑Takip (`sim‑takip`)
- SIM kartları, Personel ve Şirket ilişkileri yönetilir.
- CRUD işlemleri ve raporlama ekranları bulunur.

### 📈 Monitoring (`monitoring`)
- `/api/monitor/health` endpoint’i sistem sağlık kontrolü sunar.
- Frontend’da Dashboard bileşeni ile grafiksel izleme.

---

## 📦 Modüllerin Detaylı Açıklamaları

### core
- **Amaç:** Uygulamanın temel iş mantığını ve master‑data yönetimini sağlar.
- **Özellikler:** Delete Impact Analysis, veri bütünlüğü kontrolleri, ortak yardımcı fonksiyonlar.

### auth
- **Amaç:** Kullanıcı kimlik doğrulama ve yetkilendirme süreçlerini yönetir.
- **Özellikler:** Kayıt, giriş, JWT üretimi, token yenileme, `requireAuth` middleware.

### sim‑takip
- **Amaç:** SIM kartların, personel ve şirketlerle ilişkisini izler ve yönetir.
- **Özellikler:** CRUD API'ları, raporlama, entegrasyon testleri.

### monitoring
- **Amaç:** Sistem sağlığını izler ve raporlar.
- **Özellikler:** `/api/monitor/health` endpoint’i, performans metrikleri, frontend dashboard bileşeni.


## 🧪 Test & Kalite

- **Backend**: `npm run test` (Jest) – API unit testleri.
- **Frontend**: `npm run test:unit` (Vitest) – Vue komponent testleri.
- **Lint**: `npm run lint` – ESLint + Prettier.

---

## 📦 Dağıtım (Production) 

1. **Backend**
   ```bash
   npm run build   # production build (if configured)
   node dist/app.js   # sunucuyu çalıştır
   ```
2. **Frontend**
   ```bash
   cd frontend
   npm run build   # Vite static build → dist/
   # `dist` klasörünü bir web server (nginx, Apache) üzerinden sunun.
   ```

---

## 📚 Ekstra Bilgiler

- **Ortam Değişkenleri (`.env`)**
  ```dotenv
  PORT=3000               # Backend port
  DB_PATH=../data/itmanager.db
  JWT_SECRET=super_secret_key
  ```
- **Veritabanı** (`src/database/db.js`):
  - `assets`, `persons`, `companies`, `departments`, `costs`, `logs` gibi tablolar.
  - Migration scriptleri `npm run migrate` ile yönetilebilir.
- **Proxy** (`vite.config.js`):
  ```js
  export default defineConfig({
    server: { proxy: { '/api': 'http://localhost:3000' } }
  })
  ```

---

## 🤝 Katkı Sağlama

1. Fork yapın.
2. `feature/your-feature` dalı oluşturun.
3. Değişiklikleri test edin (`npm run lint && npm test`).
4. Pull Request gönderin – PR açıklamasında **PROJE_YAPISI.md** güncellenmişse ona da referans ekleyin.

---

*Bu dosya, projenin güncel durumu ve geliştirici rehberi olarak hizmet eder. Değişiklik yapıldıkça güncellenmelidir.*
