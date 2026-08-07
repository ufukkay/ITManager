# 🖥️ ITManager — Kurumsal IT Yönetim Ekosistemi

> Kurumsal IT operasyonlarını, cihaz & zimmet takibini, teknik destek biletlerini, SIM hatlarını, M365 lisanslarını ve sunucu sağlık durumlarını tek bir merkezden yöneten modern, modüler ve tam kapsamlı **Full-Stack IT Yönetim Platformu**.

[![Platform](https://img.shields.io/badge/Platform-Web%20%7C%20Desktop%20Agent-blue?style=for-the-badge&logo=electron)](https://github.com/ufukkay/ITManager)
[![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Vue.js](https://img.shields.io/badge/Vue.js-v3.x-4FC08D?style=for-the-badge&logo=vuedotjs&logoColor=white)](https://vuejs.org/)
[![Vite](https://img.shields.io/badge/Vite-v5-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![SQLite](https://img.shields.io/badge/SQLite-v3-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![Microsoft Graph API](https://img.shields.io/badge/Microsoft_Graph-Entra_ID-0078D4?style=for-the-badge&logo=microsoft)](https://learn.microsoft.com/en-us/graph/)
[![License](https://img.shields.io/badge/Lisans-Private-red?style=for-the-badge)](LICENSE)

---

## 📸 Ekran Görüntüleri & Görsel Önizlemeler

### 🏠 Ana Kumanda Paneli (Dashboard)
![Dashboard](docs/screenshots/dashboard.png)

<details>
<summary>🔍 <b>Diğer Modül Ekran Görüntüleri için Tıklayın</b></summary>

<br>

#### 📦 Envanter & Zimmet Yönetimi
![Inventory](docs/screenshots/inventory.png)

#### 🎫 IT Destek Merkezi (Helpdesk & Tickets)
![Helpdesk](docs/screenshots/helpdesk.png)

#### 🖥️ Sunucu & Altyapı Canlı İzleme (Monitoring)
![Monitoring](docs/screenshots/monitoring.png)

#### 🗄️ Master Veri Yönetimi (MDM)
![Master Data](docs/screenshots/master_data.png)

#### 📊 Raporlama & Maliyet Analitiği
![Reports](docs/screenshots/reports.png)

</details>

---

## 🏗️ Sistem Mimari Şeması

```mermaid
graph TD
    subgraph Client["💻 Kullanıcı & İstemci Katmanı"]
        WebUI["Vue 3 SPA (Vite + Pinia + TailwindCSS)"]
        Agent["ITManager Masaüstü Ajanı (Node/Electron)"]
        MobileScan["Mobil Barkod / Zimmet Doğrulama"]
    end

    subgraph Server["🚀 Express.js Backend API Engine"]
        AuthMiddleware["JWT Authentication & RBAC Middleware"]
        RateLimiter["Rate Limiting & Security Guard"]
        
        subgraph Modules["🧩 Modüler İş Mantığı Engine"]
            MDM["Master Data (Personel, Araç, Şirket)"]
            Assets["Envanter & Zimmet Motoru"]
            Helpdesk["Bilet & CSAT Yönetimi"]
            SIMEngine["SIM Hat & Fatura Parser"]
            M365Engine["M365 & License Manager"]
            MonitorEngine["Ping & Health Check Service"]
        end
    end

    subgraph Data["💾 Veri depolama & Entegrasyonlar"]
        SQLite[("SQLite3 Database (better-sqlite3)")]
        MSGraph["Microsoft Graph API (Entra ID)"]
        SMTPServer["SMTP Mail Server (Nodemailer)"]
    end

    WebUI <-->|HTTP REST / JWT| AuthMiddleware
    Agent <-->|System Telemetry API| AuthMiddleware
    MobileScan <-->|QR Audit REST| AuthMiddleware

    AuthMiddleware --> RateLimiter
    RateLimiter --> Modules

    MDM <--> SQLite
    Assets <--> SQLite
    Helpdesk <--> SQLite
    SIMEngine <--> SQLite
    MonitorEngine <--> SQLite

    M365Engine <-->|Entra ID Sync| MSGraph
    Helpdesk -->|Mail Notifications| SMTPServer
```

---

## 📋 İçindekiler

- [Öne Çıkan Modüller](#-öne-çıkan-modüller)
- [Teknoloji Yığını](#%EF%B8%8F-teknoloji-yığını)
- [Kurulum & Çalıştırma](#-kurulum--çalıştırma)
- [Proje Yapısı](#-proje-yapısı)
- [API Dokümantasyon Özet](#-api-dokümantasyon-özet)
- [Güvenlik ve Mimari](#-güvenlik-ve-mimari)
- [Lisans](#-lisans)

---

## 📦 Öne Çıkan Modüller

| Modül | Simgesi | Açıklama & Yetenekler |
|---|:---:|---|
| **Master Veri (MDM)** | 🗄️ | Şirket, Departman, Masraf Merkezi, Personel, Araç ve Sunucu master verilerinin merkezi yönetimi. Excel içe/dışa aktarım desteği. |
| **Varlık & Zimmet Takibi** | 💼 | Bilgisayar, monitör, telefon ve aksesuar zimmetleme, zimmet formu / etiketi üretici, amortisman hesaplama ve zimmet iade geçmişi. |
| **IT Destek (Helpdesk)** | 🎫 | Kullanıcı talep biletleri, öncelik sınıflandırması, teknisyen bilet havuzu atama, çözüm takibi ve otomatik CSAT anket bildirimleri. |
| **SIM Hat & Fatura Parser** | 📡 | M2M, Data ve Ses hatlarının operasyonel takibi. Operatör faturalarının (XML/Excel) otomatik çözümlenmesi ve masraf merkezlerine yansıtılması. |
| **M365 & Microsoft Graph** | 🔑 | Entra ID (Azure AD) ile canlı kullanıcı ve lisans senkronizasyonu. Atanmış / boştaki lisans maliyet analitiği. |
| **Sunucu İzleme** | 🖥️ | Cloud, Vodafone ve Yerel (Local) sunucuların ICMP Ping & TCP Port sağlık durumlarının canlı izlenmesi ve alarm paneli. |
| **İK Bildirimleri (HR)** | 📋 | Yeni işe başlayan veya ayrılan personeller için IT oryantasyon, donanım hazırlık ve hesap kapatma iş akışları. |
| **Masaüstü Ajan (Agent)** | 🤖 | İstemci cihazlara kurularak donanım/yazılım envanterini ve canlı durum bilgilerini merkeze bildiren arka plan servisi. |

---

## 🛠️ Teknoloji Yığını

### 🟢 Backend (API Server)
* **Runtime:** Node.js (v18+)
* **Framework:** Express.js (v4.18)
* **Veritabanı:** SQLite3 (`better-sqlite3` v9) — Yüksek performanslı senkron ilişkisel DB
* **Güvenlik:** JSON Web Token (JWT), `bcryptjs`, `rate-limiter-flexible`
* **Entegrasyonlar:** `@microsoft/microsoft-graph-client`, `nodemailer`, `exceljs`, `xml2js`

### 🔵 Frontend (UI Client)
* **Framework:** Vue.js 3 (Composition API `<script setup>`)
* **Build Tool:** Vite (v5)
* **State Management:** Pinia (v2)
* **Routing:** Vue Router (v4)
* **Styling:** Vanilla CSS, TailwindCSS (v3) & DaisyUI
* **Grafik & Analitik:** ApexCharts, Chart.js, XLSX Export Engine

---

## ⚡ Kurulum & Çalıştırma

### Ön Gereksinimler
- **Node.js**: v18.0.0 veya üzeri
- **npm**: v9.0.0 veya üzeri

### 1. Depoyu Klonlayın
```bash
git clone https://github.com/ufukkay/ITManager.git
cd ITManager
```

### 2. Backend Bağımlılıklarını Kurun & Yapılandırın
```bash
npm install
```

Kök dizinde `.env` dosyasını oluşturun:
```env
PORT=3001
JWT_SECRET=super-secret-key-change-in-production
RATE_LIMIT_MAX=100
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASS=your-password
MS_GRAPH_TENANT_ID=your-tenant-id
MS_GRAPH_CLIENT_ID=your-client-id
MS_GRAPH_CLIENT_SECRET=your-client-secret
```

### 3. Frontend Bağımlılıklarını Kurun
```bash
cd frontend
npm install
cd ..
```

### 4. Uygulamayı Başlatın

**Backend (Port 3001):**
```bash
npm run dev
```

**Frontend (Port 5173):**
```bash
cd frontend
npm run dev
```

Uygulamaya tarayıcınızdan `http://localhost:5173` adresinden erişebilirsiniz.

---

## 📁 Proje Yapısı

```
ITManager/
├── agent/                        # İstemci Masaüstü Ajanı (Node/Electron Telemetry)
├── docs/                         # Dokümantasyon ve Ekran Görüntüleri
│   └── screenshots/              # README UI Ekran Görselleri
├── frontend/                     # Vue 3 Frontend Uygulaması
│   ├── src/
│   │   ├── components/           # Reusable UI Bileşenleri (Table, Modal, Header)
│   │   ├── composables/          # Reusable Vue Logic
│   │   ├── layouts/              # Modül Yerleşim Şablonları
│   │   ├── router/               # Vue Router & Route Guards
│   │   ├── stores/               # Pinia State Stores
│   │   └── views/                # Modül Sayfa Görünümleri
├── scripts/                      # Veritabanı Migration & Test Scriptleri
├── src/                          # Backend Node.js API Kaynak Kodları
│   ├── app.js                    # Express Ana Sunucu Girişi
│   ├── database/                 # SQLite Şeması ve Veritabanı Bağlantısı
│   ├── middleware/               # Auth, Security & Rate Limiting
│   ├── services/                 # Mailer, MS Graph API vb. Servisler
│   └── modules/                  # Modüler API Mimarisi (Assets, Helpdesk, MDM vb.)
└── README.md
```

---

## 🔌 API Dokümantasyon Özet

| Modül | Metot | Endpoint | Açıklama |
|---|:---:|---|---|
| **Auth** | `POST` | `/api/auth/login` | Oturum açma & JWT alımı |
| **Master Data** | `GET / POST` | `/api/master-data/personnel` | Personel listeleme & yeni kayıt |
| **Assets** | `GET / POST` | `/api/assets` | Envanter kalemi ve zimmet işlemleri |
| **Helpdesk** | `GET / POST` | `/api/helpdesk/tickets` | Bilet takibi ve destek talepleri |
| **SIM Takip** | `POST` | `/api/sim/import/invoices` | Fatura XML/Excel yükleme ve eşleştirme |
| **M365** | `GET / POST` | `/api/m365/licenses` | M365 lisans ve Graph senkronizasyonu |
| **Monitoring** | `GET` | `/api/monitoring/status` | Canlı sunucu ping durumları |

---

## 🛡️ Güvenlik ve Mimari

* **JWT & RBAC Güvenliği:** Role-Based Access Control ile endpoint seviyesinde modüler erişim kısıtlaması.
* **Prepared Statements:** `better-sqlite3` ile tam SQL Injection koruması.
* **Rate Limiting & Brute Force Koruması:** `rate-limiter-flexible` middleware'i ile API katmanı koruması.
* **Audit Trail:** Tüm zimmet ve envanter değişikliklerinde tarihçe ve işlem yapan kullanıcı kaydı.

---

## 📄 Lisans

Bu proje **Özel / Kurumsal (Private)** lisans altındadır. İzinsiz kopyalanması, çoğaltılması veya ticari olarak dağıtılması yasaktır.

---

<p align="center">
  <strong>ITManager Ekosistemi</strong> · Geliştirici: <a href="https://github.com/ufukkay">ufukkay</a>
</p>
