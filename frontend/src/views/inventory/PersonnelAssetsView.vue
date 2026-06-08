<template>
  <div class="h-full flex flex-col bg-white overflow-hidden">
    <!-- HEADER -->
    <header class="h-14 border-b border-gray-100 flex items-center px-6 gap-4 bg-white shrink-0">
      <div class="flex items-center gap-2 shrink-0">
        <i class="fas fa-user-tag text-gray-400"></i>
        <h1 class="text-[15px] font-bold text-gray-900">Personel Zimmet Özeti</h1>
      </div>

      <!-- Search -->
      <div class="flex items-center gap-2 ml-4 flex-1">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Personel adı veya şirkete göre ara..."
          class="h-8 px-3 bg-gray-50 border border-gray-200 rounded text-[12px] font-medium text-gray-700 outline-none focus:border-blue-500 w-72"
        />
        <select v-model="selectedCompanyId" class="h-8 px-2 bg-gray-50 border border-gray-200 rounded text-[12px] font-medium text-gray-700 outline-none focus:border-blue-500 cursor-pointer">
          <option value="">Tüm Şirketler</option>
          <option v-for="c in companies" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </div>

      <!-- Stats -->
      <div class="ml-auto flex items-center gap-4 text-[12px]">
        <span class="text-gray-400">
          <span class="font-bold text-gray-700">{{ filteredPersonnel.length }}</span> personel
        </span>
        <span class="text-gray-400">
          <span class="font-bold text-emerald-600">{{ totalAssignedCount }}</span> toplam zimmet
        </span>
      </div>
    </header>

    <!-- MAIN CONTENT -->
    <main class="flex-1 overflow-y-auto bg-gray-50/40 p-6">
      <div v-if="loading" class="flex items-center justify-center h-64 text-gray-300">
        <i class="fas fa-circle-notch fa-spin text-3xl"></i>
      </div>

      <div v-else-if="filteredPersonnel.length === 0" class="flex flex-col items-center justify-center h-64 text-gray-300 gap-3">
        <i class="fas fa-user-slash text-4xl"></i>
        <p class="text-sm font-medium">Zimmetli personel bulunamadı.</p>
      </div>

      <div v-else class="grid grid-cols-1 gap-4">
        <div
          v-for="person in filteredPersonnel"
          :key="person.id"
          class="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden"
        >
          <!-- Personnel Header -->
          <div
            class="flex items-center gap-4 px-5 py-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50/50 transition-colors"
            @click="toggleExpand(person.id)"
          >
            <!-- Avatar -->
            <div class="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-[12px] border border-blue-100 shrink-0">
              {{ person.first_name?.[0] }}{{ person.last_name?.[0] }}
            </div>
            <!-- Info -->
            <div class="flex-1 min-w-0">
              <div class="font-bold text-gray-900 text-[13.5px]">{{ person.first_name }} {{ person.last_name }}</div>
              <div class="text-[11px] text-gray-400 flex items-center gap-2 mt-0.5">
                <span v-if="person.title">{{ person.title }}</span>
                <span v-if="person.title && person.company_name" class="text-gray-200">·</span>
                <span v-if="person.company_name" class="text-blue-500 font-medium">{{ person.company_name }}</span>
                <span v-if="person.department_name" class="text-gray-300">·</span>
                <span v-if="person.department_name" class="text-gray-400">{{ person.department_name }}</span>
              </div>
            </div>

            <!-- Asset Count Badge -->
            <div class="flex items-center gap-3 shrink-0">
              <div
                v-if="personnelAssets[person.id]"
                class="flex items-center gap-2"
              >
                <span class="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[11px] font-bold rounded-full">
                  <i class="fas fa-desktop mr-1"></i>
                  {{ personnelAssets[person.id].active?.length || 0 }} Aktif Zimmet
                </span>
                <span
                  v-if="personnelAssets[person.id].totalValue > 0"
                  class="px-2.5 py-1 bg-blue-50 text-blue-700 text-[11px] font-bold rounded-full"
                >
                  {{ fmt(personnelAssets[person.id].totalValue) }}
                </span>
              </div>
              <div v-else class="text-gray-300 text-[11px] italic">Yükleniyor...</div>

              <i :class="['fas', expandedIds.has(person.id) ? 'fa-chevron-up' : 'fa-chevron-down', 'text-gray-400 text-[11px] transition-transform']"></i>
            </div>
          </div>

          <!-- Expanded Assets Table -->
          <div v-if="expandedIds.has(person.id) && personnelAssets[person.id]">
            <div v-if="personnelAssets[person.id].active?.length === 0" class="px-5 py-4 text-[12px] text-gray-400 italic">
              Bu personelde aktif zimmetli cihaz bulunmuyor.
            </div>
            <table v-else class="w-full text-left text-[12px]">
              <thead class="bg-gray-50 text-gray-400 uppercase text-[9.5px] font-bold border-b border-gray-100">
                <tr>
                  <th class="px-5 py-2.5">Seri No / Barkod</th>
                  <th class="px-5 py-2.5">Cihaz Bilgisi</th>
                  <th class="px-5 py-2.5">Kategori</th>
                  <th class="px-5 py-2.5">Alış Bedeli</th>
                  <th class="px-5 py-2.5">Alış Tarihi</th>
                  <th class="px-5 py-2.5 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-50">
                <tr
                  v-for="asset in personnelAssets[person.id].active"
                  :key="asset.id"
                  class="hover:bg-gray-50/50 transition-colors"
                >
                  <td class="px-5 py-3">
                    <div class="font-bold text-gray-900">{{ asset.serial_no }}</div>
                    <div v-if="asset.barcode" class="text-[10px] text-gray-400 mt-0.5">
                      <i class="fas fa-barcode mr-1"></i>{{ asset.barcode }}
                    </div>
                  </td>
                  <td class="px-5 py-3 font-semibold text-gray-700">
                    {{ asset.brand_name }} {{ asset.model_name }}
                  </td>
                  <td class="px-5 py-3 text-gray-500">{{ asset.category_name }}</td>
                  <td class="px-5 py-3 font-semibold text-gray-900">{{ fmt(asset.purchase_price) }}</td>
                  <td class="px-5 py-3 text-gray-500">{{ fmtDate(asset.purchase_date) }}</td>
                  <td class="px-5 py-3 text-right">
                    <RouterLink
                      to="/inventory/assets"
                      class="text-blue-600 hover:text-blue-800 text-[11px] font-bold transition-colors"
                      title="Envanterde Görüntüle"
                    >
                      <i class="fas fa-external-link-alt"></i>
                    </RouterLink>
                  </td>
                </tr>
              </tbody>
            </table>

            <!-- History Section -->
            <div v-if="personnelAssets[person.id].history?.length > 0" class="border-t border-gray-50 px-5 py-3">
              <div class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                <i class="fas fa-history"></i> Zimmet Geçmişi ({{ personnelAssets[person.id].history.length }})
              </div>
              <div class="flex flex-wrap gap-2">
                <div
                  v-for="h in personnelAssets[person.id].history.slice(0, 5)"
                  :key="h.id"
                  class="text-[11px] px-2.5 py-1 rounded-full bg-gray-100 text-gray-500"
                >
                  <i :class="h.action === 'CHECKOUT' ? 'fas fa-arrow-right text-blue-400' : 'fas fa-arrow-left text-amber-400'" class="mr-1"></i>
                  {{ h.brand_name }} {{ h.model_name }} · {{ fmtDate(h.created_at) }}
                </div>
                <div v-if="personnelAssets[person.id].history.length > 5" class="text-[11px] px-2.5 py-1 text-gray-400">
                  +{{ personnelAssets[person.id].history.length - 5 }} daha...
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useAssetStore } from '../../stores/assetStore'
import { useMasterDataStore } from '../../stores/masterData'

const assetStore = useAssetStore()
const masterData = useMasterDataStore()

const loading = ref(false)
const searchQuery = ref('')
const selectedCompanyId = ref('')
const expandedIds = ref(new Set())
const personnelAssets = ref({})

const companies = computed(() => masterData.companies)

const fmt = (v) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(v || 0)
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('tr-TR') : '—'

const filteredPersonnel = computed(() => {
  return masterData.personnel
    .map(p => ({
      ...p,
      company_name: masterData.companies.find(c => c.id === p.company_id)?.name || '',
      department_name: masterData.departments?.find(d => d.id === p.department_id)?.name || ''
    }))
    .filter(p => {
      if (selectedCompanyId.value && p.company_id !== Number(selectedCompanyId.value)) return false
      if (searchQuery.value) {
        const q = searchQuery.value.toLowerCase()
        const name = `${p.first_name} ${p.last_name}`.toLowerCase()
        if (!name.includes(q) && !(p.company_name || '').toLowerCase().includes(q)) return false
      }
      return true
    })
})

const totalAssignedCount = computed(() => {
  return Object.values(personnelAssets.value).reduce((sum, pa) => sum + (pa.active?.length || 0), 0)
})

const toggleExpand = async (personnelId) => {
  if (expandedIds.value.has(personnelId)) {
    expandedIds.value = new Set([...expandedIds.value].filter(id => id !== personnelId))
  } else {
    expandedIds.value = new Set([...expandedIds.value, personnelId])
    if (!personnelAssets.value[personnelId]) {
      await loadPersonnelAssets(personnelId)
    }
  }
}

const loadPersonnelAssets = async (personnelId) => {
  try {
    const data = await assetStore.fetchPersonnelAssets(personnelId)
    const totalValue = (data.active || []).reduce((sum, a) => sum + (a.purchase_price || 0), 0)
    personnelAssets.value = {
      ...personnelAssets.value,
      [personnelId]: { ...data, totalValue }
    }
  } catch (err) {
    console.error('Personnel assets load error:', err)
  }
}

// Pre-load all personnel badge counts
const preloadBadges = async () => {
  for (const p of masterData.personnel) {
    if (!personnelAssets.value[p.id]) {
      await loadPersonnelAssets(p.id)
    }
  }
}

onMounted(async () => {
  loading.value = true
  try {
    await Promise.all([
      masterData.fetchPersonnel(),
      masterData.fetchCompanies(),
      masterData.fetchDepartments()
    ])
    await preloadBadges()
  } finally {
    loading.value = false
  }
})
</script>
