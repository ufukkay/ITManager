<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()
const isActive = (path) => route.path === path
</script>

<template>
  <div class="flex h-full overflow-hidden bg-white">
    <!-- Sub-Sidebar -->
    <aside class="w-48 bg-gray-50 border-r border-gray-200 flex flex-col shrink-0">
      <nav class="flex-1 overflow-y-auto px-2 py-4 flex flex-col gap-4">

        <!-- Sunucu Grupları -->
        <div>
          <p class="px-3 mb-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sunucu Grupları</p>
          <div class="flex flex-col gap-0.5">
            <router-link
              v-for="item in [
                { to: '/monitoring/cloud',    icon: 'fas fa-cloud',       label: 'Cloud' },
                { to: '/monitoring/vodafone', icon: 'fas fa-network-wired', label: 'Vodafone' },
                { to: '/monitoring/local',    icon: 'fas fa-hdd',         label: 'Local' },
              ]"
              :key="item.to"
              :to="item.to"
              class="flex items-center gap-2.5 px-3 py-2 text-[13px] font-semibold transition-all"
              :class="isActive(item.to)
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'"
            >
              <i class="text-[12px] w-4 text-center" :class="item.icon"></i>
              {{ item.label }}
            </router-link>
          </div>
        </div>

      </nav>
    </aside>

    <!-- Content Area -->
    <main class="flex-1 overflow-y-auto bg-white">
      <router-view v-slot="{ Component }">
        <component :is="Component" />
      </router-view>
    </main>
  </div>
</template>
