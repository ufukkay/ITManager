<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import AppTable from '../../components/AppTable.vue'
import { useMasterDataStore } from '../../stores/masterData'
import * as XLSX from 'xlsx'

const masterData = useMasterDataStore()
const loading = ref(false)
const rawData = ref({ companies: [], licenses: [], allocations: [] })

/* --- Table Config --- */
const columns = [
  { key: 'personnel_name', label: 'Personel',      sortable: true, width: '220px' },
  { key: 'company_name',   label: 'Şirket',        sortable: true, width: '180px' },
  { key: 'license_name',   label: 'Lisans Tipi',   sortable: true, width: '220px' },
  { key: 'period',         label: 'Dönem',         sortable: true, width: '110px' },
  { key: 'cost',           label: 'Maliyet',       sortable: true, width: '130px', align: 'right' },
  { key: 'status',         label: 'Durum',         sortable: true, width: '110px' },
]

const quickFilters = computed(() => [
  { key: 'company_name', label: 'Şirket', options: masterData.companies.map(c => c.name) },
  { key: 'license_name', label: 'Lisans', options: masterData.licenses.filter(l => l.name.toLowerCase().includes('microsoft') || l.name.toLowerCase().includes('m365')).map(l => l.name) }
])

/* --- Selection --- */
const selectedIds = ref([])
const onSelectionChange = (rows) => { selectedIds.value = rows.map(r => r.id) }
const exportSelected = () => {
    const selected = tableRows.value.filter(r => selectedIds.value.includes(r.id))
    const rows = selected.map(r => ({
        'Personel': r.personnel_name,
        'Şirket': r.company_name,
        'Lisans': r.license_name,
        'Dönem': r.period,
        'Maliyet': `${r.cost} ${r.currency}`
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'SeciliM365Atamalar')
    XLSX.writeFile(wb, 'secili-m365-atamalari.xlsx')
}

/* --- Data Processing --- */
const tableRows = computed(() => {
  const flattened = []
  rawData.value.allocations.forEach(alloc => {
    const license = rawData.value.licenses.find(l => l.id === alloc.licenseId)
    // Filter for M365 ONLY
    if (!license || (!license.name.toLowerCase().includes('microsoft') && !license.name.toLowerCase().includes('m365'))) return

    const company = rawData.value.companies.find(c => c.id === alloc.companyId)
    
    if (alloc.users && Array.isArray(alloc.users)) {
      alloc.users.forEach(user => {
        flattened.push({
          id: `${alloc.id}-${user.id}`,
          allocId: alloc.id,
          personnel_id: user.id,
          personnel_name: user.name,
          company_id: alloc.companyId,
          company_name: company?.name || 'Belirtilmemiş',
          license_id: alloc.licenseId,
          license_name: license?.name || 'Bilinmeyen Lisans',
          period: alloc.period,
          cost: license ? license.unit_price : 0,
          currency: license ? license.currency : 'USD',
          status: 'Aktif'
        })
      })
    }
  })
  return flattened
})

const stats = computed(() => {
  const total = tableRows.value.reduce((acc, row) => acc + row.cost, 0)
  const count = tableRows.value.length
  return { total, count }
})

/* --- Fetch Data --- */
const fetchData = async () => {
  loading.value = true
  try {
    const res = await axios.get('/api/m365/data')
    rawData.value = res.data
  } catch (error) {
    console.error('Veri çekme hatası:', error)
  } finally {
    loading.value = false
  }
}

/* --- Actions --- */
const isModalOpen = ref(false)
const editTarget = ref(null)
const form = ref({ personnel_id: '', license_id: '', company_id: '', period: new Date().toISOString().slice(0, 7) })

const openAdd = () => {
  editTarget.value = null
  form.value = { personnel_id: '', license_id: '', company_id: '', period: new Date().toISOString().slice(0, 7) }
  isModalOpen.value = true
}

const saveAssignment = async () => {
  try {
    // Current backend bulk save strategy
    // In a real app, we would push a new user to the specific allocation record for the company/license/period
    const allocations = [...rawData.value.allocations]
    
    // Simple logic: Find or create allocation for (company, license, period)
    let alloc = allocations.find(a => 
      a.companyId === form.value.company_id && 
      a.licenseId === form.value.license_id && 
      a.period === form.value.period
    )
    
    if (!alloc) {
      alloc = {
        companyId: form.value.company_id,
        licenseId: form.value.license_id,
        period: form.value.period,
        quantity: 0,
        users: []
      }
      allocations.push(alloc)
    }
    
    // Add user if not exists
    const personnel = masterData.personnel.find(p => p.id === form.value.personnel_id)
    if (personnel && !alloc.users.find(u => u.id === personnel.id)) {
      alloc.users.push({ id: personnel.id, name: `${personnel.first_name} ${personnel.last_name}` })
      alloc.quantity = alloc.users.length
    }
    
    await axios.post('/api/m365/save', { ...rawData.value, allocations })
    isModalOpen.value = false
    fetchData()
  } catch (err) {
    alert('Hata: ' + err.message)
  }
}

const deleteAssignment = async (row) => {
  if (!confirm('Bu atamayı kaldırmak istediğinize emin misiniz?')) return
  try {
    const allocations = [...rawData.value.allocations]
    const alloc = allocations.find(a => a.id === row.allocId)
    if (alloc) {
      alloc.users = alloc.users.filter(u => u.id !== row.personnel_id)
      alloc.quantity = alloc.users.length
    }
    await axios.post('/api/m365/save', { ...rawData.value, allocations })
    fetchData()
  } catch (err) {
    alert('Hata: ' + err.message)
  }
}

const exportExcel = () => {
  const rows = tableRows.value.map(r => ({
    'Personel': r.personnel_name,
    'Şirket': r.company_name,
    'Lisans': r.license_name,
    'Dönem': r.period,
    'Maliyet': `${r.cost} ${r.currency}`
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'LisansAtamalari')
  XLSX.writeFile(wb, 'lisans-atama-listesi.xlsx')
}

onMounted(() => {
  fetchData()
  masterData.fetchCompanies()
  masterData.fetchPersonnel()
  masterData.fetchLicenses()
})
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Table Section -->
    <AppTable
      :columns="columns"
      :rows="tableRows"
      :loading="loading"
      :quick-filters="quickFilters"
      :actions="true"
      :selectable="true"
      @row-delete="deleteAssignment"
      @selection-change="onSelectionChange"
    >
      <template #toolbar>
        <!-- Toplu İşlemler (Selections) -->
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

      <!-- Custom Cells -->
      <template #cell-personnel_name="{ value }">
        <span class="font-bold text-gray-900">{{ value }}</span>
      </template>

      <template #cell-license_name="{ value }">
        <div class="flex items-center gap-2">
           <i class="fab fa-microsoft text-blue-500 text-[12px]"></i>
           <span class="font-semibold text-gray-700">{{ value }}</span>
        </div>
      </template>

      <template #cell-cost="{ row }">
         <span class="font-bold text-gray-900 tabular-nums">{{ row.cost.toLocaleString() }} {{ row.currency }}</span>
      </template>

      <template #cell-status="{ value }">
        <span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
          {{ value }}
        </span>
      </template>
    </AppTable>


  <!-- Assignment Modal (M2M Style) -->
  <Teleport to="body">
    <div v-if="isModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" @click.self="isModalOpen = false">
      <div class="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden">
        <div class="px-7 py-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 class="text-[17px] font-bold text-gray-900">Lisans Ataması Yap</h2>
            <p class="text-[12px] text-gray-400 mt-0.5">Personel ve lisans detaylarını seçin</p>
          </div>
          <button type="button" @click="isModalOpen = false"
            class="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="p-7 space-y-5 max-h-[70vh] overflow-y-auto">
          <div class="grid grid-cols-2 gap-x-5 gap-y-5">
            <div class="col-span-2">
              <label class="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Personel Seçin <span class="text-red-500">*</span></label>
              <select v-model="form.personnel_id" class="w-full h-10 px-3 text-[13px] border border-gray-200 rounded-lg outline-none focus:border-blue-500 bg-white">
                <option value="" disabled>Seçiniz</option>
                <optgroup v-for="c in masterData.companies" :key="c.id" :label="c.name">
                  <option v-for="p in masterData.personnel.filter(p => p.company_id === c.id)" :key="p.id" :value="p.id">
                    {{ p.first_name }} {{ p.last_name }}
                  </option>
                </optgroup>
              </select>
            </div>

            <div>
              <label class="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Şirket <span class="text-red-500">*</span></label>
              <select v-model="form.company_id" class="w-full h-10 px-3 text-[13px] border border-gray-200 rounded-lg outline-none focus:border-blue-500 bg-white">
                <option value="" disabled>Seçiniz</option>
                <option v-for="c in masterData.companies" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </div>

            <div>
              <label class="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Lisans Tipi <span class="text-red-500">*</span></label>
              <select v-model="form.license_id" class="w-full h-10 px-3 text-[13px] border border-gray-200 rounded-lg outline-none focus:border-blue-500 bg-white">
                <option value="" disabled>Seçiniz</option>
                <option v-for="l in masterData.licenses" :key="l.id" :value="l.id">{{ l.name }} ({{ l.unit_price }} {{ l.currency }})</option>
              </select>
            </div>

            <div>
              <label class="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Dönem <span class="text-red-500">*</span></label>
              <input v-model="form.period" type="month" class="w-full h-10 px-3 text-[13px] border border-gray-200 rounded-lg outline-none focus:border-blue-500">
            </div>

            <div>
              <label class="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Durum</label>
              <select class="w-full h-10 px-3 text-[13px] border border-gray-200 rounded-lg outline-none focus:border-blue-500 bg-white">
                <option value="Aktif">Aktif</option>
                <option value="Pasif">Pasif</option>
              </select>
            </div>
          </div>

          <div>
             <label class="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Notlar</label>
             <textarea rows="3" placeholder="Atama ile ilgili notlar..."
               class="w-full px-3 py-2.5 text-[13px] border border-gray-200 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none"></textarea>
          </div>
        </div>

        <div class="px-7 py-4 border-t border-gray-100 bg-gray-50/40 flex justify-end gap-2">
          <button type="button" @click="isModalOpen = false"
            class="px-5 py-2 text-[13px] font-semibold text-gray-500 hover:text-gray-700">Vazgeç</button>
          <button type="button" @click="saveAssignment"
            class="px-6 py-2 text-[13px] font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm flex items-center gap-1.5">
            <i class="fas fa-save text-[11px]"></i>
            Atamayı Kaydet
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</div>
</template>
