<template>
  <div v-if="show" class="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center" @click.self="closeModal">
    <div class="bg-white dark:bg-slate-800 w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl shadow-2xl overflow-hidden">

      <!-- ── Header ─────────────────────────────────────── -->
      <div class="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 dark:border-slate-700">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
            <i class="fas fa-camera text-sm"></i>
          </div>
          <div>
            <h3 class="font-bold text-gray-900 dark:text-slate-100 text-sm leading-tight">QR / Barkod Tarama</h3>
            <p class="text-[10.5px] text-gray-400 dark:text-slate-500">Kamerayı koda hizalayın</p>
          </div>
        </div>
        <button @click="closeModal" class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 active:bg-gray-200 dark:active:bg-slate-600 text-gray-500 dark:text-slate-400 transition-colors text-xl font-bold">
          &times;
        </button>
      </div>

      <!-- Hidden File Input for Native Mobile Camera Photo Scan -->
      <input ref="fileInput" type="file" accept="image/*" capture="environment" class="hidden" @change="handleFileUpload" />
      <div id="qr-reader-file" class="hidden"></div>

      <!-- ── AŞAMA 1: İzin İsteme & Tarama Seçimi ───────── -->
      <div v-if="stage === 'permission'" class="px-5 py-6 flex flex-col items-center gap-4 text-center">

        <div class="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
          <i class="fas fa-qrcode text-blue-600 dark:text-blue-400 text-2xl"></i>
        </div>
        <div>
          <div class="font-bold text-gray-900 dark:text-slate-100 text-base mb-1">QR Kod / Barkod Taraması</div>
          <p class="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
            Aşağıdaki yöntemlerden biriyle cihaz QR kodunu okutabilirsiniz.
          </p>
        </div>

        <!-- Non-HTTPS Notice -->
        <div v-if="!isSecure" class="w-full bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl p-3 text-left flex items-start gap-2.5">
          <i class="fas fa-exclamation-triangle text-amber-600 dark:text-amber-400 text-sm mt-0.5 shrink-0"></i>
          <div class="text-[11px] text-amber-900 dark:text-amber-300 leading-normal">
            <strong>HTTP Yerel Ağ Bağlantısı:</strong> Mobil tarayıcılar (Safari/Chrome) HTTP adresinde canlı video yayını kısıtlar. <strong>'Fotoğraf Çek / QR Oku'</strong> butonuna dokunarak telefonunuzun kendi kamerasıyla 1 saniyede QR okutabilirsiniz!
          </div>
        </div>

        <div class="flex flex-col gap-2.5 w-full pt-1">
          <!-- 1. Native Camera Photo Capture Button (Works 100% on HTTP & HTTPS!) -->
          <button
            @click="triggerPhotoCapture"
            :disabled="isScanningFile"
            class="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <i class="fas fa-camera text-base" :class="{ 'fa-spin fa-spinner': isScanningFile }"></i>
            <span>{{ isScanningFile ? 'QR İşleniyor...' : '📷 Fotoğraf Çek / QR Oku (Mobil Hızlı)' }}</span>
          </button>

          <!-- 2. Live Video Stream Camera Button -->
          <button
            @click="requestAndStart('environment')"
            class="w-full py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs rounded-2xl transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            <i class="fas fa-video"></i> Canlı Kamera Yayını Başlat
          </button>

          <!-- Manuel giriş -->
          <div class="relative my-1">
            <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-gray-200 dark:border-slate-700"></div></div>
            <div class="relative flex justify-center"><span class="bg-white dark:bg-slate-800 px-3 text-[11px] text-gray-400 dark:text-slate-500 font-medium">veya manuel</span></div>
          </div>
          <div class="flex gap-2">
            <input
              v-model="manualCode"
              type="text"
              placeholder="Barkod / seri no manuel gir..."
              class="flex-1 h-10 px-3 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:border-blue-500 bg-gray-50 dark:bg-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900"
              @keyup.enter="handleManualSubmit"
            />
            <button
              @click="handleManualSubmit"
              class="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white font-bold text-xs rounded-xl transition-colors"
            >
              Ara
            </button>
          </div>

          <button
            @click="closeModal"
            class="w-full py-2.5 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-300 font-bold text-sm rounded-2xl transition-colors mt-1"
          >
            İptal
          </button>
        </div>
      </div>

      <!-- ── AŞAMA 2: Kamera Aktif / Tarama ─────────────── -->
      <div v-else-if="stage === 'scanning'">
        <!-- Video Area -->
        <div class="relative bg-black overflow-hidden" style="min-height: 260px;">
          <div id="qr-reader" class="w-full"></div>

          <!-- Aktif göstergesi -->
          <div class="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 animate-pulse">
            <span class="w-1.5 h-1.5 rounded-full bg-white inline-block"></span>
            {{ currentFacing === 'environment' ? 'Arka Kamera Aktif' : 'Ön Kamera Aktif' }}
          </div>

          <!-- Kamera Değiştir -->
          <button
            @click="switchCamera"
            class="absolute top-3 right-3 w-9 h-9 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors"
            title="Kamerayı Değiştir"
          >
            <i class="fas fa-sync-alt text-sm"></i>
          </button>

          <!-- Tarama Hedefi Çizgisi -->
          <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div class="w-52 h-52 border-2 border-white/60 rounded-2xl relative">
              <div class="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-400 rounded-tl-xl"></div>
              <div class="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-400 rounded-tr-xl"></div>
              <div class="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-400 rounded-bl-xl"></div>
              <div class="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-400 rounded-br-xl"></div>
              <!-- Tarama çizgisi animasyonu -->
              <div class="scan-line"></div>
            </div>
          </div>
        </div>

        <!-- Kamera Değiştir Butonu -->
        <div class="px-5 pt-3 pb-2 flex items-center justify-between">
          <p class="text-xs text-gray-500 dark:text-slate-400">Kodu kareye hizalayın, otomatik okuyacak.</p>
          <button
            @click="switchCamera"
            class="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 active:bg-gray-300 dark:active:bg-slate-500 text-gray-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-colors"
          >
            <i class="fas fa-sync-alt"></i>
            {{ currentFacing === 'environment' ? 'Ön Kamera' : 'Arka Kamera' }}
          </button>
        </div>

        <!-- Manuel Giriş -->
        <div class="px-5 pb-5 border-t border-gray-100 dark:border-slate-700 pt-3">
          <div class="text-[10.5px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2">Manuel Giriş</div>
          <div class="flex gap-2">
            <input
              v-model="manualCode"
              type="text"
              placeholder="Barkod veya seri no yaz..."
              class="flex-1 h-10 px-3 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:border-blue-500 bg-gray-50 dark:bg-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900"
              @keyup.enter="handleManualSubmit"
            />
            <button
              @click="handleManualSubmit"
              class="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs rounded-xl transition-colors"
            >
              Ara
            </button>
          </div>
        </div>
      </div>

      <!-- ── AŞAMA 3: Hata ───────────────────────────────── -->
      <div v-else-if="stage === 'error'" class="px-5 py-6 flex flex-col gap-4">

        <!-- İzin Reddedildi ekranı -->
        <div v-if="errorType === 'permission-denied'" class="flex flex-col gap-4">
          <div class="flex flex-col items-center gap-3 text-center">
            <div class="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
              <i class="fas fa-ban text-red-500 dark:text-red-400 text-2xl"></i>
            </div>
            <div>
              <div class="font-bold text-gray-900 dark:text-slate-100 text-base mb-1">Kamera İzni Verilmemiş</div>
              <p class="text-sm text-gray-500 dark:text-slate-400">Kamera iznini tarayıcı ayarlarından manuel olarak açmanız gerekiyor.</p>
            </div>
          </div>

          <!-- iOS Safari Adımları -->
          <div class="bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/30 rounded-2xl p-4 space-y-3">
            <div class="font-bold text-blue-800 dark:text-blue-300 text-xs flex items-center gap-2">
              <i class="fab fa-apple"></i> iPhone / iPad — Safari için:
            </div>
            <ol class="space-y-2.5 text-xs text-gray-700 dark:text-slate-300">
              <li class="flex items-start gap-2.5">
                <span class="w-5 h-5 rounded-full bg-blue-600 text-white font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                <span>iPhone'unuzun <strong>Ayarlar</strong> uygulamasını açın <i class="fas fa-cog text-gray-400 dark:text-slate-500 ml-0.5"></i></span>
              </li>
              <li class="flex items-start gap-2.5">
                <span class="w-5 h-5 rounded-full bg-blue-600 text-white font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                <span>Aşağı kaydırarak <strong>Safari</strong>'yi bulun ve açın</span>
              </li>
              <li class="flex items-start gap-2.5">
                <span class="w-5 h-5 rounded-full bg-blue-600 text-white font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                <span><strong>Kamera</strong> satırına dokunun → <strong>İzin Ver</strong> seçin</span>
              </li>
              <li class="flex items-start gap-2.5">
                <span class="w-5 h-5 rounded-full bg-blue-600 text-white font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">4</span>
                <span>Bu sayfaya geri dönüp <strong>Tekrar Dene</strong>'ye basın</span>
              </li>
            </ol>
          </div>

          <!-- Android Chrome Adımları -->
          <div class="bg-green-50 dark:bg-green-500/10 border border-green-100 dark:border-green-500/30 rounded-2xl p-4 space-y-3">
            <div class="font-bold text-green-800 dark:text-green-300 text-xs flex items-center gap-2">
              <i class="fab fa-android"></i> Android — Chrome için:
            </div>
            <ol class="space-y-2.5 text-xs text-gray-700 dark:text-slate-300">
              <li class="flex items-start gap-2.5">
                <span class="w-5 h-5 rounded-full bg-green-600 text-white font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                <span>Adres çubuğunun solundaki <strong>🔒 kilit</strong> veya <strong>ⓘ bilgi</strong> simgesine dokunun</span>
              </li>
              <li class="flex items-start gap-2.5">
                <span class="w-5 h-5 rounded-full bg-green-600 text-white font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                <span><strong>İzinler</strong> → <strong>Kamera</strong> → <strong>İzin Ver</strong></span>
              </li>
              <li class="flex items-start gap-2.5">
                <span class="w-5 h-5 rounded-full bg-green-600 text-white font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                <span>Sayfayı yenileyin ve tekrar deneyin</span>
              </li>
            </ol>
          </div>

          <!-- Görsel ipucu (Safari adres çubuğu) -->
          <div class="bg-gray-50 dark:bg-slate-900 border border-dashed border-gray-200 dark:border-slate-700 rounded-xl p-3 flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-gray-200 dark:bg-slate-700 flex items-center justify-center shrink-0">
              <i class="fas fa-lightbulb text-amber-500 dark:text-amber-400 text-sm"></i>
            </div>
            <p class="text-[11px] text-gray-600 dark:text-slate-400 leading-relaxed">
              <strong>İpucu:</strong> Safari'de adres çubuğuna <span class="font-mono bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-1 rounded text-[10px]">aa</span> harflerine dokunup <strong>Web Sitesi Ayarları</strong> → <strong>Kamera → İzin Ver</strong> diyebilirsiniz.
            </p>
          </div>
        </div>

        <!-- Diğer hatalar -->
        <div v-else class="flex flex-col items-center gap-3 text-center">
          <div class="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
            <i class="fas fa-exclamation-triangle text-red-500 dark:text-red-400 text-xl"></i>
          </div>
          <div>
            <div class="font-bold text-gray-900 dark:text-slate-100 text-sm mb-1">Kamera Açılamadı</div>
            <p class="text-xs text-gray-500 dark:text-slate-400">{{ errorMessage }}</p>
          </div>
        </div>

        <!-- Manuel giriş (her iki hata türünde de görünür) -->
        <div class="border-t border-gray-100 dark:border-slate-700 pt-4">
          <div class="text-[10.5px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2">
            <i class="fas fa-keyboard mr-1"></i>Alternatif: Manuel Giriş
          </div>
          <div class="flex gap-2">
            <input
              v-model="manualCode"
              type="text"
              placeholder="Barkod veya seri no girin..."
              class="flex-1 h-10 px-3 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:border-blue-500 bg-gray-50 dark:bg-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900"
              @keyup.enter="handleManualSubmit"
            />
            <button
              @click="handleManualSubmit"
              class="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs rounded-xl transition-colors"
            >
              Ara
            </button>
          </div>
        </div>

        <!-- Aksiyon butonları -->
        <div class="flex gap-2">
          <button
            @click="stage = 'permission'"
            class="flex-1 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm rounded-2xl transition-colors flex items-center justify-center gap-2"
          >
            <i class="fas fa-redo"></i> Tekrar Dene
          </button>
          <button
            @click="closeModal"
            class="flex-1 py-3 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-300 font-bold text-sm rounded-2xl transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted, nextTick } from 'vue'
import { Html5Qrcode } from 'html5-qrcode'

const props = defineProps({ show: Boolean })
const emit = defineEmits(['close', 'scan-result'])

// stage: 'permission' | 'scanning' | 'error'
const stage = ref('permission')
const currentFacing = ref('environment')
const manualCode = ref('')
const errorMessage = ref('')
const errorType = ref('') // 'permission-denied' | 'other'

const fileInput = ref(null)
const isScanningFile = ref(false)

const isSecure = computed(() => {
  if (typeof window === 'undefined') return true
  return window.isSecureContext || ['localhost', '127.0.0.1'].includes(window.location.hostname)
})

// ── URL ve QR içerik ayrıştırma yardımcısı ──────────────
const extractAssetCode = (rawText) => {
  let code = String(rawText).trim()
  // 1. JSON formatı
  try {
    const parsed = JSON.parse(code)
    if (parsed && (parsed.serial_no || parsed.barcode || parsed.id)) {
      return parsed.serial_no || parsed.barcode || String(parsed.id)
    }
  } catch {}
  // 2. URL formatı: .../scan/asset/123 veya .../assets/123
  const scanMatch = code.match(/\/scan\/asset\/(\d+)/i)
  if (scanMatch) return scanMatch[1]
  const assetsMatch = code.match(/\/assets\/(\d+)/i)
  if (assetsMatch) return assetsMatch[1]
  // 3. URL query parametresi: ?id=123 veya ?asset_id=123
  if (code.startsWith('http://') || code.startsWith('https://')) {
    try {
      const u = new URL(code)
      const idParam = u.searchParams.get('id') || u.searchParams.get('asset_id') || u.searchParams.get('code')
      if (idParam) return idParam
    } catch {}
  }
  // 4. Ham metin olarak döndür
  return code
}

const triggerPhotoCapture = () => {
  fileInput.value?.click()
}

const handleFileUpload = async (e) => {
  const file = e.target.files[0]
  if (!file) return
  isScanningFile.value = true
  try {
    const html5Qr = new Html5Qrcode('qr-reader-file', false)
    const decodedText = await html5Qr.scanFile(file, true)
    const code = extractAssetCode(decodedText)
    await stopScanner()
    emit('scan-result', code)
    emit('close')
  } catch (err) {
    alert('Görselde okunabilir bir QR kod veya barkod bulunamadı. Lütfen koda daha yakın net bir fotoğraf çekip tekrar deneyiniz.')
  } finally {
    isScanningFile.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

let html5QrCode = null

// ── Kamerayı başlat ──────────────────────────────────────
const requestAndStart = async (facing) => {
  currentFacing.value = facing
  
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    // Mobil tarayıcılarda HTTP uyarısı: Canlı yayın API'si kapalıysa otomatik fotoğraf çekimini tetikle
    stage.value = 'permission'
    triggerPhotoCapture()
    return
  }

  stage.value = 'scanning'
  await nextTick()

  try {
    // Önce tarayıcıdan izin iste
    await navigator.mediaDevices.getUserMedia({ video: true })
  } catch (permErr) {
    stage.value = 'error'
    errorType.value = 'permission-denied'
    errorMessage.value = 'Kamera erişim izni reddedildi.'
    return
  }

  try {
    html5QrCode = new Html5Qrcode('qr-reader')
    await html5QrCode.start(
      { facingMode: facing },
      {
        fps: 12,
        qrbox: { width: 200, height: 200 },
        aspectRatio: 1.0
      },
      (decodedText) => {
        const code = extractAssetCode(decodedText)
        stopScanner()
        emit('scan-result', code)
        emit('close')
      },
      () => {
        // Frame başına gelen okuma hatalarını sessizce geç
      }
    )
  } catch (err) {
    stage.value = 'error'
    const msg = err?.name || err?.message || ''
    if (msg.includes('NotAllowed') || msg.includes('Permission')) {
      errorType.value = 'permission-denied'
      errorMessage.value = 'Kamera erişim izni reddedildi.'
    } else if (msg.includes('NotReadable') || msg.includes('in use')) {
      errorType.value = 'other'
      errorMessage.value = 'Kamera başka bir uygulama tarafından kullanılıyor. Diğer uygulamaları kapatıp tekrar deneyin.'
    } else if (msg.includes('NotFound')) {
      errorType.value = 'other'
      errorMessage.value = 'Cihazda bu yönde kamera bulunamadı.'
    } else {
      errorType.value = 'other'
      errorMessage.value = `Kamera başlatılamadı: ${err?.message || 'Bilinmeyen hata'}`
    }
  }
}

// ── Kamerayı durdur ──────────────────────────────────────
const stopScanner = async () => {
  if (html5QrCode) {
    try {
      if (html5QrCode.isScanning) await html5QrCode.stop()
      html5QrCode.clear()
    } catch {
      // sessizce temizle
    }
    html5QrCode = null
  }
}

// ── Kamera değiştir (arka ↔ ön) ─────────────────────────
const switchCamera = async () => {
  await stopScanner()
  const next = currentFacing.value === 'environment' ? 'user' : 'environment'
  await requestAndStart(next)
}

// ── Kapat ────────────────────────────────────────────────
const closeModal = async () => {
  await stopScanner()
  stage.value = 'permission'
  manualCode.value = ''
  errorMessage.value = ''
  errorType.value = ''
  emit('close')
}

// ── Manuel Giriş ─────────────────────────────────────────
const handleManualSubmit = async () => {
  if (!manualCode.value.trim()) return
  await stopScanner()
  emit('scan-result', manualCode.value.trim())
  manualCode.value = ''
  stage.value = 'permission'
  emit('close')
}

// ── Show/hide watcher ────────────────────────────────────
watch(() => props.show, async (newVal) => {
  if (newVal) {
    // Modal açıldığında izin ekranını göster
    stage.value = 'permission'
    manualCode.value = ''
    errorMessage.value = ''
    errorType.value = ''
  } else {
    await stopScanner()
    stage.value = 'permission'
  }
})

onUnmounted(() => stopScanner())
</script>

<style scoped>
/* Tarama çizgisi animasyonu */
.scan-line {
  position: absolute;
  left: 10%;
  right: 10%;
  top: 10%;
  height: 2px;
  background: linear-gradient(to right, transparent, #3b82f6, transparent);
  border-radius: 9999px;
  animation: scan 2s ease-in-out infinite;
}

@keyframes scan {
  0%   { top: 10%; opacity: 1; }
  50%  { top: 85%; opacity: 0.8; }
  100% { top: 10%; opacity: 1; }
}
</style>
