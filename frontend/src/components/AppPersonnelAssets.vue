<script setup>
import { ref, onMounted, watch } from 'vue'
import { useAssetStore } from '../stores/assetStore'

const props = defineProps({
  personnelId: {
    type: [Number, String],
    required: true
  }
})

const assetStore = useAssetStore()
const activeAssets = ref([])
const historyAssets = ref([])
const loading = ref(false)

const formatCurrency = (val) => {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(val || 0)
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('tr-TR')
}

const fetchPersonnelAssets = async () => {
  if (!props.personnelId) return
  loading.value = true
  try {
    const data = await assetStore.fetchPersonnelAssets(props.personnelId)
    activeAssets.value = data.active || []
    historyAssets.value = data.history || []
  } catch (err) {
    console.error('Personnel assets fetch failed:', err)
  } finally {
    loading.value = false
  }
}

onMounted(fetchPersonnelAssets)
watch(() => props.personnelId, fetchPersonnelAssets)
</script>

<template>
  <div class="space-y-6">
    <!-- Active Assets Section -->
    <div>
      <div class="flex items-center gap-2 text-[11px] font-bold text-blue-600 uppercase tracking-wider mb-3">
        <i class="fas fa-desktop"></i> Aktif Zimmetli Cihazlar ({{ activeAssets.length }})
      </div>

      <div v-if="loading" class="h-20 flex items-center justify-center text-gray-400 text-[12px]">
        <i class="fas fa-spinner fa-spin mr-2"></i> Yükleniyor...
      </div>

      <div v-else-if="activeAssets.length === 0" class="h-20 flex items-center justify-center bg-gray-50 rounded-xl border border-dashed border-gray-200 text-gray-400 text-[12px]">
        Aktif zimmetli cihaz bulunmuyor.
      </div>

      <div v-else class="border border-gray-100 rounded-xl overflow-hidden bg-white shadow-sm">
        <table class="w-full text-left text-[12.5px]">
          <thead class="bg-gray-50 text-gray-400 uppercase text-[9.5px] font-bold">
            <tr>
              <th class="px-4 py-2.5">Seri No / Barkod</th>
              <th class="px-4 py-2.5">Cihaz Bilgisi</th>
              <th class="px-4 py-2.5">Alış Bedeli</th>
              <th class="px-4 py-2.5">Alış Tarihi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-for="a in activeAssets" :key="a.id" class="hover:bg-blue-50/20 transition-colors">
              <td class="px-4 py-2.5">
                <div class="font-bold text-gray-900">{{ a.serial_no }}</div>
                <div class="text-[10px] text-gray-400" v-if="a.barcode">{{ a.barcode }}</div>
              </td>
              <td class="px-4 py-2.5 font-medium text-gray-700">
                {{ a.brand_name }} {{ a.model_name }}
                <div class="text-[10px] text-gray-400">{{ a.category_name }}</div>
              </td>
              <td class="px-4 py-2.5 font-semibold">{{ formatCurrency(a.purchase_price) }}</td>
              <td class="px-4 py-2.5 text-gray-500">{{ formatDate(a.purchase_date) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Past Zimmet History Section -->
    <div>
      <div class="flex items-center gap-2 text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-3">
        <i class="fas fa-history"></i> Zimmet & Teslimat Geçmişi ({{ historyAssets.length }})
      </div>

      <div v-if="loading" class="h-20 flex items-center justify-center text-gray-400 text-[12px]">
        <i class="fas fa-spinner fa-spin mr-2"></i> Yükleniyor...
      </div>

      <div v-else-if="historyAssets.length === 0" class="h-20 flex items-center justify-center bg-gray-50 rounded-xl border border-dashed border-gray-200 text-gray-400 text-[12px]">
        Zimmet geçmişi bulunmuyor.
      </div>

      <div v-else class="border border-gray-100 rounded-xl overflow-hidden bg-white shadow-sm max-h-48 overflow-y-auto">
        <table class="w-full text-left text-[12px]">
          <thead class="bg-gray-50 text-gray-400 uppercase text-[9.5px] font-bold sticky top-0">
            <tr>
              <th class="px-4 py-2">Tarih</th>
              <th class="px-4 py-2">Cihaz / Seri No</th>
              <th class="px-4 py-2">İşlem</th>
              <th class="px-4 py-2">Not</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-for="h in historyAssets" :key="h.id" class="hover:bg-gray-50/50 transition-colors">
              <td class="px-4 py-2 text-gray-400 text-[11px]">{{ formatDate(h.created_at) }}</td>
              <td class="px-4 py-2">
                <div class="font-bold text-gray-800 text-[12.5px]">{{ h.serial_no }}</div>
                <div class="text-[10px] text-gray-400">{{ h.brand_name }} {{ h.model_name }}</div>
              </td>
              <td class="px-4 py-2 font-medium">
                <span :class="h.action === 'CHECKOUT' ? 'text-blue-600' : 'text-amber-600'">
                  {{ h.action === 'CHECKOUT' ? 'Teslim Edildi' : 'Geri Alındı (İade)' }}
                </span>
              </td>
              <td class="px-4 py-2 text-gray-500 italic max-w-[200px] truncate" :title="h.notes">{{ h.notes || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
