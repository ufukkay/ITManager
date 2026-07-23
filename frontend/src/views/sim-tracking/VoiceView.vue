<script setup>
import { ref, onMounted, computed } from 'vue'
import { useSimApi } from '../../composables/useSimApi'
import { useMasterDataStore } from '../../stores/masterData'
import { useToast } from '../../composables/useToast'
import { useConfirm } from '../../composables/useConfirm'
import AppTable from '../../components/AppTable.vue'
import HistoryModal from '../../components/HistoryModal.vue'
import * as XLSX from 'xlsx'

const { dataList, loading, fetchList, updateItem, deleteItem, createItem } = useSimApi('voice')
const masterData = useMasterDataStore()
const { showToast } = useToast()
const { ask, startLoading, stopLoading } = useConfirm()

const columns = [
  { key: 'phone_no',       label: 'Telefon No', sortable: true, width: '160px' },
  { key: 'iccid',          label: 'ICCID',      sortable: true, width: '220px' },
  { key: 'operator',       label: 'Operatör',   sortable: true, width: '140px' },
  { key: 'personnel_name', label: 'Personel',   sortable: true, width: '160px' },
  { key: 'status',         label: 'Durum',      sortable: true, width: '130px' },
]

const quickFilters = computed(() => [
  { key: 'operator',       label: 'Operatör',   options: masterData.operators.map(o => o.name) },
  { key: 'personnel_name', label: 'Personel',   options: masterData.personnel.map(p => p.first_name + ' ' + p.last_name) },
  { key: 'status',         label: 'Durum', options: ['Aktif', 'Pasif', 'İptal'] },
])

const selectedIds       = ref([])
const onSelectionChange = (rows) => { selectedIds.value = rows.map(r => r.id) }

const excelInput = ref(null)

const exportExcel = (customRows = null) => {
  const list = customRows || dataList.value
  const rows = list.map(r => ({
    'Telefon No': r.phone_no, 
    'ICCID': r.iccid, 
    'Operatör': r.operator,
    'Personel': r.personnel_name || '', 
    'Şirket': r.company_name || '', 
    'Departman': r.department_name || '', 
    'Durum': r.status,
    'Notlar': r.notes || ''
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Voice')
  XLSX.writeFile(wb, customRows ? 'ses-secili-kayitlar.xlsx' : 'ses-listesi.xlsx')
}

const exportSelected = () => {
  const selected = dataList.value.filter(r => selectedIds.value.includes(r.id))
  exportExcel(selected)
}

const downloadTemplate = () => {
  const ws = XLSX.utils.json_to_sheet([
    {
      'Telefon No': '5321234567',
      'ICCID': '8990123456789012345',
      'Operatör': 'Turkcell',
      'Paket': 'Ses Paketi 1000DK',
      'Personel': 'Ahmet Yılmaz',
      'Şirket': 'Talay Logistics',
      'Departman': 'Operasyon',
      'Durum': 'Aktif',
      'Notlar': 'Şirket hattı.'
    }
  ])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sablon')
  XLSX.writeFile(wb, 'Voice_Yukleme_Sablonu.xlsx')
}

const handleExcelImport = async (e) => {
  const file = e.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = async (evt) => {
    try {
      startLoading()
      const data = new Uint8Array(evt.target.result)
      const workbook = XLSX.read(data, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const sheet = workbook.Sheets[sheetName]
      const rows = XLSX.utils.sheet_to_json(sheet)

      if (rows.length === 0) {
        showToast('Excel dosyasında veri bulunamadı.', 'warning')
        return
      }

      let successCount = 0
      let errorCount = 0
      let lastErrorMessage = ''

      const getVal = (row, ...keys) => {
        for (const k of keys) {
          const foundKey = Object.keys(row).find(rk => rk.trim().toLowerCase() === k.toLowerCase())
          if (foundKey) return row[foundKey]
        }
        return null
      }

      for (const row of rows) {
        try {
          const phoneNo = String(getVal(row, 'Telefon No', 'Telefon', 'Phone', 'PhoneNo') || '').trim()
          const iccid = String(getVal(row, 'ICCID', 'iccid') || '').trim()
          
          if (!phoneNo && !iccid) {
            console.warn('Telefon veya ICCID bulunmayan satır atlandı:', row)
            continue
          }

          // 1. Operator
          const opName = String(getVal(row, 'Operatör', 'Operator') || '').trim()
          let operatorVal = ''
          if (opName) {
            const foundOp = masterData.operators.find(o => o.name.toLowerCase() === opName.toLowerCase())
            if (foundOp) {
              operatorVal = foundOp.name
            } else {
              const newOp = await masterData.createItem('operators', { name: opName })
              await masterData.fetchOperators()
              operatorVal = opName
            }
          }

          // 2. Company
          const companyName = String(getVal(row, 'Şirket', 'Company') || '').trim()
          let companyId = null
          if (companyName) {
            let comp = masterData.companies.find(c => c.name.toLowerCase() === companyName.toLowerCase())
            if (!comp) {
              const newComp = await masterData.createItem('companies', { name: companyName })
              companyId = newComp.id
              await masterData.fetchCompanies()
            } else {
              companyId = comp.id
            }
          }

          // 3. Department
          const deptName = String(getVal(row, 'Departman', 'Department', 'Bölüm') || '').trim()
          let departmentId = null
          if (deptName) {
            let dept = masterData.departments.find(d => d.name.toLowerCase() === deptName.toLowerCase())
            if (!dept) {
              const newDept = await masterData.createItem('departments', { name: deptName })
              departmentId = newDept.id
              await masterData.fetchDepartments()
            } else {
              departmentId = dept.id
            }
          }

          // 4. Package
          const packageName = String(getVal(row, 'Paket', 'Package') || '').trim()
          let packageId = null
          if (packageName) {
            let pkg = masterData.packages.find(p => p.name.toLowerCase() === packageName.toLowerCase())
            if (pkg) {
              packageId = pkg.id
            }
          }

          // 5. Personnel
          const persName = String(getVal(row, 'Personel', 'Ad Soyad', 'Name', 'Employee') || '').trim()
          let personnelId = null
          if (persName) {
            const lowerPers = persName.toLowerCase()
            let pers = masterData.personnel.find(p => (p.first_name + ' ' + p.last_name).toLowerCase() === lowerPers)
            if (pers) {
              personnelId = pers.id
            }
          }

          const statusVal = getVal(row, 'Durum', 'Status') || 'Aktif'
          const notesVal = getVal(row, 'Notlar', 'Not', 'Açıklama', 'Notes') || ''

          const payload = {
            phone_no: phoneNo,
            iccid: iccid,
            operator: operatorVal,
            company_id: companyId,
            department_id: departmentId,
            package_id: packageId,
            personnel_id: personnelId,
            status: statusVal,
            notes: notesVal
          }

          await createItem(payload)
          successCount++
        } catch (err) {
          console.error(err)
          errorCount++
          lastErrorMessage = err.message || 'Satır ekleme hatası'
        }
      }

      if (successCount > 0) {
        showToast(`${successCount} ses hattı başarıyla aktarıldı.`, 'success')
      }
      if (errorCount > 0) {
        showToast(`${errorCount} kayıt hata nedeniyle atlandı. Son Hata: ${lastErrorMessage}`, 'error', 5000)
      }
      
      fetchList()
    } catch (excelErr) {
      console.error(excelErr)
      showToast('Excel dosyası okunurken hata oluştu.', 'error')
    } finally {
      stopLoading()
      e.target.value = ''
    }
  }
  reader.readAsArrayBuffer(file)
}

const openAddModal = () => {
  selectedItem.value = null
  form.value = {
    iccid: '', phone_no: '', operator: '', company_id: null,
    department_id: null, package_id: null, personnel_id: null,
    status: 'Aktif', notes: ''
  }
  isModalOpen.value = true
}

// Modal Logic
const isModalOpen = ref(false)
const selectedItem = ref(null)
const statuses = ['Aktif', 'Pasif', 'İptal']
const form = ref({
  iccid: '', phone_no: '', operator: '', company_id: '',
  department_id: '', package_id: '', personnel_id: '',
  status: 'Aktif', notes: ''
})

// History Modal
const isHistoryModalOpen = ref(false)
const historyResourceId = ref(null)

const openHistory = (row) => {
  historyResourceId.value = row.id
  isHistoryModalOpen.value = true
}

const openEditModal = (item) => {
  selectedItem.value = item
  form.value = { ...item }
  isModalOpen.value = true
}

const saveItem = async () => {
  try {
    if (selectedItem.value) {
      await updateItem(selectedItem.value.id, form.value)
      showToast('Kayıt başarıyla güncellendi', 'success')
    } else {
      await createItem(form.value)
      showToast('Yeni kayıt başarıyla eklendi', 'success')
    }
    isModalOpen.value = false
    fetchList()
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
      await deleteItem(row.id)
      showToast('Kayıt başarıyla silindi', 'success')
    } catch (e) {
      showToast('Hata: ' + e.message, 'error')
    } finally {
      stopLoading()
    }
  }
}

onMounted(() => {
  fetchList()
  masterData.fetchOperators()
  masterData.fetchPersonnel()
  masterData.fetchCompanies()
  masterData.fetchDepartments()
  masterData.fetchPackages('voice')
})
</script>

<template>
  <div class="h-full flex flex-col gap-4">
    <AppTable
      :columns="columns"
      :rows="dataList"
      :loading="loading"
      :quick-filters="quickFilters"
      :selectable="true"
      empty-text="Kayıtlı ses hattı bulunamadı"
      @selection-change="onSelectionChange"
      @row-edit="openEditModal"
      @row-history="openHistory"
      @row-delete="handleDelete"
    >
      <template #toolbar>
        <template v-if="selectedIds.length > 0">
          <span class="text-[13px] font-bold text-[#1a73e8]">{{ selectedIds.length }} Seçili</span>
          <button type="button" class="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg text-[12px] font-bold hover:bg-emerald-100"
            @click="exportSelected">
            <i class="fas fa-file-excel"></i> Seçilenleri İndir
          </button>
        </template>
        <div class="ml-auto flex items-center gap-2">
          <input 
            type="file" 
            ref="excelInput" 
            class="hidden" 
            accept=".xlsx, .xls" 
            @change="handleExcelImport" 
          />
          <button type="button" @click="downloadTemplate"
            class="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-lg text-[12px] font-semibold hover:bg-gray-50">
            <i class="fas fa-file-download text-blue-500"></i> Şablon
          </button>
          <button type="button" @click="$refs.excelInput.click()"
            class="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-lg text-[12px] font-semibold hover:bg-gray-50">
            <i class="fas fa-file-import text-blue-500"></i> Excel Yükle
          </button>
          <button type="button" @click="exportExcel()"
            class="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-lg text-[12px] font-semibold hover:bg-gray-50">
            <i class="fas fa-file-excel text-emerald-500"></i> Excel Dışa Aktar
          </button>
          <button type="button" @click="openAddModal"
            class="flex items-center gap-1.5 px-4 py-1.5 bg-[#1a73e8] text-white rounded-lg text-[12px] font-bold hover:bg-blue-700 shadow-sm">
            <i class="fas fa-plus text-[11px]"></i> Yeni Ses Ekle
          </button>
        </div>
      </template>

      <!-- Telefon -->
      <template #cell-phone_no="{ value }">
        <span class="font-medium text-gray-800 whitespace-nowrap">{{ value || '—' }}</span>
      </template>

      <!-- ICCID font-mono -->
      <template #cell-iccid="{ value }">
        <span class="font-mono text-[12px] text-gray-500">{{ value || '—' }}</span>
      </template>

      <!-- Operatör badge -->
      <template #cell-operator="{ value }">
        <span v-if="value === 'Turkcell'" class="px-2 py-0.5 rounded text-[12px] font-bold bg-[#e0f2fe] text-[#0284c7]">Turkcell</span>
        <span v-else-if="value === 'Vodafone'" class="px-2 py-0.5 rounded text-[12px] font-bold bg-[#fee2e2] text-[#e11d48]">Vodafone</span>
        <span v-else class="px-2 py-0.5 rounded text-[12px] font-bold bg-gray-100 text-gray-600">{{ value || '—' }}</span>
      </template>

      <!-- Durum badge -->
      <template #cell-status="{ value }">
        <span v-if="value === 'Aktif'" class="px-2 py-0.5 rounded text-[12px] font-bold uppercase bg-[#e6f4ea] text-[#1e8e3e]">Aktif</span>
        <span v-else-if="value === 'İptal'" class="px-2 py-0.5 rounded text-[12px] font-bold uppercase bg-[#feebe9] text-[#d93025]">İptal</span>
        <span v-else class="px-2 py-0.5 rounded text-[12px] font-bold uppercase bg-gray-100 text-gray-600">{{ value || '—' }}</span>
      </template>
    </AppTable>

    <!-- Edit Modal -->
    <Teleport to="body">
      <div v-if="isModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" @click.self="isModalOpen = false">
        <div class="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden">
          <div class="px-7 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <div>
              <h2 class="text-[16px] font-bold text-gray-900">
                {{ selectedItem ? 'Ses Hattını Düzenle' : 'Yeni Ses Hattı Ekle' }}
              </h2>
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
                  class="w-full h-11 px-4 text-[13px] border border-gray-200 rounded-xl outline-none focus:border-blue-500 font-bold">
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

              <div class="space-y-1.5">
                <label class="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Atanan Personel</label>
                <select v-model="form.personnel_id"
                  class="w-full h-11 px-4 text-[13px] border border-gray-200 rounded-xl outline-none focus:border-blue-500 bg-white">
                  <option :value="null">Seçiniz</option>
                  <option v-for="p in masterData.personnel" :key="p.id" :value="p.id">{{ p.first_name }} {{ p.last_name }}</option>
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
      module="SIM_VOICE"
      :resource-id="historyResourceId"
      title="Ses Hattı Düzenleme Geçmişi"
      @close="isHistoryModalOpen = false"
    />
  </div>
</template>

<style scoped>
/* No specific styles needed */
</style>
