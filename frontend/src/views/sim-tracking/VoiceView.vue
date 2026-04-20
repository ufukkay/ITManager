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

const { dataList, loading, fetchList, createItem, updateItem, deleteItem } = useSimApi('voice')
const masterData = useMasterDataStore()
const { showToast } = useToast()
const { ask, startLoading, stopLoading } = useConfirm()

const columns = [
  { key: 'phone_no',       label: 'Telefon No', sortable: true, width: '160px' },
  { key: 'iccid',          label: 'ICCID',      sortable: true, width: '220px' },
  { key: 'operator',       label: 'Operatör',   sortable: true, width: '140px' },
  { key: 'personnel_name', label: 'Personel',   sortable: true, width: '160px' },
  { key: 'status',         label: 'Durum',      sortable: true, width: '130px' },
]

const quickFilters = computed(() => [
  { key: 'operator',       label: 'Operatör',   options: masterData.operators.map(o => o.name) },
  { key: 'personnel_name', label: 'Personel',   options: masterData.personnel.map(p => p.first_name + ' ' + p.last_name) },
  { key: 'status',         label: 'Durum', options: ['Aktif', 'Pasif', 'İptal'] },
])

const selectedIds       = ref([])
const onSelectionChange = (rows) => { selectedIds.value = rows.map(r => r.id) }

const isModalOpen  = ref(false)
const selectedItem = ref(null)
const statuses     = ['Aktif', 'Pasif', 'İptal']
const form         = ref({
  iccid: '', phone_no: '', operator: '', company_id: '',
  department_id: '', package_id: '', personnel_id: '',
  status: 'Aktif', description: ''
})

const openAddModal = () => {
  selectedItem.value = null
  form.value = { iccid: '', phone_no: '', operator: '', company_id: '', department_id: '', package_id: '', personnel_id: '', status: 'Aktif', description: '' }
  isModalOpen.value = true
}

const openEditModal = (item) => {
  selectedItem.value = item
  form.value = { ...item }
  isModalOpen.value = true
}

const exportSelected = () => {
  const selected = dataList.value.filter(r => selectedIds.value.includes(r.id))
  const rows = selected.map(r => ({
    Telefon: r.phone_no, ICCID: r.iccid, Operatör: r.operator,
    Personel: r.personnel_name, Durum: r.status
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Voice')
  XLSX.writeFile(wb, 'ses-secili-kayitlar.xlsx')
}

const saveItem = async () => {
  try {
    if (selectedItem.value) {
      await updateItem(selectedItem.value.id, form.value)
      showToast('Ses hattı başarıyla güncellendi', 'success')
    } else {
      await createItem(form.value)
      showToast('Yeni ses hattı başarıyla eklendi', 'success')
    }
    isModalOpen.value = false
  } catch (err) { showToast('Hata: ' + err.message, 'error') }
}

const handleDelete = async (row) => {
  const confirmed = await ask({
    title: 'Hattı Sil',
    message: `"${row.phone_no || row.iccid}" numaralı ses hattını silmek istediğinize emin misiniz?`,
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
  masterData.fetchOperators()
  masterData.fetchPersonnel()
  masterData.fetchCompanies()
  masterData.fetchDepartments()
  masterData.fetchPackages('voice')
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
      empty-text="Kayıtlı ses hattı bulunamadı"
      @row-edit="openEditModal"
      @row-delete="handleDelete"
      @selection-change="onSelectionChange"
    >
      <template #toolbar>
        <template v-if="selectedIds.length > 0">
          <span class="text-[13px] font-bold text-[#1a73e8]">{{ selectedIds.length }} Kayıt Seçildi</span>
          <button type="button" class="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-md text-[12px] font-bold hover:bg-blue-100">
            <i class="fas fa-edit"></i> Toplu Düzenle
          </button>
          <button type="button" class="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-md text-[12px] font-bold hover:bg-emerald-100"
            @click="exportSelected">
            <i class="fas fa-file-excel"></i> Seçilenleri İndir
          </button>
          <button type="button" class="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 border border-red-100 rounded-md text-[12px] font-bold hover:bg-red-100">
            <i class="fas fa-trash"></i> Toplu Sil
          </button>
        </template>
      </template>

      <!-- Telefon -->
      <template #cell-phone_no="{ value }">
        <span class="font-medium text-gray-800 whitespace-nowrap">{{ value || '—' }}</span>
      </template>

      <!-- ICCID font-mono -->
      <template #cell-iccid="{ value }">
        <span class="font-mono text-[12px] text-gray-500">{{ value || '—' }}</span>
      </template>

      <!-- Operatör badge -->
      <template #cell-operator="{ value }">
        <span v-if="value === 'Turkcell'" class="px-2 py-0.5 rounded text-[12px] font-bold bg-[#e0f2fe] text-[#0284c7]">Turkcell</span>
        <span v-else-if="value === 'Vodafone'" class="px-2 py-0.5 rounded text-[12px] font-bold bg-[#fee2e2] text-[#e11d48]">Vodafone</span>
        <span v-else class="px-2 py-0.5 rounded text-[12px] font-bold bg-gray-100 text-gray-600">{{ value || '—' }}</span>
      </template>

      <!-- Durum badge -->
      <template #cell-status="{ value }">
        <span v-if="value === 'Aktif'" class="px-2 py-0.5 rounded text-[12px] font-bold uppercase bg-[#e6f4ea] text-[#1e8e3e]">Aktif</span>
        <span v-else-if="value === 'İptal'" class="px-2 py-0.5 rounded text-[12px] font-bold uppercase bg-[#feebe9] text-[#d93025]">İptal</span>
        <span v-else class="px-2 py-0.5 rounded text-[12px] font-bold uppercase bg-gray-100 text-gray-600">{{ value || '—' }}</span>
      </template>
    </AppTable>

    <!-- Modal -->
    <dialog class="modal" :class="{ 'modal-open': isModalOpen }">
      <div class="modal-box bg-white p-6 rounded-lg shadow-md border border-gray-100 max-w-xl">
        <div class="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
          <h3 class="font-bold text-[15px] text-gray-900">{{ selectedItem ? 'Ses Hattı Düzenle' : 'Yeni Ses Hattı Ekle' }}</h3>
          <button type="button" @click="isModalOpen = false" class="text-gray-400 hover:text-gray-600"><i class="fas fa-times"></i></button>
        </div>
        <form @submit.prevent="saveItem" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-1.5">
              <label class="text-[12px] font-bold text-gray-500">Telefon No</label>
              <input v-model="form.phone_no" type="text" required
                class="w-full border border-gray-200 text-[13px] px-3 py-2 rounded-md outline-none focus:border-[#1a73e8]">
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-[12px] font-bold text-gray-500">ICCID</label>
              <input v-model="form.iccid" type="text"
                class="w-full border border-gray-200 text-[13px] px-3 py-2 rounded-md outline-none focus:border-[#1a73e8]">
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-[12px] font-bold text-gray-500">Operatör</label>
              <select v-model="form.operator" required
                class="w-full border border-gray-200 text-[13px] px-3 py-2 rounded-md outline-none focus:border-[#1a73e8]">
                <option value="">Seçiniz</option>
                <option v-for="op in masterData.operators" :key="op.id" :value="op.name">{{ op.name }}</option>
              </select>
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-[12px] font-bold text-gray-500">Personel</label>
              <select v-model="form.personnel_id"
                class="w-full border border-gray-200 text-[13px] px-3 py-2 rounded-md outline-none focus:border-[#1a73e8]">
                <option value="">Seçiniz</option>
                <option v-for="p in masterData.personnel" :key="p.id" :value="p.id">{{ p.first_name + ' ' + p.last_name }}</option>
              </select>
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-[12px] font-bold text-gray-500">Departman</label>
              <select v-model="form.department_id"
                class="w-full border border-gray-200 text-[13px] px-3 py-2 rounded-md outline-none focus:border-[#1a73e8]">
                <option value="">Seçiniz</option>
                <option v-for="d in masterData.departments" :key="d.id" :value="d.id">{{ d.name }}</option>
              </select>
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-[12px] font-bold text-gray-500">Şirket</label>
              <select v-model="form.company_id"
                class="w-full border border-gray-200 text-[13px] px-3 py-2 rounded-md outline-none focus:border-[#1a73e8]">
                <option value="">Seçiniz</option>
                <option v-for="c in masterData.companies" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-[12px] font-bold text-gray-500">Paket</label>
              <select v-model="form.package_id"
                class="w-full border border-gray-200 text-[13px] px-3 py-2 rounded-md outline-none focus:border-[#1a73e8]">
                <option value="">Seçiniz</option>
                <option v-for="p in masterData.packages" :key="p.id" :value="p.id">{{ p.name }}</option>
              </select>
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-[12px] font-bold text-gray-500">Durum</label>
              <select v-model="form.status" required
                class="w-full border border-gray-200 text-[13px] px-3 py-2 rounded-md outline-none focus:border-[#1a73e8]">
                <option v-for="st in statuses" :key="st" :value="st">{{ st }}</option>
              </select>
            </div>
          </div>
          <div class="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-100">
            <button type="button" @click="isModalOpen = false"
              class="px-6 py-2 text-[13px] font-bold text-gray-500 hover:text-gray-900">İPTAL</button>
            <button type="submit"
              class="px-8 py-2 bg-[#1a73e8] text-white text-[13px] font-bold rounded-md hover:bg-[#174ea6] shadow-sm">KAYDET</button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop" @click="isModalOpen = false"><button>close</button></form>
    </dialog>
  </div>
</template>
