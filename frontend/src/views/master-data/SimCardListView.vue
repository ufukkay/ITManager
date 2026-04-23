<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useSimApi } from '../../composables/useSimApi'
import { useMasterDataStore } from '../../stores/masterData'
import { useToast } from '../../composables/useToast'
import { useConfirm } from '../../composables/useConfirm'
import AppTable from '../../components/AppTable.vue'
import HistoryModal from '../../components/HistoryModal.vue'
import * as XLSX from 'xlsx'

const masterData = useMasterDataStore()
const { showToast } = useToast()
const { ask, startLoading, stopLoading } = useConfirm()

const activeTab = ref('voice') // voice, data, m2m
const loading = ref(false)

// Use separate API instances for each tab to ensure stable reactivity
const apiInstances = {
  voice: useSimApi('voice'),
  data: useSimApi('data'),
  m2m: useSimApi('m2m')
}

const fetchData = async () => {
  loading.value = true
  try {
    const currentApi = apiInstances[activeTab.value]
    await Promise.all([
      currentApi.fetchList(),
      masterData.fetchOperators(),
      masterData.fetchPersonnel(),
      masterData.fetchCompanies(),
      masterData.fetchDepartments(),
      masterData.fetchPackages(activeTab.value)
    ])
  } finally {
    loading.value = false
  }
}

// Watch for tab changes to fetch data
watch(activeTab, () => {
  fetchData()
})

const columns = computed(() => {
  const base = [
    { key: 'phone_no',       label: 'Telefon No', sortable: true, width: '160px' },
    { key: 'iccid',          label: 'ICCID',      sortable: true, width: '220px' },
    { key: 'operator',       label: 'Operatör',   sortable: true, width: '140px' },
  ]
  
  if (activeTab.value === 'voice') {
    return [
      ...base,
      { key: 'personnel_name', label: 'Personel',   sortable: true, width: '160px' },
      { key: 'status',         label: 'Durum',      sortable: true, width: '130px' },
    ]
  }
  
  if (activeTab.value === 'data') {
    return [
      ...base,
      { key: 'location_name',  label: 'Lokasyon',   sortable: true, width: '160px' },
      { key: 'status',         label: 'Durum',      sortable: true, width: '130px' },
    ]
  }

  if (activeTab.value === 'm2m') {
    return [
      ...base,
      { key: 'plate_no',       label: 'Plaka',      sortable: true, width: '140px' },
      { key: 'status',         label: 'Durum',      sortable: true, width: '130px' },
    ]
  }

  return base
})

const currentApi = computed(() => apiInstances[activeTab.value])
const rows = computed(() => currentApi.value.dataList.value)
const quickFilters = computed(() => [
  { key: 'operator', label: 'Operatör', options: masterData.operators.map(o => o.name) },
  { key: 'status',   label: 'Durum',    options: ['Aktif', 'Pasif', 'İptal'] }
])

// Modal Logic
const isModalOpen = ref(false)
const selectedItem = ref(null)
const statuses = ['Aktif', 'Pasif', 'İptal']
const form = ref({
  iccid: '', phone_no: '', operator: '', company_id: '',
  department_id: '', package_id: '', personnel_id: '',
  location_id: '', vehicle_id: '', plate_no: '',
  status: 'Aktif', notes: ''
})

// History Modal
const isHistoryModalOpen = ref(false)
const historyResourceId = ref(null)

const openHistory = (row) => {
  historyResourceId.value = row.id
  isHistoryModalOpen.value = true
}

const openAddModal = () => {
  selectedItem.value = null
  form.value = { 
    iccid: '', phone_no: '', operator: '', company_id: '', 
    department_id: '', package_id: '', personnel_id: '', 
    location_id: '', vehicle_id: '', plate_no: '',
    status: 'Aktif', notes: '' 
  }
  isModalOpen.value = true
}

const openEditModal = (item) => {
  selectedItem.value = item
  form.value = { ...item }
  isModalOpen.value = true
}

const saveItem = async () => {
  try {
    if (selectedItem.value) {
      await currentApi.value.updateItem(selectedItem.value.id, form.value)
      showToast('Kayıt başarıyla güncellendi', 'success')
    } else {
      await currentApi.value.createItem(form.value)
      showToast('Yeni kayıt başarıyla eklendi', 'success')
    }
    isModalOpen.value = false
    fetchData()
  } catch (err) { 
    showToast('Hata: ' + err.message, 'error') 
  }
}

const handleDelete = async (row) => {
  const confirmed = await ask({
    title: 'Kaydı Sil',
    message: `"${row.phone_no || row.iccid}" numaralı SIM kartı silmek istediğinize emin misiniz?`,
    confirmLabel: 'Evet, Sil'
  })
  if (confirmed) {
    try {
      startLoading()
      await currentApi.value.deleteItem(row.id)
      showToast('Kayıt başarıyla silindi', 'success')
    } catch (e) {
      showToast('Hata: ' + e.message, 'error')
    } finally {
      stopLoading()
    }
  }
}

const exportToExcel = () => {
  const data = rows.value.map(r => ({
    'Telefon No': r.phone_no,
    'ICCID': r.iccid,
    'Operatör': r.operator,
    'Durum': r.status,
    'Eklenme Tarihi': new Date(r.created_at).toLocaleDateString('tr-TR')
  }))
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, activeTab.value.toUpperCase())
  XLSX.writeFile(wb, `SIM_Kartlar_${activeTab.value}.xlsx`)
}

const downloadTemplate = () => {
  let headers = [['Telefon No', 'ICCID', 'Operatör', 'Şirket Adı', 'Departman Adı', 'Durum', 'Notlar']]
  let example = [['0532XXXXXXX', '8990XXXXXXXXXXXXXXX', 'Turkcell', 'Talay Lojistik', 'BT', 'Aktif', 'Test Notu']]
  
  if (activeTab.value === 'voice') {
    headers[0].push('Personel Adı Soyadı')
    example[0].push('Ahmet Yılmaz')
  } else if (activeTab.value === 'data') {
    headers[0].push('Lokasyon Adı')
    example[0].push('Tuzla Antrepo')
  } else if (activeTab.value === 'm2m') {
    headers[0].push('Plaka')
    example[0].push('34 ABC 123')
  }

  const ws = XLSX.utils.aoa_to_sheet([...headers, ...example])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sablon')
  XLSX.writeFile(wb, `SIM_Yukleme_Sablonu_${activeTab.value}.xlsx`)
}

const handleExcelImport = (e) => {
  const file = e.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = async (evt) => {
    try {
      loading.value = true
      const bstr = evt.target.result
      const wb = XLSX.read(bstr, { type: 'binary' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const jsonRows = XLSX.utils.sheet_to_json(ws)
      
      let successCount = 0
      let errorCount = 0

      for (const row of jsonRows) {
        try {
          const payload = {
            phone_no: String(row['Telefon No'] || ''),
            iccid: String(row['ICCID'] || ''),
            operator: row['Operatör'] || '',
            status: row['Durum'] || 'Aktif',
            notes: row['Notlar'] || ''
          }

          // Map Company
          if (row['Şirket Adı']) {
            const comp = masterData.companies.find(c => c.name.toLowerCase().includes(row['Şirket Adı'].toLowerCase()))
            if (comp) payload.company_id = comp.id
          }

          // Map Department
          if (row['Departman Adı']) {
            const dept = masterData.departments.find(d => d.name.toLowerCase().includes(row['Departman Adı'].toLowerCase()))
            if (dept) payload.department_id = dept.id
          }

          // Category Specific Mapping
          if (activeTab.value === 'voice' && row['Personel Adı Soyadı']) {
            const pers = masterData.personnel.find(p => `${p.first_name} ${p.last_name}`.toLowerCase().includes(row['Personel Adı Soyadı'].toLowerCase()))
            if (pers) payload.personnel_id = pers.id
          } else if (activeTab.value === 'data' && row['Lokasyon Adı']) {
            const loc = masterData.locations.find(l => l.name.toLowerCase().includes(row['Lokasyon Adı'].toLowerCase()))
            if (loc) payload.location_id = loc.id
          } else if (activeTab.value === 'm2m' && row['Plaka']) {
            const veh = masterData.vehicles.find(v => v.plate_no.toLowerCase().replace(/ /g, '') === row['Plaka'].toLowerCase().replace(/ /g, ''))
            if (veh) payload.vehicle_id = veh.id
          }

          await currentApi.value.createItem(payload)
          successCount++
        } catch (err) {
          errorCount++
        }
      }
      if (errorCount > 0) {
        showToast(`${successCount} kayıt eklendi, ${errorCount} hata oluştu. Lütfen Excel başlıklarını ve zorunlu alanları kontrol edin.`, 'warning')
      } else {
        showToast(`${successCount} kayıt başarıyla eklendi.`, 'success')
      }
      fetchData()
    } catch (err) {
      showToast('Excel işlenirken hata oluştu', 'error')
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
  <div class="h-full flex flex-col p-6 overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6 shrink-0">
      <div>
        <h1 class="text-[20px] font-bold text-gray-900 tracking-tight">SIM Kart Havuzu</h1>
        <p class="text-[13px] text-gray-400 mt-1">Tüm SIM kartları ve hatları merkezi olarak yönetin</p>
      </div>
      <div class="flex items-center gap-2">
        <button @click="downloadTemplate" class="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl text-[12px] font-bold text-gray-500 hover:bg-gray-50 transition-all">
          <i class="fas fa-download text-gray-400"></i> Şablon
        </button>
        <label class="cursor-pointer flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl text-[12px] font-bold hover:bg-emerald-100 transition-all">
          <i class="fas fa-file-excel"></i> Excel Yükle
          <input type="file" @change="handleExcelImport" class="hidden" accept=".xlsx,.xls">
        </label>
        <button @click="exportToExcel" class="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl text-[12px] font-bold text-gray-500 hover:bg-gray-50 transition-all">
          <i class="fas fa-file-export text-gray-400"></i> Dışa Aktar
        </button>
        <button @click="openAddModal" class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-[12px] font-bold hover:bg-blue-700 shadow-sm transition-all ml-1">
          <i class="fas fa-plus"></i> Yeni SIM Ekle
        </button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1.5 p-1.5 bg-gray-100 rounded-2xl w-fit mb-6 border border-gray-200/50 shrink-0">
      <button
        v-for="tab in [
          { key: 'voice', label: 'Ses Hattı', icon: 'fa-phone' },
          { key: 'data',  label: 'Data Hattı', icon: 'fa-wifi'  },
          { key: 'm2m',   label: 'M2M / Araç', icon: 'fa-car'   },
        ]"
        :key="tab.key"
        @click="activeTab = tab.key"
        class="flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-[13px] font-bold transition-all duration-200"
        :class="activeTab === tab.key 
          ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/[0.05]' 
          : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200/50'"
      >
        <i :class="['fas', tab.icon, 'text-[12px]', activeTab === tab.key ? 'text-blue-500' : 'text-gray-400']"></i>
        {{ tab.label }}
      </button>
    </div>

    <!-- Table Section -->
    <div class="flex-1 min-h-0 bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
      <AppTable
        :key="activeTab"
        :columns="columns"
        :rows="rows"
        :loading="loading"
        :quick-filters="quickFilters"
        empty-text="Bu kategoride henüz SIM kart kaydı bulunmuyor."
        @row-edit="openEditModal"
        @row-delete="handleDelete"
        @row-history="openHistory"
      >
        <!-- Cell Templates -->
        <template #cell-phone_no="{ value }">
          <span class="font-bold text-gray-900">{{ value || '—' }}</span>
        </template>
        
        <template #cell-iccid="{ value }">
          <span class="font-mono text-[12px] text-gray-500">{{ value || '—' }}</span>
        </template>

        <template #cell-operator="{ value }">
          <span class="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-gray-50 text-gray-500 border border-gray-100 uppercase tracking-tight">
            {{ value || '—' }}
          </span>
        </template>

        <template #cell-status="{ value }">
          <div class="flex items-center gap-2">
            <span v-if="value === 'Aktif' || value === 'active'" class="flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              AKTİF
            </span>
            <span v-else class="flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-gray-50 text-gray-400 border border-gray-100">
              <span class="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
              {{ value?.toUpperCase() || '—' }}
            </span>
          </div>
        </template>
      </AppTable>
    </div>

    <!-- Modal -->
    <Teleport to="body">
      <div v-if="isModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" @click.self="isModalOpen = false">
        <div class="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden">
          <div class="px-7 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <div>
              <h2 class="text-[16px] font-bold text-gray-900">
                {{ selectedItem ? 'SIM Kartı Düzenle' : 'Yeni SIM Kart Ekle' }}
              </h2>
              <p class="text-[11px] text-gray-400 mt-0.5">Kategori: {{ activeTab.toUpperCase() }}</p>
            </div>
            <button type="button" @click="isModalOpen = false" class="text-gray-400 hover:text-gray-700 w-8 h-8 rounded-lg hover:bg-gray-100 inline-flex items-center justify-center">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <form @submit.prevent="saveItem">
            <div class="p-7 grid grid-cols-2 gap-5">
              <div class="space-y-1.5">
                <label class="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Telefon No</label>
                <input v-model="form.phone_no" type="text" required placeholder="5XX XXX XX XX"
                  class="w-full h-11 px-4 text-[13px] border border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all font-bold">
              </div>
              <div class="space-y-1.5">
                <label class="text-[11px] font-bold text-gray-400 uppercase tracking-widest">ICCID</label>
                <input v-model="form.iccid" type="text" placeholder="8990..."
                  class="w-full h-11 px-4 text-[13px] border border-gray-200 rounded-xl outline-none focus:border-blue-500 font-mono">
              </div>

              <div class="space-y-1.5">
                <label class="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Operatör</label>
                <select v-model="form.operator" required
                  class="w-full h-11 px-4 text-[13px] border border-gray-200 rounded-xl outline-none focus:border-blue-500 bg-white">
                  <option value="">Seçiniz</option>
                  <option v-for="op in masterData.operators" :key="op.id" :value="op.name">{{ op.name }}</option>
                </select>
              </div>

              <div class="space-y-1.5">
                <label class="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Paket</label>
                <select v-model="form.package_id"
                  class="w-full h-11 px-4 text-[13px] border border-gray-200 rounded-xl outline-none focus:border-blue-500 bg-white">
                  <option :value="null">Seçiniz</option>
                  <option v-for="p in masterData.packages" :key="p.id" :value="p.id">{{ p.name }}</option>
                </select>
              </div>

              <!-- Conditional Fields -->
              <div v-if="activeTab === 'voice'" class="space-y-1.5">
                <label class="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Atanan Personel</label>
                <select v-model="form.personnel_id"
                  class="w-full h-11 px-4 text-[13px] border border-gray-200 rounded-xl outline-none focus:border-blue-500 bg-white">
                  <option :value="null">Seçiniz</option>
                  <option v-for="p in masterData.personnel" :key="p.id" :value="p.id">{{ p.first_name }} {{ p.last_name }}</option>
                </select>
              </div>

              <div v-if="activeTab === 'data'" class="space-y-1.5">
                <label class="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Lokasyon</label>
                <select v-model="form.location_id"
                  class="w-full h-11 px-4 text-[13px] border border-gray-200 rounded-xl outline-none focus:border-blue-500 bg-white">
                  <option :value="null">Seçiniz</option>
                  <option v-for="l in masterData.locations" :key="l.id" :value="l.id">{{ l.name }}</option>
                </select>
              </div>

              <div v-if="activeTab === 'm2m'" class="space-y-1.5">
                <label class="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Araç / Plaka</label>
                <select v-model="form.vehicle_id"
                  class="w-full h-11 px-4 text-[13px] border border-gray-200 rounded-xl outline-none focus:border-blue-500 bg-white">
                  <option :value="null">Seçiniz</option>
                  <option v-for="v in masterData.vehicles" :key="v.id" :value="v.id">{{ v.plate_no }}</option>
                </select>
              </div>

              <div class="space-y-1.5">
                <label class="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Durum</label>
                <select v-model="form.status" required
                  class="w-full h-11 px-4 text-[13px] border border-gray-200 rounded-xl outline-none focus:border-blue-500 bg-white">
                  <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
                </select>
              </div>

              <div class="space-y-1.5">
                <label class="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Şirket</label>
                <select v-model="form.company_id"
                  class="w-full h-11 px-4 text-[13px] border border-gray-200 rounded-xl outline-none focus:border-blue-500 bg-white">
                  <option :value="null">Seçiniz</option>
                  <option v-for="c in masterData.companies" :key="c.id" :value="c.id">{{ c.name }}</option>
                </select>
              </div>

              <div class="space-y-1.5">
                <label class="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Departman</label>
                <select v-model="form.department_id"
                  class="w-full h-11 px-4 text-[13px] border border-gray-200 rounded-xl outline-none focus:border-blue-500 bg-white">
                  <option :value="null">Seçiniz</option>
                  <option v-for="d in masterData.departments" :key="d.id" :value="d.id">{{ d.name }}</option>
                </select>
              </div>

              <div class="col-span-2 space-y-1.5">
                <label class="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Notlar</label>
                <textarea v-model="form.notes" rows="2"
                  class="w-full p-4 text-[13px] border border-gray-200 rounded-xl outline-none focus:border-blue-500 resize-none"></textarea>
              </div>
            </div>

            <div class="px-7 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
              <button type="button" @click="isModalOpen = false" class="px-4 py-2 text-[13px] font-bold text-gray-500 hover:text-gray-700">İptal</button>
              <button type="submit" class="px-8 py-2 bg-blue-600 text-white text-[13px] font-bold rounded-xl hover:bg-blue-700 shadow-sm transition-all">
                {{ selectedItem ? 'Güncelle' : 'Oluştur' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- History Modal -->
    <HistoryModal
      v-if="isHistoryModalOpen"
      :module="'SIM_' + activeTab.toUpperCase()"
      :resource-id="historyResourceId"
      :title="activeTab.toUpperCase() + ' Hattı Düzenleme Geçmişi'"
      @close="isHistoryModalOpen = false"
    />
  </div>
</template>

<style scoped>
.min-h-0 { min-height: 0; }
</style>
