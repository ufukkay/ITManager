<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../../api'
import AppTable from '../../components/AppTable.vue'
import * as XLSX from 'xlsx'

const rows = ref([])
const loading = ref(false)

const benefitTypeLabels = {
  PHONE: 'Telefon Desteği',
  INTERNET: 'İnternet Desteği',
  VEHICLE_FUEL: 'Araç Kirası & Yakıt Desteği'
}

const fetchData = async () => {
  loading.value = true
  try {
    const res = await api.get('/api/master-data/reports/personnel-benefits')
    rows.value = res.data || []
  } catch (err) {
    console.error('Personnel benefits report fetch failed:', err)
  } finally {
    loading.value = false
  }
}

const formatCurrency = (val) => {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 }).format(val || 0)
}

const tableRows = computed(() => rows.value.map(r => ({
  ...r,
  full_name: `${r.first_name} ${r.last_name}`,
  benefit_type_label: benefitTypeLabels[r.benefit_type] || r.benefit_type
})))

const totalMonthly = computed(() => rows.value.reduce((sum, r) => sum + (Number(r.amount) || 0), 0))

const totalsByType = computed(() => {
  const totals = {}
  rows.value.forEach(r => {
    totals[r.benefit_type] = (totals[r.benefit_type] || 0) + (Number(r.amount) || 0)
  })
  return totals
})

const columns = [
  { key: 'employee_id',        label: 'Sicil No',      width: '100px', sortable: true },
  { key: 'full_name',          label: 'Ad Soyad',      sortable: true },
  { key: 'company_name',       label: 'Şirket',        width: '160px', sortable: true },
  { key: 'department_name',    label: 'Departman',     width: '160px', sortable: true },
  { key: 'benefit_type_label', label: 'Destek Türü',   width: '200px', sortable: true },
  { key: 'amount',             label: 'Aylık Tutar',   width: '140px', sortable: true },
  { key: 'notes',              label: 'Not',           sortable: false },
]

const exportExcel = () => {
  const data = tableRows.value.map(r => ({
    'Sicil No': r.employee_id,
    'Ad Soyad': r.full_name,
    'Şirket': r.company_name || '',
    'Departman': r.department_name || '',
    'Destek Türü': r.benefit_type_label,
    'Aylık Tutar': r.amount,
    'Not': r.notes || ''
  }))
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Personel Destekleri')
  XLSX.writeFile(wb, 'personel-aylik-destekler.xlsx')
}

onMounted(fetchData)
</script>

<template>
  <div class="h-full flex flex-col overflow-hidden bg-gray-50/50">
    <!-- Stats -->
    <div class="shrink-0 px-6 py-3 border-b border-gray-100 bg-white flex items-center gap-6 flex-wrap">
      <div class="flex items-center gap-2">
        <span class="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Toplam Aylık Destek</span>
        <span class="text-[15px] font-bold text-emerald-600">{{ formatCurrency(totalMonthly) }}</span>
      </div>
      <div class="w-px h-4 bg-gray-200"></div>
      <div v-for="(total, type) in totalsByType" :key="type" class="flex items-center gap-2">
        <span class="text-[11px] font-bold text-gray-400 uppercase tracking-wide">{{ benefitTypeLabels[type] || type }}</span>
        <span class="text-[13px] font-bold text-gray-700">{{ formatCurrency(total) }}</span>
      </div>
    </div>

    <div class="flex-1 min-h-0 p-4">
      <AppTable
        :columns="columns"
        :rows="tableRows"
        :loading="loading"
        empty-text="Kayıtlı aylık destek bulunamadı"
      >
        <template #toolbar>
          <button type="button" @click="exportExcel"
            class="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-lg text-[12px] font-semibold hover:bg-gray-50">
            <i class="fas fa-file-excel text-emerald-500"></i> Excel
          </button>
        </template>

        <template #cell-amount="{ value }">
          <span class="font-bold text-emerald-600">{{ formatCurrency(value) }}</span>
        </template>

        <template #cell-benefit_type_label="{ row }">
          <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-600">
            {{ row.benefit_type_label }}
          </span>
        </template>
      </AppTable>
    </div>
  </div>
</template>
