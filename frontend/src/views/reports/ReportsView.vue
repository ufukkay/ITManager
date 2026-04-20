<script setup>
import { ref, onMounted, computed } from 'vue'
import api from '../../api'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  ArcElement,
  PointElement,
  LineElement
} from 'chart.js'
import { Bar, Doughnut, Line } from 'vue-chartjs'
import { useMasterDataStore } from '../../stores/masterData'

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  ArcElement,
  PointElement,
  LineElement
)

})

const financialStats = ref(null)
const masterData = useMasterDataStore()

const loading = ref(true)

const loadReports = async () => {
    loading.value = true
    try {
        const [simRes, finRes] = await Promise.all([
          api.get('/sim-takip/api/reports/summary'),
          masterData.fetchFinancialStats()
        ])
        summary.value = simRes.data
        financialStats.value = finRes
    } catch (err) {
        console.error('Failed to load reports', err)
    } finally {
        loading.value = false
    }
}

const formatCurrency = (val) => {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val)
}

// Chart Configurations
const doughnutData = computed(() => ({
    labels: Object.keys(summary.value.operatorDist),
    datasets: [{
        backgroundColor: ['#1a73e8', '#ff9800', '#d32f2f'],
        data: Object.values(summary.value.operatorDist),
        borderWidth: 0
    }]
}))

const barData = computed(() => ({
    labels: financialStats.value?.monthlyTrend.map(c => c.period) || [],
    datasets: [
        {
          label: 'GSM (₺)',
          backgroundColor: '#10b981',
          data: financialStats.value?.monthlyTrend.map(c => c.gsm) || [],
          borderRadius: 4
        },
        {
          label: 'Lisans (₺)',
          backgroundColor: '#1a73e8',
          data: financialStats.value?.monthlyTrend.map(c => c.m365) || [],
          borderRadius: 4
        }
    ]
}))

const companyDoughnutData = computed(() => ({
    labels: financialStats.value?.byCompany.map(c => c.name) || [],
    datasets: [{
        backgroundColor: ['#1a73e8', '#10b981', '#f59e0b', '#3b82f6', '#ef4444'],
        data: financialStats.value?.byCompany.map(c => c.total_amount) || [],
        borderWidth: 0
    }]
}))

const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11, weight: 'bold' } } }
    }
}

onMounted(() => {
    loadReports()
})
</script>

<template>
  <div class="h-full flex flex-col text-gray-900 gap-4">
    <!-- Header -->
    <div class="bg-white border-b border-[#eee] px-6 py-4 flex items-center justify-between shrink-0">
      <div class="flex flex-col border-l-4 border-blue-600 pl-4">
        <h1 class="text-[17px] font-bold text-gray-800 tracking-tight leading-none mb-1">Analiz & Raporlar</h1>
        <span class="text-[11px] font-bold text-gray-400 uppercase tracking-widest leading-none">Hat Dağılımı ve Maliyet Projeksiyonu</span>
      </div>
    </div>

    <!-- Scrollable Content -->
    <div class="flex-1 overflow-y-auto p-4 space-y-4">
      <!-- Stats Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="bg-white p-5 border border-[#eee] transition-none flex items-center gap-4">
              <div class="w-10 h-10 bg-blue-50 text-blue-600 flex items-center justify-center text-lg">
                  <i class="fas fa-sim-card"></i>
              </div>
              <div>
                  <div class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Toplam Hat</div>
                  <div class="text-[20px] font-bold text-gray-900 leading-none">{{ loading ? '-' : summary.totalLines }}</div>
              </div>
          </div>

          <div class="bg-white p-5 border border-[#eee] transition-none flex items-center gap-4">
              <div class="w-10 h-10 bg-green-50 text-green-600 flex items-center justify-center text-lg">
                  <i class="fas fa-check-circle"></i>
              </div>
              <div>
                  <div class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Aktif Hat</div>
                  <div class="text-[20px] font-bold text-gray-900 leading-none">{{ loading ? '-' : summary.activeLines }}</div>
              </div>
          </div>

          <div class="bg-white p-5 border border-[#eee] transition-none flex items-center gap-4">
              <div class="w-10 h-10 bg-gray-50 text-gray-400 flex items-center justify-center text-lg">
                  <i class="fas fa-pause-circle"></i>
              </div>
              <div>
                  <div class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Pasif Hat</div>
                  <div class="text-[20px] font-bold text-gray-900 leading-none">{{ loading ? '-' : summary.passiveLines }}</div>
              </div>
          </div>

          <div class="bg-white p-5 border border-[#eee] transition-none flex items-center gap-4">
              <div class="w-10 h-10 bg-red-50 text-red-500 flex items-center justify-center text-lg">
                  <i class="fas fa-times-circle"></i>
              </div>
              <div>
                  <div class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">İptal Edilmiş</div>
                  <div class="text-[20px] font-bold text-gray-900 leading-none">{{ loading ? '-' : summary.cancelledLines }}</div>
              </div>
          </div>
      </div>

      <!-- Charts Area -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <!-- Total Cost Trend -->
          <div class="bg-white border border-[#eee] flex flex-col h-[400px]">
              <div class="px-5 py-3 border-b border-[#f8f9fa] bg-[#fcfcfc] flex justify-between items-center">
                  <h3 class="text-[11px] font-bold text-gray-900 uppercase tracking-wider">Aylık Toplam Maliyet Trendi</h3>
                  <span class="text-[10px] text-gray-400 font-bold uppercase">Son 12 Ay</span>
              </div>
              <div class="flex-1 p-6">
                  <Bar v-if="!loading" :data="barData" :options="chartOptions" />
                  <div v-else class="h-full flex items-center justify-center text-gray-300 animate-pulse"><i class="fas fa-circle-notch fa-spin text-2xl"></i></div>
              </div>
          </div>

          <!-- Top Spend Personnel -->
          <div class="bg-white border border-[#eee] flex flex-col h-[400px]">
              <div class="px-5 py-3 border-b border-[#f8f9fa] bg-[#fcfcfc]">
                  <h3 class="text-[11px] font-bold text-gray-900 uppercase tracking-wider">En Maliyetli Personeller</h3>
              </div>
              <div class="flex-1 overflow-y-auto p-4">
                  <div v-if="!loading && financialStats?.topPersonnel.length" class="space-y-3">
                      <div v-for="(p, index) in financialStats.topPersonnel" :key="p.id" 
                        class="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100 group">
                        <div class="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-[11px] shrink-0">
                          #{{ index + 1 }}
                        </div>
                        <div class="flex-1 min-w-0">
                           <div class="text-[13px] font-bold text-gray-900 truncate">{{ p.name }}</div>
                           <div class="text-[10px] text-gray-400 font-bold tracking-wide uppercase mt-0.5">Yıllık Toplam Harcama</div>
                        </div>
                        <div class="text-right">
                           <div class="text-[14px] font-bold text-gray-900">{{ formatCurrency(p.total_amount) }}</div>
                           <div class="text-[10px] text-emerald-600 font-bold mt-0.5">Bütçe Kullanımı</div>
                        </div>
                      </div>
                  </div>
                  <div v-else-if="!loading" class="h-full flex flex-col items-center justify-center text-gray-400">
                      <i class="fas fa-search-dollar text-xl mb-2"></i>
                      <span class="text-[11px]">Yeterli veri bulunamadı</span>
                  </div>
              </div>
          </div>

          <!-- Operator Distribution -->
          <div class="bg-white border border-[#eee] flex flex-col h-[400px]">
              <div class="px-5 py-3 border-b border-[#f8f9fa] bg-[#fcfcfc]">
                  <h3 class="text-[11px] font-bold text-gray-900 uppercase tracking-wider">Operatör Dağılımı</h3>
              </div>
              <div class="flex-1 p-6 flex items-center justify-center min-h-0">
                  <Doughnut v-if="!loading" :data="doughnutData" :options="chartOptions" />
              </div>
          </div>

          <!-- Company Distribution -->
          <div class="bg-white border border-[#eee] flex flex-col h-[400px]">
              <div class="px-5 py-3 border-b border-[#f8f9fa] bg-[#fcfcfc]">
                  <h3 class="text-[11px] font-bold text-gray-900 uppercase tracking-wider">Şirket Bazlı Maliyet Dağılımı</h3>
              </div>
              <div class="flex-1 p-6 flex items-center justify-center min-h-0">
                  <Doughnut v-if="!loading" :data="companyDoughnutData" :options="chartOptions" />
              </div>
          </div>
      </div>
    </div>
  </div>
</template>
