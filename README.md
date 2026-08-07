# 🖥️ ITManager

> Kurumsal IT operasyonlarını, zimmet takibini, teknik destek biletlerini, SIM hatlarını ve M365 lisanslarını tek platformda yöneten modern ve tam kapsamlı **Full-Stack IT Yönetim Ekosistemi**.

---

## 📋 İçindekiler

- [Genel Bakış](#-genel-bakış)
- [Öne Çıkan Modüller](#-öne-çıkan-modüller)
- [Teknoloji Yığını](#%EF%B8%8F-teknoloji-yığını)
- [Kurulum & Çalıştırma](#-kurulum--çalıştırma)
- [Proje Yapısı](#-proje-yapısı)
- [API Dokümantasyonu Summary](#-api-dokümantasyonu-summary)
- [Güvenlik ve Mimari](#-güvenlik-ve-mimari)
- [Lisans](#-lisans)

---

## 🌟 Genel Bakış

**ITManager**, kurum içi IT süreçlerini uçtan uca dijitalleştirmek, operasyonel yükü hafifletmek ve maliyet kontrolünü sağlamak amacıyla geliştirilmiş modüler bir web platformudur. 

Personel zimmetlerinden teknik destek biletlerine, operatör SIM kartlarından Microsoft Graph entegreli M365 lisanslarına ve canlı sunucu izlemeye kadar tüm IT varlıkları **"Tek Kaynak Gerçekliği" (Single Source of Truth)** ilkesiyle yönetilir.

![Platform](https://img.shields.io/badge/Platform-Web%20%7C%20Desktop-blue?style=flat-square)
![Node.js](https://img.shields.io/badge/Node.js-v18+-green?style=flat-square&logo=node.js)
![Vue.js](https://img.shields.io/badge/Vue.js-v3-41B883?style=flat-square&logo=vue.js)
![SQLite](https://img.shields.io/badge/Database-SQLite3-003B57?style=flat-square&logo=sqlite)
![License](https://img.shields.io/badge/License-Private-red?style=flat-square)

---

## 📦 Öne Çıkan Modüller

### 🗄️ 1. Master Veri Yönetimi (MDM)
Merkezi veri mimarisinin temel taşıdır.
- **Personel Takibi** — İletişim, departman, unvan ve lokasyon tanımları; Excel ile toplu içe/dışa aktarım.
- **Organizasyon Hiyerarşisi** — Şirket, Departman ve Masraf Merkezi eşleştirmeleri.
- **Sunucu & Araç Envanteri** — Fiziksel/sanal sunucular, IP, OS detayları ve şirket araç plakaları.
- **Lokasyonlar & Operatörler** — Genel merkez, saha lokasyonları, GSM operatör ve paket tanımları.

### 💼 2. IT Varlık & Zimmet Yönetimi (Assets & Inventory)
Şirket envanterinin uçtan uca ömrünü ve personel zimmetlerini takip eder.
- **Zimmet Takibi** — Personellere donanım (Bilgisayar, Monitör, Telefon vb.) zimmetleme ve zimmet iade süreçleri.
- **Varlık Envanteri** — Seri no, marka/model, garanti bitişi, durum (Aktif, Tamirde, Hurda) takibi.
- **Audit Logs (Denetim İzleri)** — Tüm zimmet ve donanım hareketlerinin geçmiş tarihli kayıt ve raporlaması.

### 🎫 3. Teknik Destek & Bilet Yönetimi (Helpdesk)
IT talep ve arıza yönetim sistemi.
- **Destek Biletleri (Tickets)** — Kullanıcı taleplerinin oluşturulması, önceliklendirilmesi (Düşük, Orta, Yüksek, Kritik) ve takibi.
- **Teknisyen Havuzu (Technician Pool)** — IT personelleri arasında otomatik/manuel bilet atama, durum takibi ve çözüm süreçleri.

### 📡 4. SIM Kart Takip & Otomatik Fatura Ayrıştırma
Operatör faturalarını ve kurumsal SIM hatlarını yönetir.
- **Hat Kategorizasyonu** — M2M (IoT/Telemetre), Data (Mobil İnternet) ve Ses hatlarının takibi.
- **Otomatik Fatura Eşleştirici (Invoice Matcher)** — Operatör XML/Excel faturalarının sisteme yüklenerek hat bazlı maliyet dağılımlarının yapılması.

### 🔑 5. M365 & Microsoft Graph Entegrasyonu
Microsoft 365 lisanslarının ve kullanıcı senkronizasyonunun yönetimi.
- **Microsoft Graph API Entegrasyonu** — Entra ID (Azure AD) entegrasyonu ile canlı kullanıcı ve lisans senkronizasyonu.
- **Lisans Analitiği** — Atanmış/Boştaki lisans oranları, maliyet dağılımları ve ITarian/Comodo lisans takibi.

### 🖥️ 6. Sunucu & Altyapı İzleme (Monitoring)
Altyapı sistemlerinin erişilebilirlik paneli.
- **Kategorize İzleme** — Cloud, Vodafone altyapısı ve yerel (Local) sunucuların canlı durum kontrolleri (Ping / Port kontrolü).

### 📋 7. İK Bildirimleri (HR Requests) & E-Posta
- **İşe Giriş / Çıkış Bildirimleri** — İK tarafından başlatılan IT oryantasyon ve ekipman hazırlık talepleri.
- **Otomatik Bildirimler** — SMTP (Nodemailer) altyapısı üzerinden e-posta bilgilendirmeleri.

### 📊 8. Raporlama & Analitik (Reports)
- Maliyet dağılımları, zimmet geçmişi, fatura analitiği ve modül bazlı görsel grafik raporları.

### 🤖 9. ITManager Masaüstü Ajanı (Agent)
- İstemci bilgisayarlara kurularak sistem donanım/yazılım envanterini ve canlı durum bilgilerini merkeze bildiren arka plan servisi.

---

## 🛠️ Teknoloji Yığını

### Backend
| Teknoloji | Açıklama |
|-----------|----------|
| **Node.js (v18+)** | Sunucu tarafı çalıştırma ortamı |
| **Express.js (v4)** | RESTful API web framework |
| **SQLite (better-sqlite3 v9)** | Yüksek performanslı ilişkisel veritabanı |
| **JWT (JSON Web Token)** | Güvenli kimlik doğrulama & RBAC yetkilendirme |
| **Microsoft Graph SDK** | Entra ID / M365 doğrudan API entegrasyonu |
| **Nodemailer** | E-posta bildirim servisi |
| **Rate-Limiter-Flexible** | Brute-force ve DDoS koruması |

### Frontend
| Teknoloji | Açıklama |
|-----------|----------|
| **Vue.js 3** | Composition API ile reaktif UI |
| **Vite (v8)** | Hızlı geliştirme ve derleme aracı |
| **Pinia** | Merkezi durum yönetimi (State Management) |
| **Vue Router (v4)** | SPA yönlendirme ve Route Guard güvenliği |
| **TailwindCSS (v3) & DaisyUI** | Modern, responsive UI tasarım ve bileşen kütüphanesi |
| **XLSX & Chart.js / ApexCharts** | Excel veri işleme ve analitik grafik gösterimleri |

---

## ⚡ Kurulum & Çalıştırma

### Ön Gereksinimler
- **Node.js**: v18.0.0 veya üzeri
- **npm**: v8.0.0 veya üzeri

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

**Geliştirme Modunda Başlatma:**

- **Backend (Port 3001):**
  ```bash
  npm run dev
  ```
- **Frontend (Port 5173):**
  ```bash
  cd frontend
  npm run dev
  ```

Uygulamaya tarayıcınızdan `http://localhost:5173` adresinden erişebilirsiniz.

---

## 📁 Proje Yapısı

```
ITManager/
├── agent/                        # İstemci Masaüstü Ajanı (Node/Electron)
│   ├── main.js                   # Agent giriş noktası
│   └── ui/                       # Agent kurulum ve ayar arayüzü
│
├── src/                          # Backend Kaynak Kodları
│   ├── app.js                    # Express uygulama sunucusu
│   ├── database/                 # SQLite veritabanı bağlantısı ve şemaları
│   ├── middleware/               # Auth (JWT) ve Rate Limiting middleware'leri
│   ├── services/                 # Mailer, MicrosoftGraph, vs. servisler
│   └── modules/                  # Modüler API Mimarisi
│       ├── admin/                # Kullanıcı & Rol yetkilendirme API
│       ├── assets/               # Zimmet & Envanter Yönetimi API
│       ├── auth/                 # Login & Token işlemleri
│       ├── core/                 # Master Data (Personel, Şirket, Sunucu, Araç)
│       ├── helpdesk/             # Destek talepleri & Teknisyen havuzu
│       ├── hr-requests/          # İK talep akışları API
│       ├── m365/                 # M365 & Microsoft Graph API
│       ├── monitoring/           # Sunucu ping/durum izleme API
│       ├── simcardtracking/      # SIM hatları & Fatura eşleştirme API
│       └── update/               # Sistem ve Ajan güncelleme servisi
│
├── frontend/                     # Vue.js Frontend Uygulaması
│   ├── src/
│   │   ├── components/           # Ortak UI bileşenleri (Table, Modal, Header)
│   │   ├── composables/          # Reusable logic (MasterData, Form helpers)
│   │   ├── layouts/              # Modül ana yerleşim şablonları
│   │   ├── router/               # Vue Router guard ve sayfa haritası
│   │   ├── stores/               # Pinia durum mağazaları
│   │   └── views/                # Sayfa görünümleri (Modüllere göre gruplu)
│   │       ├── cost-management/
│   │       ├── helpdesk/
│   │       ├── hr-requests/
│   │       ├── inventory/
│   │       ├── m365/
│   │       ├── master-data/
│   │       ├── reports/
│   │       └── sim-tracking/
│   └── vite.config.js
│
├── scripts/                      # Veritabanı seeding & migration scriptleri
├── DESIGN_GUIDE.md               # Tasarım standartları rehberi
└── README.md
```

---

## 🔌 API Dokümantasyonu Summary

| Modül | HTTP Metot & Endpoint | Açıklama |
|-------|-----------------------|----------|
| **Auth** | `POST /api/auth/login` | Kullanıcı girişi & JWT alımı |
| **Auth** | `GET /api/auth/me` | Oturum açmış kullanıcı profili |
| **Master Data** | `GET/POST /api/master-data/personnel` | Personel listesi & Ekleme |
| **Master Data** | `GET/POST /api/master-data/companies` | Şirket tanımları |
| **Assets** | `GET/POST /api/assets` | Envanter kalemi ve zimmet işlemleri |
| **Assets** | `GET /api/assets/audit` | Zimmet hareket geçmişi |
| **Helpdesk** | `GET/POST /api/helpdesk/tickets` | Bilet takibi ve destek talepleri |
| **Helpdesk** | `GET/POST /api/helpdesk/technicians` | Teknisyen havuzu ve bilet atama |
| **SIM Takip** | `GET/POST /api/sim/m2m`, `/data`, `/voice` | SIM kart yönetimi |
| **SIM Takip** | `POST /api/sim/import/invoices` | Fatura XML yükleme ve eşleştirme |
| **M365** | `GET/POST /api/m365/licenses` | M365 lisans ve Graph senkronizasyonu |
| **Monitoring** | `GET /api/monitoring/status` | Canlı sunucu ping durumları |

---

## 🛡️ Güvenlik ve Mimari

- **JWT Tabanlı Yetkilendirme**: Tüm hassas uç noktalar bearer token ile korunur.
- **RBAC (Role-Based Access Control)**: Admin ve Kullanıcı rolleri ile modül seviyesinde erişim kısıtlaması.
- **Rate Limiting**: `rateLimit.js` middleware ile istek sayıları sınırlandırılarak brute-force saldırılarına karşı korunur.
- **SQL Injection Koruması**: Prepared Statement mimarisine sahip `better-sqlite3` kullanımı.

---

## 📄 Lisans

Bu proje **Özel / Kurumsal (Private)** lisans altındadır. İzinsiz kopyalanması, çoğaltılması veya ticari olarak dağıtılması yasaktır.

---

<p align="center">
  <strong>ITManager Ekosistemi</strong> · Geliştirici: <a href="https://github.com/ufukkay">ufukkay</a>
</p>
