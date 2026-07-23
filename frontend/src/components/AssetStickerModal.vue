<template>
  <div v-if="show && (asset || (assets && assets.length > 0))" class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 print:p-0 print:static print:bg-transparent overflow-y-auto">
    <div class="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl relative print:shadow-none print:w-full print:p-0">
      
      <!-- Modal Header (Hidden on Print) -->
      <div class="flex items-center justify-between border-b pb-3 mb-4 print:hidden">
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-base font-bold">
            <i class="fas fa-barcode"></i>
          </div>
          <div>
            <h3 class="font-bold text-gray-900 text-sm">Termal Etiket Baskı Önizlemesi</h3>
            <p class="text-[11.5px] text-gray-500 font-medium">
              Aktif Şablon: <span class="font-bold text-blue-600">{{ activeTemplateName }}</span> ({{ activeWidth }}x{{ activeHeight }} mm) {{ isMulti ? `(${assets.length} Adet)` : '' }}
            </p>
          </div>
        </div>
        <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600 text-lg font-bold">
          &times;
        </button>
      </div>

      <!-- Mode Selector for Multi-Print & Template Switcher (Hidden on Print) -->
      <div class="flex items-center justify-between gap-2 mb-4 bg-gray-100 p-1 rounded-lg text-xs font-bold print:hidden">
        <div v-if="isMulti" class="flex items-center gap-1">
          <button 
            @click="labelFormat = 'custom'"
            :class="['px-3 py-1.5 rounded transition-all', labelFormat === 'custom' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500']"
          >
            <i class="fas fa-scroll mr-1"></i> Termal Rulo
          </button>
          <button 
            @click="labelFormat = 'A4_Sheet'"
            :class="['px-3 py-1.5 rounded transition-all', labelFormat === 'A4_Sheet' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500']"
          >
            <i class="fas fa-th mr-1"></i> A4 Tabaka (3x8)
          </button>
        </div>

        <select v-if="savedTemplates.length > 1" v-model="selectedTemplateId" @change="onTemplateChange" class="h-7 px-2 bg-white border border-gray-200 rounded text-[11px] font-bold text-gray-700 outline-none cursor-pointer ml-auto">
          <option v-for="t in savedTemplates" :key="t.id" :value="t.id">
            {{ t.name }} ({{ t.width_mm }}x{{ t.height_mm }}mm)
          </option>
        </select>
      </div>

      <!-- PRINTABLE STICKER AREA -->
      <div id="sticker-print-area" class="flex flex-col items-center justify-center bg-gray-50 p-6 border border-dashed border-gray-300 rounded-xl print:bg-white print:border-none print:p-0 max-h-[65vh] overflow-y-auto">
        
        <!-- DYNAMIC CUSTOM SAVED TEMPLATE RENDER -->
        <div v-if="labelFormat === 'custom'" class="flex flex-col gap-4 items-center">
          <div 
            v-for="(item, idx) in activeList" 
            :key="item.id || idx"
            class="sticker-card bg-white border-2 border-black rounded-lg text-black relative select-none shadow-md print:shadow-none print:border-black print:page-break-after-always overflow-hidden"
            :style="{ width: `${activeWidth * 4.5}px`, height: `${activeHeight * 4.5}px` }"
          >
            <!-- Render Dynamic Elements from Saved Studio Config -->
            <div 
              v-for="el in customElements" 
              :key="el.id"
              class="absolute"
              :style="{
                left: `${el.x}%`,
                top: `${el.y}%`,
                fontSize: el.fontSize ? `${el.fontSize}px` : '12px',
                fontWeight: el.fontWeight === 'extrabold' ? '900' : (el.fontWeight || 'normal'),
                color: el.color || '#000000',
                backgroundColor: el.bg || 'transparent',
                lineHeight: '1.2'
              }"
            >
              <!-- QR CODE: canvas rendered at exact el.size pixels, no CSS override -->
              <canvas 
                v-if="el.type === 'qr'" 
                :ref="e => setQrCanvasRef(e, idx)"
                :style="{ display: 'block', width: `${el.size || 70}px`, height: `${el.size || 70}px` }"
              ></canvas>

              <!-- 1D BARCODE: SVG at explicit height, width auto -->
              <svg 
                v-else-if="el.type === 'barcode1d'" 
                :ref="e => setBarcodeSvgRef(e, idx)"
                :style="{ display: 'block', height: `${el.height || 22}px`, width: `${activeWidth * 4.5 * 0.9}px` }"
              ></svg>

              <!-- DYNAMIC TEXT FIELDS -->
              <span v-else-if="el.type === 'company'" class="font-black uppercase tracking-wider whitespace-nowrap">
                {{ item.company_name || 'TALAY LOJİSTİK' }}
              </span>
              <span v-else-if="el.type === 'model'" class="font-black whitespace-nowrap">
                {{ formatModelName(item.brand_name, item.model_name) }}
              </span>
              <span v-else-if="el.type === 'serial'" class="font-mono font-bold whitespace-nowrap">
                SN: {{ item.serial_no }}
              </span>
              <span v-else-if="el.type === 'barcode_text'" class="font-mono font-extrabold whitespace-nowrap">
                ENV NO: {{ item.barcode }}
              </span>
              <span v-else-if="el.type === 'category'" class="uppercase font-bold whitespace-nowrap" style="font-size: 10px;">
                {{ item.category_name }}
              </span>
              <span v-else-if="el.type === 'custom_text'" class="whitespace-nowrap">
                {{ el.text || 'Özel Yazı' }}
              </span>
            </div>
          </div>
        </div>

        <!-- A4 STICKER SHEET GRID (For Multi-Print) -->
        <div v-else class="w-full bg-white p-2 print:p-0">
          <div class="grid grid-cols-3 gap-2 print:gap-1.5 w-full">
            <div 
              v-for="(item, idx) in activeList" 
              :key="item.id || idx"
              class="border-2 border-black rounded p-2 text-black flex items-center gap-2 bg-white text-left h-[115px]"
            >
              <div class="w-[60px] h-[60px] shrink-0">
                <canvas :ref="e => setQrCanvasRef(e, idx)" class="w-full h-full"></canvas>
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-extrabold text-[8.5px] uppercase text-gray-900 truncate">{{ item.company_name || 'TALAY LOJİSTİK' }}</div>
                <div class="font-black text-[10px] text-gray-900 line-clamp-2 leading-tight my-0.5">{{ item.brand_name }} {{ item.model_name }}</div>
                <div class="font-mono text-[9.5px] font-bold text-blue-800">SN: {{ item.serial_no }}</div>
                <div v-if="item.barcode" class="font-mono text-[9px] font-extrabold text-black">ENV NO: {{ item.barcode }}</div>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- Action Buttons (Hidden on Print) -->
      <div class="flex items-center justify-between mt-5 print:hidden">
        <span class="text-xs font-bold text-gray-500">
          Etiket Boyutu: <span class="text-gray-900">{{ activeWidth }} mm x {{ activeHeight }} mm</span>
        </span>
        <div class="flex items-center gap-2">
          <button @click="$emit('close')" class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg transition-colors">
            Kapat
          </button>
          <button @click="triggerPrint" class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-md">
            <i class="fas fa-print"></i> Etiket Yazdır
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import axios from 'axios'
import QRCode from 'qrcode'
import JsBarcode from 'jsbarcode'

const props = defineProps({
  show: Boolean,
  asset: Object,
  assets: Array
})

defineEmits(['close'])

const labelFormat = ref('custom')
const savedTemplates = ref([])
const selectedTemplateId = ref(null)
const activeTemplate = ref(null)

const qrCanvasRefs = ref([])
const barcodeSvgRefs = ref([])

const isMulti = computed(() => props.assets && props.assets.length > 0)
const activeList = computed(() => {
  if (isMulti.value) return props.assets
  if (props.asset) return [props.asset]
  return []
})

const activeWidth = computed(() => activeTemplate.value?.width_mm || 70)
const activeHeight = computed(() => activeTemplate.value?.height_mm || 35)
const activeTemplateName = computed(() => activeTemplate.value?.name || 'Standart 70x35mm')

const customElements = computed(() => {
  if (!activeTemplate.value?.config_json) {
    return defaultFallbackElements
  }
  try {
    const parsed = typeof activeTemplate.value.config_json === 'string'
      ? JSON.parse(activeTemplate.value.config_json)
      : activeTemplate.value.config_json
    return parsed.elements || defaultFallbackElements
  } catch (e) {
    return defaultFallbackElements
  }
})

const defaultFallbackElements = [
  { id: 'company', type: 'company', label: 'Şirket Adı', x: 5, y: 4, fontSize: 10, fontWeight: 'extrabold', color: '#000000' },
  { id: 'qr', type: 'qr', label: 'QR Kod', x: 5, y: 28, size: 75 },
  { id: 'model', type: 'model', label: 'Marka & Model', x: 34, y: 28, fontSize: 12, fontWeight: 'extrabold', color: '#000000' },
  { id: 'serial', type: 'serial', label: 'Seri No', x: 34, y: 52, fontSize: 11, fontWeight: 'bold', color: '#1e40af' },
  { id: 'barcode', type: 'barcode_text', label: 'Envanter No', x: 34, y: 72, fontSize: 10.5, fontWeight: 'bold', color: '#000000' },
  { id: 'barcode1d', type: 'barcode1d', label: '1D Lazer Barkod', x: 5, y: 88, height: 22 }
]

const formatModelName = (brand, model) => {
  if (!model) return brand || ''
  if (!brand) return model
  if (model.toLowerCase().startsWith(brand.toLowerCase())) {
    return model
  }
  return `${brand} ${model}`
}

const setQrCanvasRef = (el, idx) => {
  if (el) qrCanvasRefs.value[idx] = el
}

const setBarcodeSvgRef = (el, idx) => {
  if (el) barcodeSvgRefs.value[idx] = el
}

const fetchTemplates = async () => {
  try {
    const res = await axios.get('/api/assets/label-templates')
    savedTemplates.value = res.data || []
    const defaultT = savedTemplates.value.find(t => t.is_default) || savedTemplates.value[0]
    if (defaultT) {
      activeTemplate.value = defaultT
      selectedTemplateId.value = defaultT.id
    }
  } catch (e) {
    console.error('Fetch label templates error:', e)
  }
}

const onTemplateChange = () => {
  const t = savedTemplates.value.find(tmpl => tmpl.id === Number(selectedTemplateId.value))
  if (t) {
    activeTemplate.value = t
    renderCodes()
  }
}

const renderCodes = async () => {
  if (activeList.value.length === 0) return
  await nextTick()

  const qrEl = customElements.value.find(e => e.type === 'qr')
  const qrSize = qrEl ? (qrEl.size || 70) : 70

  const barcodeEl = customElements.value.find(e => e.type === 'barcode1d')
  const barcodeHeight = barcodeEl ? (barcodeEl.height || 22) : 22

  activeList.value.forEach((item, idx) => {
    // 1. Render QR Code — use exact pixel width matching the template, then lock CSS size
    const canvas = qrCanvasRefs.value[idx]
    if (canvas) {
      const auditUrl = `${window.location.protocol}//${window.location.host}/scan/asset/${item.id}`
      QRCode.toCanvas(canvas, auditUrl, {
        width: qrSize,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' }
      }, (err) => {
        if (err) {
          console.error('QR render error:', err)
        } else {
          // Force CSS size to match the drawn pixel size so the canvas doesn't get CSS-scaled
          canvas.style.width = `${qrSize}px`
          canvas.style.height = `${qrSize}px`
        }
      })
    }

    // 2. Render 1D Barcode (CODE128)
    const svg = barcodeSvgRefs.value[idx]
    if (svg) {
      try {
        JsBarcode(svg, item.barcode || item.serial_no, {
          format: 'CODE128',
          height: barcodeHeight,
          displayValue: false,
          margin: 1,
          lineColor: '#000000'
        })
      } catch (e) {
        console.error('JsBarcode render error:', e)
      }
    }
  })
}

watch(() => [props.show, props.asset, props.assets, labelFormat.value], () => {
  if (props.show) {
    qrCanvasRefs.value = []
    barcodeSvgRefs.value = []
    fetchTemplates().then(() => {
      renderCodes()
    })
  }
})

const triggerPrint = () => {
  const printArea = document.getElementById('sticker-print-area')
  if (!printArea) return

  // Clone the sticker area content
  const cloned = printArea.cloneNode(true)

  // Convert all canvas elements (QR codes) to images in the clone
  const srcCanvases = printArea.querySelectorAll('canvas')
  const clonedCanvases = cloned.querySelectorAll('canvas')
  srcCanvases.forEach((srcCanvas, i) => {
    const img = document.createElement('img')
    img.src = srcCanvas.toDataURL('image/png')
    img.style.width = srcCanvas.style.width || srcCanvas.width + 'px'
    img.style.height = srcCanvas.style.height || srcCanvas.height + 'px'
    img.style.display = 'block'
    if (clonedCanvases[i]) {
      clonedCanvases[i].parentNode.replaceChild(img, clonedCanvases[i])
    }
  })

  // Open a minimal print window
  const printWin = window.open('', '_blank', 'width=900,height=650')
  if (!printWin) {
    alert('Popup penceresi açılamadı. Lütfen tarayıcı popup engelini kaldırın.')
    return
  }

  printWin.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8"/>
      <title>Termal Etiket Baskı</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: white; }
        @page {
          margin: 4mm;
          size: ${activeWidth.value}mm ${activeHeight.value * activeList.value.length + 4 * (activeList.value.length - 1)}mm;
        }
        @media print {
          body { margin: 0; padding: 0; }
        }
        .sticker-wrapper {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 4px;
        }
        .sticker-card {
          position: relative;
          overflow: hidden;
          border: 2px solid black;
          border-radius: 4px;
          background: white;
          color: black;
          page-break-after: always;
        }
        .absolute { position: absolute; }
        .font-black { font-weight: 900; }
        .font-extrabold { font-weight: 900; }
        .font-bold { font-weight: 700; }
        .font-mono { font-family: monospace; }
        .uppercase { text-transform: uppercase; }
        .tracking-wider { letter-spacing: 0.05em; }
        .whitespace-nowrap { white-space: nowrap; }
      </style>
    </head>
    <body>
      <div class="sticker-wrapper">${cloned.innerHTML}</div>
    </body>
    </html>
  `)

  printWin.document.close()
  printWin.focus()

  // Wait for images to load before printing
  setTimeout(() => {
    printWin.print()
    printWin.close()
  }, 600)
}
</script>
