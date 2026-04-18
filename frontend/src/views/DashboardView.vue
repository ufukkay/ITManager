<script setup>
import { computed } from 'vue'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

const modules = [
  {
    title: 'Sunucu İzleme',
    desc: 'Sistem metriklerini ve performansını gerçek zamanlı takip et.',
    icon: 'fa-chart-line',
    href: '/monitoring',
    gradient: 'bg-gradient-to-br from-orange-400 to-yellow-500'
  },
  {
    title: 'Envanter Takibi',
    desc: 'Varlık ve cihaz yönetimini merkezi bir noktadan kontrol et.',
    icon: 'fa-boxes',
    href: '/inventory',
    gradient: 'bg-gradient-to-br from-emerald-400 to-green-600',
    comingSoon: true
  },
  {
    title: 'Maliyet Dağıtımı',
    desc: 'IT harcamalarını ve holding içi maliyet yansıtmalarını yönet.',
    icon: 'fa-file-invoice-dollar',
    href: '/billing',
    gradient: 'bg-gradient-to-br from-indigo-500 to-purple-600',
    comingSoon: true
  },
  {
    title: 'SIM Kart Takip',
    desc: 'Kurumsal SIM hatlarını, operatör bilgilerini ve cihazları düzenle.',
    icon: 'fa-sim-card',
    href: '/sim-takip',
    gradient: 'bg-gradient-to-br from-blue-500 to-cyan-600'
  },
  {
    title: 'IK Bildirimleri',
    desc: 'Personel giriş/çıkış süreçlerini ve donanım taleplerini koordine et.',
    icon: 'fa-user-clock',
    href: '/hr-requests',
    gradient: 'bg-gradient-to-br from-amber-500 to-orange-600'
  },
  {
    title: 'Yetki Yönetimi',
    desc: 'Kullanıcı rollerini ve işlem bazlı yetkileri yapılandır.',
    icon: 'fa-user-shield',
    href: '/admin/permissions',
    gradient: 'bg-gradient-to-br from-rose-500 to-red-600',
    adminOnly: true
  }
]

const filteredModules = computed(() => {
  if (authStore.isAdmin) return modules
  return modules.filter(m => !m.adminOnly)
})
</script>

<template>
  <div class="px-4 py-8 flex flex-col gap-12 max-w-7xl mx-auto">
    <!-- Welcome Section (Still clean and bold) -->
    <div class="border-l-8 border-[#ffb71b] pl-8">
      <h1 class="text-3xl font-black text-gray-900 mb-2 tracking-tighter leading-tight">
        HOŞ GELDİN, {{ authStore.userName.toUpperCase() }}
      </h1>
      <p class="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
        Kurumsal IT Yönetim Paneli
      </p>
    </div>

    <!-- Module List (4-Column Grid) -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <template v-for="module in filteredModules" :key="module.title">
        
        <!-- Active Link -->
        <router-link v-if="!module.comingSoon" :to="module.href" 
           class="group p-6 bg-white border border-gray-100 rounded-xl hover:shadow-md flex flex-col gap-3 relative overflow-hidden">
          <div class="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400 group-hover:text-gray-900 transition-colors">
            <i :class="['fas text-md', module.icon]"></i>
          </div>
          <div>
            <h2 class="text-[15px] font-bold text-gray-900 tracking-tight mb-1">{{ module.title }}</h2>
            <p class="text-[12px] text-gray-500 font-normal leading-snug h-10 overflow-hidden line-clamp-2">{{ module.desc }}</p>
          </div>
          <div class="mt-2 flex items-center gap-2 text-[10px] font-bold text-blue-600 tracking-wide uppercase">
            GÖRÜNTÜLE <i class="fas fa-chevron-right text-[8px]"></i>
          </div>
        </router-link>

        <!-- Coming Soon Element -->
        <div v-else class="p-6 bg-gray-50/50 border border-gray-100 rounded-xl opacity-60 flex flex-col gap-3">
          <div class="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-300">
            <i :class="['fas text-md', module.icon]"></i>
          </div>
          <div>
            <h2 class="text-[15px] font-bold text-gray-400 tracking-tight mb-1">{{ module.title }}</h2>
            <p class="text-[12px] text-gray-300 font-normal leading-snug h-10 overflow-hidden line-clamp-2 italic">{{ module.desc }}</p>
          </div>
          <div class="mt-2 text-[9px] font-bold text-gray-300 tracking-widest uppercase">YAKINDA</div>
        </div>

      </template>
    </div>
  </div>
</template>


