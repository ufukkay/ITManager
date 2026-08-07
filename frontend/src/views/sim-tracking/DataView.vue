<script setup>
import { ref, onMounted, computed } from 'vue'
import { useSimApi } from '../../composables/useSimApi'
import { useMasterDataStore } from '../../stores/masterData'
import { useToast } from '../../composables/useToast'
import AppTable from '../../components/AppTable.vue'
import HistoryModal from '../../components/HistoryModal.vue'
import * as XLSX from 'xlsx'

const { dataList, loading, fetchList } = useSimApi('data')
const masterData = useMasterDataStore()
const { showToast } = useToast()

const columns = [
  { key: 'phone_no',      label: 'Hat / Telefon No', sortable: true, width: '160px' },
  { key: 'iccid',         label: 'ICCID Seri No',    sortable: true, width: '200px' },
  { key: 'operator',      label: 'Operatör',         sortable: true, width: '140px' },
  { key: 'location_name', label: 'Lokasyon / Konum', sortable: true, width: '180px' },
  { key: 'department_name', label: 'Departman',      sortable: true, width: '160px' },
  { key: 'status',        label: 'Durum',            sortable: true, width: '120px' },
]

const quickFilters = computed(() => [
  { key: 'operator',     label: 'Operatör', options: masterData.operators.map(o => o.name) },
  { key: 'company_name', label: 'Şirket',   options: masterData.companies.map(c => c.name) },
  { key: 'status',       label: 'Durum', options: ['Aktif', 'Pasif', 'İptal'] },
])

const selectedIds    = ref([])
const onSelectionChange = (rows) => { selectedIds.value = rows.map(r => r.id) }

const copyToClipboard = (text, label) => {
  if (!text) return
  navigator.clipboard.writeText(text)
  showToast(`${label} kopyalandı`, 'info')
}

const getOperatorClass = (opName) => {
  const op = (opName || '').toLowerCase()
  if (op.includes('vodafone')) return 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20'
  if (op.includes('turkcell')) return 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20'
  if (op.includes('telekom')) return 'bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-500/20'
  return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
}

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

onMounted(() => {
  fetchList()
  masterData.fetchOperators()
  masterData.fetchCompanies()
})
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Main Table Container -->
    <div class="flex-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md overflow-hidden shadow-sm flex flex-col">
      <AppTable
        :columns="columns"
        :rows="dataList"
        :loading="loading"
        :quick-filters="quickFilters"
        :selectable="true"
        empty-text="Kayıtlı Data hattı bulunamadı"
        @selection-change="onSelectionChange"
      >
        <template #actions="{ row }">
          <div class="at-row-actions">
            <button type="button" class="at-row-btn" title="Geçmişi Göster" @click="openHistory(row)"><i class="fas fa-clock-rotate-left"></i></button>
          </div>
        </template>

        <template #toolbar>
          <button type="button" @click="exportExcel()"
            class="flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 rounded text-xs font-medium hover:bg-gray-50 dark:hover:bg-slate-700/60 transition-colors">
            <i class="fas fa-file-excel text-[#34a853]"></i> Excel Dışa Aktar
          </button>
          <template v-if="selectedIds.length > 0">
            <span class="text-xs font-medium text-[#1a73e8] bg-[#e8f0fe] px-2.5 py-1 rounded border border-[#1a73e8]/20">
              {{ selectedIds.length }} Hat Seçildi
            </span>
            <button type="button" class="flex items-center gap-1.5 px-2.5 py-1 bg-[#e6f4ea] text-[#137333] border border-[#34a853]/20 rounded text-xs font-medium hover:bg-green-100 transition-colors"
              @click="exportSelected">
              <i class="fas fa-file-excel"></i> Seçilenleri İndir
            </button>
          </template>
        </template>

        <!-- Telefon font-mono + Copy helper -->
        <template #cell-phone_no="{ value }">
          <div class="group/cell flex items-center gap-1.5">
            <span class="font-mono font-medium text-gray-900 dark:text-slate-100 text-xs tracking-tight whitespace-nowrap">{{ value || '—' }}</span>
            <button v-if="value" type="button" @click="copyToClipboard(value, 'Telefon numarası')" title="Kopyala" class="opacity-0 group-hover/cell:opacity-100 text-[10px] text-gray-400 hover:text-[#1a73e8] transition-colors">
              <i class="fas fa-copy"></i>
            </button>
          </div>
        </template>

        <!-- ICCID font-mono -->
        <template #cell-iccid="{ value }">
          <div class="group/cell flex items-center gap-1.5">
            <span class="font-mono text-[11px] text-gray-500 dark:text-slate-400 block max-w-[170px] truncate" :title="value">{{ value || '—' }}</span>
            <button v-if="value" type="button" @click="copyToClipboard(value, 'ICCID')" title="Kopyala" class="opacity-0 group-hover/cell:opacity-100 text-[10px] text-gray-400 hover:text-[#1a73e8] transition-colors">
              <i class="fas fa-copy"></i>
            </button>
          </div>
        </template>

        <!-- Operatör badge -->
        <template #cell-operator="{ value }">
          <span :class="['inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border uppercase tracking-wide', getOperatorClass(value)]">
            <span class="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
            {{ value || '—' }}
          </span>
        </template>

        <!-- Lokasyon badge -->
        <template #cell-location_name="{ value }">
          <div v-if="value" class="flex items-center gap-1.5">
            <i class="fas fa-location-dot text-[11px] text-gray-400"></i>
            <span class="font-medium text-gray-900 dark:text-slate-100 text-xs">{{ value }}</span>
          </div>
          <span v-else class="text-gray-400 text-xs">—</span>
        </template>

        <!-- Durum badge -->
        <template #cell-status="{ value }">
          <span :class="[
            'inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium tracking-wide uppercase',
            (value === 'active' || value === 'Aktif')
              ? 'bg-[#e6f4ea] text-[#137333] border border-[#34a853]/20'
              : 'bg-[#f1f3f4] text-[#5f6368] border border-[#dadce0]'
          ]">
            <span class="w-1.5 h-1.5 rounded-full" :class="(value === 'active' || value === 'Aktif') ? 'bg-[#34a853]' : 'bg-[#9aa0a6]'"></span>
            {{ (value === 'active' || value === 'Aktif') ? 'Aktif' : 'Pasif' }}
          </span>
        </template>
      </AppTable>
    </div>

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

