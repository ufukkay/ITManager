<script setup>
import { ref, onMounted, computed } from 'vue'
import { useSimApi } from '../../composables/useSimApi'
import { useMasterDataStore } from '../../stores/masterData'
import { useToast } from '../../composables/useToast'
import AppTable from '../../components/AppTable.vue'
import HistoryModal from '../../components/HistoryModal.vue'
import * as XLSX from 'xlsx'

const { dataList, loading, fetchList } = useSimApi('voice')
const masterData = useMasterDataStore()
const { showToast } = useToast()

const columns = [
  { key: 'phone_no',       label: 'Telefon No', sortable: true, width: '160px' },
  { key: 'iccid',          label: 'ICCID Seri No', sortable: true, width: '200px' },
  { key: 'operator',       label: 'Operatör',   sortable: true, width: '140px' },
  { key: 'personnel_name', label: 'Zimmetli Personel', sortable: true, width: '180px' },
  { key: 'status',         label: 'Durum',      sortable: true, width: '120px' },
]

const quickFilters = computed(() => [
  { key: 'operator',       label: 'Operatör',   options: masterData.operators.map(o => o.name) },
  { key: 'personnel_name', label: 'Personel',   options: masterData.personnel.map(p => p.first_name + ' ' + p.last_name) },
  { key: 'status',         label: 'Durum', options: ['Aktif', 'Pasif', 'İptal'] },
])

const selectedIds       = ref([])
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
    'Telefon No': r.phone_no,
    'ICCID': r.iccid,
    'Operatör': r.operator,
    'Personel': r.personnel_name || '',
    'Şirket': r.company_name || '',
    'Departman': r.department_name || '',
    'Durum': r.status,
    'Notlar': r.notes || ''
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Voice')
  XLSX.writeFile(wb, customRows ? 'ses-secili-kayitlar.xlsx' : 'ses-listesi.xlsx')
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
  masterData.fetchPersonnel()
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
        empty-text="Kayıtlı Ses hattı bulunamadı"
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

        <!-- Telefon -->
        <template #cell-phone_no="{ value }">
          <div class="group/cell flex items-center gap-1.5">
            <span class="font-mono font-semibold text-slate-800 dark:text-slate-100 text-xs tracking-tight whitespace-nowrap">{{ value || '—' }}</span>
            <button v-if="value" type="button" @click="copyToClipboard(value, 'Telefon numarası')" title="Kopyala" class="opacity-0 group-hover/cell:opacity-100 text-[10px] text-slate-400 hover:text-blue-500 transition-all">
              <i class="fas fa-copy"></i>
            </button>
          </div>
        </template>

        <!-- ICCID font-mono -->
        <template #cell-iccid="{ value }">
          <div class="group/cell flex items-center gap-1.5">
            <span class="font-mono text-[11px] font-medium text-slate-500 dark:text-slate-400 block max-w-[170px] truncate" :title="value">{{ value || '—' }}</span>
            <button v-if="value" type="button" @click="copyToClipboard(value, 'ICCID')" title="Kopyala" class="opacity-0 group-hover/cell:opacity-100 text-[10px] text-slate-400 hover:text-blue-500 transition-all">
              <i class="fas fa-copy"></i>
            </button>
          </div>
        </template>

        <!-- Operatör badge -->
        <template #cell-operator="{ value }">
          <span :class="['inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold border uppercase tracking-wider', getOperatorClass(value)]">
            <span class="w-1.5 h-1.5 rounded-full bg-current"></span>
            {{ value || '—' }}
          </span>
        </template>

        <!-- Personel badge -->
        <template #cell-personnel_name="{ value }">
          <div v-if="value" class="flex items-center gap-2">
            <div class="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-[10px] font-black shrink-0">
              {{ value.charAt(0).toUpperCase() }}
            </div>
            <span class="font-bold text-slate-800 dark:text-slate-100 text-xs">{{ value }}</span>
          </div>
          <span v-else class="text-slate-400 dark:text-slate-600 text-xs italic">Zimmetsiz (Stokta)</span>
        </template>

        <!-- Durum badge -->
        <template #cell-status="{ value }">
          <span :class="[
            'inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase',
            (value === 'active' || value === 'Aktif')
              ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
          ]">
            <span class="w-1.5 h-1.5 rounded-full" :class="(value === 'active' || value === 'Aktif') ? 'bg-emerald-500' : 'bg-slate-400'"></span>
            {{ (value === 'active' || value === 'Aktif') ? 'Aktif' : 'Pasif' }}
          </span>
        </template>
      </AppTable>
    </div>

    <!-- History Modal -->
    <HistoryModal
      v-if="isHistoryModalOpen"
      module="SIM_VOICE"
      :resource-id="historyResourceId"
      title="Ses Hattı Düzenleme Geçmişi"
      @close="isHistoryModalOpen = false"
    />
  </div>
</template>

<style scoped>
</style>


