# ITManager — Windows Server + IIS Kurulum Rehberi

Bu rehber, projeyi ayrı bir Windows Server üzerinde IIS + iisnode ile ilk kez canlıya almak için izlenecek adımları anlatır. Node/Express hem API'yi hem statik frontend build'ini tek başına sunuyor (bkz. `src/app.js`); IIS sadece iisnode üzerinden tüm istekleri bu process'e yönlendiriyor (bkz. kök dizindeki `web.config`).

Bu adımlar sunucuya RDP/konsol erişimi gerektirir — buradan uzaktan yapılamaz, sunucuda sırayla uygulanmalıdır.

## Hızlı Kurulum (Otomatik Script)

Adım adım manuel kuruluma tercih ederseniz, `deploy\setup-iis-server.ps1` script'i Node.js, Git, IIS rolü, URL Rewrite Module, iisnode kurulumunu; projeyi çekmeyi; bağımlılıkları kurup frontend'i build etmeyi; `.env` oluşturmayı; ve IIS Application Pool + Website oluşturmayı **tek seferde** yapar.

```powershell
# Sunucuda, YÜKSELTİLMİŞ (Administrator) bir PowerShell penceresinde:
cd C:\path\to\ITManager\deploy
.\setup-iis-server.ps1
```

Çalıştırmadan önce script'in başındaki `$RepoUrl`, `$SitePath`, `$SiteName`, `$Port` değişkenlerini gözden geçirin/düzenleyin. Script idempotent'tir — tekrar çalıştırmak zaten kurulu olanları atlar, güvenlidir. Script sistem seviyesinde değişiklik yaptığı için çalıştırmadan önce içeriğini bir kez okumanız önerilir.

Script tamamlandıktan sonra hâlâ elle yapmanız gereken tek şey: `.env` dosyasındaki SMTP/IMAP gibi entegrasyon ayarlarını (varsa) admin panelinden tamamlamak.

---

## 1. Manuel Kurulum — Ön Koşullar (sunucuda, tek seferlik)

1. **Node.js** (v18+) kurulu olmalı — [nodejs.org](https://nodejs.org) üzerinden LTS sürümünü indirip kurun. Kurulumdan sonra `node -v` ile doğrulayın.
2. **Git** kurulu olmalı (kendi kendini güncelleme mekanizması `git fetch`/`git reset` kullanıyor) — [git-scm.com](https://git-scm.com).
3. **IIS rolü** — Sunucu Yöneticisi (Server Manager) → *Roles and Features* → *Web Server (IIS)* rolünü ekleyin. Alt özelliklerden en azından **Static Content**, **Default Document**, **Request Filtering** işaretli olsun.
4. **URL Rewrite modülü** — Microsoft'un resmi IIS eklentileri sayfasından ("IIS URL Rewrite Module") indirip kurun. `web.config`'teki yönlendirme kuralı bu modül olmadan çalışmaz.
5. **iisnode** — Azure/iisnode GitHub deposunun *Releases* sayfasından sunucu mimarinize uygun (genelde x64) MSI kurulumunu indirip kurun. Bu, IIS'e Node process'lerini yönetme (worker process, log, restart) yeteneği kazandırır.

Kurulumdan sonra IIS Manager'ı açtığınızda sol ağaçta ve *Handler Mappings* altında `iisnode` görünmelidir.

## 2. Kodu Sunucuya Getirin

```powershell
cd C:\inetpub\
git clone https://github.com/ufukkay/ITManager.git
cd ITManager
```

> Not: `C:\inetpub\ITManager` gibi IIS'in varsayılan kök dizinlerinden birini kullanmak pratik olur, ama farklı bir klasör de seçebilirsiniz — önemli olan IIS sitesinin bu klasörü göstermesi.

## 3. Bağımlılıklar, Ortam Değişkenleri, İlk Build

```powershell
npm install
cd frontend
npm install
npm run build
cd ..
```

`frontend\dist` klasörünün oluştuğunu doğrulayın — Express bunu statik olarak sunuyor.

`.env` dosyasını oluşturun (`.env.example`'ı kopyalayıp düzenleyin):

```dotenv
PORT=3001
SESSION_SECRET=<uzun, rastgele, tahmin edilemez bir değer>
DATABASE_PATH=./data/itmanager.db
```

`SESSION_SECRET` için gerçek, üretime özgü bir değer verin — repodaki varsayılan/örnek değeri kullanmayın.

## 4. IIS Sitesi Oluşturun

1. IIS Manager → *Sites* → sağ tık → *Add Website*.
2. **Site name**: `ITManager` (veya tercih ettiğiniz isim)
3. **Physical path**: kodu kopyaladığınız klasör (örn. `C:\inetpub\ITManager`)
4. **Binding**: dahili kullanım için genelde `http`, port `80` (veya kurumsal DNS/host header'ınıza göre ayarlayın); dışa açıksa HTTPS + sertifika eklemeniz önerilir.
5. Site oluşturulduktan sonra **Application Pool**'unu seçip *Basic Settings* → **.NET CLR version: No Managed Code** yapın (Node için .NET runtime gerekmiyor, karışmasın).

## 5. İlk Testi Yapın

Tarayıcıdan siteye gidin (örn. `http://sunucu-adi/` veya tanımladığınız binding). Giriş ekranı gelmeli. Varsayılan giriş: `admin@itmanager.com` / `admin123` — **ilk girişten hemen sonra bu şifreyi değiştirin.**

Sorun olursa iisnode logları `iisnode-logs\` klasöründe (proje kökünde, otomatik oluşur) — hata ayıklamak için buraya bakın.

## 6. Kendi Kendini Güncelleme

Kurulum tamamlandıktan sonra, uygulama içindeki **Admin → Sistem Güncelleme** ekranı üzerinden gelecekteki güncellemeler tek tıkla yapılabilir: otomatik veritabanı yedeği alır, `git reset --hard origin/main` ile kodu günceller, backend+frontend bağımlılıklarını kurar, frontend'i yeniden derler ve `web.config`'e dokunarak iisnode'un süreci yeniden başlatmasını (recycle) tetikler. Detaylar için `src/modules/update/controller.js` ve `PROJE_YAPISI.md`.

**Önemli**: Bu mekanizma, sunucudaki çalışma dizininin git açısından temiz (commit edilmemiş değişiklik olmayan) olmasını zorunlu kılar — güncelleme öncesi sunucuda elle dosya değiştirmeyin.

## 7. Sorun Giderme Notları

- **500 / boş sayfa**: `iisnode-logs\` altındaki en son log dosyasına bakın; genelde eksik `.env`, eksik `node_modules` veya `frontend\dist` yoksa oluşur.
- **URL Rewrite kuralı çalışmıyor**: URL Rewrite modülünün gerçekten kurulu olduğunu IIS Manager'da site seviyesinde *URL Rewrite* ikonunun görünüp görünmediğinden kontrol edin.
- **Statik dosyalar (CSS/JS) 404**: `frontend\dist` klasörü eksik veya eski olabilir — `cd frontend && npm run build` ile yeniden oluşturun.
- **Oturumlar sürekli düşüyor**: `SESSION_SECRET` her `npm install`/deploy'da değişmediğinden emin olun (`.env` dosyası git'e girmez, sunucuda sabit kalmalı).
