<script setup>
import { ref, onMounted, computed } from 'vue'
import { useMasterDataStore } from '../../stores/masterData'
import { useToast } from '../../composables/useToast'
import { useConfirm } from '../../composables/useConfirm'
import AppTable from '../../components/AppTable.vue'

const masterData = useMasterDataStore()
const { showToast } = useToast()
const { ask, startLoading, stopLoading } = useConfirm()

const loading = ref(false)
const allocations = ref([])
const selectedIds = ref([])

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
    allocations.value = await masterData.fetchAllocations()
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
    isBulkModalOpen.value = false
    bulkSelectedLicenseIds.value = []
    selectedIds.value = []
  } catch (err) {
    showToast('Hata: ' + err.message, 'error')
  } finally {
    stopLoading()
  }
}

onMounted(fetchData)
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
        <button @click="fetchData" class="h-9 w-9 bg-white hover:bg-gray-50 text-gray-400 hover:text-blue-600 rounded-xl border border-gray-200 transition-all flex items-center justify-center active:scale-95">
          <i class="fas fa-sync-alt" :class="{ 'fa-spin': loading }"></i>
        </button>
      </div>
    </div>

    <!-- Main List -->
    <div class="flex-1 overflow-hidden">
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

