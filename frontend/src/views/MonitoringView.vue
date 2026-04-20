<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import api from '../api'
import AppTable from '../components/AppTable.vue'
import { useMasterDataStore } from '../stores/masterData'
import { useToast } from '../composables/useToast'
import { useConfirm } from '../composables/useConfirm'

const { showToast } = useToast()
const { ask, startLoading, stopLoading } = useConfirm()

const props = defineProps({
  type: { type: String, default: 'cloud' }
})

const masterData = useMasterDataStore()
const loading = ref(true)
let pollInterval = null

/* --- Table Config --- */
const columns = [
  { key: 'name',          label: 'Sunucu Adı',   sortable: true, width: '180px' },
  { key: 'ip_address',    label: 'IP Adresi',    sortable: true, width: '130px' },
  { key: 'companies',     label: 'Şirket Ataması', sortable: false, width: '220px' },
  { key: 'cpu_usage',     label: 'CPU',          sortable: true, width: '110px' },
  { key: 'ram_usage',     label: 'RAM',          sortable: true, width: '110px' },
  { key: 'disk_usage',    label: 'Disk',         sortable: false, width: '100px' },
  { key: 'status',        label: 'Durum',        sortable: true, width: '100px' },
]

/* --- Data Processing --- */
const tableRows = computed(() => {
  return masterData.servers.filter(s => s.type === props.type)
})

const loadServers = async () => {
  try {
    await masterData.fetchServers()
    loading.value = false
  } catch (err) {
    console.error('Failed to load servers:', err)
  }
}

/* --- Modal & Form --- */
const showModal = ref(false)
const editTarget = ref(null)
const form = ref({ name: '', ip_address: '', os_version: '', description: '', companies: [], type: 'cloud' })

const openEdit = (row) => {
  editTarget.value = row
  form.value = { 
    ...row, 
    companies: row.companies.map(c => ({ id: c.company_id, share_ratio: c.share_ratio })) 
  }
  showModal.value = true
}

const save = async () => {
    try {
        startLoading()
        if (editTarget.value) {
            await masterData.updateItem('servers', editTarget.value.id, form.value)
            showToast('Sunucu başarıyla güncellendi', 'success')
        } else {
            await masterData.createItem('servers', form.value)
            showToast('Yeni sunucu başarıyla eklendi', 'success')
        }
        showModal.value = false
        loadServers()
    } catch (err) {
        showToast('Hata: ' + (err.response?.data?.error || err.message), 'error')
    } finally {
        stopLoading()
    }
}

const handleDelete = async (row) => {
    const impact = await masterData.getDeleteImpact('servers', row.id)
    const confirmed = await ask({
        title: 'Sunucuyu Sil',
        message: `"${row.name}" isimli sunucuyu silmek istediğinize emin misiniz?`,
        confirmLabel: 'Evet, Sil',
        impact: impact
    })
    if (confirmed) {
        try {
            startLoading()
            await masterData.deleteItem('servers', row.id)
            showToast('Sunucu başarıyla silindi', 'success')
            loadServers()
        } catch (e) {
            showToast('Hata: ' + e.message, 'error')
        } finally {
            stopLoading()
        }
    }
}

const addCompanyToForm = () => {
    form.value.companies.push({ id: '', share_ratio: 0 })
}
const removeCompanyFromForm = (index) => {
    form.value.companies.splice(index, 1)
}

onMounted(() => {
    loadServers()
    masterData.fetchCompanies()
    pollInterval = setInterval(loadServers, 5000)
})

onUnmounted(() => {
    if (pollInterval) clearInterval(pollInterval)
})
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Table Section (Full Width, No Header) -->
    <div class="flex-1 min-h-0 bg-white shadow-sm overflow-hidden">
      <AppTable
        :columns="columns"
        :rows="tableRows"
        :loading="loading"
        :actions="true"
        @row-edit="openEdit"
        @row-delete="handleDelete"
      >
        <!-- Custom Cells -->
        <template #cell-name="{ value }">
          <div class="flex items-center gap-2.5">
             <i class="fas fa-server text-gray-400 text-[13px]"></i>
             <span class="font-bold text-gray-900">{{ value }}</span>
          </div>
        </template>

        <template #cell-ip_address="{ value }">
           <span class="font-mono text-[13px] text-gray-600">{{ value }}</span>
        </template>

        <template #cell-companies="{ row }">
          <div class="flex flex-wrap gap-1">
            <span v-for="c in row.companies" :key="c.company_id" 
                  class="px-2 py-0.5 rounded-lg bg-gray-50 border border-gray-100 text-[10px] font-bold text-gray-600">
              {{ c.name }} (%{{ c.share_ratio }})
            </span>
            <span v-if="!row.companies || row.companies.length === 0" class="text-gray-300 italic text-[11px]">Şirket atanmamış</span>
          </div>
        </template>

        <template #cell-cpu_usage="{ value }">
          <div class="w-[80px]">
            <div class="flex justify-between text-[10px] font-bold mb-1">
              <span :class="value > 85 ? 'text-red-500' : 'text-gray-400'">%{{ value }}</span>
            </div>
            <div class="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div class="h-full bg-blue-500 rounded-full" :style="{ width: value + '%' }"></div>
            </div>
          </div>
        </template>

        <template #cell-ram_usage="{ value }">
          <div class="w-[80px]">
            <div class="flex justify-between text-[10px] font-bold mb-1">
              <span :class="value > 85 ? 'text-red-500' : 'text-gray-400'">%{{ value }}</span>
            </div>
            <div class="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div class="h-full bg-emerald-500 rounded-full" :style="{ width: value + '%' }"></div>
            </div>
          </div>
        </template>

        <template #cell-disk_usage="{ value }">
           <span class="font-bold text-gray-600 text-[13px]">{{ value || '--' }}</span>
        </template>

        <template #cell-status="{ value }">
          <span :class="[
            'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold',
            value === 'online' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'
          ]">
            <span class="w-1.5 h-1.5 rounded-full" :class="value === 'online' ? 'bg-emerald-500' : 'bg-gray-400'"></span>
            {{ value === 'online' ? 'Aktif' : 'Pasif' }}
          </span>
        </template>
      </AppTable>
    </div>

    <!-- Edit Modal (Teleport body) -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" @click.self="showModal = false">
        <div class="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
          <div class="px-7 py-5 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 class="text-[17px] font-bold text-gray-900">Sunucu Detayı & Maliyet Payı</h2>
              <p class="text-[12px] text-gray-400 mt-0.5">Sistem bilgilerini ve sahiplik oranlarını düzenleyin</p>
            </div>
            <button type="button" @click="showModal = false" class="text-gray-400 hover:text-gray-600"><i class="fas fa-times"></i></button>
          </div>

          <div class="p-7 space-y-6 max-h-[75vh] overflow-y-auto">
            <div class="grid grid-cols-2 gap-5">
              <div class="col-span-2">
                <label class="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Sunucu Adı</label>
                <input v-model="form.name" type="text" class="w-full h-10 px-3 border border-gray-200 rounded-lg outline-none bg-gray-50" readonly>
              </div>
              <div>
                <label class="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Sunucu Tipi</label>
                <select v-model="form.type" class="w-full h-10 px-3 border border-gray-200 rounded-lg outline-none bg-white text-[13px]">
                   <option value="cloud">Cloud</option>
                   <option value="vodafone">Vodafone</option>
                   <option value="local">Local</option>
                </select>
              </div>
              <div>
                <label class="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">IP Adresi</label>
                <input v-model="form.ip_address" type="text" class="w-full h-10 px-3 border border-gray-200 rounded-lg outline-none focus:border-blue-500" placeholder="10.0.x.x">
              </div>
            </div>

            <div class="border-t border-gray-100 pt-6">
              <div class="flex items-center justify-between mb-4">
                <label class="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Şirket Paylaşımı & Maliyet Payı (%)</label>
                <button @click="addCompanyToForm" type="button" class="text-[11px] font-bold text-blue-600 hover:underline">+ Şirket Ekle</button>
              </div>
              
              <div class="space-y-3">
                <div v-for="(comp, index) in form.companies" :key="index" class="flex gap-3 items-center">
                  <select v-model="comp.id" class="flex-1 h-10 px-3 border border-gray-200 rounded-lg outline-none bg-white text-[13px]">
                    <option value="" disabled>Şirket Seçin</option>
                    <option v-for="c in masterData.companies" :key="c.id" :value="c.id">{{ c.name }}</option>
                  </select>
                  <div class="w-24 relative">
                    <input v-model.number="comp.share_ratio" type="number" class="w-full h-10 pl-3 pr-6 border border-gray-200 rounded-lg outline-none focus:border-blue-500 text-[13px]">
                    <span class="absolute right-2 top-2.5 text-[12px] text-gray-400">%</span>
                  </div>
                  <button @click="removeCompanyFromForm(index)" class="w-10 h-10 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><i class="fas fa-trash-alt"></i></button>
                </div>
              </div>
            </div>
          </div>

          <div class="px-7 py-4 border-t border-gray-100 bg-gray-50/40 flex justify-end gap-2">
            <button @click="showModal = false" class="px-5 py-2 text-[13px] font-semibold text-gray-500 hover:text-gray-700">Vazgeç</button>
            <button @click="save" class="px-6 py-2 text-[13px] font-bold bg-[#1a73e8] text-white rounded-lg hover:bg-blue-700 shadow-sm flex items-center gap-1.5">
              <i class="fas fa-save text-[11px]"></i> Güncelle
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
