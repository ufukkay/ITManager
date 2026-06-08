<template>
  <div class="h-full flex flex-col bg-gray-50/50">
    <header class="h-14 border-b border-gray-100 flex items-center px-6 justify-between bg-white shrink-0">
      <h1 class="text-[15px] font-bold text-gray-900">Talep Havuzu</h1>
      <div class="flex gap-2">
        <button @click="loadPool" class="px-3 py-1.5 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 text-[12px] font-semibold transition-colors">
          <i class="fas fa-sync-alt" :class="{'fa-spin': loading}"></i> Yenile
        </button>
      </div>
    </header>

    <main class="flex-1 overflow-y-auto p-6">
      <div v-if="loading" class="flex justify-center items-center h-32 text-gray-400">
        <i class="fas fa-spinner fa-spin text-2xl"></i>
      </div>

      <div v-else-if="tickets.length === 0" class="bg-white border border-gray-100 rounded-xl p-8 text-center shadow-sm max-w-2xl mx-auto">
        <i class="fas fa-check-double text-4xl text-emerald-200 mb-3"></i>
        <h3 class="text-gray-900 font-bold text-sm mb-1">Harika İş Çıkardınız!</h3>
        <p class="text-gray-400 text-xs">Şu anda havuza düşen hiçbir açık talep bulunmuyor.</p>
      </div>

      <div v-else class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        <!-- Tickets -->
        <router-link
          v-for="ticket in tickets"
          :key="ticket.id"
          :to="'/helpdesk/ticket/' + ticket.id"
          class="bg-white border border-gray-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-all group flex flex-col"
        >
          <div class="flex items-center justify-between mb-3">
            <span class="text-[10px] font-mono font-bold text-gray-400">{{ ticket.ticket_no }}</span>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider" :class="getStatusColor(ticket.status).badge">
              {{ ticket.status }}
            </span>
          </div>
          
          <h3 class="font-bold text-gray-900 text-[14px] leading-tight mb-1 group-hover:text-blue-600 transition-colors">
            {{ ticket.title }}
          </h3>
          
          <div class="text-[11px] text-gray-500 mb-4 line-clamp-2 leading-relaxed">
            {{ ticket.description }}
          </div>

          <div class="mt-auto space-y-2 pt-3 border-t border-gray-50">
            <div class="flex items-center justify-between text-[11px]">
              <span class="text-gray-400 font-semibold"><i class="fas fa-user mr-1"></i> Açan</span>
              <span class="text-gray-700 font-bold">{{ ticket.user_name || 'Bilinmiyor' }}</span>
            </div>
            <div class="flex items-center justify-between text-[11px]">
              <span class="text-gray-400 font-semibold"><i class="fas fa-user-tie mr-1"></i> Atanan</span>
              <span v-if="ticket.assigned_name" class="text-blue-600 font-bold">{{ ticket.assigned_name }}</span>
              <span v-else class="text-amber-500 font-bold italic">Atanmadı</span>
            </div>
            <div class="flex items-center justify-between text-[11px]">
              <span class="text-gray-400 font-semibold"><i class="far fa-clock mr-1"></i> Süre</span>
              <span class="text-gray-600 font-medium">{{ getTimeAgo(ticket.created_at) }}</span>
            </div>
          </div>
        </router-link>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../../api'

const loading = ref(true)
const tickets = ref([])

const getStatusColor = (status) => {
  switch (status) {
    case 'Açık': return { badge: 'bg-red-100 text-red-700' }
    case 'İşlemde': return { badge: 'bg-blue-100 text-blue-700' }
    case 'Beklemede': return { badge: 'bg-amber-100 text-amber-700' }
    case 'Çözüldü': return { badge: 'bg-emerald-100 text-emerald-700' }
    case 'Kapalı': return { badge: 'bg-gray-200 text-gray-700' }
    default: return { badge: 'bg-gray-100 text-gray-600' }
  }
}

const getTimeAgo = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const seconds = Math.floor((new Date() - date) / 1000)
  
  let interval = seconds / 86400
  if (interval > 1) return Math.floor(interval) + ' gün önce'
  interval = seconds / 3600
  if (interval > 1) return Math.floor(interval) + ' saat önce'
  interval = seconds / 60
  if (interval > 1) return Math.floor(interval) + ' dk önce'
  return 'Az önce'
}

const loadPool = async () => {
  loading.value = true
  try {
    const res = await api.get('/api/helpdesk/pool')
    tickets.value = res.data || []
  } catch (err) {
    console.error('Havuz yüklenemedi:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadPool()
})
</script>
