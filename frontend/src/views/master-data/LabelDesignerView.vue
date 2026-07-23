<template>
  <div class="h-full flex flex-col bg-gray-50/50 overflow-hidden">
    <!-- TOP BAR / HEADER -->
    <header class="h-14 border-b border-gray-200 flex items-center justify-between px-6 bg-white shrink-0 shadow-sm">
      <div class="flex items-center gap-3">
        <RouterLink to="/master-data/asset-definitions" class="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors">
          <i class="fas fa-arrow-left text-sm"></i>
        </RouterLink>
        <div>
          <h1 class="text-sm font-bold text-gray-900 flex items-center gap-2">
            <i class="fas fa-ruler-combined text-blue-600"></i> Sürükle-Bırak Termal Etiket Studio
          </h1>
          <p class="text-[11px] text-gray-400">Milimetrik kanvas üzerinde etiket boyutunu, QR kodu ve metinleri özelleştirin</p>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center gap-2">
        <select v-model="selectedTemplateId" @change="loadSelectedTemplate" class="h-8 px-3 bg-gray-50 border border-gray-200 rounded text-xs font-bold text-gray-700 outline-none focus:border-blue-500 cursor-pointer">
          <option value="">-- Kayıtlı Şablon Seçin --</option>
          <option v-for="t in savedTemplates" :key="t.id" :value="t.id">
            {{ t.name }} ({{ t.width_mm }}x{{ t.height_mm }}mm) {{ t.is_default ? '★ Varsayılan' : '' }}
          </option>
        </select>

        <button @click="openSaveModal" class="h-8 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors shadow-sm">
          <i class="fas fa-save"></i> Şablonu Kaydet
        </button>
      </div>
    </header>

    <!-- MAIN STUDIO WORKSPACE -->
    <div class="flex-1 flex overflow-hidden">
      <!-- LEFT PALETTE: COMPONENT LIBRARY & CANVAS DIMENSIONS -->
      <aside class="w-72 bg-white border-r border-gray-200 flex flex-col p-4 shrink-0 overflow-y-auto">
        <!-- Paper Size Controls -->
        <div class="mb-5 pb-4 border-b border-gray-100">
          <h3 class="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <i class="fas fa-expand-alt text-blue-600"></i> Etiket Kağıt Boyutu
          </h3>
          <div class="grid grid-cols-2 gap-2 mb-3">
            <div>
              <label class="text-[10px] font-bold text-gray-500 uppercase">Genişlik (mm)</label>
              <input v-model.number="canvasWidthMM" type="number" class="h-8 w-full px-2 bg-gray-50 border border-gray-200 rounded text-xs font-bold text-gray-800" min="20" max="200" />
            </div>
            <div>
              <label class="text-[10px] font-bold text-gray-500 uppercase">Yükseklik (mm)</label>
              <input v-model.number="canvasHeightMM" type="number" class="h-8 w-full px-2 bg-gray-50 border border-gray-200 rounded text-xs font-bold text-gray-800" min="15" max="200" />
            </div>
          </div>
          <!-- Presets -->
          <div class="flex items-center gap-1">
            <button @click="setPreset(70, 35)" class="flex-1 py-1 bg-gray-100 hover:bg-gray-200 rounded text-[10.5px] font-bold text-gray-700">70x35 mm</button>
            <button @click="setPreset(50, 25)" class="flex-1 py-1 bg-gray-100 hover:bg-gray-200 rounded text-[10.5px] font-bold text-gray-700">50x25 mm</button>
            <button @click="setPreset(100, 50)" class="flex-1 py-1 bg-gray-100 hover:bg-gray-200 rounded text-[10.5px] font-bold text-gray-700">100x50 mm</button>
          </div>
        </div>

        <!-- Addable Element Palette -->
        <div>
          <h3 class="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <i class="fas fa-puzzle-piece text-emerald-600"></i> Bileşen Ekle
          </h3>
          <p class="text-[11px] text-gray-400 mb-3">Kanvasa eklemek için tıklayın:</p>

          <div class="space-y-1.5">
            <button @click="addElement('qr')" class="palette-btn">
              <i class="fas fa-qrcode text-blue-600 w-5"></i>
              <span>🔳 QR Kod (Mobil Audit Linki)</span>
            </button>
            <button @click="addElement('barcode1d')" class="palette-btn">
              <i class="fas fa-barcode text-purple-600 w-5"></i>
              <span>📊 1D Lazer Barkod</span>
            </button>
            <button @click="addElement('company')" class="palette-btn">
              <i class="fas fa-building text-amber-600 w-5"></i>
              <span>🏢 Şirket Adı</span>
            </button>
            <button @click="addElement('model')" class="palette-btn">
              <i class="fas fa-laptop text-emerald-600 w-5"></i>
              <span>💻 Cihaz & Model</span>
            </button>
            <button @click="addElement('serial')" class="palette-btn">
              <i class="fas fa-hashtag text-indigo-600 w-5"></i>
              <span>🔢 Seri Numarası</span>
            </button>
            <button @click="addElement('barcode_text')" class="palette-btn">
              <i class="fas fa-tag text-rose-600 w-5"></i>
              <span>🏷️ Envanter No</span>
            </button>
            <button @click="addElement('category')" class="palette-btn">
              <i class="fas fa-folder text-cyan-600 w-5"></i>
              <span>📂 Kategori</span>
            </button>
            <button @click="addElement('custom_text')" class="palette-btn">
              <i class="fas fa-font text-gray-600 w-5"></i>
              <span>✍️ Özel Metin</span>
            </button>
          </div>
        </div>
      </aside>

      <!-- CENTER: INTERACTIVE CANVAS WORKSPACE -->
      <main class="flex-1 flex flex-col items-center justify-center p-8 bg-gray-100 overflow-auto relative">
        <div class="text-xs font-bold text-gray-400 mb-3 flex items-center gap-2">
          <span>Termal Etiket Kanvası</span>
          <span class="px-2 py-0.5 bg-gray-200 text-gray-700 rounded-full">{{ canvasWidthMM }} x {{ canvasHeightMM }} mm</span>
        </div>

        <!-- CANVAS BOX (Scaled 1mm = 4.5px for crisp DPI design) -->
        <div 
          ref="canvasBox"
          class="bg-white border-2 border-gray-900 rounded-lg shadow-xl relative select-none overflow-hidden transition-all"
          :style="{ width: `${canvasWidthMM * 4.5}px`, height: `${canvasHeightMM * 4.5}px` }"
          @click="selectedElementId = null"
        >
          <!-- Draggable Canvas Items -->
          <div 
            v-for="el in elements" 
            :key="el.id"
            @click.stop="selectedElementId = el.id"
            @mousedown.stop="startDrag($event, el)"
            :class="[
              'absolute cursor-move transition-shadow rounded p-0.5',
              selectedElementId === el.id ? 'ring-2 ring-blue-500 bg-blue-50/30' : 'hover:ring-1 hover:ring-gray-400'
            ]"
            :style="{
              left: `${el.x}%`,
              top: `${el.y}%`,
              fontSize: el.fontSize ? `${el.fontSize}px` : '12px',
              fontWeight: el.fontWeight || 'normal',
              color: el.color || '#000000',
              backgroundColor: el.bg || 'transparent'
            }"
          >
            <!-- QR CODE ELEMENT -->
            <div v-if="el.type === 'qr'" class="flex flex-col items-center">
              <div class="border border-black p-1 bg-white rounded flex items-center justify-center" :style="{ width: `${el.size || 70}px`, height: `${el.size || 70}px` }">
                <i class="fas fa-qrcode text-black" :style="{ fontSize: `${(el.size || 70) * 0.7}px` }"></i>
              </div>
            </div>

            <!-- 1D BARCODE ELEMENT -->
            <div v-else-if="el.type === 'barcode1d'" class="flex flex-col items-center">
              <div class="border-t border-b border-black py-0.5 px-2 flex items-center justify-center bg-white" :style="{ height: `${el.height || 22}px` }">
                <span class="font-mono tracking-[4px] text-[10px] font-bold">||||||||||||||||||||||</span>
              </div>
            </div>

            <!-- TEXT BASED ELEMENTS -->
            <div v-else-if="el.type === 'company'" class="font-black uppercase tracking-wider">
              {{ sampleAsset.company_name }}
            </div>
            <div v-else-if="el.type === 'model'" class="font-black">
              {{ sampleAsset.brand_name }} {{ sampleAsset.model_name }}
            </div>
            <div v-else-if="el.type === 'serial'" class="font-mono">
              S/N: {{ sampleAsset.serial_no }}
            </div>
            <div v-else-if="el.type === 'barcode_text'" class="font-mono font-bold">
              ENV NO: {{ sampleAsset.barcode }}
            </div>
            <div v-else-if="el.type === 'category'" class="uppercase text-[10px] font-bold">
              {{ sampleAsset.category_name }}
            </div>
            <div v-else-if="el.type === 'custom_text'">
              {{ el.text || 'Özel Yazı' }}
            </div>
          </div>
        </div>
      </main>

      <!-- RIGHT SIDEBAR: SELECTED ELEMENT PROPERTIES -->
      <aside class="w-72 bg-white border-l border-gray-200 p-4 shrink-0 flex flex-col overflow-y-auto">
        <div v-if="activeElement">
          <div class="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
            <h3 class="text-xs font-bold text-gray-900 uppercase">Öğe Özellikleri</h3>
            <button @click="removeElement(activeElement.id)" class="text-red-500 hover:text-red-700 text-xs font-bold flex items-center gap-1">
              <i class="fas fa-trash"></i> Sil
            </button>
          </div>

          <div class="space-y-4 text-xs font-medium">
            <!-- Custom text input -->
            <div v-if="activeElement.type === 'custom_text'">
              <label class="form-label">Metin İçeriği</label>
              <input v-model="activeElement.text" type="text" class="form-input" />
            </div>

            <!-- Size for QR Code -->
            <div v-if="activeElement.type === 'qr'">
              <label class="form-label">QR Kod Boyutu (px)</label>
              <input v-model.number="activeElement.size" type="range" min="40" max="120" class="w-full" />
              <div class="text-right text-[10px] text-gray-400 font-bold">{{ activeElement.size || 70 }}px</div>
            </div>

            <!-- Height for Barcode 1D -->
            <div v-if="activeElement.type === 'barcode1d'">
              <label class="form-label">Barkod Yüksekliği (px)</label>
              <input v-model.number="activeElement.height" type="range" min="15" max="50" class="w-full" />
              <div class="text-right text-[10px] text-gray-400 font-bold">{{ activeElement.height || 22 }}px</div>
            </div>

            <!-- Font Size for Text -->
            <div v-if="['company', 'model', 'serial', 'barcode_text', 'category', 'custom_text'].includes(activeElement.type)">
              <label class="form-label">Yazı Puntosu (Font Size)</label>
              <input v-model.number="activeElement.fontSize" type="range" min="8" max="28" class="w-full" />
              <div class="text-right text-[10px] text-gray-400 font-bold">{{ activeElement.fontSize || 12 }}px</div>
            </div>

            <!-- Font Weight -->
            <div v-if="['company', 'model', 'serial', 'barcode_text', 'category', 'custom_text'].includes(activeElement.type)">
              <label class="form-label">Yazı Kalınlığı</label>
              <select v-model="activeElement.fontWeight" class="form-select">
                <option value="normal">Normal</option>
                <option value="bold">Kalın (Bold)</option>
                <option value="extrabold">Çok Kalın (Extra Bold)</option>
              </select>
            </div>

            <!-- Color -->
            <div>
              <label class="form-label">Yazı / Nesne Rengi</label>
              <input v-model="activeElement.color" type="color" class="h-8 w-full cursor-pointer rounded border" />
            </div>

            <!-- Position sliders -->
            <div>
              <label class="form-label">Yatay Konum (X %)</label>
              <input v-model.number="activeElement.x" type="range" min="0" max="90" class="w-full" />
            </div>

            <div>
              <label class="form-label">Dikey Konum (Y %)</label>
              <input v-model.number="activeElement.y" type="range" min="0" max="90" class="w-full" />
            </div>
          </div>
        </div>

        <div v-else class="flex flex-col items-center justify-center h-full text-gray-400 text-center gap-2">
          <i class="fas fa-mouse-pointer text-2xl"></i>
          <p class="text-xs">Düzenlemek için kanvas üzerindeki bir öğeye tıklayın.</p>
        </div>
      </aside>
    </div>

    <!-- SAVE TEMPLATE IN-APP MODAL DIALOG -->
    <div v-if="showSaveModal" class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
        <div class="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
          <h3 class="font-bold text-gray-900 text-sm flex items-center gap-2">
            <i class="fas fa-save text-blue-600"></i> Termal Etiket Şablonunu Kaydet
          </h3>
          <button @click="showSaveModal = false" class="text-gray-400 hover:text-gray-600 font-bold text-lg">
            &times;
          </button>
        </div>

        <form @submit.prevent="confirmSaveTemplate" class="space-y-4">
          <div>
            <label class="form-label">Şablon Adı *</label>
            <input 
              v-model="templateForm.name" 
              type="text" 
              placeholder="Örn: Özel 70x35mm Kurumsal Rulo" 
              class="form-input" 
              required 
            />
          </div>

          <div class="flex items-center gap-2 pt-2">
            <input 
              v-model="templateForm.is_default" 
              type="checkbox" 
              id="is_default_check"
              class="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" 
            />
            <label for="is_default_check" class="text-xs font-bold text-gray-700 cursor-pointer">
              Varsayılan Baskı Şablonu Yap (Varsayılan etiket baskısı olarak seçilir)
            </label>
          </div>

          <div class="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <button type="button" @click="showSaveModal = false" class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-lg transition-colors">
              İptal
            </button>
            <button type="submit" :disabled="saving" class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors shadow-md flex items-center gap-1.5">
              <i class="fas fa-check"></i> {{ saving ? 'Kaydediliyor...' : 'Kaydet' }}
            </button>
          </div>
        </form>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import axios from 'axios'
import { useToast } from '../../composables/useToast'

const router = useRouter()
const { showToast } = useToast()

const canvasBox = ref(null)
const canvasWidthMM = ref(70)
const canvasHeightMM = ref(35)
const selectedElementId = ref(null)
const savedTemplates = ref([])
const selectedTemplateId = ref('')

const showSaveModal = ref(false)
const saving = ref(false)
const templateForm = ref({
  name: 'Standart 70x35mm Kurumsal Rulo',
  is_default: true
})

const sampleAsset = {
  company_name: 'TALAY LOJİSTİK A.Ş.',
  brand_name: 'Dell',
  model_name: 'OptiPlex Micro 7020',
  category_name: 'MASAÜSTÜ BİLGİSAYAR',
  serial_no: '9GGFX34',
  barcode: 'TAL-01046'
}

const elements = ref([
  { id: 'company', type: 'company', label: 'Şirket Adı', x: 5, y: 4, fontSize: 10, fontWeight: 'extrabold', color: '#000000' },
  { id: 'qr', type: 'qr', label: 'QR Kod', x: 5, y: 28, size: 75 },
  { id: 'model', type: 'model', label: 'Marka & Model', x: 34, y: 28, fontSize: 12, fontWeight: 'extrabold', color: '#000000' },
  { id: 'serial', type: 'serial', label: 'Seri No', x: 34, y: 52, fontSize: 11, fontWeight: 'bold', color: '#1e40af' },
  { id: 'barcode', type: 'barcode_text', label: 'Envanter No', x: 34, y: 72, fontSize: 10.5, fontWeight: 'bold', color: '#000000' },
  { id: 'barcode1d', type: 'barcode1d', label: '1D Lazer Barkod', x: 5, y: 88, height: 22 }
])

const activeElement = computed(() => {
  return elements.value.find(el => el.id === selectedElementId.value)
})

const setPreset = (w, h) => {
  canvasWidthMM.value = w
  canvasHeightMM.value = h
}

const addElement = (type) => {
  const newId = `${type}_${Date.now()}`
  const defaults = {
    qr: { size: 70 },
    barcode1d: { height: 22 },
    custom_text: { text: 'Özel Metin', fontSize: 11 }
  }
  elements.value.push({
    id: newId,
    type,
    x: 10,
    y: 10,
    fontSize: 11,
    fontWeight: 'bold',
    color: '#000000',
    ...(defaults[type] || {})
  })
  selectedElementId.value = newId
}

const removeElement = (id) => {
  elements.value = elements.value.filter(el => el.id !== id)
  selectedElementId.value = null
}

// Dragging logic
let isDragging = false
let startX = 0, startY = 0
let initialElX = 0, initialElY = 0

const startDrag = (event, el) => {
  isDragging = true
  selectedElementId.value = el.id
  startX = event.clientX
  startY = event.clientY
  initialElX = el.x
  initialElY = el.y

  const onMouseMove = (e) => {
    if (!isDragging || !canvasBox.value) return
    const rect = canvasBox.value.getBoundingClientRect()
    const deltaXPercent = ((e.clientX - startX) / rect.width) * 100
    const deltaYPercent = ((e.clientY - startY) / rect.height) * 100

    el.x = Math.max(0, Math.min(90, Math.round(initialElX + deltaXPercent)))
    el.y = Math.max(0, Math.min(90, Math.round(initialElY + deltaYPercent)))
  }

  const onMouseUp = () => {
    isDragging = false
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
  }

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
}

const fetchTemplates = async () => {
  try {
    const res = await axios.get('/api/assets/label-templates')
    savedTemplates.value = res.data
  } catch (e) {
    console.error('Templates fetch error:', e)
  }
}

const loadSelectedTemplate = () => {
  const t = savedTemplates.value.find(tmpl => tmpl.id === Number(selectedTemplateId.value))
  if (t) {
    canvasWidthMM.value = t.width_mm
    canvasHeightMM.value = t.height_mm
    try {
      const parsed = typeof t.config_json === 'string' ? JSON.parse(t.config_json) : t.config_json
      if (parsed.elements) elements.value = parsed.elements
    } catch (e) { console.error('Parse error:', e) }
  }
}

const openSaveModal = () => {
  templateForm.value.name = `Standart ${canvasWidthMM.value}x${canvasHeightMM.value}mm Rulo`
  showSaveModal.value = true
}

const confirmSaveTemplate = async () => {
  if (!templateForm.value.name) return
  saving.value = true
  try {
    const payload = {
      id: selectedTemplateId.value || undefined,
      name: templateForm.value.name,
      width_mm: canvasWidthMM.value,
      height_mm: canvasHeightMM.value,
      config_json: {
        width_mm: canvasWidthMM.value,
        height_mm: canvasHeightMM.value,
        elements: elements.value
      },
      is_default: templateForm.value.is_default ? 1 : 0
    }

    const res = await axios.post('/api/assets/label-templates', payload)
    showToast('Termal etiket şablonu başarıyla kaydedildi!', 'success')
    showSaveModal.value = false
    await fetchTemplates()
    if (res.data?.id) {
      selectedTemplateId.value = res.data.id
    }
  } catch (e) {
    showToast('Şablon kaydedilirken hata oluştu.', 'error')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  fetchTemplates()
})
</script>

<style scoped>
.palette-btn {
  @apply w-full py-2 px-3 bg-gray-50 hover:bg-blue-50 hover:text-blue-700 text-gray-700 font-bold text-xs rounded-lg flex items-center gap-2 border border-gray-200 hover:border-blue-300 transition-all text-left;
}
.form-label {
  @apply block text-[10.5px] font-bold text-gray-500 uppercase tracking-wider mb-1;
}
.form-input {
  @apply h-8 w-full px-2.5 bg-gray-50 border border-gray-200 rounded text-xs font-medium text-gray-800 outline-none focus:border-blue-500;
}
.form-select {
  @apply h-8 w-full px-2 bg-gray-50 border border-gray-200 rounded text-xs font-medium text-gray-800 outline-none focus:border-blue-500 cursor-pointer;
}
</style>
