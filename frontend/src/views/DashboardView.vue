<script setup>
import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useMasterDataStore } from '../stores/masterData'

const authStore = useAuthStore()
const masterData = useMasterDataStore()
const activities = ref([])

onMounted(async () => {
  activities.value = await masterData.fetchAuditLogs(10)
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
    href: '/monitoring'
  },
  {
    title: 'SIM Kart Takip',
    desc: 'M2M, Data ve Ses hatları',
    count: 'Hatlar',
    icon: 'fa-sim-card',
    href: '/sim-takip'
  },
  {
    title: 'İK Bildirimleri',
    desc: 'Personel giriş, çıkış, donanım',
    count: 'Talepler',
    icon: 'fa-user-clock',
    href: '/hr-requests'
  },
  {
    title: 'Yetki Yönetimi',
    desc: 'Kullanıcı ve rol ayarları',
    count: 'Kullanıcılar',
    icon: 'fa-user-shield',
    href: '/admin/permissions',
    adminOnly: true
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
    href: '/master-data'
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
    href: '/reports'
  },
  {
    title: 'Envanter Takibi',
    desc: 'Cihaz ve varlık envanteri',
    count: 'Yakında',
    icon: 'fa-boxes',
    soon: true
  },
]

const filteredModules = computed(() => {
  return modules.filter(m => {
    if (m.adminOnly && !authStore.isAdmin) return false
    if (m.permission && !authStore.hasPermission(m.permission)) return false
    return true
  })
})
</script>

<template>
  <div class="px-8 py-10 max-w-5xl mx-auto">

    <!-- Karşılama -->
    <div class="mb-10">
      <div class="text-[13px] text-gray-500">Merhaba {{ authStore.userName.split(' ')[0] }},</div>
      <h1 class="text-[26px] font-semibold tracking-tight text-gray-900 mt-1">Bugün nasıl yardımcı olabilirim?</h1>
    </div>

    <!-- Modüller -->
    <div class="mb-8">
      <div class="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-3">Modüller</div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">

        <!-- Aktif modül -->
        <router-link
          v-for="m in filteredModules.filter(m => !m.soon)"
          :key="m.title"
          :to="m.href"
          class="group text-left p-4 rounded-xl border border-gray-200 bg-white flex items-center gap-3 hover:border-gray-300 hover:shadow-sm transition-all"
        >
          <div class="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 text-gray-500 group-hover:text-gray-900 transition-colors">
            <i :class="['fas text-[15px]', m.icon]"></i>
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-[14px] font-semibold text-gray-900">{{ m.title }}</div>
            <div class="text-[12px] text-gray-500 truncate">{{ m.desc }}</div>
          </div>
          <div class="text-[11px] font-medium text-gray-500 shrink-0">{{ m.count }}</div>
        </router-link>

        <!-- Yakında -->
        <div
          v-for="m in filteredModules.filter(m => m.soon)"
          :key="m.title"
          class="p-4 rounded-xl border border-gray-100 bg-gray-50 flex items-center gap-3 cursor-not-allowed"
        >
          <div class="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 text-gray-300">
            <i :class="['fas text-[15px]', m.icon]"></i>
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-[14px] font-semibold text-gray-400">{{ m.title }}</div>
            <div class="text-[12px] text-gray-400 truncate">{{ m.desc }}</div>
          </div>
          <div class="text-[11px] font-medium text-gray-400 shrink-0">{{ m.count }}</div>
        </div>

      </div>
    </div>

    <!-- Son Etkinlik -->
    <div>
      <div class="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-3">Son Etkinlik</div>
      <div class="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100 overflow-hidden shadow-sm">
        <div v-if="activities.length === 0" class="p-8 text-center text-gray-400 text-[13px]">
          Henüz bir aktivite kaydı bulunmuyor.
        </div>
        <div
          v-for="(a, i) in activities"
          :key="a.id"
          class="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
        >
          <div
            class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-gray-50 text-gray-500"
          >
            <i :class="['fas text-[12px]', getIcon(a.module)]"></i>
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-[13px] text-gray-700 truncate">{{ formatAction(a) }}</div>
            <div class="text-[11px] text-gray-400">{{ a.user_name || 'Sistem' }} tarafından</div>
          </div>
          <div class="text-[12px] text-gray-400 shrink-0 font-medium">{{ getTimeAgo(a.created_at) }}</div>
        </div>
      </div>
    </div>

  </div>
</template>
