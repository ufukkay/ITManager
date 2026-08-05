<script setup>
import { ref, onMounted, computed } from 'vue'
import { useSimApi } from '../../composables/useSimApi'
import { useMasterDataStore } from '../../stores/masterData'
import { useToast } from '../../composables/useToast'
import { useConfirm } from '../../composables/useConfirm'
import AppTable from '../../components/AppTable.vue'
import HistoryModal from '../../components/HistoryModal.vue'
import * as XLSX from 'xlsx'

const { dataList, loading, fetchList, deleteItem } = useSimApi('m2m')
const masterData = useMasterDataStore()
const { showToast } = useToast()
const { ask, startLoading, stopLoading } = useConfirm()

const columns = [
  { key: 'phone_no',      label: 'Telefon',   sortable: true, width: '150px' },
  { key: 'iccid',         label: 'ICCID',     sortable: true, width: '190px' },
  { key: 'operator',      label: 'Operatör',  sortable: true, width: '120px' },
  { key: 'type',          label: 'Tip',       sortable: true, width: '80px' },
  { key: 'package_name',  label: 'Paket',     sortable: true, width: '160px' },
  { key: 'plate_no',      label: 'Plaka',     sortable: true, width: '120px' },
  { key: 'company_name',  label: 'Şirket',    sortable: true, width: '160px' },
  { key: 'usage',         label: 'Kullanım',  sortable: false, filterable: false, width: '160px' },
  { key: 'cost_try',      label: 'Maliyet',   sortable: true,  width: '110px', align: 'right' },
  { key: 'status',        label: 'Durum',     sortable: true,  width: '100px' },
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
  if (pct > 85) return 'bg-red-500'
  if (pct > 60) return 'bg-amber-500'
  return 'bg-emerald-500'
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
      :rows="tableRows"
      :loading="loading"
      :quick-filters="quickFilters"
      :selectable="true"
      empty-text="Kriterlere uygun kayıt bulunamadı"
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

      <!-- Telefon font-mono -->
      <template #cell-phone_no="{ value }">
        <span class="font-mono font-semibold text-gray-800 dark:text-slate-100 whitespace-nowrap">{{ value || '—' }}</span>
      </template>

      <!-- ICCID font-mono -->
      <template #cell-iccid="{ value }">
        <span class="font-mono text-[11px] text-gray-400 dark:text-slate-500 block max-w-[170px] truncate" :title="value">{{ value || '—' }}</span>
      </template>

      <!-- Tip badge -->
      <template #cell-type="{ value }">
        <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold" :class="value === 'M2M' ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400' : value === 'Data' ? 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400' : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400'">{{ value || 'M2M' }}</span>
      </template>

      <!-- Plaka bold -->
      <template #cell-plate_no="{ value }">
        <span class="font-bold text-gray-900 dark:text-slate-100 tracking-tight">{{ value || '—' }}</span>
      </template>

      <!-- Kullanım bar -->
      <template #cell-usage="{ row }">
        <div v-if="row.quota_gb" class="w-[130px]">
          <div class="flex items-center justify-between text-[10px] font-bold text-gray-400 dark:text-slate-500 mb-1">
            <span>{{ getUsage(row).used }} / {{ row.quota_gb }} GB</span>
            <span :class="getUsage(row).pct > 85 ? 'text-red-500 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'">%{{ getUsage(row).pct }}</span>
          </div>
          <div class="h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div :class="['h-full rounded-full transition-all duration-500', usageBarClass(getUsage(row).pct)]"
              :style="{ width: getUsage(row).pct + '%' }"></div>
          </div>
        </div>
        <span v-else class="text-gray-300 dark:text-slate-600 text-[12px]">—</span>
      </template>

      <!-- Maliyet -->
      <template #cell-cost_try="{ value }">
        <span class="font-bold text-gray-900 dark:text-slate-100 tabular-nums">{{ (value || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }} ₺</span>
      </template>

      <!-- Durum badge with dot -->
      <template #cell-status="{ value }">
        <span :class="[
          'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold',
          (value === 'active' || value === 'Aktif') ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300'
        ]">
          <span class="w-1.5 h-1.5 rounded-full" :class="(value === 'active' || value === 'Aktif') ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-gray-400 dark:bg-slate-500'"></span>
          {{ (value === 'active' || value === 'Aktif') ? 'Aktif' : 'Pasif' }}
        </span>
      </template>
    </AppTable>

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
