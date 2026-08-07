<script setup>
import { computed } from 'vue'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

const modules = [
  {
    title: 'SIM Kart Takip',
    desc: 'M2M, Data ve Ses hatları yönetimi',
    icon: 'fa-sim-card',
    href: '/sim-takip',
    permission: 'sim:view'
  },
  {
    title: 'M365 Lisans Yönetimi',
    desc: 'Yazılım, abonelik ve Graph entegrasyonu',
    icon: 'fa-key',
    href: '/licensing',
    permission: 'm365:view'
  },
  {
    title: 'Envanter & Zimmet Takibi',
    desc: 'Cihaz, donanım envanteri ve zimmetler',
    icon: 'fa-boxes-stacked',
    href: '/inventory',
    permission: 'asset:view'
  },
  {
    title: 'IT Destek Merkezi',
    desc: 'Talep, arıza ve bilet bildirimleri',
    icon: 'fa-headset',
    href: '/helpdesk'
  },
  {
    title: 'İK Bildirimleri',
    desc: 'Personel işe giriş/çıkış talep akışları',
    icon: 'fa-users-gear',
    href: '/hr-requests',
    permission: 'hr:view'
  },
  {
    title: 'Sunucu İzleme',
    desc: 'Altyapı ve sunucu canlı sağlık durumları',
    icon: 'fa-server',
    href: '/monitoring',
    permission: 'monitoring:view'
  },
  {
    title: 'Fatura & Maliyet Yönetimi',
    desc: 'Operatör faturaları ve maliyet yansıtma',
    icon: 'fa-file-invoice-dollar',
    href: '/cost-management',
    permission: 'invoice:view'
  },
  {
    title: 'Personel Aylık Destekler',
    desc: 'Telefon, internet, araç/yakıt bütçesi takibi',
    icon: 'fa-hand-holding-dollar',
    href: '/cost-management/personnel-benefits',
    permission: 'invoice:view'
  },
  {
    title: 'Sistem Master Veri',
    desc: 'Merkezi personel, araç ve organizasyon verileri',
    icon: 'fa-database',
    href: '/master-data',
    adminOnly: true
  },
  {
    title: 'Raporlar & Analiz',
    desc: 'Merkezi analitik ve grafiksel raporlar',
    icon: 'fa-chart-pie',
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
  <div class="px-6 py-8 max-w-6xl mx-auto space-y-8">

    <!-- Karşılama Başlığı -->
    <div>
      <div class="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">IT Yönetim Konsolu</div>
      <h1 class="text-2xl font-bold tracking-tight text-gray-900 dark:text-white mt-1">
        Merhaba {{ authStore.userName.split(' ')[0] }}, bugün ne yapmak istersiniz?
      </h1>
    </div>

    <!-- Modüler Portal Kartları (Sadece Tek Bir Temiz Izgara) -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <router-link
        v-for="m in filteredModules"
        :key="m.title"
        :to="m.href"
        class="group p-4 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start gap-4 hover:border-[#1a73e8] hover:shadow-sm transition-all"
      >
        <div class="w-10 h-10 rounded-lg bg-gray-100 dark:bg-slate-800 flex items-center justify-center shrink-0 text-gray-600 dark:text-slate-400 group-hover:bg-blue-50 group-hover:text-[#1a73e8] transition-colors">
          <i :class="['fas text-base', m.icon]"></i>
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-[14px] font-bold text-gray-900 dark:text-white group-hover:text-[#1a73e8] transition-colors flex items-center justify-between">
            <span>{{ m.title }}</span>
            <i class="fas fa-arrow-right text-xs text-gray-300 dark:text-slate-700 group-hover:text-[#1a73e8] group-hover:translate-x-0.5 transition-all"></i>
          </div>
          <div class="text-[12px] text-gray-500 dark:text-slate-400 mt-1 line-clamp-2">{{ m.desc }}</div>
        </div>
      </router-link>
    </div>

  </div>
</template>
