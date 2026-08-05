<script setup>
import { computed, onMounted } from 'vue'
import { useMasterDataListPage } from '../../composables/useMasterDataListPage'
import AppTable from '../../components/AppTable.vue'
import * as XLSX from 'xlsx'

const {
  masterData, loading, isModalOpen, selectedItem, form,
  fetchData, openAddModal, openEditModal, saveItem: saveItemBase, handleDelete
} = useMasterDataListPage({
  type: 'vehicles',
  defaultForm: { plate_no: '', vehicle_type: 'Binek', personnel_id: '', notes: '' },
  deleteMessage: {
    title: 'Aracı Sil',
    message: (row) => `"${row.plate_no}" plakalı aracı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`,
    confirmLabel: 'Evet, Aracı Sil'
  }
})

const saveItem = () => saveItemBase({ update: 'Araç başarıyla güncellendi', create: 'Yeni araç başarıyla eklendi' })

const columns = [
  { key: 'plate_no',       label: 'Plaka',                   width: '150px', sortable: true },
  { key: 'vehicle_type',   label: 'Araç Tipi',               width: '160px', sortable: true },
  { key: 'personnel_name', label: 'Atanan Sürücü / Personel', width: '220px', sortable: true },
  { key: 'notes',          label: 'Notlar',                  sortable: false, nowrap: false, filterable: false },
]

const quickFilters = [
  { key: 'vehicle_type', label: 'Araç Tipi' },
]

const rows = computed(() => masterData.vehicles)

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

onMounted(() => {
  fetchData()
  masterData.fetchPersonnel()
})
</script>

<template>
  <div class="h-full flex flex-col gap-4 p-6">
    <!-- Başlık -->
    <div class="flex items-center justify-between shrink-0">
      <div>
        <h1 class="text-xl font-semibold text-gray-800 dark:text-slate-100">Araç Envanteri</h1>
        <p class="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Sistem Genelindeki Tüm Kayıtlı Araçlar ve Sürücü Zimmetleri</p>
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
            class="px-3 py-1.5 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 rounded-lg text-[12px] font-semibold hover:bg-gray-50 dark:hover:bg-slate-700/50 flex items-center gap-1.5 transition-all">
            <i class="fas fa-download text-gray-400 dark:text-slate-500"></i> Örnek Şablon
          </button>
          <label class="cursor-pointer px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20 rounded-lg text-[12px] font-bold hover:bg-emerald-100 dark:hover:bg-emerald-500/20 flex items-center gap-1.5 transition-colors">
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
        <span class="font-semibold text-gray-900 dark:text-slate-100 tracking-wide">{{ value }}</span>
      </template>

      <!-- Araç tipi badge -->
      <template #cell-vehicle_type="{ value }">
        <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300">
          {{ value || '—' }}
        </span>
      </template>

      <!-- Personel / Sürücü -->
      <template #cell-personnel_name="{ value }">
        <span v-if="value" class="inline-flex items-center gap-1.5 font-semibold text-blue-600 dark:text-blue-400">
          <i class="fas fa-user text-xs"></i> {{ value }}
        </span>
        <span v-else class="text-gray-400 dark:text-slate-500 italic">Atanmamış (Boşta)</span>
      </template>
    </AppTable>

    <!-- Modal -->
    <dialog class="modal" :class="{ 'modal-open': isModalOpen }">
      <div class="modal-box bg-white dark:bg-slate-800 p-0 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700 max-w-md">
        <div class="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
          <h3 class="font-bold text-lg text-gray-800 dark:text-slate-100">
            {{ selectedItem ? 'Araç Düzenle' : 'Yeni Araç Ekle' }}
          </h3>
          <button type="button" class="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300" @click="isModalOpen = false">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <form class="p-6 space-y-4" @submit.prevent="saveItem">
          <div class="space-y-1">
            <label class="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Plaka</label>
            <input v-model="form.plate_no" type="text" required placeholder="Örn: 34 ABC 123"
              class="w-full h-11 px-4 border border-gray-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-xl outline-none focus:border-[#1a73e8]">
          </div>
          <div class="space-y-1">
            <label class="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Araç Tipi</label>
            <select v-model="form.vehicle_type"
              class="w-full h-11 px-4 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:border-[#1a73e8] bg-white dark:bg-slate-900 dark:text-slate-100">
              <option value="Çekici">Çekici</option>
              <option value="Dorse">Dorse</option>
              <option value="Binek">Binek</option>
              <option value="Hafif Ticari">Hafif Ticari</option>
            </select>
          </div>
          <div class="space-y-1">
            <label class="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Atanan Sürücü / Personel</label>
            <select v-model="form.personnel_id"
              class="w-full h-11 px-4 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:border-[#1a73e8] bg-white dark:bg-slate-900 dark:text-slate-100">
              <option value="">Atanmamış (Boşta)</option>
              <option v-for="p in masterData.personnel" :key="p.id" :value="p.id">
                {{ p.first_name ? `${p.first_name} ${p.last_name}` : (p.name || `Personel #${p.id}`) }}
              </option>
            </select>
          </div>
          <div class="space-y-1">
            <label class="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Notlar</label>
            <textarea v-model="form.notes" rows="3"
              class="w-full p-4 border border-gray-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-xl outline-none focus:border-[#1a73e8]"
              placeholder="Araç hakkında ek bilgi..."></textarea>
          </div>
          <div class="flex justify-end gap-3 pt-2">
            <button type="button" class="px-6 py-2 text-gray-500 dark:text-slate-400 font-bold hover:text-gray-800 dark:hover:text-slate-200"
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
