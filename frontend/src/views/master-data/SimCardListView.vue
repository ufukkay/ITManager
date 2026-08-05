<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useSimApi } from '../../composables/useSimApi'
import { useMasterDataStore } from '../../stores/masterData'
import { useToast } from '../../composables/useToast'
import { useConfirm } from '../../composables/useConfirm'
import AppTable from '../../components/AppTable.vue'
import HistoryModal from '../../components/HistoryModal.vue'
import * as XLSX from 'xlsx'

const masterData = useMasterDataStore()
const { showToast } = useToast()
const { ask, startLoading, stopLoading } = useConfirm()

const activeTab = ref('voice') // voice, data, m2m
const loading = ref(false)

// Use separate API instances for each tab to ensure stable reactivity
const apiInstances = {
  voice: useSimApi('voice'),
  data: useSimApi('data'),
  m2m: useSimApi('m2m')
}

const fetchData = async () => {
  loading.value = true
  try {
    const currentApi = apiInstances[activeTab.value]
    await Promise.all([
      currentApi.fetchList(),
      masterData.fetchOperators()
    ])
  } finally {
    loading.value = false
  }
}

// Watch for tab changes to fetch data
watch(activeTab, () => {
  fetchData()
})

const columns = computed(() => {
  const base = [
    { key: 'phone_no',       label: 'Telefon No', sortable: true, width: '160px' },
    { key: 'iccid',          label: 'ICCID',      sortable: true, width: '220px' },
    { key: 'operator',       label: 'Operatör',   sortable: true, width: '140px' },
  ]

  if (activeTab.value === 'voice') {
    return [
      ...base,
      { key: 'personnel_name', label: 'Personel',   sortable: true, width: '160px' },
      { key: 'status',         label: 'Durum',      sortable: true, width: '130px' },
    ]
  }

  if (activeTab.value === 'data') {
    return [
      ...base,
      { key: 'location_name',  label: 'Lokasyon',   sortable: true, width: '160px' },
      { key: 'status',         label: 'Durum',      sortable: true, width: '130px' },
    ]
  }

  if (activeTab.value === 'm2m') {
    return [
      ...base,
      { key: 'plate_no',       label: 'Plaka',      sortable: true, width: '140px' },
      { key: 'status',         label: 'Durum',      sortable: true, width: '130px' },
    ]
  }

  return base
})

const currentApi = computed(() => apiInstances[activeTab.value])
const rows = computed(() => currentApi.value.dataList.value)
const quickFilters = computed(() => [
  { key: 'operator', label: 'Operatör', options: masterData.operators.map(o => o.name) },
  { key: 'status',   label: 'Durum',    options: ['Aktif', 'Pasif', 'İptal'] }
])

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
      await currentApi.value.deleteItem(row.id)
      showToast('Kayıt başarıyla silindi', 'success')
    } catch (e) {
      showToast('Hata: ' + e.message, 'error')
    } finally {
      stopLoading()
    }
  }
}

const exportToExcel = () => {
  const data = rows.value.map(r => ({
    'Telefon No': r.phone_no,
    'ICCID': r.iccid,
    'Operatör': r.operator,
    'Durum': r.status,
    'Eklenme Tarihi': new Date(r.created_at).toLocaleDateString('tr-TR')
  }))
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, activeTab.value.toUpperCase())
  XLSX.writeFile(wb, `SIM_Kartlar_${activeTab.value}.xlsx`)
}

onMounted(fetchData)
</script>

<template>
  <div class="h-full flex flex-col p-6 overflow-hidden bg-white dark:bg-slate-900">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6 shrink-0">
      <div>
        <h1 class="text-[20px] font-bold text-gray-900 dark:text-slate-100 tracking-tight">SIM Kart Havuzu</h1>
        <p class="text-[13px] text-gray-400 dark:text-slate-500 mt-1">Tüm SIM kartları ve hatları merkezi olarak yönetin</p>
      </div>
      <div class="flex items-center gap-3">
        <span class="text-[11px] text-gray-400 dark:text-slate-500 italic">Ekleme/düzenleme için Envanter → Varlık Listesi'ni kullanın</span>
        <button @click="exportToExcel" class="flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-xl text-[12px] font-bold text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-all">
          <i class="fas fa-file-export text-gray-400 dark:text-slate-500"></i> Dışa Aktar
        </button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1.5 p-1.5 bg-gray-100 dark:bg-slate-800 rounded-2xl w-fit mb-6 border border-gray-200/50 dark:border-slate-700 shrink-0">
      <button
        v-for="tab in [
          { key: 'voice', label: 'Ses Hattı', icon: 'fa-phone' },
          { key: 'data',  label: 'Data Hattı', icon: 'fa-wifi'  },
          { key: 'm2m',   label: 'M2M / Araç', icon: 'fa-car'   },
        ]"
        :key="tab.key"
        @click="activeTab = tab.key"
        class="flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-[13px] font-bold transition-all duration-200"
        :class="activeTab === tab.key
          ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm ring-1 ring-black/[0.05] dark:ring-white/[0.05]'
          : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 hover:bg-gray-200/50 dark:hover:bg-slate-700/50'"
      >
        <i :class="['fas', tab.icon, 'text-[12px]', activeTab === tab.key ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-slate-500']"></i>
        {{ tab.label }}
      </button>
    </div>

    <!-- Table Section -->
    <div class="flex-1 min-h-0 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
      <AppTable
        :key="activeTab"
        :columns="columns"
        :rows="rows"
        :loading="loading"
        :quick-filters="quickFilters"
        empty-text="Bu kategoride henüz SIM kart kaydı bulunmuyor."
      >
        <template #actions="{ row }">
          <div class="at-row-actions">
            <button type="button" class="at-row-btn" title="Geçmişi Göster" @click="openHistory(row)"><i class="fas fa-clock-rotate-left"></i></button>
          </div>
        </template>

        <!-- Cell Templates -->
        <template #cell-phone_no="{ value }">
          <span class="font-bold text-gray-900 dark:text-slate-100">{{ value || '—' }}</span>
        </template>

        <template #cell-iccid="{ value }">
          <span class="font-mono text-[12px] text-gray-500 dark:text-slate-400">{{ value || '—' }}</span>
        </template>

        <template #cell-operator="{ value }">
          <span class="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-slate-300 border border-gray-100 dark:border-slate-600 uppercase tracking-tight">
            {{ value || '—' }}
          </span>
        </template>

        <template #cell-status="{ value }">
          <div class="flex items-center gap-2">
            <span v-if="value === 'Aktif' || value === 'active'" class="flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              AKTİF
            </span>
            <span v-else class="flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-gray-50 dark:bg-slate-700 text-gray-400 dark:text-slate-500 border border-gray-100 dark:border-slate-600">
              <span class="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-slate-500"></span>
              {{ value?.toUpperCase() || '—' }}
            </span>
          </div>
        </template>
      </AppTable>
    </div>

    <!-- History Modal -->
    <HistoryModal
      v-if="isHistoryModalOpen"
      :module="'SIM_' + activeTab.toUpperCase()"
      :resource-id="historyResourceId"
      :title="activeTab.toUpperCase() + ' Hattı Düzenleme Geçmişi'"
      @close="isHistoryModalOpen = false"
    />
  </div>
</template>

<style scoped>
.min-h-0 { min-height: 0; }
</style>
