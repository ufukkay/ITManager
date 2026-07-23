<script setup>
import { ref, onMounted, watch } from 'vue'
import api from '../../api'
import { useToast } from '../../composables/useToast'

const { showToast } = useToast()

const logs = ref([])
const total = ref(0)
const loading = ref(false)

const filters = ref({
  page: 1,
  limit: 15,
  search: '',
  module: '',
  action: ''
})

const modules = [
  { value: 'PERSONNEL', label: 'Personel' },
  { value: 'COMPANY', label: 'Şirket' },
  { value: 'VEHICLE', label: 'Araç' },
  { value: 'LOCATION', label: 'Lokasyon' },
  { value: 'SERVER', label: 'Sunucu' },
  { value: 'SIM_M2M', label: 'M2M Hattı' },
  { value: 'SIM_DATA', label: 'Data Hattı' },
  { value: 'SIM_VOICE', label: 'Ses Hattı' }
]

const actions = [
  { value: 'CREATE', label: 'Ekleme' },
  { value: 'UPDATE', label: 'Güncelleme' },
  { value: 'DELETE', label: 'Silme' },
  { value: 'LOGIN', label: 'Giriş' },
  { value: 'LOGOUT', label: 'Çıkış' }
]

const fetchLogs = async () => {
  loading.value = true
  try {
    const params = {
      page: filters.value.page,
      limit: filters.value.limit,
      search: filters.value.search,
      module: filters.value.module,
      action: filters.value.action
    }
    const response = await api.get('/api/master-data/audit-logs', { params })
    logs.value = response.data.rows || []
    total.value = response.data.total || 0
  } catch (err) {
    console.error('Audit logs error:', err)
    showToast('Aktivite günlükleri yüklenirken hata oluştu.', 'error')
  } finally {
    loading.value = false
  }
}

const getActionBadgeClass = (action) => {
  switch (action) {
    case 'CREATE':
      return 'bg-emerald-50 text-emerald-700 border-emerald-100'
    case 'UPDATE':
      return 'bg-blue-50 text-blue-700 border-blue-100'
    case 'DELETE':
      return 'bg-rose-50 text-rose-700 border-rose-100'
    default:
      return 'bg-gray-50 text-gray-700 border-gray-100'
  }
}

const getActionLabel = (action) => {
  const found = actions.find(a => a.value === action)
  return found ? found.label : action
}

const getModuleLabel = (mod) => {
  const found = modules.find(m => m.value === mod)
  return found ? found.label : mod
}

const selectedLogDetails = ref(null)
const showDetailModal = ref(false)

const openDetails = (log) => {
  try {
    selectedLogDetails.value = log.details ? JSON.parse(log.details) : null
  } catch (e) {
    selectedLogDetails.value = log.details
  }
  showDetailModal.value = true
}

const changePage = (p) => {
  if (p < 1 || p > Math.ceil(total.value / filters.value.limit)) return
  filters.value.page = p
}

watch(
  [() => filters.value.module, () => filters.value.action, () => filters.value.limit],
  () => {
    filters.value.page = 1
    fetchLogs()
  }
)

let searchTimeout = null
watch(
  () => filters.value.search,
  () => {
    filters.value.page = 1
    if (searchTimeout) clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
      fetchLogs()
    }, 400)
  }
)

onMounted(() => {
  fetchLogs()
})
</script>

<template>
  <div class="h-full flex flex-col overflow-hidden bg-white">
    <!-- Header -->
    <header class="h-16 border-b border-gray-100 flex items-center justify-between px-6 bg-white shrink-0">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
          <i class="fas fa-history text-lg"></i>
        </div>
        <div>
          <h1 class="text-[16px] font-bold text-gray-900">Aktivite Günlüğü</h1>
          <p class="text-[11px] text-gray-400 mt-0.5">Sistemde gerçekleştirilen tüm ekleme, silme ve düzenleme hareketleri</p>
        </div>
      </div>
    </header>

    <!-- Filters -->
    <div class="shrink-0 px-6 py-4 border-b border-gray-100 bg-[#fafafa] flex flex-wrap items-center gap-4">
      <!-- Search -->
      <div class="relative w-64">
        <input
          v-model="filters.search"
          type="text"
          placeholder="İşlem veya hedef ara..."
          class="w-full h-9 pl-9 pr-3 text-[13px] border border-gray-200 rounded-lg outline-none focus:border-blue-500 bg-white"
        />
        <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[12px]"></i>
      </div>

      <!-- Module Filter -->
      <select
        v-model="filters.module"
        class="h-9 px-3 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-blue-500 bg-white min-w-[140px]"
      >
        <option value="">Tüm Modüller</option>
        <option v-for="m in modules" :key="m.value" :value="m.value">{{ m.label }}</option>
      </select>

      <!-- Action Filter -->
      <select
        v-model="filters.action"
        class="h-9 px-3 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-blue-500 bg-white min-w-[140px]"
      >
        <option value="">Tüm İşlemler</option>
        <option v-for="a in actions" :key="a.value" :value="a.value">{{ a.label }}</option>
      </select>

      <!-- Sync Button -->
      <button
        @click="fetchLogs"
        class="w-9 h-9 border border-gray-200 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-900 bg-white transition-all hover:bg-gray-50"
        title="Yenile"
      >
        <i class="fas fa-sync-alt" :class="{ 'fa-spin': loading }"></i>
      </button>

      <!-- Results Count -->
      <div class="ml-auto text-[12px] font-medium text-gray-400">
        Toplam <span class="font-bold text-gray-700">{{ total }}</span> aktivite bulundu
      </div>
    </div>

    <!-- Table Container -->
    <div class="flex-1 min-h-0 overflow-y-auto">
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="bg-[#f8f9fa] border-b border-gray-200 text-[11px] font-bold text-gray-400 uppercase tracking-wider sticky top-0 z-10">
            <th class="px-6 py-3.5 text-left font-semibold">Tarih</th>
            <th class="px-6 py-3.5 text-left font-semibold">Kullanıcı</th>
            <th class="px-6 py-3.5 text-left font-semibold">Modül</th>
            <th class="px-6 py-3.5 text-left font-semibold">İşlem</th>
            <th class="px-6 py-3.5 text-left font-semibold">Referans ID</th>
            <th class="px-6 py-3.5 text-left font-semibold">IP Adresi</th>
            <th class="px-6 py-3.5 text-right font-semibold">İşlem Detayı</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-if="loading" class="text-center">
            <td colspan="7" class="py-12 text-gray-400">
              <i class="fas fa-circle-notch fa-spin text-2xl mb-2 text-blue-500"></i>
              <p class="text-xs">Yükleniyor...</p>
            </td>
          </tr>
          <tr v-else-if="logs.length === 0" class="text-center">
            <td colspan="7" class="py-12 text-gray-400 italic text-xs">
              Aktivite kaydı bulunamadı.
            </td>
          </tr>
          <tr v-for="log in logs" :key="log.id" class="hover:bg-gray-50/50 transition-colors">
            <td class="px-6 py-3.5 text-[12.5px] font-mono text-gray-500">
              {{ new Date(log.created_at).toLocaleString('tr-TR') }}
            </td>
            <td class="px-6 py-3.5">
              <div class="font-bold text-gray-900 text-[13px]">{{ log.user_name || 'Sistem' }}</div>
              <div class="text-[11px] text-gray-400 font-medium">{{ log.user_email || 'system@itmanager.com' }}</div>
            </td>
            <td class="px-6 py-3.5 text-[12.5px] font-semibold text-gray-700">
              {{ getModuleLabel(log.module) }}
            </td>
            <td class="px-6 py-3.5">
              <span :class="['inline-flex px-2 py-0.5 rounded-full text-[10.5px] font-bold border', getActionBadgeClass(log.action)]">
                {{ getActionLabel(log.action) }}
              </span>
            </td>
            <td class="px-6 py-3.5 text-[12px] font-mono text-gray-400">
              #{{ log.resource_id || '—' }}
            </td>
            <td class="px-6 py-3.5 text-[12px] font-mono text-gray-500">
              {{ log.ip_address || '—' }}
            </td>
            <td class="px-6 py-3.5 text-right">
              <button
                @click="openDetails(log)"
                class="px-2.5 py-1 text-[11.5px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50/50 hover:bg-blue-50 border border-blue-100/50 rounded transition-all"
              >
                Görüntüle
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination Footer -->
    <div class="shrink-0 h-14 px-6 border-t border-gray-100 flex items-center justify-between bg-white">
      <div class="flex items-center gap-2">
        <span class="text-[12px] text-gray-400">Sayfa başı satır:</span>
        <select v-model="filters.limit" class="h-8 border border-gray-200 rounded text-[12px] px-1 outline-none bg-white font-medium">
          <option :value="15">15</option>
          <option :value="30">30</option>
          <option :value="50">50</option>
        </select>
      </div>

      <div class="flex items-center gap-4">
        <span class="text-[12px] font-semibold text-gray-500">
          {{ (filters.page - 1) * filters.limit + 1 }}-{{ Math.min(filters.page * filters.limit, total) }} / {{ total }}
        </span>
        <div class="flex items-center gap-1">
          <button
            @click="changePage(filters.page - 1)"
            :disabled="filters.page === 1"
            class="w-8 h-8 rounded-lg border border-gray-100 flex items-center justify-center hover:bg-gray-50 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all bg-white"
          >
            <i class="fas fa-chevron-left text-[11px]"></i>
          </button>
          <button
            @click="changePage(filters.page + 1)"
            :disabled="filters.page >= Math.ceil(total / filters.limit)"
            class="w-8 h-8 rounded-lg border border-gray-100 flex items-center justify-center hover:bg-gray-50 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all bg-white"
          >
            <i class="fas fa-chevron-right text-[11px]"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Detail Dialog -->
    <Teleport to="body">
      <div
        v-if="showDetailModal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        @click.self="showDetailModal = false"
      >
        <div class="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col">
          <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <h3 class="text-sm font-bold text-gray-900 flex items-center gap-2">
              <i class="fas fa-info-circle text-blue-500"></i>
              İşlem Veri Detayları
            </h3>
            <button @click="showDetailModal = false" class="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="p-6 flex-1 overflow-y-auto max-h-[60vh] bg-slate-950">
            <pre class="text-[12px] font-mono text-emerald-400 whitespace-pre-wrap leading-relaxed">{{ JSON.stringify(selectedLogDetails, null, 2) }}</pre>
          </div>
          <div class="px-6 py-3.5 border-t border-gray-100 flex justify-end bg-gray-50/50">
            <button
              @click="showDetailModal = false"
              class="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[12px] font-bold shadow-sm transition-all"
            >
              Kapat
            </button>
          </div>
        </div>
      </div>
    </Teleport>
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
</style>
