<script setup>
import { computed } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useRoute } from 'vue-router'

const authStore = useAuthStore()
const route = useRoute()

const modules = [
  {
    title: 'Panel',
    shortTitle: 'Panel',
    desc: 'Genel Bakış & Portalı',
    icon: 'fa-[#1a73e8] fa-chart-line',
    faIcon: 'fa-chart-line',
    href: '/',
    active: true
  },
  {
    title: 'SIM Kart Takip',
    shortTitle: 'SIM Kart Takip',
    desc: 'M2M, Data ve Ses hatları',
    icon: 'fa-sim-card',
    faIcon: 'fa-sim-card',
    href: '/sim-takip',
    permission: 'sim:view'
  },
  {
    title: 'M365 Lisans',
    shortTitle: 'M365 Lisans',
    desc: 'Yazılım & Abonelikler',
    icon: 'fa-key',
    faIcon: 'fa-key',
    href: '/licensing',
    permission: 'm365:view'
  },
  {
    title: 'Envanter Takibi',
    shortTitle: 'Envanter',
    desc: 'Cihaz, donanım & zimmet',
    icon: 'fa-boxes-stacked',
    faIcon: 'fa-boxes-stacked',
    href: '/inventory',
    permission: 'asset:view'
  },
  {
    title: 'IT Destek Merkezi',
    shortTitle: 'Helpdesk',
    desc: 'Talep, arıza & istekler',
    icon: 'fa-headset',
    faIcon: 'fa-headset',
    href: '/helpdesk'
  },
  {
    title: 'İK Bildirimleri',
    shortTitle: 'İK Bildirimleri',
    desc: 'Personel giriş/çıkış akışları',
    icon: 'fa-users-gear',
    faIcon: 'fa-users-gear',
    href: '/hr-requests',
    permission: 'hr:view'
  },
  {
    title: 'Sunucu İzleme',
    shortTitle: 'Sunucu İzleme',
    desc: 'Canlı sistem sağlığı',
    icon: 'fa-server',
    faIcon: 'fa-server',
    href: '/monitoring',
    permission: 'monitoring:view'
  },
  {
    title: 'Fatura Yönetimi',
    shortTitle: 'Maliyet Yönetimi',
    desc: 'Fatura & maliyet analizi',
    icon: 'fa-file-invoice-dollar',
    faIcon: 'fa-file-invoice-dollar',
    href: '/cost-management',
    permission: 'invoice:view'
  },
  {
    title: 'Sistem Master Veri',
    shortTitle: 'Master Veri',
    desc: 'Merkezi veri tanımı',
    icon: 'fa-database',
    faIcon: 'fa-database',
    href: '/master-data',
    adminOnly: true
  },
  {
    title: 'Raporlar & Analiz',
    shortTitle: 'Raporlar',
    desc: 'Merkezi analitik raporlar',
    icon: 'fa-chart-pie',
    faIcon: 'fa-chart-pie',
    href: '/reports',
    adminOnly: true
  }
]

const filteredModules = computed(() => {
  return modules.filter(m => {
    if (m.adminOnly && !authStore.isAdmin) return false
    if (m.permission && !authStore.hasPermission(m.permission)) return false
    if (m.allowedRoles && !m.allowedRoles.includes(authStore.userRoleName)) return false
    return true
  })
})
</script>

<template>
  <div class="px-6 py-6 max-w-6xl mx-auto space-y-6">

    <!-- Üst Yatay Modül Seçici Bar (Görseldeki Gibi Chip Bar) -->
    <div class="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none border-b border-gray-200 dark:border-slate-800">
      <router-link
        v-for="m in filteredModules"
        :key="m.title"
        :to="m.href"
        :class="[
          'flex flex-col items-center justify-center p-2.5 min-w-[96px] h-20 rounded-xl border transition-all text-center shrink-0',
          m.href === route.path || (m.href === '/' && route.path === '/')
            ? 'border-[#1a73e8] bg-blue-50/20 text-[#1a73e8] shadow-sm font-semibold'
            : 'border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-400 hover:border-gray-300 hover:text-gray-900 dark:hover:text-white'
        ]"
      >
        <div class="w-7 h-7 rounded-lg flex items-center justify-center mb-1 text-sm" :class="m.href === route.path ? 'bg-blue-50 dark:bg-blue-900/40 text-[#1a73e8]' : 'bg-gray-100 dark:bg-slate-800 text-gray-500'">
          <i :class="['fas', m.faIcon]"></i>
        </div>
        <span class="text-[11.5px] leading-tight truncate max-w-[90px]">{{ m.shortTitle }}</span>
      </router-link>
    </div>

    <!-- Karşılama Başlığı -->
    <div class="pt-2">
      <div class="text-[13px] text-gray-500 dark:text-slate-400 font-medium">Merhaba {{ authStore.userName.split(' ')[0] }},</div>
      <h1 class="text-2xl font-bold tracking-tight text-gray-900 dark:text-white mt-0.5">Bugün nasıl yardımcı olabilirim?</h1>
    </div>

    <!-- Modüler Portal Kartları -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      <router-link
        v-for="m in filteredModules.filter(m => m.href !== '/')"
        :key="m.title"
        :to="m.href"
        class="group p-4 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-3.5 hover:border-blue-500 hover:shadow-sm transition-all"
      >
        <div class="w-10 h-10 rounded-lg bg-gray-100 dark:bg-slate-800 flex items-center justify-center shrink-0 text-gray-600 dark:text-slate-400 group-hover:bg-blue-50 group-hover:text-[#1a73e8] transition-colors">
          <i :class="['fas text-base', m.faIcon]"></i>
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-[14px] font-bold text-gray-900 dark:text-white group-hover:text-[#1a73e8] transition-colors">{{ m.title }}</div>
          <div class="text-[12px] text-gray-500 dark:text-slate-400 truncate mt-0.5">{{ m.desc }}</div>
        </div>
        <i class="fas fa-chevron-right text-xs text-gray-300 dark:text-slate-700 group-hover:text-[#1a73e8] transition-colors"></i>
      </router-link>
    </div>

  </div>
</template>
