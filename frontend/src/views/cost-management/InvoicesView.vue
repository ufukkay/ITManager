<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import api from '../../api'
import AppTable from '../../components/AppTable.vue'
import { useConfirm } from '../../composables/useConfirm'
import * as XLSX from 'xlsx'

const { ask, startLoading, stopLoading } = useConfirm()

/* ─── State ─── */
const summaries       = ref([])
const invoices        = ref([])
const loading         = ref(false)
const uploading       = ref(false)
const selectedPeriod  = ref('')
const selectedSourceFile = ref('')
const searchQuery     = ref('')
const isUploadModalOpen  = ref(false)
const isHistoryModalOpen = ref(false)
const historyData        = ref(null)
const historyLoading     = ref(false)
const uploadPeriod    = ref(new Date().toISOString().slice(0, 7))
const uploadOperator  = ref('Turkcell')
const uploadType      = ref('gsm') // 'gsm' or 'm365'
const selectedFiles   = ref([])
const fileInput       = ref(null)

/* ─── Selection (bulk) ─── */
const selectedIds       = ref([])
const onSelectionChange = (rows) => { selectedIds.value = rows.map(r => r.id) }

/* ─── Table columns ─── */
const columns = [
  { key: 'personnel_name', label: 'Personel / Paydaş',  sortable: true, width: '200px' },
  { key: 'invoice_type',   label: 'Tür',                 sortable: true, width: '100px' },
  { key: 'company_name',   label: 'Şirket',              sortable: true, width: '150px' },
  { key: 'cost_center',    label: 'Masraf Merkezi',      sortable: true, width: '150px' },
  { key: 'phone_no',       label: 'Detay',               sortable: true, width: '130px' },
  { key: 'tariff',         label: 'Hizmet / Tarife',     sortable: true, nowrap: false },
  { key: 'total_amount',   label: 'Tutar',               sortable: true, width: '120px', align: 'right' },
  { key: 'status_label',   label: 'Durum',               sortable: true, width: '100px' },
]

/* Map is_matched → status_label for filtering/sorting */
const tableRows = computed(() =>
  invoices.value.map(i => ({ ...i, status_label: i.is_matched ? 'Eşleşti' : 'Açık' }))
)

/* ─── Stats ─── */
const stats = computed(() => ({
  totalPayable:   invoices.value.reduce((a, b) => a + (b.total_amount || 0), 0),
  ticketCount:    invoices.value.length,
  unmatchedCount: invoices.value.filter(i => !i.is_matched).length,
}))

/* ─── Fetch ─── */
const fetchSummaries = async () => {
  try {
    const res = await api.get('/sim-takip/api/invoices/summary')
    summaries.value = res.data
    if (!selectedPeriod.value && summaries.value.length > 0)
      selectedPeriod.value = summaries.value[0].period
  } catch (err) { console.error('Özetler yüklenemedi:', err) }
}

const fetchInvoices = async () => {
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

const periods = computed(() => {
  const pSet = new Set(summaries.value.map(s => s.period))
  return [...pSet].sort((a, b) => b.localeCompare(a))
})

const filesForSelectedPeriod = computed(() => {
  if (!selectedPeriod.value) return []
  return summaries.value.filter(s => s.period === selectedPeriod.value)
})

watch(selectedPeriod, () => { selectedSourceFile.value = '' })
watch([selectedPeriod, selectedSourceFile], () => fetchInvoices())

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
    Personel: r.personnel_name, Şirket: r.company_name, 'Masraf Merkezi': r.cost_center,
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
    await api.post(endpoint, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
    isUploadModalOpen.value = false
    selectedFiles.value = []
    fetchSummaries()
    fetchInvoices()
  } catch (err) {
    alert('Yükleme hatası: ' + (err.response?.data?.message || err.response?.data?.error || err.message))
  } finally { uploading.value = false }
}

const deleteSelectedInvoices = async () => {
  if (selectedIds.value.length === 0) return
  const confirmed = await ask({
    title: 'Faturaları Sil',
    message: `${selectedIds.value.length} adet fatura kaydını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`,
    confirmLabel: 'Evet, Hepsini Sil'
  })
  if (!confirmed) return
  try {
    await api.post('/sim-takip/api/invoices/bulk-delete', { ids: selectedIds.value })
    selectedIds.value = []
    fetchInvoices()
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

onMounted(() => {
  fetchSummaries()
  fetchInvoices()
})
</script>

<template>
  <div class="h-full flex flex-col gap-4 text-[#3c4043]">

    <!-- Stats Header -->
    <div class="bg-white border-b border-[#eee] px-6 py-4 flex items-center justify-between shrink-0">
      <div class="flex items-center gap-10">
        <div class="flex flex-col border-l-4 border-blue-600 pl-4">
          <h1 class="text-[17px] font-bold text-gray-800 tracking-tight leading-none mb-1">Fatura Yönetimi</h1>
          <span class="text-[11px] font-bold text-gray-400 uppercase tracking-widest leading-none">Operatör & Maliyet Analizi</span>
        </div>
        
        <div class="flex items-center gap-8">
          <div class="flex flex-col">
            <span class="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Toplam Ödenecek</span>
            <span class="text-[16px] font-bold text-gray-900 leading-none">{{ stats.totalPayable.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }} ₺</span>
          </div>
          <div class="flex flex-col h-8 w-px bg-gray-100"></div>
          <div class="flex flex-col">
            <span class="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Kayıt Sayısı</span>
            <span class="text-[16px] font-bold text-gray-700 leading-none">{{ stats.ticketCount }}</span>
          </div>
          <div v-if="stats.unmatchedCount > 0" class="flex flex-col border-l border-red-50 pl-6">
            <span class="text-[10px] text-red-400 font-bold uppercase tracking-wider mb-1">Eşleşmeyen</span>
            <span class="text-[16px] font-bold text-red-600 leading-none">{{ stats.unmatchedCount }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- AppTable -->
    <AppTable
      :columns="columns"
      :rows="tableRows"
      :loading="loading"
      :selectable="true"
      empty-text="Sonuç bulunamadı"
      @row-history="showHistory"
      @selection-change="onSelectionChange"
    >
      <template #toolbar>
        <!-- Period & file selects -->
        <select v-model="selectedPeriod" title="Dönem"
          class="at-qs">
          <option value="">Dönem</option>
          <option v-for="p in periods" :key="p" :value="p">{{ p }}</option>
        </select>

        <select v-model="selectedSourceFile" title="Dosya"
          class="at-qs !max-w-[320px]">
          <option value="">Dosya / Belge</option>
          <option v-for="s in filesForSelectedPeriod" :key="s.source_file" :value="s.source_file">{{ s.source_file }}</option>
        </select>

        <button type="button" @click="fetchInvoices"
          class="h-8 w-8 flex items-center justify-center text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded border border-[#dadce0]" title="Yenile">
          <i class="fas fa-sync-alt text-[12px]"></i>
        </button>

        <!-- Selection bulk actions -->
        <template v-if="selectedIds.length > 0">
          <span class="text-[13px] font-bold text-[#1a73e8] ml-2">{{ selectedIds.length }} Seçili</span>
          <button type="button" @click="exportSelectedRows"
            class="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-none text-[12px] font-bold hover:bg-emerald-100">
            <i class="fas fa-file-excel"></i> Seçilenleri İndir
          </button>
          <button type="button" @click="deleteSelectedInvoices"
            class="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 border border-red-100 rounded-none text-[12px] font-bold hover:bg-red-100">
            <i class="fas fa-trash-alt"></i> Sil
          </button>
        </template>

        <button type="button" @click="exportInvoices"
          class="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-600 border border-gray-100 rounded-none text-[12px] font-bold hover:bg-gray-100 outline-none">
          <i class="fas fa-file-excel text-gray-400"></i> Dışa Aktar
        </button>
        <button type="button" @click="isUploadModalOpen = true"
          class="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-none text-[12px] font-bold hover:bg-blue-700 shadow-sm outline-none">
          <i class="fas fa-plus"></i> Dosya Yükle
        </button>
      </template>

      <!-- Tür Badge -->
      <template #cell-invoice_type="{ value }">
        <span :class="[
          'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
          value === 'gsm' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
        ]">
          {{ value || 'gsm' }}
        </span>
      </template>

      <!-- Detay font-mono -->
      <template #cell-phone_no="{ row, value }">
        <span v-if="row.invoice_type === 'gsm'" class="font-mono text-[12px] whitespace-nowrap">{{ value || '—' }}</span>
        <span v-else class="text-[11px] text-gray-400 italic">M365 Lisans Gideri</span>
      </template>

      <!-- Tutar -->
      <template #cell-total_amount="{ value }">
        <span class="font-bold text-gray-900">{{ (value || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }} ₺</span>
      </template>

      <!-- Durum badge -->
      <template #cell-status_label="{ value }">
        <span v-if="value === 'Eşleşti'" class="px-2 py-0.5 rounded text-[12px] font-bold uppercase bg-[#e6f4ea] text-[#1e8e3e]">EŞLEŞTİ</span>
        <span v-else class="px-2 py-0.5 rounded text-[12px] font-bold uppercase bg-[#fce8e6] text-[#d93025]">AÇIK</span>
      </template>

      <!-- Actions: only history button per row -->
      <template #actions="{ row }">
        <button type="button" @click="showHistory(row)"
          class="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded-full transition-all">
          <i class="fas fa-history text-[11px]"></i>
        </button>
      </template>
    </AppTable>

    <!-- Upload Modal -->
    <dialog class="modal" :class="{ 'modal-open': isUploadModalOpen }">
      <div class="modal-box bg-white max-w-lg p-0 rounded-none shadow-md overflow-hidden">
        <div class="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
          <h3 class="text-[16px] font-bold text-gray-700">Fatura Dosyası Yükle</h3>
          <button type="button" @click="isUploadModalOpen = false" class="text-gray-400 hover:text-black"><i class="fas fa-times"></i></button>
        </div>
        <div class="p-6 space-y-4">
          <div class="space-y-1">
            <label class="text-[13px] font-bold text-gray-500 uppercase tracking-wide">Hizmet Tipi</label>
            <div class="flex gap-4 p-1 bg-gray-100 rounded-lg">
              <button type="button" @click="uploadType = 'gsm'" 
                :class="uploadType === 'gsm' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'"
                class="flex-1 py-2 text-[12px] font-bold rounded-md transition-all">
                <i class="fas fa-mobile-alt mr-2"></i> GSM (PDF/XML)
              </button>
              <button type="button" @click="uploadType = 'm365'" 
                :class="uploadType === 'm365' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'"
                class="flex-1 py-2 text-[12px] font-bold rounded-md transition-all">
                <i class="fas fa-microsoft mr-2"></i> M365 (Excel)
              </button>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1">
              <label class="text-[13px] font-bold text-gray-500 uppercase">Dönem</label>
              <input v-model="uploadPeriod" type="month"
                class="w-full h-10 px-3 border border-gray-300 rounded outline-none focus:border-[#1a73e8]">
            </div>
            <div v-if="uploadType === 'gsm'" class="space-y-1">
              <label class="text-[13px] font-bold text-gray-500 uppercase tracking-wide">Operatör</label>
              <select v-model="uploadOperator"
                class="w-full h-10 px-3 border border-gray-300 rounded outline-none focus:border-[#1a73e8] bg-white text-[13px] font-bold">
                <option value="Turkcell">Turkcell</option>
                <option value="Vodafone">Vodafone</option>
                <option value="Türk Telekom">Türk Telekom</option>
              </select>
            </div>
          </div>
          <div @click="fileInput.click()"
            class="border-2 border-dashed border-gray-200 rounded p-10 flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50/30 transition-all">
            <input type="file" ref="fileInput" multiple @change="e => selectedFiles = [...e.target.files]" class="hidden" :accept="uploadType === 'm365' ? '.xlsx,.xls' : '.pdf,.xml'">
            <i class="fas fa-cloud-upload-alt text-3xl text-gray-300 mb-2"></i>
            <span class="text-[13px] font-bold text-gray-600">
              {{ uploadType === 'm365' ? 'M365 Excel dosyasını seçin' : 'PDF veya XML dosyalarını seçin' }}
            </span>
            <div v-if="selectedFiles.length > 0" class="mt-4 text-[12px] font-bold text-[#1a73e8] bg-blue-50 px-3 py-1 rounded">
              {{ selectedFiles.length }} dosya seçildi
            </div>
          </div>
        </div>
        <div class="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
          <button type="button" @click="isUploadModalOpen = false"
            class="px-4 py-2 text-[13px] font-bold text-gray-500 hover:text-black uppercase">İptal</button>
          <button type="button" @click="uploadInvoices"
            :disabled="selectedFiles.length === 0 || uploading"
            class="px-6 py-2 bg-[#1a73e8] text-white rounded text-[13px] font-bold hover:bg-blue-700 disabled:opacity-50">
            Yüklemeyi Başlat
          </button>
        </div>
      </div>
    </dialog>

    <!-- History Modal -->
    <dialog class="modal" :class="{ 'modal-open': isHistoryModalOpen }">
      <div class="modal-box bg-white max-w-xl p-0 rounded-none shadow-md overflow-hidden border border-gray-200">
        <div class="px-6 py-4 bg-[#f8f9fa] border-b border-[#dadce0] flex justify-between items-center">
          <h3 class="text-[16px] font-bold text-gray-700">
            Maliyet Geçmişi <span class="font-mono ml-2 text-gray-400">{{ historyData?.phone_no }}</span>
          </h3>
          <button type="button" @click="isHistoryModalOpen = false" class="text-gray-400 hover:text-black"><i class="fas fa-times"></i></button>
        </div>
        <div class="p-6 max-h-[500px] overflow-y-auto divide-y divide-gray-100">
          <div v-for="h in historyData?.history" :key="h.period + h.source_file"
            class="py-3 flex justify-between items-center group">
            <div class="flex flex-col">
              <span class="text-[12px] font-bold text-gray-400 uppercase">{{ h.period }}</span>
              <span class="text-[14px] font-bold text-gray-700 group-hover:text-blue-600 transition-colors">{{ h.tariff || 'Tanımsız Tarife' }}</span>
            </div>
            <span class="text-[15px] font-bold text-gray-900">{{ h.total_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }} ₺</span>
          </div>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop" @click="isHistoryModalOpen = false"><button>close</button></form>
    </dialog>
  </div>
</template>
