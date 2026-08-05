<script setup>
import { ref, onMounted } from 'vue'
import { useMasterDataStore } from '../stores/masterData'

const props = defineProps({
  module: { type: String, required: true },
  resourceId: { type: [String, Number], required: true },
  title: { type: String, default: 'Düzenleme Geçmişi' }
})

const emit = defineEmits(['close'])

const masterData = useMasterDataStore()
const history = ref([])
const loading = ref(true)

const keyMap = {
  iccid: 'ICCID',
  phone_no: 'Telefon No',
  operator: 'Operatör',
  personnel_id: 'Personel ID',
  company_id: 'Şirket ID',
  department_id: 'Departman ID',
  status: 'Durum',
  notes: 'Notlar',
  package_id: 'Paket ID',
  location_id: 'Lokasyon ID',
  vehicle_id: 'Araç ID',
  plate_no: 'Plaka',
  device_info: 'Cihaz Bilgisi',
  last_usage_date: 'Son Kullanım',
  quota_gb: 'Kota (GB)'
}

onMounted(async () => {
  loading.value = true
  history.value = await masterData.fetchResourceHistory(props.module, props.resourceId)
  loading.value = false
})

const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getActionBadgeClass = (action) => {
  const map = {
    'CREATE': 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20',
    'UPDATE': 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-500/20',
    'DELETE': 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-100 dark:border-red-500/20'
  }
  return map[action] || 'bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-slate-300 border-gray-100 dark:border-slate-600'
}

const getActionDotClass = (action) => {
  const map = { 'CREATE': 'bg-emerald-500', 'UPDATE': 'bg-blue-500', 'DELETE': 'bg-red-500' }
  return map[action] || 'bg-gray-400'
}

const parseDetails = (details) => {
  try {
    return typeof details === 'string' ? JSON.parse(details) : details
  } catch (e) {
    return null
  }
}

const formatValue = (key, val) => {
  if (val === null || val === undefined || val === '') return '—'
  return val
}

const generateSummary = (item) => {
  if (item.action === 'CREATE') return 'Sisteme yeni kayıt eklendi.'
  if (item.action === 'DELETE') return 'Kayıt sistemden silindi.'
  
  const details = parseDetails(item.details)
  if (!details) return 'Kayıt güncellendi.'

  const keys = Object.keys(details)
  
  if (keys.length === 1) {
    const key = keys[0]
    if (key === 'status') return `Hat durumu "${details.status}" olarak güncellendi.`
    if (key === 'personnel_id') return 'Hat başka bir personele atandı.'
    if (key === 'package_id') return 'Paket/Tarife değişikliği yapıldı.'
    if (key === 'notes') return 'Notlar güncellendi.'
    if (key === 'location_id') return 'Cihaz lokasyonu değiştirildi.'
    if (key === 'vehicle_id' || key === 'plate_no') return 'Araç/Plaka ataması güncellendi.'
  }

  if (keys.includes('personnel_id') && keys.includes('status')) return 'Personel ataması ve durum değişikliği yapıldı.'
  if (keys.includes('package_id')) return 'Paket değişikliği ve diğer bilgiler güncellendi.'
  
  return 'Kayıt bilgileri güncellendi.'
}
</script>

<template>
  <div class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" @click.self="emit('close')">
    <div class="bg-white dark:bg-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
      <!-- Header -->
      <div class="px-6 py-5 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between bg-gray-50/50 dark:bg-slate-900/50">
        <div>
          <h2 class="text-[17px] font-bold text-gray-900 dark:text-slate-100">{{ title }}</h2>
          <p class="text-[12px] text-gray-400 dark:text-slate-500 mt-1 flex items-center gap-2">
            <span class="px-1.5 py-0.5 bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-slate-300 rounded text-[10px] font-bold">ID: {{ resourceId }}</span>
            <span class="w-1 h-1 rounded-full bg-gray-300 dark:bg-slate-600"></span>
            <span>Modül: {{ module }}</span>
          </p>
        </div>
        <button @click="emit('close')" class="text-gray-400 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-200 w-9 h-9 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center justify-center transition-all">
          <i class="fas fa-times text-[18px]"></i>
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-6 bg-gray-50/30 dark:bg-slate-900/30">
        <div v-if="loading" class="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-slate-500">
          <div class="w-12 h-12 border-4 border-blue-100 dark:border-blue-500/20 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin mb-4"></div>
          <span class="text-[14px] font-medium">Geçmiş yükleniyor...</span>
        </div>

        <div v-else-if="history.length === 0" class="text-center py-20">
          <div class="w-20 h-20 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <i class="fas fa-history text-[32px] text-gray-300 dark:text-slate-500"></i>
          </div>
          <p class="text-[14px] text-gray-500 dark:text-slate-400 font-medium">Bu kayıt için henüz bir geçmiş bulunmuyor.</p>
        </div>

        <div v-else class="relative space-y-6 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-blue-100 dark:before:from-blue-500/20 before:via-blue-50 dark:before:via-blue-500/10 before:to-transparent">
          <div v-for="item in history" :key="item.id" class="relative flex items-start gap-6 group">
            <!-- Dot -->
            <div class="absolute left-0 mt-2 w-10 flex justify-center z-10">
              <div class="w-4 h-4 rounded-full border-4 border-white dark:border-slate-800 shadow-md transition-transform group-hover:scale-125"
                :class="getActionDotClass(item.action)"></div>
            </div>

            <div class="flex-1 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-5 shadow-sm ml-10 transition-shadow hover:shadow-md">
              <div class="flex items-center justify-between mb-3">
                <span class="px-2.5 py-0.5 rounded-lg text-[10px] font-bold border uppercase tracking-wider" :class="getActionBadgeClass(item.action)">
                  {{ item.action }}
                </span>
                <span class="text-[11px] text-gray-400 dark:text-slate-500 font-bold bg-gray-50 dark:bg-slate-700 px-2 py-1 rounded-md">{{ formatDate(item.created_at) }}</span>
              </div>

              <div class="text-[13px] text-gray-800 dark:text-slate-100 font-bold mb-1 flex items-center gap-2">
                <div class="w-6 h-6 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 text-[10px]">
                  <i class="fas fa-user"></i>
                </div>
                {{ item.user_name || 'Sistem' }}
              </div>

              <!-- Action Summary -->
              <div class="text-[13px] text-blue-600 dark:text-blue-400 font-bold mt-2 mb-3 bg-blue-50/50 dark:bg-blue-500/10 p-2 rounded-lg border border-blue-100/50 dark:border-blue-500/20">
                <i class="fas fa-info-circle mr-1.5"></i>
                {{ generateSummary(item) }}
              </div>

              <!-- Details Grid -->
              <div v-if="parseDetails(item.details)" class="mt-4 border-t border-gray-50 dark:border-slate-700 pt-4">
                <div class="grid grid-cols-1 gap-2">
                  <div v-for="(val, key) in parseDetails(item.details)" :key="key"
                    class="flex items-center justify-between py-1.5 px-3 rounded-lg bg-gray-50/50 dark:bg-slate-900/50 border border-gray-100/50 dark:border-slate-700">
                    <span class="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-tight">{{ keyMap[key] || key }}</span>
                    <span class="text-[12px] font-bold text-gray-700 dark:text-slate-300">{{ formatValue(key, val) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="px-6 py-4 border-t border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/50 flex justify-end">
        <button @click="emit('close')" class="px-8 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 text-[13px] font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 hover:border-gray-300 dark:hover:border-slate-600 transition-all shadow-sm">
          Kapat
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.max-h-\[85vh\] {
  max-height: 85vh;
}
</style>
