# ITManager — Tasarım Dili Kılavuzu (Design System)

> Bu belge proje için **tek bağlayıcı kaynaktır (Single Source of Truth)**.
> Her yeni ekran, her düzenleme bu kurallara uymak zorundadır.
> Referans: Google Workspace, Google Cloud Console arayüzleri.

---

## 1. Felsefe

| İlke | Açıklama |
|---|---|
| **Sadelik** | Yalnızca gerekli görsel öğeler kullanılır. Süsleme yoktur. |
| **Okunabilirlik** | Yazı boyutu, renk kontrastı ve boşluklar bilişsel yükü azaltmak için ayarlanır. |
| **Tutarlılık** | Aynı bileşen her sayfada aynı görünür. Ad-hoc tasarım kabul edilmez. |
| **Renk Ekonomisi** | Renkler **anlam taşır**, dekorasyon için kullanılmaz. |
| **Beyazlık** | Arayüz "temiz kağıt" hissi verir. Koyu-gri yüzeyler, renkli geçişler, cam efekti yoktur. |

---

## 2. Renk Paleti

### 2.1 Arka Plan (Sayfa Katmanları)

| Katman | Değer | Tailwind Karşılığı |
|---|---|---|
| Sayfa arka planı | `#f8f9fa` | `bg-gray-50` |
| Kart / Panel | `#ffffff` | `bg-white` |
| İkincil yüzey / Hover bg | `#f1f3f4` | `bg-gray-100` |
| Modal overlay | `rgba(32,33,36,0.5)` | `bg-[#202124]/50` |

### 2.2 Sınır (Border) ve Çizgiler

| Kullanım | Değer | Tailwind Karşılığı |
|---|---|---|
| Standart kenarlık | `#dadce0` | `border-gray-200` |
| Hover kenarlık | `#bdc1c6` | `border-gray-300` |
| Çok hafif bölücü | `#f1f3f4` | `border-gray-100` |

### 2.3 Metin Renkleri

| Kullanım | Değer | Tailwind Karşılığı |
|---|---|---|
| Ana metin | `#202124` | `text-gray-800` |
| İkincil metin | `#5f6368` | `text-gray-600` |
| Pasif / İpucu | `#9aa0a6` | `text-gray-400` |
| Devre dışı | `#bdc1c6` | `text-gray-300` |

### 2.4 Aksiyon Renkleri (Anlamlı Kullanım)
Aşağıdaki renkler YALNIZCA belirtilen durumlar için kullanılır:

| Renk | Hex Değeri | Tailwind Karşılığı | Kullanım |
|---|---|---|---|
| **Google Blue** | `#1a73e8` | `blue-500` | Birincil buton, link, aktif sekme, focus halkası |
| **Blue Hover** | `#174ea6` | `blue-600` | Birincil butonun hover hali |
| **Blue Light** | `#e8f0fe` | `blue-50` | Bilgi rozeti arka planı |
| **Google Green** | `#34a853` | `green-500` | Başarı toast, "Tamamlandı" rozeti |
| **Green Light** | `#e6f4ea` | `green-50` | Başarı rozeti arka planı |
| **Google Red** | `#ea4335` | `red-500` | Hata mesajı, silme butonu |
| **Red Light** | `#fce8e6` | `red-50` | Hata rozeti arka planı |
| **Google Yellow** | `#fbbc04` | `amber-500` | Uyarı ikonu, "Bekliyor" rozeti |
| **Yellow Light** | `#fef7e0` | `amber-50` | Uyarı rozeti arka planı |

> ⛔ **YASAK:** `purple`, `pink`, `teal`, `cyan`, `indigo`, `orange`, `fuchsia`, `violet` renk aileleri **hiçbir yerde** kullanılmaz.
> ⛔ **YASAK:** `bg-gradient-to-*` veya herhangi bir CSS gradient arka plan kullanılmaz.
> ⛔ **YASAK:** İkon arka planı için dekoratif farklı renkler kullanılmaz. Tüm ikonlar `text-gray-500` ya da `text-[#1a73e8]` tonlarında olur.
> ⛔ **YASAK:** `bg-emerald-*`, `bg-rose-*`, `text-emerald-*`, `text-rose-*` Tailwind class'ları. Bunlar yerine yukarıdaki Google renk kodları kullanılır.

---

## 3. Tipografi

### Font Ailesi
```css
font-family: 'Roboto', 'Inter', Arial, sans-serif;
```
Google Fonts üzerinden import edilir (`style.css` başında). Başka font kullanılmaz.

### Boyut ve Ağırlık Tablosu

| Kullanım | Boyut | Ağırlık | Örnek Tailwind |
|---|---|---|---|
| Sayfa başlığı (H1) | 20px | Medium | `text-xl font-medium` |
| Bölüm başlığı (H2) | 16px | Medium | `text-base font-medium` |
| Kart / Panel başlığı | 14px | Medium | `text-sm font-medium` |
| Normal vücut metni | 14px | Normal | `text-sm font-normal` |
| Tablo veri hücresi | 13-14px | Normal | `text-[13px] font-normal` |
| Etiket (Label) | 12px | Medium | `text-xs font-medium` |
| Küçük açıklama / Tarih | 12px | Normal | `text-xs font-normal` |
| Buton metni | 13-14px | Medium | `text-sm font-medium` |

> ⛔ **YASAK:** `font-black`, `font-extrabold` kullanılmaz. Maksimum `font-bold` (sadece vurgu gereken yerlerde).
> ⛔ **YASAK:** `text-[9px]`, `text-[10px]` gibi aşırı küçük boyutlar. Minimum `text-xs` (12px).
> ⛔ **YASAK:** `tracking-widest` tüm metin/butonlarda kullanılmaz. Yalnızca `uppercase` etiketlerde kabul edilir.
> ⛔ **YASAK:** `uppercase` genel vücut metni veya veri alanlarında kullanılmaz.

---

## 4. Bileşen Standartları

### 4.1 Butonlar

**Birincil Buton (Primary)**
```html
<button class="h-9 px-4 bg-[#1a73e8] text-white text-sm font-medium rounded
               hover:bg-[#174ea6] border border-[#1a73e8] transition-colors">
  Kaydet
</button>
```

**İkincil Buton (Secondary / Outline)**
```html
<button class="h-9 px-4 bg-white text-[#3c4043] text-sm font-medium rounded
               border border-[#dadce0] hover:bg-[#f1f3f4] transition-colors">
  İptal
</button>
```

**Tehlike Butonu (Danger — outline stilinde)**
```html
<button class="h-9 px-4 bg-white text-[#ea4335] text-sm font-medium rounded
               border border-[#dadce0] hover:bg-[#fce8e6] transition-colors">
  Sil
</button>
```

**Simge + Metin Butonu (Icon Button)**
```html
<button class="h-9 px-4 bg-white text-[#3c4043] text-sm font-medium rounded
               border border-[#dadce0] hover:bg-[#f1f3f4] flex items-center gap-2 transition-colors">
  <i class="fas fa-plus text-xs"></i>
  Yeni Ekle
</button>
```

**Boyut Kuralları:**
- Standart yükseklik: `h-9` (36px)
- Büyük form / sayfa aksiyonları: `h-10` (40px)
- Küçük tablo aksiyonları (simge): `w-8 h-8` veya `w-9 h-9`

> ⛔ **YASAK:** `rounded-xl`, `rounded-2xl`, `rounded-full` butonlarda kullanılmaz. Yalnızca `rounded` veya `rounded-md`.
> ⛔ **YASAK:** `shadow-lg`, `shadow-xl`, `shadow-2xl`. Maksimum `shadow-sm`.
> ⛔ **YASAK:** `uppercase tracking-wider` buton metinleri için. İstisna: sekme içi chip butonlar.

---

### 4.2 Form Elemanları (Input, Select, Textarea)

```html
<!-- Label -->
<label class="text-xs font-medium text-[#5f6368] uppercase tracking-wide">
  Ad Soyad
</label>

<!-- Standart Input -->
<input
  class="w-full h-9 border border-[#dadce0] px-3 rounded text-sm text-[#202124]
         bg-white outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8]
         transition-colors placeholder-[#9aa0a6]"
  placeholder="Örnek değer"
/>

<!-- Select -->
<select class="w-full h-9 border border-[#dadce0] px-3 rounded text-sm text-[#202124]
               bg-white outline-none focus:border-[#1a73e8] transition-colors">
  <option value="">Seçiniz...</option>
</select>

<!-- Textarea -->
<textarea
  rows="3"
  class="w-full border border-[#dadce0] px-3 py-2 rounded text-sm text-[#202124]
         bg-white outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8]
         transition-colors resize-none"
></textarea>
```

**Kurallar:**
- Input / Select yüksekliği: `h-9` (36px) standart. Büyük formlar: `h-10`.
- Kenarlık rengi: `border-[#dadce0]`, focus'ta `border-[#1a73e8]` + `ring-1 ring-[#1a73e8]`
- Köşe: `rounded` (4px) — hiçbir zaman `rounded-xl` değil.
- Arka Plan: Her zaman `bg-white`
- Hata durumu: `border-[#ea4335] focus:border-[#ea4335] focus:ring-[#ea4335]`

**Hata Mesajı**
```html
<p class="text-xs text-[#ea4335] mt-1">Bu alan zorunludur.</p>
```

---

### 4.3 Veri Tabloları

```html
<table class="w-full text-sm border-collapse">
  <thead>
    <tr class="bg-[#f8f9fa] border-b border-[#dadce0]">
      <th class="text-left text-xs font-medium text-[#5f6368] uppercase px-4 py-3">
        Başlık
      </th>
    </tr>
  </thead>
  <tbody>
    <tr class="bg-white border-b border-[#f1f3f4] hover:bg-[#f8f9fa] transition-colors">
      <td class="text-sm text-[#202124] px-4 py-3">
        Veri
      </td>
    </tr>
  </tbody>
</table>
```

**Kurallar:**
- Başlık satırı: `bg-[#f8f9fa]` arka plan, alt kenarlık `border-[#dadce0]`
- Başlık metni: `text-xs font-medium text-[#5f6368] uppercase`
- Veri satırı: `bg-white`, hover'da `bg-[#f8f9fa]`
- Veri satırı bölücü: `border-b border-[#f1f3f4]` (çok hafif)
- Veri metni: `text-sm text-[#202124]`
- Tablo, Tailwind `overflow-hidden rounded-md border border-[#dadce0]` bir kap içine alınır

---

### 4.4 Kart / Panel

```html
<!-- Standart Kart -->
<div class="bg-white border border-[#dadce0] rounded-md p-4">
  <!-- İçerik -->
</div>

<!-- Hafif Hover Etkili Kart (Dashboard modülleri için) -->
<div class="bg-white border border-[#dadce0] rounded-md p-4
            hover:border-[#bdc1c6] hover:shadow-sm transition-colors">
  <!-- İçerik -->
</div>
```

- Arka plan: `bg-white`
- Kenarlık: `border border-[#dadce0]`
- Köşe: `rounded-md` (6-8px)
- Padding: `p-4` veya `p-6`
- Gölge: `shadow-sm` veya hiç.
- Hover kenarlık en fazla `border-[#bdc1c6]` — asla renk kodu (mavi/yeşil border hover) kullanılmaz.

> ⛔ **YASAK:** `hover:border-blue-200`, `hover:border-emerald-200`, `hover:border-amber-200` gibi renkli hover border'lar.

---

### 4.5 İstatistik Kartları (Stats Cards)

İstatistik kartları Dashboard ve liste sayfalarının üst kısmında yer alır.

```html
<!-- Standart Stats Card -->
<div class="bg-white border border-[#dadce0] rounded-md p-5 flex items-center justify-between">
  <div>
    <p class="text-xs font-medium text-[#5f6368] uppercase tracking-wide mb-1">
      Bekleyen Talepler
    </p>
    <p class="text-2xl font-medium text-[#202124]">12</p>
  </div>
  <div class="w-10 h-10 bg-[#f1f3f4] rounded-md flex items-center justify-center">
    <i class="fas fa-clock text-[#5f6368]"></i>
  </div>
</div>
```

**Kurallar:**
- Sayı boyutu: `text-2xl font-medium text-[#202124]` — asla `text-4xl font-bold` değil
- İkon kutusu arka planı: `bg-[#f1f3f4]` (nötr gri) veya `bg-[#e8f0fe]` (Google Blue light)
- İkon rengi: `text-[#5f6368]` veya `text-[#1a73e8]` — asla `text-emerald-500`, `text-amber-500` değil
- Grid düzeni: `grid grid-cols-1 md:grid-cols-3 gap-4`

---

### 4.6 Rozetler (Badge / Status Chip)

```html
<!-- Bekliyor -->
<span class="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded
             bg-[#fef7e0] text-[#b06000] border border-[#fbbc04]/30">
  <i class="fas fa-circle text-[6px]"></i> Bekliyor
</span>

<!-- Tamamlandı -->
<span class="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded
             bg-[#e6f4ea] text-[#137333] border border-[#34a853]/30">
  <i class="fas fa-check-circle text-[10px]"></i> Tamamlandı
</span>

<!-- Hata / İptal -->
<span class="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded
             bg-[#fce8e6] text-[#c5221f] border border-[#ea4335]/30">
  <i class="fas fa-times-circle text-[10px]"></i> İptal
</span>

<!-- Bilgi (Giriş tipi) -->
<span class="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded
             bg-[#e8f0fe] text-[#1a73e8] border border-[#1a73e8]/30">
  GİRİŞ
</span>

<!-- Nötr -->
<span class="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded
             bg-[#f1f3f4] text-[#5f6368] border border-[#dadce0]">
  Bilinmiyor
</span>
```

- Boyut: `text-xs font-medium px-2 py-0.5`
- Köşe: `rounded` veya `rounded-full` (pill stil için)
- `ring-*` dış halka kullanılmaz.

---

### 4.7 Modallar / Dialog

```html
<!-- Overlay -->
<div class="fixed inset-0 z-[9998] flex items-center justify-center p-4">
  <div class="absolute inset-0 bg-[#202124]/50" @click="closeModal"></div>

  <!-- Modal Kutusu -->
  <div class="relative bg-white border border-[#dadce0] rounded-md shadow-md
              w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden">

    <!-- Başlık -->
    <div class="px-6 py-4 border-b border-[#dadce0] bg-[#f8f9fa] flex items-center justify-between shrink-0">
      <h3 class="text-base font-medium text-[#202124]">Modal Başlığı</h3>
      <button class="text-[#5f6368] hover:text-[#202124] transition-colors">
        <i class="fas fa-times"></i>
      </button>
    </div>

    <!-- İçerik (scrollable) -->
    <div class="px-6 py-5 overflow-y-auto flex-1 space-y-5">
      <!-- Form alanları -->
    </div>

    <!-- Footer -->
    <div class="px-6 py-4 border-t border-[#dadce0] bg-[#f8f9fa] flex justify-end gap-3 shrink-0">
      <button class="h-9 px-4 bg-white text-[#3c4043] text-sm font-medium rounded
                     border border-[#dadce0] hover:bg-[#f1f3f4] transition-colors">
        İptal
      </button>
      <button class="h-9 px-4 bg-[#1a73e8] text-white text-sm font-medium rounded
                     hover:bg-[#174ea6] transition-colors">
        Kaydet
      </button>
    </div>
  </div>
</div>
```

---

### 4.8 Form Bölüm Ayırıcıları (Modal İçinde)

Büyük formlarda alanlar, başlıklı bölümlere ayrılır:

```html
<div class="space-y-4">
  <!-- Bölüm başlığı -->
  <h4 class="text-xs font-medium text-[#1a73e8] uppercase tracking-wide
             border-b border-[#f1f3f4] pb-2 flex items-center gap-2">
    <i class="fas fa-id-card"></i>
    Kişisel Bilgiler
  </h4>

  <!-- Alanlar grid'i -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <!-- input alanları -->
  </div>
</div>
```

- Bölüm başlık rengi: `text-[#1a73e8]` (Google Blue)
- Alt çizgi: `border-b border-[#f1f3f4]` (çok hafif)
- Bölümler arası boşluk: `space-y-6` veya `gap-6`

---

### 4.9 Sekmeler (Tabs)

**Standart Tab Bar (Alt çizgi stili)**
```html
<div class="border-b border-[#dadce0] flex gap-0">
  <!-- Aktif -->
  <button class="px-4 py-3 text-sm font-medium text-[#1a73e8]
                 border-b-2 border-[#1a73e8] -mb-px transition-colors">
    Tüm Kayıtlar
  </button>
  <!-- Pasif -->
  <button class="px-4 py-3 text-sm font-normal text-[#5f6368]
                 border-b-2 border-transparent hover:text-[#202124]
                 hover:bg-[#f1f3f4] transition-colors">
    Bekleyenler
  </button>
</div>
```

**Pill Tab (Kart içi filtre)**
```html
<div class="flex items-center gap-1 bg-[#f1f3f4] p-1 rounded border border-[#dadce0]">
  <button class="px-4 py-1.5 rounded text-xs font-medium bg-white text-[#1a73e8] shadow-sm">
    Tümü
  </button>
  <button class="px-4 py-1.5 rounded text-xs font-medium text-[#5f6368] hover:bg-[#e8e8e8]">
    Girişler
  </button>
</div>
```

---

### 4.10 Bildirim Toastları

```html
<!-- Başarı -->
<div class="px-4 py-2.5 bg-[#34a853] text-white text-sm font-medium
            rounded shadow-md flex items-center gap-2">
  <i class="fas fa-check-circle"></i>
  İşlem başarıyla tamamlandı.
</div>

<!-- Hata -->
<div class="px-4 py-2.5 bg-[#ea4335] text-white text-sm font-medium
            rounded shadow-md flex items-center gap-2">
  <i class="fas fa-exclamation-circle"></i>
  Bir hata oluştu.
</div>

<!-- Uyarı -->
<div class="px-4 py-2.5 bg-[#fbbc04] text-[#202124] text-sm font-medium
            rounded shadow-md flex items-center gap-2">
  <i class="fas fa-exclamation-triangle"></i>
  Dikkat edilmesi gereken bir durum var.
</div>
```

**Toast sistemi kuralları:**
- Konum: sabit sağ üst köşe `fixed top-6 right-6 z-[9999]`
- Otomatik kapanma: 3000ms
- Birden fazla toast: `flex flex-col gap-2`
- `ring-*` dış halka kullanılmaz.

---

### 4.11 Boş Durum (Empty State)

Liste veya tablo sonuçsuz döndüğünde gösterilir:

```html
<div class="flex flex-col items-center justify-center py-16 text-center space-y-3">
  <div class="w-16 h-16 bg-[#f1f3f4] rounded-md flex items-center justify-center">
    <i class="fas fa-inbox text-2xl text-[#9aa0a6]"></i>
  </div>
  <div>
    <h3 class="text-sm font-medium text-[#202124] mb-1">Kayıt bulunamadı</h3>
    <p class="text-xs text-[#5f6368] max-w-xs">
      Arama kriterlerinizi değiştirin ya da yeni bir kayıt oluşturun.
    </p>
  </div>
  <button class="h-9 px-4 bg-white text-sm font-medium text-[#1a73e8]
                 border border-[#dadce0] rounded hover:bg-[#f1f3f4] transition-colors">
    Yeni Oluştur
  </button>
</div>
```

---

### 4.12 Yükleme Durumu (Loading State)

```html
<!-- Tam sayfa overlay (işlem sırasında) -->
<div class="fixed inset-0 z-[10000] bg-white/70 flex items-center justify-center">
  <div class="flex flex-col items-center gap-3">
    <div class="w-10 h-10 border-4 border-[#e8f0fe] border-t-[#1a73e8] rounded-full animate-spin"></div>
    <span class="text-xs font-medium text-[#5f6368]">İşleniyor...</span>
  </div>
</div>

<!-- Satır içi yükleyici (küçük buton durumu) -->
<span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"></span>
```

---

## 5. Sayfa Düzeni (Layout)

### 5.1 Ana Layout Yapısı

```
AppHeader (h-12, sticky, border-b, bg-white)
└── Router View (flex-1, overflow-y-auto)
     └── Sayfa İçeriği
          ├── Sayfa Başlığı Alanı
          ├── Stats Kartları (isteğe bağlı)
          ├── Filtreler + Arama
          └── Tablo / Liste / Form
```

### 5.2 Sayfa İçerik Padding'i

```
Standart sayfa kapsayıcı : <div class="px-6 py-6 max-w-7xl mx-auto space-y-6">
Dar içerik (formlar)     : <div class="px-4 py-6 max-w-3xl mx-auto space-y-6">
Modül ana alanı          : min-h-screen bg-[#f8f9fa]
```

### 5.3 Sayfa Başlığı Bölümü

Her sayfanın üstünde tutarlı bir başlık alanı yer alır:

```html
<div class="flex items-center justify-between mb-6">
  <!-- Başlık grubu -->
  <div>
    <h1 class="text-xl font-medium text-[#202124]">Sayfa Başlığı</h1>
    <p class="text-xs text-[#5f6368] mt-0.5">Açıklama metni</p>
  </div>

  <!-- Aksiyon butonları -->
  <div class="flex items-center gap-3">
    <button class="h-9 px-4 bg-white text-sm font-medium text-[#3c4043]
                   border border-[#dadce0] rounded hover:bg-[#f1f3f4] transition-colors">
      İkincil Aksiyon
    </button>
    <button class="h-9 px-4 bg-[#1a73e8] text-white text-sm font-medium
                   rounded hover:bg-[#174ea6] transition-colors flex items-center gap-2">
      <i class="fas fa-plus text-xs"></i>
      Yeni Ekle
    </button>
  </div>
</div>
```

> ⛔ **YASAK:** Sayfa başlığının yanında renkli dekoratif ikon kutuları (`bg-blue-600 rounded` gibi) kullanılmaz.

### 5.4 Header Bileşeni Kuralları (`AppHeader.vue`)

- Yükseklik: `h-12`
- Arka plan: `bg-white`
- Alt kenarlık: `border-b border-[#dadce0]`
- `sticky top-0 z-50`
- Sol: Geri butonu (`text-[#5f6368]`, simge + metin, sadece ana sayfa dışında gösterilir)
- Orta: Boş (başlık yok)
- Sağ: Kullanıcı adı + Çıkış butonu (`text-sm font-medium`, uppercase/tracking yok)

---

## 6. İkonlar

Tüm ikonlar **Font Awesome Free** kütüphanesinden alınır. Emoji veya özel SVG set kullanılmaz.

### Renk Kuralları

| Bağlam | Renk |
|---|---|
| Standart (nötr) ikon | `text-[#5f6368]` |
| Birincil aksiyon ikonu | `text-[#1a73e8]` |
| Buton içi ikon (beyaz arkaplan üstünde) | `text-white` |
| Durum: Başarı ikonu | `text-[#34a853]` |
| Durum: Hata ikonu | `text-[#ea4335]` |
| Durum: Uyarı ikonu | `text-[#fbbc04]` |

### Boyut Kuralları

| Kullanım | Boyut |
|---|---|
| Buton içi ikon | `text-xs` veya `text-sm` |
| Tablo satırı aksiyon simgesi | `text-sm` |
| Boş durum büyük ikon | `text-2xl` veya `text-3xl` |
| Modal başlık ikonu | `text-lg` veya `text-xl` |

> ⛔ **YASAK:** Renkli ikon arkaplanı kutuları — sarı/mor/türkuaz/kırmızı renkli kareler veya daireler.
> ✅ **DOĞRU:** İkon arka planı yalnızca `bg-[#f1f3f4]` (nötr gri) veya `bg-[#e8f0fe]` (Google Blue light).

---

## 7. Animasyon ve Geçişler

### İzin Verilen Geçişler

```css
transition-colors     /* Renk değişimleri (hover, focus) */
transition-opacity    /* Görünürlük değişimleri */
transition-shadow     /* Gölge değişimleri */
```

- Süre: `150ms` — `duration-150` (Tailwind varsayılanı kabul edilir)
- `animate-spin`: Yalnızca yükleme spinner'ları için
- Vue `<transition>` bileşenleri: Modallar ve toast'lar için kabul edilir

### Global Kural (`style.css`)

```css
/* Tüm bileşenler kendi geçişini yönetir; global ezme kullanılmaz. */
/* transition: none !important satırı KALDIRILMALI */
```

> ⛔ **YASAK:** `animate-bounce`, `animate-pulse` (spinner dışında), `animate-ping`
> ⛔ **YASAK:** `* { transition: none !important }` global ezme kuralı — bu kural `style.css`'den kaldırılmalıdır.
> ⛔ **YASAK:** Sayfa girişinde `animate-fade-in` adlı özel CSS animasyon sınıfları.

---

## 8. CSS Token Referansı (`style.css`)

`style.css` içinde tanımlı CSS özel değişkenler (custom properties):

```css
:root {
  /* Arka Planlar */
  --bg-primary: #f8f9fa;       /* Sayfa zemini */
  --bg-secondary: #ffffff;     /* Kart / panel */
  --bg-hover: #f1f3f4;         /* Hover yüzeyi */

  /* Kenarlıklar */
  --border: #dadce0;           /* Standart kenar */
  --border-light: #f1f3f4;     /* Hafif bölücü */

  /* Metinler */
  --text-primary: #3c4043;     /* Ana metin */
  --text-secondary: #5f6368;   /* İkincil metin */
  --text-muted: #70757a;       /* Pasif metin */

  /* Renkler */
  --accent: #1a73e8;           /* Google Blue */
  --accent-hover: #174ea6;
  --accent-light: #e8f0fe;

  --success: #34a853;
  --success-light: #e6f4ea;
  --warning: #fbbc04;
  --warning-light: #fef7e0;
  --danger: #ea4335;
  --danger-light: #fce8e6;

  /* Köşeler */
  --radius: 8px;               /* rounded-md */
  --radius-sm: 4px;            /* rounded */
}
```

---

## 9. Vue Bileşen Yazım Kuralları

### 9.1 Script Setup Yapısı

```vue
<script setup>
// 1. Import'lar (Vue core → 3rd party → local)
import { ref, computed, onMounted } from 'vue'
import api from '@/api'

// 2. State tanımları
const loading = ref(false)
const items = ref([])

// 3. Computed değerler
const filteredItems = computed(() => ...)

// 4. Metodlar
const fetchData = async () => { ... }
const handleSubmit = async () => { ... }

// 5. Lifecycle
onMounted(fetchData)
</script>
```

### 9.2 Template Yapısı (Sayfa Bileşeni)

```vue
<template>
  <!-- 1. Toast container (fixed, üstte) -->
  <!-- 2. Ana sayfa kapsayıcı -->
  <div class="min-h-screen bg-[#f8f9fa] px-6 py-6">
    <!-- 3. Sayfa başlığı + aksiyon butonları -->
    <!-- 4. Stats kartları (varsa) -->
    <!-- 5. Filtreler / arama -->
    <!-- 6. Tablo / liste / kart grid -->
    <!-- 7. Boş durum (v-else) -->
  </div>
  <!-- 8. Modal (v-if, fixed overlay) -->
  <!-- 9. Loading overlay (v-if, fixed) -->
</template>
```

### 9.3 Scoped Style Kuralları

- Scoped `<style scoped>` yalnızca bileşene özel kurallar için kullanılır.
- Global token'lar `style.css`'de tutulur, bileşende tekrar tanımlanmaz.
- Vue transition CSS sınıfları (`*-enter-from`, `*-leave-to`) scoped içinde tanımlanabilir.

---

## 10. Tailwind Konfigürasyon Notları (`tailwind.config.js`)

Proje, Google renk paletini Tailwind'in varsayılan renklerinin üzerine yazar:

| Tailwind Sınıfı | Karşılık Geldiği Renk |
|---|---|
| `blue-50` | `#e8f0fe` (Google Blue Light) |
| `blue-500` | `#1a73e8` (Google Blue) |
| `blue-600` | `#174ea6` (Google Blue Hover) |
| `green-50` | `#e6f4ea` (Google Green Light) |
| `green-500` | `#34a853` (Google Green) |
| `red-50` | `#fce8e6` (Google Red Light) |
| `red-500` | `#ea4335` (Google Red) |
| `amber-50` | `#fef7e0` (Google Yellow Light) |
| `amber-500` | `#fbbc04` (Google Yellow) |
| `gray-50` | `#f8f9fa` |
| `gray-100` | `#f1f3f4` |
| `gray-200` | `#dadce0` (Border) |
| `gray-600` | `#5f6368` (Secondary Text) |
| `gray-800` | `#202124` (Primary Text) |

> ⚠️ `emerald-*` ve `rose-*` renk aileleri de config'de **Google Green/Red** değerlere yeniden atanmıştır ama bunların kullanımı tavsiye edilmez. Her zaman `green-*` ve `red-*` tercih edin.

---

## 11. Sayfa Bazlı Uygunluk Durumu

### ✅ Uyumlu Sayfalar (Referans Alınabilir)

| Sayfa | Dosya | Not |
|---|---|---|
| Login | `LoginView.vue` | Google kart, input, buton standartları tam uygulanmış |
| IK Modal | `PersonnelRequestsView.vue` > modal | Modal header/footer yapısı, form section ayırıcılar doğru |

### ⚠️ Kısmen Uyumlu (Düzeltme Gerekir)

| Sayfa | Dosya | Sorun |
|---|---|---|
| IK Bildirim Listesi | `PersonnelRequestsView.vue` | Stats kartlarında `hover:border-emerald-200`, `hover:border-amber-200` kaldırılmalı. İkon arka planları `bg-amber-50 text-amber-500` → `bg-[#f1f3f4] text-[#5f6368]` yapılmalı. Sayfa başlığı `text-2xl font-bold uppercase` → `text-xl font-medium` yapılmalı. |
| Dashboard | `DashboardView.vue` | `border-l-8 border-[#ffb71b]` dekoratif sol kenarlık kaldırılmalı. Hoş geldin başlığı `font-bold uppercase` → `font-medium` yapılmalı. |

### ❌ Uyumsuz (Öncelikli Refactor)

| Sayfa | Dosya | Sorun |
|---|---|---|
| İzinler | `PermissionsView.vue` | Tablo satırlarında aşırı renkli badge'ler; `emerald`, `rose` class'ları |
| SIM Takip | `sim-tracking/*.vue` | Renkli ikon arka plan kutuları, dekoratif renk paleti |
| AppHeader | `AppHeader.vue` | `font-bold uppercase tracking-wider` buton metinleri; `rounded-lg` köşeler |

---

## 12. Anti-Pattern Kataloğu

Aşağıdaki kalıplar proje kod tabanında **yasaklıdır**. PR review'da reddedilir.

### 12.1 Renk Anti-Pattern'leri

```html
<!-- ❌ YANLIŞ: Emerald/Rose/Purple renk ailesi -->
<span class="bg-emerald-500 text-white">Tamamlandı</span>
<span class="bg-rose-50 text-rose-600">İptal</span>
<div class="bg-purple-100 text-purple-600">Bilgi</div>

<!-- ✅ DOĞRU -->
<span class="bg-[#e6f4ea] text-[#137333]">Tamamlandı</span>
<span class="bg-[#fce8e6] text-[#c5221f]">İptal</span>
<span class="bg-[#e8f0fe] text-[#1a73e8]">Bilgi</span>
```

```html
<!-- ❌ YANLIŞ: Renkli hover border -->
<div class="hover:border-emerald-200">...</div>
<div class="hover:border-amber-200">...</div>

<!-- ✅ DOĞRU -->
<div class="hover:border-[#bdc1c6]">...</div>
```

```html
<!-- ❌ YANLIŞ: Gradient arkaplan -->
<div class="bg-gradient-to-r from-blue-500 to-indigo-500">...</div>

<!-- ✅ DOĞRU -->
<div class="bg-[#1a73e8]">...</div>
```

### 12.2 Tipografi Anti-Pattern'leri

```html
<!-- ❌ YANLIŞ: Aşırı ağırlık + büyük boyut -->
<h1 class="text-4xl font-black uppercase tracking-widest">Başlık</h1>

<!-- ✅ DOĞRU -->
<h1 class="text-xl font-medium text-[#202124]">Başlık</h1>
```

```html
<!-- ❌ YANLIŞ: Çok küçük metin -->
<span class="text-[9px] text-gray-400">Bilgi</span>

<!-- ✅ DOĞRU -->
<span class="text-xs text-[#9aa0a6]">Bilgi</span>
```

### 12.3 Bileşen Anti-Pattern'leri

```html
<!-- ❌ YANLIŞ: Fazla gölge -->
<div class="shadow-2xl rounded-2xl bg-white">...</div>

<!-- ✅ DOĞRU -->
<div class="shadow-sm rounded-md bg-white border border-[#dadce0]">...</div>
```

```html
<!-- ❌ YANLIŞ: Renkli ikon arkaplanı -->
<div class="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center">
  <i class="fas fa-star text-white"></i>
</div>

<!-- ✅ DOĞRU -->
<div class="w-10 h-10 bg-[#f1f3f4] rounded-md flex items-center justify-center">
  <i class="fas fa-star text-[#5f6368]"></i>
</div>
```

```html
<!-- ❌ YANLIŞ: İstatistik kartında aşırı rakam boyutu -->
<h3 class="text-4xl font-bold text-gray-800">42</h3>

<!-- ✅ DOĞRU -->
<p class="text-2xl font-medium text-[#202124]">42</p>
```

---

## 13. Geliştirici İş Akışı

### 13.1 Yeni Sayfa Eklerken Kontrol Listesi

- [ ] Sayfa arka planı `bg-[#f8f9fa]` (`min-h-screen` ile)
- [ ] Sayfa başlığı `text-xl font-medium text-[#202124]`
- [ ] Butonlar `h-9 px-4 rounded` standartında
- [ ] Input'lar `h-9 border-[#dadce0] rounded` standartında
- [ ] Rozetler Google renk paletinden (emerald/rose yasak)
- [ ] İkon arkaplanları `bg-[#f1f3f4]` veya `bg-[#e8f0fe]`
- [ ] Hover border renksiz (`hover:border-[#bdc1c6]`)
- [ ] Stats kartlarında `text-2xl font-medium`
- [ ] Tablo başlıkları `text-xs font-medium text-[#5f6368] uppercase`

### 13.2 Mevcut Sayfa Güncellerken

1. `emerald-*`, `rose-*`, `purple-*`, `teal-*` kullanımlarını ara
2. `text-4xl font-bold` veya `font-black` kullanımlarını ara
3. `shadow-xl`, `shadow-2xl`, `rounded-2xl` kullanımlarını ara
4. `hover:border-{renk}-200` gibi renkli hover border'ları ara
5. `bg-gradient-to-*` kullanımlarını ara

Bunları yukarıdaki standart alternatifleriyle değiştir.

### 13.3 Yardımcı Araçlar

- `Gecici dosya/typography_refactor.js` — font-weight ve text-size ihlallerini toplu düzeltir
- `Gecici dosya/color_stripper.js` — yasak renk sınıflarını tespit eder

---

## 14. Örneklerden Alınan Geçerli Tasarımlar

Bu sayfalar ve bölümler **referans olarak kullanılabilir**:

| Referans | Neden İyi |
|---|---|
| `LoginView.vue` — giriş kartı | Google standart input (kenarlık + focus ring), panel gölgesi, buton boyutu |
| `PersonnelRequestsView.vue` — modal | Header/body/footer yapısı, `bg-[#f8f9fa]` başlık alanı, form section ayırıcılar |
| `PersonnelRequestsView.vue` — form alanları | `h-9 border-[#dadce0] focus:border-[#1a73e8]` input standartı |
| `tailwind.config.js` | Google renk paletinin Tailwind token'larına nasıl map'lendiği |

