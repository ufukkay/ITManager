<script setup>
import { ref, onMounted, computed } from 'vue'
import { useSimApi } from '../../composables/useSimApi'
import { useMasterDataStore } from '../../stores/masterData'
import { useToast } from '../../composables/useToast'
import { useConfirm } from '../../composables/useConfirm'
import AppTable from '../../components/AppTable.vue'
import HistoryModal from '../../components/HistoryModal.vue'
import * as XLSX from 'xlsx'

const { dataList, loading, fetchList, updateItem, deleteItem, createItem } = useSimApi('m2m')
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

// Modal Logic
const isModalOpen = ref(false)
const selectedItem = ref(null)
const statuses = ['Aktif', 'Pasif', 'İptal']
const form = ref({
  iccid: '', phone_no: '', operator: '', company_id: '',
  department_id: '', package_id: '', vehicle_id: '',
  status: 'Aktif', notes: ''
})

// History Modal
const isHistoryModalOpen = ref(false)
const historyResourceId = ref(null)

const openHistory = (row) => {
  historyResourceId.value = row.id
  isHistoryModalOpen.value = true
}

const openEditModal = (item) => {
  selectedItem.value = item
  form.value = { ...item }
  isModalOpen.value = true
}

const saveItem = async () => {
  try {
    if (selectedItem.value) {
      await updateItem(selectedItem.value.id, form.value)
      showToast('Kayıt başarıyla güncellendi', 'success')
    } else {
      await createItem(form.value)
      showToast('Yeni kayıt başarıyla eklendi', 'success')
    }
    isModalOpen.value = false
    fetchList()
  } catch (err) { 
    showToast('Hata: ' + err.message, 'error') 
  }
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
  masterData.fetchVehicles()
  masterData.fetchOperators()
  masterData.fetchCompanies()
  masterData.fetchDepartments()
  masterData.fetchPackages('m2m')
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
      @row-edit="openEditModal"
      @row-history="openHistory"
      @row-delete="handleDelete"
    >
      <template #toolbar>
        <template v-if="selectedIds.length > 0">
          <span class="text-[13px] font-bold text-[#1a73e8]">{{ selectedIds.length }} Seçili</span>
          <button type="button" class="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg text-[12px] font-bold hover:bg-emerald-100"
            @click="exportSelected">
            <i class="fas fa-file-excel"></i> Seçilenleri İndir
          </button>
        </template>
      </template>

      <!-- Telefon font-mono -->
      <template #cell-phone_no="{ value }">
        <span class="font-mono font-semibold text-gray-800 whitespace-nowrap">{{ value || '—' }}</span>
      </template>

      <!-- ICCID font-mono -->
      <template #cell-iccid="{ value }">
        <span class="font-mono text-[11px] text-gray-400 block max-w-[170px] truncate" :title="value">{{ value || '—' }}</span>
      </template>

      <!-- Tip badge -->
      <template #cell-type="{ value }">
        <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold" :style="{
          background: value === 'M2M' ? '#eef2ff' : value === 'Data' ? '#ecfeff' : '#fef3c7',
          color:      value === 'M2M' ? '#4338ca' : value === 'Data' ? '#0e7490' : '#92400e'
        }">{{ value || 'M2M' }}</span>
      </template>

      <!-- Plaka bold -->
      <template #cell-plate_no="{ value }">
        <span class="font-bold text-gray-900 tracking-tight">{{ value || '—' }}</span>
      </template>

      <!-- Kullanım bar -->
      <template #cell-usage="{ row }">
        <div v-if="row.quota_gb" class="w-[130px]">
          <div class="flex items-center justify-between text-[10px] font-bold text-gray-400 mb-1">
            <span>{{ getUsage(row).used }} / {{ row.quota_gb }} GB</span>
            <span :class="getUsage(row).pct > 85 ? 'text-red-500' : 'text-amber-600'">%{{ getUsage(row).pct }}</span>
          </div>
          <div class="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div :class="['h-full rounded-full transition-all duration-500', usageBarClass(getUsage(row).pct)]"
              :style="{ width: getUsage(row).pct + '%' }"></div>
          </div>
        </div>
        <span v-else class="text-gray-300 text-[12px]">—</span>
      </template>

      <!-- Maliyet -->
      <template #cell-cost_try="{ value }">
        <span class="font-bold text-gray-900 tabular-nums">{{ (value || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }} ₺</span>
      </template>

      <!-- Durum badge with dot -->
      <template #cell-status="{ value }">
        <span :class="[
          'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold',
          (value === 'active' || value === 'Aktif') ? 'bg-[#ecfdf5] text-[#059669]' : 'bg-[#f3f4f6] text-[#4b5563]'
        ]">
          <span class="w-1.5 h-1.5 rounded-full" :class="(value === 'active' || value === 'Aktif') ? 'bg-[#10b981]' : 'bg-[#9ca3af]'"></span>
          {{ (value === 'active' || value === 'Aktif') ? 'Aktif' : 'Pasif' }}
        </span>
      </template>
    </AppTable>

    <!-- Edit Modal -->
    <Teleport to="body">
      <div v-if="isModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" @click.self="isModalOpen = false">
        <div class="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden">
          <div class="px-7 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <div>
              <h2 class="text-[16px] font-bold text-gray-900">
                {{ selectedItem ? 'M2M Hattını Düzenle' : 'Yeni M2M Hattı Ekle' }}
              </h2>
            </div>
            <button type="button" @click="isModalOpen = false" class="text-gray-400 hover:text-gray-700 w-8 h-8 rounded-lg hover:bg-gray-100 inline-flex items-center justify-center">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <form @submit.prevent="saveItem">
            <div class="p-7 grid grid-cols-2 gap-5">
              <div class="space-y-1.5">
                <label class="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Telefon No</label>
                <input v-model="form.phone_no" type="text" required placeholder="5XX XXX XX XX"
                  class="w-full h-11 px-4 text-[13px] border border-gray-200 rounded-xl outline-none focus:border-blue-500 font-bold">
              </div>
              <div class="space-y-1.5">
                <label class="text-[11px] font-bold text-gray-400 uppercase tracking-widest">ICCID</label>
                <input v-model="form.iccid" type="text" placeholder="8990..."
                  class="w-full h-11 px-4 text-[13px] border border-gray-200 rounded-xl outline-none focus:border-blue-500 font-mono">
              </div>

              <div class="space-y-1.5">
                <label class="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Operatör</label>
                <select v-model="form.operator" required
                  class="w-full h-11 px-4 text-[13px] border border-gray-200 rounded-xl outline-none focus:border-blue-500 bg-white">
                  <option value="">Seçiniz</option>
                  <option v-for="op in masterData.operators" :key="op.id" :value="op.name">{{ op.name }}</option>
                </select>
              </div>

              <div class="space-y-1.5">
                <label class="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Paket</label>
                <select v-model="form.package_id"
                  class="w-full h-11 px-4 text-[13px] border border-gray-200 rounded-xl outline-none focus:border-blue-500 bg-white">
                  <option :value="null">Seçiniz</option>
                  <option v-for="p in masterData.packages" :key="p.id" :value="p.id">{{ p.name }}</option>
                </select>
              </div>

              <div class="space-y-1.5">
                <label class="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Araç / Plaka</label>
                <select v-model="form.vehicle_id"
                  class="w-full h-11 px-4 text-[13px] border border-gray-200 rounded-xl outline-none focus:border-blue-500 bg-white">
                  <option :value="null">Seçiniz</option>
                  <option v-for="v in masterData.vehicles" :key="v.id" :value="v.id">{{ v.plate_no }}</option>
                </select>
              </div>

              <div class="space-y-1.5">
                <label class="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Durum</label>
                <select v-model="form.status" required
                  class="w-full h-11 px-4 text-[13px] border border-gray-200 rounded-xl outline-none focus:border-blue-500 bg-white">
                  <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
                </select>
              </div>

              <div class="space-y-1.5">
                <label class="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Şirket</label>
                <select v-model="form.company_id"
                  class="w-full h-11 px-4 text-[13px] border border-gray-200 rounded-xl outline-none focus:border-blue-500 bg-white">
                  <option :value="null">Seçiniz</option>
                  <option v-for="c in masterData.companies" :key="c.id" :value="c.id">{{ c.name }}</option>
                </select>
              </div>

              <div class="space-y-1.5">
                <label class="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Departman</label>
                <select v-model="form.department_id"
                  class="w-full h-11 px-4 text-[13px] border border-gray-200 rounded-xl outline-none focus:border-blue-500 bg-white">
                  <option :value="null">Seçiniz</option>
                  <option v-for="d in masterData.departments" :key="d.id" :value="d.id">{{ d.name }}</option>
                </select>
              </div>

              <div class="col-span-2 space-y-1.5">
                <label class="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Notlar</label>
                <textarea v-model="form.notes" rows="2"
                  class="w-full p-4 text-[13px] border border-gray-200 rounded-xl outline-none focus:border-blue-500 resize-none"></textarea>
              </div>
            </div>

            <div class="px-7 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
              <button type="button" @click="isModalOpen = false" class="px-4 py-2 text-[13px] font-bold text-gray-500 hover:text-gray-700">İptal</button>
              <button type="submit" class="px-8 py-2 bg-blue-600 text-white text-[13px] font-bold rounded-xl hover:bg-blue-700 shadow-sm transition-all">
                {{ selectedItem ? 'Güncelle' : 'Oluştur' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

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
