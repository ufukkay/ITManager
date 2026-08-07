<script setup>
import { ref, onMounted, computed } from 'vue'
import { useSimApi } from '../../composables/useSimApi'
import { useMasterDataStore } from '../../stores/masterData'
import { useToast } from '../../composables/useToast'
import AppTable from '../../components/AppTable.vue'
import HistoryModal from '../../components/HistoryModal.vue'
import * as XLSX from 'xlsx'

const { dataList, loading, fetchList } = useSimApi('m2m')
const masterData = useMasterDataStore()
const { showToast } = useToast()

const columns = [
  { key: 'phone_no',      label: 'Telefon / Hat No',   sortable: true, width: '160px' },
  { key: 'iccid',         label: 'ICCID Seri No',     sortable: true, width: '200px' },
  { key: 'operator',      label: 'Operatör',          sortable: true, width: '130px' },
  { key: 'type',          label: 'Hat Tipi',          sortable: true, width: '90px' },
  { key: 'package_name',  label: 'Tarife / Paket',    sortable: true, width: '160px' },
  { key: 'plate_no',      label: 'Plaka / Araç',      sortable: true, width: '130px' },
  { key: 'company_name',  label: 'Şirket',            sortable: true, width: '160px' },
  { key: 'usage',         label: 'Paket Limiti',      sortable: false, filterable: false, width: '170px' },
  { key: 'cost_try',      label: 'Maliyet',           sortable: true,  width: '120px', align: 'right' },
  { key: 'status',        label: 'Durum',             sortable: true,  width: '110px' },
]

const quickFilters = computed(() => [
  { key: 'operator',     label: 'Operatör', options: masterData.operators.map(o => o.name) },
  { key: 'company_name',  label: 'Şirket',   options: masterData.companies.map(c => c.name) },
  { key: 'status',       label: 'Durum',    options: ['Aktif', 'Pasif', 'İptal'] },
])

const tableRows  = computed(() => dataList.value)

const selectedIds       = ref([])
const onSelectionChange = (rows) => { selectedIds.value = rows.map(r => r.id) }

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('tr-TR') : null

const copyToClipboard = (text, label) => {
  if (!text) return
  navigator.clipboard.writeText(text)
  showToast(`${label} kopyalandı`, 'info')
}

const exportExcel = (customRows = null) => {
  const target = customRows || dataList.value
  const rows = target.map(r => ({
    Telefon: r.phone_no, ICCID: r.iccid, Operatör: r.operator,
    Durum: r.status, Paket: r.package_name, Plaka: r.plate_no,
    Şirket: r.company_name, 'Maliyet (₺)': r.cost_try || 0
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'M2M')
  XLSX.writeFile(wb, customRows ? `m2m-secili-kayitlar.xlsx` : 'm2m-listesi.xlsx')
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

const getOperatorClass = (opName) => {
  return 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-700'
}

onMounted(() => {
  fetchList()
  masterData.fetchOperators()
  masterData.fetchCompanies()
})
</script>

<template>
  <div class="h-full flex flex-col gap-4">
    <!-- View Header Banner -->
    <div class="flex items-center justify-between shrink-0 px-1 pt-1">
      <div>
        <h1 class="text-base font-bold text-gray-900 dark:text-slate-100">M2M Hatları Envanteri</h1>
        <p class="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Araç takip, IoT ve M2M veri hattı cihaz takibi</p>
      </div>

      <div class="flex items-center gap-2">
        <button type="button" @click="exportExcel()"
          class="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 rounded-md text-xs font-medium hover:bg-gray-50 dark:hover:bg-slate-700/60 transition-colors">
          <i class="fas fa-file-excel text-[#34a853]"></i> Excel Dışa Aktar
        </button>
      </div>
    </div>

    <!-- Main Table Container -->
    <div class="flex-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md overflow-hidden shadow-sm flex flex-col">
      <AppTable
        :columns="columns"
        :rows="tableRows"
        :loading="loading"
        :quick-filters="quickFilters"
        :selectable="true"
        empty-text="Kriterlere uygun M2M hattı bulunamadı"
        @selection-change="onSelectionChange"
      >
        <template #actions="{ row }">
          <div class="at-row-actions">
            <button type="button" class="at-row-btn" title="Geçmişi Göster" @click="openHistory(row)"><i class="fas fa-clock-rotate-left"></i></button>
          </div>
        </template>

        <template #toolbar>
          <template v-if="selectedIds.length > 0">
            <span class="text-xs font-medium text-[#1a73e8] bg-[#e8f0fe] px-2.5 py-1 rounded border border-[#1a73e8]/20">
              {{ selectedIds.length }} Hat Seçildi
            </span>
            <button type="button" class="flex items-center gap-1.5 px-3 py-1.5 bg-[#e6f4ea] text-[#137333] border border-[#34a853]/20 rounded text-xs font-medium hover:bg-green-100 transition-colors"
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

        <!-- Operatör Badge -->
        <template #cell-operator="{ value }">
          <span :class="['inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border uppercase tracking-wide', getOperatorClass(value)]">
            <span class="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
            {{ value || '—' }}
          </span>
        </template>

        <!-- Tip badge -->
        <template #cell-type="{ value }">
          <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-[#e8f0fe] text-[#1a73e8] border border-[#1a73e8]/20">
            M2M
          </span>
        </template>

        <!-- Plaka bold -->
        <template #cell-plate_no="{ value }">
          <div v-if="value" class="flex items-center gap-1.5">
            <i class="fas fa-car text-[11px] text-gray-400"></i>
            <span class="font-medium text-gray-900 dark:text-slate-100 text-xs">{{ value }}</span>
          </div>
          <span v-else class="text-gray-400 text-xs">—</span>
        </template>

        <!-- Paket limiti -->
        <template #cell-usage="{ row }">
          <div v-if="row.quota_gb" class="text-[11px] text-gray-700 dark:text-slate-300">
            <div class="font-medium">{{ row.quota_gb }} GB / ay</div>
            <div v-if="fmtDate(row.last_usage_date)" class="text-[10px] text-gray-400 mt-0.5">
              Son kullanım: {{ fmtDate(row.last_usage_date) }}
            </div>
          </div>
          <span v-else class="text-gray-400 text-xs">—</span>
        </template>

        <!-- Maliyet -->
        <template #cell-cost_try="{ value }">
          <span class="font-medium text-gray-900 dark:text-white tabular-nums text-xs">
            {{ (value || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺
          </span>
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
      module="SIM_M2M"
      :resource-id="historyResourceId"
      title="M2M Hattı Düzenleme Geçmişi"
      @close="isHistoryModalOpen = false"
    />
  </div>
</template>



<style scoped>
</style>
