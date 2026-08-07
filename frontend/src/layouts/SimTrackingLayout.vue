<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '../api'

const route = useRoute()
const isActive = (path) => route.path === path

const m2mCount = ref(0)
const dataCount = ref(0)
const voiceCount = ref(0)

const fetchStats = async () => {
  try {
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
  } catch (err) {
    console.error('SIM stats error:', err)
  }
}

onMounted(fetchStats)
</script>

<template>
  <div class="flex flex-col h-full overflow-hidden bg-[#f8f9fa] dark:bg-slate-950">
    <!-- Clean Minimalist Header -->
    <header class="px-6 py-3 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 shrink-0">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-[#1a73e8] flex items-center justify-center shrink-0 text-sm font-bold">
          <i class="fas fa-sim-card"></i>
        </div>
        <div>
          <h1 class="text-base font-bold text-gray-900 dark:text-white tracking-tight">SIM Kart & Hat Yönetimi</h1>
        </div>
      </div>
    </header>

    <!-- Main Workspace with Sub-Sidebar -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Sub-Sidebar -->
      <aside class="w-52 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 flex flex-col shrink-0">
        <nav class="flex-1 overflow-y-auto p-3 flex flex-col gap-4">

          <!-- Envanter Bölümü -->
          <div>
            <p class="px-3 mb-2 text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Hat Kategorileri</p>
            <div class="flex flex-col gap-1">
              <router-link
                v-for="item in [
                  { to: '/sim-takip/m2m',   icon: 'fa-sim-card',  label: 'M2M Hatları',   count: m2mCount },
                  { to: '/sim-takip/data',  icon: 'fa-wifi',      label: 'Data Hatları',  count: dataCount },
                  { to: '/sim-takip/voice', icon: 'fa-phone-alt', label: 'Ses Hatları',   count: voiceCount },
                ]"
                :key="item.to"
                :to="item.to"
                class="group flex items-center justify-between px-3 py-2 text-xs font-medium transition-colors rounded-lg"
                :class="isActive(item.to)
                  ? 'bg-[#1a73e8] text-white shadow-sm font-semibold'
                  : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'"
              >
                <div class="flex items-center gap-2.5">
                  <i :class="['fas text-xs w-4 text-center', item.icon, isActive(item.to) ? 'text-white' : 'text-gray-500']"></i>
                  <span>{{ item.label }}</span>
                </div>
                <span
                  class="px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors"
                  :class="isActive(item.to)
                    ? 'bg-white/20 text-white'
                    : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400'"
                >
                  {{ item.count }}
                </span>
              </router-link>
            </div>
          </div>

        </nav>
      </aside>

      <!-- Content Area -->
      <main class="flex-1 overflow-y-auto bg-white dark:bg-slate-950 p-0">
        <router-view v-slot="{ Component }">
          <component :is="Component" />
        </router-view>
      </main>
    </div>
  </div>
</template>
