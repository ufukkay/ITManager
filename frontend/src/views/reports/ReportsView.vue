<template>
    <div class="h-full flex flex-col bg-white text-gray-900 overflow-hidden">
        
        <!-- HEADER (SIM STYLE) -->
        <header class="h-14 border-b border-gray-100 flex items-center px-6 gap-8 bg-white shrink-0 sticky top-0 z-50">
            <div class="flex items-center gap-2.5 shrink-0">
                <i class="fas fa-chart-pie text-gray-400 text-lg"></i>
                <h1 class="text-[16px] font-bold text-gray-900 tracking-tight">Raporlar & Analiz</h1>
            </div>
            
            <!-- FILTERS BAR -->
            <div class="flex items-center gap-3 ml-4">
                <div class="flex items-center bg-gray-50 rounded border border-gray-100 px-2 h-8">
                    <span class="text-[10px] font-bold text-gray-400 uppercase px-1">Dönem:</span>
                    <select v-model="filter.period" class="bg-transparent text-[12px] font-bold outline-none cursor-pointer pr-2">
                        <option value="">Tüm Zamanlar</option>
                        <option v-for="p in periods" :key="p" :value="p">{{ p }}</option>
                    </select>
                </div>
                <div class="flex items-center bg-gray-50 rounded border border-gray-100 px-2 h-8">
                    <span class="text-[10px] font-bold text-gray-400 uppercase px-1">Operatör:</span>
                    <select v-model="filter.operator" class="bg-transparent text-[12px] font-bold outline-none cursor-pointer pr-2">
                        <option value="">Hepsi</option>
                        <option value="Turkcell">Turkcell</option>
                        <option value="Vodafone">Vodafone</option>
                    </select>
                </div>
            </div>

            <div class="ml-auto flex items-center gap-3">
                <button @click="loadReports" class="btn-refresh" :disabled="loading">
                    <i class="fas fa-sync-alt" :class="{ 'fa-spin': loading }"></i>
                </button>
                <button @click="exportToExcel" class="btn-action-primary">
                    <i class="fas fa-file-excel"></i> Excel Çıktısı
                </button>
            </div>
        </header>

        <!-- SCROLLABLE CONTENT -->
        <main class="flex-1 overflow-y-auto bg-gray-50/30 p-6 space-y-6">
            
            <!-- KPI GRID (MINIMALIST) -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div v-for="card in kpiCards" :key="card.label" class="report-card p-5 flex flex-col justify-between">
                    <div class="flex items-center justify-between mb-4">
                        <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{{ card.label }}</span>
                        <div :class="['w-8 h-8 rounded-lg flex items-center justify-center text-[14px]', card.iconBg, card.iconColor]">
                            <i :class="card.icon"></i>
                        </div>
                    </div>
                    <div>
                        <div class="text-[24px] font-black text-gray-900 leading-none mb-1">{{ card.value }}</div>
                        <div class="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{{ card.subtext }}</div>
                    </div>
                </div>
            </div>

            <!-- CHARTS GRID -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                <!-- MAIN TREND -->
                <div class="lg:col-span-2 report-card flex flex-col h-[350px]">
                    <div class="px-5 py-3 border-b border-gray-50 flex items-center justify-between">
                        <h3 class="text-[12px] font-bold text-gray-800 uppercase tracking-tight">Maliyet Trendi (Trend Analysis)</h3>
                        <div class="flex items-center gap-4">
                            <div class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-blue-500"></span><span class="text-[10px] font-bold text-gray-400">GSM</span></div>
                            <div class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-emerald-500"></span><span class="text-[10px] font-bold text-gray-400">LISANS</span></div>
                        </div>
                    </div>
                    <div class="flex-1 p-5 min-h-0">
                        <Bar v-if="!loading && financialStats" :data="trendData" :options="chartOptions" />
                        <div v-else class="h-full flex items-center justify-center text-gray-200"><i class="fas fa-circle-notch fa-spin text-3xl"></i></div>
                    </div>
                </div>

                <!-- DISTRIBUTION -->
                <div class="report-card flex flex-col h-[350px]">
                    <div class="px-5 py-3 border-b border-gray-50">
                        <h3 class="text-[12px] font-bold text-gray-800 uppercase tracking-tight">Hizmet Kırılımı (Service Mix)</h3>
                    </div>
                    <div class="flex-1 p-5 flex items-center justify-center min-h-0">
                        <Doughnut v-if="!loading && financialStats" :data="serviceTypeData" :options="doughnutOptions" />
                    </div>
                </div>

            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                <!-- TOP PERSONNEL TABLE -->
                <div class="report-card flex flex-col">
                    <div class="px-5 py-3 border-b border-gray-50 bg-gray-50/30 flex items-center justify-between">
                        <h3 class="text-[12px] font-bold text-gray-800 uppercase tracking-tight">En Yüksek Maliyetli Personeller</h3>
                        <span class="px-2 py-0.5 bg-gray-900 text-white text-[9px] font-black rounded uppercase tracking-tighter">Top 10 List</span>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse">
                            <thead>
                                <tr class="border-b border-gray-50">
                                    <th class="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Personel</th>
                                    <th class="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">GSM</th>
                                    <th class="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">LISANS</th>
                                    <th class="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">TOPLAM</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-50">
                                <tr v-for="p in financialStats?.topPersonnel" :key="p.id" class="hover:bg-gray-50 transition-all">
                                    <td class="px-5 py-3">
                                        <div class="flex flex-col">
                                            <span class="text-[12.5px] font-bold text-gray-900">{{ p.name }}</span>
                                            <span class="text-[10px] text-gray-400 font-semibold">{{ p.company_name }}</span>
                                        </div>
                                    </td>
                                    <td class="px-5 py-3 text-right text-[11.5px] font-bold text-gray-600">{{ formatCurrency(p.gsm_total) }}</td>
                                    <td class="px-5 py-3 text-right text-[11.5px] font-bold text-gray-600">{{ formatCurrency(p.m365_total) }}</td>
                                    <td class="px-5 py-3 text-right text-[12.5px] font-black text-gray-900">{{ formatCurrency(p.total_amount) }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- DISTRIBUTION GRID -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="report-card flex flex-col h-[280px]">
                        <div class="px-5 py-3 border-b border-gray-50">
                            <h3 class="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Şirket Bazlı</h3>
                        </div>
                        <div class="flex-1 p-4 flex items-center justify-center min-h-0">
                            <Doughnut v-if="!loading && financialStats" :data="companyData" :options="doughnutOptions" />
                        </div>
                    </div>
                    <div class="report-card flex flex-col h-[280px]">
                        <div class="px-5 py-3 border-b border-gray-50">
                            <h3 class="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Masraf Merkezi</h3>
                        </div>
                        <div class="flex-1 p-4 min-h-0">
                            <Bar v-if="!loading && financialStats" :data="costCenterData" :options="chartOptions" />
                        </div>
                    </div>
                    <div class="report-card col-span-2 p-5 bg-blue-600 text-white flex items-center justify-between">
                        <div class="flex items-center gap-4">
                            <div class="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-xl">
                                <i class="fas fa-lightbulb"></i>
                            </div>
                            <div>
                                <h4 class="text-[14px] font-bold">Maliyet Optimizasyonu Önerisi</h4>
                                <p class="text-[11px] text-blue-100 font-medium">Toplam maliyetlerin %{{ Math.round(((financialStats?.monthlyTrend.slice(-1)[0]?.m365 || 0) / (financialStats?.monthlyTrend.slice(-1)[0]?.amount || 1)) * 100) }}'i lisanslardan oluşuyor. Atanmamış lisansları kontrol edin.</p>
                            </div>
                        </div>
                        <button class="px-4 py-2 bg-white text-blue-600 rounded text-[11px] font-bold hover:bg-blue-50 transition-all uppercase">Detayları Gör</button>
                    </div>
                </div>

            </div>

        </main>

    </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import api from '../../api'
import {
    Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, ArcElement, PointElement, LineElement
} from 'chart.js'
import { Bar, Doughnut } from 'vue-chartjs'
import { useMasterDataStore } from '../../stores/masterData'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, ArcElement, PointElement, LineElement)

const masterData = useMasterDataStore()
const financialStats = ref(null)
const simSummary = ref(null)
const loading = ref(true)

const filter = ref({
    period: '',
    operator: ''
})

const periods = computed(() => {
    if (!financialStats.value) return []
    return [...new Set(financialStats.value.monthlyTrend.map(t => t.period))].reverse()
})

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

const kpiCards = computed(() => [
    { 
        label: 'Toplam Hat', 
        value: simSummary.value?.totalLines || 0, 
        subtext: 'Envanter Toplamı', 
        icon: 'fas fa-sim-card', iconBg: 'bg-blue-50', iconColor: 'text-blue-600' 
    },
    { 
        label: 'Aktif Kullanım', 
        value: simSummary.value?.activeLines || 0, 
        subtext: 'Atanmış & Aktif', 
        icon: 'fas fa-check-circle', iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' 
    },
    { 
        label: 'Aylık Gider', 
        value: formatCurrency(financialStats.value?.monthlyTrend.slice(-1)[0]?.amount || 0), 
        subtext: 'Son Dönem Toplam', 
        icon: 'fas fa-wallet', iconBg: 'bg-slate-50', iconColor: 'text-slate-600' 
    },
    { 
        label: 'Yıllık Projeksiyon', 
        value: formatCurrency((financialStats.value?.monthlyTrend.slice(-1)[0]?.amount || 0) * 12), 
        subtext: 'Mevcut Trend Bazlı', 
        icon: 'fas fa-chart-line', iconBg: 'bg-purple-50', iconColor: 'text-purple-600' 
    }
])

/* --- Charts Config --- */
const trendData = computed(() => ({
    labels: financialStats.value?.monthlyTrend.map(c => c.period) || [],
    datasets: [
        { label: 'GSM', backgroundColor: '#3b82f6', data: financialStats.value?.monthlyTrend.map(c => c.gsm) || [], borderRadius: 2 },
        { label: 'Lisans', backgroundColor: '#10b981', data: financialStats.value?.monthlyTrend.map(c => c.m365) || [], borderRadius: 2 }
    ]
}))

const companyData = computed(() => ({
    labels: financialStats.value?.byCompany.map(c => c.name) || [],
    datasets: [{ backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#f43f5e'], data: financialStats.value?.byCompany.map(c => c.total_amount) || [], borderWidth: 0 }]
}))

const serviceTypeData = computed(() => ({
    labels: financialStats.value?.byServiceType.map(d => `${d.operator} (${d.invoice_type.toUpperCase()})`) || [],
    datasets: [{ backgroundColor: ['#3b82f6', '#60a5fa', '#93c5fd', '#10b981', '#34d399', '#fbbf24'], data: financialStats.value?.byServiceType.map(d => d.amount) || [], borderWidth: 0 }]
}))

const costCenterData = computed(() => ({
    labels: financialStats.value?.byCostCenter.map(c => c.name) || [],
    datasets: [{ label: 'Tutar (₺)', backgroundColor: '#475569', data: financialStats.value?.byCostCenter.map(c => c.amount) || [], borderRadius: 2 }]
}))

const chartOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { 
        y: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 10, weight: '600' }, color: '#94a3b8' } },
        x: { grid: { display: false }, ticks: { font: { size: 10, weight: '600' }, color: '#94a3b8' } }
    }
}

const doughnutOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: 'right', labels: { boxWidth: 8, font: { size: 10, weight: '700' }, padding: 12, usePointStyle: true } } },
    cutout: '75%'
}

const exportToExcel = () => {
    alert('Excel raporu hazırlanıyor... (xlsx kütüphanesi entegrasyonu hazır)')
}

onMounted(() => loadReports())
</script>

<style scoped>
.report-card { @apply bg-white border border-gray-100 rounded-lg shadow-sm shadow-black/[0.01]; }
.btn-action-primary { @apply h-8 px-4 bg-blue-600 text-white rounded text-[11px] font-bold hover:bg-blue-700 transition-all flex items-center gap-2; }
.btn-refresh { @apply w-8 h-8 rounded border border-gray-100 text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center; }
</style>
