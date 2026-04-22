<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import api from '../../api'
import { useMasterDataStore } from '../../stores/masterData'
import AppTable from '../../components/AppTable.vue'
import { useConfirm } from '../../composables/useConfirm'
import * as XLSX from 'xlsx'

const { ask, startLoading, stopLoading } = useConfirm()
const masterData = useMasterDataStore()

/* ─── State ─── */
const summaries       = ref([])
const invoices        = ref([])
const loading         = ref(false)
const uploading       = ref(false)
const viewMode          = ref('documents') // 'documents' or 'records'
const selectedPeriod  = ref('')
const selectedSourceFile = ref('')
const searchQuery     = ref('')
const selectedOperator = ref('all') 

const isUploadModalOpen  = ref(false)
const isHistoryModalOpen = ref(false)
const historyData        = ref(null)
const historyLoading     = ref(false)

const uploadPeriod    = ref(new Date().toISOString().slice(0, 7))
const uploadOperator  = ref('Turkcell')
const uploadType      = ref('gsm') 
const selectedFiles   = ref([])
const fileInput       = ref(null)

/* ─── Selection (bulk) ─── */
const selectedIds       = ref([])
const onSelectionChange = (rows) => { 
  if (viewMode.value === 'documents') {
    selectedIds.value = rows.map(r => r.source_file + r.period)
  } else {
    selectedIds.value = rows.map(r => r.id) 
  }
}

/* ─── Table columns ─── */
const docColumns = [
  { key: 'period',         label: 'Dönem',               sortable: true, width: '100px' },
  { key: 'operator',       label: 'Operatör',            sortable: true, width: '130px' },
  { key: 'source_file',    label: 'Dosya / Belge Adı',   sortable: true, nowrap: false },
  { key: 'ticket_count',   label: 'Kayıt',               sortable: true, width: '90px', align: 'center' },
  { key: 'total_payable',  label: 'Toplam Tutar',        sortable: true, width: '140px', align: 'right' },
  { key: 'unmatched_count',label: 'Açık Kayıt',          sortable: true, width: '110px', align: 'center' },
]

const recordColumns = [
  { key: 'invoice_type',   label: 'Tür',                 sortable: true, width: '90px' },
  { key: 'company_name',   label: 'Şirket',              sortable: true, width: '150px' },
  { key: 'cost_center',    label: 'Masraf Merkezi',      sortable: true, width: '150px' },
  { key: 'phone_no',       label: 'Detay',               sortable: true, width: '130px' },
  { key: 'tariff',         label: 'Hizmet / Tarife',     sortable: true, nowrap: false },
  { key: 'total_amount',   label: 'Tutar',               sortable: true, width: '120px', align: 'right' },
  { key: 'status_label',   label: 'Durum',               sortable: true, width: '100px' },
]

/* Filtering */
const filteredDocuments = computed(() => {
  let list = summaries.value
  if (selectedOperator.value !== 'all') {
    list = list.filter(i => i.operator === selectedOperator.value)
  }
  if (searchQuery.value) {
    const s = searchQuery.value.toLowerCase()
    list = list.filter(d => d.source_file.toLowerCase().includes(s))
  }
  return list
})

const filteredInvoices = computed(() => {
  let list = invoices.value
  if (selectedOperator.value !== 'all') {
    list = list.filter(i => i.operator === selectedOperator.value)
  }
  return list.map(i => ({ ...i, status_label: i.is_matched ? 'Eşleşti' : 'Açık' }))
})

/* ─── Fetch ─── */
const fetchSummaries = async () => {
  loading.value = true
  try {
    const res = await api.get('/sim-takip/api/invoices/summary')
    summaries.value = res.data
    if (!selectedPeriod.value && summaries.value.length > 0)
      selectedPeriod.value = summaries.value[0].period
  } catch (err) { console.error('Özetler yüklenemedi:', err) }
  finally { loading.value = false }
}

const fetchInvoices = async () => {
  if (viewMode.value === 'documents') return
  loading.value = true
  try {
    const res = await api.get('/sim-takip/api/invoices/list', {
      params: {
        period:      selectedPeriod.value,
        source_file: selectedSourceFile.value,
        search:      searchQuery.value,
      }
    })
    invoices.value = res.data
  } catch (err) { console.error('Faturalar yüklenemedi:', err) }
  finally { loading.value = false }
}

const backToDocuments = () => {
  viewMode.value = 'documents'
  selectedSourceFile.value = ''
  selectedIds.value = [] // Selection'ı temizle
  fetchSummaries()
}

const selectDocument = (doc) => {
  selectedPeriod.value = doc.period
  selectedSourceFile.value = doc.source_file
  viewMode.value = 'records'
  selectedIds.value = [] // Selection'ı temizle
  fetchInvoices()
}

const periods = computed(() => {
  const pSet = new Set(summaries.value.map(s => s.period))
  return [...pSet].sort((a, b) => b.localeCompare(a))
})

watch(selectedPeriod, () => {
  if (viewMode.value === 'records') fetchInvoices()
  else fetchSummaries()
})

const renameDocument = async (doc) => {
  const newName = window.prompt('Yeni dosya adını giriniz:', doc.source_file)
  if (!newName || newName === doc.source_file) return

  try {
    startLoading()
    await api.post('/sim-takip/api/invoices/rename-file', {
      oldName: doc.source_file,
      newName: newName,
      period: doc.period,
      operator: doc.operator
    })
    await fetchSummaries()
  } catch (err) {
    alert('Ad değiştirme hatası: ' + (err.response?.data?.message || err.message))
  } finally {
    stopLoading()
  }
}

let searchTimeout = null
watch(searchQuery, () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(fetchInvoices, 500)
})

/* ─── Actions ─── */
const exportInvoices = async () => {
  try {
    const res = await api.get('/sim-takip/api/invoices/export', {
      params: { period: selectedPeriod.value, source_file: selectedSourceFile.value },
      responseType: 'blob'
    })
    const url  = window.URL.createObjectURL(new Blob([res.data]))
    const link = document.createElement('a')
    link.href  = url
    link.setAttribute('download', `faturalar-${selectedPeriod.value || 'tum'}.xlsx`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } catch (err) { console.error('Dışa aktarma hatası:', err) }
}

const exportSelectedRows = () => {
  const selected = invoices.value.filter(i => selectedIds.value.includes(i.id))
  const rows = selected.map(r => ({
    Şirket: r.company_name, 'Masraf Merkezi': r.cost_center,
    Telefon: r.phone_no, Tarife: r.tariff, Tutar: r.total_amount, Durum: r.status_label
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'SeciliFaturalar')
  XLSX.writeFile(wb, `secili-faturalar.xlsx`)
}

const uploadInvoices = async () => {
  if (selectedFiles.value.length === 0) return
  uploading.value = true
  const formData = new FormData()
  formData.append('period', uploadPeriod.value)
  
  const endpoint = uploadType.value === 'm365' 
    ? '/api/master-data/reports/financial/upload/m365'
    : '/sim-takip/api/invoices/upload'

  if (uploadType.value === 'gsm') {
    formData.append('operator', uploadOperator.value)
  }

  selectedFiles.value.forEach(file => formData.append('file', file))
  
  try {
    const res = await api.post(endpoint, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
    isUploadModalOpen.value = false
    selectedFiles.value = []
    selectedPeriod.value = uploadPeriod.value
    await fetchSummaries()
    fetchInvoices()
    alert(`Başarılı! ${res.data?.message || 'Faturalar yüklendi.'}`)
  } catch (err) {
    alert('Yükleme hatası: ' + (err.response?.data?.message || err.response?.data?.error || err.message))
  } finally { uploading.value = false }
}

const deleteSelectedInvoices = async () => {
  if (selectedIds.value.length === 0) return
  const confirmed = await ask({
    title: 'Kayıtları Sil',
    message: `${selectedIds.value.length} adet fatura satırını silmek istediğinize emin misiniz?`,
    confirmLabel: 'Evet, Sil'
  })
  if (!confirmed) return
  try {
    await api.post('/sim-takip/api/invoices/bulk-delete', { ids: selectedIds.value })
    selectedIds.value = []
    fetchInvoices()
  } catch (err) { alert('Silme hatası: ' + (err.response?.data?.message || err.message)) }
}

const deleteSelectedDocuments = async () => {
  if (selectedIds.value.length === 0) return
  
  // Seçili dokümanların bilgilerini hazırla
  const selectedDocs = summaries.value.filter(s => {
    // summaries tablosunda ID yok, o yüzden source_file+period+operator kombinasyonunu kullanacağız veya summaries'e ID ekleyeceğiz.
    // Şimdilik AppTable selection row'un kendisini de döndürebilir ama biz sadece ID tutuyoruz.
    // Bu yüzden seçili row'ları bulmak için farklı bir yaklaşım lazım.
    return selectedIds.value.includes(s.source_file + s.period) // Geçici unique key
  })

  const confirmed = await ask({
    title: 'Belgeleri Sil',
    message: `${selectedIds.value.length} adet faturayı ve içindeki tüm kayıtları silmek istediğinize emin misiniz?`,
    confirmLabel: 'Evet, Belgeleri Sil'
  })
  if (!confirmed) return

  try {
    // summaries tablosundan gelen verilerle backend'deki bulk-delete-summaries'e uygun formatta gönderelim
    const summariesToDelete = summaries.value
      .filter(s => selectedIds.value.includes(s.source_file + s.period))
      .map(s => ({ period: s.period, operator: s.operator, source_file: s.source_file }))

    await api.post('/sim-takip/api/invoices/bulk-delete-summaries', { summaries: summariesToDelete })
    selectedIds.value = []
    fetchSummaries()
  } catch (err) { alert('Silme hatası: ' + (err.response?.data?.message || err.message)) }
}

const showHistory = async (row) => {
  historyLoading.value = true
  isHistoryModalOpen.value = true
  try {
    const res = await api.get(`/sim-takip/api/invoices/history/${row.phone_no}`)
    historyData.value = res.data
  } catch (err) { console.error('Geçmiş yüklenemedi:', err) }
  finally { historyLoading.value = false }
}

const getVendorLogo = (name) => {
  if (!name) return 'fas fa-building text-gray-400'
  const lower = name.toLowerCase()
  if (lower.includes('turkcell')) return 'fas fa-mobile-alt text-blue-600'
  if (lower.includes('vodafone')) return 'fas fa-mobile-alt text-red-600'
  if (lower.includes('telekom')) return 'fas fa-mobile-alt text-blue-800'
  if (lower.includes('microsoft')) return 'fab fa-microsoft text-blue-500'
  if (lower.includes('fixcloud')) return 'fas fa-cloud text-sky-500'
  return 'fas fa-building text-gray-400'
}

onMounted(() => {
  masterData.fetchOperators()
  fetchSummaries()
})
</script>

<template>
  <div class="h-full flex text-[#3c4043] overflow-hidden bg-white">
    
    <!-- Sidebar: Vendors (Modern Sub-Sidebar) -->
    <div class="w-64 bg-gray-50 border-r border-gray-100 flex flex-col shrink-0 overflow-hidden">
      <div class="p-5 border-b border-gray-100">
        <h2 class="text-[10px] font-black text-gray-400 uppercase tracking-[2px] mb-1">Tedarikçiler</h2>
        <p class="text-[12px] text-gray-900 font-bold">Hizmet Sağlayıcılar</p>
      </div>

      <nav class="flex-1 overflow-y-auto px-2 py-4 space-y-0.5">
        <button type="button" @click="selectedOperator = 'all'"
          :class="selectedOperator === 'all' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'"
          class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left group">
          <i class="fas fa-th-large text-[12px] w-4 text-center"></i>
          <span class="text-[13px] font-semibold">Tüm Maliyetler</span>
        </button>

        <button v-for="op in masterData.operators" :key="op.id" type="button" @click="selectedOperator = op.name"
          :class="selectedOperator === op.name ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'"
          class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left group">
          <i :class="[getVendorLogo(op.name), 'text-[12px] w-4 text-center']"></i>
          <span class="text-[13px] font-semibold truncate">{{ op.name }}</span>
        </button>

        <template v-for="name in [...new Set(invoices.map(i => i.operator))]" :key="name">
          <button v-if="!masterData.operators.find(o => o.name === name) && name" type="button" @click="selectedOperator = name"
            :class="selectedOperator === name ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'"
            class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left group">
            <i :class="[getVendorLogo(name), 'text-[12px] w-4 text-center']"></i>
            <span class="text-[13px] font-semibold truncate">{{ name }}</span>
          </button>
        </template>
      </nav>

      <div class="p-4 border-t border-gray-100">
        <button @click="isUploadModalOpen = true" class="w-full h-10 bg-gray-900 text-white rounded-lg text-[12px] font-bold hover:bg-black transition-all flex items-center justify-center gap-2">
          <i class="fas fa-plus"></i> Fatura Yükle
        </button>
      </div>
    </div>

    <!-- Main Content -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Minimalist Toolbar -->
      <div class="h-14 border-b border-gray-100 px-6 flex items-center justify-between shrink-0 bg-white">
        <div class="flex items-center gap-4">
          <button v-if="viewMode === 'records'" @click="backToDocuments" class="h-8 px-3 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded text-gray-600 transition-all font-bold text-[11px] gap-2">
            <i class="fas fa-chevron-left text-[9px]"></i> GERİ DÖN
          </button>
          <div v-if="viewMode === 'records'" class="flex items-center gap-2">
            <span class="text-[14px] font-bold text-gray-900">{{ selectedSourceFile }}</span>
            <span class="text-[12px] text-gray-400 font-medium">/ {{ selectedPeriod }}</span>
          </div>
          <div v-else class="flex items-center gap-2">
            <span class="text-[14px] font-bold text-gray-900">Mali Kayıtlar</span>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <div class="relative">
            <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-[11px]"></i>
            <input v-model="searchQuery" type="text" :placeholder="viewMode === 'documents' ? 'Belge ara...' : 'Telefon veya detay...'"
              class="h-8 pl-8 pr-3 bg-gray-50 border border-gray-100 rounded text-[12px] outline-none focus:bg-white focus:border-blue-200 w-48 transition-all font-medium">
          </div>
          
          <div class="h-6 w-px bg-gray-100 mx-1"></div>

          <button @click="exportInvoices" class="h-8 px-3 bg-white text-gray-600 rounded text-[11px] font-bold border border-gray-100 hover:bg-gray-50 flex items-center gap-2 transition-all">
            <i class="fas fa-download text-emerald-500"></i> İNDİR
          </button>
          
          <select v-model="selectedPeriod" class="h-8 px-2 bg-white border border-gray-100 rounded text-[11px] font-bold outline-none focus:border-blue-500 cursor-pointer min-w-[100px]">
            <option value="">TÜM DÖNEMLER</option>
            <option v-for="p in periods" :key="p" :value="p">{{ p }}</option>
          </select>

          <button @click="viewMode === 'documents' ? fetchSummaries() : fetchInvoices()" class="h-8 w-8 flex items-center justify-center bg-gray-50 text-gray-400 hover:text-blue-600 rounded border border-gray-100 transition-all">
            <i class="fas fa-sync-alt text-[10px]"></i>
          </button>
        </div>
      </div>

      <!-- Bulk Actions Bar -->
      <div v-if="selectedIds.length > 0" class="bg-blue-600 text-white px-6 py-2 flex items-center justify-between shrink-0">
        <div class="flex items-center gap-4">
          <span class="text-[13px] font-bold">{{ selectedIds.length }} {{ viewMode === 'documents' ? 'Belge' : 'Kayıt' }} Seçildi</span>
          <div class="h-4 w-px bg-blue-400/50"></div>
          <button v-if="viewMode === 'records'" @click="exportSelectedRows" class="text-[12px] font-bold hover:underline flex items-center gap-1.5">
            <i class="fas fa-file-excel"></i> Excel Olarak İndir
          </button>
        </div>
        <button @click="viewMode === 'documents' ? deleteSelectedDocuments() : deleteSelectedInvoices()" 
          class="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-[11px] font-bold transition-all flex items-center gap-1.5">
          <i class="fas fa-trash-alt"></i> Seçilenleri Sil
        </button>
      </div>

      <!-- Table Section -->
      <div class="flex-1 min-h-0 bg-white">
        <AppTable
          :columns="viewMode === 'documents' ? docColumns : recordColumns"
          :rows="viewMode === 'documents' ? filteredDocuments : filteredInvoices"
          :loading="loading"
          :selectable="true"
          :empty-text="viewMode === 'documents' ? 'Fatura kaydı bulunamadı' : 'Kayıt bulunamadı'"
          @row-history="showHistory"
          @selection-change="onSelectionChange"
        >
          <template #cell-source_file="{ row, value }">
            <div class="flex flex-col">
              <span class="text-[13px] font-bold text-gray-900">{{ value }}</span>
              <span class="text-[10px] text-gray-400 font-mono">{{ row.period }}</span>
            </div>
          </template>

          <template #cell-ticket_count="{ value }">
            <span class="text-[12px] font-semibold text-gray-600">{{ value }} Kayıt</span>
          </template>

          <template #cell-total_payable="{ value }">
            <span class="font-bold text-gray-900 tabular-nums">{{ (value || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }} ₺</span>
          </template>

          <template #cell-unmatched_count="{ value }">
            <span v-if="value > 0" class="px-2 py-0.5 bg-red-50 text-red-600 rounded text-[10px] font-bold">{{ value }} AÇIK</span>
            <span v-else class="text-emerald-500"><i class="fas fa-check-circle text-[12px]"></i></span>
          </template>

          <template #cell-invoice_type="{ value }">
            <span :class="[
              'px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider',
              value === 'gsm' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
            ]">
              {{ value || 'gsm' }}
            </span>
          </template>

          <template #cell-phone_no="{ row, value }">
            <span v-if="row.invoice_type === 'gsm'" class="font-mono text-[12px] text-gray-500">{{ value || '—' }}</span>
            <span v-else class="text-[11px] text-gray-400 font-medium italic">Sistem Lisans Gideri</span>
          </template>

          <template #cell-total_amount="{ value }">
            <span class="font-bold text-gray-900 tabular-nums">{{ (value || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }} ₺</span>
          </template>

          <template #cell-status_label="{ value }">
            <div class="flex items-center gap-1.5">
              <div class="w-1.5 h-1.5 rounded-full" :class="value === 'Eşleşti' ? 'bg-emerald-500' : 'bg-red-500'"></div>
              <span class="text-[11px] font-bold uppercase tracking-tight" :class="value === 'Eşleşti' ? 'text-emerald-600' : 'text-red-600'">
                {{ value }}
              </span>
            </div>
          </template>

          <template #actions="{ row }">
            <div v-if="viewMode === 'documents'" class="flex items-center gap-2">
              <button type="button" @click="renameDocument(row)"
                class="w-8 h-8 flex items-center justify-center bg-gray-50 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
                title="Dosya Adını Düzenle">
                <i class="fas fa-edit text-[11px]"></i>
              </button>
              <button type="button" @click="selectDocument(row)"
                class="px-3 h-7 flex items-center justify-center bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded text-[10px] font-bold transition-all">
                DETAY <i class="fas fa-chevron-right ml-1 text-[8px]"></i>
              </button>
            </div>
            <button v-else type="button" @click="showHistory(row)"
              class="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all">
              <i class="fas fa-history text-[11px]"></i>
            </button>
          </template>
        </AppTable>
      </div>
    </div>

    <!-- Modals -->
    <Teleport to="body">
      <div v-if="isUploadModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" @click.self="isUploadModalOpen = false">
        <div class="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
          <div class="px-7 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <h3 class="text-[16px] font-bold text-gray-900">Fatura Dosyası Yükle</h3>
            <button @click="isUploadModalOpen = false" class="text-gray-400 hover:text-gray-700 w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <div class="p-8 space-y-6">
            <div class="space-y-2">
              <label class="text-[11px] font-bold text-gray-400 uppercase tracking-[2px]">Hizmet Tipi</label>
              <div class="flex gap-4 p-1.5 bg-gray-100 rounded-xl">
                <button type="button" @click="uploadType = 'gsm'" 
                  :class="uploadType === 'gsm' ? 'bg-white shadow text-blue-600' : 'text-gray-500'"
                  class="flex-1 py-3 text-[13px] font-bold rounded-lg transition-all flex items-center justify-center gap-2">
                  <i class="fas fa-mobile-alt"></i> GSM
                </button>
                <button type="button" @click="uploadType = 'm365'" 
                  :class="uploadType === 'm365' ? 'bg-white shadow text-blue-600' : 'text-gray-500'"
                  class="flex-1 py-3 text-[13px] font-bold rounded-lg transition-all flex items-center justify-center gap-2">
                  <i class="fab fa-microsoft"></i> M365
                </button>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-5">
              <div class="space-y-2">
                <label class="text-[11px] font-bold text-gray-400 uppercase tracking-[2px]">Dönem</label>
                <input v-model="uploadPeriod" type="month"
                  class="w-full h-11 px-4 border border-gray-200 rounded-lg outline-none focus:border-blue-500 bg-gray-50 font-bold">
              </div>
              <div v-if="uploadType === 'gsm'" class="space-y-2">
                <label class="text-[11px] font-bold text-gray-400 uppercase tracking-[2px]">Operatör</label>
                <select v-model="uploadOperator"
                  class="w-full h-11 px-4 border border-gray-200 rounded-lg outline-none focus:border-blue-500 bg-gray-50 text-[13px] font-bold cursor-pointer">
                  <option value="Turkcell">Turkcell</option>
                  <option value="Vodafone">Vodafone</option>
                  <option value="Türk Telekom">Türk Telekom</option>
                </select>
              </div>
            </div>

            <div @click="fileInput.click()"
              class="border-2 border-dashed border-gray-200 rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer hover:border-blue-300 hover:bg-blue-50/20 transition-all group">
              <input type="file" ref="fileInput" multiple @change="e => selectedFiles = [...e.target.files]" class="hidden" :accept="uploadType === 'm365' ? '.xlsx,.xls' : '.pdf,.xml'">
              <div class="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <i class="fas fa-cloud-upload-alt text-xl text-gray-400 group-hover:text-blue-500"></i>
              </div>
              <span class="text-[13px] font-bold text-gray-600 text-center">
                {{ uploadType === 'm365' ? 'Excel dosyasını seçin' : 'PDF veya XML dosyalarını seçin' }}
              </span>
              
              <div v-if="selectedFiles.length > 0" class="mt-4 flex flex-wrap gap-2 justify-center">
                <div v-for="f in selectedFiles" :key="f.name" class="px-2 py-1 bg-blue-600 text-white text-[10px] font-bold rounded flex items-center gap-2">
                  <i class="far fa-file"></i> {{ f.name }}
                </div>
              </div>
            </div>
          </div>

          <div class="px-7 py-5 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
            <button @click="isUploadModalOpen = false" class="px-4 py-2 text-[13px] font-bold text-gray-500 hover:text-gray-700">İptal</button>
            <button @click="uploadInvoices" :disabled="selectedFiles.length === 0 || uploading"
              class="px-8 py-3 bg-blue-600 text-white rounded-lg text-[13px] font-bold hover:bg-blue-700 disabled:opacity-50 transition-all shadow-md shadow-blue-100">
              <span v-if="uploading"><i class="fas fa-spinner fa-spin mr-2"></i> Yükleniyor...</span>
              <span v-else>Yüklemeyi Başlat</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="isHistoryModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" @click.self="isHistoryModalOpen = false">
        <div class="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
          <div class="px-7 py-5 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center">
            <h3 class="text-[15px] font-bold text-gray-900 flex items-center gap-3">
              Maliyet Geçmişi 
              <span class="px-2 py-0.5 bg-blue-100 text-blue-600 rounded font-mono text-[11px]">{{ historyData?.phone_no || 'Lisans' }}</span>
            </h3>
            <button @click="isHistoryModalOpen = false" class="text-gray-400 hover:text-gray-700 w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="p-6 max-h-[450px] overflow-y-auto space-y-3">
            <div v-if="historyLoading" class="flex flex-col items-center justify-center py-10">
               <div class="w-8 h-8 border-4 border-blue-50 border-t-blue-600 rounded-full animate-spin mb-3"></div>
            </div>
            <div v-else-if="!historyData?.history?.length" class="text-center py-10 text-gray-400 text-[13px] italic">Geçmiş veri bulunamadı.</div>
            <div v-for="h in historyData?.history" :key="h.period + h.source_file"
              class="flex items-center justify-between p-3.5 bg-gray-50 border border-gray-100 rounded-xl">
              <div class="flex flex-col">
                <span class="text-[9px] font-black text-gray-400 uppercase tracking-widest">{{ h.period }}</span>
                <span class="text-[13px] font-bold text-gray-800">{{ h.tariff || 'Standart Hizmet' }}</span>
                <span class="text-[10px] text-gray-400 truncate max-w-[250px]">{{ h.source_file }}</span>
              </div>
              <div class="text-[16px] font-black text-gray-900 tabular-nums">
                {{ h.total_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }} <span class="text-[11px] text-gray-400">₺</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
</style>
