<template>
  <div class="h-full flex flex-col bg-[#f8f9fa] overflow-hidden">
    <!-- HEADER -->
    <header class="h-12 border-b border-[#dadce0] flex items-center px-6 justify-between bg-white shrink-0 sticky top-0 z-50">
      <h1 class="text-xl font-medium text-[#202124]">Talep Havuzu</h1>
      <div class="flex gap-2">
        <button @click="loadPool" class="h-9 px-4 bg-white text-[#3c4043] text-sm font-medium rounded border border-[#dadce0] hover:bg-[#f1f3f4] transition-colors flex items-center gap-2">
          <i class="fas fa-sync-alt text-xs" :class="{'fa-spin': loading}"></i> Yenile
        </button>
      </div>
    </header>

    <!-- MAIN CONTENT -->
    <main class="flex-1 overflow-y-auto p-6 space-y-6">
      <div v-if="loading" class="flex justify-center items-center h-64 text-gray-300">
        <i class="fas fa-spinner fa-spin text-3xl"></i>
      </div>

      <div v-else class="space-y-6">
        <!-- STATS CARDS -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="bg-white border border-[#dadce0] rounded-md p-5 flex items-center justify-between">
            <div>
              <p class="text-xs font-medium text-[#5f6368] uppercase tracking-wide mb-1">Havuzdaki Talepler</p>
              <p class="text-2xl font-medium text-[#202124]">{{ stats.total }}</p>
            </div>
            <div class="w-10 h-10 bg-[#f1f3f4] rounded-md flex items-center justify-center">
              <i class="fas fa-inbox text-[#5f6368]"></i>
            </div>
          </div>
          <div class="bg-white border border-[#dadce0] rounded-md p-5 flex items-center justify-between">
            <div>
              <p class="text-xs font-medium text-[#5f6368] uppercase tracking-wide mb-1">Açık / Yeni</p>
              <p class="text-2xl font-medium text-[#202124]">{{ stats.open }}</p>
            </div>
            <div class="w-10 h-10 bg-[#fce8e6] rounded-md flex items-center justify-center">
              <i class="fas fa-exclamation-circle text-[#ea4335]"></i>
            </div>
          </div>
          <div class="bg-white border border-[#dadce0] rounded-md p-5 flex items-center justify-between">
            <div>
              <p class="text-xs font-medium text-[#5f6368] uppercase tracking-wide mb-1">Atanmamış</p>
              <p class="text-2xl font-medium text-[#202124]">{{ stats.unassigned }}</p>
            </div>
            <div class="w-10 h-10 bg-[#fef7e0] rounded-md flex items-center justify-center">
              <i class="fas fa-user-slash text-[#fbbc04]"></i>
            </div>
          </div>
          <div class="bg-white border border-[#dadce0] rounded-md p-5 flex items-center justify-between">
            <div>
              <p class="text-xs font-medium text-[#5f6368] uppercase tracking-wide mb-1">İşlemdeki</p>
              <p class="text-2xl font-medium text-[#202124]">{{ stats.inProgress }}</p>
            </div>
            <div class="w-10 h-10 bg-[#e8f0fe] rounded-md flex items-center justify-center">
              <i class="fas fa-tools text-[#1a73e8]"></i>
            </div>
          </div>
        </div>

        <!-- SEARCH & FILTERS -->
        <div class="bg-white border border-[#dadce0] rounded-md p-4 flex flex-col md:flex-row gap-4 items-center">
          <div class="relative flex-1 w-full">
            <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
              <i class="fas fa-search text-xs"></i>
            </span>
            <input v-model="searchQuery" type="text" placeholder="Talep no, konu, personel veya teknisyen ara..." class="w-full h-9 border border-[#dadce0] pl-8 pr-3 rounded text-sm text-[#202124] bg-white outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] transition-colors placeholder-[#9aa0a6]">
          </div>
          <div class="flex flex-wrap gap-3 w-full md:w-auto">
            <select v-model="selectedCategory" class="h-9 border border-[#dadce0] px-3 rounded text-sm text-[#202124] bg-white outline-none focus:border-[#1a73e8] transition-colors">
              <option value="">Kategori: Tümü</option>
              <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
            <select v-model="selectedStatus" class="h-9 border border-[#dadce0] px-3 rounded text-sm text-[#202124] bg-white outline-none focus:border-[#1a73e8] transition-colors">
              <option value="">Durum: Tümü</option>
              <option value="Açık">Açık</option>
              <option value="İşlemde">İşlemde</option>
              <option value="Beklemede">Beklemede</option>
              <option value="Çözüldü">Çözüldü</option>
              <option value="Kapalı">Kapalı</option>
            </select>
            <select v-model="selectedAssignment" class="h-9 border border-[#dadce0] px-3 rounded text-sm text-[#202124] bg-white outline-none focus:border-[#1a73e8] transition-colors">
              <option value="">Atama: Tümü</option>
              <option value="atanmis">Atanmış</option>
              <option value="atanmamis">Atanmamış</option>
            </select>
            <select v-model="sortBy" class="h-9 border border-[#dadce0] px-3 rounded text-sm text-[#202124] bg-white outline-none focus:border-[#1a73e8] transition-colors font-medium">
              <option value="newest">Tarih - En Yeni</option>
              <option value="oldest">Tarih - En Eski</option>
              <option value="priority">Öncelik Sırası</option>
            </select>
          </div>
        </div>

        <!-- LIST CONTAINER -->
        <div v-if="filteredAndSortedTickets.length === 0" class="bg-white border border-[#dadce0] rounded-md p-8 text-center max-w-2xl mx-auto">
          <div class="w-16 h-16 bg-[#f1f3f4] rounded-md flex items-center justify-center mx-auto mb-3">
            <i class="fas fa-check-double text-2xl text-[#9aa0a6]"></i>
          </div>
          <h3 class="text-sm font-medium text-[#202124] mb-1">Gösterilecek talep bulunmuyor</h3>
          <p class="text-xs text-[#5f6368]">Seçilen filtrelerle veya havuzda herhangi bir talep yer almamaktadır.</p>
        </div>

        <div v-else class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          <router-link
            v-for="ticket in filteredAndSortedTickets"
            :key="ticket.id"
            :to="'/helpdesk/ticket/' + ticket.id"
            class="bg-white border border-[#dadce0] rounded-md p-5 hover:border-[#bdc1c6] hover:shadow-sm transition-colors group flex flex-col"
          >
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs font-mono font-medium text-[#5f6368]">{{ ticket.ticket_no }}</span>
              <span class="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded border" :class="getStatusColor(ticket.status).badge">
                {{ ticket.status }}
              </span>
            </div>
            
            <h3 class="font-medium text-[#202124] text-sm leading-snug mb-1 group-hover:text-[#1a73e8] transition-colors">
              {{ ticket.title }}
            </h3>
            
            <div class="text-xs text-[#5f6368] mb-4 line-clamp-2 leading-relaxed">
              {{ ticket.description }}
            </div>

            <div class="mt-auto space-y-2 pt-3 border-t border-[#f1f3f4]">
              <div class="flex items-center justify-between text-xs">
                <span class="text-[#5f6368] font-medium"><i class="fas fa-user mr-1 text-gray-400"></i> Açan</span>
                <span class="text-[#202124] font-medium">{{ ticket.user_name || 'Bilinmiyor' }}</span>
              </div>
              <div class="flex items-center justify-between text-xs">
                <span class="text-[#5f6368] font-medium"><i class="fas fa-user-tie mr-1 text-gray-400"></i> Atanan</span>
                <span v-if="ticket.assigned_name" class="text-[#1a73e8] font-medium">{{ ticket.assigned_name }}</span>
                <span v-else class="text-[#b06000] font-medium italic">Atanmadı</span>
              </div>
              <div class="flex items-center justify-between text-xs">
                <span class="text-[#5f6368] font-medium"><i class="far fa-clock mr-1 text-gray-400"></i> Süre</span>
                <span class="text-[#5f6368] font-normal">{{ getTimeAgo(ticket.created_at) }}</span>
              </div>
            </div>
          </router-link>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import api from '../../api'

const loading = ref(true)
const tickets = ref([])
const categories = ref([])

const searchQuery = ref('')
const selectedCategory = ref('')
const selectedStatus = ref('')
const selectedAssignment = ref('')
const sortBy = ref('newest')

const stats = computed(() => {
  const total = tickets.value.length;
  const open = tickets.value.filter(t => t.status === 'Açık').length;
  const unassigned = tickets.value.filter(t => !t.assigned_name).length;
  const inProgress = tickets.value.filter(t => t.status === 'İşlemde').length;
  return { total, open, unassigned, inProgress };
})

const getStatusColor = (status) => {
  switch (status) {
    case 'Açık': return { badge: 'bg-[#fce8e6] text-[#c5221f] border-[#ea4335]/30' }
    case 'İşlemde': return { badge: 'bg-[#e8f0fe] text-[#1a73e8] border-[#1a73e8]/30' }
    case 'Beklemede': return { badge: 'bg-[#fef7e0] text-[#b06000] border-[#fbbc04]/30' }
    case 'Çözüldü': return { badge: 'bg-[#e6f4ea] text-[#137333] border-[#34a853]/30' }
    case 'Kapalı': return { badge: 'bg-[#f1f3f4] text-[#5f6368] border-[#dadce0]' }
    default: return { badge: 'bg-[#f1f3f4] text-[#5f6368] border-[#dadce0]' }
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

const filteredAndSortedTickets = computed(() => {
  // Filter
  let list = tickets.value.filter(ticket => {
    const searchLower = searchQuery.value.toLowerCase();
    const matchesQuery = !searchQuery.value.trim() || 
      ticket.title.toLowerCase().includes(searchLower) ||
      ticket.ticket_no.toLowerCase().includes(searchLower) ||
      (ticket.description && ticket.description.toLowerCase().includes(searchLower)) ||
      (ticket.user_name && ticket.user_name.toLowerCase().includes(searchLower)) ||
      (ticket.assigned_name && ticket.assigned_name.toLowerCase().includes(searchLower));

    const matchesCategory = !selectedCategory.value || ticket.category_id === parseInt(selectedCategory.value);
    const matchesStatus = !selectedStatus.value || ticket.status === selectedStatus.value;
    
    let matchesAssignment = true;
    if (selectedAssignment.value === 'atanmis') {
      matchesAssignment = !!ticket.assigned_name;
    } else if (selectedAssignment.value === 'atanmamis') {
      matchesAssignment = !ticket.assigned_name;
    }

    return matchesQuery && matchesCategory && matchesStatus && matchesAssignment;
  });

  // Sort
  if (sortBy.value === 'newest') {
    list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  } else if (sortBy.value === 'oldest') {
    list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  } else if (sortBy.value === 'priority') {
    const priorityWeight = { 'Yüksek': 3, 'Normal': 2, 'Düşük': 1 };
    list.sort((a, b) => (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0));
  }

  return list;
})

const loadPool = async () => {
  loading.value = true
  try {
    const [ticketsRes, metaRes] = await Promise.all([
      api.get('/api/helpdesk/pool'),
      api.get('/api/helpdesk/metadata')
    ])
    tickets.value = ticketsRes.data || []
    categories.value = metaRes.data.categories || []
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
