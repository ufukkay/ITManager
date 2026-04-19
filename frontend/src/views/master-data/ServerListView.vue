<script setup>
import { ref, computed, onMounted } from 'vue'
import { useMasterDataStore } from '../../stores/masterData'
import AppTable from '../../components/AppTable.vue'

const masterData = useMasterDataStore()
const loading    = ref(false)

const columns = [
  { key: 'name',        label: 'Sunucu Adı',   width: '200px', sortable: true },
  { key: 'ip_address',  label: 'IP Adresi',    width: '140px', sortable: true },
  { key: 'type',        label: 'Tip',          width: '100px', sortable: true },
  { key: 'os_version',  label: 'İşletim Sistemi', width: '160px', sortable: true },
  { key: 'companies',   label: 'Şirket Ataması',  width: '240px', sortable: false },
  { key: 'status',      label: 'Durum',        width: '100px', sortable: true },
  { key: 'description', label: 'Açıklama',     sortable: false, nowrap: false },
]

const rows = computed(() => masterData.servers)

const fetchData = async () => {
  loading.value = true
  await masterData.fetchServers()
  await masterData.fetchCompanies()
  loading.value = false
}

// ── Modal ─────────────────────────────────────────────────────────────────────
const isModalOpen  = ref(false)
const selectedItem = ref(null)
const form         = ref({ name: '', ip_address: '', os_version: '', description: '', type: 'cloud', companies: [] })

const typeOptions = [
  { value: 'cloud',    label: 'Cloud' },
  { value: 'vodafone', label: 'Vodafone' },
  { value: 'local',    label: 'Local' },
]

const openAddModal = () => {
  selectedItem.value = null
  form.value = { name: '', ip_address: '', os_version: '', description: '', type: 'cloud', companies: [] }
  isModalOpen.value = true
}

const openEditModal = (row) => {
  selectedItem.value = row
  form.value = {
    ...row,
    companies: row.companies.map(c => ({ id: c.company_id, share_ratio: c.share_ratio }))
  }
  isModalOpen.value = true
}

const addCompany = () => {
  form.value.companies.push({ id: '', share_ratio: 0 })
}

const removeCompany = (index) => {
  form.value.companies.splice(index, 1)
}

const saveItem = async () => {
  try {
    if (selectedItem.value)
      await masterData.updateItem('servers', selectedItem.value.id, form.value)
    else
      await masterData.createItem('servers', form.value)
    isModalOpen.value = false
    await masterData.fetchServers()
  } catch (err) { alert('Hata: ' + err.message) }
}

const handleDelete = async (row) => {
  if (!confirm('Bu sunucuyu silmek istediğinize emin misiniz?')) return
  try {
    await masterData.deleteItem('servers', row.id)
    await masterData.fetchServers()
  } catch (err) { alert('Hata: ' + err.message) }
}

onMounted(fetchData)
</script>

<template>
  <div class="h-full flex flex-col gap-4 p-6">
    <!-- Başlık -->
    <div class="flex items-center justify-between shrink-0">
      <div>
        <h1 class="text-xl font-semibold text-gray-800">Sunucu Envanteri</h1>
        <p class="text-sm text-gray-500 mt-0.5">Tüm sunucu kayıtlarının merkezi yönetimi</p>
      </div>
    </div>

    <!-- AppTable -->
    <AppTable
      :columns="columns"
      :rows="rows"
      :loading="loading"
      empty-text="Kayıtlı sunucu bulunamadı"
      @row-edit="openEditModal"
      @row-delete="handleDelete"
    >
      <template #toolbar>
        <button
          type="button"
          class="ml-auto flex items-center gap-2 px-4 py-2 bg-[#1a73e8] text-white text-[12.5px] font-semibold rounded-lg hover:bg-[#174ea6] shadow-sm"
          @click="openAddModal"
        >
          <i class="fas fa-plus text-[11px]"></i> Yeni Sunucu
        </button>
      </template>

      <!-- Custom cell: name -->
      <template #cell-name="{ value }">
        <div class="flex items-center gap-2.5">
          <i class="fas fa-server text-gray-400 text-[13px]"></i>
          <span class="font-bold text-gray-900">{{ value }}</span>
        </div>
      </template>

      <!-- Custom cell: ip -->
      <template #cell-ip_address="{ value }">
        <span class="font-mono text-[13px] text-gray-600">{{ value || '--' }}</span>
      </template>

      <!-- Custom cell: type -->
      <template #cell-type="{ value }">
        <span :class="[
          'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase',
          value === 'cloud' ? 'bg-blue-50 text-blue-600' :
          value === 'vodafone' ? 'bg-red-50 text-red-600' :
          'bg-gray-100 text-gray-600'
        ]">
          <i :class="[
            'text-[10px]',
            value === 'cloud' ? 'fas fa-cloud' :
            value === 'vodafone' ? 'fas fa-network-wired' :
            'fas fa-hdd'
          ]"></i>
          {{ value }}
        </span>
      </template>

      <!-- Custom cell: companies -->
      <template #cell-companies="{ row }">
        <div class="flex flex-wrap gap-1">
          <span v-for="c in row.companies" :key="c.company_id" 
                class="px-2 py-0.5 rounded-lg bg-gray-50 border border-gray-100 text-[10px] font-bold text-gray-600">
            {{ c.name }} (%{{ c.share_ratio }})
          </span>
          <span v-if="!row.companies || row.companies.length === 0" class="text-gray-300 italic text-[11px]">Şirket atanmamış</span>
        </div>
      </template>

      <!-- Custom cell: status -->
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

    <!-- Modal -->
    <dialog class="modal" :class="{ 'modal-open': isModalOpen }">
      <div class="modal-box bg-white p-0 rounded-2xl shadow-xl border border-gray-100 max-w-xl">
        <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h3 class="font-bold text-lg text-gray-800">
            {{ selectedItem ? 'Sunucu Düzenle' : 'Yeni Sunucu Ekle' }}
          </h3>
          <button type="button" class="text-gray-400 hover:text-gray-600" @click="isModalOpen = false">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <form class="p-6 space-y-5 max-h-[75vh] overflow-y-auto" @submit.prevent="saveItem">
          <div class="grid grid-cols-2 gap-4">
            <div class="col-span-2 space-y-1">
              <label class="text-xs font-bold text-gray-500 uppercase">Sunucu Adı</label>
              <input v-model="form.name" type="text" required placeholder="Örn: SRV-DC01"
                class="w-full h-11 px-4 border border-gray-200 rounded-xl outline-none focus:border-[#1a73e8]">
            </div>
            <div class="space-y-1">
              <label class="text-xs font-bold text-gray-500 uppercase">Sunucu Tipi</label>
              <select v-model="form.type" class="w-full h-11 px-4 border border-gray-200 rounded-xl outline-none bg-white text-[13px]">
                <option v-for="opt in typeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
            </div>
            <div class="space-y-1">
              <label class="text-xs font-bold text-gray-500 uppercase">IP Adresi</label>
              <input v-model="form.ip_address" type="text" placeholder="10.0.x.x"
                class="w-full h-11 px-4 border border-gray-200 rounded-xl outline-none focus:border-[#1a73e8]">
            </div>
            <div class="space-y-1">
              <label class="text-xs font-bold text-gray-500 uppercase">İşletim Sistemi</label>
              <input v-model="form.os_version" type="text" placeholder="Windows Server 2022"
                class="w-full h-11 px-4 border border-gray-200 rounded-xl outline-none focus:border-[#1a73e8]">
            </div>
            <div class="space-y-1">
              <label class="text-xs font-bold text-gray-500 uppercase">Açıklama</label>
              <input v-model="form.description" type="text" placeholder="Sunucu açıklaması..."
                class="w-full h-11 px-4 border border-gray-200 rounded-xl outline-none focus:border-[#1a73e8]">
            </div>
          </div>

          <!-- Şirket Paylaşımı -->
          <div class="border-t border-gray-100 pt-5">
            <div class="flex items-center justify-between mb-3">
              <label class="text-xs font-bold text-gray-500 uppercase">Şirket Paylaşımı & Maliyet Payı (%)</label>
              <button @click="addCompany" type="button" class="text-[11px] font-bold text-blue-600 hover:underline">+ Şirket Ekle</button>
            </div>
            <div class="space-y-2">
              <div v-for="(comp, index) in form.companies" :key="index" class="flex gap-3 items-center">
                <select v-model="comp.id" class="flex-1 h-10 px-3 border border-gray-200 rounded-lg outline-none bg-white text-[13px]">
                  <option value="" disabled>Şirket Seçin</option>
                  <option v-for="c in masterData.companies" :key="c.id" :value="c.id">{{ c.name }}</option>
                </select>
                <div class="w-24 relative">
                  <input v-model.number="comp.share_ratio" type="number" class="w-full h-10 pl-3 pr-6 border border-gray-200 rounded-lg outline-none focus:border-blue-500 text-[13px]">
                  <span class="absolute right-2 top-2.5 text-[12px] text-gray-400">%</span>
                </div>
                <button @click="removeCompany(index)" type="button" class="w-10 h-10 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                  <i class="fas fa-trash-alt"></i>
                </button>
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-2">
            <button type="button" class="px-6 py-2 text-gray-500 font-bold hover:text-gray-800"
              @click="isModalOpen = false">İptal</button>
            <button type="submit"
              class="px-8 py-2 bg-[#1a73e8] text-white rounded-xl font-bold hover:bg-[#174ea6] shadow-md">Kaydet</button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop" @click="isModalOpen = false"><button>close</button></form>
    </dialog>
  </div>
</template>
