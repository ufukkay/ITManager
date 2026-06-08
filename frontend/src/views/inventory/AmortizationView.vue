<template>
  <div class="h-full flex flex-col bg-white overflow-hidden">
    <!-- HEADER -->
    <header class="h-14 border-b border-gray-100 flex items-center px-6 gap-4 bg-white shrink-0">
      <div class="flex items-center gap-2 shrink-0">
        <i class="fas fa-chart-pie text-gray-400"></i>
        <h1 class="text-[15px] font-bold text-gray-900">Amortisman & Maliyet Raporu</h1>
      </div>

      <div class="ml-auto text-[11px] text-gray-400">
        Hesaplama tarihi: {{ today }}
      </div>
    </header>

    <!-- KPI Summary -->
    <div class="grid grid-cols-5 gap-px bg-gray-100 border-b border-gray-100 shrink-0">
      <div class="bg-white px-5 py-3 flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50 text-blue-600 text-sm shrink-0">
          <i class="fas fa-laptop"></i>
        </div>
        <div>
          <div class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Toplam Varlık</div>
          <div class="text-[15px] font-black text-gray-900">{{ assets.length }}</div>
        </div>
      </div>
      <div class="bg-white px-5 py-3 flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-50 text-emerald-600 text-sm shrink-0">
          <i class="fas fa-wallet"></i>
        </div>
        <div>
          <div class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Toplam Değer</div>
          <div class="text-[15px] font-black text-gray-900">{{ fmt(totalValue) }}</div>
        </div>
      </div>
      <div class="bg-white px-5 py-3 flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-purple-50 text-purple-600 text-sm shrink-0">
          <i class="fas fa-calendar-alt"></i>
        </div>
        <div>
          <div class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Aylık Amortisman</div>
          <div class="text-[15px] font-black text-gray-900">{{ fmt(totalMonthly) }}</div>
        </div>
      </div>
      <div class="bg-white px-5 py-3 flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-50 text-amber-600 text-sm shrink-0">
          <i class="fas fa-exclamation-triangle"></i>
        </div>
        <div>
          <div class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ömrü Dolmuş</div>
          <div class="text-[15px] font-black text-gray-900">{{ expiredCount }}</div>
        </div>
      </div>
      <div class="bg-white px-5 py-3 flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-rose-50 text-rose-600 text-sm shrink-0">
          <i class="fas fa-hourglass-half"></i>
        </div>
        <div>
          <div class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Son 6 Ay'da Dolacak</div>
          <div class="text-[15px] font-black text-gray-900">{{ soonToExpireCount }}</div>
        </div>
      </div>
    </div>

    <!-- Main Table -->
    <main class="flex-1 overflow-y-auto bg-gray-50/40 p-6">
      <div v-if="loading" class="flex items-center justify-center h-64 text-gray-300">
        <i class="fas fa-circle-notch fa-spin text-3xl"></i>
      </div>

      <div v-else class="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <!-- Filters Row -->
        <div class="px-5 py-3 border-b border-gray-100 flex items-center gap-3 bg-gray-50/30">
          <select v-model="filterStatus" class="h-7 px-2 bg-white border border-gray-200 rounded text-[11.5px] font-medium text-gray-700 outline-none focus:border-blue-500 cursor-pointer">
            <option value="">Tüm Durumlar</option>
            <option value="active">Aktif (Amorti Devam Ediyor)</option>
            <option value="expired">Ömrü Dolmuş</option>
            <option value="soon">Son 6 Ayda Dolacak</option>
          </select>
          <select v-model="filterCategory" class="h-7 px-2 bg-white border border-gray-200 rounded text-[11.5px] font-medium text-gray-700 outline-none focus:border-blue-500 cursor-pointer">
            <option value="">Tüm Kategoriler</option>
            <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
          </select>
          <div class="ml-auto text-[11px] text-gray-400 font-medium">{{ filteredAssets.length }} kayıt gösteriliyor</div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-gray-100 bg-gray-50/50 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                <th class="px-5 py-3">Varlık</th>
                <th class="px-5 py-3">Kategori / Model</th>
                <th class="px-5 py-3">Konum / Kullanıcı</th>
                <th class="px-5 py-3 text-right">Alış Bedeli</th>
                <th class="px-5 py-3 text-right">Alış Tarihi</th>
                <th class="px-5 py-3 text-right">Ömür (Ay)</th>
                <th class="px-5 py-3 text-right">Geçen Ay</th>
                <th class="px-5 py-3 text-right">Kalan Ömür</th>
                <th class="px-5 py-3 text-right">Aylık Amortisman</th>
                <th class="px-5 py-3 text-center">Durum</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
              <tr v-if="filteredAssets.length === 0" class="text-center">
                <td colspan="10" class="py-12 text-gray-400 text-sm">Varlık bulunamadı.</td>
              </tr>
              <tr
                v-for="asset in filteredAssets"
                :key="asset.id"
                class="hover:bg-gray-50/50 transition-colors text-[12px]"
              >
                <td class="px-5 py-3">
                  <div class="font-bold text-gray-900">{{ asset.serial_no }}</div>
                  <div v-if="asset.barcode" class="text-[10px] text-gray-400 mt-0.5">
                    <i class="fas fa-barcode mr-1"></i>{{ asset.barcode }}
                  </div>
                </td>
                <td class="px-5 py-3">
                  <div class="font-semibold text-gray-700">{{ asset.brand_name }} {{ asset.model_name }}</div>
                  <div class="text-[10.5px] text-gray-400">{{ asset.category_name }}</div>
                </td>
                <td class="px-5 py-3">
                  <span v-if="asset.personnel_name" class="text-blue-600 font-medium text-[11.5px]">
                    <i class="fas fa-user mr-1 text-[10px]"></i>{{ asset.personnel_name }}
                  </span>
                  <span v-else-if="asset.location_name" class="text-purple-600 font-medium text-[11.5px]">
                    <i class="fas fa-map-marker-alt mr-1 text-[10px]"></i>{{ asset.location_name }}
                  </span>
                  <span v-else class="text-gray-300 italic text-[11.5px]">Depoda</span>
                </td>
                <td class="px-5 py-3 text-right font-semibold text-gray-900">{{ fmt(asset.purchase_price) }}</td>
                <td class="px-5 py-3 text-right text-gray-500">{{ fmtDate(asset.purchase_date) }}</td>
                <td class="px-5 py-3 text-right text-gray-600">{{ asset.lifetime_months }}</td>
                <td class="px-5 py-3 text-right text-gray-600">{{ getElapsedMonths(asset) }}</td>
                <td class="px-5 py-3 text-right">
                  <span :class="getRemainingClass(asset)" class="font-bold">
                    {{ getRemainingMonths(asset) }}
                  </span>
                </td>
                <td class="px-5 py-3 text-right font-semibold text-gray-900">{{ fmt(getMonthlyCost(asset)) }}</td>
                <td class="px-5 py-3 text-center">
                  <span :class="getLifetimeStatusClass(asset)" class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase">
                    {{ getLifetimeStatus(asset) }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAssetStore } from '../../stores/assetStore'

const assetStore = useAssetStore()
const loading = ref(false)
const filterStatus = ref('')
const filterCategory = ref('')

const today = new Date().toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })
const fmt = (v) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(v || 0)
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('tr-TR') : '—'

const assets = computed(() => assetStore.assets)

const categories = computed(() => [...new Set(assets.value.map(a => a.category_name).filter(Boolean))].sort())

const getElapsedMonths = (asset) => {
  if (!asset.purchase_date) return 0
  const now = new Date()
  const pDate = new Date(asset.purchase_date)
  return Math.max(0, (now.getFullYear() - pDate.getFullYear()) * 12 + (now.getMonth() - pDate.getMonth()))
}

const getRemainingMonths = (asset) => {
  if (!asset.lifetime_months || !asset.purchase_date) return '—'
  const remaining = asset.lifetime_months - getElapsedMonths(asset)
  if (remaining <= 0) return 'Doldu'
  return `${remaining} Ay`
}

const getRemainingClass = (asset) => {
  if (!asset.lifetime_months || !asset.purchase_date) return 'text-gray-300'
  const remaining = asset.lifetime_months - getElapsedMonths(asset)
  if (remaining <= 0) return 'text-red-600'
  if (remaining <= 6) return 'text-amber-600'
  return 'text-emerald-600'
}

const getMonthlyCost = (asset) => {
  const price = asset.purchase_price || 0
  const lifetime = asset.lifetime_months || 60
  if (price <= 0 || !asset.purchase_date) return 0
  const elapsed = getElapsedMonths(asset)
  if (elapsed >= lifetime) return 0
  return price / lifetime
}

const getLifetimeStatus = (asset) => {
  if (!asset.purchase_date || !asset.lifetime_months) return 'Belirsiz'
  const remaining = asset.lifetime_months - getElapsedMonths(asset)
  if (remaining <= 0) return 'Doldu'
  if (remaining <= 6) return 'Yakın'
  return 'Aktif'
}

const getLifetimeStatusClass = (asset) => {
  const status = getLifetimeStatus(asset)
  if (status === 'Doldu') return 'bg-red-100 text-red-700'
  if (status === 'Yakın') return 'bg-amber-100 text-amber-700'
  if (status === 'Aktif') return 'bg-emerald-100 text-emerald-700'
  return 'bg-gray-100 text-gray-500'
}

const totalValue = computed(() => assets.value.reduce((s, a) => s + (a.purchase_price || 0), 0))
const totalMonthly = computed(() => assets.value.reduce((s, a) => s + getMonthlyCost(a), 0))
const expiredCount = computed(() => assets.value.filter(a => {
  if (!a.purchase_date || !a.lifetime_months) return false
  return getElapsedMonths(a) >= a.lifetime_months
}).length)
const soonToExpireCount = computed(() => assets.value.filter(a => {
  if (!a.purchase_date || !a.lifetime_months) return false
  const r = a.lifetime_months - getElapsedMonths(a)
  return r > 0 && r <= 6
}).length)

const filteredAssets = computed(() => {
  return assets.value.filter(a => {
    if (filterCategory.value && a.category_name !== filterCategory.value) return false
    if (filterStatus.value === 'active') {
      const remaining = (a.lifetime_months || 0) - getElapsedMonths(a)
      return remaining > 6
    }
    if (filterStatus.value === 'expired') {
      return getElapsedMonths(a) >= (a.lifetime_months || 0)
    }
    if (filterStatus.value === 'soon') {
      const r = (a.lifetime_months || 0) - getElapsedMonths(a)
      return r > 0 && r <= 6
    }
    return true
  })
})

onMounted(async () => {
  loading.value = true
  try {
    await assetStore.fetchAssets()
  } finally {
    loading.value = false
  }
})
</script>
