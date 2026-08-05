<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import api from '../api'

const route = useRoute()
const isActive = (path) => route.path === path

const m2mCount = ref(0)
const dataCount = ref(0)
const voiceCount = ref(0)
const totalCost = ref(0)
const activeRatio = ref(0)
const loadingStats = ref(true)

const fetchStats = async () => {
  try {
    loadingStats.value = true
    const [m2mRes, dataRes, voiceRes] = await Promise.all([
      api.get('/sim-takip/api/m2m'),
      api.get('/sim-takip/api/data'),
      api.get('/sim-takip/api/voice')
    ])

    const m2m = Array.isArray(m2mRes.data) ? m2mRes.data : []
    const data = Array.isArray(dataRes.data) ? dataRes.data : []
    const voice = Array.isArray(voiceRes.data) ? voiceRes.data : []

    m2mCount.value = m2m.length
    dataCount.value = data.length
    voiceCount.value = voice.length

    const all = [...m2m, ...data, ...voice]
    const active = all.filter(s => s.status === 'Aktif' || s.status === 'active').length
    activeRatio.value = all.length ? Math.round((active / all.length) * 100) : 0
    totalCost.value = all.reduce((sum, item) => sum + (Number(item.cost_try) || 0), 0)
  } catch (err) {
    console.error('SIM stats error:', err)
  } finally {
    loadingStats.value = false
  }
}

onMounted(fetchStats)
</script>

<template>
  <div class="flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-slate-950">
    <!-- Top KPI & Header Banner -->
    <header class="px-6 py-4 bg-white dark:bg-slate-900 border-b border-gray-200/80 dark:border-slate-800 shrink-0 shadow-sm">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <!-- Title & Subtitle -->
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 shrink-0">
            <i class="fas fa-sim-card text-lg"></i>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-lg font-black text-slate-900 dark:text-white tracking-tight">SIM Kart & Hat Yönetimi</h1>
              <span class="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20">
                Telekom Portal
              </span>
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400 font-medium">M2M, Data ve Ses hatlarının merkezi envanter ve aktarım yönetimi</p>
          </div>
        </div>

        <!-- Top Quick Metrics -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <!-- Total SIM -->
          <div class="px-3.5 py-2 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50 flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold shrink-0">
              <i class="fas fa-microchip"></i>
            </div>
            <div>
              <p class="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Toplam Hat</p>
              <p class="text-sm font-black text-slate-900 dark:text-white tabular-nums">{{ m2mCount + dataCount + voiceCount }}</p>
            </div>
          </div>

          <!-- Active Ratio -->
          <div class="px-3.5 py-2 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50 flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-bold shrink-0">
              <i class="fas fa-signal"></i>
            </div>
            <div>
              <p class="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Aktif Oranı</p>
              <p class="text-sm font-black text-emerald-600 dark:text-emerald-400 tabular-nums">%{{ activeRatio }}</p>
            </div>
          </div>

          <!-- M2M + Data + Voice summary pills -->
          <div class="px-3.5 py-2 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50 flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center text-xs font-bold shrink-0">
              <i class="fas fa-cubes"></i>
            </div>
            <div>
              <p class="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Dağılım</p>
              <p class="text-xs font-bold text-slate-700 dark:text-slate-200 tabular-nums">
                <span title="M2M">{{ m2mCount }}M</span> / <span title="Data">{{ dataCount }}D</span> / <span title="Ses">{{ voiceCount }}S</span>
              </p>
            </div>
          </div>

          <!-- Total Cost -->
          <div class="px-3.5 py-2 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50 flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xs font-bold shrink-0">
              <i class="fas fa-turkish-lira-sign"></i>
            </div>
            <div>
              <p class="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Aylık Maliyet</p>
              <p class="text-sm font-black text-slate-900 dark:text-white tabular-nums">{{ totalCost.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) }} ₺</p>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Workspace with Sub-Sidebar -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Sub-Sidebar -->
      <aside class="w-52 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 flex flex-col shrink-0">
        <nav class="flex-1 overflow-y-auto p-3 flex flex-col gap-5">

          <!-- Envanter Bölümü -->
          <div>
            <p class="px-3 mb-2 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Envanter Kategorileri</p>
            <div class="flex flex-col gap-1">
              <router-link
                v-for="item in [
                  { to: '/sim-takip/m2m',   icon: 'fa-sim-card',  label: 'M2M Hatları',   count: m2mCount,   color: 'text-indigo-500' },
                  { to: '/sim-takip/data',  icon: 'fa-wifi',      label: 'Data Hatları',  count: dataCount,  color: 'text-cyan-500' },
                  { to: '/sim-takip/voice', icon: 'fa-phone-alt', label: 'Ses Hatları',   count: voiceCount, color: 'text-amber-500' },
                ]"
                :key="item.to"
                :to="item.to"
                class="group relative flex items-center justify-between px-3 py-2.5 text-xs font-bold transition-all duration-200 rounded-xl"
                :class="isActive(item.to)
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'"
              >
                <div class="flex items-center gap-2.5">
                  <i :class="['fas text-xs w-4 text-center transition-colors', item.icon, isActive(item.to) ? 'text-white' : item.color]"></i>
                  <span>{{ item.label }}</span>
                </div>
                <span
                  class="px-2 py-0.5 rounded-full text-[10px] font-extrabold transition-colors"
                  :class="isActive(item.to)
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'"
                >
                  {{ item.count }}
                </span>
              </router-link>
            </div>
          </div>

          <!-- Operasyonel İşlemler -->
          <div>
            <p class="px-3 mb-2 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Operasyonel</p>
            <div class="flex flex-col gap-1">
              <router-link
                to="/sim-takip/transfer"
                class="flex items-center justify-between px-3 py-2.5 text-xs font-bold transition-all duration-200 rounded-xl border border-dashed"
                :class="isActive('/sim-takip/transfer')
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-transparent shadow-md shadow-blue-500/20'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-300 dark:hover:border-blue-500/50 hover:bg-blue-50/50 dark:hover:bg-blue-500/5 hover:text-blue-600 dark:hover:text-blue-400'"
              >
                <div class="flex items-center gap-2.5">
                  <i class="fas fa-right-left text-xs w-4 text-center" :class="isActive('/sim-takip/transfer') ? 'text-white' : 'text-blue-500'"></i>
                  <span>Aktarım Merkezi</span>
                </div>
                <i class="fas fa-chevron-right text-[10px] opacity-70"></i>
              </router-link>
            </div>
          </div>

          <!-- Pro Tip box -->
          <div class="mt-auto p-3.5 rounded-2xl bg-gradient-to-b from-blue-50/60 to-indigo-50/60 dark:from-slate-800/80 dark:to-slate-800/40 border border-blue-100/80 dark:border-slate-700/60">
            <div class="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-extrabold text-xs mb-1">
              <i class="fas fa-lightbulb"></i> Hızlı İpucu
            </div>
            <p class="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
              Yeni SIM kart tanımlamak veya sahiplik değiştirmek için Varlık Listesi veya Aktarım Merkezi'ni kullanabilirsiniz.
            </p>
          </div>

        </nav>
      </aside>

      <!-- Content Area -->
      <main class="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-4 md:p-6">
        <router-view v-slot="{ Component }">
          <transition name="fade-slide" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>
  </div>
</template>

<style scoped>
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(4px);
}
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>

