<template>
  <div class="h-full flex flex-col bg-gray-50/50 overflow-hidden">
    <!-- HEADER -->
    <header class="h-14 border-b border-gray-100 flex items-center px-6 gap-4 bg-white shrink-0">
      <div class="flex items-center gap-2 shrink-0">
        <i class="fas fa-sitemap text-blue-600"></i>
        <h1 class="text-[15px] font-bold text-gray-900">Yapısal Envanter Kumanda Matrisi</h1>
      </div>

      <div class="ml-auto flex items-center gap-2">
        <RouterLink to="/inventory/assets" class="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5">
          <i class="fas fa-boxes"></i> Envanter Listesine Git
        </RouterLink>
        <button @click="fetchMatrix" class="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5">
          <i class="fas fa-sync-alt" :class="{ 'fa-spin': loading }"></i> Yenile
        </button>
      </div>
    </header>

    <!-- MAIN DASHBOARD CONTENT -->
    <main class="flex-1 overflow-y-auto p-6 space-y-6">
      <div v-if="loading" class="flex items-center justify-center h-64 text-gray-300">
        <i class="fas fa-circle-notch fa-spin text-3xl"></i>
      </div>

      <template v-else>
        <!-- 1. STATUS & HEALTH KPI MATRIX CARDS -->
        <div class="grid grid-cols-5 gap-4">
          <!-- Total Assets -->
          <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Toplam Envanter</span>
              <div class="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-bold">
                <i class="fas fa-cubes"></i>
              </div>
            </div>
            <div class="mt-3">
              <div class="text-2xl font-black text-gray-900">{{ matrixData.summary.totalCount }} <span class="text-xs font-normal text-gray-400">Adet</span></div>
              <div class="text-[11px] text-blue-600 font-semibold mt-0.5">Değer: {{ fmt(matrixData.summary.totalValuation) }}</div>
            </div>
          </div>

          <!-- In Use (Zimmetli) -->
          <div class="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm flex flex-col justify-between">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Zimmetli / Kullanımda</span>
              <div class="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs font-bold">
                <i class="fas fa-user-check"></i>
              </div>
            </div>
            <div class="mt-3">
              <div class="text-2xl font-black text-gray-900">{{ matrixData.summary.inUseCount }} <span class="text-xs font-normal text-gray-400">Adet</span></div>
              <div class="text-[11px] text-emerald-600 font-semibold mt-0.5">%{{ calcRatio(matrixData.summary.inUseCount) }} Kullanım Oranı</div>
            </div>
          </div>

          <!-- In Warehouse (Depoda) -->
          <div class="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm flex flex-col justify-between">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Depoda (Atanabilir)</span>
              <div class="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-bold">
                <i class="fas fa-warehouse"></i>
              </div>
            </div>
            <div class="mt-3">
              <div class="text-2xl font-black text-gray-900">{{ matrixData.summary.warehouseCount }} <span class="text-xs font-normal text-gray-400">Adet</span></div>
              <div class="text-[11px] text-blue-600 font-semibold mt-0.5">Atamaya Hazır</div>
            </div>
          </div>

          <!-- In Repair (Arızalı/Serviste) -->
          <div class="bg-white p-5 rounded-2xl border border-amber-100 shadow-sm flex flex-col justify-between">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Arızalı / Serviste</span>
              <div class="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-xs font-bold">
                <i class="fas fa-tools"></i>
              </div>
            </div>
            <div class="mt-3">
              <div class="text-2xl font-black text-amber-600">{{ matrixData.summary.inRepairCount }} <span class="text-xs font-normal text-gray-400">Adet</span></div>
              <div class="text-[11px] text-amber-600 font-semibold mt-0.5">Bakım Sürecinde</div>
            </div>
          </div>

          <!-- Scrapped (Hurda) -->
          <div class="bg-white p-5 rounded-2xl border border-red-100 shadow-sm flex flex-col justify-between">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-bold text-red-600 uppercase tracking-wider">Hurda / Kullanım Dışı</span>
              <div class="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center text-xs font-bold">
                <i class="fas fa-trash-alt"></i>
              </div>
            </div>
            <div class="mt-3">
              <div class="text-2xl font-black text-red-600">{{ matrixData.summary.scrappedCount }} <span class="text-xs font-normal text-gray-400">Adet</span></div>
              <div class="text-[11px] text-red-500 font-semibold mt-0.5">İmha / Arşiv</div>
            </div>
          </div>
        </div>

        <!-- 2. LOCATION & CATEGORY BREAKDOWN MATRIX -->
        <div class="grid grid-cols-3 gap-6">
          <!-- LOCATION MATRIX (2 COLS) -->
          <div class="col-span-2 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h3 class="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <i class="fas fa-map-marker-alt text-red-500"></i> Lokasyon Bazlı Envanter Haritası
                </h3>
                <p class="text-[11px] text-gray-400">Hangi lokasyonda ne kadar cihaz bulunduğu ve durumları</p>
              </div>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead>
                  <tr class="bg-gray-50 border-b border-gray-100 text-gray-400 font-bold uppercase text-[9.5px]">
                    <th class="px-4 py-3">Lokasyon Adı</th>
                    <th class="px-4 py-3 text-center">Toplam Cihaz</th>
                    <th class="px-4 py-3 text-center">Kullanımda</th>
                    <th class="px-4 py-3 text-center">Serviste</th>
                    <th class="px-4 py-3 text-right">Toplam Bedel</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-50">
                  <tr v-if="matrixData.locations.length === 0">
                    <td colspan="5" class="px-4 py-8 text-center text-gray-400 italic">Henüz lokasyon tanımlanmamış.</td>
                  </tr>
                  <tr v-for="loc in matrixData.locations" :key="loc.id" class="hover:bg-gray-50/50 transition-colors">
                    <td class="px-4 py-3">
                      <div class="font-bold text-gray-900 flex items-center gap-2">
                        <i class="fas fa-building text-blue-500 text-[10px]"></i> {{ loc.name }}
                      </div>
                      <div v-if="loc.address" class="text-[10px] text-gray-400 truncate max-w-xs">{{ loc.address }}</div>
                    </td>
                    <td class="px-4 py-3 text-center font-extrabold text-gray-900">
                      {{ loc.total_assets }}
                    </td>
                    <td class="px-4 py-3 text-center">
                      <span class="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded-full text-[10.5px]">
                        {{ loc.in_use_count }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-center">
                      <span class="px-2 py-0.5 bg-amber-50 text-amber-700 font-bold rounded-full text-[10.5px]">
                        {{ loc.repair_count }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-right font-bold text-gray-900">
                      {{ fmt(loc.total_value) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- CATEGORY DISTRIBUTION (1 COL) -->
          <div class="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col">
            <h3 class="font-bold text-gray-900 text-sm mb-1 flex items-center gap-2">
              <i class="fas fa-tags text-purple-500"></i> Kategori Dağılımı
            </h3>
            <p class="text-[11px] text-gray-400 mb-4">Donanım kategorilerine göre varlık hacmi</p>

            <div class="space-y-3 flex-1 overflow-y-auto pr-1">
              <div v-for="cat in matrixData.categories" :key="cat.id" class="bg-gray-50/70 p-3 rounded-xl border border-gray-100">
                <div class="flex justify-between items-center mb-1">
                  <span class="font-bold text-xs text-gray-800">{{ cat.name }}</span>
                  <span class="font-black text-xs text-blue-600">{{ cat.count }} Adet</span>
                </div>
                <!-- Progress Bar -->
                <div class="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                  <div 
                    class="bg-blue-600 h-full rounded-full transition-all duration-500" 
                    :style="{ width: calcBarPercent(cat.count) + '%' }"
                  ></div>
                </div>
                <div class="text-[10px] text-gray-400 mt-1.5 flex justify-between">
                  <span>Toplam Değer:</span>
                  <span class="font-semibold text-gray-700">{{ fmt(cat.total_value) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 3. COMPANY & DEPARTMENT MATRIX -->
        <div class="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h3 class="font-bold text-gray-900 text-sm mb-1 flex items-center gap-2">
            <i class="fas fa-building text-emerald-500"></i> Şirket Bazlı Envanter Dağılımı
          </h3>
          <p class="text-[11px] text-gray-400 mb-4">Şirketlere ait varlık sayıları ve personele zimmetlenme oranları</p>

          <div class="grid grid-cols-4 gap-4">
            <div v-for="comp in matrixData.companies" :key="comp.id" class="border border-gray-100 rounded-xl p-4 bg-gray-50/50">
              <div class="font-bold text-sm text-gray-900 mb-2 truncate">{{ comp.name }}</div>
              <div class="flex items-center justify-between text-xs my-1">
                <span class="text-gray-500">Toplam Cihaz:</span>
                <span class="font-black text-gray-900">{{ comp.total_assets }}</span>
              </div>
              <div class="flex items-center justify-between text-xs my-1">
                <span class="text-gray-500">Personel Zimmetli:</span>
                <span class="font-bold text-emerald-600">{{ comp.personnel_assigned_count }}</span>
              </div>
              <div class="text-[10px] text-gray-400 mt-2 border-t pt-2 flex justify-between">
                <span>Envanter Tutarı:</span>
                <span class="font-bold text-gray-800">{{ fmt(comp.total_value) }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import axios from 'axios'

const loading = ref(true)
const matrixData = ref({
  summary: { totalCount: 0, totalValuation: 0, inUseCount: 0, warehouseCount: 0, inRepairCount: 0, scrappedCount: 0 },
  categories: [],
  locations: [],
  companies: []
})

const fmt = (v) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(v || 0)

const calcRatio = (count) => {
  if (!matrixData.value.summary.totalCount) return 0
  return Math.round((count / matrixData.value.summary.totalCount) * 100)
}

const calcBarPercent = (count) => {
  if (!matrixData.value.summary.totalCount) return 0
  return Math.min(100, Math.round((count / matrixData.value.summary.totalCount) * 100))
}

const fetchMatrix = async () => {
  loading.value = true
  try {
    const res = await axios.get('/api/assets/matrix-analytics')
    matrixData.value = res.data
  } catch (err) {
    console.error('Fetch matrix analytics error:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchMatrix()
})
</script>
