<script setup>
import { ref, computed, onMounted } from 'vue'
import { useMasterDataStore } from '../../stores/masterData'
import { useToast } from '../../composables/useToast'
import { useConfirm } from '../../composables/useConfirm'
import AppTable from '../../components/AppTable.vue'
import * as XLSX from 'xlsx'

const masterData = useMasterDataStore()
const { showToast } = useToast()
const { ask, startLoading, stopLoading } = useConfirm()
const loading    = ref(false)

const columns = [
  { key: 'name',    label: 'Lokasyon Adı', width: '220px', sortable: true },
  { key: 'address', label: 'Adres',        sortable: true, nowrap: false },
  { key: 'notes',   label: 'Notlar',       sortable: false, nowrap: false, filterable: false },
]

const rows = computed(() => masterData.locations)

const fetchData = async () => {
  loading.value = true
  await masterData.fetchLocations()
  loading.value = false
}

// ── Modal ─────────────────────────────────────────────────────────────────────
const isModalOpen  = ref(false)
const selectedItem = ref(null)
const form         = ref({ name: '', address: '', notes: '' })

const openAddModal = () => {
  selectedItem.value = null
  form.value = { name: '', address: '', notes: '' }
  isModalOpen.value = true
}

const openEditModal = (row) => {
  selectedItem.value = row
  form.value = { ...row }
  isModalOpen.value = true
}

const saveItem = async () => {
  try {
    if (selectedItem.value) {
      await masterData.updateItem('locations', selectedItem.value.id, form.value)
      showToast('Lokasyon başarıyla güncellendi', 'success')
    } else {
      await masterData.createItem('locations', form.value)
      showToast('Yeni lokasyon başarıyla eklendi', 'success')
    }
    isModalOpen.value = false
  } catch (err) { showToast('Hata: ' + err.message, 'error') }
}

const handleDelete = async (row) => {
  const impact = await masterData.getDeleteImpact('locations', row.id)
  const confirmed = await ask({
    title: 'Lokasyonu Sil',
    message: `"${row.name}" isimli lokasyonu silmek istediğinize emin misiniz?`,
    confirmLabel: 'Evet, Sil',
    impact: impact
  })

  if (confirmed) {
    try {
      startLoading()
      await masterData.deleteItem('locations', row.id)
      showToast('Lokasyon başarıyla silindi', 'success')
    } catch (err) {
      showToast('Hata: ' + err.message, 'error')
    } finally {
      stopLoading()
    }
  }
}

const downloadTemplate = () => {
  const ws = XLSX.utils.json_to_sheet([
    { 'Lokasyon Adı': 'Genel Merkez', 'Adres': 'İstanbul, Türkiye', 'Notlar': 'Merkez ofis binası' }
  ])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Lokasyon_Sablon')
  XLSX.writeFile(wb, 'Lokasyon_Iceri_Aktarma_Sablonu.xlsx')
}

const handleExcelImport = (e) => {
  const file = e.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = async (evt) => {
    try {
      loading.value = true
      const data = evt.target.result
      const workbook = XLSX.read(data, { type: 'binary' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(sheet)
      
      let successCount = 0
      for (const row of rows) {
        const payload = {
          name: String(row['Lokasyon Adı'] || '').trim(),
          address: String(row['Adres'] || '').trim(),
          notes: String(row['Notlar'] || '').trim()
        }

        if (payload.name) {
          try {
            await masterData.createItem('locations', payload)
            successCount++
          } catch (err) { console.error('Lokasyon eklenemedi:', err) }
        }
      }
      alert(`${successCount} lokasyon başarıyla aktarıldı.`)
      await fetchData()
    } catch (err) {
      alert('Excel işlenirken hata oluştu.')
    } finally {
      loading.value = false
      e.target.value = ''
    }
  }
  reader.readAsBinaryString(file)
}

onMounted(fetchData)
</script>

<template>
  <div class="h-full flex flex-col gap-4 p-6">
    <!-- Başlık -->
    <div class="flex items-center justify-between shrink-0">
      <div>
        <h1 class="text-xl font-semibold text-gray-800">Lokasyonlar</h1>
        <p class="text-sm text-gray-500 mt-0.5">Saha, Ofis ve Depo Lokasyonlarının Yönetimi</p>
      </div>
    </div>

    <!-- AppTable -->
    <AppTable
      :columns="columns"
      :rows="rows"
      :loading="loading"
      empty-text="Kayıtlı lokasyon bulunamadı"
      @row-edit="openEditModal"
      @row-delete="handleDelete"
    >
      <template #toolbar>
        <div class="flex items-center gap-2">
          <button type="button" @click="downloadTemplate" 
            class="px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-[12px] font-semibold hover:bg-gray-50 flex items-center gap-1.5 transition-all">
            <i class="fas fa-download text-gray-400"></i> Örnek Şablon
          </button>
          <label class="cursor-pointer px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg text-[12px] font-bold hover:bg-emerald-100 flex items-center gap-1.5 transition-colors">
            <i class="fas fa-file-excel"></i> Excel'den Yükle
            <input type="file" @change="handleExcelImport" class="hidden" accept=".xlsx,.xls">
          </label>
        </div>
        <button
          type="button"
          class="ml-auto flex items-center gap-2 px-4 py-2 bg-[#1a73e8] text-white text-[12.5px] font-semibold rounded-lg hover:bg-[#174ea6] shadow-sm"
          @click="openAddModal"
        >
          <i class="fas fa-plus text-[11px]"></i> Yeni Lokasyon
        </button>
      </template>
    </AppTable>

    <!-- Modal -->
    <dialog class="modal" :class="{ 'modal-open': isModalOpen }">
      <div class="modal-box bg-white p-0 rounded-2xl shadow-xl border border-gray-100 max-w-md">
        <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h3 class="font-bold text-lg text-gray-800">
            {{ selectedItem ? 'Lokasyon Düzenle' : 'Yeni Lokasyon Ekle' }}
          </h3>
          <button type="button" class="text-gray-400 hover:text-gray-600" @click="isModalOpen = false">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <form class="p-6 space-y-4" @submit.prevent="saveItem">
          <div class="space-y-1">
            <label class="text-xs font-bold text-gray-500 uppercase">Lokasyon Adı</label>
            <input v-model="form.name" type="text" required placeholder="Örn: Tuzla Depo"
              class="w-full h-11 px-4 border border-gray-200 rounded-xl outline-none focus:border-[#1a73e8]">
          </div>
          <div class="space-y-1">
            <label class="text-xs font-bold text-gray-500 uppercase">Adres</label>
            <textarea v-model="form.address" rows="2"
              class="w-full p-4 border border-gray-200 rounded-xl outline-none focus:border-[#1a73e8]"
              placeholder="Tam adres bilgisi..."></textarea>
          </div>
          <div class="space-y-1">
            <label class="text-xs font-bold text-gray-500 uppercase">Notlar</label>
            <textarea v-model="form.notes" rows="2"
              class="w-full p-4 border border-gray-200 rounded-xl outline-none focus:border-[#1a73e8]"
              placeholder="Lokasyon hakkında ek bilgi..."></textarea>
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
