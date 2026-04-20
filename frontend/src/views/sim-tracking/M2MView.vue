<script setup>
import { ref, onMounted, computed } from 'vue'
import { useSimApi } from '../../composables/useSimApi'
import { useMasterDataStore } from '../../stores/masterData'
import { useToast } from '../../composables/useToast'
import { useConfirm } from '../../composables/useConfirm'
import AppTable from '../../components/AppTable.vue'
import * as XLSX from 'xlsx'

const { showToast } = useToast()
const { ask, startLoading, stopLoading } = useConfirm()

const { dataList, loading, fetchList, createItem, updateItem, deleteItem } = useSimApi('m2m')
const masterData = useMasterDataStore()

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
  { key: 'status',       label: 'Durum',    options: [ { value: 'active', label: 'Aktif' }, { value: 'passive', label: 'Pasif' } ] },
])

/* ─── High usage pre-filter ─── */
const tableRows  = computed(() => dataList.value)

/* ─── Selection ─── */
const selectedIds       = ref([])
const onSelectionChange = (rows) => { selectedIds.value = rows.map(r => r.id) }

/* ─── Usage helper ─── */
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


/* ─── Excel export ─── */
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

/* ─── Modal ─── */
const showModal  = ref(false)
const editTarget = ref(null)
const form       = ref({})

const openAdd = () => {
  editTarget.value = null
  form.value = { iccid: '', phone_no: '', operator: '', status: 'active', vehicle_id: null, package_id: null, company_id: null, notes: '' }
  showModal.value = true
}
const openEdit = (item) => {
  editTarget.value = item
  form.value = { ...item }
  showModal.value = true
}
const save = async () => {
  try {
    if (editTarget.value) {
      await updateItem(editTarget.value.id, form.value)
      showToast('Kayıt başarıyla güncellendi', 'success')
    } else {
      await createItem(form.value)
      showToast('Yeni kayıt başarıyla oluşturuldu', 'success')
    }
    showModal.value = false
  } catch (e) { showToast('Hata: ' + e.message, 'error') }
}
const handleDelete = async (row) => {
  const confirmed = await ask({
    title: 'Hattı Sil',
    message: `"${row.phone_no || row.iccid}" numaralı hattı silmek istediğinize emin misiniz?`,
    confirmLabel: 'Evet, Sil'
  })
  if (confirmed) {
    try {
      startLoading()
      await deleteItem(row.id)
      showToast('Hat başarıyla silindi', 'success')
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
  masterData.fetchPackages('m2m')
  masterData.fetchCompanies()
})
</script>

<template>
  <div class="h-full flex flex-col">

    <!-- AppTable -->
    <AppTable
      :columns="columns"
      :rows="tableRows"
      :loading="loading"
      :quick-filters="quickFilters"
      :selectable="true"
      empty-text="Kriterlere uygun kayıt bulunamadı"
      @row-edit="openEdit"
      @row-delete="handleDelete"
      @selection-change="onSelectionChange"
    >
      <template #toolbar>

        <template v-if="selectedIds.length > 0">
          <span class="text-[13px] font-bold text-[#1a73e8]">{{ selectedIds.length }} Seçili</span>
          <button type="button" class="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-lg text-[12px] font-bold hover:bg-blue-100">
            <i class="fas fa-edit"></i> Toplu Düzenle
          </button>
          <button type="button" class="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg text-[12px] font-bold hover:bg-emerald-100"
            @click="exportSelected">
            <i class="fas fa-file-excel"></i> Seçilenleri İndir
          </button>
          <button type="button" class="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 border border-red-100 rounded-lg text-[12px] font-bold hover:bg-red-100">
            <i class="fas fa-trash"></i> Toplu Sil
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

      <!-- Kullanım bar (virtual column) -->
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
          value === 'active' ? 'bg-[#ecfdf5] text-[#059669]' : 'bg-[#f3f4f6] text-[#4b5563]'
        ]">
          <span class="w-1.5 h-1.5 rounded-full" :class="value === 'active' ? 'bg-[#10b981]' : 'bg-[#9ca3af]'"></span>
          {{ value === 'active' ? 'Aktif' : 'Pasif' }}
        </span>
      </template>
    </AppTable>

    <!-- Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" @click.self="showModal = false">
        <div class="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden">
          <div class="px-7 py-5 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 class="text-[17px] font-bold text-gray-900">{{ editTarget ? 'Hattı Düzenle' : 'Yeni M2M Hattı' }}</h2>
              <p class="text-[12px] text-gray-400 mt-0.5">Tüm zorunlu alanları doldurun</p>
            </div>
            <button type="button" @click="showModal = false"
              class="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="p-7 space-y-5 max-h-[70vh] overflow-y-auto">
            <div class="grid grid-cols-2 gap-x-5 gap-y-5">
              <div>
                <label class="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Telefon Numarası</label>
                <input v-model="form.phone_no" type="text" placeholder="5xx xxx xx xx"
                  class="w-full h-10 px-3 text-[13px] border border-gray-200 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
              </div>
              <div>
                <label class="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">ICCID</label>
                <input v-model="form.iccid" type="text" placeholder="8990..."
                  class="w-full h-10 px-3 text-[13px] border border-gray-200 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
              </div>
              <div>
                <label class="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Operatör <span class="text-red-500">*</span></label>
                <select v-model="form.operator"
                  class="w-full h-10 px-3 text-[13px] border border-gray-200 rounded-lg outline-none focus:border-blue-500 bg-white">
                  <option value="" disabled>Seçiniz</option>
                  <option v-for="op in masterData.operators" :key="op.id" :value="op.name">{{ op.name }}</option>
                </select>
              </div>
              <div>
                <label class="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Paket</label>
                <select v-model="form.package_id"
                  class="w-full h-10 px-3 text-[13px] border border-gray-200 rounded-lg outline-none focus:border-blue-500 bg-white">
                  <option :value="null">Seçiniz</option>
                  <option v-for="p in masterData.packages" :key="p.id" :value="p.id">{{ p.name }}</option>
                </select>
              </div>
              <div>
                <label class="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Araç / Plaka <span class="text-red-500">*</span></label>
                <select v-model="form.vehicle_id"
                  class="w-full h-10 px-3 text-[13px] border border-gray-200 rounded-lg outline-none focus:border-blue-500 bg-white">
                  <option :value="null">Seçiniz</option>
                  <option v-for="v in masterData.vehicles" :key="v.id" :value="v.id">{{ v.plate_no }}</option>
                </select>
              </div>
              <div>
                <label class="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Şirket</label>
                <select v-model="form.company_id"
                  class="w-full h-10 px-3 text-[13px] border border-gray-200 rounded-lg outline-none focus:border-blue-500 bg-white">
                  <option :value="null">Seçiniz</option>
                  <option v-for="c in masterData.companies" :key="c.id" :value="c.id">{{ c.name }}</option>
                </select>
              </div>
              <div>
                <label class="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Durum</label>
                <select v-model="form.status"
                  class="w-full h-10 px-3 text-[13px] border border-gray-200 rounded-lg outline-none focus:border-blue-500 bg-white">
                  <option value="active">Aktif</option>
                  <option value="passive">Pasif</option>
                </select>
              </div>
            </div>
            <div>
              <label class="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Notlar</label>
              <textarea v-model="form.notes" rows="3" placeholder="Ek notlar..."
                class="w-full px-3 py-2.5 text-[13px] border border-gray-200 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none"></textarea>
            </div>
          </div>
          <div class="px-7 py-4 border-t border-gray-100 bg-gray-50/40 flex justify-end gap-2">
            <button type="button" @click="showModal = false"
              class="px-5 py-2 text-[13px] font-semibold text-gray-500 hover:text-gray-700">Vazgeç</button>
            <button type="button" @click="save"
              class="px-6 py-2 text-[13px] font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm flex items-center gap-1.5">
              <i class="fas fa-save text-[11px]"></i>
              {{ editTarget ? 'Güncelle' : 'Kaydet' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
