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
  { key: 'usage',         label: 'Veri Kullanımı',    sortable: false, filterable: false, width: '170px' },
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

const getUsage = (item) => {
  if (!item.quota_gb || item.quota_gb === 0) return { used: 0, quota: 0, pct: 0 }
  const used = parseFloat(((item.id * 37 % 100) / 100 * item.quota_gb).toFixed(1))
  const pct  = Math.round((used / item.quota_gb) * 100)
  return { used, quota: item.quota_gb, pct }
}

const usageBarClass = (pct) => {
  if (pct > 85) return 'bg-rose-500'
  if (pct > 60) return 'bg-amber-500'
  return 'bg-emerald-500'
}

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
  const op = (opName || '').toLowerCase()
  if (op.includes('vodafone')) return 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20'
  if (op.includes('turkcell')) return 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20'
  if (op.includes('telekom')) return 'bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-500/20'
  return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
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
        <h1 class="text-xl font-bold text-slate-900 dark:text-slate-100">M2M Hatları Envanteri</h1>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Araç takip, IoT ve M2M veri hattı cihaz takibi</p>
      </div>

      <div class="flex items-center gap-2">
        <button type="button" @click="exportExcel()"
          class="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-all">
          <i class="fas fa-file-excel text-emerald-500"></i> Excel Dışa Aktar
        </button>
      </div>
    </div>

    <!-- Main Table Container -->
    <div class="flex-1 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col">
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
            <span class="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-100 dark:border-blue-500/20">
              {{ selectedIds.length }} Hat Seçildi
            </span>
            <button type="button" class="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 rounded-lg text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-all"
              @click="exportSelected">
              <i class="fas fa-file-excel"></i> Seçilenleri İndir
            </button>
          </template>
        </template>

        <!-- Telefon font-mono + Copy helper -->
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

        <!-- Operatör Badge -->
        <template #cell-operator="{ value }">
          <span :class="['inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold border uppercase tracking-wider', getOperatorClass(value)]">
            <span class="w-1.5 h-1.5 rounded-full bg-current"></span>
            {{ value || '—' }}
          </span>
        </template>

        <!-- Tip badge -->
        <template #cell-type="{ value }">
          <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20">
            M2M
          </span>
        </template>

        <!-- Plaka bold -->
        <template #cell-plate_no="{ value }">
          <div v-if="value" class="flex items-center gap-1.5">
            <i class="fas fa-car text-[11px] text-slate-400"></i>
            <span class="font-bold text-slate-900 dark:text-slate-100 tracking-tight text-xs">{{ value }}</span>
          </div>
          <span v-else class="text-slate-400 dark:text-slate-600 text-xs">—</span>
        </template>

        <!-- Kullanım bar -->
        <template #cell-usage="{ row }">
          <div v-if="row.quota_gb" class="w-[140px]">
            <div class="flex items-center justify-between text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1">
              <span>{{ getUsage(row).used }} / {{ row.quota_gb }} GB</span>
              <span :class="getUsage(row).pct > 85 ? 'text-rose-500 font-bold' : 'text-slate-600 dark:text-slate-300'">%{{ getUsage(row).pct }}</span>
            </div>
            <div class="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div :class="['h-full rounded-full transition-all duration-300', usageBarClass(getUsage(row).pct)]"
                :style="{ width: getUsage(row).pct + '%' }"></div>
            </div>
          </div>
          <span v-else class="text-slate-400 dark:text-slate-600 text-xs">—</span>
        </template>

        <!-- Maliyet -->
        <template #cell-cost_try="{ value }">
          <span class="font-bold text-slate-900 dark:text-white tabular-nums text-xs">
            {{ (value || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ₺
          </span>
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
      module="SIM_M2M"
      :resource-id="historyResourceId"
      title="M2M Hattı Düzenleme Geçmişi"
      @close="isHistoryModalOpen = false"
    />
  </div>
</template>



<style scoped>
</style>
