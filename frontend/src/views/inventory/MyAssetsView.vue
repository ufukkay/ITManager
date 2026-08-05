<template>
  <div class="h-full flex flex-col bg-white dark:bg-slate-900 overflow-hidden">
    <!-- HEADER -->
    <header class="h-14 border-b border-gray-100 dark:border-slate-700 flex items-center px-6 gap-4 bg-white dark:bg-slate-900 shrink-0">
      <div class="flex items-center gap-2 shrink-0">
        <i class="fas fa-boxes text-blue-500"></i>
        <h1 class="text-[15px] font-bold text-gray-900 dark:text-slate-100">Zimmetlerim</h1>
      </div>

      <div class="ml-auto flex items-center gap-4 text-[12px]">
        <span class="text-gray-400 dark:text-slate-500">
          <span class="font-bold text-emerald-600 dark:text-emerald-400">{{ activeAssets.length }}</span> aktif cihaz
        </span>
      </div>
    </header>

    <!-- MAIN CONTENT -->
    <main class="flex-1 overflow-y-auto bg-gray-50/40 dark:bg-slate-800/40 p-6">
      <div v-if="loading" class="flex items-center justify-center h-64 text-gray-300 dark:text-slate-600">
        <i class="fas fa-circle-notch fa-spin text-3xl"></i>
      </div>

      <div v-else class="max-w-4xl mx-auto">
        <!-- Active Assets -->
        <h2 class="text-sm font-bold text-gray-700 dark:text-slate-300 mb-4 uppercase tracking-wider">Aktif Zimmetlerim</h2>

        <div v-if="activeAssets.length === 0" class="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl p-8 text-center shadow-sm mb-8">
          <i class="fas fa-box-open text-4xl text-gray-200 dark:text-slate-600 mb-3"></i>
          <h3 class="text-gray-900 dark:text-slate-100 font-bold text-sm mb-1">Zimmetli Cihazınız Yok</h3>
          <p class="text-gray-400 dark:text-slate-500 text-xs">Şu anda üzerinize kayıtlı aktif bir envanter bulunmuyor.</p>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div v-for="asset in activeAssets" :key="asset.id" class="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div class="absolute top-0 right-0 w-16 h-16 bg-blue-50 dark:bg-blue-500/10 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>

            <div class="flex justify-between items-start mb-4 relative z-10">
              <div>
                <span class="px-2 py-1 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 rounded text-[10px] font-bold uppercase tracking-wider mb-2 inline-block">
                  {{ asset.category_name }}
                </span>
                <h3 class="font-bold text-gray-900 dark:text-slate-100 text-[15px]">{{ asset.brand_name }} {{ asset.model_name }}</h3>
                <p class="text-gray-400 dark:text-slate-500 text-[11px] mt-0.5"><i class="fas fa-barcode mr-1"></i> {{ asset.serial_no }}</p>
              </div>
              <div class="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <i class="fas fa-check"></i>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-50 dark:border-slate-700 relative z-10">
              <div>
                <div class="text-[10px] text-gray-400 dark:text-slate-500 uppercase font-semibold">Alış Tarihi</div>
                <div class="text-[12px] font-medium text-gray-700 dark:text-slate-300">{{ fmtDate(asset.purchase_date) }}</div>
              </div>
              <div>
                <div class="text-[10px] text-gray-400 dark:text-slate-500 uppercase font-semibold">Durum</div>
                <div class="text-[12px] font-medium text-emerald-600 dark:text-emerald-400">{{ asset.status_name || 'Kullanımda' }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- History Section -->
        <h2 class="text-sm font-bold text-gray-700 dark:text-slate-300 mb-4 uppercase tracking-wider">Zimmet Geçmişim</h2>

        <div v-if="historyLogs.length === 0" class="text-[12px] text-gray-400 dark:text-slate-500 italic">
          Geçmiş bir zimmet kaydınız bulunmuyor.
        </div>

        <div v-else class="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
          <table class="w-full text-left text-[12px]">
            <thead class="bg-gray-50 dark:bg-slate-700/50 text-gray-400 dark:text-slate-500 uppercase text-[9.5px] font-bold border-b border-gray-100 dark:border-slate-700">
              <tr>
                <th class="px-5 py-3">Tarih</th>
                <th class="px-5 py-3">İşlem</th>
                <th class="px-5 py-3">Cihaz</th>
                <th class="px-5 py-3">Seri No</th>
                <th class="px-5 py-3 w-1/3">Not</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50 dark:divide-slate-700">
              <tr v-for="log in historyLogs" :key="log.id" class="hover:bg-gray-50/50 dark:hover:bg-slate-700/50 transition-colors">
                <td class="px-5 py-3 text-gray-500 dark:text-slate-400 font-medium whitespace-nowrap">{{ fmtDateTime(log.created_at) }}</td>
                <td class="px-5 py-3">
                  <span :class="[
                    'px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider',
                    log.action === 'CHECKOUT' ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  ]">
                    {{ log.action === 'CHECKOUT' ? 'ZİMMETLENDİ' : 'İADE EDİLDİ' }}
                  </span>
                </td>
                <td class="px-5 py-3 font-semibold text-gray-700 dark:text-slate-300">{{ log.brand_name }} {{ log.model_name }}</td>
                <td class="px-5 py-3 text-gray-500 dark:text-slate-400 font-mono text-[11px]">{{ log.serial_no }}</td>
                <td class="px-5 py-3 text-gray-500 dark:text-slate-400 italic">{{ log.notes || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAssetStore } from '../../stores/assetStore'

const assetStore = useAssetStore()

const loading = ref(true)
const activeAssets = ref([])
const historyLogs = ref([])

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('tr-TR') : '—'
const fmtDateTime = (d) => {
  if (!d) return '—'
  const date = new Date(d)
  return date.toLocaleDateString('tr-TR') + ' ' + date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
}

onMounted(async () => {
  try {
    const data = await assetStore.fetchMyAssets()
    activeAssets.value = data.active || []
    historyLogs.value = data.history || []
  } catch (err) {
    console.error('Failed to fetch my assets', err)
  } finally {
    loading.value = false
  }
})
</script>
