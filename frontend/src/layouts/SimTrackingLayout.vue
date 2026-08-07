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
  <div class="flex flex-col h-full overflow-hidden bg-white dark:bg-slate-950">
    <!-- Top Horizontal Browser-style Tab Bar -->
    <div class="px-3 pt-2 bg-[#f8f9fa] dark:bg-slate-900 border-b border-[#dadce0] dark:border-slate-800 shrink-0 flex items-center gap-1.5 overflow-x-auto overflow-y-hidden no-scrollbar">
      <router-link
        v-for="item in [
          { to: '/sim-takip/m2m',   icon: 'fas fa-sim-card',  label: 'M2M Hatları',   count: m2mCount },
          { to: '/sim-takip/data',  icon: 'fas fa-wifi',      label: 'Data Hatları',  count: dataCount },
          { to: '/sim-takip/voice', icon: 'fas fa-phone-alt', label: 'Ses Hatları',   count: voiceCount },
        ]"
        :key="item.to"
        :to="item.to"
        class="flex items-center gap-2 px-4 py-2 text-xs font-semibold transition-all select-none shrink-0 border-t-2"
        :class="isActive(item.to) || (item.to === '/sim-takip/m2m' && $route.path === '/sim-takip')
          ? 'bg-white dark:bg-slate-950 text-[#1a73e8] dark:text-blue-400 border-t-[#1a73e8] border-x border-x-[#dadce0] dark:border-x-slate-800 border-b-transparent shadow-[0_-2px_8px_rgba(0,0,0,0.03)] relative -mb-[1px] z-10 font-bold'
          : 'border-t-transparent text-[#5f6368] dark:text-slate-400 hover:text-[#202124] dark:hover:text-slate-100 hover:bg-[#e8eaed]/70 dark:hover:bg-slate-800/70'"
      >
        <i :class="[item.icon, 'text-[12px]', isActive(item.to) || (item.to === '/sim-takip/m2m' && $route.path === '/sim-takip') ? 'text-[#1a73e8] dark:text-blue-400' : 'text-gray-400']"></i>
        <span>{{ item.label }}</span>
        <span
          v-if="item.count > 0"
          class="px-1.5 py-0.2 rounded-full text-[10px] font-bold"
          :class="isActive(item.to)
            ? 'bg-[#e8f0fe] dark:bg-blue-500/10 text-[#1a73e8] dark:text-blue-400 border border-[#1a73e8]/20'
            : 'bg-[#f1f3f4] dark:bg-slate-800 text-[#5f6368] dark:text-slate-400'"
        >
          {{ item.count }}
        </span>
      </router-link>
    </div>

    <!-- Main Workspace (Full 100% Width) -->
    <main class="flex-1 overflow-y-auto bg-white dark:bg-slate-950 p-0">
      <router-view v-slot="{ Component }">
        <component :is="Component" />
      </router-view>
    </main>
  </div>
</template>
