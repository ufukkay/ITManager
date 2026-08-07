<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const menuSections = [
  {
    title: 'Genel',
    items: [
      { name: 'Kumanda Paneli', icon: 'fa-chart-line', path: '/master-data' },
      { name: 'Sistem Güncellemesi', icon: 'fa-cloud-download-alt', path: '/master-data/system-update' },
      { name: 'Aktivite Günlüğü', icon: 'fa-history', path: '/master-data/audit-logs' }
    ]
  },
  {
    title: 'Sistem Tanımları',
    items: [
      { name: 'Personel Listesi', icon: 'fa-users', path: '/master-data/personnel' },
      { name: 'Organizasyon Yapısı', icon: 'fa-sitemap', path: '/master-data/organization' },
      { name: 'Envanter Tanımları', icon: 'fa-boxes', path: '/master-data/asset-definitions' },
      { name: 'Araç Envanteri', icon: 'fa-truck-moving', path: '/master-data/vehicles' },
      { name: 'Lokasyonlar', icon: 'fa-map-marker-alt', path: '/master-data/locations' },
      { name: 'Sunucu Envanteri', icon: 'fa-server', path: '/master-data/servers' },
      { name: 'Operatör & Paketler', icon: 'fa-hand-holding-heart', path: '/master-data/services' },
      { name: 'Yazılım Lisansları', icon: 'fa-key', path: '/master-data/licensing' },
      { name: 'IT Destek Ayarları', icon: 'fa-headset', path: '/master-data/helpdesk-settings' },
      { name: 'M365 / AD Entegrasyonu', icon: 'fa-sync-alt', path: '/master-data/m365-settings' },
      { name: 'SMTP & Mail Ayarları', icon: 'fa-envelope', path: '/master-data/smtp-settings' }
    ]
  }
]

const isActive = (path) => route.path === path
</script>

<template>
  <div class="flex flex-col h-full overflow-hidden bg-white dark:bg-slate-900">
    <!-- Top Horizontal Browser-style Tab Bar -->
    <div class="px-3 pt-2 bg-[#f8f9fa] dark:bg-slate-900 border-b border-[#dadce0] dark:border-slate-800 shrink-0 flex items-center gap-1.5 overflow-x-auto overflow-y-hidden no-scrollbar">
      <template v-for="section in menuSections" :key="section.title">
        <router-link
          v-for="item in section.items"
          :key="item.path"
          :to="item.path"
          class="flex items-center gap-2 px-4 py-2 text-xs font-semibold transition-all select-none shrink-0 border-t-2"
          :class="isActive(item.path)
            ? 'bg-white dark:bg-slate-900 text-[#1a73e8] dark:text-blue-400 border-t-[#1a73e8] border-x border-x-[#dadce0] dark:border-x-slate-800 border-b-transparent shadow-[0_-2px_8px_rgba(0,0,0,0.03)] relative -mb-[1px] z-10 font-bold'
            : 'border-t-transparent text-[#5f6368] dark:text-slate-400 hover:text-[#202124] dark:hover:text-slate-100 hover:bg-[#e8eaed]/70 dark:hover:bg-slate-800/70'"
        >
          <i :class="['fas', item.icon, 'text-[12px]', isActive(item.path) ? 'text-[#1a73e8] dark:text-blue-400' : 'text-gray-400']"></i>
          <span>{{ item.name }}</span>
        </router-link>
      </template>
    </div>

    <!-- Content Area (Full 100% Width) -->
    <main class="flex-1 overflow-hidden flex flex-col bg-white dark:bg-slate-900 p-0">
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
