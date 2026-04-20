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
      <div class="flex items-center gap-2 text-[11px] font-bold text-blue-600 uppercase tracking-wider">
        <i class="fas fa-chart-line"></i> Maliyet Analizi (Son 12 Ay)
      </div>
    </div>

    <div v-if="loading" class="h-32 flex items-center justify-center text-gray-400 text-[12px]">
      <i class="fas fa-spinner fa-spin mr-2"></i> Veriler yükleniyor...
    </div>

    <div v-else-if="history.length === 0" class="h-32 flex flex-col items-center justify-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
      <i class="fas fa-file-invoice-dollar text-gray-300 text-xl mb-2"></i>
      <span class="text-gray-400 text-[12px]">Bu personel için henüz maliyet kaydı bulunamadı.</span>
    </div>

    <div v-else class="space-y-3">
      <!-- Mini Chart Visualization -->
      <div class="flex items-end gap-1.5 h-24 px-2 pt-4">
        <div v-for="h in [...history].reverse()" :key="h.period" 
          class="flex-1 group relative flex flex-col items-center">
          <!-- Tooltip -->
          <div class="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
            <div class="bg-gray-900 text-white text-[10px] py-1 px-2 rounded whitespace-nowrap shadow-xl">
              {{ h.period }}: {{ formatCurrency(h.total_amount) }}
              <div class="text-[9px] text-gray-400">GSM: {{ formatCurrency(h.gsm_amount) }}</div>
              <div class="text-[9px] text-gray-400">M365: {{ formatCurrency(h.m365_amount) }}</div>
            </div>
          </div>
          
          <div class="w-full flex flex-col-reverse gap-0.5 min-h-[4px]">
            <div :style="{ height: `${(h.m365_amount / Math.max(...history.map(x => x.total_amount))) * 100}%` }" 
              class="w-full bg-blue-400 rounded-sm opacity-80 group-hover:opacity-100 transition-all"></div>
            <div :style="{ height: `${(h.gsm_amount / Math.max(...history.map(x => x.total_amount))) * 100}%` }" 
              class="w-full bg-emerald-400 rounded-sm opacity-80 group-hover:opacity-100 transition-all"></div>
          </div>
          <span class="text-[8px] text-gray-400 mt-2 rotate-45 origin-left whitespace-nowrap">{{ h.period }}</span>
        </div>
      </div>

      <!-- Data Table -->
      <div class="mt-8 border border-gray-100 rounded-xl overflow-hidden bg-white shadow-sm">
        <table class="w-full text-left text-[12px]">
          <thead class="bg-gray-50 text-gray-400 uppercase text-[10px] font-bold">
            <tr>
              <th class="px-4 py-2">Dönem</th>
              <th class="px-4 py-2">GSM</th>
              <th class="px-4 py-2">Lisans (M365)</th>
              <th class="px-4 py-2 text-right">Toplam</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-for="h in history" :key="h.period" class="hover:bg-blue-50/30 transition-colors">
              <td class="px-4 py-2 font-medium text-gray-700">{{ h.period }}</td>
              <td class="px-4 py-2 text-emerald-600 font-medium">{{ formatCurrency(h.gsm_amount) }}</td>
              <td class="px-4 py-2 text-blue-600 font-medium">{{ formatCurrency(h.m365_amount) }}</td>
              <td class="px-4 py-2 text-right font-bold text-gray-900">{{ formatCurrency(h.total_amount) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
