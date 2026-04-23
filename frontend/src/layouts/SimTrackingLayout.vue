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

        <!-- Hatlar -->
        <div>
          <p class="px-3 mb-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Envanter</p>
          <div class="flex flex-col gap-0.5">
            <router-link
              v-for="item in [
                { to: '/sim-takip/m2m',   icon: 'fa-sim-card',  label: 'M2M Hatları' },
                { to: '/sim-takip/data',  icon: 'fa-wifi',      label: 'Data Hatları' },
                { to: '/sim-takip/voice', icon: 'fa-phone-alt', label: 'Ses Hatları' },
              ]"
              :key="item.to"
              :to="item.to"
              class="flex items-center gap-2.5 px-3 py-2.5 text-[13px] font-bold transition-all rounded-xl mx-1"
              :class="isActive(item.to)
                ? 'bg-blue-50 text-blue-600 shadow-sm ring-1 ring-blue-100/50'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'"
            >
              <i class="fas text-[12px] w-4 text-center" :class="item.icon"></i>
              {{ item.label }}
            </router-link>
          </div>
        </div>

        <!-- İşlemler -->
        <div>
          <p class="px-3 mb-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">İşlemler</p>
          <div class="flex flex-col gap-0.5">
            <router-link
              to="/sim-takip/transfer"
              class="flex items-center gap-2.5 px-3 py-2.5 text-[13px] font-bold transition-all rounded-xl mx-1"
              :class="isActive('/sim-takip/transfer')
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'"
            >
              <i class="fas fa-exchange-alt text-[12px] w-4 text-center"></i>
              Aktarım Merkezi
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
