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

const masterData = useMasterDataStore()
const financialStats = ref(null)
const simSummary = ref(null)
const loading = ref(true)

const loadReports = async () => {
    loading.value = true
    try {
        const [simRes, finStats] = await Promise.all([
            api.get('/sim-takip/api/reports/summary'),
            masterData.fetchFinancialStats()
        ])
        simSummary.value = simRes.data
        financialStats.value = finStats
    } catch (err) {
        console.error('Failed to load reports', err)
    } finally {
        loading.value = false
    }
}

const formatCurrency = (val) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val)
}

/* ─── Chart Data ─── */
const trendData = computed(() => ({
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

const companyData = computed(() => ({
    labels: financialStats.value?.byCompany.map(c => c.name) || [],
    datasets: [{
        backgroundColor: ['#1a73e8', '#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6'],
        data: financialStats.value?.byCompany.map(c => c.total_amount) || [],
        borderWidth: 0
    }]
}))

const serviceTypeData = computed(() => {
  const data = financialStats.value?.byServiceType || []
  return {
    labels: data.map(d => `${d.operator} (${d.invoice_type.toUpperCase()})`),
    datasets: [{
      backgroundColor: ['#1a73e8', '#3b82f6', '#60a5fa', '#10b981', '#34d399', '#f59e0b'],
      data: data.map(d => d.amount),
      borderWidth: 0
    }]
  }
})

const costCenterData = computed(() => ({
    labels: financialStats.value?.byCostCenter.map(c => c.name) || [],
    datasets: [{
        label: 'Tutar (₺)',
        backgroundColor: '#6366f1',
        data: financialStats.value?.byCostCenter.map(c => c.amount) || [],
        borderRadius: 4
    }]
}))

const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10, weight: '600' }, padding: 15 } }
    },
    scales: {
      y: { grid: { display: true, color: '#f0f0f0' }, ticks: { font: { size: 10 } } },
      x: { grid: { display: false }, ticks: { font: { size: 10 } } }
    }
}

const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { position: 'right', labels: { boxWidth: 10, font: { size: 10, weight: '600' }, padding: 10 } }
    },
    cutout: '65%'
}

onMounted(() => {
    loadReports()
})
</script>

<template>
    <div class="h-full flex flex-col text-gray-900 bg-gray-50 overflow-hidden">
        <!-- Header -->
        <div class="bg-white border-b border-gray-100 px-8 py-5 flex items-center justify-between shrink-0">
            <div class="flex items-center gap-4">
                <div class="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
                    <i class="fas fa-chart-pie"></i>
                </div>
                <div>
                    <h1 class="text-[18px] font-black text-gray-900 tracking-tight leading-none mb-1">Raporlar & Analiz</h1>
                    <p class="text-[12px] text-gray-400 font-medium">Kurumsal maliyet projeksiyonu ve personel harcama analizleri</p>
                </div>
            </div>
            
            <div class="flex items-center gap-3">
              <button @click="loadReports" class="h-9 px-4 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg text-[12px] font-bold transition-all flex items-center gap-2 border border-gray-100">
                <i class="fas fa-sync-alt" :class="{ 'fa-spin': loading }"></i> Veriyi Tazele
              </button>
            </div>
        </div>

        <!-- Scrollable Content -->
        <div class="flex-1 overflow-y-auto p-8 space-y-8">
            
            <!-- Key Performance Indicators -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between group hover:border-blue-200 transition-all">
                    <div class="flex items-center justify-between mb-4">
                        <span class="text-[10px] font-black text-blue-600 uppercase tracking-widest">Toplam Hat</span>
                        <i class="fas fa-sim-card text-blue-100 text-xl group-hover:text-blue-500 transition-colors"></i>
                    </div>
                    <div class="text-[28px] font-black text-gray-900 leading-none mb-1">{{ loading ? '...' : simSummary?.totalLines || 0 }}</div>
                    <div class="text-[11px] text-gray-400 font-bold">Envanterdeki Toplam SIM</div>
                </div>

                <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between group hover:border-emerald-200 transition-all">
                    <div class="flex items-center justify-between mb-4">
                        <span class="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Aktif Kullanım</span>
                        <i class="fas fa-check-circle text-emerald-100 text-xl group-hover:text-emerald-500 transition-colors"></i>
                    </div>
                    <div class="text-[28px] font-black text-gray-900 leading-none mb-1">{{ loading ? '...' : simSummary?.activeLines || 0 }}</div>
                    <div class="text-[11px] text-gray-400 font-bold">Atanmış ve Aktif Hatlar</div>
                </div>

                <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between group hover:border-orange-200 transition-all">
                    <div class="flex items-center justify-between mb-4">
                        <span class="text-[10px] font-black text-orange-600 uppercase tracking-widest">Yıllık Tahmin</span>
                        <i class="fas fa-calculator text-orange-100 text-xl group-hover:text-orange-500 transition-colors"></i>
                    </div>
                    <div class="text-[24px] font-black text-gray-900 leading-none mb-1">
                      {{ loading ? '...' : formatCurrency((financialStats?.monthlyTrend.slice(-1)[0]?.amount || 0) * 12) }}
                    </div>
                    <div class="text-[11px] text-gray-400 font-bold">Mevcut Trend Üzerinden Yıllık</div>
                </div>

                <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between group hover:border-blue-200 transition-all">
                    <div class="flex items-center justify-between mb-4">
                        <span class="text-[10px] font-black text-blue-600 uppercase tracking-widest">Lisans Payı</span>
                        <i class="fab fa-microsoft text-blue-100 text-xl group-hover:text-blue-500 transition-colors"></i>
                    </div>
                    <div class="text-[28px] font-black text-gray-900 leading-none mb-1">
                      %{{ loading ? '...' : Math.round(((financialStats?.monthlyTrend.slice(-1)[0]?.m365 || 0) / (financialStats?.monthlyTrend.slice(-1)[0]?.amount || 1)) * 100) }}
                    </div>
                    <div class="text-[11px] text-gray-400 font-bold">Toplam Gider İçindeki M365 Oranı</div>
                </div>
            </div>

            <!-- Main Charts Row -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Trend Chart -->
                <div class="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
                    <div class="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
                        <h3 class="text-[13px] font-black text-gray-900 uppercase tracking-wide">Maliyet Trendi ve Kırılımı</h3>
                        <div class="flex items-center gap-3">
                          <div class="flex items-center gap-1.5"><div class="w-2 h-2 rounded-full bg-emerald-500"></div> <span class="text-[10px] font-bold text-gray-400">GSM</span></div>
                          <div class="flex items-center gap-1.5"><div class="w-2 h-2 rounded-full bg-blue-500"></div> <span class="text-[10px] font-bold text-gray-400">Lisans</span></div>
                        </div>
                    </div>
                    <div class="flex-1 p-6 min-h-[300px]">
                        <Bar v-if="!loading" :data="trendData" :options="chartOptions" />
                        <div v-else class="h-full flex items-center justify-center text-gray-200"><i class="fas fa-circle-notch fa-spin text-3xl"></i></div>
                    </div>
                </div>

                <!-- Service Distribution -->
                <div class="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
                    <div class="px-6 py-4 border-b border-gray-50">
                        <h3 class="text-[13px] font-black text-gray-900 uppercase tracking-wide">Hizmet Tipi Dağılımı</h3>
                    </div>
                    <div class="flex-1 p-6 flex items-center justify-center min-h-[300px]">
                        <Doughnut v-if="!loading" :data="serviceTypeData" :options="doughnutOptions" />
                    </div>
                </div>
            </div>

            <!-- Detailed Breakdowns -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- Company & Cost Center -->
                <div class="space-y-6">
                  <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                      <div class="px-6 py-4 border-b border-gray-50">
                          <h3 class="text-[13px] font-black text-gray-900 uppercase tracking-wide">Şirket Bazlı Dağılım</h3>
                      </div>
                      <div class="p-6 h-[250px]">
                          <Doughnut v-if="!loading" :data="companyData" :options="doughnutOptions" />
                      </div>
                  </div>
                  
                  <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                      <div class="px-6 py-4 border-b border-gray-50">
                          <h3 class="text-[13px] font-black text-gray-900 uppercase tracking-wide">Masraf Merkezi Analizi</h3>
                      </div>
                      <div class="p-6 h-[250px]">
                          <Bar v-if="!loading" :data="costCenterData" :options="chartOptions" />
                      </div>
                  </div>
                </div>

                <!-- Personnel Costs Detailed Table -->
                <div class="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
                    <div class="px-6 py-4 border-b border-gray-50 bg-gray-50/30 flex items-center justify-between">
                        <h3 class="text-[13px] font-black text-gray-900 uppercase tracking-wide">En Yüksek Maliyetli Personeller</h3>
                        <span class="text-[10px] font-bold text-gray-400 bg-white px-2 py-1 rounded-md border border-gray-100">TOP 10</span>
                    </div>
                    <div class="flex-1 overflow-x-auto">
                        <table class="w-full text-left border-collapse">
                            <thead>
                                <tr class="bg-gray-50/50">
                                    <th class="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Personel / Şirket</th>
                                    <th class="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 text-right">GSM</th>
                                    <th class="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 text-right">Lisans</th>
                                    <th class="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 text-right">Toplam</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-50">
                                <tr v-for="p in financialStats?.topPersonnel" :key="p.id" class="hover:bg-gray-50/50 transition-colors group">
                                    <td class="px-6 py-4">
                                        <div class="flex flex-col">
                                            <span class="text-[13px] font-bold text-gray-900">{{ p.name }}</span>
                                            <span class="text-[10px] text-gray-400 font-medium">{{ p.company_name }} <span class="mx-1">•</span> {{ p.department_name }}</span>
                                        </div>
                                    </td>
                                    <td class="px-6 py-4 text-right">
                                        <span class="text-[12px] font-bold text-emerald-600">{{ formatCurrency(p.gsm_total) }}</span>
                                    </td>
                                    <td class="px-6 py-4 text-right">
                                        <span class="text-[12px] font-bold text-blue-600">{{ formatCurrency(p.m365_total) }}</span>
                                    </td>
                                    <td class="px-6 py-4 text-right">
                                        <span class="text-[13px] font-black text-gray-900">{{ formatCurrency(p.total_amount) }}</span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        <div v-if="!loading && !financialStats?.topPersonnel.length" class="p-10 text-center text-gray-400 italic text-[13px]">
                          Veri bulunamadı.
                        </div>
                    </div>
                </div>
            </div>

        </div>
    </div>
</template>

<style scoped>
/* Custom Scrollbar for the main content */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; }
::-webkit-scrollbar-thumb:hover { background: #d1d5db; }
</style>
