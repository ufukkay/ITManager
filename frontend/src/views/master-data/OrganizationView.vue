<script setup>
import { ref, computed, onMounted } from 'vue'
import { useMasterDataStore } from '../../stores/masterData'
import AppTable from '../../components/AppTable.vue'

const masterData = useMasterDataStore()
const activeTab  = ref('companies')
const loading    = ref(false)

const fetchData = async () => {
  loading.value = true
  await Promise.all([
    masterData.fetchCompanies(),
    masterData.fetchDepartments(),
    masterData.fetchCostCenters(),
  ])
  loading.value = false
}

// ── Kolon & satır tanımları ───────────────────────────────────────────────────
const companyColumns = [
  { key: 'name',       label: 'Şirket Adı',     sortable: true },
  { key: 'tax_number', label: 'Vergi Numarası',  sortable: true, width: '200px' },
]

const departmentColumns = [
  { key: 'name',         label: 'Departman',    sortable: true },
  { key: 'company_name', label: 'Bağlı Şirket', sortable: true, width: '220px' },
]

const costCenterColumns = [
  { key: 'code',         label: 'Kod',       sortable: true, width: '120px' },
  { key: 'name',         label: 'Açıklama',  sortable: true },
  { key: 'company_name', label: 'Şirket',    sortable: true, width: '220px' },
]

// Şirket adını join eden computed satırlar
const departmentRows = computed(() =>
  masterData.departments.map(d => ({
    ...d,
    company_name: masterData.companies.find(c => c.id === d.company_id)?.name || '—',
  }))
)

const costCenterRows = computed(() =>
  masterData.costCenters.map(cc => ({
    ...cc,
    company_name: masterData.companies.find(c => c.id === cc.company_id)?.name || '—',
  }))
)

const activeColumns = computed(() => ({
  companies:    companyColumns,
  departments:  departmentColumns,
  'cost-centers': costCenterColumns,
}[activeTab.value]))

const activeRows = computed(() => ({
  companies:    masterData.companies,
  departments:  departmentRows.value,
  'cost-centers': costCenterRows.value,
}[activeTab.value]))

// ── Modal ─────────────────────────────────────────────────────────────────────
const showModal   = ref(false)
const editingItem = ref(null)
const formData    = ref({ name: '', code: '', tax_number: '', company_id: null })

const modalTitle = computed(() => {
  if (editingItem.value) return 'Düzenle'
  return { companies: 'Şirket Ekle', departments: 'Departman Ekle', 'cost-centers': 'Masraf Yeri Ekle' }[activeTab.value]
})

const openModal = (item = null) => {
  editingItem.value = item
  formData.value = item
    ? { name: item.name || '', code: item.code || '', tax_number: item.tax_number || '', company_id: item.company_id || null }
    : { name: '', code: '', tax_number: '', company_id: null }
  showModal.value = true
}

const submitForm = async () => {
  try {
    if (editingItem.value)
      await masterData.updateItem(activeTab.value, editingItem.value.id, formData.value)
    else
      await masterData.createItem(activeTab.value, formData.value)
    showModal.value = false
  } catch (e) { alert('Hata: ' + e.message) }
}

const handleDelete = async (row) => {
  if (!confirm('Bu kaydı silmek istediğinizden emin misiniz?')) return
  try { await masterData.deleteItem(activeTab.value, row.id) }
  catch (e) { alert('Hata: ' + e.message) }
}

onMounted(fetchData)
</script>

<template>
  <div class="h-full flex flex-col gap-4 p-6">
    <!-- Başlık -->
    <div class="flex items-center justify-between shrink-0">
      <div>
        <h1 class="text-xl font-semibold text-gray-800">Organizasyon Yönetimi</h1>
        <p class="text-sm text-gray-500 mt-0.5">Şirket, departman ve maliyet merkezlerini buradan yönetin</p>
      </div>
    </div>

    <!-- Sekmeler -->
    <div class="flex gap-2 p-1 bg-gray-100 rounded-2xl w-fit shrink-0 mb-2">
      <button
        v-for="tab in [
          { key: 'companies',    label: 'Şirketler',     icon: 'fa-building' },
          { key: 'departments',  label: 'Departmanlar',  icon: 'fa-sitemap'  },
          { key: 'cost-centers', label: 'Masraf Yerleri', icon: 'fa-tag'      },
        ]"
        :key="tab.key"
        type="button"
        class="flex items-center gap-2 px-6 py-2.5 text-[13px] font-bold rounded-xl transition-all"
        :class="activeTab === tab.key
          ? 'bg-white text-blue-600 shadow-md shadow-blue-500/5'
          : 'text-gray-500 hover:text-gray-900'"
        @click="activeTab = tab.key"
      >
        <i :class="['fas', tab.icon, 'text-[12px]', activeTab === tab.key ? 'text-blue-500' : 'text-gray-400']"></i>
        {{ tab.label }}
      </button>
    </div>

    <!-- AppTable -->
    <AppTable
      :key="activeTab"
      :columns="activeColumns"
      :rows="activeRows"
      :loading="loading"
      empty-text="Kayıt bulunamadı"
      @row-edit="openModal"
      @row-delete="handleDelete"
    >
      <template #toolbar>
        <button
          type="button"
          class="ml-auto flex items-center gap-2 px-4 py-2 bg-[#1a73e8] text-white text-[12.5px] font-semibold rounded-lg hover:bg-[#174ea6] shadow-sm"
          @click="openModal()"
        >
          <i class="fas fa-plus text-[11px]"></i> Ekle
        </button>
      </template>

      <!-- Masraf yeri kod badge -->
      <template #cell-code="{ value }">
        <span class="font-bold text-[#1a73e8] text-[12px]">{{ value || '—' }}</span>
      </template>
    </AppTable>

    <!-- Modal -->
    <div v-if="showModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
      <div class="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div class="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 class="text-[15px] font-bold text-gray-900">{{ modalTitle }}</h2>
          <button type="button" class="text-gray-400 hover:text-gray-600" @click="showModal = false">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="p-6 space-y-4">
          <div v-if="activeTab === 'companies'" class="space-y-1.5">
            <label class="text-[12px] font-bold text-gray-500">Vergi Numarası</label>
            <input v-model="formData.tax_number" type="text"
              class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-[#1a73e8]">
          </div>
          <div v-if="activeTab === 'cost-centers'" class="space-y-1.5">
            <label class="text-[12px] font-bold text-gray-500">Masraf Yeri Kodu</label>
            <input v-model="formData.code" type="text"
              class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-[#1a73e8]">
          </div>
          <div class="space-y-1.5">
            <label class="text-[12px] font-bold text-gray-500">İsim / Açıklama</label>
            <input v-model="formData.name" type="text"
              class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-[#1a73e8]">
          </div>
          <div v-if="activeTab !== 'companies'" class="space-y-1.5">
            <label class="text-[12px] font-bold text-gray-500">Şirket</label>
            <select v-model="formData.company_id"
              class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-[#1a73e8]">
              <option :value="null">Seçiniz…</option>
              <option v-for="c in masterData.companies" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>
        </div>
        <div class="p-6 bg-gray-50 flex justify-end gap-3">
          <button type="button" class="px-4 py-2 text-[13px] font-medium text-gray-600 hover:text-gray-900"
            @click="showModal = false">İptal</button>
          <button type="button"
            class="bg-[#1a73e8] text-white px-5 py-2 rounded-lg text-[13px] font-bold hover:bg-[#174ea6] shadow-sm"
            @click="submitForm">Kaydet</button>
        </div>
      </div>
    </div>
  </div>
</template>
