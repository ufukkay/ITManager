<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import api from '../api'

const servers = ref([])
const selectedServerId = ref(null)
const selectedServer = ref(null)
const isPanelOpen = ref(false)
const isModalOpen = ref(false)
const loading = ref(true)

let pollInterval = null

// Form State
const form = ref({
    name: '',
    ip_address: '',
    os_version: ''
})

const loadServers = async () => {
  try {
    const res = await api.get('/monitoring/api/servers')
    servers.value = res.data
    loading.value = false
    
    // Update selected server data if panel is open
    if (selectedServerId.value) {
        const active = servers.value.find(s => s.id === selectedServerId.value)
        if (active) {
            // Re-fetch detail
            showDetail(active.id, false)
        }
    }
  } catch (err) {
    console.error('Failed to load servers:', err)
    loading.value = false
  }
}

const showDetail = async (id, openPanel = true) => {
  selectedServerId.value = id
  try {
    const res = await api.get(`/monitoring/api/server/${id}`)
    selectedServer.value = res.data
    if (openPanel) isPanelOpen.value = true
  } catch (err) {
    console.error('Failed to show detail:', err)
  }
}

const handleAddServer = async () => {
    try {
        await api.post('/monitoring/api/servers', form.value)
        closeModal()
        await loadServers()
    } catch (err) {
        alert('Hata: Sunucu eklenemedi veya zaten mevcut.')
    }
}

const handleDelete = async (id) => {
    if (!confirm('Bu sunucuyu listeden çıkarmak istediğinize emin misiniz?')) return
    try {
        await api.delete(`/monitoring/api/server/${id}`)
        closePanel()
        await loadServers()
    } catch (err) {
        console.error('Delete failed:', err)
    }
}

const closeModal = () => {
    isModalOpen.value = false
    form.value = { name: '', ip_address: '', os_version: '' }
}

const closePanel = () => {
    isPanelOpen.value = false
    // Delay clearing selected server to allow transition to finish
    setTimeout(() => {
        if (!isPanelOpen.value) selectedServerId.value = null
    }, 400)
}

const getHexClass = (srv) => {
    let status = srv.status
    if (srv.name === 'Local Machine') status += ' online'
    if (srv.cpu_usage > 90 || srv.pending_updates > 5) status = 'critical'
    return status
}

onMounted(() => {
    loadServers()
    pollInterval = setInterval(loadServers, 5000)
})

onUnmounted(() => {
    if (pollInterval) clearInterval(pollInterval)
})
</script>

<template>
  <div class="relative min-h-full">
    <div class="welcome-section mb-8">
      <h1 class="text-3xl font-black mb-2 animate-in fade-in slide-in-from-left">Sunucu İzleme <i class="fas fa-search"></i></h1>
      <p class="text-base-content/60 font-medium max-w-2xl">Dinamik bal peteği paneli ile sistem sağlığını anlık olarak takip edin. Mavi sunucu yerel makinenizdir.</p>
    </div>

    <div class="flex justify-end gap-3 mb-12">
      <a href="/downloads/ITManagerAgent-Setup.zip" class="btn btn-outline" download>
          <i class="fas fa-download"></i> Windows Ajanı İndir
      </a>
      <button @click="isModalOpen = true" class="btn btn-primary shadow-lg shadow-primary/20">
          <i class="fas fa-plus"></i> Yeni Sunucu Ekle
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center py-20">
        <span class="loading loading-dots loading-lg text-primary"></span>
    </div>

    <!-- Honeycomb Grid -->
    <div v-else class="flex flex-wrap gap-4 justify-center md:justify-start">
        <div 
            v-for="srv in servers" 
            :key="srv.id"
            @click="showDetail(srv.id)"
            class="w-32 h-36 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 hover:scale-110 shadow-xl clip-hexagon animate-in zoom-in-50"
            :class="{
                'bg-blue-600 outline-blue-400': getHexClass(srv).includes('online') && srv.name === 'Local Machine',
                'bg-emerald-500 outline-emerald-400': getHexClass(srv).includes('online') && srv.name !== 'Local Machine' && !getHexClass(srv).includes('critical'),
                'bg-rose-500 outline-rose-400 animate-pulse': getHexClass(srv).includes('critical'),
                'bg-base-300 outline-base-content/20 grayscale': getHexClass(srv).includes('offline')
            }"
            style="clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);"
        >
            <div class="text-white text-xs font-extrabold mb-1 text-center px-2 line-clamp-1">{{ srv.name }}</div>
            <div class="text-white text-xl font-black drop-shadow-md">{{ srv.cpu_usage }}%</div>
            <div class="text-white/80 text-[10px] mt-1 font-bold">RAM: {{ srv.ram_usage }}%</div>
        </div>
    </div>

    <!-- Side Panel -->
    <div 
        class="fixed top-0 right-0 h-screen w-full sm:w-[400px] bg-base-100/95 backdrop-blur-xl border-l border-base-200 shadow-2xl z-[100] transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] flex flex-col"
        :class="isPanelOpen ? 'translate-x-0' : 'translate-x-full'"
    >
        <div class="flex justify-between items-center p-6 border-b border-base-200">
            <h3 class="text-xl font-bold">{{ selectedServer?.name || 'Sunucu Detayı' }}</h3>
            <button @click="closePanel" class="btn btn-ghost btn-circle btn-sm">
                <i class="fas fa-times text-lg"></i>
            </button>
        </div>
        
        <div class="flex-1 overflow-y-auto p-6" v-if="selectedServer">
            <!-- Server Info Cards -->
            <div class="bg-base-200/50 p-4 rounded-xl mb-6 space-y-3 font-medium text-sm">
              <div class="flex justify-between border-b border-base-300 pb-2">
                  <span class="text-base-content/60">IP Adresi</span>
                  <span>{{ selectedServer.ip_address }}</span>
              </div>
              <div class="flex justify-between border-b border-base-300 pb-2">
                  <span class="text-base-content/60">İşletim Sistemi</span>
                  <span>{{ selectedServer.os_version || 'Bilinmiyor' }}</span>
              </div>
              <div class="flex justify-between pb-1">
                  <span class="text-base-content/60">Disk Boyutu</span>
                  <span>{{ selectedServer.disk_usage || '--' }}</span>
              </div>
            </div>

            <!-- Resource Progress -->
            <div class="space-y-6">
              <div>
                <div class="flex justify-between text-sm font-bold mb-2">
                  <span>CPU Kullanımı</span>
                  <span class="text-primary">{{ selectedServer.cpu_usage }}%</span>
                </div>
                <progress class="progress progress-primary w-full h-3" :value="selectedServer.cpu_usage" max="100"></progress>
              </div>

              <div>
                <div class="flex justify-between text-sm font-bold mb-2">
                  <span>RAM Kullanımı</span>
                  <span class="text-success">{{ selectedServer.ram_usage }}%</span>
                </div>
                <progress class="progress progress-success w-full h-3" :value="selectedServer.ram_usage" max="100"></progress>
              </div>

              <div class="p-4 rounded-xl border flex items-center justify-between" 
                    :class="selectedServer.pending_updates > 0 ? 'bg-warning/10 border-warning/20' : 'bg-success/5 border-success/10'">
                <span class="font-bold text-sm flex items-center gap-2">
                    <i :class="selectedServer.pending_updates > 0 ? 'fas fa-exclamation-circle text-warning' : 'fas fa-check-circle text-success'"></i>
                    Bekleyen Güncellemeler
                </span>
                <span class="font-black text-lg" :class="selectedServer.pending_updates > 0 ? 'text-warning' : 'text-success'">
                    {{ selectedServer.pending_updates }}
                </span>
              </div>
            </div>

            <div class="text-xs text-center text-base-content/40 mt-8 font-medium">
              Son güncelleme: {{ new Date().toLocaleTimeString() }}
            </div>
        </div>

        <div class="p-6 border-t border-base-200" v-if="selectedServer && selectedServer.name !== 'Local Machine'">
            <button @click="handleDelete(selectedServer.id)" class="btn btn-error btn-outline w-full">
                <i class="fas fa-trash-alt"></i> Sunucuyu Sil
            </button>
        </div>
    </div>
    
    <!-- Backdrop for Panel -->
    <div v-if="isPanelOpen" @click="closePanel" class="fixed inset-0 bg-base-300/20 backdrop-blur-sm z-50"></div>

    <!-- Add Server Modal -->
    <dialog class="modal" :class="{ 'modal-open': isModalOpen }">
        <div class="modal-box p-8">
            <h3 class="font-black text-2xl mb-6">Yeni Sunucu Ekle</h3>
            <form @submit.prevent="handleAddServer" class="space-y-4">
                <div class="form-control">
                    <label class="label font-bold text-sm">Sunucu Adı</label>
                    <input v-model="form.name" type="text" class="input input-bordered focus:input-primary w-full" placeholder="Örn: WEB-SRV-01" required>
                </div>
                <div class="form-control">
                    <label class="label font-bold text-sm">IP Adresi</label>
                    <input v-model="form.ip_address" type="text" class="input input-bordered focus:input-primary w-full" placeholder="10.0.x.x" required>
                </div>
                <div class="form-control">
                    <label class="label font-bold text-sm">OS Sürümü</label>
                    <input v-model="form.os_version" type="text" class="input input-bordered focus:input-primary w-full" placeholder="Windows Server 2022">
                </div>
                <div class="modal-action mt-8">
                    <button type="button" @click="closeModal" class="btn btn-ghost w-1/3">İptal</button>
                    <button type="submit" class="btn btn-primary w-2/3 shadow-lg shadow-primary/20">Kaydet</button>
                </div>
            </form>
        </div>
        <form method="dialog" class="modal-backdrop" @click="closeModal"><button>close</button></form>
    </dialog>
  </div>
</template>

<style scoped>
/* Hexagon hover glow effect */
.clip-hexagon:hover {
    box-shadow: 0 0 25px rgba(59, 130, 246, 0.5); /* Primary glow */
}
</style>
