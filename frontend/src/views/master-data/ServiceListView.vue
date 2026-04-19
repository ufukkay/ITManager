<script setup>
import { ref, onMounted } from 'vue'
import { useMasterDataStore } from '../../stores/masterData'
import AppTable from '../../components/AppTable.vue'

const masterData = useMasterDataStore()
const loading = ref(false)
const activeTab = ref('operators')

const fetchData = async () => {
  loading.value = true
  await Promise.all([
    masterData.fetchOperators(),
    masterData.fetchPackages(),
    masterData.fetchLicenses()
  ])
  loading.value = false
}

const packageColumns = [
  { key: 'name',          label: 'Paket Adı',  sortable: true, nowrap: false },
  { key: 'operator_name', label: 'Operatör',   sortable: true, width: '140px' },
  { key: 'type',          label: 'Tip',        sortable: true, width: '100px' },
  { key: 'limits',        label: 'Limitler',   sortable: false, filterable: false, width: '120px' },
  { key: 'price',         label: 'Ücret',      sortable: true, width: '100px' },
]

const licenseColumns = [
  { key: 'name',          label: 'Lisans Adı',  sortable: true, nowrap: false },
  { key: 'quantity',      label: 'Stok Adet',   sortable: true, width: '120px' },
  { key: 'unit_price',    label: 'Birim Fiyat', sortable: true, width: '140px' },
  { key: 'currency',      label: 'Para Birimi', sortable: true, width: '100px' },
]

const packageQuickFilters = [
  { key: 'operator_name', label: 'Operatör' },
  { key: 'type',          label: 'Tip' },
]

// Modals
const isOperatorModalOpen = ref(false)
const isPackageModalOpen  = ref(false)
const isLicenseModalOpen  = ref(false)
const selectedOperator    = ref(null)
const selectedPackage     = ref(null)
const selectedLicense     = ref(null)

const operatorForm = ref({ name: '' })
const licenseForm  = ref({ name: '', quantity: 0, unit_price: 0, currency: 'USD' })
const packageForm  = ref({
  name: '', type: 'voice', operator_id: '', price: 0,
  data_limit: null, sms_limit: null, minutes_limit: null, features: ''
})

const openOperatorModal = (item = null) => {
  selectedOperator.value = item
  operatorForm.value = item ? { ...item } : { name: '' }
  isOperatorModalOpen.value = true
}

const openPackageModal = (item = null) => {
  selectedPackage.value = item
  packageForm.value = item ? { ...item } : {
    name: '', type: 'voice', operator_id: '', price: 0,
    data_limit: null, sms_limit: null, minutes_limit: null, features: ''
  }
  isPackageModalOpen.value = true
}

const openLicenseModal = (item = null) => {
  selectedLicense.value = item
  licenseForm.value = item ? { ...item } : { name: '', quantity: 0, unit_price: 0, currency: 'USD' }
  isLicenseModalOpen.value = true
}

const saveOperator = async () => {
  try {
    if (selectedOperator.value)
      await masterData.updateItem('operators', selectedOperator.value.id, operatorForm.value)
    else
      await masterData.createItem('operators', operatorForm.value)
    isOperatorModalOpen.value = false
  } catch (err) { alert(err.message) }
}

const savePackage = async () => {
  try {
    if (selectedPackage.value)
      await masterData.updateItem('packages', selectedPackage.value.id, packageForm.value)
    else
      await masterData.createItem('packages', packageForm.value)
    isPackageModalOpen.value = false
  } catch (err) { alert(err.message) }
}

const saveLicense = async () => {
  try {
    if (selectedLicense.value)
      await masterData.updateItem('licenses', selectedLicense.value.id, licenseForm.value)
    else
      await masterData.createItem('licenses', licenseForm.value)
    isLicenseModalOpen.value = false
  } catch (err) { alert(err.message) }
}

const handleDelete = async (type, id) => {
  if (!confirm('Bu kaydı silmek istediğinize emin misiniz?')) return
  try { await masterData.deleteItem(type, id) }
  catch (err) { alert(err.message) }
}

onMounted(fetchData)
</script>

<template>
  <div class="h-full flex flex-col gap-4 p-6">
    <!-- Başlık -->
    <div class="flex items-center justify-between shrink-0">
      <div>
        <h1 class="text-xl font-semibold text-gray-800">Servis Tanımları</h1>
        <p class="text-sm text-gray-500 mt-0.5">Operatörler ve Hizmet Paketlerinin Merkezi Yönetimi</p>
      </div>
    </div>

    <!-- Sekmeler -->
    <div class="flex border-b border-gray-200 shrink-0">
      <button type="button" @click="activeTab = 'operators'"
        class="px-6 py-3 text-sm font-bold transition-all border-b-2"
        :class="activeTab === 'operators' ? 'border-[#1a73e8] text-[#1a73e8]' : 'border-transparent text-gray-500 hover:text-gray-700'">
        OPERATÖRLER
      </button>
      <button type="button" @click="activeTab = 'packages'"
        class="px-6 py-3 text-sm font-bold transition-all border-b-2"
        :class="activeTab === 'packages' ? 'border-[#1a73e8] text-[#1a73e8]' : 'border-transparent text-gray-500 hover:text-gray-700'">
        HİZMET PAKETLERİ (SIM/M2M)
      </button>
      <button type="button" @click="activeTab = 'licenses'"
        class="px-6 py-3 text-sm font-bold transition-all border-b-2"
        :class="activeTab === 'licenses' ? 'border-[#1a73e8] text-[#1a73e8]' : 'border-transparent text-gray-500 hover:text-gray-700'">
        LİSANS PAKETLERİ (M365)
      </button>
    </div>

    <!-- Operators Card Grid -->
    <div v-if="activeTab === 'operators'" class="flex flex-col gap-4 flex-1 min-h-0">
      <div class="shrink-0">
        <button type="button" @click="openOperatorModal()"
          class="flex items-center gap-2 px-4 py-2 bg-[#1a73e8] text-white text-[12.5px] font-semibold rounded-lg hover:bg-[#174ea6] shadow-sm">
          <i class="fas fa-plus text-[11px]"></i> Yeni Operatör
        </button>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto">
        <div v-for="op in masterData.operators" :key="op.id"
          class="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between group">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-[#1a73e8]">
              <i class="fas fa-tower-broadcast text-xl"></i>
            </div>
            <div>
              <h3 class="font-bold text-gray-800">{{ op.name }}</h3>
              <p class="text-xs text-gray-400">Merkezi Operatör Kaydı</p>
            </div>
          </div>
          <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button type="button" @click="openOperatorModal(op)" class="p-2 text-gray-400 hover:text-blue-600"><i class="far fa-edit"></i></button>
            <button type="button" @click="handleDelete('operators', op.id)" class="p-2 text-gray-400 hover:text-red-600"><i class="far fa-trash-alt"></i></button>
          </div>
        </div>
        <div v-if="masterData.operators.length === 0" class="col-span-full py-20 text-center text-gray-400 italic">
          Operatör kaydı bulunamadı.
        </div>
      </div>
    </div>

    <!-- Packages AppTable -->
    <AppTable
      v-if="activeTab === 'packages'"
      key="packages"
      :columns="packageColumns"
      :rows="masterData.packages"
      :loading="loading"
      :quick-filters="packageQuickFilters"
      empty-text="Paket kaydı bulunamadı"
      @row-edit="openPackageModal"
      @row-delete="(row) => handleDelete('packages', row.id)"
    >
      <template #toolbar>
        <button type="button"
          class="ml-auto flex items-center gap-2 px-4 py-2 bg-[#1a73e8] text-white text-[12.5px] font-semibold rounded-lg hover:bg-[#174ea6] shadow-sm"
          @click="openPackageModal()">
          <i class="fas fa-plus text-[11px]"></i> Yeni Paket
        </button>
      </template>

      <!-- Paket adı + features alt satır -->
      <template #cell-name="{ row, value }">
        <div class="font-bold text-gray-900">{{ value }}</div>
        <div class="text-[11px] text-gray-400 truncate max-w-xs">{{ row.features || 'Detay belirtilmemiş' }}</div>
      </template>

      <!-- Tip badge -->
      <template #cell-type="{ value }">
        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold uppercase ring-1 ring-inset"
          :class="value === 'm2m'  ? 'bg-orange-50 text-orange-700 ring-orange-200' :
                  value === 'data' ? 'bg-blue-50 text-blue-700 ring-blue-200' :
                                     'bg-purple-50 text-purple-700 ring-purple-200'">
          {{ value }}
        </span>
      </template>

      <!-- Limitler (virtual column) -->
      <template #cell-limits="{ row }">
        <div class="text-[12px] text-gray-500">
          <div v-if="row.data_limit">{{ row.data_limit }} GB</div>
          <div v-if="row.minutes_limit">{{ row.minutes_limit }} DK</div>
          <span v-if="!row.data_limit && !row.minutes_limit">—</span>
        </div>
      </template>

      <!-- Ücret -->
      <template #cell-price="{ value }">
        <span class="font-bold text-gray-900">{{ value || 0 }} ₺</span>
      </template>
    </AppTable>

    <!-- Licenses AppTable -->
    <AppTable
      v-if="activeTab === 'licenses'"
      key="licenses"
      :columns="licenseColumns"
      :rows="masterData.licenses"
      :loading="loading"
      empty-text="Lisans kaydı bulunamadı"
      @row-edit="openLicenseModal"
      @row-delete="(row) => handleDelete('licenses', row.id)"
    >
      <template #toolbar>
        <button type="button"
          class="ml-auto flex items-center gap-2 px-4 py-2 bg-[#1a73e8] text-white text-[12.5px] font-semibold rounded-lg hover:bg-[#174ea6] shadow-sm"
          @click="openLicenseModal()">
          <i class="fas fa-plus text-[11px]"></i> Yeni Lisans Paketi
        </button>
      </template>

      <template #cell-name="{ value }">
        <div class="font-bold text-gray-900">{{ value }}</div>
      </template>

      <template #cell-quantity="{ value }">
        <span class="font-bold text-gray-700">{{ value || 0 }}</span>
      </template>

      <template #cell-unit_price="{ row }">
        <span class="font-bold text-gray-900">{{ row.unit_price }} {{ row.currency }}</span>
      </template>
    </AppTable>

    <!-- License Modal -->
    <dialog class="modal" :class="{ 'modal-open': isLicenseModalOpen }">
      <div class="modal-box bg-white p-6 rounded-2xl shadow-xl border border-gray-100 max-w-md">
        <h3 class="font-bold text-lg mb-6">{{ selectedLicense ? 'Lisans Düzenle' : 'Yeni Lisans Paketi' }}</h3>
        <div class="space-y-4 mb-6">
          <div>
            <label class="text-xs font-bold text-gray-400">LİSANS ADI</label>
            <input v-model="licenseForm.name" type="text" 
              class="w-full h-11 px-4 border border-gray-200 rounded-xl outline-none focus:border-[#1a73e8]">
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-xs font-bold text-gray-400">STOK ADET</label>
              <input v-model="licenseForm.quantity" type="number" 
                class="w-full h-11 px-4 border border-gray-200 rounded-xl outline-none">
            </div>
            <div>
              <label class="text-xs font-bold text-gray-400">PARA BİRİMİ</label>
              <select v-model="licenseForm.currency" class="w-full h-11 px-4 border border-gray-200 rounded-xl outline-none bg-white">
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="TRY">TRY (₺)</option>
              </select>
            </div>
          </div>
          <div>
            <label class="text-xs font-bold text-gray-400">BİRİM FİYAT</label>
            <input v-model="licenseForm.unit_price" type="number" step="0.01"
              class="w-full h-11 px-4 border border-gray-200 rounded-xl outline-none">
          </div>
        </div>
        <div class="flex justify-end gap-2">
          <button type="button" @click="isLicenseModalOpen = false"
            class="px-4 py-2 font-bold text-gray-400 hover:text-gray-600 uppercase text-xs">İPTAL</button>
          <button type="button" @click="saveLicense"
            class="px-6 py-2 bg-[#1a73e8] text-white rounded-xl font-bold shadow-md uppercase text-xs">KAYDET</button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop" @click="isLicenseModalOpen = false"><button>close</button></form>
    </dialog>

    <!-- Operator Modal -->
    <dialog class="modal" :class="{ 'modal-open': isOperatorModalOpen }">
      <div class="modal-box bg-white p-6 rounded-2xl shadow-xl border border-gray-100 max-w-sm">
        <h3 class="font-bold text-lg mb-4">{{ selectedOperator ? 'Operatör Düzenle' : 'Yeni Operatör' }}</h3>
        <input v-model="operatorForm.name" type="text" placeholder="Operatör Adı (Örn: Turkcell)"
          class="w-full h-11 px-4 border border-gray-200 rounded-xl outline-none focus:border-[#1a73e8] mb-6">
        <div class="flex justify-end gap-2">
          <button type="button" @click="isOperatorModalOpen = false"
            class="px-4 py-2 font-bold text-gray-400 hover:text-gray-600 uppercase text-xs">İPTAL</button>
          <button type="button" @click="saveOperator"
            class="px-6 py-2 bg-[#1a73e8] text-white rounded-xl font-bold shadow-md uppercase text-xs">KAYDET</button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop" @click="isOperatorModalOpen = false"><button>close</button></form>
    </dialog>

    <!-- Package Modal -->
    <dialog class="modal" :class="{ 'modal-open': isPackageModalOpen }">
      <div class="modal-box bg-white p-6 rounded-2xl shadow-xl border border-gray-100 max-w-lg">
        <h3 class="font-bold text-lg mb-6">{{ selectedPackage ? 'Paket Düzenle' : 'Yeni Hizmet Paketi Ekleyin' }}</h3>
        <div class="grid grid-cols-2 gap-4 mb-6">
          <div class="col-span-2 space-y-1">
            <label class="text-xs font-bold text-gray-400">PAKET ADI</label>
            <input v-model="packageForm.name" type="text" required
              class="w-full h-11 px-4 border border-gray-200 rounded-xl outline-none focus:border-[#1a73e8]">
          </div>
          <div class="space-y-1">
            <label class="text-xs font-bold text-gray-400">OPERATÖR</label>
            <select v-model="packageForm.operator_id"
              class="w-full h-11 px-4 border border-gray-200 rounded-xl outline-none bg-white">
              <option v-for="op in masterData.operators" :key="op.id" :value="op.id">{{ op.name }}</option>
            </select>
          </div>
          <div class="space-y-1">
            <label class="text-xs font-bold text-gray-400">TIP</label>
            <select v-model="packageForm.type"
              class="w-full h-11 px-4 border border-gray-200 rounded-xl outline-none bg-white">
              <option value="voice">Ses Hattı</option>
              <option value="data">Data Hattı</option>
              <option value="m2m">M2M Hattı</option>
            </select>
          </div>
          <div class="space-y-1">
            <label class="text-xs font-bold text-gray-400">FIYAT (₺)</label>
            <input v-model="packageForm.price" type="number" step="0.01"
              class="w-full h-11 px-4 border border-gray-200 rounded-xl outline-none">
          </div>
          <div class="space-y-1">
            <label class="text-xs font-bold text-gray-400">DATA (GB)</label>
            <input v-model="packageForm.data_limit" type="number"
              class="w-full h-11 px-4 border border-gray-200 rounded-xl outline-none">
          </div>
          <div class="col-span-2 space-y-1">
            <label class="text-xs font-bold text-gray-400">ÖZELLIKLER / NOTLAR</label>
            <input v-model="packageForm.features" type="text"
              class="w-full h-11 px-4 border border-gray-200 rounded-xl outline-none">
          </div>
        </div>
        <div class="flex justify-end gap-2">
          <button type="button" @click="isPackageModalOpen = false"
            class="px-4 py-2 font-bold text-gray-400 hover:text-gray-600 uppercase text-xs">İPTAL</button>
          <button type="button" @click="savePackage"
            class="px-6 py-2 bg-[#1a73e8] text-white rounded-xl font-bold shadow-md uppercase text-xs">KAYDET</button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop" @click="isPackageModalOpen = false"><button>close</button></form>
    </dialog>
  </div>
</template>
