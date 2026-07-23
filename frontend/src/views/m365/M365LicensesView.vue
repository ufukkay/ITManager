<script setup>
import { ref, onMounted, computed } from 'vue'
import { useMasterDataStore } from '../../stores/masterData'
import { useToast } from '../../composables/useToast'
import { useConfirm } from '../../composables/useConfirm'
import AppTable from '../../components/AppTable.vue'
import api from '../../api'

const masterData = useMasterDataStore()
const { showToast } = useToast()
const { ask, startLoading, stopLoading } = useConfirm()

const loading = ref(false)
const loadingRecommendations = ref(false)
const allocations = ref([])
const selectedIds = ref([])
const activeTab = ref('assignments')
const recommendations = ref([])
const totalSavings = ref(0)

// Modals
const isManageModalOpen = ref(false)
const isBulkModalOpen = ref(false)
const selectedPerson = ref(null)
const bulkSelectedLicenseIds = ref([])

const fetchData = async () => {
  loading.value = true
  try {
    await Promise.all([
      masterData.fetchPersonnel(),
      masterData.fetchCompanies(),
      masterData.fetchLicenses(),
      masterData.fetchDepartments()
    ])
    allocations.value = await masterData.fetchAllocations()
  } catch (error) {
    console.error('Veri çekme hatası:', error)
  } finally {
    loading.value = false
  }
}

const fetchRecommendations = async () => {
  loadingRecommendations.value = true
  try {
    const res = await api.get('/api/m365/recommendations')
    recommendations.value = res.data.recommendations || []
    totalSavings.value = res.data.totalSavings || 0
  } catch (err) {
    console.error('Tasarruf önerileri yüklenemedi:', err)
  } finally {
    loadingRecommendations.value = false
  }
}

const refreshCurrentTab = async () => {
  if (activeTab.value === 'assignments') {
    await fetchData()
  } else {
    await fetchRecommendations()
  }
}

const columns = [
  { key: 'full_name',    label: 'Personel', sortable: true },
  { key: 'company_name', label: 'Şirket',   sortable: true, width: '180px' },
  { key: 'department_name', label: 'Departman', sortable: true, width: '180px' },
  { key: 'assigned_licenses', label: 'Atanmış Lisanslar', sortable: false },
]

const tableRows = computed(() => {
  return masterData.personnel.map(p => {
    const personAllocations = allocations.value.filter(a => a.personnel_id === p.id)
    return { 
      ...p, 
      full_name: `${p.first_name} ${p.last_name}`,
      assigned_licenses: personAllocations
    }
  })
})

const onSelectionChange = (rows) => {
  selectedIds.value = rows.map(r => r.id)
}

const openManageModal = (row) => {
  selectedPerson.value = row
  isManageModalOpen.value = true
}

const toggleLicense = async (personnelId, licenseId) => {
  const currentAlloc = allocations.value.find(a => a.personnel_id === personnelId && a.license_id === licenseId)
  
  try {
    if (currentAlloc) {
      await masterData.unassignLicense(currentAlloc.id)
      showToast('Lisans kaldırıldı', 'success')
    } else {
      await masterData.assignLicense(personnelId, licenseId)
      showToast('Lisans atandı', 'success')
    }
    // Refresh allocations
    allocations.value = await masterData.fetchAllocations()
    // Refresh recommendations
    await fetchRecommendations()
  } catch (err) {
    showToast('Hata: ' + (err.response?.data?.error || err.message), 'error')
  }
}

const bulkAssign = async () => {
  if (selectedIds.value.length === 0 || bulkSelectedLicenseIds.value.length === 0) return
  
  try {
    startLoading()
    await masterData.bulkAssignLicenses(selectedIds.value, bulkSelectedLicenseIds.value)
    showToast('Toplu atama başarıyla tamamlandı', 'success')
    allocations.value = await masterData.fetchAllocations()
    await fetchRecommendations()
    isBulkModalOpen.value = false
    bulkSelectedLicenseIds.value = []
    selectedIds.value = []
  } catch (err) {
    showToast('Hata: ' + err.message, 'error')
  } finally {
    stopLoading()
  }
}

const applyRecommendation = async (rec) => {
  const confirmed = await ask({
    title: 'Lisansı Geri Al',
    message: `${rec.name} isimli personelden ${rec.licenseName} lisansını geri almak istediğinize emin misiniz? Bu işlem personelin lisans atamasını sonlandıracaktır.`,
    confirmText: 'Lisansı Geri Al',
    cancelText: 'İptal',
    danger: true
  })
  
  if (!confirmed) return
  
  try {
    startLoading()
    const res = await api.post('/api/m365/recommendations/apply', { id: rec.id })
    if (res.data.success) {
      showToast('Lisans başarıyla geri alındı', 'success')
      await Promise.all([
        fetchRecommendations(),
        fetchData()
      ])
    }
  } catch (err) {
    showToast('Hata: ' + (err.response?.data?.error || err.message), 'error')
  } finally {
    stopLoading()
  }
}

onMounted(async () => {
  await fetchData()
  await fetchRecommendations()
})
</script>

<template>
  <div class="h-full flex flex-col bg-white overflow-hidden">
    <!-- Header -->
    <div class="px-8 py-6 border-b border-gray-100 flex items-center justify-between shrink-0">
      <div>
        <h1 class="text-[18px] font-black text-gray-900 tracking-tight leading-none mb-1.5">Lisans Yönetimi</h1>
        <p class="text-[12px] text-gray-400 font-medium">Personel bazlı lisans atamaları ve toplu lisans dağıtımı</p>
      </div>
      
      <div class="flex items-center gap-3">
        <button @click="refreshCurrentTab" class="h-9 w-9 bg-white hover:bg-gray-50 text-gray-400 hover:text-blue-600 rounded-xl border border-gray-200 transition-all flex items-center justify-center active:scale-95">
          <i class="fas fa-sync-alt" :class="{ 'fa-spin': loading || loadingRecommendations }"></i>
        </button>
      </div>
    </div>

    <!-- Tabs Navigation -->
    <div class="px-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 shrink-0">
      <div class="flex gap-6">
        <button 
          @click="activeTab = 'assignments'"
          class="py-3 text-[13px] font-bold border-b-2 transition-all relative"
          :class="activeTab === 'assignments' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-900'"
        >
          Lisans Atamaları
        </button>
        <button 
          @click="activeTab = 'savings'"
          class="py-3 text-[13px] font-bold border-b-2 transition-all relative flex items-center gap-2"
          :class="activeTab === 'savings' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-900'"
        >
          Tasarruf Önerileri
          <span v-if="recommendations.length > 0" class="px-2 py-0.5 text-[10px] font-bold bg-green-100 text-green-700 rounded-full">
            {{ recommendations.length }}
          </span>
        </button>
      </div>
    </div>

    <!-- Main List (Assignments Tab) -->
    <div v-if="activeTab === 'assignments'" class="flex-1 overflow-hidden">
      <AppTable
        :columns="columns"
        :rows="tableRows"
        :loading="loading"
        :selectable="true"
        :actions="true"
        @selection-change="onSelectionChange"
        @row-edit="openManageModal"
      >
        <template #toolbar>
          <div v-if="selectedIds.length > 0" class="flex items-center gap-3 ml-2">
            <span class="text-[12px] font-bold text-blue-600">{{ selectedIds.length }} Seçili</span>
            <button @click="isBulkModalOpen = true" class="px-4 py-1.5 bg-blue-600 text-white text-[11px] font-bold rounded-lg hover:bg-blue-700 shadow-sm transition-all flex items-center gap-2">
              <i class="fas fa-layer-group"></i> TOPLU LİSANS ATA
            </button>
          </div>
        </template>

        <template #cell-full_name="{ row, value }">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center font-bold text-[11px] border border-gray-200">
              {{ row.first_name?.[0] }}{{ row.last_name?.[0] }}
            </div>
            <div class="flex flex-col">
              <span class="font-bold text-gray-900">{{ value }}</span>
              <span class="text-[10px] text-gray-400 font-bold uppercase tracking-tight">{{ row.title || '—' }}</span>
            </div>
          </div>
        </template>

        <template #cell-assigned_licenses="{ value }">
          <div class="flex flex-wrap gap-1.5">
            <span v-for="a in value" :key="a.id" class="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-bold border border-blue-100 flex items-center gap-1.5">
              {{ a.license_name }}
            </span>
            <span v-if="!value?.length" class="text-gray-300 text-[11px] italic">Atanmış lisans yok</span>
          </div>
        </template>

        <template #actions="{ row }">
          <button @click="openManageModal(row)" class="px-3 py-1.5 bg-gray-50 text-gray-600 hover:bg-blue-50 hover:text-blue-600 rounded-lg text-[11px] font-bold border border-gray-100 transition-all flex items-center gap-1.5">
            <i class="fas fa-cog"></i> YÖNET
          </button>
        </template>
      </AppTable>
    </div>

    <!-- Savings Tab -->
    <div v-else class="flex-1 overflow-y-auto bg-gray-50/50 p-8 space-y-6 custom-scrollbar">
      <!-- Savings Summary Card -->
      <div class="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-md flex items-center justify-between">
        <div class="space-y-1">
          <span class="text-[11px] font-bold uppercase tracking-wider text-emerald-100">Potansiyel Aylık Tasarruf</span>
          <h2 class="text-3xl font-black">${{ totalSavings.toFixed(2) }} <span class="text-lg font-bold text-emerald-100">/ ay</span></h2>
          <p class="text-[12px] text-emerald-50/90 font-medium">Son 30 gündür inaktif olan veya mail/teams kullanmayan lisanslı kullanıcılar belirlendi.</p>
        </div>
        <div class="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 text-white text-2xl shadow-inner shrink-0">
          <i class="fas fa-piggy-bank"></i>
        </div>
      </div>

      <!-- Recommendation Cards -->
      <div v-if="loadingRecommendations" class="flex items-center justify-center py-12">
        <i class="fas fa-spinner fa-spin text-2xl text-blue-600"></i>
      </div>

      <div v-else-if="recommendations.length === 0" class="flex flex-col items-center justify-center py-16 bg-white border border-gray-200 rounded-2xl p-8 text-center space-y-3">
        <div class="w-12 h-12 rounded-full bg-green-50 text-green-600 flex items-center justify-center text-lg border border-green-100">
          <i class="fas fa-check-circle"></i>
        </div>
        <h3 class="text-sm font-bold text-gray-900">Tebrikler!</h3>
        <p class="text-[12px] text-gray-500 max-w-sm">M365 lisanslarınız tamamen optimize edilmiş durumda. Pasif veya atıl lisanslı kullanıcı bulunamadı.</p>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div v-for="rec in recommendations" :key="rec.id" class="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:border-blue-200 transition-all flex flex-col justify-between">
          <div class="space-y-4">
            <!-- User & License Info -->
            <div class="flex items-start justify-between">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center font-bold text-xs border border-gray-200">
                  {{ rec.name?.[0] }}
                </div>
                <div>
                  <h4 class="text-[13px] font-bold text-gray-900 leading-tight">{{ rec.name }}</h4>
                  <span class="text-[11px] text-gray-400 font-medium block truncate max-w-[200px]">{{ rec.email }}</span>
                </div>
              </div>
              
              <div class="text-right">
                <span class="text-[13px] font-black text-gray-900">${{ rec.monthlyCost.toFixed(2) }}</span>
                <p class="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Aylık Maliyet</p>
              </div>
            </div>

            <!-- Inactivity Badge -->
            <div class="p-3 bg-red-50/50 border border-red-100 rounded-lg flex items-start gap-2.5">
              <i class="fas fa-exclamation-circle text-red-500 text-xs mt-0.5"></i>
              <div>
                <p class="text-[11px] font-bold text-red-800 leading-tight">{{ rec.reason }}</p>
                <p class="text-[10px] text-red-700 mt-1" v-if="rec.lastActivity">
                  Son Aktivite: <strong>{{ new Date(rec.lastActivity).toLocaleDateString('tr-TR') }}</strong>
                </p>
              </div>
            </div>
            
            <!-- Extra Info -->
            <div class="flex items-center justify-between text-[11px] text-gray-500 font-medium border-t border-gray-100 pt-3">
              <span>Şirket: <strong>{{ rec.companyName }}</strong></span>
              <span>Lisans: <strong>{{ rec.licenseName }}</strong></span>
            </div>
          </div>

          <div class="mt-5 flex justify-end">
            <button 
              @click="applyRecommendation(rec)" 
              class="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 border border-red-100 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5"
            >
              <i class="fas fa-user-minus"></i> Lisansı Geri Al
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Individual Management Modal -->
    <Teleport to="body">
      <div v-if="isManageModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" @click.self="isManageModalOpen = false">
        <div class="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
          <div class="px-7 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <div>
              <h3 class="text-[15px] font-bold text-gray-900">Lisansları Yönet</h3>
              <p class="text-[11px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{{ selectedPerson?.full_name }}</p>
            </div>
            <button @click="isManageModalOpen = false" class="text-gray-400 hover:text-gray-700 w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <div class="p-7">
            <div class="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              <div v-for="cat in [...new Set(masterData.licenses.map(l => l.category))]" :key="cat" class="space-y-2">
                <h4 class="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] pt-2 pb-1">{{ cat }}</h4>
                <div v-for="l in masterData.licenses.filter(l => l.category === cat)" :key="l.id" 
                  @click="toggleLicense(selectedPerson.id, l.id)"
                  class="flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all hover:border-blue-200 group"
                  :class="allocations.find(a => a.personnel_id === selectedPerson.id && a.license_id === l.id) ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-100 hover:bg-gray-50'">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg flex items-center justify-center" :class="allocations.find(a => a.personnel_id === selectedPerson.id && a.license_id === l.id) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'">
                      <i class="fas fa-key text-[12px]"></i>
                    </div>
                    <span class="text-[13px] font-bold" :class="allocations.find(a => a.personnel_id === selectedPerson.id && a.license_id === l.id) ? 'text-blue-700' : 'text-gray-700'">
                      {{ l.name }}
                    </span>
                  </div>
                  <div class="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all"
                    :class="allocations.find(a => a.personnel_id === selectedPerson.id && a.license_id === l.id) ? 'border-blue-600 bg-blue-600' : 'border-gray-200 bg-white'">
                    <i v-if="allocations.find(a => a.personnel_id === selectedPerson.id && a.license_id === l.id)" class="fas fa-check text-white text-[9px]"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="px-7 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end">
            <button @click="isManageModalOpen = false" class="px-6 py-2 bg-gray-900 text-white text-[12px] font-bold rounded-xl hover:bg-black transition-all shadow-lg shadow-gray-200">
              TAMAMLA
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Bulk Assignment Modal -->
    <Teleport to="body">
      <div v-if="isBulkModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" @click.self="isBulkModalOpen = false">
        <div class="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
          <div class="px-7 py-5 border-b border-gray-100 flex items-center justify-between bg-blue-600">
            <h3 class="text-[15px] font-bold text-white">Toplu Lisans Ata</h3>
            <button @click="isBulkModalOpen = false" class="text-white/70 hover:text-white w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <div class="p-7 space-y-6">
            <div class="p-4 bg-blue-50 rounded-xl border border-blue-100">
              <p class="text-[12px] text-blue-700 font-medium">
                Seçili <strong>{{ selectedIds.length }}</strong> personele aşağıdaki lisanslar atanacaktır.
              </p>
            </div>

            <div class="space-y-4">
              <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Atanacak Lisansları Seçin</label>
              <div class="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                <div v-for="l in masterData.licenses" :key="l.id" 
                  @click="bulkSelectedLicenseIds.includes(l.id) ? bulkSelectedLicenseIds = bulkSelectedLicenseIds.filter(id => id !== l.id) : bulkSelectedLicenseIds.push(l.id)"
                  class="flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all"
                  :class="bulkSelectedLicenseIds.includes(l.id) ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-100 hover:bg-gray-50'">
                  <div class="flex items-center gap-3">
                    <span class="text-[13px] font-bold text-gray-700">{{ l.name }}</span>
                    <span class="text-[9px] font-black text-gray-300 uppercase px-1.5 py-0.5 bg-gray-50 rounded border border-gray-100">{{ l.category }}</span>
                  </div>
                  <div class="w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all"
                    :class="bulkSelectedLicenseIds.includes(l.id) ? 'border-blue-600 bg-blue-600' : 'border-gray-200 bg-white'">
                    <i v-if="bulkSelectedLicenseIds.includes(l.id)" class="fas fa-check text-white text-[9px]"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="px-7 py-5 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
            <button @click="isBulkModalOpen = false" class="px-4 py-2 text-[12px] font-bold text-gray-400 hover:text-gray-600">İPTAL</button>
            <button @click="bulkAssign" :disabled="bulkSelectedLicenseIds.length === 0"
              class="px-8 py-2 bg-blue-600 text-white rounded-xl text-[12px] font-bold hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg shadow-blue-100">
              ATAMAYI BAŞLAT
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 10px;
}
</style>
