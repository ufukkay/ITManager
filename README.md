# 🖥️ ITManager

> Kurumsal IT operasyonlarını tek platformda yöneten, modern ve tam kapsamlı bir web yönetim uygulaması.

---

## 📋 İçindekiler

- [Genel Bakış](#genel-bakış)
- [Modüller](#modüller)
- [Teknoloji Yığını](#teknoloji-yığını)
- [Kurulum](#kurulum)
- [Kullanım](#kullanım)
- [Proje Yapısı](#proje-yapısı)
- [API Dokümantasyonu](#api-dokümantasyonu)

---

## 🌟 Genel Bakış

ITManager, kurum içi IT süreçlerini dijitalleştirerek merkezi bir yönetim konsolu sunan **full-stack** bir web uygulamasıdır. Personel takibinden sunucu izlemeye, SIM kart yönetiminden lisans optimizasyonuna kadar tüm IT operasyonlarını tek çatı altında toplar.

![Platform](https://img.shields.io/badge/Platform-Web-blue?style=flat-square)
![Node.js](https://img.shields.io/badge/Node.js-v18+-green?style=flat-square&logo=node.js)
![Vue.js](https://img.shields.io/badge/Vue.js-v3-41B883?style=flat-square&logo=vue.js)
![License](https://img.shields.io/badge/License-Private-red?style=flat-square)

---

## 📦 Modüller

### 🗄️ Sistem Master Veri (MDM)
Tüm modüller tarafından paylaşılan merkezi veri havuzu. "Tek Kaynak Gerçekliği" ilkesiyle çalışır.
- **Personel Listesi** — Çalışan iletişim ve departman bilgileri, Excel toplu yükleme
- **Organizasyon Yapısı** — Şirket, Departman ve Masraf Merkezi hiyerarşisi
- **Sunucu Envanteri** — Fiziksel/sanal sunucular, IP, OS bilgileri, şirket maliyet paylaşımı
- **Araç Envanteri** — Şirket araçları ve plaka kayıtları
- **Lokasyonlar** — Ofis, depo ve saha lokasyon tanımları
- **Operatör & Paketler** — GSM operatörleri ve hizmet paket tanımları

### 📡 SIM Kart Takip
Operatör bazlı kurumsal hat yönetim sistemi.
- **M2M Hatları** — IoT ve telemetre SIM kartları
- **Data Hatları** — Mobil internet hatları
- **Ses Hatları** — Kurumsal sesli iletişim hatları
- Operatör fatura yükleme ve otomatik ayrıştırma

### 🔑 M365 Lisans Yönetimi
Microsoft 365 ve diğer kurumsal lisansların takibi.
- Lisans havuzu ve kullanım analizi
- Şirket/departman bazlı lisans dağılımı
- ITarian (Comodo) lisans takibi

### 🖥️ Sunucu İzleme
Altyapı sistem sağlığı paneli.
- **Cloud** sunucular
- **Vodafone** altyapısı
- **Local** sunucular
- Canlı durum takibi

### 📋 İK Bildirimleri
İnsan Kaynakları ile IT arasındaki köprü.
- İşe giriş/çıkış talepleri
- Donanım talepleri
- Otomatik e-posta bildirimleri (SMTP entegrasyonu)

### 👥 Yetki Yönetimi
Kullanıcı ve rol bazlı erişim kontrolü (RBAC).
- Kullanıcı oluşturma ve rol atama
- Granüler modül bazlı yetki yönetimi
- Admin / Standart Kullanıcı rolleri

### 💰 Maliyet Dağıtımı
Operatör faturalarının şirket/masraf merkezi bazlı yansıtılması.

---

## 🛠️ Teknoloji Yığını

### Backend
| Teknoloji | Versiyon | Kullanım |
|-----------|----------|----------|
| Node.js | v18+ | Runtime |
| Express.js | v4 | Web framework |
| SQLite (better-sqlite3) | v9 | Veritabanı |
| JWT | - | Kimlik doğrulama |
| Nodemailer | v6 | E-posta servisi |
| Nodemon | v3 | Geliştirme hot-reload |

### Frontend
| Teknoloji | Versiyon | Kullanım |
|-----------|----------|----------|
| Vue.js | v3 | UI Framework |
| Vite | v8 | Build tool |
| Pinia | v2 | State management |
| Vue Router | v4 | SPA routing |
| TailwindCSS | v3 | Utility-first CSS |
| DaisyUI | v4 | Komponent kütüphanesi |
| XLSX | - | Excel import/export |
| Font Awesome | v6 | İkonlar |

---

## ⚡ Kurulum

### Gereksinimler
- Node.js v18+
- npm v8+

### 1. Projeyi Klonlayın
```bash
git clone https://github.com/ufukkay/ITManager.git
cd ITManager
```

### 2. Backend Bağımlılıklarını Kurun
```bash
npm install
```

### 3. Ortam Değişkenlerini Yapılandırın
```bash
# .env dosyası oluşturun
cp .env.example .env
```

`.env` içeriği:
```env
PORT=3001
JWT_SECRET=your-super-secret-key-here
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=yourpassword
```

### 4. Frontend Bağımlılıklarını Kurun
```bash
cd frontend
npm install
cd ..
```

### 5. Uygulamayı Başlatın

**Backend (Port 3001):**
```bash
npm run dev
```

**Frontend (Port 5173):**
```bash
cd frontend
npm run dev
```

Tarayıcıdan `http://localhost:5173` adresine gidin.

---

## 🚀 Kullanım

### Varsayılan Giriş Bilgileri
```
E-posta: admin@itmanager.com
Şifre:   admin123
```

> ⚠️ İlk girişten sonra şifrenizi değiştirmeniz önerilir.

### İlk Kurulum Akışı
1. **Yetki Yönetimi** → Kullanıcıları oluşturun
2. **Master Veri** → Şirket ve departmanları tanımlayın
3. **Master Veri** → Personeli Excel ile toplu yükleyin
4. **SIM Takip** → Operatör ve paket tanımlarını yapın
5. **Lisans Yönetimi** → M365 lisanslarını tanımlayın

---

## 📁 Proje Yapısı

```
ITManager/
├── src/                          # Backend kaynak kodları
│   ├── app.js                    # Express uygulama giriş noktası
│   ├── database/
│   │   └── db.js                 # SQLite bağlantısı ve şema
│   ├── middleware/
│   │   └── auth.js               # JWT doğrulama middleware
│   ├── modules/
│   │   ├── auth/                 # Kimlik doğrulama API
│   │   ├── admin/                # Kullanıcı ve yetki yönetimi API
│   │   ├── core/                 # Master Veri API (personel, araç, vb.)
│   │   ├── m365/                 # M365 Lisans Yönetimi API
│   │   ├── monitoring/           # Sunucu izleme API
│   │   ├── simcardtracking/      # SIM Kart Takip API
│   │   └── hr-requests/          # İK Bildirimleri API
│   └── services/
│       └── MailerService.js      # E-posta gönderim servisi
│
├── frontend/                     # Vue.js frontend uygulaması
│   ├── src/
│   │   ├── components/           # Ortak UI bileşenleri (AppTable, AppHeader)
│   │   ├── composables/          # Vue composables
│   │   ├── layouts/              # Sayfa düzeni bileşenleri
│   │   ├── router/               # Vue Router tanımları
│   │   ├── stores/               # Pinia store'ları (auth, masterData)
│   │   └── views/                # Sayfa bileşenleri (modüle göre organize)
│   │       ├── master-data/
│   │       ├── sim-tracking/
│   │       ├── m365/
│   │       ├── hr-requests/
│   │       ├── cost-management/
│   │       └── reports/
│   └── vite.config.js
│
├── scripts/                      # Veritabanı migrasyon scriptleri
├── DESIGN_GUIDE.md               # UI/UX tasarım rehberi
└── README.md
```

---

## 🔌 API Dokümantasyonu

### Kimlik Doğrulama
```
POST /api/auth/login          # Giriş yap
POST /api/auth/logout         # Çıkış yap
GET  /api/auth/me             # Oturum bilgisi
```

### Master Veri
```
GET|POST        /api/master-data/companies
GET|PUT|DELETE  /api/master-data/companies/:id

GET|POST        /api/master-data/departments
GET|POST        /api/master-data/personnel
GET|POST        /api/master-data/vehicles
GET|POST        /api/master-data/locations
GET|POST        /api/master-data/servers
GET|POST        /api/master-data/operators
GET|POST        /api/master-data/packages
```

### SIM Takip
```
GET|POST        /api/sim/m2m
GET|POST        /api/sim/data
GET|POST        /api/sim/voice
POST            /api/sim/import/invoices
```

### M365 Lisans
```
GET|POST        /api/m365/licenses
GET|POST        /api/m365/companies
```

---

## 📸 Ekran Görüntüleri

| Dashboard | Master Veri | SIM Takip |
|-----------|-------------|-----------|
| Modül merkezi | MDM Kumanda Paneli | Hat yönetimi |

---

## 🤝 Katkı

Bu proje kurumsal iç kullanım amacıyla geliştirilmektedir.

---

## 📄 Lisans

Bu proje özel/kurumsal lisans altındadır. İzinsiz dağıtım ve kullanım yasaktır.

---

<p align="center">
  <strong>ITManager</strong> · Geliştirici: <a href="https://github.com/ufukkay">ufukkay</a>
</p>
