<template>
  <div class="h-full flex flex-col bg-white overflow-hidden">
    <!-- HEADER -->
    <header class="h-14 border-b border-gray-100 flex items-center px-6 gap-4 bg-white shrink-0">
      <div class="flex items-center gap-2 shrink-0">
        <i class="fas fa-chart-bar text-gray-400"></i>
        <h1 class="text-[15px] font-bold text-gray-900">Raporlar & Analiz</h1>
      </div>
      <!-- TABS -->
      <div class="flex items-center gap-1 ml-4 bg-gray-100 rounded-lg p-1">
        <button v-for="tab in tabs" :key="tab.key"
          @click="activeTab = tab.key"
          :class="['px-4 py-1.5 rounded-md text-[12px] font-bold transition-all', activeTab === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700']">
          <i :class="tab.icon + ' mr-1.5'"></i>{{ tab.label }}
        </button>
      </div>
      <!-- FILTERS -->
      <div class="flex items-center gap-2 ml-4">
        <select v-model="filters.period" @change="load" class="filter-select">
          <option value="">Tüm Dönemler</option>
          <option v-for="p in periods" :key="p" :value="p">{{ p }}</option>
        </select>
        <select v-model="filters.company_id" @change="load" class="filter-select">
          <option value="">Tüm Şirketler</option>
          <option v-for="c in companies" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
        <select v-model="filters.operator" @change="load" class="filter-select">
          <option value="">Tüm Operatörler</option>
          <option value="Turkcell">Turkcell</option>
          <option value="Vodafone">Vodafone</option>
          <option value="Türk Telekom">Türk Telekom</option>
          <option value="Microsoft">Microsoft (M365)</option>
        </select>
      </div>
      <div class="ml-auto flex items-center gap-2">
        <button @click="load" class="btn-icon" :disabled="loading"><i class="fas fa-sync-alt" :class="{'fa-spin':loading}"></i></button>
        <button @click="exportExcel" class="btn-primary"><i class="fas fa-file-excel mr-1.5"></i>Excel</button>
      </div>
    </header>

    <!-- KPI BAR -->
    <div class="grid grid-cols-4 gap-px bg-gray-100 border-b border-gray-100 shrink-0">
      <div v-for="kpi in kpiCards" :key="kpi.label" class="bg-white px-6 py-3 flex items-center gap-3">
        <div :class="['w-9 h-9 rounded-lg flex items-center justify-center text-sm', kpi.bg]">
          <i :class="[kpi.icon, kpi.color]"></i>
        </div>
        <div>
          <div class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{{ kpi.label }}</div>
          <div class="text-[16px] font-black text-gray-900">{{ kpi.value }}</div>
        </div>
      </div>
    </div>

    <!-- CONTENT -->
    <main class="flex-1 overflow-y-auto bg-gray-50/40 p-6 space-y-6">
      <div v-if="loading" class="flex items-center justify-center h-64 text-gray-300">
        <i class="fas fa-circle-notch fa-spin text-3xl"></i>
      </div>

      <!-- TAB: PERSONEL -->
      <template v-else-if="activeTab === 'personnel'">
        <div class="rcard">
          <div class="rcard-head">
            <span class="rtitle">Personel Bazlı Maliyet Raporu</span>
            <span class="badge">{{ personnelData.rows?.length || 0 }} kayıt</span>
          </div>
          <div class="overflow-x-auto">
            <table class="rtable">
              <thead>
                <tr>
                  <th>Personel</th>
                  <th>Şirket</th>
                  <th>Masraf Kalemi</th>
                  <th class="text-right">GSM</th>
                  <th class="text-right">M365</th>
                  <th class="text-right">Toplam</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!personnelData.rows?.length">
                  <td colspan="6" class="text-center py-8 text-gray-300 text-sm">Veri bulunamadı</td>
                </tr>
                <tr v-for="row in personnelData.rows" :key="row.personnel_id" class="hover:bg-gray-50">
                  <td>
                    <div class="font-semibold text-gray-900 text-[12.5px]">{{ row.personnel_name || 'Eşleşmemiş' }}</div>
                    <div class="text-[10px] text-gray-400">{{ row.operators }}</div>
                  </td>
                  <td class="text-[12px] text-gray-600">{{ row.company_name }}</td>
                  <td class="text-[11px] text-gray-500">{{ row.cost_center_name }}</td>
                  <td class="text-right text-[12px] font-semibold text-blue-600">{{ fmt(row.gsm_total) }}</td>
                  <td class="text-right text-[12px] font-semibold text-emerald-600">{{ fmt(row.m365_total) }}</td>
                  <td class="text-right text-[13px] font-black text-gray-900">{{ fmt(row.grand_total) }}</td>
                </tr>
              </tbody>
              <tfoot v-if="personnelData.totals">
                <tr class="bg-gray-50 font-bold">
                  <td colspan="3" class="px-4 py-2 text-[11px] text-gray-500 uppercase">TOPLAM ({{ personnelData.totals.total_personnel }} personel)</td>
                  <td class="text-right px-4 py-2 text-blue-700">{{ fmt(personnelData.totals.total_gsm) }}</td>
                  <td class="text-right px-4 py-2 text-emerald-700">{{ fmt(personnelData.totals.total_m365) }}</td>
                  <td class="text-right px-4 py-2 text-gray-900 text-[14px]">{{ fmt(personnelData.totals.total_amount) }}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </template>

      <!-- TAB: HİZMET -->
      <template v-else-if="activeTab === 'service'">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Hizmet Tipi Tablosu -->
          <div class="rcard">
            <div class="rcard-head"><span class="rtitle">Hizmet & Operatör Kırılımı</span></div>
            <table class="rtable">
              <thead><tr>
                <th>Tip</th><th>Operatör</th>
                <th class="text-right">Net</th><th class="text-right">KDV</th><th class="text-right">Toplam</th>
              </tr></thead>
              <tbody>
                <tr v-if="!serviceData.byType?.length">
                  <td colspan="5" class="text-center py-8 text-gray-300 text-sm">Veri bulunamadı</td>
                </tr>
                <tr v-for="row in serviceData.byType" :key="row.invoice_type+row.operator" class="hover:bg-gray-50">
                  <td><span :class="['badge-type', row.invoice_type === 'gsm' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700']">{{ row.invoice_type.toUpperCase() }}</span></td>
                  <td class="text-[12px] text-gray-700 font-medium">{{ row.operator }}</td>
                  <td class="text-right text-[12px]">{{ fmt(row.net_amount) }}</td>
                  <td class="text-right text-[11px] text-gray-400">{{ fmt(row.total_kdv) }}</td>
                  <td class="text-right font-bold text-[12px]">{{ fmt(row.total_amount) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <!-- Masraf Merkezi Tablosu -->
          <div class="rcard">
            <div class="rcard-head"><span class="rtitle">Masraf Merkezi Kırılımı</span></div>
            <table class="rtable">
              <thead><tr>
                <th>Masraf Kalemi</th><th class="text-right">GSM</th><th class="text-right">M365</th><th class="text-right">Toplam</th>
              </tr></thead>
              <tbody>
                <tr v-if="!serviceData.byCostCenter?.length">
                  <td colspan="4" class="text-center py-8 text-gray-300 text-sm">Veri bulunamadı</td>
                </tr>
                <tr v-for="row in serviceData.byCostCenter" :key="row.cost_center_id" class="hover:bg-gray-50">
                  <td class="text-[12px] font-medium text-gray-800">{{ row.cost_center_name }}</td>
                  <td class="text-right text-[12px] text-blue-600">{{ fmt(row.gsm_total) }}</td>
                  <td class="text-right text-[12px] text-emerald-600">{{ fmt(row.m365_total) }}</td>
                  <td class="text-right font-bold text-[12px]">{{ fmt(row.grand_total) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <!-- Trend Chart -->
        <div class="rcard h-[280px] flex flex-col">
          <div class="rcard-head"><span class="rtitle">Dönemsel Maliyet Trendi</span></div>
          <div class="flex-1 p-4 min-h-0">
            <Bar v-if="serviceData.monthlyTrend?.length" :data="trendChartData" :options="barOpts" />
            <div v-else class="h-full flex items-center justify-center text-gray-200 text-sm">Trend verisi yok</div>
          </div>
        </div>
      </template>

      <!-- TAB: ŞİRKET -->
      <template v-else-if="activeTab === 'company'">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="rcard">
            <div class="rcard-head"><span class="rtitle">Şirket Bazlı Maliyet</span></div>
            <table class="rtable">
              <thead><tr>
                <th>Şirket</th><th class="text-right">Personel</th><th class="text-right">GSM</th><th class="text-right">M365</th><th class="text-right">Toplam</th>
              </tr></thead>
              <tbody>
                <tr v-if="!companyData.byCompany?.length">
                  <td colspan="5" class="text-center py-8 text-gray-300 text-sm">Veri bulunamadı</td>
                </tr>
                <tr v-for="row in companyData.byCompany" :key="row.company_id" class="hover:bg-gray-50 cursor-pointer" @click="filters.company_id = row.company_id; load()">
                  <td class="font-semibold text-[12.5px] text-gray-900">{{ row.company_name }}</td>
                  <td class="text-right text-[12px] text-gray-500">{{ row.personnel_count }}</td>
                  <td class="text-right text-[12px] text-blue-600">{{ fmt(row.gsm_total) }}</td>
                  <td class="text-right text-[12px] text-emerald-600">{{ fmt(row.m365_total) }}</td>
                  <td class="text-right font-black text-[13px]">{{ fmt(row.grand_total) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="rcard">
            <div class="rcard-head">
              <span class="rtitle">Masraf Merkezi Detayı</span>
              <span class="text-[10px] text-gray-400">{{ filters.company_id ? '' : 'Şirket seçin' }}</span>
            </div>
            <table class="rtable">
              <thead><tr><th>Masraf Kalemi</th><th class="text-right">GSM</th><th class="text-right">M365</th><th class="text-right">Toplam</th></tr></thead>
              <tbody>
                <tr v-if="!companyData.costCenterDetail?.length">
                  <td colspan="4" class="text-center py-8 text-gray-300 text-sm">{{ filters.company_id ? 'Veri yok' : 'Soldan şirket seçin' }}</td>
                </tr>
                <tr v-for="row in companyData.costCenterDetail" :key="row.cost_center_id" class="hover:bg-gray-50">
                  <td class="text-[12px] font-medium text-gray-800">{{ row.cost_center_name }}</td>
                  <td class="text-right text-[12px] text-blue-600">{{ fmt(row.gsm_total) }}</td>
                  <td class="text-right text-[12px] text-emerald-600">{{ fmt(row.m365_total) }}</td>
                  <td class="text-right font-bold text-[12px]">{{ fmt(row.grand_total) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="rcard h-[280px] flex flex-col">
          <div class="rcard-head"><span class="rtitle">Dönemsel Maliyet Trendi</span></div>
          <div class="flex-1 p-4 min-h-0">
            <Bar v-if="companyData.monthlyTrend?.length" :data="companyTrendData" :options="barOpts" />
            <div v-else class="h-full flex items-center justify-center text-gray-200 text-sm">Trend verisi yok</div>
          </div>
        </div>
      </template>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../../api'
import { useMasterDataStore } from '../../stores/masterData'
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js'
import { Bar } from 'vue-chartjs'
import * as XLSX from 'xlsx'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

const store = useMasterDataStore()
const loading = ref(false)
const periods = ref([])
const companies = computed(() => store.companies)

const activeTab = ref('personnel')
const tabs = [
  { key: 'personnel', label: 'Personel Bazlı', icon: 'fas fa-user' },
  { key: 'service', label: 'Hizmet Bazlı', icon: 'fas fa-layer-group' },
  { key: 'company', label: 'Şirket Bazlı', icon: 'fas fa-building' }
]

const filters = ref({ period: '', company_id: '', operator: '' })
const personnelData = ref({ rows: [], totals: null })
const serviceData = ref({ byType: [], byCostCenter: [], monthlyTrend: [], totals: null })
const companyData = ref({ byCompany: [], costCenterDetail: [], monthlyTrend: [], totals: null })

const fmt = (v) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(v || 0)

const kpiCards = computed(() => {
  const t = activeTab.value
  if (t === 'personnel') {
    const tot = personnelData.value.totals
    return [
      { label: 'Toplam Personel', value: tot?.total_personnel || 0, icon: 'fas fa-users', bg: 'bg-blue-50', color: 'text-blue-600' },
      { label: 'GSM Toplam', value: fmt(tot?.total_gsm), icon: 'fas fa-sim-card', bg: 'bg-blue-50', color: 'text-blue-600' },
      { label: 'M365 Toplam', value: fmt(tot?.total_m365), icon: 'fas fa-microsoft', bg: 'bg-emerald-50', color: 'text-emerald-600' },
      { label: 'Genel Toplam', value: fmt(tot?.total_amount), icon: 'fas fa-wallet', bg: 'bg-slate-50', color: 'text-slate-600' }
    ]
  } else if (t === 'service') {
    const tot = serviceData.value.totals
    return [
      { label: 'Personel Sayısı', value: tot?.total_personnel || 0, icon: 'fas fa-users', bg: 'bg-blue-50', color: 'text-blue-600' },
      { label: 'Net Tutar', value: fmt(tot?.net_amount), icon: 'fas fa-receipt', bg: 'bg-slate-50', color: 'text-slate-600' },
      { label: 'KDV', value: fmt(tot?.total_kdv), icon: 'fas fa-percent', bg: 'bg-amber-50', color: 'text-amber-600' },
      { label: 'Ödenecek Toplam', value: fmt(tot?.total_amount), icon: 'fas fa-wallet', bg: 'bg-purple-50', color: 'text-purple-600' }
    ]
  } else {
    const tot = companyData.value.totals
    return [
      { label: 'Şirket Sayısı', value: tot?.total_companies || 0, icon: 'fas fa-building', bg: 'bg-blue-50', color: 'text-blue-600' },
      { label: 'Personel Sayısı', value: tot?.total_personnel || 0, icon: 'fas fa-users', bg: 'bg-slate-50', color: 'text-slate-600' },
      { label: 'Toplam Maliyet', value: fmt(tot?.total_amount), icon: 'fas fa-wallet', bg: 'bg-purple-50', color: 'text-purple-600' },
      { label: 'Yıllık Projeksiyon', value: fmt((tot?.total_amount || 0) * 12), icon: 'fas fa-chart-line', bg: 'bg-emerald-50', color: 'text-emerald-600' }
    ]
  }
})

const barOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { boxWidth: 8, font: { size: 10 } } } }, scales: { x: { grid: { display: false }, ticks: { font: { size: 10 } } }, y: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 10 } } } } }

const trendChartData = computed(() => ({
  labels: serviceData.value.monthlyTrend?.map(r => r.period) || [],
  datasets: [
    { label: 'GSM', backgroundColor: '#3b82f6', data: serviceData.value.monthlyTrend?.map(r => r.gsm) || [], borderRadius: 3 },
    { label: 'M365', backgroundColor: '#10b981', data: serviceData.value.monthlyTrend?.map(r => r.m365) || [], borderRadius: 3 }
  ]
}))

const companyTrendData = computed(() => ({
  labels: companyData.value.monthlyTrend?.map(r => r.period) || [],
  datasets: [
    { label: 'GSM', backgroundColor: '#3b82f6', data: companyData.value.monthlyTrend?.map(r => r.gsm) || [], borderRadius: 3 },
    { label: 'M365', backgroundColor: '#10b981', data: companyData.value.monthlyTrend?.map(r => r.m365) || [], borderRadius: 3 }
  ]
}))

const load = async () => {
  loading.value = true
  try {
    const q = new URLSearchParams()
    if (filters.value.period) q.set('period', filters.value.period)
    if (filters.value.company_id) q.set('company_id', filters.value.company_id)
    if (filters.value.operator) q.set('operator', filters.value.operator)
    const qs = q.toString()

    const [pRes, sRes, cRes] = await Promise.all([
      api.get(`/api/master-data/reports/personnel?${qs}`),
      api.get(`/api/master-data/reports/service?${qs}`),
      api.get(`/api/master-data/reports/company?${qs}`)
    ])
    personnelData.value = pRes.data
    serviceData.value = sRes.data
    companyData.value = cRes.data
  } catch (e) {
    console.error('Reports load error:', e)
  } finally {
    loading.value = false
  }
}

const exportExcel = () => {
  let data = []
  let sheetName = 'Rapor'
  if (activeTab.value === 'personnel') {
    sheetName = 'Personel Bazlı'
    data = (personnelData.value.rows || []).map(r => ({
      'Personel': r.personnel_name, 'Şirket': r.company_name, 'Masraf Kalemi': r.cost_center_name,
      'Operatör': r.operators, 'GSM (₺)': r.gsm_total, 'M365 (₺)': r.m365_total, 'Toplam (₺)': r.grand_total
    }))
  } else if (activeTab.value === 'service') {
    sheetName = 'Hizmet Bazlı'
    data = (serviceData.value.byType || []).map(r => ({
      'Hizmet Tipi': r.invoice_type.toUpperCase(), 'Operatör': r.operator,
      'Net (₺)': r.net_amount, 'KDV (₺)': r.total_kdv, 'ÖİV (₺)': r.total_oiv, 'Toplam (₺)': r.total_amount
    }))
  } else {
    sheetName = 'Şirket Bazlı'
    data = (companyData.value.byCompany || []).map(r => ({
      'Şirket': r.company_name, 'Personel': r.personnel_count,
      'GSM (₺)': r.gsm_total, 'M365 (₺)': r.m365_total, 'Toplam (₺)': r.grand_total
    }))
  }
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(data)
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, `ITManager_${sheetName}_${filters.value.period || 'Tum'}.xlsx`)
}

onMounted(async () => {
  await Promise.all([store.fetchCompanies()])
  const pRes = await api.get('/api/master-data/reports/periods')
  periods.value = pRes.data
  if (periods.value.length) filters.value.period = periods.value[0]
  await load()
})
</script>

<style scoped>
.filter-select { @apply h-8 px-2 bg-gray-50 border border-gray-200 rounded text-[12px] font-medium text-gray-700 outline-none focus:border-blue-500 cursor-pointer; }
.btn-icon { @apply w-8 h-8 rounded border border-gray-200 text-gray-400 hover:text-blue-600 hover:bg-blue-50 flex items-center justify-center transition-all; }
.btn-primary { @apply h-8 px-4 bg-blue-600 text-white rounded text-[11px] font-bold hover:bg-blue-700 flex items-center transition-all; }
.rcard { @apply bg-white border border-gray-100 rounded-lg shadow-sm overflow-hidden; }
.rcard-head { @apply px-5 py-3 border-b border-gray-50 flex items-center justify-between; }
.rtitle { @apply text-[12px] font-bold text-gray-700 uppercase tracking-tight; }
.badge { @apply px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-bold rounded; }
.badge-type { @apply px-2 py-0.5 text-[10px] font-bold rounded uppercase; }
.rtable { @apply w-full text-left; }
.rtable thead tr { @apply border-b border-gray-50; }
.rtable thead th { @apply px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest; }
.rtable tbody tr { @apply border-b border-gray-50 transition-colors; }
.rtable tbody td { @apply px-4 py-2.5; }
.rtable tfoot td { @apply px-4 py-2.5 text-[11px]; }
</style>
