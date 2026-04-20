<script setup>
import { ref, computed, onMounted } from 'vue'
import { useMasterDataStore } from '../../stores/masterData'
import { useRouter } from 'vue-router'
import { useToast } from '../../composables/useToast'
import { useConfirm } from '../../composables/useConfirm'
import AppTable from '../../components/AppTable.vue'
import * as XLSX from 'xlsx'

const masterData = useMasterDataStore()
const router = useRouter()
const activeTab  = ref('companies')
const loading    = ref(false)
const { showToast } = useToast()
const { ask, startLoading, stopLoading } = useConfirm()

const fetchData = async () => {
  loading.value = true
  await Promise.all([
    masterData.fetchCompanies(),
    masterData.fetchDepartments(),
    masterData.fetchCostCenters(),
  ])
  loading.value = false
}

// ── Kolon Tanımları ───────────────────────────────────────────────────
const columns = computed(() => {
  if (activeTab.value === 'companies') return [
    { key: 'company_id', label: 'ID',           sortable: true, width: '80px' },
    { key: 'name',       label: 'Şirket Adı',     sortable: true },
    { key: 'personnel_count', label: 'Personel', sortable: true, width: '120px', align: 'center' },
    { key: 'tax_number', label: 'Vergi Numarası', sortable: true, width: '220px' },
    { key: 'created_at', label: 'Eklenme Tarihi', sortable: true, width: '160px' },
  ]
  if (activeTab.value === 'departments') return [
    { key: 'dept_id',    label: 'Kod/ID',         sortable: true, width: '100px' },
    { key: 'name',       label: 'Departman Adı',  sortable: true },
    { key: 'personnel_count', label: 'Personel', sortable: true, width: '120px', align: 'center' },
    { key: 'notes',      label: 'Notlar/Açıklama', sortable: true },
    { key: 'created_at', label: 'Eklenme Tarihi', sortable: true, width: '160px' },
  ]
  if (activeTab.value === 'cost-centers') return [
    { key: 'code',       label: 'Kod',            sortable: true, width: '140px' },
    { key: 'name',       label: 'Açıklama/İsim',  sortable: true },
    { key: 'personnel_count', label: 'Personel', sortable: true, width: '120px', align: 'center' },
    { key: 'created_at', label: 'Eklenme Tarihi', sortable: true, width: '160px' },
  ]
  return []
})

const rows = computed(() => {
  if (activeTab.value === 'companies') return masterData.companies
  if (activeTab.value === 'departments') return masterData.departments
  if (activeTab.value === 'cost-centers') return masterData.costCenters
  return []
})

// ── Modal İşlemleri ──────────────────────────────────────────────────────────
const showModal      = ref(false)
const showHistoryModal = ref(false)
const editingItem    = ref(null)
const historyItem    = ref(null)
const formData       = ref({ name: '', code: '', tax_number: '', notes: '', dept_id: null, company_id: null })

const openModal = (item = null) => {
  editingItem.value = item
  formData.value = item ? { ...item } : { name: '', code: '', tax_number: '', notes: '', dept_id: null, company_id: null }
  showModal.value = true
}

const openHistory = (item) => {
  historyItem.value = item
  showHistoryModal.value = true
}

const submitForm = async () => {
  loading.value = true
  try {
    if (editingItem.value) {
      await masterData.updateItem(activeTab.value, editingItem.value.id, formData.value)
      showToast('Kayıt başarıyla güncellendi', 'success')
    } else {
      await masterData.createItem(activeTab.value, formData.value)
      showToast('Yeni kayıt başarıyla oluşturuldu', 'success')
    }
    showModal.value = false
  } catch (e) { 
    showToast('Hata: ' + (e.response?.data?.error || e.message), 'error') 
  } finally {
    loading.value = false
  }
}

const handleDelete = async (row) => {
  const label = activeTab.value === 'companies' ? 'Şirketi' : activeTab.value === 'departments' ? 'Departmanı' : 'Masraf Yerini'
  
  // Fetch impact analysis
  const impact = await masterData.getDeleteImpact(activeTab.value, row.id)
  
  const confirmed = await ask({
    title: 'Kaydı Sil',
    message: `"${row.name || row.code}" isimli ${label.toLowerCase()} silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`,
    confirmLabel: 'Evet, Sil',
    impact: impact
  })

  if (confirmed) {
    try {
      startLoading()
      await masterData.deleteItem(activeTab.value, row.id)
      showToast('Kayıt başarıyla silindi', 'success')
    } catch (e) {
      showToast('Hata: ' + (e.response?.data?.error || e.message), 'error')
    } finally {
      stopLoading()
    }
  }
}

const goToPersonnel = (row) => {
  const query = {}
  if (activeTab.value === 'companies') query.company = row.name
  if (activeTab.value === 'departments') query.department = row.name
  if (activeTab.value === 'cost-centers') query.costCenter = row.name
  
  router.push({ name: 'master-personnel', query })
}

// ── Excel İşlemleri ──────────────────────────────────────────────────────────
const downloadTemplate = () => {
  let templateData = []
  let fileName = ''

  if (activeTab.value === 'companies') {
    templateData = [ { 'Şirket Adı': 'Örnek A.Ş.', 'Vergi Numarası': '1234567890', 'Notlar': 'Merkez Ofis' } ]
    fileName = 'Sirket_Yukleme_Sablonu.xlsx'
  } else if (activeTab.value === 'departments') {
    templateData = [ { 'Departman Adı': 'Bilgi Teknolojileri', 'Notlar': 'Genel Müdürlük' } ]
    fileName = 'Departman_Yukleme_Sablonu.xlsx'
  } else if (activeTab.value === 'cost-centers') {
    templateData = [ { 'Kod': 'BT-001', 'Açıklama': 'IT Donanım Giderleri', 'Notlar': 'Yıllık bütçe merkezi' } ]
    fileName = 'MasrafYeri_Yukleme_Sablonu.xlsx'
  }

  const ws = XLSX.utils.json_to_sheet(templateData)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sablon')
  XLSX.writeFile(wb, fileName)
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
      const jsonRows = XLSX.utils.sheet_to_json(sheet)
      
      let successCount = 0
      let errorCount = 0
      let lastError = ''

      for (const row of jsonRows) {
        let payload = {}
        if (activeTab.value === 'companies') {
          payload = { name: row['Şirket Adı'], tax_number: row['Vergi Numarası'], notes: row['Notlar'] }
        } else if (activeTab.value === 'departments') {
          payload = { name: row['Departman Adı'], notes: row['Notlar'] }
        } else if (activeTab.value === 'cost-centers') {
          payload = { code: row['Kod'], name: row['Açıklama'], notes: row['Notlar'] }
        }

        if (payload.name || payload.code) {
          try {
            await masterData.createItem(activeTab.value, payload)
            successCount++
          } catch (err) {
            errorCount++
            lastError = err.response?.data?.error || err.message
          }
        }
      }
      alert(`${successCount} kayıt başarıyla eklendi. ${errorCount > 0 ? errorCount + ' kayıt hata nedeniyle atlandı. Son Hata: ' + lastError : ''}`)
      await fetchData()
    } catch (err) { alert('Excel işlenirken hata oluştu.') }
    finally { loading.value = false; e.target.value = '' }
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
        <h1 class="text-[20px] font-bold text-gray-900 tracking-tight">Organizasyon Yapısı</h1>
        <p class="text-[13px] text-gray-400 mt-1">Şirket, Departman ve Masraf Yerlerini global olarak yönetin</p>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1.5 p-1.5 bg-gray-100 rounded-2xl w-fit mb-6 border border-gray-200/50 shrink-0">
      <button
        v-for="tab in [
          { key: 'companies',    label: 'Şirketler',     icon: 'fa-building' },
          { key: 'departments',  label: 'Departmanlar',  icon: 'fa-sitemap'  },
          { key: 'cost-centers', label: 'Masraf Yerleri', icon: 'fa-tag'      },
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

    <!-- Table -->
    <div class="flex-1 min-height-0">
      <AppTable
        :key="activeTab"
        :columns="columns"
        :rows="rows"
        :loading="loading"
        @row-edit="openModal"
        @row-delete="handleDelete"
        @row-history="openHistory"
      >
        <template #toolbar>
          <div class="flex items-center gap-2">
            <button type="button" @click="downloadTemplate" 
              class="px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-[12px] font-semibold hover:bg-gray-50 flex items-center gap-1.5 transition-all">
              <i class="fas fa-download text-gray-400"></i> Şablon
            </button>
            
            <label class="cursor-pointer px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg text-[12px] font-bold hover:bg-emerald-100 flex items-center gap-1.5 transition-colors">
              <i class="fas fa-file-excel"></i> Excel Yükle
              <input type="file" @change="handleExcelImport" class="hidden" accept=".xlsx,.xls">
            </label>

            <button type="button"
              class="flex items-center gap-2 px-4 py-1.5 bg-blue-600 text-white text-[12.5px] font-bold rounded-lg hover:bg-blue-700 shadow-sm ml-2"
              @click="openModal()">
              <i class="fas fa-plus text-[11px]"></i> Yeni Kayıt
            </button>
          </div>
        </template>

        <!-- Custom Cell Renderers -->
        <template #cell-company_id="{ value }">
          <span class="font-mono font-bold text-indigo-600 text-[13px]">{{ value || '—' }}</span>
        </template>

        <template #cell-dept_id="{ value }">
          <span class="font-mono font-bold text-blue-600 text-[13px]">{{ value || '—' }}</span>
        </template>

        <template #cell-code="{ value }">
          <span class="font-mono font-bold text-blue-600 text-[13px]">{{ value }}</span>
        </template>

        <template #cell-name="{ value }">
          <span class="text-[13px] font-semibold text-gray-800">{{ value }}</span>
        </template>

        <template #cell-created_at="{ value }">
          <span class="text-[12px] text-gray-400">{{ new Date(value).toLocaleDateString('tr-TR') }}</span>
        </template>

        <!-- Personnel Count Link -->
        <template #cell-personnel_count="{ row, value }">
          <button 
            type="button" 
            @click.stop="goToPersonnel(row)"
            class="group inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all duration-200"
          >
            <i class="fas fa-users text-[10px] opacity-70 group-hover:opacity-100"></i>
            <span class="text-[13px] font-bold">{{ value || 0 }}</span>
          </button>
        </template>
      </AppTable>
    </div>

    <!-- Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" @click.self="showModal = false">
        <div class="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
          <div class="px-7 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <div>
              <h2 class="text-[16px] font-bold text-gray-900">
                {{ editingItem ? 'Kaydı Düzenle' : (activeTab === 'companies' ? 'Şirket Ekle' : activeTab === 'departments' ? 'Departman Ekle' : 'Masraf Yeri Ekle') }}
              </h2>
            </div>
            <button type="button" @click="showModal = false" class="text-gray-400 hover:text-gray-700 w-8 h-8 rounded-lg hover:bg-gray-100 inline-flex items-center justify-center">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <div class="p-7 space-y-4">
            <!-- Company Info -->
            <template v-if="activeTab === 'companies'">
              <div class="grid grid-cols-4 gap-4">
                <div class="space-y-1.5">
                  <label class="text-[11px] font-bold text-gray-400 uppercase tracking-widest">ID (Oto)</label>
                  <input :value="formData.company_id" type="text" readonly placeholder="Oto"
                    class="w-full h-11 px-4 text-[13px] border border-gray-200 rounded-xl outline-none bg-gray-50 text-gray-400 font-mono font-bold">
                </div>
                <div class="col-span-3 space-y-1.5">
                  <label class="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Şirket Tam Adı</label>
                  <input v-model="formData.name" type="text" placeholder="Örn: Talay Lojistik A.Ş."
                    class="w-full h-11 px-4 text-[13px] border border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all">
                </div>
              </div>
              <div class="space-y-1.5">
                <label class="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Vergi Numarası</label>
                <input v-model="formData.tax_number" type="text"
                  class="w-full h-11 px-4 text-[13px] border border-gray-200 rounded-xl outline-none focus:border-blue-500">
              </div>
            </template>

            <!-- Department Info -->
            <template v-if="activeTab === 'departments'">
              <div class="grid grid-cols-4 gap-4">
                <div class="space-y-1.5">
                  <label class="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Kod (Oto)</label>
                  <input :value="formData.dept_id" type="text" readonly placeholder="Oto"
                    class="w-full h-11 px-4 text-[13px] border border-gray-200 rounded-xl outline-none bg-gray-50 text-gray-400 font-mono font-bold">
                </div>
                <div class="col-span-3 space-y-1.5">
                  <label class="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Departman İsmi</label>
                  <input v-model="formData.name" type="text" placeholder="Örn: Bilgi Teknolojileri"
                    class="w-full h-11 px-4 text-[13px] border border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50">
                </div>
              </div>
            </template>

            <!-- Cost Center Info -->
            <template v-if="activeTab === 'cost-centers'">
              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-1.5">
                  <label class="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Kod</label>
                  <input v-model="formData.code" type="text" placeholder="BT-01"
                    class="w-full h-11 px-4 text-[13px] border border-gray-200 rounded-xl outline-none focus:border-blue-500 font-mono font-bold text-blue-600 uppercase">
                </div>
                <div class="space-y-1.5">
                  <label class="text-[11px] font-bold text-gray-400 uppercase tracking-widest">İsim</label>
                  <input v-model="formData.name" type="text" placeholder="IT Gider"
                    class="w-full h-11 px-4 text-[13px] border border-gray-200 rounded-xl outline-none focus:border-blue-500">
                </div>
              </div>
            </template>

            <div class="space-y-1.5">
              <label class="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Notlar</label>
              <textarea v-model="formData.notes" rows="2"
                class="w-full p-4 text-[13px] border border-gray-200 rounded-xl outline-none focus:border-blue-500 resize-none"></textarea>
            </div>
          </div>

          <div class="px-7 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
            <button type="button" @click="showModal = false" class="px-4 py-2 text-[13px] font-bold text-gray-500 hover:text-gray-700">İptal</button>
            <button type="button" @click="submitForm" class="px-6 py-2 bg-blue-600 text-white text-[13px] font-bold rounded-xl hover:bg-blue-700 shadow-sm">
              {{ editingItem ? 'Güncelle' : 'Oluştur' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- History Modal -->
    <Teleport to="body">
      <div v-if="showHistoryModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" @click.self="showHistoryModal = false">
        <div class="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
          <div class="px-7 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <div>
              <h2 class="text-[16px] font-bold text-gray-900">Kayıt Geçmişi & Detayları</h2>
              <p class="text-[11px] text-gray-400 mt-0.5">Sistem ID: {{ historyItem?.id }}</p>
            </div>
            <button type="button" @click="showHistoryModal = false" class="text-gray-400 hover:text-gray-700 w-8 h-8 rounded-lg hover:bg-gray-100 inline-flex items-center justify-center">
              <i class="fas fa-times"></i>
            </button>
          </div>
          
          <div class="p-7">
            <div class="space-y-6">
              <div class="flex items-start gap-4">
                <div class="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                  <i class="fas fa-plus text-blue-500"></i>
                </div>
                <div>
                  <h4 class="text-[13px] font-bold text-gray-800">Kayıt Oluşturuldu</h4>
                  <p class="text-[12px] text-gray-500 mt-1">İşlem Tarihi: <span class="font-semibold text-gray-700">{{ historyItem?.created_at ? new Date(historyItem.created_at).toLocaleString('tr-TR') : 'Belirtilmemiş' }}</span></p>
                  <p class="text-[11px] text-gray-400 mt-1 italic">Sistem tarafından otomatik oluşturuldu.</p>
                </div>
              </div>

              <div class="flex items-start gap-4">
                <div class="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                  <i class="fas fa-info-circle text-gray-400"></i>
                </div>
                <div class="flex-1">
                  <h4 class="text-[13px] font-bold text-gray-800">Mevcut Veriler</h4>
                  <div class="mt-2 space-y-2">
                    <div class="flex justify-between py-1 border-b border-gray-50">
                      <span class="text-[12px] text-gray-400">İsim / Açıklama:</span>
                      <span class="text-[12px] font-semibold text-gray-700">{{ historyItem?.name }}</span>
                    </div>
                    <div v-if="historyItem?.dept_id" class="flex justify-between py-1 border-b border-gray-50">
                      <span class="text-[12px] text-gray-400">Departman Kodu:</span>
                      <span class="text-[12px] font-bold text-blue-600 font-mono">{{ historyItem?.dept_id }}</span>
                    </div>
                    <div v-if="historyItem?.company_id" class="flex justify-between py-1 border-b border-gray-50">
                      <span class="text-[12px] text-gray-400">Şirket ID:</span>
                      <span class="text-[12px] font-bold text-indigo-600 font-mono">{{ historyItem?.company_id }}</span>
                    </div>
                    <div v-if="historyItem?.tax_number" class="flex justify-between py-1 border-b border-gray-50">
                      <span class="text-[12px] text-gray-400">Vergi No:</span>
                      <span class="text-[12px] font-semibold text-gray-700">{{ historyItem?.tax_number }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="mt-8 p-4 bg-amber-50 rounded-xl border border-amber-100/50">
              <p class="text-[11px] text-amber-700 leading-relaxed">
                <i class="fas fa-shield-halved mr-1.5"></i>
                Bu kayıt merkezi veri havuzunda korunmaktadır. Geçmiş düzenleme detayları (audit log) sistem güncellemeleriyle birlikte buraya eklenecektir.
              </p>
            </div>
          </div>

          <div class="px-7 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end">
            <button type="button" @click="showHistoryModal = false" class="px-6 py-2 bg-gray-900 text-white text-[13px] font-bold rounded-xl hover:bg-black shadow-sm">
              Kapat
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.min-height-0 { min-height: 0; }
</style>
