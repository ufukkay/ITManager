<script setup>
import { computed } from 'vue'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

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
    title: 'Maliyet Dağıtımı',
    desc: 'Operatör maliyet yansıtma',
    count: 'Faturalar',
    icon: 'fa-file-invoice-dollar',
    href: '/cost-management'
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
      <div class="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
        <div
          v-for="(a, i) in [
            { t: '3 dk',  icon: 'fa-sim-card',             text: 'SIM Kart · Yeni M2M hattı eklendi',              warn: false },
            { t: '18 dk', icon: 'fa-triangle-exclamation',  text: 'Sistem · Sunucu CPU kritik eşiği aştı',           warn: true  },
            { t: '42 dk', icon: 'fa-user-plus',             text: 'İK · Yeni işe giriş talebi açıldı',               warn: false },
            { t: '1 sa',  icon: 'fa-file-invoice-dollar',   text: 'Otomasyon · Aylık fatura ayrıştırıldı',           warn: false },
            { t: '2 sa',  icon: 'fa-user-shield',           text: 'Yetki · Kullanıcı rolü güncellendi',             warn: false },
          ]"
          :key="i"
          class="flex items-center gap-3 px-4 py-3"
        >
          <div
            class="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
            :class="a.warn ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-500'"
          >
            <i :class="['fas text-[12px]', a.icon]"></i>
          </div>
          <div class="flex-1 text-[13px] text-gray-700">{{ a.text }}</div>
          <div class="text-[12px] text-gray-400 shrink-0">{{ a.t }}</div>
        </div>
      </div>
    </div>

  </div>
</template>
