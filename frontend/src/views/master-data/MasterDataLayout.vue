<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const menuSections = [
  {
    title: 'Genel',
    items: [
      { name: 'Kumanda Paneli', icon: 'fa-chart-line', path: '/master-data' }
    ]
  },
  {
    title: 'Sistem Tanımları',
    items: [
      { name: 'Personel Listesi', icon: 'fa-users', path: '/master-data/personnel' },
      { name: 'Organizasyon Yapısı', icon: 'fa-sitemap', path: '/master-data/organization' },
      { name: 'Araç Envanteri', icon: 'fa-truck-moving', path: '/master-data/vehicles' },
      { name: 'Lokasyonlar', icon: 'fa-map-marker-alt', path: '/master-data/locations' },
      { name: 'Sunucu Envanteri', icon: 'fa-server', path: '/master-data/servers' },
      { name: 'SIM Kart Havuzu', icon: 'fa-sim-card', path: '/master-data/sim-cards' },
      { name: 'Operatör & Paketler', icon: 'fa-hand-holding-heart', path: '/master-data/services' },
      { name: 'Yazılım Lisansları', icon: 'fa-key', path: '/master-data/licensing' }
    ]
  }
]

const isActive = (path) => route.path === path
</script>

<template>
  <div class="h-full flex overflow-hidden bg-white">
    <!-- Sidebar -->
    <aside class="w-64 border-r border-gray-100 flex flex-col shrink-0 bg-[#fbfbfb]">
      <div class="p-6 border-b border-gray-100 bg-white">
        <h2 class="text-[14px] font-bold text-gray-900 flex items-center gap-2">
            <i class="fas fa-database text-blue-500"></i>
            Master Veri Konsolu
        </h2>
      </div>

      <nav class="flex-1 overflow-y-auto p-4 space-y-8">
        <div v-for="section in menuSections" :key="section.title" class="space-y-2">
          <div class="px-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest">{{ section.title }}</div>
          <div class="space-y-1">
            <router-link
              v-for="item in section.items"
              :key="item.path"
              :to="item.path"
              class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-bold transition-all group"
              :class="isActive(item.path) 
                ? 'bg-blue-50 text-blue-600 shadow-sm ring-1 ring-blue-100/50' 
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'"
            >
              <i :class="['fas', item.icon, 'w-4 text-center text-[14px]', isActive(item.path) ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-600']"></i>
              {{ item.name }}
            </router-link>
          </div>
        </div>
      </nav>

      <div class="p-6 border-t border-gray-100 bg-white">
          <div class="text-[11px] text-gray-400 leading-relaxed font-medium">
              Bu modüldeki değişiklikler tüm platform genelinde etkili olur.
          </div>
      </div>
    </aside>

    <!-- Content Area -->
    <main class="flex-1 overflow-hidden flex flex-col bg-white">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Custom Scrollbar */
aside::-webkit-scrollbar {
  width: 4px;
}
aside::-webkit-scrollbar-thumb {
  background: #eee;
  border-radius: 4px;
}
</style>
