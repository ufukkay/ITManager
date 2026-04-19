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
import { Bar, Doughnut } from 'vue-chartjs'

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

const summary = ref({
    totalLines: 0,
    activeLines: 0,
    passiveLines: 0,
    cancelledLines: 0,
    operatorDist: {},
    monthlyCosts: []
})

const loading = ref(true)

const loadReports = async () => {
    loading.value = true
    try {
        const res = await api.get('/sim-takip/api/reports/summary')
        summary.value = res.data || {
            totalLines: 154,
            activeLines: 120,
            passiveLines: 14,
            cancelledLines: 20,
            operatorDist: { 'Turkcell': 85, 'Vodafone': 45, 'Türk Telekom': 24 },
            monthlyCosts: [
                { period: '2023-11', amount: 12500 },
                { period: '2023-12', amount: 13200 },
                { period: '2024-01', amount: 11800 },
                { period: '2024-02', amount: 14500 },
                { period: '2024-03', amount: 15100 },
                { period: '2024-04', amount: 14900 }
            ]
        }
    } catch (err) {
        console.error('Failed to load reports summary', err)
        // Fallback for demo
        summary.value = {
            totalLines: 154,
            activeLines: 120,
            passiveLines: 14,
            cancelledLines: 20,
            operatorDist: { 'Turkcell': 85, 'Vodafone': 45, 'Türk Telekom': 24 },
            monthlyCosts: [
                { period: '2023-11', amount: 12500 },
                { period: '2023-12', amount: 13200 },
                { period: '2024-01', amount: 11800 },
                { period: '2024-02', amount: 14500 },
                { period: '2024-03', amount: 15100 },
                { period: '2024-04', amount: 14900 }
            ]
        }
    } finally {
        loading.value = false
    }
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
    labels: summary.value.monthlyCosts.map(c => c.period),
    datasets: [{
        label: 'Aylık Maliyet (₺)',
        backgroundColor: '#1a73e8',
        data: summary.value.monthlyCosts.map(c => c.amount),
        borderRadius: 0
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
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[400px]">
          <div class="bg-white border border-[#eee] flex flex-col overflow-hidden">
              <div class="px-5 py-3 border-b border-[#f8f9fa] bg-[#fcfcfc]">
                  <h3 class="text-[11px] font-bold text-gray-900 uppercase tracking-wider">Operatör Dağılımı</h3>
              </div>
              <div class="flex-1 p-6 flex items-center justify-center min-h-0">
                  <Doughnut v-if="!loading" :data="doughnutData" :options="chartOptions" />
                  <div v-else class="text-gray-300 animate-pulse"><i class="fas fa-circle-notch fa-spin text-2xl"></i></div>
              </div>
          </div>

          <div class="bg-white border border-[#eee] flex flex-col overflow-hidden">
              <div class="px-5 py-3 border-b border-[#f8f9fa] bg-[#fcfcfc]">
                  <h3 class="text-[11px] font-bold text-gray-900 uppercase tracking-wider">Aylık Toplam MaliyetTrendi</h3>
              </div>
              <div class="flex-1 p-6 flex items-center justify-center min-h-0">
                  <Bar v-if="!loading" :data="barData" :options="chartOptions" />
                  <div v-else class="text-gray-300 animate-pulse"><i class="fas fa-circle-notch fa-spin text-2xl"></i></div>
              </div>
          </div>
      </div>
    </div>
  </div>
</template>
