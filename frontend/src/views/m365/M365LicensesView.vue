<script setup>
import { ref, onMounted, computed } from 'vue'
import { useMasterDataStore } from '../../stores/masterData'
import { useToast } from '../../composables/useToast'

const masterData = useMasterDataStore()
const { showToast } = useToast()
const loading = ref(false)
const processingId = ref(null)
const searchQuery = ref('')
const selectedCompany = ref('all')
const selectedCategory = ref('all')

const allocations = ref([])

const categories = computed(() => {
  const cats = [...new Set(masterData.licenses.map(l => l.category).filter(Boolean))]
  return cats
})

const filteredLicenses = computed(() => {
  return masterData.licenses.filter(l => {
    return selectedCategory.value === 'all' || l.category === selectedCategory.value
  })
})

const fetchData = async () => {
  loading.value = true
  try {
    await Promise.all([
      masterData.fetchPersonnel(),
      masterData.fetchCompanies(),
      masterData.fetchLicenses()
    ])
    allocations.value = await masterData.fetchAllocations()
  } catch (error) {
    console.error('Veri çekme hatası:', error)
  } finally {
    loading.value = false
  }
}

const columns = computed(() => {
  const baseCols = [
    { key: 'full_name',    label: 'Personel', sortable: true, sticky: true },
    { key: 'company_name', label: 'Şirket',   sortable: true },
  ]
  const licenseCols = filteredLicenses.value.map(l => ({
    key: `license_${l.id}`,
    label: l.name,
    isLicense: true,
    licenseId: l.id,
    align: 'center'
  }))
  return [...baseCols, ...licenseCols]
})

const tableRows = computed(() => {
  return masterData.personnel.map(p => {
    const row = { ...p, full_name: `${p.first_name} ${p.last_name}` }
    filteredLicenses.value.forEach(l => {
      const alloc = allocations.value.find(a => a.personnel_id === p.id && a.license_id === l.id)
      row[`license_${l.id}`] = alloc ? { has: true, id: alloc.id } : { has: false }
    })
    return row
  })
})

const filteredTableRows = computed(() => {
  return tableRows.value.filter(row => {
    const matchesSearch = row.full_name.toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchesCompany = selectedCompany.value === 'all' || row.company_name === selectedCompany.value
    return matchesSearch && matchesCompany
  })
})

const toggleLicense = async (personnelId, licenseId, currentAlloc) => {
  const cellKey = `${personnelId}-${licenseId}`
  processingId.value = cellKey
  try {
    if (currentAlloc.has) {
      await masterData.unassignLicense(currentAlloc.id)
      showToast('Lisans kaldırıldı', 'success')
    } else {
      await masterData.assignLicense(personnelId, licenseId)
      showToast('Lisans atandı', 'success')
    }
    allocations.value = await masterData.fetchAllocations()
  } catch (err) {
    showToast('Hata: ' + (err.response?.data?.error || err.message), 'error')
  } finally {
    processingId.value = null
  }
}

onMounted(fetchData)
</script>

<template>
  <div class="h-full flex flex-col text-gray-900 bg-[#f8fafc] overflow-hidden">
    <!-- Header: Premium Matrix Design -->
    <div class="bg-white/80 backdrop-blur-md border-b border-gray-100 px-8 py-5 flex items-center justify-between shrink-0 z-30">
        <div class="flex items-center gap-5">
            <div class="w-12 h-12 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-100 rotate-3 group-hover:rotate-0 transition-transform">
                <i class="fas fa-layer-group text-xl"></i>
            </div>
            <div>
                <h1 class="text-[20px] font-black text-gray-900 tracking-tight leading-none mb-1.5">Lisans Atama Matrisi</h1>
                <div class="flex items-center gap-3">
                  <span class="flex items-center gap-1.5 text-[11px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-full">
                    <i class="fas fa-user-check text-[9px]"></i> {{ filteredTableRows.length }} Personel
                  </span>
                  <span class="flex items-center gap-1.5 text-[11px] text-violet-600 font-bold bg-violet-50 px-2 py-0.5 rounded-full">
                    <i class="fas fa-key text-[9px]"></i> {{ filteredLicenses.length }} / {{ masterData.licenses.length }} Lisans
                  </span>
                </div>
            </div>
        </div>
        
        <div class="flex items-center gap-4">
          <!-- Search & Filters -->
          <div class="flex items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-100">
            <div class="relative">
              <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[12px]"></i>
              <input 
                v-model="searchQuery"
                type="text" 
                placeholder="Personel Ara..." 
                class="h-9 pl-9 pr-4 bg-white border-none rounded-lg text-[13px] font-bold text-gray-700 w-40 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-sm placeholder:text-gray-300"
              />
            </div>
            
            <div class="h-6 w-[1px] bg-gray-200 mx-1"></div>

            <select 
              v-model="selectedCategory"
              class="h-9 px-3 bg-white border-none rounded-lg text-[12px] font-bold text-indigo-600 focus:ring-2 focus:ring-indigo-500/20 shadow-sm outline-none"
            >
              <option value="all">Tüm Kategoriler</option>
              <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
            </select>

            <select 
              v-model="selectedCompany"
              class="h-9 px-3 bg-white border-none rounded-lg text-[12px] font-bold text-gray-600 focus:ring-2 focus:ring-indigo-500/20 shadow-sm outline-none"
            >
              <option value="all">Tüm Şirketler</option>
              <option v-for="c in masterData.companies" :key="c.id" :value="c.name">{{ c.name }}</option>
            </select>
          </div>

          <button @click="fetchData" class="h-10 w-10 bg-white hover:bg-gray-50 text-gray-400 hover:text-indigo-600 rounded-xl transition-all flex items-center justify-center border border-gray-100 shadow-sm active:scale-95">
            <i class="fas fa-sync-alt" :class="{ 'fa-spin': loading }"></i>
          </button>
        </div>
    </div>

    <!-- Matrix Grid -->
    <div class="flex-1 overflow-auto custom-scrollbar relative">
      <table class="w-full text-left border-separate border-spacing-0 min-w-max">
        <thead>
          <tr class="sticky top-0 z-40">
            <!-- Personnel Column Header -->
            <th class="p-0 sticky left-0 z-50 bg-[#f8fafc]">
               <div class="px-6 py-4 h-[160px] flex items-end bg-white border-b border-r border-gray-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                  <span class="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Personel Detayları</span>
               </div>
            </th>
            
            <!-- Company Column Header -->
            <th class="p-0 bg-[#f8fafc]">
               <div class="px-6 py-4 h-[160px] flex items-end bg-white border-b border-gray-100">
                  <span class="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Şirket</span>
               </div>
            </th>

            <!-- Rotated License Headers -->
            <th v-for="col in columns.filter(c => c.isLicense)" :key="col.key" 
                class="p-0 border-b border-gray-100 bg-white group hover:bg-indigo-50/30 transition-colors">
              <div class="rotated-th-container flex flex-col items-center justify-end h-[160px] pb-6 px-2 min-w-[50px]">
                <div class="rotated-text-wrapper">
                  <span class="rotated-text text-gray-500 group-hover:text-indigo-600 transition-colors">
                    {{ col.label }}
                  </span>
                </div>
              </div>
            </th>
          </tr>
        </thead>
        <tbody class="bg-white">
          <tr v-for="row in filteredTableRows" :key="row.id" class="hover:bg-gray-50/80 transition-colors group">
            <!-- Personnel -->
            <td class="p-0 sticky left-0 z-20 group-hover:z-30">
              <div class="px-6 py-3.5 bg-white group-hover:bg-indigo-50/40 border-r border-b border-gray-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.03)] flex items-center gap-3 transition-colors">
                <div class="relative">
                  <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-50 to-white text-indigo-600 flex items-center justify-center font-black text-[11px] shrink-0 border border-indigo-100 shadow-sm">
                    {{ row.first_name?.[0] }}{{ row.last_name?.[0] }}
                  </div>
                  <div class="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-white rounded-full flex items-center justify-center shadow-sm">
                    <div class="w-2 h-2 rounded-full" :class="row.status === 'Active' ? 'bg-emerald-500' : 'bg-gray-300'"></div>
                  </div>
                </div>
                <div class="flex flex-col">
                  <span class="text-[13px] font-black text-gray-900 group-hover:text-indigo-700 transition-colors">{{ row.full_name }}</span>
                  <span class="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{{ row.position_tr || 'Pozisyon Yok' }}</span>
                </div>
              </div>
            </td>

            <!-- Company -->
            <td class="px-6 py-3.5 border-b border-gray-50">
              <span class="text-[12px] font-bold text-gray-400">{{ row.company_name }}</span>
            </td>

            <!-- License Matrix Cells -->
            <td v-for="col in columns.filter(c => c.isLicense)" :key="col.key"
              class="px-2 py-3.5 border-b border-gray-50 border-r border-gray-50/50 text-center group/cell">
              <div class="flex justify-center">
                <button 
                  @click="toggleLicense(row.id, col.licenseId, row[col.key])"
                  :disabled="processingId === `${row.id}-${col.licenseId}`"
                  class="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-300 active:scale-90"
                  :class="[
                    row[col.key].has 
                      ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-100 ring-2 ring-indigo-500/10' 
                      : 'bg-gray-100 text-transparent hover:bg-indigo-100/50 hover:text-indigo-400 hover:scale-110'
                  ]">
                  <i v-if="processingId === `${row.id}-${col.licenseId}`" class="fas fa-circle-notch fa-spin text-[10px]"></i>
                  <i v-else :class="[row[col.key].has ? 'fas fa-check' : 'fas fa-plus', 'text-[10px]']"></i>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      
      <!-- Empty/Loading State -->
      <div v-if="loading && !filteredTableRows.length" class="absolute inset-0 flex flex-col items-center justify-center bg-white/60 backdrop-blur-sm z-50">
        <div class="w-16 h-16 border-4 border-indigo-50 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
        <p class="text-[13px] font-black text-indigo-900 uppercase tracking-[0.3em]">Veri Yükleniyor</p>
      </div>

      <div v-if="!loading && !filteredTableRows.length" class="p-20 text-center">
        <div class="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <i class="fas fa-search text-gray-200 text-3xl"></i>
        </div>
        <h3 class="text-gray-900 font-black text-lg mb-2">Kayıt Bulunamadı</h3>
        <p class="text-gray-400 text-sm font-medium">Arama kriterlerinize uygun personel bulunamadı.</p>
      </div>
    </div>

    <!-- Minimalist Glass Footer -->
    <div class="px-8 py-4 bg-white border-t border-gray-100 flex items-center justify-between z-30">
      <div class="flex items-center gap-8">
        <div class="flex items-center gap-3">
          <div class="w-4 h-4 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-md shadow-sm"></div>
          <span class="text-[10px] font-black text-gray-500 uppercase tracking-widest">Lisans Atanmış</span>
        </div>
        <div class="flex items-center gap-3">
          <div class="w-4 h-4 bg-gray-100 rounded-md border border-gray-200"></div>
          <span class="text-[10px] font-black text-gray-300 uppercase tracking-widest">Atama Yok</span>
        </div>
      </div>
      
      <div class="flex items-center gap-4 text-[11px] font-bold text-gray-400">
        <i class="fas fa-info-circle text-indigo-400"></i>
        <span class="italic">Değişiklikler sunucu ile anlık olarak senkronize edilir.</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: #f8fafc;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #cbd5e1;
}

.rotated-text-wrapper {
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  white-space: nowrap;
}

.rotated-text {
  display: inline-block;
  font-size: 10px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  line-height: 1;
}

/* Ensure sticky columns don't overlap shadows in weird ways */
th.sticky.left-0 {
  box-shadow: 2px 0 5px -2px rgba(0,0,0,0.05);
}

/* Row hover highlight for the whole line including sticky part */
tr:hover td.sticky {
  background-color: #f5f7ff !important;
}

/* Cell hover effect */
.group\/cell:hover {
  background-color: rgba(99, 102, 241, 0.03);
}
</style>

