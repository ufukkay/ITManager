<script setup>
import { ref, onMounted, computed } from 'vue'
import { useMasterDataStore } from '../../stores/masterData'
import AppTable from '../../components/AppTable.vue'
import api from '../../api'
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js'
import { Bar } from 'vue-chartjs'
import * as XLSX from 'xlsx'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

const masterData = useMasterDataStore()

const loading = ref(false)
const loadingRecommendations = ref(false)
const allocations = ref([])
const activeTab = ref('assignments')
const recommendations = ref([])
const totalSavings = ref(0)

const fetchData = async () => {
  loading.value = true
  try {
    await Promise.all([
      masterData.fetchPersonnel(),
      masterData.fetchCompanies(),
      masterData.fetchLicenses(),
      masterData.fetchDepartments()
    ])
    allocations.value = await masterData.fetchAllocations()
  } catch (error) {
    console.error('Veri çekme hatası:', error)
  } finally {
    loading.value = false
  }
}

const fetchRecommendations = async () => {
  loadingRecommendations.value = true
  try {
    const res = await api.get('/api/m365/recommendations')
    recommendations.value = res.data.recommendations || []
    totalSavings.value = res.data.totalSavings || 0
  } catch (err) {
    console.error('Tasarruf önerileri yüklenemedi:', err)
  } finally {
    loadingRecommendations.value = false
  }
}

const selectedRows = ref([])

const onSelectionChange = (rows) => {
  selectedRows.value = rows
}

const exportSelectedToExcel = () => {
  if (!selectedRows.value.length) return
  const data = selectedRows.value.map(row => ({
    'Ad Soyad': row.full_name,
    'E-Posta': row.work_email || '—',
    'Şirket': row.company_name || '—',
    'Departman': row.department_name || '—',
    'Unvan': row.title || '—',
    'Atanan Lisanslar': (row.assigned_licenses || []).map(l => l.license_name).join(', ')
  }))
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Seçili Kullanıcılar')
  XLSX.writeFile(workbook, 'secili_m365_kullanicilari.xlsx')
}

// Raporlama sekmesi
const summary = ref({ byCompany: [], byDepartment: [], byLicense: [], totals: null })
const loadingSummary = ref(false)

const fetchSummary = async () => {
  loadingSummary.value = true
  try {
    const res = await api.get('/api/m365/summary')
    summary.value = res.data
  } catch (err) {
    console.error('Özet rapor yüklenemedi:', err)
  } finally {
    loadingSummary.value = false
  }
}

const fmtMoney = (val, currency = 'USD') => {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: currency || 'USD', maximumFractionDigits: 2 }).format(val || 0)
}

const companyChartData = computed(() => {
  const top = [...summary.value.byCompany].sort((a, b) => b.monthly_cost - a.monthly_cost).slice(0, 8)
  return {
    labels: top.map(c => c.company_name),
    datasets: [{ label: 'Aylık Maliyet (USD)', backgroundColor: '#2563eb', data: top.map(c => c.monthly_cost), borderRadius: 4 }]
  }
})
const barOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { font: { size: 10 } } }, y: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 10 } } } } }

const refreshCurrentTab = async () => {
  if (activeTab.value === 'assignments') {
    await fetchData()
  } else if (activeTab.value === 'savings') {
    await fetchRecommendations()
  } else {
    await fetchSummary()
  }
}

const columns = [
  { key: 'full_name',    label: 'Personel', sortable: true },
  { key: 'company_name', label: 'Şirket',   sortable: true, width: '180px' },
  { key: 'department_name', label: 'Departman', sortable: true, width: '180px' },
  { key: 'assigned_licenses', label: 'Atanmış Lisanslar', sortable: false },
]

const tableRows = computed(() => {
  return masterData.personnel.map(p => {
    const personAllocations = allocations.value.filter(a => a.personnel_id === p.id)
    return {
      ...p,
      full_name: `${p.first_name} ${p.last_name}`,
      assigned_licenses: personAllocations
    }
  })
})

const buildDetailRows = () => {
  const rows = []
  tableRows.value.forEach(p => {
    if (!p.assigned_licenses?.length) {
      rows.push({
        'Şirket': p.company_name || '-',
        'Departman': p.department_name || '-',
        'Personel': p.full_name,
        'Ünvan': p.title || '-',
        'Lisans': '-',
        'Birim Fiyat': 0,
        'Para Birimi': '-'
      })
      return
    }
    p.assigned_licenses.forEach(a => {
      const lic = masterData.licenses.find(l => l.id === a.license_id)
      rows.push({
        'Şirket': p.company_name || '-',
        'Departman': p.department_name || '-',
        'Personel': p.full_name,
        'Ünvan': p.title || '-',
        'Lisans': a.license_name,
        'Birim Fiyat': lic?.unit_price || 0,
        'Para Birimi': lic?.currency || 'USD'
      })
    })
  })
  return rows.sort((a, b) => a['Şirket'].localeCompare(b['Şirket']) || a['Personel'].localeCompare(b['Personel']))
}

const exportCompanyOptions = computed(() => {
  return [...new Set(tableRows.value.map(p => p.company_name).filter(Boolean))].sort()
})

// Rapor Özelleştirme (Excel Dışa Aktarma) modalı
const isExportModalOpen = ref(false)
const exportOptions = ref({
  companyName: 'all',
  sheets: { company: true, department: true, license: true, detail: true }
})

const groupSummary = (rows, groupKey, labelKey) => {
  const map = new Map()
  rows.forEach(r => {
    if (r['Lisans'] === '-') return
    const key = r[groupKey] || '-'
    if (!map.has(key)) map.set(key, { seats: 0, personnel: new Set(), cost: 0 })
    const entry = map.get(key)
    entry.seats++
    entry.personnel.add(r['Personel'])
    entry.cost += r['Birim Fiyat'] || 0
  })
  return Array.from(map.entries())
    .map(([key, v]) => ({
      [labelKey]: key,
      'Atanmış Koltuk': v.seats,
      'Lisanslı Personel': v.personnel.size,
      'Aylık Maliyet (USD)': parseFloat(v.cost.toFixed(2))
    }))
    .sort((a, b) => b['Aylık Maliyet (USD)'] - a['Aylık Maliyet (USD)'])
}

const licenseSummary = (rows) => {
  const map = new Map()
  rows.forEach(r => {
    if (r['Lisans'] === '-') return
    if (!map.has(r['Lisans'])) map.set(r['Lisans'], { seats: 0, unitPrice: r['Birim Fiyat'], currency: r['Para Birimi'] })
    map.get(r['Lisans']).seats++
  })
  return Array.from(map.entries())
    .map(([name, v]) => ({
      'Lisans': name,
      'Koltuk': v.seats,
      'Birim Fiyat': v.unitPrice,
      'Para Birimi': v.currency,
      'Toplam Maliyet': parseFloat((v.seats * v.unitPrice).toFixed(2))
    }))
    .sort((a, b) => b['Toplam Maliyet'] - a['Toplam Maliyet'])
}

const exportExcel = () => {
  let detailRows = buildDetailRows()
  if (exportOptions.value.companyName !== 'all') {
    detailRows = detailRows.filter(r => r['Şirket'] === exportOptions.value.companyName)
  }

  const wb = XLSX.utils.book_new()
  const { sheets } = exportOptions.value
  if (sheets.company) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(groupSummary(detailRows, 'Şirket', 'Şirket')), 'Sirket Ozeti')
  }
  if (sheets.department) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(groupSummary(detailRows, 'Departman', 'Departman')), 'Departman Ozeti')
  }
  if (sheets.license) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(licenseSummary(detailRows)), 'Lisans Ozeti')
  }
  if (sheets.detail) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detailRows), 'Kisi Bazli Detay')
  }
  if (wb.SheetNames.length === 0) return

  const suffix = exportOptions.value.companyName !== 'all' ? `-${exportOptions.value.companyName.replace(/\s+/g, '_')}` : ''
  XLSX.writeFile(wb, `m365-lisans-raporu${suffix}-${new Date().toISOString().slice(0, 10)}.xlsx`)
  isExportModalOpen.value = false
}

onMounted(async () => {
  await fetchData()
  await fetchRecommendations()
  await fetchSummary()
})
</script>

<template>
  <div class="h-full flex flex-col bg-white dark:bg-slate-900 overflow-hidden">
    <!-- Header -->
    <div class="px-8 py-6 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between shrink-0">
      <div>
        <h1 class="text-[18px] font-black text-gray-900 dark:text-slate-100 tracking-tight leading-none mb-1.5">Lisans Yönetimi</h1>
        <p class="text-[12px] text-gray-400 dark:text-slate-500 font-medium">Azure/Entra ID'den senkronize edilen lisans atamalarının görüntülenmesi ve raporlanması (salt okunur)</p>
      </div>

      <div class="flex items-center gap-3">
        <button @click="refreshCurrentTab" class="h-9 w-9 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl border border-gray-200 dark:border-slate-700 transition-all flex items-center justify-center active:scale-95">
          <i class="fas fa-sync-alt" :class="{ 'fa-spin': loading || loadingRecommendations }"></i>
        </button>
      </div>
    </div>

    <!-- Tabs Navigation -->
    <div class="px-8 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between bg-gray-50/50 dark:bg-slate-800/50 shrink-0">
      <div class="flex gap-6">
        <button
          @click="activeTab = 'assignments'"
          class="py-3 text-[13px] font-bold border-b-2 transition-all relative"
          :class="activeTab === 'assignments' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100'"
        >
          Lisans Atamaları
        </button>
        <button
          @click="activeTab = 'savings'"
          class="py-3 text-[13px] font-bold border-b-2 transition-all relative flex items-center gap-2"
          :class="activeTab === 'savings' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100'"
        >
          Tasarruf Önerileri
          <span v-if="recommendations.length > 0" class="px-2 py-0.5 text-[10px] font-bold bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 rounded-full">
            {{ recommendations.length }}
          </span>
        </button>
        <button
          @click="activeTab = 'reporting'"
          class="py-3 text-[13px] font-bold border-b-2 transition-all relative"
          :class="activeTab === 'reporting' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100'"
        >
          Raporlama
        </button>
      </div>
      <router-link to="/master-data/licensing" class="text-[11px] font-bold text-gray-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1.5 py-3">
        <i class="fas fa-tag"></i> Lisans Fiyatlarını Düzenle
      </router-link>
    </div>

    <!-- Main List (Assignments Tab) -->
    <div v-if="activeTab === 'assignments'" class="flex-1 overflow-hidden">
      <AppTable
        storage-key="m365-lisans-atananlar"
        :columns="columns"
        :rows="tableRows"
        :loading="loading"
        :selectable="true"
        :actions="false"
        @selection-change="onSelectionChange"
      >
        <template #toolbar>
          <template v-if="selectedRows.length > 0">
            <span class="text-[13px] font-bold text-[#1a73e8]">{{ selectedRows.length }} Kullanıcı Seçildi</span>
            <button
              type="button"
              class="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 rounded-lg text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors"
              @click="exportSelectedToExcel"
            >
              <i class="fas fa-file-excel text-[10px]"></i> Excel'e Aktar ({{ selectedRows.length }})
            </button>
          </template>
        </template>
        <template #cell-full_name="{ row, value }">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 flex items-center justify-center font-bold text-[11px] border border-gray-200 dark:border-slate-600">
              {{ row.first_name?.[0] }}{{ row.last_name?.[0] }}
            </div>
            <div class="flex flex-col">
              <span class="font-bold text-gray-900 dark:text-slate-100">{{ value }}</span>
              <span class="text-[10px] text-gray-400 dark:text-slate-500 font-bold uppercase tracking-tight">{{ row.title || '—' }}</span>
            </div>
          </div>
        </template>

        <template #cell-assigned_licenses="{ value }">
          <div class="flex flex-wrap gap-1.5">
            <span v-for="a in value" :key="a.id" class="px-2 py-0.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded text-[10px] font-bold border border-blue-100 dark:border-blue-500/20 flex items-center gap-1.5">
              {{ a.license_name }}
            </span>
            <span v-if="!value?.length" class="text-gray-300 dark:text-slate-500 text-[11px] italic">Atanmış lisans yok</span>
          </div>
        </template>
      </AppTable>
    </div>

    <!-- Savings Tab -->
    <div v-else-if="activeTab === 'savings'" class="flex-1 overflow-y-auto bg-gray-50/50 dark:bg-slate-900 p-8 space-y-6 custom-scrollbar">
      <!-- Savings Summary Card -->
      <div class="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-md flex items-center justify-between">
        <div class="space-y-1">
          <span class="text-[11px] font-bold uppercase tracking-wider text-emerald-100">Potansiyel Aylık Tasarruf</span>
          <h2 class="text-3xl font-black">${{ totalSavings.toFixed(2) }} <span class="text-lg font-bold text-emerald-100">/ ay</span></h2>
          <p class="text-[12px] text-emerald-50/90 font-medium">Son 30 gündür inaktif olan veya mail/teams kullanmayan lisanslı kullanıcılar belirlendi.</p>
        </div>
        <div class="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 text-white text-2xl shadow-inner shrink-0">
          <i class="fas fa-piggy-bank"></i>
        </div>
      </div>

      <p class="text-[11px] text-gray-400 dark:text-slate-500 font-medium flex items-center gap-1.5">
        <i class="fas fa-info-circle"></i> Bu liste sadece bilgilendirme amaçlıdır. Lisansı gerçekten iptal etmek için Microsoft 365 yönetim merkezini kullanın — buradan yapılan bir işlem Azure'daki lisansı etkilemez.
      </p>

      <!-- Recommendation Cards -->
      <div v-if="loadingRecommendations" class="flex items-center justify-center py-12">
        <i class="fas fa-spinner fa-spin text-2xl text-blue-600 dark:text-blue-400"></i>
      </div>

      <div v-else-if="recommendations.length === 0" class="flex flex-col items-center justify-center py-16 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-8 text-center space-y-3">
        <div class="w-12 h-12 rounded-full bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 flex items-center justify-center text-lg border border-green-100 dark:border-green-500/20">
          <i class="fas fa-check-circle"></i>
        </div>
        <h3 class="text-sm font-bold text-gray-900 dark:text-slate-100">Tebrikler!</h3>
        <p class="text-[12px] text-gray-500 dark:text-slate-400 max-w-sm">M365 lisanslarınız tamamen optimize edilmiş durumda. Pasif veya atıl lisanslı kullanıcı bulunamadı.</p>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div v-for="rec in recommendations" :key="rec.id" class="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5 shadow-sm hover:border-blue-200 dark:hover:border-blue-500/40 transition-all">
          <div class="space-y-4">
            <!-- User & License Info -->
            <div class="flex items-start justify-between">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 flex items-center justify-center font-bold text-xs border border-gray-200 dark:border-slate-600">
                  {{ rec.name?.[0] }}
                </div>
                <div>
                  <h4 class="text-[13px] font-bold text-gray-900 dark:text-slate-100 leading-tight">{{ rec.name }}</h4>
                  <span class="text-[11px] text-gray-400 dark:text-slate-500 font-medium block truncate max-w-[200px]">{{ rec.email }}</span>
                </div>
              </div>

              <div class="text-right">
                <span class="text-[13px] font-black text-gray-900 dark:text-slate-100">{{ fmtMoney(rec.monthlyCost, rec.currency) }}</span>
                <p class="text-[9px] text-gray-400 dark:text-slate-500 font-bold uppercase tracking-wider">Aylık Maliyet</p>
              </div>
            </div>

            <!-- Inactivity Badge -->
            <div class="p-3 bg-red-50/50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg flex items-start gap-2.5">
              <i class="fas fa-exclamation-circle text-red-500 dark:text-red-400 text-xs mt-0.5"></i>
              <div>
                <p class="text-[11px] font-bold text-red-800 dark:text-red-400 leading-tight">{{ rec.reason }}</p>
                <p class="text-[10px] text-red-700 dark:text-red-400/80 mt-1" v-if="rec.lastActivity">
                  Son Aktivite: <strong>{{ new Date(rec.lastActivity).toLocaleDateString('tr-TR') }}</strong>
                </p>
              </div>
            </div>

            <!-- Extra Info -->
            <div class="flex items-center justify-between text-[11px] text-gray-500 dark:text-slate-400 font-medium border-t border-gray-100 dark:border-slate-700 pt-3">
              <span>Şirket: <strong>{{ rec.companyName }}</strong></span>
              <span>Lisans: <strong>{{ rec.licenseName }}</strong></span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Reporting Tab -->
    <div v-else class="flex-1 overflow-y-auto bg-gray-50/50 dark:bg-slate-900 p-8 space-y-6 custom-scrollbar">
      <div v-if="loadingSummary" class="flex items-center justify-center py-16">
        <i class="fas fa-spinner fa-spin text-2xl text-blue-600 dark:text-blue-400"></i>
      </div>
      <template v-else>
        <div class="flex justify-end">
          <button @click="isExportModalOpen = true" class="h-9 px-4 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-xl border border-gray-200 dark:border-slate-700 transition-all flex items-center gap-2 text-[12px] font-bold active:scale-95">
            <i class="fas fa-file-excel text-emerald-500 dark:text-emerald-400"></i> Excel'e Aktar
          </button>
        </div>

        <!-- Summary Cards -->
        <div class="grid grid-cols-4 gap-4">
          <div class="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
            <span class="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">Toplam Aylık Maliyet</span>
            <p class="text-2xl font-black text-gray-900 dark:text-slate-100 mt-1.5">{{ fmtMoney(summary.totals?.totalMonthlyCost) }}</p>
          </div>
          <div class="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
            <span class="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">Atanmış Koltuk</span>
            <p class="text-2xl font-black text-gray-900 dark:text-slate-100 mt-1.5">{{ summary.totals?.totalSeats || 0 }}</p>
          </div>
          <div class="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
            <span class="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">Lisanslı Personel</span>
            <p class="text-2xl font-black text-gray-900 dark:text-slate-100 mt-1.5">{{ summary.totals?.totalPersonnel || 0 }}</p>
          </div>
          <div class="bg-white dark:bg-slate-800 border border-red-100 dark:border-red-500/20 bg-red-50/40 dark:bg-red-500/5 rounded-2xl p-5 shadow-sm">
            <span class="text-[10px] font-black text-red-400 dark:text-red-400/80 uppercase tracking-widest">Atıl/Gereksiz Maliyet</span>
            <p class="text-2xl font-black text-red-600 dark:text-red-400 mt-1.5">{{ fmtMoney(summary.totals?.totalIdleCost) }}</p>
            <p class="text-[10px] text-red-400 dark:text-red-400/80 font-bold mt-0.5">{{ summary.totals?.idleCount || 0 }} kullanıcı</p>
          </div>
        </div>

        <!-- Company Chart -->
        <div class="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
          <h3 class="text-[13px] font-bold text-gray-800 dark:text-slate-200 mb-4">Şirket Bazlı Maliyet Dağılımı (İlk 8)</h3>
          <div class="h-64">
            <Bar :data="companyChartData" :options="barOpts" />
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Company Table -->
          <div class="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
            <div class="px-5 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
              <h3 class="text-[13px] font-bold text-gray-800 dark:text-slate-200"><i class="fas fa-building mr-2 text-blue-500 dark:text-blue-400"></i>Şirket Bazlı</h3>
              <span class="text-[10px] font-bold text-gray-400 dark:text-slate-500">{{ summary.byCompany.length }} şirket</span>
            </div>
            <div class="max-h-96 overflow-y-auto custom-scrollbar">
              <table class="w-full text-[12px]">
                <thead class="bg-gray-50/70 dark:bg-slate-900/50 sticky top-0">
                  <tr>
                    <th class="text-left px-5 py-2 text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase">Şirket</th>
                    <th class="text-right px-5 py-2 text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase">Koltuk</th>
                    <th class="text-right px-5 py-2 text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase">Maliyet</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="!summary.byCompany.length"><td colspan="3" class="text-center py-8 text-gray-300 dark:text-slate-600">Veri yok</td></tr>
                  <tr v-for="c in summary.byCompany" :key="c.company_id" class="border-t border-gray-50 dark:border-slate-700 hover:bg-gray-50/50 dark:hover:bg-slate-700/50">
                    <td class="px-5 py-2.5 font-semibold text-gray-800 dark:text-slate-200">{{ c.company_name }}</td>
                    <td class="px-5 py-2.5 text-right text-gray-500 dark:text-slate-400">{{ c.seat_count }}</td>
                    <td class="px-5 py-2.5 text-right font-bold text-gray-900 dark:text-slate-100">{{ fmtMoney(c.monthly_cost) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Department Table -->
          <div class="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
            <div class="px-5 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
              <h3 class="text-[13px] font-bold text-gray-800 dark:text-slate-200"><i class="fas fa-sitemap mr-2 text-blue-500 dark:text-blue-400"></i>Departman Bazlı</h3>
              <span class="text-[10px] font-bold text-gray-400 dark:text-slate-500">{{ summary.byDepartment.length }} departman</span>
            </div>
            <div class="max-h-96 overflow-y-auto custom-scrollbar">
              <table class="w-full text-[12px]">
                <thead class="bg-gray-50/70 dark:bg-slate-900/50 sticky top-0">
                  <tr>
                    <th class="text-left px-5 py-2 text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase">Departman</th>
                    <th class="text-right px-5 py-2 text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase">Koltuk</th>
                    <th class="text-right px-5 py-2 text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase">Maliyet</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="!summary.byDepartment.length"><td colspan="3" class="text-center py-8 text-gray-300 dark:text-slate-600">Veri yok</td></tr>
                  <tr v-for="d in summary.byDepartment" :key="d.department_id" class="border-t border-gray-50 dark:border-slate-700 hover:bg-gray-50/50 dark:hover:bg-slate-700/50">
                    <td class="px-5 py-2.5 font-semibold text-gray-800 dark:text-slate-200">{{ d.department_name }}</td>
                    <td class="px-5 py-2.5 text-right text-gray-500 dark:text-slate-400">{{ d.seat_count }}</td>
                    <td class="px-5 py-2.5 text-right font-bold text-gray-900 dark:text-slate-100">{{ fmtMoney(d.monthly_cost) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- By License Table -->
        <div class="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
          <div class="px-5 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
            <h3 class="text-[13px] font-bold text-gray-800 dark:text-slate-200"><i class="fas fa-key mr-2 text-blue-500 dark:text-blue-400"></i>Lisans Tipi Bazlı Dağılım</h3>
            <router-link to="/master-data/licensing" class="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1.5">
              <i class="fas fa-tag"></i> Fiyatları Düzenle
            </router-link>
          </div>
          <p v-if="summary.byLicense.some(l => !l.unit_price)" class="px-5 py-2 bg-amber-50 dark:bg-amber-500/10 border-b border-amber-100 dark:border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-400 font-medium">
            <i class="fas fa-exclamation-triangle mr-1"></i> Bazı lisansların birim fiyatı girilmemiş (Microsoft Graph fiyat bilgisi vermez). Doğru maliyet raporlaması için Master Data &gt; Lisans Paket Tanımları sayfasından fiyatları girin.
          </p>
          <table class="w-full text-[12px]">
            <thead class="bg-gray-50/70 dark:bg-slate-900/50">
              <tr>
                <th class="text-left px-5 py-2 text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase">Lisans</th>
                <th class="text-left px-5 py-2 text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase">Kategori</th>
                <th class="text-right px-5 py-2 text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase">Koltuk</th>
                <th class="text-right px-5 py-2 text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase">Birim Fiyat</th>
                <th class="text-right px-5 py-2 text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase">Toplam</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!summary.byLicense.length"><td colspan="5" class="text-center py-8 text-gray-300 dark:text-slate-600">Veri yok</td></tr>
              <tr v-for="l in summary.byLicense" :key="l.license_id" class="border-t border-gray-50 dark:border-slate-700 hover:bg-gray-50/50 dark:hover:bg-slate-700/50">
                <td class="px-5 py-2.5 font-semibold text-gray-800 dark:text-slate-200">{{ l.license_name }}</td>
                <td class="px-5 py-2.5 text-gray-500 dark:text-slate-400">{{ l.category }}</td>
                <td class="px-5 py-2.5 text-right text-gray-500 dark:text-slate-400">{{ l.seat_count }}</td>
                <td class="px-5 py-2.5 text-right" :class="l.unit_price ? 'text-gray-500 dark:text-slate-400' : 'text-amber-500 dark:text-amber-400 font-bold'">{{ l.unit_price ? fmtMoney(l.unit_price, l.currency) : 'Fiyat yok' }}</td>
                <td class="px-5 py-2.5 text-right font-bold text-gray-900 dark:text-slate-100">{{ fmtMoney(l.monthly_cost, l.currency) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </div>

    <!-- Export Customization Modal -->
    <Teleport to="body">
      <div v-if="isExportModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" @click.self="isExportModalOpen = false">
        <div class="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-slate-700">
          <div class="px-7 py-5 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between bg-gray-50/50 dark:bg-slate-900/50">
            <h3 class="text-[15px] font-bold text-gray-900 dark:text-slate-100">Excel Raporunu Özelleştir</h3>
            <button @click="isExportModalOpen = false" class="text-gray-400 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-200 w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center justify-center transition-colors">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="p-7 space-y-5">
            <div>
              <label class="block text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">Şirket</label>
              <select v-model="exportOptions.companyName" class="w-full h-10 px-3 text-[13px] border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-500/20">
                <option value="all">Tüm Şirketler</option>
                <option v-for="c in exportCompanyOptions" :key="c" :value="c">{{ c }}</option>
              </select>
            </div>
            <div>
              <label class="block text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-2">İçerilecek Sayfalar</label>
              <div class="space-y-2">
                <label class="flex items-center gap-2.5 p-2.5 rounded-lg border border-gray-100 dark:border-slate-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50">
                  <input type="checkbox" v-model="exportOptions.sheets.company" class="w-4 h-4 accent-blue-600">
                  <span class="text-[13px] font-semibold text-gray-700 dark:text-slate-300">Şirket Özeti (toplam maliyet)</span>
                </label>
                <label class="flex items-center gap-2.5 p-2.5 rounded-lg border border-gray-100 dark:border-slate-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50">
                  <input type="checkbox" v-model="exportOptions.sheets.department" class="w-4 h-4 accent-blue-600">
                  <span class="text-[13px] font-semibold text-gray-700 dark:text-slate-300">Departman Özeti</span>
                </label>
                <label class="flex items-center gap-2.5 p-2.5 rounded-lg border border-gray-100 dark:border-slate-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50">
                  <input type="checkbox" v-model="exportOptions.sheets.license" class="w-4 h-4 accent-blue-600">
                  <span class="text-[13px] font-semibold text-gray-700 dark:text-slate-300">Lisans Tipi Özeti</span>
                </label>
                <label class="flex items-center gap-2.5 p-2.5 rounded-lg border border-gray-100 dark:border-slate-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50">
                  <input type="checkbox" v-model="exportOptions.sheets.detail" class="w-4 h-4 accent-blue-600">
                  <span class="text-[13px] font-semibold text-gray-700 dark:text-slate-300">Kişi Bazlı Detay (kimde ne lisans var)</span>
                </label>
              </div>
            </div>
          </div>
          <div class="px-7 py-4 border-t border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/50 flex justify-end gap-3">
            <button @click="isExportModalOpen = false" class="px-4 py-2 text-[12px] font-bold text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300">İPTAL</button>
            <button @click="exportExcel" :disabled="!Object.values(exportOptions.sheets).some(Boolean)"
              class="px-8 py-2 bg-emerald-600 text-white rounded-xl text-[12px] font-bold hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-lg shadow-emerald-100 dark:shadow-emerald-900/30 flex items-center gap-2">
              <i class="fas fa-download"></i> İNDİR
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 10px;
}
</style>
