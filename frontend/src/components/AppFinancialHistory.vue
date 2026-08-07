<script setup>
import { ref, onMounted, watch } from 'vue'
import { useMasterDataStore } from '../stores/masterData'

const props = defineProps({
  personnelId: {
    type: [Number, String],
    required: true
  }
})

const masterData = useMasterDataStore()
const history = ref([])
const loading = ref(false)

const fetchHistory = async () => {
  if (!props.personnelId) return
  loading.value = true
  try {
    history.value = await masterData.fetchPersonnelFinancialHistory(props.personnelId)
  } finally {
    loading.value = false
  }
}

onMounted(fetchHistory)
watch(() => props.personnelId, fetchHistory)

const formatCurrency = (val) => {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val)
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2 text-xs font-bold text-[#1a73e8] uppercase tracking-wider">
        <i class="fas fa-chart-line"></i> Maliyet Analizi (Son 12 Ay)
      </div>
    </div>

    <div v-if="loading" class="h-32 flex items-center justify-center text-gray-400 dark:text-slate-500 text-xs font-semibold">
      <i class="fas fa-spinner fa-spin mr-2 text-[#1a73e8]"></i> Maliyet verileri yükleniyor...
    </div>

    <div v-else-if="history.length === 0" class="h-28 flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-gray-200 dark:border-slate-700 text-center p-4">
      <i class="fas fa-file-invoice-dollar text-gray-300 dark:text-slate-600 text-2xl mb-1.5"></i>
      <span class="text-gray-400 dark:text-slate-500 text-xs">Bu personel için henüz maliyet kaydı bulunamadı.</span>
    </div>

    <div v-else class="space-y-4">
      <!-- Clean Mini Bar Chart (Only when >= 2 periods) -->
      <div v-if="history.length >= 2" class="bg-gray-50 dark:bg-slate-900 border border-[#dadce0] dark:border-slate-800 rounded-xl p-4">
        <div class="flex items-end gap-2 h-20 pt-2">
          <div v-for="h in [...history].reverse()" :key="h.period" 
            class="flex-1 group relative flex flex-col items-center justify-end h-full">
            <!-- Tooltip -->
            <div class="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">
              <div class="bg-gray-900 text-white text-[10px] py-1.5 px-2.5 rounded-md whitespace-nowrap shadow-xl">
                <div class="font-bold border-b border-gray-700 pb-1 mb-1">{{ h.period }}</div>
                <div>GSM: {{ formatCurrency(h.gsm_amount) }}</div>
                <div>M365: {{ formatCurrency(h.m365_amount) }}</div>
                <div class="font-bold text-emerald-400 mt-0.5">Toplam: {{ formatCurrency(h.total_amount) }}</div>
              </div>
            </div>
            
            <div class="w-full flex flex-col-reverse gap-0.5 min-h-[4px] max-w-[28px] mx-auto rounded-t overflow-hidden">
              <div :style="{ height: `${(h.m365_amount / Math.max(...history.map(x => x.total_amount || 1))) * 100}%` }" 
                class="w-full bg-emerald-500 transition-all"></div>
              <div :style="{ height: `${(h.gsm_amount / Math.max(...history.map(x => x.total_amount || 1))) * 100}%` }" 
                class="w-full bg-blue-500 transition-all"></div>
            </div>
            <span class="text-[10px] font-semibold text-gray-500 dark:text-slate-400 mt-1.5">{{ h.period }}</span>
          </div>
        </div>
      </div>

      <!-- Data Table -->
      <div class="border border-[#dadce0] dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800 shadow-sm">
        <table class="w-full text-left text-xs border-collapse">
          <thead class="bg-[#f8f9fa] dark:bg-slate-900 border-b border-[#dadce0] dark:border-slate-700 text-[#5f6368] dark:text-slate-400 uppercase text-[10.5px] font-bold">
            <tr>
              <th class="px-4 py-2.5">Dönem</th>
              <th class="px-4 py-2.5">GSM</th>
              <th class="px-4 py-2.5">Lisans (M365)</th>
              <th class="px-4 py-2.5 text-right">Toplam</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-slate-800">
            <tr v-for="h in history" :key="h.period" class="hover:bg-blue-50/40 dark:hover:bg-slate-700/50 transition-colors">
              <td class="px-4 py-2.5 font-bold text-gray-800 dark:text-slate-200">{{ h.period }}</td>
              <td class="px-4 py-2.5 text-blue-600 dark:text-blue-400 font-semibold">{{ formatCurrency(h.gsm_amount) }}</td>
              <td class="px-4 py-2.5 text-emerald-600 dark:text-green-400 font-semibold">{{ formatCurrency(h.m365_amount) }}</td>
              <td class="px-4 py-2.5 text-right font-black text-gray-900 dark:text-slate-100">{{ formatCurrency(h.total_amount) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
