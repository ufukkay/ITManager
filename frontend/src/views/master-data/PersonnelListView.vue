<script setup>
import { ref, onMounted, computed } from 'vue'
import { useMasterDataStore } from '../../stores/masterData'
import AppTable from '../../components/AppTable.vue'
import * as XLSX from 'xlsx'

const masterData = useMasterDataStore()
const loading         = ref(false)
const showModal       = ref(false)
const editingPersonnel = ref(null)

const fetchData = async () => {
  loading.value = true
  await Promise.all([
    masterData.fetchPersonnel(),
    masterData.fetchCompanies(),
    masterData.fetchDepartments(),
    masterData.fetchCostCenters()
  ])
  loading.value = false
}

const columns = [
  { key: 'full_name',        label: 'Ad Soyad',    sortable: true },
  { key: 'company_name',     label: 'Şirket',      sortable: true, width: '180px' },
  { key: 'department_name',  label: 'Departman',   sortable: true, width: '180px' },
  { key: 'cost_center_name', label: 'Masraf Yeri', sortable: true, width: '160px' },
]

const quickFilters = [
  { key: 'company_name', label: 'Şirket' },
]

const personnelRows = computed(() =>
  masterData.personnel.map(p => ({
    ...p,
    full_name: `${p.first_name} ${p.last_name}`,
  }))
)

const openEditModal = (p) => {
  editingPersonnel.value = { ...p }
  showModal.value = true
}

const savePersonnel = async () => {
  try {
    if (editingPersonnel.value.id)
      await masterData.updatePersonnel(editingPersonnel.value.id, editingPersonnel.value)
    else
      await masterData.createPersonnel(editingPersonnel.value)
    showModal.value = false
  } catch (e) { alert('Hata: ' + e.message) }
}

const handleDelete = async (row) => {
  if (!confirm('Bu personeli silmek istediğinize emin misiniz?')) return
  try { await masterData.deletePersonnel(row.id) }
  catch (e) { alert('Hata: ' + e.message) }
}

const downloadTemplate = () => {
  const ws = XLSX.utils.json_to_sheet([
    { 'Ad': 'Ahmet', 'Soyad': 'Yılmaz', 'E-posta': 'ahmet@example.com', 'Şirket': 'Örnek Şirket A.Ş.', 'Departman': 'Bilgi Teknolojileri', 'Masraf Yeri': 'IT-001' }
  ])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Personel_Sablon')
  XLSX.writeFile(wb, 'Personel_Iceri_Aktarma_Sablonu.xlsx')
}

const handleExcelImport = (e) => {
  const file = e.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = async (evt) => {
    try {
      loading.value = true
      const data = evt.target.result
      const workbook = XLSX.read(data, { type: 'binary' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(sheet)
      
      let successCount = 0
      for (const row of rows) {
        const company = masterData.companies.find(c => c.name.toLowerCase() === (row['Şirket'] || '').trim().toLowerCase())
        const company_id = company ? company.id : null

        const dept = masterData.departments.find(d => d.name.toLowerCase() === (row['Departman'] || '').trim().toLowerCase() && d.company_id === company_id)
        const department_id = dept ? dept.id : null

        const cc = masterData.costCenters.find(c => c.name.toLowerCase() === (row['Masraf Yeri'] || '').trim().toLowerCase() && c.company_id === company_id)
        const cost_center_id = cc ? cc.id : null

        const payload = {
          first_name: String(row['Ad'] || '').trim(),
          last_name: String(row['Soyad'] || '').trim(),
          email: String(row['E-posta'] || '').trim(),
          company_id,
          department_id,
          cost_center_id
        }

        if (payload.first_name && payload.last_name) {
          try {
            await masterData.createPersonnel(payload)
            successCount++
          } catch (err) { console.error('Personel eklenemedi:', err) }
        }
      }
      alert(`${successCount} personel başarıyla aktarıldı.`)
      await fetchData()
    } catch (err) {
      alert('Excel işlenirken hata oluştu.')
    } finally {
      loading.value = false
      e.target.value = ''
    }
  }
  reader.readAsBinaryString(file)
}

onMounted(fetchData)
</script>

<template>
  <div class="h-full flex flex-col gap-4 p-6">
    <!-- Başlık -->
    <div class="flex items-center justify-between shrink-0">
      <div>
        <h1 class="text-xl font-semibold text-gray-800">Ortak Personel Listesi</h1>
        <p class="text-sm text-gray-500 mt-0.5">Tüm şirketlerin ortak personel ve maliyet merkezi havuzu</p>
      </div>
    </div>

    <!-- AppTable -->
    <AppTable
      :columns="columns"
      :rows="personnelRows"
      :loading="loading"
      :quick-filters="quickFilters"
      empty-text="Personel kaydı bulunamadı"
      @row-edit="openEditModal"
      @row-delete="handleDelete"
    >
      <template #toolbar>
        <div class="flex items-center gap-2">
          <button type="button" @click="downloadTemplate" 
            class="px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-[12px] font-semibold hover:bg-gray-50 flex items-center gap-1.5 transition-all">
            <i class="fas fa-download text-gray-400"></i> Örnek Şablon
          </button>
          <label class="cursor-pointer px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg text-[12px] font-bold hover:bg-emerald-100 flex items-center gap-1.5 transition-colors">
            <i class="fas fa-file-excel"></i> Excel'den Yükle
            <input type="file" @change="handleExcelImport" class="hidden" accept=".xlsx,.xls">
          </label>
        </div>
        <button type="button"
          class="ml-auto flex items-center gap-2 px-4 py-2 bg-[#1a73e8] text-white text-[12.5px] font-semibold rounded-lg hover:bg-[#174ea6] shadow-sm"
          @click="openEditModal({})">
          <i class="fas fa-plus text-[11px]"></i> Yeni Personel
        </button>
      </template>

      <!-- Avatar + isim + email -->
      <template #cell-full_name="{ row, value }">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-[11px] shrink-0">
            {{ row.first_name?.[0] }}{{ row.last_name?.[0] }}
          </div>
          <div>
            <div class="text-[13px] font-semibold text-gray-900">{{ value }}</div>
            <div class="text-[11px] text-gray-400">{{ row.email || 'E-posta yok' }}</div>
          </div>
        </div>
      </template>

      <!-- Masraf yeri badge -->
      <template #cell-cost_center_name="{ value }">
        <span v-if="value && value !== '—'"
          class="px-2.5 py-1 bg-green-50 text-green-600 rounded-md text-[11px] font-semibold border border-green-100">
          {{ value }}
        </span>
        <span v-else class="text-[11px] text-gray-300">Belirtilmemiş</span>
      </template>
    </AppTable>

    <!-- Edit Modal -->
    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
      <div class="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div class="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 class="text-[16px] font-bold text-gray-900">{{ editingPersonnel.id ? 'Personel Düzenle' : 'Yeni Personel' }}</h2>
          <button type="button" @click="showModal = false" class="text-gray-400 hover:text-gray-600">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="p-6 space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="text-[12px] font-bold text-gray-500">Ad</label>
              <input v-model="editingPersonnel.first_name" type="text"
                class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-[#1a73e8]">
            </div>
            <div class="space-y-1.5">
              <label class="text-[12px] font-bold text-gray-500">Soyad</label>
              <input v-model="editingPersonnel.last_name" type="text"
                class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-[#1a73e8]">
            </div>
          </div>
          <div class="space-y-1.5">
            <label class="text-[12px] font-bold text-gray-500">E-posta</label>
            <input v-model="editingPersonnel.email" type="email"
              class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-[#1a73e8]">
          </div>
          <div class="space-y-1.5">
            <label class="text-[12px] font-bold text-gray-500">Şirket</label>
            <select v-model="editingPersonnel.company_id"
              class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-[#1a73e8]">
              <option :value="null">Seçiniz...</option>
              <option v-for="c in masterData.companies" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>
          <div v-if="editingPersonnel.company_id" class="space-y-1.5">
            <label class="text-[12px] font-bold text-gray-500">Masraf Yeri</label>
            <select v-model="editingPersonnel.cost_center_id"
              class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-[#1a73e8]">
              <option :value="null">Seçiniz...</option>
              <option v-for="cc in masterData.costCenters.filter(x => x.company_id === editingPersonnel.company_id)" :key="cc.id" :value="cc.id">
                {{ cc.name }}
              </option>
            </select>
          </div>
        </div>
        <div class="p-6 bg-gray-50 flex justify-end gap-3">
          <button type="button" @click="showModal = false"
            class="px-4 py-2 text-[13px] font-medium text-gray-600 hover:text-gray-900">İptal</button>
          <button type="button" @click="savePersonnel"
            class="bg-[#1a73e8] text-white px-5 py-2 rounded-lg text-[13px] font-bold hover:bg-[#174ea6] shadow-sm">Kaydet</button>
        </div>
      </div>
    </div>
  </div>
</template>
