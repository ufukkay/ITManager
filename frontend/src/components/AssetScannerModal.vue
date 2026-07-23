<template>
  <div v-if="show" class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
      <!-- Header -->
      <div class="flex items-center justify-between border-b pb-3 mb-4">
        <div class="flex items-center gap-2">
          <i class="fas fa-camera text-blue-600 text-lg"></i>
          <h3 class="font-bold text-gray-900 text-sm">Kameralı QR / Barkod Taraması</h3>
        </div>
        <button @click="closeModal" class="text-gray-400 hover:text-gray-600 text-lg font-bold">
          &times;
        </button>
      </div>

      <!-- Scanner Area -->
      <div class="relative rounded-xl overflow-hidden bg-black min-h-[260px] flex items-center justify-center">
        <div id="reader" class="w-full"></div>
        <div v-if="scanning" class="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1.5 animate-pulse">
          <span class="w-1.5 h-1.5 rounded-full bg-white"></span>
          Kamera Aktif (Tarama Yapılıyor)
        </div>
      </div>

      <p class="text-center text-xs text-gray-500 mt-3">
        Kamerayı varlığın QR koduna veya Barkoduna hizalayın.
      </p>

      <!-- Manual Input Option -->
      <div class="mt-4 pt-3 border-t flex gap-2">
        <input 
          v-model="manualCode"
          type="text"
          placeholder="Veya barkod/seri no yazın..."
          class="flex-1 h-9 px-3 border border-gray-300 rounded-lg text-xs font-medium outline-none focus:border-blue-500"
          @keyup.enter="handleManualSubmit"
        />
        <button @click="handleManualSubmit" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg">
          Ara
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onUnmounted, nextTick } from 'vue'
import { Html5Qrcode } from 'html5-qrcode'

const props = defineProps({
  show: Boolean
})

const emit = defineEmits(['close', 'scan-result'])

const scanning = ref(false)
const manualCode = ref('')
let html5QrcodeScanner = null

const startScanner = async () => {
  await nextTick()
  try {
    html5QrcodeScanner = new Html5Qrcode('reader')
    scanning.value = true

    await html5QrcodeScanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 220, height: 220 } },
      (decodedText) => {
        let code = decodedText
        try {
          const parsed = JSON.parse(decodedText)
          if (parsed && (parsed.serial_no || parsed.barcode)) {
            code = parsed.serial_no || parsed.barcode
          }
        } catch (e) {
          // not json, use raw text
        }

        stopScanner()
        emit('scan-result', code)
        emit('close')
      },
      (errorMessage) => {
        // ignore scan errors per frame
      }
    )
  } catch (err) {
    console.error('Camera access error:', err)
    scanning.value = false
  }
}

const stopScanner = async () => {
  if (html5QrcodeScanner && scanning.value) {
    try {
      await html5QrcodeScanner.stop()
      html5QrcodeScanner.clear()
    } catch (e) {
      // quiet cleanup
    }
    scanning.value = false
  }
}

const closeModal = async () => {
  await stopScanner()
  emit('close')
}

const handleManualSubmit = async () => {
  if (!manualCode.value) return
  await stopScanner()
  emit('scan-result', manualCode.value)
  manualCode.value = ''
  emit('close')
}

watch(() => props.show, (newVal) => {
  if (newVal) {
    startScanner()
  } else {
    stopScanner()
  }
})

onUnmounted(() => {
  stopScanner()
})
</script>
