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
  { key: 'license_name', label: 'Lisans', options: masterData.licenses.filter(l => l.name.toLowerCase().includes('itarian')).map(l => l.name) }
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
    XLSX.utils.book_append_sheet(wb, ws, 'SeciliItarianAtamalar')
    XLSX.writeFile(wb, 'secili-itarian-atamalari.xlsx')
}

/* --- Data Processing --- */
const tableRows = computed(() => {
  const flattened = []
  rawData.value.allocations.forEach(alloc => {
    const license = rawData.value.licenses.find(l => l.id === alloc.licenseId)
    // Filter for ITarian ONLY
    if (!license || !license.name.toLowerCase().includes('itarian')) return

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
           <i class="fas fa-shield-alt text-emerald-500 text-[12px]"></i>
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
  </div>
</template>
