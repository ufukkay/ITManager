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
            <i class="fas fa-file-signature text-purple-600"></i> Görsel A4 Zimmet Formu Studio
          </h1>
          <p class="text-[11px] text-gray-400">A4 Zimmet Teslim Tutanağının başlık, tablo, taahhüt ve imza alanlarını görsel tasarlayın</p>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center gap-2">
        <select v-model="selectedTemplateId" @change="loadSelectedTemplate" class="h-8 px-3 bg-gray-50 border border-gray-200 rounded text-xs font-bold text-gray-700 outline-none focus:border-purple-500 cursor-pointer">
          <option value="">-- Kayıtlı A4 Şablon Seçin --</option>
          <option v-for="t in savedTemplates" :key="t.id" :value="t.id">
            {{ t.name }} {{ t.is_default ? '★ Varsayılan' : '' }}
          </option>
        </select>

        <button @click="openSaveModal" class="h-8 px-4 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors shadow-sm">
          <i class="fas fa-save"></i> Form Şablonunu Kaydet
        </button>
      </div>
    </header>

    <!-- MAIN STUDIO WORKSPACE -->
    <div class="flex-1 flex overflow-hidden">
      <!-- LEFT PALETTE: COMPONENT LIBRARY -->
      <aside class="w-72 bg-white border-r border-gray-200 flex flex-col p-4 shrink-0 overflow-y-auto">
        <h3 class="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <i class="fas fa-cubes text-purple-600"></i> Form Bileşen Kütüphanesi
        </h3>
        <p class="text-[11px] text-gray-400 mb-4">Kanvas üzerine eklemek istediğiniz zimmet belgesi bloğuna tıklayın:</p>

        <div class="space-y-2">
          <button @click="addElement('header_title')" class="btn-palette">
            <i class="fas fa-heading text-blue-600"></i>
            <div class="text-left">
              <div class="font-bold text-xs">Tutanak Başlığı</div>
              <div class="text-[10px] text-gray-400">Resmi Zimmet Tutanağı Başlık Metni</div>
            </div>
          </button>

          <button @click="addElement('personnel_info')" class="btn-palette">
            <i class="fas fa-id-card text-emerald-600"></i>
            <div class="text-left">
              <div class="font-bold text-xs">Personel Bilgileri Tablosu</div>
              <div class="text-[10px] text-gray-400">Ad Soyad, Unvan, Departman</div>
            </div>
          </button>

          <button @click="addElement('assets_table')" class="btn-palette">
            <i class="fas fa-table text-indigo-600"></i>
            <div class="text-left">
              <div class="font-bold text-xs">Donanım Listesi Tablosu</div>
              <div class="text-[10px] text-gray-400">Cihazlar, Seri No & Envanter No</div>
            </div>
          </button>

          <button @click="addElement('commitment_text')" class="btn-palette">
            <i class="fas fa-gavel text-amber-600"></i>
            <div class="text-left">
              <div class="font-bold text-xs">Hukuki Taahhüt Metni</div>
              <div class="text-[10px] text-gray-400">Yasal Şartlar & Kullanım Şartı</div>
            </div>
          </button>

          <button @click="addElement('signatures')" class="btn-palette">
            <i class="fas fa-signature text-purple-600"></i>
            <div class="text-left">
              <div class="font-bold text-xs">İmza & Tarih Bloğu</div>
              <div class="text-[10px] text-gray-400">Teslim Eden IT & Teslim Alan Personel</div>
            </div>
          </button>

          <button @click="addElement('qr_verify')" class="btn-palette">
            <i class="fas fa-qrcode text-rose-600"></i>
            <div class="text-left">
              <div class="font-bold text-xs">QR Doküman Doğrulama</div>
              <div class="text-[10px] text-gray-400">Mobil Saha Sayım Linki Gömülü QR</div>
            </div>
          </button>

          <button @click="addElement('company_logo')" class="btn-palette">
            <i class="fas fa-building text-cyan-600"></i>
            <div class="text-left">
              <div class="font-bold text-xs">Şirket Logosu & Kurum Adı</div>
              <div class="text-[10px] text-gray-400">Talay Lojistik / Kurum Üst Bilgisi</div>
            </div>
          </button>

          <button @click="addElement('custom_text')" class="btn-palette">
            <i class="fas fa-font text-gray-600"></i>
            <div class="text-left">
              <div class="font-bold text-xs">Özel Metin / Not</div>
              <div class="text-[10px] text-gray-400">Serbest Yazı veya Açıklama</div>
            </div>
          </button>

          <button @click="addElement('divider')" class="btn-palette">
            <i class="fas fa-minus text-gray-400"></i>
            <div class="text-left">
              <div class="font-bold text-xs">Yatay Ayraç Çizgisi</div>
              <div class="text-[10px] text-gray-400">Bölüm Ayırıcı İnce Çizgi</div>
            </div>
          </button>
        </div>
      </aside>

      <!-- CENTER WORKSPACE: INTERACTIVE A4 CANVAS -->
      <main class="flex-1 bg-gray-200/70 overflow-auto p-8 flex justify-center items-start">
        <!-- Scaled A4 Paper Container (210mm x 297mm -> 700px x 990px) -->
        <div 
          class="a4-paper bg-white shadow-2xl relative border border-gray-300 rounded-sm select-none transition-all"
          style="width: 700px; height: 990px;"
          @click.self="selectedElementId = null"
        >
          <!-- Grid Background Pattern -->
          <div class="absolute inset-0 pointer-events-none opacity-5 bg-grid"></div>

          <!-- DYNAMIC DRAGGABLE ELEMENTS -->
          <div 
            v-for="el in elements" 
            :key="el.id"
            :class="['absolute group cursor-move transition-shadow', selectedElementId === el.id ? 'ring-2 ring-purple-600 shadow-lg z-30' : 'hover:ring-1 hover:ring-purple-300 z-10']"
            :style="{
              left: `${el.x}%`,
              top: `${el.y}%`,
              width: el.w ? `${el.w}%` : 'auto',
              fontSize: el.fontSize ? `${el.fontSize}px` : '12px',
              fontWeight: el.fontWeight || 'normal',
              color: el.color || '#111827',
              backgroundColor: el.bg || 'transparent'
            }"
            @mousedown="startDrag($event, el)"
            @click.stop="selectedElementId = el.id"
          >
            <!-- Element Action Quick Tools -->
            <div 
              v-if="selectedElementId === el.id"
              class="absolute -top-7 right-0 bg-purple-900 text-white text-[10px] font-bold py-0.5 px-2 rounded flex items-center gap-1 shadow-md z-40"
            >
              <span>{{ el.name }}</span>
              <button @click.stop="deleteElement(el.id)" class="hover:text-red-300 ml-1">
                <i class="fas fa-trash"></i>
              </button>
            </div>

            <!-- 1. HEADER TITLE -->
            <div v-if="el.type === 'header_title'" class="text-center py-2 border-b-2 border-gray-900">
              <h1 class="text-base font-black tracking-wider uppercase">ZİMMET TESLİM VE TESELLÜM TUTANAĞI</h1>
              <p class="text-[10px] font-semibold text-gray-500 mt-0.5">TALAY LOJİSTİK A.Ş. — BİLİŞİM TEKNOLOJİLERİ ENVALERİ</p>
            </div>

            <!-- 2. PERSONNEL INFO TABLE -->
            <div v-else-if="el.type === 'personnel_info'" class="border border-gray-300 rounded-lg p-3 bg-gray-50/80">
              <div class="grid grid-cols-2 gap-2 text-[11px]">
                <div><span class="text-gray-400 font-semibold block text-[10px]">PERSONEL ADI SOYADI:</span><span class="font-black text-gray-900">Ahmet YILMAZ</span></div>
                <div><span class="text-gray-400 font-semibold block text-[10px]">UNVAN:</span><span class="font-bold text-gray-800">Sistem Uzmanı</span></div>
                <div><span class="text-gray-400 font-semibold block text-[10px]">ŞİRKET / DEPARTMAN:</span><span class="font-bold text-gray-800">Talay Lojistik / Bilgi Teknolojileri</span></div>
                <div><span class="text-gray-400 font-semibold block text-[10px]">DÜZENLEME TARİHİ:</span><span class="font-black text-gray-900">21.07.2026</span></div>
              </div>
            </div>

            <!-- 3. ASSETS TABLE -->
            <div v-else-if="el.type === 'assets_table'" class="w-full">
              <div class="text-[10.5px] font-black uppercase text-gray-700 mb-1 tracking-wider">Teslim Edilen Donanım ve Cihaz Listesi:</div>
              <table class="w-full border-collapse border border-gray-400 text-[11px]">
                <thead>
                  <tr class="bg-gray-100 border-b border-gray-400 text-[10px] uppercase font-bold text-gray-700">
                    <th class="border border-gray-400 px-2 py-1.5 text-center">S.No</th>
                    <th class="border border-gray-400 px-2 py-1.5">Kategori</th>
                    <th class="border border-gray-400 px-2 py-1.5">Marka & Model</th>
                    <th class="border border-gray-400 px-2 py-1.5 font-mono">Seri Numarası</th>
                    <th class="border border-gray-400 px-2 py-1.5 font-mono">Envanter No</th>
                  </tr>
                </thead>
                <tbody>
                  <tr class="border-b border-gray-300">
                    <td class="border border-gray-300 px-2 py-1 text-center font-bold">1</td>
                    <td class="border border-gray-300 px-2 py-1">Dizüstü Bilgisayar</td>
                    <td class="border border-gray-300 px-2 py-1 font-bold">Apple MacBook Pro 16" M4</td>
                    <td class="border border-gray-300 px-2 py-1 font-mono font-bold">C02G5742M4MX</td>
                    <td class="border border-gray-300 px-2 py-1 font-mono">TAL-DEMO-7361</td>
                  </tr>
                  <tr class="border-b border-gray-300">
                    <td class="border border-gray-300 px-2 py-1 text-center font-bold">2</td>
                    <td class="border border-gray-300 px-2 py-1">Monitör</td>
                    <td class="border border-gray-300 px-2 py-1 font-bold">Dell P2725H 27" IPS</td>
                    <td class="border border-gray-300 px-2 py-1 font-mono font-bold">CN099GGFX34</td>
                    <td class="border border-gray-300 px-2 py-1 font-mono">TAL-MON-0492</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- 4. COMMITMENT TEXT -->
            <div v-else-if="el.type === 'commitment_text'" class="border border-gray-300 rounded-lg p-3 bg-gray-50/60 text-[10.5px] leading-relaxed text-gray-700">
              <div class="font-bold uppercase text-gray-900 mb-0.5">Taahhütname & Yasal Şartlar:</div>
              <p>{{ el.text || defaultCommitmentText }}</p>
            </div>

            <!-- 5. SIGNATURES -->
            <div v-else-if="el.type === 'signatures'" class="grid grid-cols-2 gap-8 text-center pt-2">
              <div class="border-t-2 border-gray-800 pt-2">
                <div class="font-bold uppercase text-[11px] text-gray-900">TESLİM EDEN (IT DEPARTMANI)</div>
                <div class="text-[10px] text-gray-400 mt-0.5">İmza & Tarih</div>
                <div class="h-12"></div>
              </div>
              <div class="border-t-2 border-gray-800 pt-2">
                <div class="font-bold uppercase text-[11px] text-gray-900">TESLİM ALAN (PERSONEL)</div>
                <div class="font-bold text-[11px] text-gray-800 mt-0.5">Ahmet YILMAZ</div>
                <div class="text-[10px] text-gray-400">İmza & Tarih</div>
                <div class="h-12"></div>
              </div>
            </div>

            <!-- 6. QR CODE DOKÜMAN DOĞRULAMA -->
            <div v-else-if="el.type === 'qr_verify'" class="flex items-center gap-3 border border-gray-200 p-2 rounded-lg bg-white">
              <div class="w-12 h-12 bg-gray-900 text-white rounded flex items-center justify-center font-bold text-xs">
                <i class="fas fa-qrcode text-lg"></i>
              </div>
              <div>
                <div class="font-bold text-[11px] text-gray-900">Mobil Saha Doğrulama</div>
                <div class="text-[9.5px] text-gray-400">QR kod kamerasından zimmeti onaylamak için taratın</div>
              </div>
            </div>

            <!-- 7. COMPANY LOGO -->
            <div v-else-if="el.type === 'company_logo'" class="flex items-center gap-2">
              <div class="w-7 h-7 rounded bg-blue-600 text-white flex items-center justify-center font-black text-sm">T</div>
              <div>
                <div class="font-black tracking-wider uppercase text-gray-900 text-xs">TALAY LOJİSTİK A.Ş.</div>
                <div class="text-[9px] font-bold text-gray-400">IT BİLİŞİM YÖNETİMİ</div>
              </div>
            </div>

            <!-- 8. CUSTOM TEXT -->
            <div v-else-if="el.type === 'custom_text'" class="font-medium">
              {{ el.text || 'Özel Açıklama / Not Yazısı' }}
            </div>

            <!-- 9. DIVIDER LINE -->
            <div v-else-if="el.type === 'divider'" class="w-full border-b border-gray-300 my-1"></div>
          </div>
        </div>
      </main>

      <!-- RIGHT INSPECTOR: PROPERTY CONTROLS -->
      <aside class="w-80 bg-white border-l border-gray-200 flex flex-col p-4 shrink-0 overflow-y-auto">
        <h3 class="text-xs font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-1.5">
          <i class="fas fa-sliders-h text-purple-600"></i> Bileşen Özellikleri
        </h3>

        <div v-if="selectedElement" class="space-y-4">
          <div class="bg-purple-50 p-3 rounded-lg border border-purple-100 flex items-center justify-between">
            <div>
              <div class="font-bold text-xs text-purple-900">{{ selectedElement.name }}</div>
              <div class="text-[10px] text-purple-600">Bileşen ID: {{ selectedElement.id }}</div>
            </div>
            <button @click="deleteElement(selectedElement.id)" class="text-red-500 hover:text-red-700 text-xs font-bold">
              <i class="fas fa-trash mr-1"></i>Sil
            </button>
          </div>

          <!-- Position Controls -->
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="text-[10px] font-bold text-gray-500 uppercase">Sol Konum (%)</label>
              <input v-model.number="selectedElement.x" type="number" min="0" max="95" class="h-8 w-full px-2 bg-gray-50 border rounded text-xs font-bold" />
            </div>
            <div>
              <label class="text-[10px] font-bold text-gray-500 uppercase">Üst Konum (%)</label>
              <input v-model.number="selectedElement.y" type="number" min="0" max="95" class="h-8 w-full px-2 bg-gray-50 border rounded text-xs font-bold" />
            </div>
          </div>

          <!-- Width % Control -->
          <div>
            <label class="text-[10px] font-bold text-gray-500 uppercase">Genişlik (%)</label>
            <input v-model.number="selectedElement.w" type="number" min="10" max="100" class="h-8 w-full px-2 bg-gray-50 border rounded text-xs font-bold" />
          </div>

          <!-- Typography Controls -->
          <div v-if="selectedElement.type === 'commitment_text' || selectedElement.type === 'custom_text'">
            <label class="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Metin İçeriği</label>
            <textarea v-model="selectedElement.text" rows="5" class="w-full p-2 bg-gray-50 border rounded text-xs font-medium text-gray-800"></textarea>
          </div>

          <!-- Font Size & Weight -->
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="text-[10px] font-bold text-gray-500 uppercase">Yazı Boyutu (px)</label>
              <input v-model.number="selectedElement.fontSize" type="number" min="8" max="32" class="h-8 w-full px-2 bg-gray-50 border rounded text-xs font-bold" />
            </div>
            <div>
              <label class="text-[10px] font-bold text-gray-500 uppercase">Kalınlık</label>
              <select v-model="selectedElement.fontWeight" class="h-8 w-full px-2 bg-gray-50 border rounded text-xs font-bold">
                <option value="normal">Normal</option>
                <option value="bold">Kalın (Bold)</option>
                <option value="black">Ekstra Kalın (Black)</option>
              </select>
            </div>
          </div>

          <!-- Colors -->
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="text-[10px] font-bold text-gray-500 uppercase">Yazı Rengi</label>
              <input v-model="selectedElement.color" type="color" class="h-8 w-full p-0.5 bg-gray-50 border rounded cursor-pointer" />
            </div>
            <div>
              <label class="text-[10px] font-bold text-gray-500 uppercase">Arka Plan</label>
              <input v-model="selectedElement.bg" type="color" class="h-8 w-full p-0.5 bg-gray-50 border rounded cursor-pointer" />
            </div>
          </div>
        </div>

        <div v-else class="flex flex-col items-center justify-center h-64 text-gray-300 gap-2">
          <i class="fas fa-mouse-pointer text-3xl"></i>
          <p class="text-xs font-medium">Düzenlemek istediğiniz bileşene tıklayın.</p>
        </div>
      </aside>
    </div>

    <!-- SAVE TEMPLATE MODAL -->
    <dialog ref="saveModal" class="modal">
      <div class="modal-box bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <h3 class="font-bold text-base text-gray-900 mb-4 flex items-center gap-2">
          <i class="fas fa-file-export text-purple-600"></i> A4 Zimmet Form Şablonunu Kaydet
        </h3>
        
        <div class="space-y-4">
          <div>
            <label class="text-xs font-bold text-gray-700 block mb-1">Şablon İsmi *</label>
            <input 
              v-model="templateForm.name" 
              type="text" 
              placeholder="Örn: Resmi Kurumsal A4 Zimmet Formu" 
              class="h-9 w-full px-3 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-800 outline-none focus:border-purple-500"
            />
          </div>

          <label class="flex items-center gap-2 cursor-pointer bg-purple-50 p-3 rounded-lg border border-purple-100">
            <input type="checkbox" v-model="templateForm.is_default" class="rounded border-purple-300 text-purple-600 focus:ring-purple-500" />
            <div>
              <div class="font-bold text-xs text-purple-900">Varsayılan Form Şablonu Yap</div>
              <div class="text-[10.5px] text-purple-600">Zimmet formu basılırken bu A4 düzeni kullanılır.</div>
            </div>
          </label>
        </div>

        <div class="modal-action mt-6 flex items-center justify-end gap-2">
          <button @click="closeSaveModal" class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-lg">İptal</button>
          <button @click="submitSaveTemplate" class="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg shadow-sm">Kaydet</button>
        </div>
      </div>
    </dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import axios from 'axios'
import { useToast } from '../../composables/useToast'

const { showToast } = useToast()

const selectedTemplateId = ref('')
const savedTemplates = ref([])
const selectedElementId = ref(null)
const saveModal = ref(null)

const templateForm = ref({
  id: null,
  name: '',
  is_default: true
})

const defaultCommitmentText = `Yukarıda detayları ve seri numaraları belirtilen şirket malı cihaz ve teçhizatı eksiksiz, sağlam ve çalışır vaziyette teslim aldım. Bu cihazları şirket iş süreçleri haricinde kullanmayacağımı, özenle koruyacağımı, işten ayrılma veya zimmet iptali durumunda IT departmanına eksiksiz iade edeceğimi beyan ve taahhüt ederim.`

// Default Form Elements Arrangement
const elements = ref([
  { id: 'el_logo', type: 'company_logo', name: 'Şirket Logosu', x: 5, y: 3, w: 90, fontSize: 12 },
  { id: 'el_title', type: 'header_title', name: 'Tutanak Başlığı', x: 5, y: 8, w: 90, fontSize: 16, fontWeight: 'black' },
  { id: 'el_pinfo', type: 'personnel_info', name: 'Personel Bilgileri', x: 5, y: 17, w: 90, fontSize: 11 },
  { id: 'el_assets', type: 'assets_table', name: 'Donanım Listesi Tablosu', x: 5, y: 30, w: 90, fontSize: 11 },
  { id: 'el_commit', type: 'commitment_text', name: 'Yasal Taahhüt Metni', x: 5, y: 58, w: 90, text: defaultCommitmentText, fontSize: 10.5 },
  { id: 'el_qr', type: 'qr_verify', name: 'QR Doküman Doğrulama', x: 5, y: 72, w: 90, fontSize: 11 },
  { id: 'el_sigs', type: 'signatures', name: 'İmza & Tarih Bloğu', x: 5, y: 82, w: 90, fontSize: 11 }
])

const selectedElement = computed(() => {
  return elements.value.find(e => e.id === selectedElementId.value)
})

// Element Palette Add
const addElement = (type) => {
  const id = `el_${type}_${Date.now()}`
  let name = 'Yeni Bileşen'
  let defaultY = 40
  let defaultW = 90

  if (type === 'header_title') name = 'Tutanak Başlığı'
  else if (type === 'personnel_info') name = 'Personel Bilgileri'
  else if (type === 'assets_table') name = 'Donanım Tablosu'
  else if (type === 'commitment_text') name = 'Taahhüt Metni'
  else if (type === 'signatures') name = 'İmza Bloğu'
  else if (type === 'qr_verify') name = 'QR Doğrulama'
  else if (type === 'company_logo') name = 'Şirket Logosu'
  else if (type === 'custom_text') name = 'Özel Metin'
  else if (type === 'divider') name = 'Ayraç Çizgisi'

  const newEl = {
    id,
    type,
    name,
    x: 5,
    y: defaultY,
    w: defaultW,
    fontSize: 12,
    fontWeight: 'normal',
    color: '#111827',
    text: type === 'custom_text' ? 'Özel Metin Yazısı' : (type === 'commitment_text' ? defaultCommitmentText : '')
  }

  elements.value.push(newEl)
  selectedElementId.value = id
  showToast(`${name} kanvasa eklendi`, 'info')
}

const deleteElement = (id) => {
  elements.value = elements.value.filter(e => e.id !== id)
  if (selectedElementId.value === id) selectedElementId.value = null
  showToast('Bileşen kanvastan kaldırıldı', 'warning')
}

// Dragging Logic
let isDragging = false
let dragStartPos = { x: 0, y: 0 }
let activeDragEl = null

const startDrag = (event, el) => {
  isDragging = true
  activeDragEl = el
  selectedElementId.value = el.id
  dragStartPos = { x: event.clientX, y: event.clientY }

  window.addEventListener('mousemove', onDrag)
  window.addEventListener('mouseup', stopDrag)
}

const onDrag = (event) => {
  if (!isDragging || !activeDragEl) return

  const paper = document.querySelector('.a4-paper')
  if (!paper) return

  const rect = paper.getBoundingClientRect()
  const dx = ((event.clientX - dragStartPos.x) / rect.width) * 100
  const dy = ((event.clientY - dragStartPos.y) / rect.height) * 100

  activeDragEl.x = Math.max(0, Math.min(95, Math.round(activeDragEl.x + dx)))
  activeDragEl.y = Math.max(0, Math.min(95, Math.round(activeDragEl.y + dy)))

  dragStartPos = { x: event.clientX, y: event.clientY }
}

const stopDrag = () => {
  isDragging = false
  activeDragEl = null
  window.removeEventListener('mousemove', onDrag)
  window.removeEventListener('mouseup', stopDrag)
}

// Template Load / Save
const fetchTemplates = async () => {
  try {
    const res = await axios.get('/api/assets/form-templates')
    savedTemplates.value = res.data
    const def = res.data.find(t => t.is_default)
    if (def) {
      selectedTemplateId.value = def.id
      elements.value = def.elements || elements.value
    }
  } catch (err) {
    console.error('fetchTemplates error:', err)
  }
}

const loadSelectedTemplate = () => {
  const t = savedTemplates.value.find(tmpl => tmpl.id === Number(selectedTemplateId.value))
  if (t && t.elements) {
    elements.value = t.elements
    templateForm.value.id = t.id
    templateForm.value.name = t.name
    templateForm.value.is_default = !!t.is_default
    showToast(`"${t.name}" şablonu yüklendi`, 'success')
  }
}

const openSaveModal = () => {
  if (!templateForm.value.name) {
    templateForm.value.name = 'Kurumsal A4 Zimmet Formu ' + new Date().toLocaleDateString('tr-TR')
  }
  saveModal.value?.showModal()
}

const closeSaveModal = () => {
  saveModal.value?.close()
}

const submitSaveTemplate = async () => {
  if (!templateForm.value.name) {
    showToast('Lütfen şablon ismi yazın', 'error')
    return
  }

  try {
    const payload = {
      id: templateForm.value.id,
      name: templateForm.value.name,
      elements: elements.value,
      is_default: templateForm.value.is_default
    }

    const res = await axios.post('/api/assets/form-templates', payload)
    showToast('A4 Zimmet Form Şablonu başarıyla kaydedildi!', 'success')
    closeSaveModal()
    await fetchTemplates()
  } catch (err) {
    console.error('submitSaveTemplate error:', err)
    showToast('Form şablonu kaydedilemedi', 'error')
  }
}

onMounted(() => {
  fetchTemplates()
})
</script>

<style scoped>
.btn-palette {
  @apply w-full p-2.5 bg-gray-50 hover:bg-purple-50 hover:border-purple-200 border border-gray-200 rounded-lg flex items-center gap-3 transition-colors cursor-pointer;
}
.bg-grid {
  background-image: radial-gradient(#000 1px, transparent 1px);
  background-size: 16px 16px;
}
</style>
