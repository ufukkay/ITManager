<template>
  <div v-if="show" class="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center" @click.self="closeModal">
    <div class="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl shadow-2xl overflow-hidden">

      <!-- ── Header ─────────────────────────────────────── -->
      <div class="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
            <i class="fas fa-camera text-sm"></i>
          </div>
          <div>
            <h3 class="font-bold text-gray-900 text-sm leading-tight">QR / Barkod Tarama</h3>
            <p class="text-[10.5px] text-gray-400">Kamerayı koda hizalayın</p>
          </div>
        </div>
        <button @click="closeModal" class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 active:bg-gray-200 text-gray-500 transition-colors text-xl font-bold">
          &times;
        </button>
      </div>

      <!-- ── AŞAMA 1: İzin İsteme ───────────────────────── -->
      <div v-if="stage === 'permission'" class="px-5 py-8 flex flex-col items-center gap-4 text-center">
        <div class="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center">
          <i class="fas fa-camera text-blue-600 text-3xl"></i>
        </div>
        <div>
          <div class="font-bold text-gray-900 text-base mb-1">Kamera İzni Gerekli</div>
          <p class="text-sm text-gray-500 leading-relaxed">
            QR kod ve barkod tarayabilmek için kameranıza erişim gerekiyor.<br>
            <span class="text-blue-600 font-semibold">Önce arka kamera açılacaktır.</span>
          </p>
        </div>
        <div class="flex flex-col gap-2 w-full pt-2">
          <button
            @click="requestAndStart('environment')"
            class="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm rounded-2xl transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            <i class="fas fa-camera"></i> Arka Kamerayı Aç
          </button>
          <button
            @click="closeModal"
            class="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm rounded-2xl transition-colors"
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
          <p class="text-xs text-gray-500">Kodu kareye hizalayın, otomatik okuyacak.</p>
          <button
            @click="switchCamera"
            class="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 font-bold text-xs rounded-xl transition-colors"
          >
            <i class="fas fa-sync-alt"></i>
            {{ currentFacing === 'environment' ? 'Ön Kamera' : 'Arka Kamera' }}
          </button>
        </div>

        <!-- Manuel Giriş -->
        <div class="px-5 pb-5 border-t border-gray-100 pt-3">
          <div class="text-[10.5px] font-bold text-gray-400 uppercase tracking-wider mb-2">Manuel Giriş</div>
          <div class="flex gap-2">
            <input
              v-model="manualCode"
              type="text"
              placeholder="Barkod veya seri no yaz..."
              class="flex-1 h-10 px-3 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:border-blue-500 bg-gray-50 focus:bg-white"
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
      <div v-else-if="stage === 'error'" class="px-5 py-8 flex flex-col items-center gap-4 text-center">
        <div class="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
          <i class="fas fa-times-circle text-red-500 text-2xl"></i>
        </div>
        <div>
          <div class="font-bold text-gray-900 text-base mb-1">Kamera Açılamadı</div>
          <p class="text-sm text-gray-500 leading-relaxed">{{ errorMessage }}</p>
        </div>
        <!-- Manuel Giriş fallback -->
        <div class="w-full pt-2 border-t border-gray-100">
          <div class="text-xs font-bold text-gray-500 mb-2">Manuel olarak kodu girin:</div>
          <div class="flex gap-2">
            <input
              v-model="manualCode"
              type="text"
              placeholder="Barkod veya seri no..."
              class="flex-1 h-10 px-3 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:border-blue-500 bg-gray-50"
              @keyup.enter="handleManualSubmit"
            />
            <button
              @click="handleManualSubmit"
              class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl"
            >
              Ara
            </button>
          </div>
        </div>
        <div class="flex gap-2 w-full">
          <button
            @click="stage = 'permission'"
            class="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm rounded-2xl transition-colors"
          >
            <i class="fas fa-redo mr-1"></i> Tekrar Dene
          </button>
          <button
            @click="closeModal"
            class="flex-1 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-sm rounded-2xl transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, watch, onUnmounted, nextTick } from 'vue'
import { Html5Qrcode } from 'html5-qrcode'

const props = defineProps({ show: Boolean })
const emit = defineEmits(['close', 'scan-result'])

// stage: 'permission' | 'scanning' | 'error'
const stage = ref('permission')
const currentFacing = ref('environment')
const manualCode = ref('')
const errorMessage = ref('')

let html5QrCode = null

// ── Kamerayı başlat ──────────────────────────────────────
const requestAndStart = async (facing) => {
  currentFacing.value = facing
  stage.value = 'scanning'
  await nextTick()

  try {
    // Önce tarayıcıdan izin iste
    await navigator.mediaDevices.getUserMedia({ video: true })
  } catch (permErr) {
    stage.value = 'error'
    errorMessage.value = 'Kamera erişim izni reddedildi. Tarayıcı ayarlarından kamera iznini verin ve tekrar deneyin.'
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
        // QR içeriğini parse et
        let code = decodedText.trim()
        try {
          const parsed = JSON.parse(decodedText)
          if (parsed && (parsed.serial_no || parsed.barcode || parsed.id)) {
            code = parsed.serial_no || parsed.barcode || String(parsed.id)
          }
        } catch {
          // Raw string ise olduğu gibi kullan
        }
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
    if (err?.message?.includes('NotReadableError') || err?.message?.includes('in use')) {
      errorMessage.value = 'Kamera başka bir uygulama tarafından kullanılıyor. Diğer uygulamaları kapatıp tekrar deneyin.'
    } else if (err?.message?.includes('NotFoundError')) {
      errorMessage.value = 'Cihazda bu yönde kamera bulunamadı.'
    } else {
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
