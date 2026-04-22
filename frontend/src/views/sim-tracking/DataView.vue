<script setup>
import { ref, onMounted, computed } from 'vue'
import { useSimApi } from '../../composables/useSimApi'
import { useMasterDataStore } from '../../stores/masterData'
import { useToast } from '../../composables/useToast'
import { useConfirm } from '../../composables/useConfirm'
import AppTable from '../../components/AppTable.vue'
import HistoryModal from '../../components/HistoryModal.vue'
import * as XLSX from 'xlsx'

const { dataList, loading, fetchList, updateItem, deleteItem, createItem } = useSimApi('data')
const masterData = useMasterDataStore()
const { showToast } = useToast()
const { ask, startLoading, stopLoading } = useConfirm()

const columns = [
  { key: 'iccid',         label: 'ICCID',        sortable: true, width: '220px' },
  { key: 'phone_no',      label: 'Telefon No',    sortable: true, width: '160px' },
  { key: 'operator',      label: 'Operatör',      sortable: true, width: '140px' },
  { key: 'location_name', label: 'Lokasyon',      sortable: true, width: '180px' },
  { key: 'device_info',   label: 'Cihaz Bilgisi', sortable: true, nowrap: false },
  { key: 'status',        label: 'Durum',         sortable: true, width: '130px' },
]

const quickFilters = computed(() => [
  { key: 'operator',     label: 'Operatör', options: masterData.operators.map(o => o.name) },
  { key: 'company_name', label: 'Şirket',   options: masterData.companies.map(c => c.name) },
  { key: 'status',       label: 'Durum', options: ['Aktif', 'Pasif', 'İptal'] },
])

const selectedIds    = ref([])
const onSelectionChange = (rows) => { selectedIds.value = rows.map(r => r.id) }

const exportSelected = () => {
  const selected = dataList.value.filter(r => selectedIds.value.includes(r.id))
  const rows = selected.map(r => ({
    ICCID: r.iccid, Telefon: r.phone_no, Operatör: r.operator,
    Lokasyon: r.location_name, Cihaz: r.device_info, Durum: r.status
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Data')
  XLSX.writeFile(wb, 'data-secili-kayitlar.xlsx')
}

// Modal Logic
const isModalOpen = ref(false)
const selectedItem = ref(null)
const statuses = ['Aktif', 'Pasif', 'İptal']
const form = ref({
  iccid: '', phone_no: '', operator: '', company_id: '',
  department_id: '', package_id: '', location_id: '',
  device_info: '', status: 'Aktif', notes: ''
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
  masterData.fetchLocations()
  masterData.fetchOperators()
  masterData.fetchCompanies()
  masterData.fetchDepartments()
  masterData.fetchPackages('data')
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
      @row-edit="openEditModal"
      @row-history="openHistory"
      @row-delete="handleDelete"
    >
      <template #toolbar>
        <template v-if="selectedIds.length > 0">
          <span class="text-[13px] font-bold text-[#1a73e8]">{{ selectedIds.length }} Kayıt Seçildi</span>
          <button type="button" class="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-md text-[12px] font-bold hover:bg-emerald-100"
            @click="exportSelected">
            <i class="fas fa-file-excel"></i> Seçilenleri İndir
          </button>
        </template>
      </template>

      <!-- ICCID font-mono -->
      <template #cell-iccid="{ value }">
        <span class="font-mono text-[12px] text-gray-500">{{ value || '—' }}</span>
      </template>

      <!-- Telefon -->
      <template #cell-phone_no="{ value }">
        <span class="font-medium text-gray-800 whitespace-nowrap">{{ value || '—' }}</span>
      </template>

      <!-- Operatör badge -->
      <template #cell-operator="{ value }">
        <span v-if="value === 'Turkcell'" class="px-2 py-0.5 rounded text-[12px] font-bold bg-[#e8f0fe] text-[#1a73e8]">Turkcell</span>
        <span v-else-if="value === 'Vodafone'" class="px-2 py-0.5 rounded text-[12px] font-bold bg-[#fce8e6] text-[#c5221f]">Vodafone</span>
        <span v-else class="px-2 py-0.5 rounded text-[12px] font-bold bg-gray-100 text-gray-600">{{ value || '—' }}</span>
      </template>

      <!-- Durum badge -->
      <template #cell-status="{ value }">
        <span v-if="value === 'Aktif'" class="px-2 py-0.5 rounded text-[12px] font-bold uppercase bg-[#e6f4ea] text-[#1e8e3e]">Aktif</span>
        <span v-else-if="value === 'İptal'" class="px-2 py-0.5 rounded text-[12px] font-bold uppercase bg-[#feebe9] text-[#d93025]">İptal</span>
        <span v-else class="px-2 py-0.5 rounded text-[12px] font-bold uppercase bg-gray-100 text-gray-600">{{ value || '—' }}</span>
      </template>
    </AppTable>

    <!-- Edit Modal -->
    <Teleport to="body">
      <div v-if="isModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" @click.self="isModalOpen = false">
        <div class="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden">
          <div class="px-7 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <div>
              <h2 class="text-[16px] font-bold text-gray-900">
                {{ selectedItem ? 'Data Hattını Düzenle' : 'Yeni Data Hattı Ekle' }}
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
                <label class="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Lokasyon</label>
                <select v-model="form.location_id"
                  class="w-full h-11 px-4 text-[13px] border border-gray-200 rounded-xl outline-none focus:border-blue-500 bg-white">
                  <option :value="null">Seçiniz</option>
                  <option v-for="l in masterData.locations" :key="l.id" :value="l.id">{{ l.name }}</option>
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
      module="SIM_DATA"
      :resource-id="historyResourceId"
      title="Data Hattı Düzenleme Geçmişi"
      @close="isHistoryModalOpen = false"
    />
  </div>
</template>

<style scoped>
</style>
