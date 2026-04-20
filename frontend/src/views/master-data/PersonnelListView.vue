<script setup>
import { ref, onMounted, computed } from 'vue'
import { useMasterDataStore } from '../../stores/masterData'
import { useRoute } from 'vue-router'
import { useToast } from '../../composables/useToast'
import { useConfirm } from '../../composables/useConfirm'
import AppTable from '../../components/AppTable.vue'
import AppFinancialHistory from '../../components/AppFinancialHistory.vue'
import * as XLSX from 'xlsx'

const masterData = useMasterDataStore()
const route = useRoute()
const loading = ref(false)
const showModal = ref(false)
const editingPersonnel = ref(null)
const saving = ref(false)
const { showToast } = useToast()
const { ask, startLoading, stopLoading } = useConfirm()

const initialFilters = computed(() => ({
  search: route.query.search || '',
  quick: {
    company_name: route.query.company || '',
    department_name: route.query.department || '',
    cost_center_name: route.query.costCenter || '',
    status: route.query.status || ''
  }
}))

const fetchData = async () => {
  loading.value = true
  try {
    await Promise.all([
      masterData.fetchPersonnel(),
      masterData.fetchCompanies(),
      masterData.fetchDepartments(),
      masterData.fetchCostCenters()
    ])
  } finally {
    loading.value = false
  }
}

const columns = [
  { key: 'employee_id',      label: 'Sicil No',    sortable: true, width: '100px' },
  { key: 'full_name',        label: 'Ad Soyad',    sortable: true },
  { key: 'title',            label: 'Unvan',       sortable: true, width: '180px' },
  { key: 'company_name',     label: 'Şirket',      sortable: true, width: '160px' },
  { key: 'department_name',  label: 'Departman',   sortable: true, width: '160px' },
  { key: 'cost_center_name', label: 'Masraf Yeri', sortable: true, width: '140px' },
  { key: 'hire_date',        label: 'Giriş Tarihi',sortable: true, width: '120px' },
  { key: 'status',           label: 'Durum',       sortable: true, width: '100px' },
]

const quickFilters = computed(() => [
  { key: 'company_name',     label: 'Şirket',      options: masterData.companies.map(c => c.name) },
  { key: 'department_name',  label: 'Departman',   options: masterData.departments.map(d => d.name) },
  { key: 'cost_center_name', label: 'Masraf Yeri', options: masterData.costCenters.map(c => c.name) },
  { key: 'status', label: 'Durum', options: [ { value: 'active', label: 'Aktif' }, { value: 'passive', label: 'Pasif' } ] },
])

const personnelRows = computed(() =>
  masterData.personnel.map(p => ({
    ...p,
    full_name: `${p.first_name} ${p.last_name}`,
  }))
)

// Selection
const selectedIds = ref([])
const onSelectionChange = (rows) => { selectedIds.value = rows.map(r => r.id) }

const openEditModal = (p = null) => {
  if (p && p.id) {
    editingPersonnel.value = { ...p }
  } else {
    editingPersonnel.value = {
      employee_id: null,
      first_name: '',
      last_name: '',
      title: '',
      email: '',
      phone: '',
      company_id: null,
      department_id: null,
      cost_center_id: null,
      hire_date: new Date().toISOString().split('T')[0],
      status: 'active',
      notes: ''
    }
  }
  showModal.value = true
}

const savePersonnel = async () => {
  if (saving.value) return
  saving.value = true
  try {
    if (editingPersonnel.value.id)
      await masterData.updatePersonnel(editingPersonnel.value.id, editingPersonnel.value)
    else
      await masterData.createPersonnel(editingPersonnel.value)
    showModal.value = false
    showToast('Kaydedildi', 'success')
  } catch (e) {
    showToast('Hata: ' + (e.response?.data?.error || e.message), 'error')
  } finally {
    saving.value = false
  }
}

const handleDelete = async (row) => {
  const impact = await masterData.getDeleteImpact('personnel', row.id)
  const confirmed = await ask({
    title: 'Personel Sil',
    message: `${row.full_name} isimli personeli silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`,
    confirmLabel: 'Evet, Personeli Sil',
    impact: impact
  })

  if (confirmed) {
    try {
      startLoading()
      await masterData.deletePersonnel(row.id)
      selectedIds.value = selectedIds.value.filter(id => id !== row.id)
      showToast('Personel başarıyla silindi', 'success')
    } catch (e) {
      showToast('Hata: ' + (e.response?.data?.error || e.message), 'error')
    } finally {
      stopLoading()
    }
  }
}

const handleBulkDelete = async () => {
  const ids = Array.from(selectedIds.value)
  if (ids.length === 0) return
  
  const confirmed = await ask({
    title: 'Toplu Silme',
    message: `Seçilen ${ids.length} personeli silmek istediğinize emin misiniz? Tüm kayıtlar kalıcı olarak silinecektir.`,
    confirmLabel: `Evet, ${ids.length} Personeli Sil`
  })

  if (confirmed) {
    try {
      startLoading()
      await masterData.bulkDeletePersonnel(ids)
      selectedIds.value = []
      showToast(`${ids.length} personel başarıyla silindi`, 'success')
    } catch (e) { 
      showToast('Hata: ' + (e.response?.data?.error || e.message), 'error') 
    } finally {
      stopLoading()
    }
  }
}

const downloadTemplate = () => {
  const ws = XLSX.utils.json_to_sheet([
    { 
      'Ad': 'Ahmet', 
      'Soyad': 'Yılmaz', 
      'Unvan': 'Bilgi Teknolojileri Uzmanı',
      'E-posta': 'ahmet@example.com', 
      'Telefon': '05551234567',
      'Şirket': 'Örnek A.Ş.', 
      'Departman': 'IT', 
      'Masraf Yeri': 'IT-001',
      'İşe Giriş (YYYY-AA-GG)': '2024-01-01',
      'Durum (active/passive)': 'active'
    }
  ])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Personel_Sablon')
  XLSX.writeFile(wb, 'Personel_Iceri_Aktarma_Sablonu.xlsx')
}

const handleExcelImport = (e) => {
  const file = e.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = async (evt) => {
    try {
      loading.value = true
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

      // Header normalization helper
      const getVal = (row, ...keys) => {
        for (const k of keys) {
          // Check exact match, lowercase match, and trimmed match
          const foundKey = Object.keys(row).find(rk => 
            rk.trim().toLowerCase() === k.toLowerCase()
          )
          if (foundKey) return row[foundKey]
        }
        return null
      }

      for (const row of rows) {
        try {
          // --- 1. Autoproviding Company ---
          let company_id = null
          const companyName = String(getVal(row, 'Şirket', 'Company') || '').trim()
          if (companyName) {
            let comp = masterData.companies.find(c => c.name.toLowerCase() === companyName.toLowerCase())
            if (!comp) {
              const res = await masterData.createItem('companies', { name: companyName })
              company_id = res.id
            } else {
              company_id = comp.id
            }
          }

          // --- 2. Autoproviding Department ---
          let department_id = null
          const deptName = String(getVal(row, 'Departman', 'Department', 'Bölüm') || '').trim()
          if (deptName) {
            let det = masterData.departments.find(d => d.name.toLowerCase() === deptName.toLowerCase())
            if (!det) {
              const res = await masterData.createItem('departments', { name: deptName })
              department_id = res.id
            } else {
              department_id = det.id
            }
          }

          // --- 3. Autoproviding Cost Center ---
          let cost_center_id = null
          const ccName = String(getVal(row, 'Masraf Yeri', 'Cost Center', 'Masraf Merkezi') || '').trim()
          if (ccName) {
            let cc = masterData.costCenters.find(c => 
              (c.name || '').toLowerCase() === ccName.toLowerCase() || 
              (c.code || '').toLowerCase() === ccName.toLowerCase()
            )
            if (!cc) {
              const cleanName = ccName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
              const generatedCode = (cleanName.slice(0, 3) || 'CC') + '-' + Math.floor(Math.random() * 900 + 100)
              const res = await masterData.createItem('cost-centers', { name: ccName, code: generatedCode })
              cost_center_id = res.id
            } else {
              cost_center_id = cc.id
            }
          }

          const payload = {
            first_name: String(getVal(row, 'Ad', 'FirstName', 'First Name', 'Isim') || '').trim(),
            last_name: String(getVal(row, 'Soyad', 'LastName', 'Last Name') || '').trim(),
            title: String(getVal(row, 'Unvan', 'Title', 'Pozisyon') || '').trim(),
            email: String(getVal(row, 'E-posta', 'Email', 'Mail') || '').trim(),
            phone: String(getVal(row, 'Telefon', 'Phone', 'GSM') || '').trim(),
            company_id,
            department_id,
            cost_center_id,
            hire_date: getVal(row, 'İşe Giriş (YYYY-AA-GG)', 'Hire Date', 'Giriş Tarihi') || null,
            status: getVal(row, 'Durum (active/passive)', 'Status', 'Durum') || 'active'
          }

          if (payload.first_name && payload.last_name) {
            await masterData.createPersonnel(payload)
            successCount++
          } else {
            console.warn('Eksik isim/soyad satırı atlandı:', row)
          }
        } catch (err) { 
          console.error('Satır işlenirken hata:', err)
          errorCount++
          lastErrorMessage = err.response?.data?.error || err.message
        }
      }

      if (successCount > 0) {
        showToast(`${successCount} personel başarıyla aktarıldı.`, 'success')
      }
      if (errorCount > 0) {
        showToast(`${errorCount} kayıt hata nedeniyle atlandı. Son Hata: ${lastErrorMessage}`, 'error', 5000)
      }
      
      await fetchData()
    } catch (err) {
      console.error('Excel parse hatası:', err)
      showToast('Excel dosyası okunamadı veya formatı hatalı.', 'error')
    } finally {
      loading.value = false
      e.target.value = ''
    }
  }
  reader.readAsArrayBuffer(file)
}

onMounted(fetchData)
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- AppTable -->
    <AppTable
      :columns="columns"
      :rows="personnelRows"
      :loading="loading"
      :quick-filters="quickFilters"
      :selectable="true"
      :initial-filters="initialFilters"
      empty-text="Personel kaydı bulunamadı"
      @row-edit="openEditModal"
      @row-delete="handleDelete"
      @selection-change="onSelectionChange"
    >
      <template #toolbar>
        <div class="flex items-center gap-2">
          <template v-if="selectedIds.length > 0">
            <span class="text-[13px] font-bold text-[#1a73e8] mr-2">{{ selectedIds.length }} Seçili</span>
            
            <button type="button" @click="handleBulkDelete"
              class="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 border border-red-100 rounded-lg text-[12px] font-bold hover:bg-red-100 transition-all">
              <i class="fas fa-trash"></i> Seçilenleri Sil
            </button>
          </template>

          <button type="button" @click="downloadTemplate" 
            class="px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-[12px] font-semibold hover:bg-gray-50 flex items-center gap-1.5 transition-all">
            <i class="fas fa-download text-gray-400"></i> Şablon
          </button>
          
          <label class="cursor-pointer px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg text-[12px] font-bold hover:bg-emerald-100 flex items-center gap-1.5 transition-colors">
            <i class="fas fa-file-excel"></i> Excel Yükle
            <input type="file" @change="handleExcelImport" class="hidden" accept=".xlsx,.xls">
          </label>

          <button type="button"
            class="flex items-center gap-2 px-4 py-1.5 bg-[#1a73e8] text-white text-[12.5px] font-bold rounded-lg hover:bg-[#174ea6] shadow-sm ml-2"
            @click="openEditModal()">
            <i class="fas fa-plus text-[11px]"></i> Yeni Personel
          </button>
        </div>
      </template>

      <!-- Sicil No -->
      <template #cell-employee_id="{ value }">
        <span class="font-mono font-bold text-blue-600 text-[13px]">{{ value || '—' }}</span>
      </template>

      <!-- Avatar + isim + email -->
      <template #cell-full_name="{ row, value }">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-[11px] shrink-0 border border-blue-100">
            {{ row.first_name?.[0] }}{{ row.last_name?.[0] }}
          </div>
          <div>
            <div class="text-[13px] font-semibold text-gray-900 leading-tight">{{ value }}</div>
            <div class="text-[11px] text-gray-400 mt-0.5">{{ row.email || 'E-posta yok' }}</div>
          </div>
        </div>
      </template>

      <!-- Unvan -->
      <template #cell-title="{ value }">
        <span class="text-[13px] text-gray-600 font-medium truncate block max-w-[170px]" :title="value">{{ value || '—' }}</span>
      </template>

      <!-- Giriş Tarihi -->
      <template #cell-hire_date="{ value }">
        <span class="text-[12px] text-gray-500 tabular-nums">{{ value ? new Date(value).toLocaleDateString('tr-TR') : '—' }}</span>
      </template>

      <!-- Durum badge with dot -->
      <template #cell-status="{ value }">
        <span :class="[
          'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold',
          value === 'active' ? 'bg-[#ecfdf5] text-[#059669]' : 'bg-[#fff1f2] text-[#e11d48]'
        ]">
          <span class="w-1.5 h-1.5 rounded-full" :class="value === 'active' ? 'bg-[#10b981]' : 'bg-[#f43f5e]'"></span>
          {{ value === 'active' ? 'Aktif' : 'Pasif' }}
        </span>
      </template>
    </AppTable>

    <!-- Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" @click.self="showModal = false">
        <div class="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden">
          <div class="px-7 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <div>
              <h2 class="text-[17px] font-bold text-gray-900">{{ editingPersonnel.id ? 'Personel Düzenle' : 'Yeni Personel Kaydı' }}</h2>
              <p class="text-[12px] text-gray-400 mt-0.5">Personel kartı bilgilerini eksiksiz doldurun</p>
            </div>
            <button type="button" @click="showModal = false"
              class="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100">
              <i class="fas fa-times"></i>
            </button>
          </div>
          
          <div class="p-7 space-y-6 max-h-[75vh] overflow-y-auto">
            <!-- Temel Bilgiler -->
            <div class="space-y-4">
              <div class="flex items-center gap-2 text-[11px] font-bold text-blue-600 uppercase tracking-wider">
                <i class="fas fa-user-circle"></i> Temel Bilgiler
              </div>
              <div class="grid grid-cols-3 gap-5">
                <div>
                  <label class="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Sicil No (Otomatik)</label>
                  <input :value="editingPersonnel.employee_id" type="text" placeholder="Otomatik atanır" readonly
                    class="w-full h-10 px-3 text-[13px] border border-gray-200 rounded-lg outline-none bg-gray-100 font-bold text-gray-500 cursor-not-allowed">
                </div>
                <div>
                  <label class="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Ad <span class="text-red-500">*</span></label>
                  <input v-model="editingPersonnel.first_name" type="text"
                    class="w-full h-10 px-3 text-[13px] border border-gray-200 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                </div>
                <div>
                  <label class="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Soyad <span class="text-red-500">*</span></label>
                  <input v-model="editingPersonnel.last_name" type="text"
                    class="w-full h-10 px-3 text-[13px] border border-gray-200 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                </div>
              </div>
            </div>

            <!-- İletişim ve Unvan -->
            <div class="grid grid-cols-2 gap-5">
               <div class="space-y-4">
                  <div class="flex items-center gap-2 text-[11px] font-bold text-blue-600 uppercase tracking-wider">
                    <i class="fas fa-id-badge"></i> Kurumsal Bilgi
                  </div>
                  <div class="space-y-4">
                    <div>
                      <label class="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Unvan</label>
                      <input v-model="editingPersonnel.title" type="text" placeholder="Örn: Kıdemli Yazılım Uzmanı"
                        class="w-full h-10 px-3 text-[13px] border border-gray-200 rounded-lg outline-none focus:border-blue-500">
                    </div>
                    <div>
                      <label class="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">E-posta</label>
                      <input v-model="editingPersonnel.email" type="email" placeholder="isim.soyisim@sirket.com"
                        class="w-full h-10 px-3 text-[13px] border border-gray-200 rounded-lg outline-none focus:border-blue-500">
                    </div>
                  </div>
               </div>
               <div class="space-y-4">
                  <div class="flex items-center gap-2 text-[11px] font-bold text-blue-600 uppercase tracking-wider">
                    <i class="fas fa-calendar-alt"></i> Takvim ve Durum
                  </div>
                  <div class="space-y-4">
                    <div class="grid grid-cols-2 gap-4">
                      <div>
                        <label class="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Giriş Tarihi</label>
                        <input v-model="editingPersonnel.hire_date" type="date"
                          class="w-full h-10 px-3 text-[13px] border border-gray-200 rounded-lg outline-none focus:border-blue-500">
                      </div>
                      <div>
                        <label class="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Çıkış Tarihi</label>
                        <input v-model="editingPersonnel.exit_date" type="date"
                          class="w-full h-10 px-3 text-[13px] border border-gray-200 rounded-lg outline-none focus:border-blue-500">
                      </div>
                    </div>
                    <div>
                      <label class="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Çalışma Durumu</label>
                      <select v-model="editingPersonnel.status"
                        class="w-full h-10 px-3 text-[13px] border border-gray-200 rounded-lg outline-none focus:border-blue-500 bg-white">
                        <option value="active">Aktif</option>
                        <option value="passive">Pasif</option>
                      </select>
                    </div>
                  </div>
               </div>
            </div>

            <!-- Organizasyon -->
            <div class="space-y-4">
              <div class="flex items-center gap-2 text-[11px] font-bold text-blue-600 uppercase tracking-wider">
                <i class="fas fa-sitemap"></i> Organizasyon Yapısı
              </div>
              <div class="grid grid-cols-3 gap-5">
                <div>
                  <label class="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Şirket</label>
                  <select v-model="editingPersonnel.company_id" 
                    class="w-full h-10 px-3 text-[13px] border border-gray-200 rounded-lg outline-none focus:border-blue-500 bg-white">
                    <option :value="null">Seçiniz</option>
                    <option v-for="c in masterData.companies" :key="c.id" :value="c.id">{{ c.name }}</option>
                  </select>
                </div>
                <div>
                  <label class="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Departman</label>
                  <select v-model="editingPersonnel.department_id"
                    class="w-full h-10 px-3 text-[13px] border border-gray-200 rounded-lg outline-none focus:border-blue-500 bg-white">
                    <option :value="null">Seçiniz</option>
                    <option v-for="d in masterData.departments" :key="d.id" :value="d.id">{{ d.name }}</option>
                  </select>
                </div>
                <div>
                  <label class="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Masraf Yeri</label>
                  <select v-model="editingPersonnel.cost_center_id"
                    class="w-full h-10 px-3 text-[13px] border border-gray-200 rounded-lg outline-none focus:border-blue-500 bg-white">
                    <option :value="null">Seçiniz</option>
                    <option v-for="cc in masterData.costCenters" :key="cc.id" :value="cc.id">{{ cc.name }}</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div>
              <label class="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Notlar</label>
              <textarea v-model="editingPersonnel.notes" rows="2" placeholder="Personel hakkında ek notlar..."
                class="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg outline-none focus:border-blue-500 resize-none"></textarea>
            </div>

            <!-- Maliyet Analizi Section (Sadece Mevcut Personel İçin) -->
            <div v-if="editingPersonnel.id" class="pt-6 border-t border-gray-100">
               <AppFinancialHistory :personnel-id="editingPersonnel.id" />
            </div>
          </div>

          <div class="px-7 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
            <button type="button" @click="showModal = false"
              class="px-5 py-2 text-[13px] font-semibold text-gray-500 hover:text-gray-700 transition-colors">Vazgeç</button>
            <button type="button" @click="savePersonnel" :disabled="saving"
              class="px-8 py-2 text-[13px] font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm shadow-blue-200 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
              <i :class="saving ? 'fas fa-spinner fa-spin' : 'fas fa-save'" class="text-[11px]"></i>
              {{ saving ? 'Kaydediliyor…' : (editingPersonnel.id ? 'Değişiklikleri Kaydet' : 'Personeli Oluştur') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
/* Custom transitions for modal if needed */
</style>
