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
  { key: 'plate_no',     label: 'Plaka',     width: '150px', sortable: true },
  { key: 'vehicle_type', label: 'Araç Tipi', width: '160px', sortable: true },
  { key: 'notes',        label: 'Notlar',    sortable: false, nowrap: false, filterable: false },
]

const quickFilters = [
  { key: 'vehicle_type', label: 'Araç Tipi' },
]

const rows = computed(() => masterData.vehicles)

const fetchData = async () => {
  loading.value = true
  await masterData.fetchVehicles()
  loading.value = false
}

// ── Modal ─────────────────────────────────────────────────────────────────────
const isModalOpen  = ref(false)
const selectedItem = ref(null)
const form         = ref({ plate_no: '', vehicle_type: 'Binek', notes: '' })

const openAddModal = () => {
  selectedItem.value = null
  form.value = { plate_no: '', vehicle_type: 'Binek', notes: '' }
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
      await masterData.updateItem('vehicles', selectedItem.value.id, form.value)
      showToast('Araç başarıyla güncellendi', 'success')
    } else {
      await masterData.createItem('vehicles', form.value)
      showToast('Yeni araç başarıyla eklendi', 'success')
    }
    isModalOpen.value = false
  } catch (err) { showToast('Hata: ' + err.message, 'error') }
}

const handleDelete = async (row) => {
  const impact = await masterData.getDeleteImpact('vehicles', row.id)
  const confirmed = await ask({
    title: 'Aracı Sil',
    message: `"${row.plate_no}" plakalı aracı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`,
    confirmLabel: 'Evet, Aracı Sil',
    impact: impact
  })

  if (confirmed) {
    try {
      startLoading()
      await masterData.deleteItem('vehicles', row.id)
      showToast('Araç başarıyla silindi', 'success')
    } catch (err) {
      showToast('Hata: ' + err.message, 'error')
    } finally {
      stopLoading()
    }
  }
}

const downloadTemplate = () => {
  const ws = XLSX.utils.json_to_sheet([
    { 'Plaka': '34 ABC 123', 'Araç Tipi': 'Binek', 'Notlar': 'Müdür aracı' }
  ])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Arac_Sablon')
  XLSX.writeFile(wb, 'Arac_Iceri_Aktarma_Sablonu.xlsx')
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
          plate_no: String(row['Plaka'] || '').trim().toUpperCase(),
          vehicle_type: String(row['Araç Tipi'] || 'Binek').trim(),
          notes: String(row['Notlar'] || '').trim()
        }

        if (payload.plate_no) {
          try {
            await masterData.createItem('vehicles', payload)
            successCount++
          } catch (err) { console.error('Araç eklenemedi:', err) }
        }
      }
      alert(`${successCount} araç başarıyla aktarıldı.`)
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
        <h1 class="text-xl font-semibold text-gray-800">Araç Envanteri</h1>
        <p class="text-sm text-gray-500 mt-0.5">Sistem Genelindeki Tüm Kayıtlı Araçların Listesi</p>
      </div>
    </div>

    <!-- AppTable -->
    <AppTable
      :columns="columns"
      :rows="rows"
      :loading="loading"
      :quick-filters="quickFilters"
      empty-text="Kayıtlı araç bulunamadı"
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
          <i class="fas fa-plus text-[11px]"></i> Yeni Araç
        </button>
      </template>

      <!-- Plaka bold -->
      <template #cell-plate_no="{ value }">
        <span class="font-semibold text-gray-900 tracking-wide">{{ value }}</span>
      </template>

      <!-- Araç tipi badge -->
      <template #cell-vehicle_type="{ value }">
        <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-100 text-gray-600">
          {{ value || '—' }}
        </span>
      </template>
    </AppTable>

    <!-- Modal -->
    <dialog class="modal" :class="{ 'modal-open': isModalOpen }">
      <div class="modal-box bg-white p-0 rounded-2xl shadow-xl border border-gray-100 max-w-md">
        <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h3 class="font-bold text-lg text-gray-800">
            {{ selectedItem ? 'Araç Düzenle' : 'Yeni Araç Ekle' }}
          </h3>
          <button type="button" class="text-gray-400 hover:text-gray-600" @click="isModalOpen = false">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <form class="p-6 space-y-4" @submit.prevent="saveItem">
          <div class="space-y-1">
            <label class="text-xs font-bold text-gray-500 uppercase">Plaka</label>
            <input v-model="form.plate_no" type="text" required placeholder="Örn: 34 ABC 123"
              class="w-full h-11 px-4 border border-gray-200 rounded-xl outline-none focus:border-[#1a73e8]">
          </div>
          <div class="space-y-1">
            <label class="text-xs font-bold text-gray-500 uppercase">Araç Tipi</label>
            <select v-model="form.vehicle_type"
              class="w-full h-11 px-4 border border-gray-200 rounded-xl outline-none focus:border-[#1a73e8] bg-white">
              <option value="Çekici">Çekici</option>
              <option value="Dorse">Dorse</option>
              <option value="Binek">Binek</option>
              <option value="Hafif Ticari">Hafif Ticari</option>
            </select>
          </div>
          <div class="space-y-1">
            <label class="text-xs font-bold text-gray-500 uppercase">Notlar</label>
            <textarea v-model="form.notes" rows="3"
              class="w-full p-4 border border-gray-200 rounded-xl outline-none focus:border-[#1a73e8]"
              placeholder="Araç hakkında ek bilgi..."></textarea>
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
