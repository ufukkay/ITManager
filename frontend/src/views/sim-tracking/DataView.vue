<script setup>
import { ref, onMounted, computed } from 'vue'
import { useSimApi } from '../../composables/useSimApi'
import { useMasterDataStore } from '../../stores/masterData'
import { useToast } from '../../composables/useToast'
import { useConfirm } from '../../composables/useConfirm'
import AppTable from '../../components/AppTable.vue'
import HistoryModal from '../../components/HistoryModal.vue'
import * as XLSX from 'xlsx'

const { dataList, loading, fetchList, deleteItem } = useSimApi('data')
const masterData = useMasterDataStore()
const { showToast } = useToast()
const { ask, startLoading, stopLoading } = useConfirm()

const columns = [
  { key: 'iccid',         label: 'ICCID',        sortable: true, width: '220px' },
  { key: 'phone_no',      label: 'Telefon No',    sortable: true, width: '160px' },
  { key: 'operator',      label: 'Operatör',      sortable: true, width: '140px' },
  { key: 'location_name', label: 'Lokasyon',      sortable: true, width: '180px' },
  { key: 'department_name', label: 'Departman',   sortable: true, width: '160px' },
  { key: 'status',        label: 'Durum',         sortable: true, width: '130px' },
]

const quickFilters = computed(() => [
  { key: 'operator',     label: 'Operatör', options: masterData.operators.map(o => o.name) },
  { key: 'company_name', label: 'Şirket',   options: masterData.companies.map(c => c.name) },
  { key: 'status',       label: 'Durum', options: ['Aktif', 'Pasif', 'İptal'] },
])

const selectedIds    = ref([])
const onSelectionChange = (rows) => { selectedIds.value = rows.map(r => r.id) }

const exportExcel = (customRows = null) => {
  const list = customRows || dataList.value
  const rows = list.map(r => ({
    'ICCID': r.iccid,
    'Telefon No': r.phone_no,
    'Operatör': r.operator,
    'Lokasyon': r.location_name || '',
    'Şirket': r.company_name || '',
    'Departman': r.department_name || '',
    'Durum': r.status,
    'Notlar': r.notes || ''
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Data')
  XLSX.writeFile(wb, customRows ? 'data-secili-kayitlar.xlsx' : 'data-listesi.xlsx')
}

const exportSelected = () => {
  const selected = dataList.value.filter(r => selectedIds.value.includes(r.id))
  exportExcel(selected)
}

// History Modal
const isHistoryModalOpen = ref(false)
const historyResourceId = ref(null)

const openHistory = (row) => {
  historyResourceId.value = row.id
  isHistoryModalOpen.value = true
}

const handleDelete = async (row) => {
  const confirmed = await ask({
    title: 'Kaydı Sil',
    message: `"${row.phone_no || row.iccid}" numaralı SIM kartı silmek istediğinize emin misiniz?`,
    confirmLabel: 'Evet, Sil'
  })
  if (confirmed) {
    try {
      startLoading()
      await deleteItem(row.id)
      showToast('Kayıt başarıyla silindi', 'success')
    } catch (e) {
      showToast('Hata: ' + e.message, 'error')
    } finally {
      stopLoading()
    }
  }
}

onMounted(() => {
  fetchList()
  masterData.fetchOperators()
  masterData.fetchCompanies()
})
</script>

<template>
  <div class="h-full flex flex-col gap-4">
    <AppTable
      :columns="columns"
      :rows="dataList"
      :loading="loading"
      :quick-filters="quickFilters"
      :selectable="true"
      empty-text="Kayıtlı veri bulunamadı"
      @selection-change="onSelectionChange"
    >
      <template #actions="{ row }">
        <div class="at-row-actions">
          <button type="button" class="at-row-btn" title="Geçmişi Göster" @click="openHistory(row)"><i class="fas fa-clock-rotate-left"></i></button>
          <button type="button" class="at-row-btn at-row-btn-del" title="Sil" @click="handleDelete(row)"><i class="fas fa-trash"></i></button>
        </div>
      </template>

      <template #toolbar>
        <template v-if="selectedIds.length > 0">
          <span class="text-[13px] font-bold text-[#1a73e8] dark:text-blue-400">{{ selectedIds.length }} Seçili</span>
          <button type="button" class="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20 rounded-lg text-[12px] font-bold hover:bg-emerald-100 dark:hover:bg-emerald-500/20"
            @click="exportSelected">
            <i class="fas fa-file-excel"></i> Seçilenleri İndir
          </button>
        </template>
        <div class="ml-auto flex items-center gap-3">
          <span class="text-[11px] text-gray-400 dark:text-slate-500 italic">Ekleme/düzenleme için Envanter → Varlık Listesi'ni kullanın</span>
          <button type="button" @click="exportExcel()"
            class="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 rounded-lg text-[12px] font-semibold hover:bg-gray-50 dark:hover:bg-slate-700">
            <i class="fas fa-file-excel text-emerald-500 dark:text-emerald-400"></i> Excel Dışa Aktar
          </button>
        </div>
      </template>

      <!-- ICCID font-mono -->
      <template #cell-iccid="{ value }">
        <span class="font-mono text-[12px] text-gray-500 dark:text-slate-400">{{ value || '—' }}</span>
      </template>

      <!-- Telefon -->
      <template #cell-phone_no="{ value }">
        <span class="font-medium text-gray-800 dark:text-slate-100 whitespace-nowrap">{{ value || '—' }}</span>
      </template>

      <!-- Operatör badge -->
      <template #cell-operator="{ value }">
        <span v-if="value === 'Turkcell'" class="px-2 py-0.5 rounded text-[12px] font-bold bg-[#e8f0fe] dark:bg-blue-500/10 text-[#1a73e8] dark:text-blue-400">Turkcell</span>
        <span v-else-if="value === 'Vodafone'" class="px-2 py-0.5 rounded text-[12px] font-bold bg-[#fce8e6] dark:bg-red-500/10 text-[#c5221f] dark:text-red-400">Vodafone</span>
        <span v-else class="px-2 py-0.5 rounded text-[12px] font-bold bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300">{{ value || '—' }}</span>
      </template>

      <!-- Durum badge -->
      <template #cell-status="{ value }">
        <span v-if="value === 'Aktif'" class="px-2 py-0.5 rounded text-[12px] font-bold uppercase bg-[#e6f4ea] dark:bg-emerald-500/10 text-[#1e8e3e] dark:text-emerald-400">Aktif</span>
        <span v-else-if="value === 'İptal'" class="px-2 py-0.5 rounded text-[12px] font-bold uppercase bg-[#feebe9] dark:bg-red-500/10 text-[#d93025] dark:text-red-400">İptal</span>
        <span v-else class="px-2 py-0.5 rounded text-[12px] font-bold uppercase bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300">{{ value || '—' }}</span>
      </template>
    </AppTable>

    <!-- History Modal -->
    <HistoryModal
      v-if="isHistoryModalOpen"
      module="SIM_DATA"
      :resource-id="historyResourceId"
      title="Data Hattı Düzenleme Geçmişi"
      @close="isHistoryModalOpen = false"
    />
  </div>
</template>

<style scoped>
</style>
