<script setup>
import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useMasterDataStore } from '../stores/masterData'

const authStore = useAuthStore()
const masterData = useMasterDataStore()
const activities = ref([])
const stats = ref({
  activeTickets: 0,
  activeAlerts: 0,
  totalMonthlyCost: 0,
  latestPeriod: ''
})

onMounted(async () => {
  activities.value = await masterData.fetchAuditLogs(10)
  const res = await masterData.fetchDashboardStats()
  if (res) {
    stats.value = res
  }
})

const getIcon = (module) => {
  if (module?.includes('SIM')) return 'fa-sim-card'
  if (module?.includes('PERSONNEL')) return 'fa-user-plus'
  if (module?.includes('COMPANY')) return 'fa-building'
  return 'fa-info-circle'
}

const getTimeAgo = (dateStr) => {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  
  if (diffMins < 1) return 'Az önce'
  if (diffMins < 60) return `${diffMins} dk`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours} sa`
  return date.toLocaleDateString('tr-TR')
}

const formatAction = (activity) => {
  const actionMap = {
    'CREATE': 'Eklendi',
    'UPDATE': 'Güncellendi',
    'DELETE': 'Silindi'
  }
  const moduleMap = {
    'SIM_VOICE': 'Ses Hattı',
    'SIM_DATA': 'Data Hattı',
    'SIM_M2M': 'M2M Hattı',
    'PERSONNEL': 'Personel',
    'COMPANY': 'Şirket'
  }
  
  const actionStr = actionMap[activity.action] || activity.action
  const moduleStr = moduleMap[activity.module] || activity.module
  const details = activity.details ? JSON.parse(activity.details) : {}
  const target = details.name || details.phone_no || details.iccid || activity.resource_id || ''
  
  return `${moduleStr} · ${target} ${actionStr}`
}

const modules = [
  {
    title: 'Sunucu İzleme',
    desc: 'Canlı sistem sağlığı',
    count: 'Aktif',
    icon: 'fa-server',
    href: '/monitoring',
    permission: 'monitoring:view'
  },
  {
    title: 'SIM Kart Takip',
    desc: 'M2M, Data ve Ses hatları',
    count: 'Hatlar',
    icon: 'fa-sim-card',
    href: '/sim-takip',
    permission: 'sim:view'
  },
  {
    title: 'İK Bildirimleri',
    desc: 'Personel giriş, çıkış, donanım',
    count: 'Talepler',
    icon: 'fa-user-clock',
    href: '/hr-requests',
    permission: 'hr:view'
  },

  {
    title: 'Lisans Yönetimi',
    desc: 'Yazılım ve abonelik yönetimi',
    count: 'Lisans',
    icon: 'fa-id-badge',
    href: '/licensing',
    permission: 'm365:view'
  },
  {
    title: 'Sistem Master Veri',
    desc: 'Merkezi personel, araç ve operasyon verileri',
    count: 'MDM',
    icon: 'fa-database',
    href: '/master-data',
    adminOnly: true
  },
  {
    title: 'Fatura Yönetimi',
    desc: 'Operatör & M365 maliyet analizi',
    count: 'Faturalar',
    icon: 'fa-file-invoice-dollar',
    href: '/cost-management',
    permission: 'invoice:view'
  },
  {
    title: 'Raporlar & Analiz',
    desc: 'Merkezi raporlama sistemi',
    count: 'Analiz',
    icon: 'fa-chart-pie',
    href: '/reports',
    adminOnly: true
  },
  {
    title: 'Envanter Takibi',
    desc: 'Cihaz, bilgisayar ve BT donanım envanteri',
    count: 'Varlıklar',
    icon: 'fa-boxes',
    href: '/inventory',
    permission: 'asset:view'
  },
  {
    title: 'Zimmetlerim',
    desc: 'Üzerime kayıtlı aktif cihazlar',
    count: 'Zimmetler',
    icon: 'fa-box-open',
    href: '/my-assets',
    allowedRoles: ['Personel', 'Teknisyen']
  },
  {
    title: 'IT Destek Merkezi',
    desc: 'Talep, Arıza ve İstek Bildirimleri',
    count: 'Yardım',
    icon: 'fa-headset',
    href: '/helpdesk'
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
  <div class="px-8 py-10 max-w-5xl mx-auto">

    <!-- Karşılama -->
    <div class="mb-10">
      <div class="text-[13px] text-gray-500 dark:text-gray-400">Merhaba {{ authStore.userName.split(' ')[0] }},</div>
      <h1 class="text-[26px] font-semibold tracking-tight text-gray-900 dark:text-white mt-1">Bugün nasıl yardımcı olabilirim?</h1>
    </div>

    <!-- Analitik KPI Kartları -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
      <!-- Destek Talepleri -->
      <router-link to="/helpdesk" class="group relative overflow-hidden p-6 rounded-2xl border border-gray-200/80 bg-gradient-to-br from-white to-blue-50/20 dark:from-gray-800 dark:to-gray-900/50 dark:border-gray-700/50 hover:border-blue-400 hover:shadow-lg dark:hover:border-blue-500 transition-all duration-300 flex flex-col justify-between h-32">
        <div class="flex items-center justify-between">
          <span class="text-[12px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Açık Destek Talepleri</span>
          <div class="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
            <i class="fas fa-headset text-sm"></i>
          </div>
        </div>
        <div class="flex items-baseline gap-2 mt-2">
          <span class="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{{ stats.activeTickets }}</span>
          <span class="text-[11px] font-medium text-gray-400 dark:text-gray-500">aktif talep</span>
        </div>
      </router-link>

      <!-- Sunucu Alarmları -->
      <router-link to="/monitoring" class="group relative overflow-hidden p-6 rounded-2xl border border-gray-200/80 bg-gradient-to-br from-white to-red-50/20 dark:from-gray-800 dark:to-gray-900/50 dark:border-gray-700/50 hover:border-red-400 hover:shadow-lg dark:hover:border-red-500 transition-all duration-300 flex flex-col justify-between h-32">
        <div class="flex items-center justify-between">
          <span class="text-[12px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Aktif Sistem Alarmları</span>
          <div class="w-8 h-8 rounded-lg bg-red-50 text-red-600 dark:bg-red-900/50 dark:text-red-400 flex items-center justify-center group-hover:scale-110 transition-transform duration-300" :class="{'animate-pulse bg-red-100 dark:bg-red-905': stats.activeAlerts > 0}">
            <i class="fas fa-bell text-sm" :class="{'fa-shake text-red-500': stats.activeAlerts > 0}"></i>
          </div>
        </div>
        <div class="flex items-baseline gap-2 mt-2">
          <span class="text-3xl font-black text-gray-900 dark:text-white tracking-tight" :class="{'text-red-600 dark:text-red-400': stats.activeAlerts > 0}">{{ stats.activeAlerts }}</span>
          <span class="text-[11px] font-medium text-gray-400 dark:text-gray-500">kritik uyarı</span>
        </div>
      </router-link>

      <!-- Aylık Maliyet -->
      <router-link to="/cost-management" class="group relative overflow-hidden p-6 rounded-2xl border border-gray-200/80 bg-gradient-to-br from-white to-emerald-50/20 dark:from-gray-800 dark:to-gray-900/50 dark:border-gray-700/50 hover:border-emerald-400 hover:shadow-lg dark:hover:border-emerald-500 transition-all duration-300 flex flex-col justify-between h-32">
        <div class="flex items-center justify-between">
          <span class="text-[12px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{{ stats.latestPeriod ? stats.latestPeriod + ' Dönemi Maliyeti' : 'Aylık Toplam Maliyet' }}</span>
          <div class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
            <i class="fas fa-file-invoice-dollar text-sm"></i>
          </div>
        </div>
        <div class="flex items-baseline gap-1 mt-2">
          <span class="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{{ (stats.totalMonthlyCost || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }}</span>
          <span class="text-[12px] font-bold text-gray-400 dark:text-gray-500">₺</span>
        </div>
      </router-link>
    </div>

    <!-- Modüller -->
    <div class="mb-8">
      <div class="text-[11px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-semibold mb-3">Modüller</div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">

        <!-- Aktif modül -->
        <router-link
          v-for="m in filteredModules.filter(m => !m.soon)"
          :key="m.title"
          :to="m.href"
          class="group text-left p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center gap-3 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm transition-all"
        >
          <div class="w-10 h-10 rounded-lg bg-gray-50 dark:bg-gray-750 flex items-center justify-center shrink-0 text-gray-500 dark:text-gray-450 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
            <i :class="['fas text-[15px]', m.icon]"></i>
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-[14px] font-semibold text-gray-900 dark:text-white">{{ m.title }}</div>
            <div class="text-[12px] text-gray-500 dark:text-gray-400 truncate">{{ m.desc }}</div>
          </div>
          <div class="text-[11px] font-medium text-gray-500 dark:text-gray-450 shrink-0">{{ m.count }}</div>
        </router-link>

        <!-- Yakında -->
        <div
          v-for="m in filteredModules.filter(m => m.soon)"
          :key="m.title"
          class="p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 flex items-center gap-3 cursor-not-allowed"
        >
          <div class="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-900 flex items-center justify-center shrink-0 text-gray-300 dark:text-gray-700">
            <i :class="['fas text-[15px]', m.icon]"></i>
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-[14px] font-semibold text-gray-400 dark:text-gray-600">{{ m.title }}</div>
            <div class="text-[12px] text-gray-400 dark:text-gray-600 truncate">{{ m.desc }}</div>
          </div>
          <div class="text-[11px] font-medium text-gray-400 dark:text-gray-600 shrink-0">{{ m.count }}</div>
        </div>

      </div>
    </div>

    <!-- Son Etkinlik -->
    <div>
      <div class="text-[11px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-semibold mb-3">Son Etkinlik</div>
      <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl divide-y divide-gray-100 dark:divide-gray-700 overflow-hidden shadow-sm">
        <div v-if="activities.length === 0" class="p-8 text-center text-gray-400 dark:text-gray-500 text-[13px]">
          Henüz bir aktivite kaydı bulunmuyor.
        </div>
        <div
          v-for="(a, i) in activities"
          :key="a.id"
          class="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
        >
          <div
            class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-gray-50 dark:bg-gray-750 text-gray-500 dark:text-gray-450"
          >
            <i :class="['fas text-[12px]', getIcon(a.module)]"></i>
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-[13px] text-gray-700 dark:text-gray-200 truncate">{{ formatAction(a) }}</div>
            <div class="text-[11px] text-gray-400 dark:text-gray-550">{{ a.user_name || 'Sistem' }} tarafından</div>
          </div>
          <div class="text-[12px] text-gray-400 dark:text-gray-500 shrink-0 font-medium">{{ getTimeAgo(a.created_at) }}</div>
        </div>
      </div>
    </div>

  </div>
</template>
