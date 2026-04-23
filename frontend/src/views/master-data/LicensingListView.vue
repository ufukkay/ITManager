<script setup>
import { ref, onMounted } from 'vue'
import { useMasterDataStore } from '../../stores/masterData'
import { useToast } from '../../composables/useToast'
import { useConfirm } from '../../composables/useConfirm'
import AppTable from '../../components/AppTable.vue'

const masterData = useMasterDataStore()
const { showToast } = useToast()
const { ask, startLoading, stopLoading } = useConfirm()
const loading = ref(false)

const fetchData = async () => {
  loading.value = true
  try {
    await masterData.fetchLicenses()
  } finally {
    loading.value = false
  }
}

/* ─── Package Management ─── */
const licenseColumns = [
  { key: 'category',      label: 'Kategori',    sortable: true, width: '120px' },
  { key: 'name',          label: 'Lisans Adı',  sortable: true, nowrap: false },
  { key: 'quantity',      label: 'Aktif Atama', sortable: true, width: '120px' },
  { key: 'unit_price',    label: 'Birim Fiyat', sortable: true, width: '140px' },
  { key: 'currency',      label: 'Para Birimi', sortable: true, width: '100px' },
]

const isLicenseModalOpen  = ref(false)
const selectedLicense     = ref(null)
const licenseForm  = ref({ name: '', category: 'M365', quantity: 0, unit_price: 0, currency: 'USD' })

const openLicenseModal = (item = null) => {
  selectedLicense.value = item
  licenseForm.value = item ? { ...item } : { name: '', category: 'M365', quantity: 0, unit_price: 0, currency: 'USD' }
  isLicenseModalOpen.value = true
}

const saveLicense = async () => {
  try {
    startLoading()
    if (selectedLicense.value) {
      await masterData.updateItem('licenses', selectedLicense.value.id, licenseForm.value)
      showToast('Lisans başarıyla güncellendi', 'success')
    } else {
      await masterData.createItem('licenses', licenseForm.value)
      showToast('Yeni lisans başarıyla eklendi', 'success')
    }
    isLicenseModalOpen.value = false
  } catch (err) { showToast('Hata: ' + err.message, 'error') }
  finally { stopLoading() }
}

const handleDelete = async (row) => {
  const confirmed = await ask({
    title: 'Lisans Paketini Sil',
    message: `${row.name} lisans paketini silmek istediğinize emin misiniz? Bu işlem mevcut atamaları etkileyebilir.`,
    confirmLabel: 'Evet, Sil'
  })
  if (confirmed) {
    try {
      startLoading()
      await masterData.deleteItem('licenses', row.id)
      showToast('Lisans başarıyla silindi', 'success')
    } catch (err) { showToast('Hata: ' + err.message, 'error') }
    finally { stopLoading() }
  }
}

onMounted(fetchData)
</script>

<template>
  <div class="h-full flex flex-col gap-0 p-0 bg-white">
    <!-- Header -->
    <div class="px-8 py-6 border-b border-gray-100 flex items-center justify-between shrink-0">
      <div>
        <h1 class="text-[18px] font-black text-gray-900 tracking-tight leading-none mb-1">Lisans Paket Tanımları</h1>
        <p class="text-[12px] text-gray-400 font-medium">Sistemde kullanılan yazılım lisanslarının birim fiyat ve kategori tanımları</p>
      </div>
      
      <div class="flex items-center gap-3">
        <button type="button"
          class="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-[12px] font-bold rounded-xl hover:bg-blue-700 shadow-sm transition-all active:scale-95"
          @click="openLicenseModal()">
          <i class="fas fa-plus text-[11px]"></i> Yeni Paket Tanımla
        </button>
      </div>
    </div>

    <!-- Content Area -->
    <div class="flex-1 overflow-hidden">
      <!-- Package Table -->
      <AppTable
        :columns="licenseColumns"
        :rows="masterData.licenses"
        :loading="loading"
        empty-text="Henüz tanımlanmış bir lisans paketi bulunamadı"
        @row-edit="openLicenseModal"
        @row-delete="handleDelete"
      >
        <template #cell-name="{ value }">
          <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-blue-50 text-blue-500 shrink-0 flex items-center justify-center">
                  <i class="fas fa-key text-[12px]"></i>
              </div>
              <div class="font-bold text-gray-900">{{ value }}</div>
          </div>
        </template>
        <template #cell-category="{ value }">
          <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase" 
            :class="value === 'M365' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'">
            {{ value }}
          </span>
        </template>
        <template #cell-quantity="{ value }">
          <span class="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-[11px] font-black">{{ value || 0 }} Adet</span>
        </template>
        <template #cell-unit_price="{ row }">
          <span class="font-bold text-gray-900">{{ row.unit_price }} {{ row.currency }}</span>
        </template>
      </AppTable>
    </div>

    <!-- Modals -->
    <dialog class="modal" :class="{ 'modal-open': isLicenseModalOpen }">
      <div class="modal-box bg-white p-0 rounded-2xl shadow-2xl border-none max-w-md overflow-hidden">
        <div class="px-7 py-5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
          <h3 class="font-black text-[15px] text-gray-900 uppercase tracking-tight">{{ selectedLicense ? 'Lisans Düzenle' : 'Yeni Lisans Paketi' }}</h3>
          <button @click="isLicenseModalOpen = false" class="text-gray-400 hover:text-gray-600"><i class="fas fa-times"></i></button>
        </div>
        <div class="p-7 space-y-5">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">KATEGORİ</label>
              <select v-model="licenseForm.category" class="w-full h-11 px-4 border border-gray-200 rounded-xl outline-none bg-white text-[13px]">
                <option value="M365">Microsoft 365</option>
                <option value="Adobe">Adobe Creative</option>
                <option value="CAD">CAD / Engineering</option>
                <option value="Antivirus">Antivirus / Security</option>
                <option value="ERP">ERP / CRM</option>
                <option value="Other">Diğer</option>
              </select>
            </div>
            <div>
              <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">PARA BİRİMİ</label>
              <select v-model="licenseForm.currency" class="w-full h-11 px-4 border border-gray-200 rounded-xl outline-none bg-white text-[13px]">
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="TRY">TRY (₺)</option>
              </select>
            </div>
          </div>
          <div>
            <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">LİSANS ADI</label>
            <input v-model="licenseForm.name" type="text" placeholder="Örn: Business Premium"
              class="w-full h-11 px-4 border border-gray-200 rounded-xl outline-none focus:border-blue-500 transition-all text-[13px]">
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">BİRİM FİYAT</label>
              <input v-model="licenseForm.unit_price" type="number" step="0.01"
                class="w-full h-11 px-4 border border-gray-200 rounded-xl outline-none text-[13px]">
            </div>
          </div>
        </div>
        <div class="px-7 py-5 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          <button type="button" @click="isLicenseModalOpen = false" class="px-4 py-2 font-bold text-gray-400 hover:text-gray-600 text-[11px] uppercase tracking-widest">İPTAL</button>
          <button type="button" @click="saveLicense" class="px-8 py-2 bg-blue-600 text-white rounded-xl font-black shadow-lg shadow-blue-100 text-[11px] uppercase tracking-widest active:scale-95 transition-all">KAYDET</button>
        </div>
      </div>
    </dialog>
  </div>
</template>
