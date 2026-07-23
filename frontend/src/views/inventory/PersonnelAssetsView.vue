<template>
  <div class="h-full flex flex-col bg-white overflow-hidden">
    <!-- HEADER -->
    <header class="h-14 border-b border-gray-100 flex items-center px-6 gap-4 bg-white shrink-0">
      <div class="flex items-center gap-2 shrink-0">
        <i class="fas fa-user-tag text-gray-400"></i>
        <h1 class="text-[15px] font-bold text-gray-900">Personel Zimmet Özeti</h1>
      </div>

      <!-- Search & Filter Controls -->
      <div class="flex items-center gap-2 ml-4 flex-1">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Personel adı veya şirkete göre ara..."
          class="h-8 px-3 bg-gray-50 border border-gray-200 rounded text-[12px] font-medium text-gray-700 outline-none focus:border-blue-500 w-64"
        />
        <select v-model="selectedCompanyId" class="h-8 px-2 bg-gray-50 border border-gray-200 rounded text-[12px] font-medium text-gray-700 outline-none focus:border-blue-500 cursor-pointer">
          <option value="">Tüm Şirketler</option>
          <option v-for="c in companies" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>

        <!-- Toggle Filter (Only Assigned vs All) -->
        <div class="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg ml-2">
          <button 
            @click="onlyAssignedFilter = true"
            :class="['px-2.5 py-1 rounded text-[11px] font-bold transition-all', onlyAssignedFilter ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700']"
          >
            Sadece Zimmetliler ({{ personnelWithAssetsCount }})
          </button>
          <button 
            @click="onlyAssignedFilter = false"
            :class="['px-2.5 py-1 rounded text-[11px] font-bold transition-all', !onlyAssignedFilter ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700']"
          >
            Tüm Personel
          </button>
        </div>
      </div>

      <!-- Stats & Batch Actions -->
      <div class="ml-auto flex items-center gap-2 text-[12px]">
        <RouterLink 
          to="/master-data/form-designer" 
          class="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11.5px] rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
          title="A4 Zimmet Formunu Görsel Tasarla"
        >
          <i class="fas fa-file-signature"></i> A4 Form Studio
        </RouterLink>
        <button 
          v-if="personnelWithAssetsCount > 0"
          @click="openBatchPrintModal"
          class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11.5px] rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
          title="Aktif zimmeti olan tüm personellerin formunu sırayla görüntüle/yazdır"
        >
          <i class="fas fa-print"></i> Toplu Zimmet Formları
        </button>
        <span class="text-gray-400">
          <span class="font-bold text-gray-700">{{ filteredPersonnel.length }}</span> personel
        </span>
        <span class="text-gray-400">
          <span class="font-bold text-emerald-600">{{ totalAssignedCount }}</span> toplam zimmet
        </span>
      </div>
    </header>

    <!-- MAIN CONTENT -->
    <main class="flex-1 overflow-y-auto bg-gray-50/40 p-6">
      <div v-if="loading" class="flex items-center justify-center h-64 text-gray-300">
        <i class="fas fa-circle-notch fa-spin text-3xl"></i>
      </div>

      <div v-else-if="filteredPersonnel.length === 0" class="flex flex-col items-center justify-center h-64 text-gray-300 gap-3">
        <i class="fas fa-user-slash text-4xl"></i>
        <p class="text-sm font-medium">Zimmetli personel bulunamadı.</p>
      </div>

      <div v-else class="grid grid-cols-1 gap-4">
        <div
          v-for="person in filteredPersonnel"
          :key="person.id"
          class="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden"
        >
          <!-- Personnel Header -->
          <div
            class="flex items-center gap-4 px-5 py-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50/50 transition-colors"
            @click="toggleExpand(person.id)"
          >
            <!-- Avatar -->
            <div class="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-[12px] border border-blue-100 shrink-0">
              {{ person.first_name?.[0] }}{{ person.last_name?.[0] }}
            </div>
            <!-- Info -->
            <div class="flex-1 min-w-0">
              <div class="font-bold text-gray-900 text-[13.5px]">{{ person.first_name }} {{ person.last_name }}</div>
              <div class="text-[11px] text-gray-400 flex items-center gap-2 mt-0.5">
                <span v-if="person.title">{{ person.title }}</span>
                <span v-if="person.title && person.company_name" class="text-gray-200">·</span>
                <span v-if="person.company_name" class="text-blue-500 font-medium">{{ person.company_name }}</span>
                <span v-if="person.department_name" class="text-gray-300">·</span>
                <span v-if="person.department_name" class="text-gray-400">{{ person.department_name }}</span>
              </div>
            </div>

              <!-- Asset Count Badge & Actions -->
              <div class="flex items-center gap-3 shrink-0">
                <div
                  v-if="personnelAssets[person.id]"
                  class="flex items-center gap-2"
                >
                  <span class="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[11px] font-bold rounded-full">
                    <i class="fas fa-desktop mr-1"></i>
                    {{ personnelAssets[person.id].active?.length || 0 }} Aktif Zimmet
                  </span>
                  <span
                    v-if="personnelAssets[person.id].totalValue > 0"
                    class="px-2.5 py-1 bg-blue-50 text-blue-700 text-[11px] font-bold rounded-full"
                  >
                    {{ fmt(personnelAssets[person.id].totalValue) }}
                  </span>
                  <button
                    v-if="personnelAssets[person.id].active?.length > 0"
                    @click.stop="openPrintModal(person)"
                    class="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-bold rounded-lg flex items-center gap-1.5 transition-colors print:hidden"
                    title="Zimmet Formu Yazdır"
                  >
                    <i class="fas fa-print text-gray-500"></i>
                    <span>Zimmet Formu</span>
                  </button>
                </div>
                <div v-else class="text-gray-300 text-[11px] italic">Yükleniyor...</div>

                <i :class="['fas', expandedIds.has(person.id) ? 'fa-chevron-up' : 'fa-chevron-down', 'text-gray-400 text-[11px] transition-transform']"></i>
              </div>
          </div>

          <!-- Expanded Assets Table -->
          <div v-if="expandedIds.has(person.id) && personnelAssets[person.id]">
            <div v-if="personnelAssets[person.id].active?.length === 0" class="px-5 py-4 text-[12px] text-gray-400 italic">
              Bu personelde aktif zimmetli cihaz bulunmuyor.
            </div>
            <table v-else class="w-full text-left text-[12px]">
              <thead class="bg-gray-50 text-gray-400 uppercase text-[9.5px] font-bold border-b border-gray-100">
                <tr>
                  <th class="px-5 py-2.5">Seri No / Envanter No</th>
                  <th class="px-5 py-2.5">Cihaz Bilgisi</th>
                  <th class="px-5 py-2.5">Kategori</th>
                  <th class="px-5 py-2.5">Alış Bedeli</th>
                  <th class="px-5 py-2.5">Alış Tarihi</th>
                  <th class="px-5 py-2.5 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-50">
                <tr
                  v-for="asset in personnelAssets[person.id].active"
                  :key="asset.id"
                  class="hover:bg-gray-50/50 transition-colors"
                >
                  <td class="px-5 py-3">
                    <div class="font-bold text-gray-900">{{ asset.serial_no }}</div>
                    <div v-if="asset.barcode" class="text-[10px] text-gray-400 mt-0.5">
                      <i class="fas fa-barcode mr-1"></i>{{ asset.barcode }}
                    </div>
                  </td>
                  <td class="px-5 py-3 font-semibold text-gray-700">
                    {{ asset.brand_name }} {{ asset.model_name }}
                  </td>
                  <td class="px-5 py-3 text-gray-500">{{ asset.category_name }}</td>
                  <td class="px-5 py-3 font-semibold text-gray-900">{{ fmt(asset.purchase_price) }}</td>
                  <td class="px-5 py-3 text-gray-500">{{ fmtDate(asset.purchase_date) }}</td>
                  <td class="px-5 py-3 text-right">
                    <RouterLink
                      to="/inventory/assets"
                      class="text-blue-600 hover:text-blue-800 text-[11px] font-bold transition-colors"
                      title="Envanterde Görüntüle"
                    >
                      <i class="fas fa-external-link-alt"></i>
                    </RouterLink>
                  </td>
                </tr>
              </tbody>
            </table>

            <!-- History Section -->
            <div v-if="personnelAssets[person.id].history?.length > 0" class="border-t border-gray-50 px-5 py-3">
              <div class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                <i class="fas fa-history"></i> Zimmet Geçmişi ({{ personnelAssets[person.id].history.length }})
              </div>
              <div class="flex flex-wrap gap-2">
                <div
                  v-for="h in personnelAssets[person.id].history.slice(0, 5)"
                  :key="h.id"
                  class="text-[11px] px-2.5 py-1 rounded-full bg-gray-100 text-gray-500"
                >
                  <i :class="h.action === 'CHECKOUT' ? 'fas fa-arrow-right text-blue-400' : 'fas fa-arrow-left text-amber-400'" class="mr-1"></i>
                  {{ h.brand_name }} {{ h.model_name }} · {{ fmtDate(h.created_at) }}
                </div>
                <div v-if="personnelAssets[person.id].history.length > 5" class="text-[11px] px-2.5 py-1 text-gray-400">
                  +{{ personnelAssets[person.id].history.length - 5 }} daha...
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- PRINT ZİMMET MODAL -->
    <div v-if="showPrintModal && selectedPrintPerson" class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 print:p-0 print:static print:bg-transparent">
      <div class="bg-white rounded-2xl max-w-3xl w-full p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto print:max-h-none print:shadow-none print:w-full print:p-0">
        <!-- Close & Print Action Buttons (Hidden on Print) -->
        <div class="flex items-center justify-between border-b pb-4 mb-6 print:hidden">
          <div class="flex items-center gap-2">
            <i class="fas fa-file-contract text-blue-600 text-xl"></i>
            <h2 class="text-lg font-bold text-gray-800">Zimmet Teslim ve Tesellüm Tutanağı</h2>
          </div>
          <div class="flex items-center gap-3">
            <button @click="triggerPrint" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg flex items-center gap-2 transition-colors">
              <i class="fas fa-print"></i> Yazdır / PDF İndir
            </button>
            <button @click="showPrintModal = false" class="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-xs rounded-lg">
              Kapat
            </button>
          </div>
        </div>

        <!-- PRINTABLE DOCUMENT AREA -->
        <div id="zimmet-print-area" class="text-gray-800 font-sans text-xs space-y-6">
          <!-- Document Header -->
          <div class="text-center border-b-2 border-gray-800 pb-4">
            <h1 class="text-xl font-bold uppercase tracking-wider text-gray-900 mb-1">ZİMMET TESLİM VE TESELLÜM TUTANAĞI</h1>
            <p class="text-xs text-gray-500 font-medium">{{ selectedPrintPerson.company_name || 'KURUM İÇİ IT BİLİŞİM ENVALERİ' }}</p>
          </div>

          <!-- Personnel Info Table -->
          <div class="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
            <div>
              <span class="text-gray-500 block font-medium text-[11px]">PERSONEL ADI SOYADI:</span>
              <span class="font-bold text-sm text-gray-900">{{ selectedPrintPerson.first_name }} {{ selectedPrintPerson.last_name }}</span>
            </div>
            <div>
              <span class="text-gray-500 block font-medium text-[11px]">UNVAN:</span>
              <span class="font-semibold text-gray-800">{{ selectedPrintPerson.title || '—' }}</span>
            </div>
            <div>
              <span class="text-gray-500 block font-medium text-[11px]">ŞİRKET / DEPARTMAN:</span>
              <span class="font-semibold text-gray-800">{{ selectedPrintPerson.company_name }} / {{ selectedPrintPerson.department_name || '—' }}</span>
            </div>
            <div>
              <span class="text-gray-500 block font-medium text-[11px]">DÜZENLEME TARİHİ:</span>
              <span class="font-bold text-gray-900">{{ new Date().toLocaleDateString('tr-TR') }}</span>
            </div>
          </div>

          <!-- Assets Table -->
          <div>
            <h3 class="font-bold text-gray-800 mb-2 uppercase tracking-wider text-[11px]">Teslim Edilen Donanım ve Cihaz Listesi:</h3>
            <table class="w-full border-collapse border border-gray-300 text-left">
              <thead>
                <tr class="bg-gray-100 border-b border-gray-300">
                  <th class="border border-gray-300 px-3 py-2 font-bold text-[11px]">S.No</th>
                  <th class="border border-gray-300 px-3 py-2 font-bold text-[11px]">Kategori</th>
                  <th class="border border-gray-300 px-3 py-2 font-bold text-[11px]">Marka & Model</th>
                  <th class="border border-gray-300 px-3 py-2 font-bold text-[11px]">Seri Numarası</th>
                  <th class="border border-gray-300 px-3 py-2 font-bold text-[11px]">Envanter No</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(asset, idx) in (personnelAssets[selectedPrintPerson.id]?.active || [])" :key="asset.id" class="border-b border-gray-200">
                  <td class="border border-gray-300 px-3 py-2 text-center font-bold">{{ idx + 1 }}</td>
                  <td class="border border-gray-300 px-3 py-2">{{ asset.category_name }}</td>
                  <td class="border border-gray-300 px-3 py-2 font-semibold">{{ asset.brand_name }} {{ asset.model_name }}</td>
                  <td class="border border-gray-300 px-3 py-2 font-mono font-bold">{{ asset.serial_no }}</td>
                  <td class="border border-gray-300 px-3 py-2 font-mono">{{ asset.barcode || '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Legal & Commitment Terms -->
          <div class="text-[11px] text-gray-600 leading-relaxed border p-3 rounded-lg bg-gray-50 border-gray-200">
            <p class="font-bold mb-1 text-gray-800">Taahhütname:</p>
            <p>Yukarıda detayları ve seri numaraları belirtilen şirket malı cihaz ve teçhizatı eksiksiz, sağlam ve çalışır vaziyette teslim aldım. Bu cihazları şirket iş süreçleri haricinde kullanmayacağımı, özenle koruyacağımı, işten ayrılma veya zimmet iptali durumunda IT departmanına eksiksiz iade edeceğimi beyan ve taahhüt ederim.</p>
          </div>

          <!-- Signatures Area -->
          <div class="grid grid-cols-2 gap-8 pt-8 mt-6">
            <div class="text-center border-t border-gray-300 pt-3">
              <p class="font-bold text-gray-800 text-[11px]">TESLİM EDEN (IT DEPARTMANI)</p>
              <p class="text-gray-400 text-[10px] mt-1">İmza & Tarih</p>
              <div class="h-16"></div>
            </div>
            <div class="text-center border-t border-gray-300 pt-3">
              <p class="font-bold text-gray-800 text-[11px]">TESLİM ALAN (PERSONEL)</p>
              <p class="text-gray-900 font-semibold text-[11px] mt-0.5">{{ selectedPrintPerson.first_name }} {{ selectedPrintPerson.last_name }}</p>
              <p class="text-gray-400 text-[10px]">İmza & Tarih</p>
              <div class="h-16"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import axios from 'axios'
import { useAssetStore } from '../../stores/assetStore'
import { useMasterDataStore } from '../../stores/masterData'

const assetStore = useAssetStore()
const masterData = useMasterDataStore()

const loading = ref(false)
const searchQuery = ref('')
const selectedCompanyId = ref('')
const onlyAssignedFilter = ref(true)
const expandedIds = ref(new Set())
const personnelAssets = ref({})
const showPrintModal = ref(false)
const selectedPrintPerson = ref(null)
const formTemplates = ref([])
const activeFormTemplate = ref(null)

const fetchFormTemplates = async () => {
  try {
    const res = await axios.get('/api/assets/form-templates')
    formTemplates.value = res.data
    const def = res.data.find(t => t.is_default) || res.data[0]
    if (def) activeFormTemplate.value = def
  } catch (err) {
    console.error('fetchFormTemplates error:', err)
  }
}

const companies = computed(() => masterData.companies)

const fmt = (v) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(v || 0)
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('tr-TR') : '—'

const openPrintModal = (person) => {
  selectedPrintPerson.value = person
  showPrintModal.value = true
}

const openBatchPrintModal = () => {
  const firstPersonWithAssets = filteredPersonnel.value.find(p => personnelAssets.value[p.id]?.active?.length > 0)
  if (firstPersonWithAssets) {
    selectedPrintPerson.value = firstPersonWithAssets
    showPrintModal.value = true
  }
}

const triggerPrint = () => {
  const printArea = document.getElementById('zimmet-print-area')
  if (!printArea) return

  const printWin = window.open('', '_blank', 'width=950,height=800')
  if (!printWin) {
    alert('Popup penceresi açılamadı. Lütfen tarayıcı popup iznini kontrol edin.')
    return
  }

  printWin.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8"/>
      <title>Zimmet Teslim ve Tesellüm Tutanağı - ${selectedPrintPerson.value?.first_name || ''} ${selectedPrintPerson.value?.last_name || ''}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 12px; color: #111827; background: #ffffff; padding: 20px; }
        @page { size: A4 portrait; margin: 15mm; }
        @media print {
          body { padding: 0; }
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-bold { font-weight: 700; }
        .font-semibold { font-weight: 600; }
        .font-mono { font-family: monospace; }
        .uppercase { text-transform: uppercase; }
        .tracking-wider { letter-spacing: 0.05em; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .bg-gray-50 { background-color: #f9fafb; }
        .p-4 { padding: 16px; }
        .p-3 { padding: 12px; }
        .rounded-xl { border-radius: 12px; }
        .rounded-lg { border-radius: 8px; }
        .border { border: 1px solid #e5e7eb; }
        .border-b-2 { border-bottom: 2px solid #111827; }
        .pb-4 { padding-bottom: 16px; }
        .mb-1 { margin-bottom: 4px; }
        .mb-2 { margin-between: 8px; margin-bottom: 8px; }
        .mt-6 { margin-top: 24px; }
        .pt-8 { padding-top: 32px; }
        .space-y-6 > * + * { margin-top: 24px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th, td { border: 1px solid #d1d5db; padding: 8px 12px; text-align: left; }
        th { background-color: #f3f4f6; font-weight: 700; font-size: 11px; }
      </style>
    </head>
    <body>
      <div class="space-y-6">${printArea.innerHTML}</div>
    </body>
    </html>
  `)

  printWin.document.close()
  printWin.focus()

  setTimeout(() => {
    printWin.print()
    printWin.close()
  }, 400)
}

const personnelWithAssetsCount = computed(() => {
  return masterData.personnel.filter(p => personnelAssets.value[p.id]?.active?.length > 0).length
})

const filteredPersonnel = computed(() => {
  return masterData.personnel
    .map(p => ({
      ...p,
      company_name: masterData.companies.find(c => c.id === p.company_id)?.name || '',
      department_name: masterData.departments?.find(d => d.id === p.department_id)?.name || ''
    }))
    .filter(p => {
      if (onlyAssignedFilter.value) {
        const pa = personnelAssets.value[p.id]
        if (!pa || !pa.active || pa.active.length === 0) return false
      }
      if (selectedCompanyId.value && p.company_id !== Number(selectedCompanyId.value)) return false
      if (searchQuery.value) {
        const q = searchQuery.value.toLowerCase()
        const name = `${p.first_name} ${p.last_name}`.toLowerCase()
        if (!name.includes(q) && !(p.company_name || '').toLowerCase().includes(q)) return false
      }
      return true
    })
})

const totalAssignedCount = computed(() => {
  return Object.values(personnelAssets.value).reduce((sum, pa) => sum + (pa.active?.length || 0), 0)
})

const toggleExpand = async (personnelId) => {
  if (expandedIds.value.has(personnelId)) {
    expandedIds.value = new Set([...expandedIds.value].filter(id => id !== personnelId))
  } else {
    expandedIds.value = new Set([...expandedIds.value, personnelId])
    if (!personnelAssets.value[personnelId]) {
      await loadPersonnelAssets(personnelId)
    }
  }
}

const loadPersonnelAssets = async (personnelId) => {
  try {
    const data = await assetStore.fetchPersonnelAssets(personnelId)
    const totalValue = (data.active || []).reduce((sum, a) => sum + (a.purchase_price || 0), 0)
    personnelAssets.value = {
      ...personnelAssets.value,
      [personnelId]: { ...data, totalValue }
    }
  } catch (err) {
    console.error('Personnel assets load error:', err)
  }
}

// Ultra-fast in-memory preloading for all personnel (0ms latency!)
const preloadBadges = async () => {
  if (assetStore.assets.length === 0) {
    await assetStore.fetchAssets()
  }

  const map = {}
  assetStore.assets.forEach(a => {
    if (a.personnel_id) {
      if (!map[a.personnel_id]) {
        map[a.personnel_id] = { active: [], history: [], totalValue: 0 }
      }
      map[a.personnel_id].active.push(a)
      map[a.personnel_id].totalValue += (a.purchase_price || 0)
    }
  })

  personnelAssets.value = map
}

onMounted(async () => {
  loading.value = true
  try {
    await Promise.all([
      masterData.fetchPersonnel(),
      masterData.fetchCompanies(),
      masterData.fetchDepartments(),
      assetStore.fetchAssets(),
      fetchFormTemplates()
    ])
    await preloadBadges()
  } finally {
    loading.value = false
  }
})
</script>

