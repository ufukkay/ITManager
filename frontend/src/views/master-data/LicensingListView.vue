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
  await masterData.fetchLicenses()
  loading.value = false
}

const licenseColumns = [
  { key: 'name',          label: 'Lisans Adı',  sortable: true, nowrap: false },
  { key: 'quantity',      label: 'Stok Adet',   sortable: true, width: '120px' },
  { key: 'unit_price',    label: 'Birim Fiyat', sortable: true, width: '140px' },
  { key: 'currency',      label: 'Para Birimi', sortable: true, width: '100px' },
]

const isLicenseModalOpen  = ref(false)
const selectedLicense     = ref(null)
const licenseForm  = ref({ name: '', quantity: 0, unit_price: 0, currency: 'USD' })

const openLicenseModal = (item = null) => {
  selectedLicense.value = item
  licenseForm.value = item ? { ...item } : { name: '', quantity: 0, unit_price: 0, currency: 'USD' }
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

const handleDelete = async (id) => {
  const impact = await masterData.getDeleteImpact('licenses', id)
  const confirmed = await ask({
    title: 'Lisansı Sil',
    message: 'Bu lisans tanımını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
    confirmLabel: 'Evet, Sil',
    impact: impact
  })
  if (confirmed) {
    try {
      startLoading()
      await masterData.deleteItem('licenses', id)
      showToast('Lisans başarıyla silindi', 'success')
    } catch (err) {
      showToast('Hata: ' + err.message, 'error')
    } finally {
      stopLoading()
    }
  }
}

onMounted(fetchData)
</script>

<template>
  <div class="h-full flex flex-col gap-4 p-6">
    <!-- Başlık -->
    <div class="flex items-center justify-between shrink-0">
      <div>
        <h1 class="text-xl font-semibold text-gray-800">Yazılım Lisansları</h1>
        <p class="text-sm text-gray-500 mt-0.5">M365, Adobe, Windows, Comodo ve Diğer Yazılım Lisans Envanteri</p>
      </div>
      <button type="button"
        class="flex items-center gap-2 px-4 py-2 bg-[#1a73e8] text-white text-[12.5px] font-semibold rounded-lg hover:bg-[#174ea6] shadow-sm"
        @click="openLicenseModal()">
        <i class="fas fa-plus text-[11px]"></i> Yeni Lisans Paketi
      </button>
    </div>

    <!-- Licenses AppTable -->
    <AppTable
      key="licenses"
      :columns="licenseColumns"
      :rows="masterData.licenses"
      :loading="loading"
      empty-text="Lisans kaydı bulunamadı"
      @row-edit="openLicenseModal"
      @row-delete="(row) => handleDelete(row.id)"
    >
      <template #cell-name="{ value }">
        <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
                <i class="fas fa-key text-[12px]"></i>
            </div>
            <div class="font-bold text-gray-900">{{ value }}</div>
        </div>
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
            <label class="text-xs font-bold text-gray-400 tracking-wider">LİSANS ADI</label>
            <input v-model="licenseForm.name" type="text" placeholder="Örn: Microsoft 365 Business Premium"
              class="w-full h-11 px-4 border border-gray-200 rounded-xl outline-none focus:border-[#1a73e8] transition-all">
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-xs font-bold text-gray-400 tracking-wider">STOK ADET</label>
              <input v-model="licenseForm.quantity" type="number" 
                class="w-full h-11 px-4 border border-gray-200 rounded-xl outline-none">
            </div>
            <div>
              <label class="text-xs font-bold text-gray-400 tracking-wider">PARA BİRİMİ</label>
              <select v-model="licenseForm.currency" class="w-full h-11 px-4 border border-gray-200 rounded-xl outline-none bg-white">
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="TRY">TRY (₺)</option>
              </select>
            </div>
          </div>
          <div>
            <label class="text-xs font-bold text-gray-400 tracking-wider">BİRİM FİYAT</label>
            <input v-model="licenseForm.unit_price" type="number" step="0.01"
              class="w-full h-11 px-4 border border-gray-200 rounded-xl outline-none">
          </div>
        </div>
        <div class="flex justify-end gap-2">
          <button type="button" @click="isLicenseModalOpen = false"
            class="px-4 py-2 font-bold text-gray-400 hover:text-gray-600 uppercase text-[11px] tracking-widest">İPTAL</button>
          <button type="button" @click="saveLicense"
            class="px-6 py-2 bg-[#1a73e8] text-white rounded-xl font-bold shadow-md uppercase text-[11px] tracking-widest">KAYDET</button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop" @click="isLicenseModalOpen = false"><button>close</button></form>
    </dialog>
  </div>
</template>
