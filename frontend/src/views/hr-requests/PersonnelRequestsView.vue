<script setup>
import { ref, onMounted, computed, inject, watch } from 'vue'
import api from '../../api'
import AppTable from '../../components/AppTable.vue'
import { useMasterDataStore } from '../../stores/masterData'
import { useToast } from '../../composables/useToast'
import { useConfirm } from '../../composables/useConfirm'
import * as XLSX from 'xlsx'

const { showToast } = useToast()
const { ask, startLoading, stopLoading } = useConfirm()

const masterData = useMasterDataStore()

// Filters injected from HRLayout
const filters = inject('hrFilters', { selectedCompanyId: ref(null), selectedType: ref(null) })

const requests  = ref([])
const loading   = ref(false)

/* ── Columns ── */
const columns = [
  { key: 'type',            label: 'Tür',          width: '80px',  sortable: true },
  { key: 'full_name',       label: 'Ad Soyad',     width: '180px', sortable: true },
  { key: 'position',        label: 'Unvan',        width: '160px', sortable: true },
  { key: 'company_name',    label: 'Şirket',       width: '150px', sortable: true },
  { key: 'department_name', label: 'Departman',    width: '150px', sortable: true },
  { key: 'location_name',   label: 'Lokasyon',     width: '130px', sortable: true },
  { key: 'request_date',    label: 'Tarih',        width: '110px', sortable: true },
  { key: 'equipment',       label: 'Donanım',      width: '180px', sortable: false, filterable: false },
  { key: 'status',          label: 'Durum',        width: '110px', sortable: true },
]

/* ── Filtered Rows ── */
const tableRows = computed(() => {
  return requests.value.filter(r => {
    const matchType    = !filters.selectedType.value    || r.type === filters.selectedType.value
    const matchCompany = !filters.selectedCompanyId.value || r.company_id === filters.selectedCompanyId.value
    return matchType && matchCompany
  })
})

/* ── Stats ── */
const stats = computed(() => ({
  pending:   requests.value.filter(r => r.status === 'PENDING').length,
  completed: requests.value.filter(r => r.status === 'COMPLETED').length,
  total:     requests.value.length,
  entry:     requests.value.filter(r => r.type === 'ENTRY').length,
  exit:      requests.value.filter(r => r.type === 'EXIT').length,
}))

/* ── Fetch ── */
const fetchData = async () => {
  loading.value = true
  try {
    const res = await api.get('/hr-requests')
    requests.value = res.data
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

/* ── Status Update ── */
const updateStatus = async (id, newStatus) => {
  try {
    await api.put(`/hr-requests/${id}`, { status: newStatus })
    fetchData()
  } catch (err) { console.error(err) }
}

/* ── Delete ── */
const handleDelete = async (row) => {
  const impact = await masterData.getDeleteImpact('hr-requests', row.id)
  const confirmed = await ask({
    title: 'Talebi Sil',
    message: `"${row.full_name}" için oluşturulan talebi silmek istediğinize emin misiniz?`,
    confirmLabel: 'Evet, Sil',
    impact: impact
  })
  if (confirmed) {
    try {
      startLoading()
      await api.delete(`/hr-requests/${row.id}`)
      showToast('Talep başarıyla silindi', 'success')
      fetchData()
    } catch (err) {
      showToast('Hata: ' + err.message, 'error')
    } finally {
      stopLoading()
    }
  }
}

/* ── Excel export ── */
const exportExcel = () => {
  const rows = tableRows.value.map(r => ({
    'Tür': r.type === 'ENTRY' ? 'Giriş' : 'Çıkış',
    'Ad Soyad': r.full_name,
    'Unvan': r.position || '',
    'Şirket': r.company_name || '',
    'Departman': r.department_name || '',
    'Tarih': r.request_date || '',
    'Durum': r.status === 'PENDING' ? 'Bekliyor' : 'Tamamlandı',
    'Notlar': r.notes || '',
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'IK')
  XLSX.writeFile(wb, 'ik-bildirimleri.xlsx')
}

/* ── Selection ── */
const selectedIds     = ref([])
const onSelectionChange = (rows) => { selectedIds.value = rows.map(r => r.id) }

/* ── Modal: Add/Edit ── */
const showModal  = ref(false)
const editTarget = ref(null)
const formType   = ref('ENTRY')
const form       = ref({
  full_name: '', position: '', request_date: '',
  company_id: null, department_id: null, location_id: null, cost_center_id: null,
  equipment_needed: [], notes: '', manager_name: '',
  email_groups: '', erp_permissions: '', file_permissions: ''
})

const filteredDepts    = computed(() => masterData.departments.filter(d => d.company_id === form.value.company_id))
const filteredCostCenters = computed(() => masterData.costCenters.filter(cc => cc.company_id === form.value.company_id))

watch(() => form.value.company_id, () => {
  form.value.department_id  = null
  form.value.cost_center_id = null
})

const openAdd = (type = 'ENTRY') => {
  editTarget.value = null
  formType.value   = type
  form.value = {
    full_name: '', position: '', request_date: '',
    company_id: null, department_id: null, location_id: null, cost_center_id: null,
    equipment_needed: [], notes: '', manager_name: '',
    email_groups: '', erp_permissions: '', file_permissions: ''
  }
  showModal.value = true
}

const openEdit = (row) => {
  editTarget.value = row
  formType.value   = row.type
  form.value = {
    ...row,
    equipment_needed: (() => { try { return JSON.parse(row.equipment_needed || '[]') } catch { return [] } })()
  }
  showModal.value = true
}

const save = async () => {
  try {
    startLoading()
    const payload = { ...form.value, type: formType.value }
    if (editTarget.value) {
      await api.put(`/hr-requests/${editTarget.value.id}`, payload)
      showToast('Bildirim başarıyla güncellendi', 'success')
    } else {
      await api.post('/hr-requests', payload)
      showToast('Bildirim başarıyla oluşturuldu', 'success')
    }
    showModal.value = false
    fetchData()
  } catch (err) {
    showToast('Hata: ' + (err.response?.data?.error || err.message), 'error')
  } finally {
    stopLoading()
  }
}

const equipmentOptions = ['Dizüstü Bilgisayar', 'Cep Telefonu', 'Monitör', 'Klavye & Mouse', 'Şirket Aracı', 'IP Telefon', 'Kulaklık']

onMounted(() => {
  fetchData()
  masterData.fetchCompanies()
  masterData.fetchDepartments()
  masterData.fetchCostCenters()
  masterData.fetchLocations()
})
</script>

<template>
  <div class="h-full flex flex-col overflow-hidden">

    <!-- ── Stats Bar ───────────────────────────────────────────────── -->
    <div class="shrink-0 px-6 py-3 border-b border-gray-100 bg-[#fafafa] flex items-center gap-6">
      <div class="flex items-center gap-5">
        <div class="flex items-center gap-2">
          <span class="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Toplam</span>
          <span class="text-[14px] font-bold text-gray-800">{{ stats.total }}</span>
        </div>
        <div class="w-px h-4 bg-gray-200"></div>
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-blue-400"></span>
          <span class="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Giriş</span>
          <span class="text-[14px] font-bold text-blue-600">{{ stats.entry }}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-red-400"></span>
          <span class="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Çıkış</span>
          <span class="text-[14px] font-bold text-red-600">{{ stats.exit }}</span>
        </div>
        <div class="w-px h-4 bg-gray-200"></div>
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-amber-400"></span>
          <span class="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Bekleyen</span>
          <span class="text-[14px] font-bold text-amber-600">{{ stats.pending }}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span class="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Tamamlanan</span>
          <span class="text-[14px] font-bold text-emerald-600">{{ stats.completed }}</span>
        </div>
      </div>
    </div>

    <!-- ── Table ───────────────────────────────────────────────────── -->
    <div class="flex-1 min-h-0">
      <AppTable
        :columns="columns"
        :rows="tableRows"
        :loading="loading"
        :selectable="true"
        empty-text="Kriterlere uygun bildirim bulunamadı"
        @row-edit="openEdit"
        @row-delete="handleDelete"
        @selection-change="onSelectionChange"
      >
        <!-- Toolbar -->
        <template #toolbar>
          <template v-if="selectedIds.length > 0">
            <span class="text-[13px] font-bold text-[#1a73e8]">{{ selectedIds.length }} Seçili</span>
            <button type="button" @click="exportExcel"
              class="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg text-[12px] font-bold hover:bg-emerald-100">
              <i class="fas fa-file-excel"></i> Seçilenleri İndir
            </button>
          </template>
          <div class="ml-auto flex items-center gap-2">
            <button type="button" @click="exportExcel"
              class="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-lg text-[12px] font-semibold hover:bg-gray-50">
              <i class="fas fa-file-excel text-emerald-500"></i> Excel
            </button>
            <button type="button" @click="openAdd('EXIT')"
              class="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-100 text-red-600 rounded-lg text-[12px] font-bold hover:bg-red-100">
              <i class="fas fa-user-minus text-[11px]"></i> Çıkış Bildir
            </button>
            <button type="button" @click="openAdd('ENTRY')"
              class="flex items-center gap-1.5 px-4 py-1.5 bg-[#1a73e8] text-white rounded-lg text-[12px] font-bold hover:bg-blue-700 shadow-sm">
              <i class="fas fa-user-plus text-[11px]"></i> Giriş Bildir
            </button>
          </div>
        </template>

        <!-- Tür badge -->
        <template #cell-type="{ value }">
          <span :class="[
            'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold',
            value === 'ENTRY' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'
          ]">
            <i :class="['fas', value === 'ENTRY' ? 'fa-user-plus' : 'fa-user-minus', 'text-[10px]']"></i>
            {{ value === 'ENTRY' ? 'Giriş' : 'Çıkış' }}
          </span>
        </template>

        <!-- Ad Soyad -->
        <template #cell-full_name="{ value }">
          <span class="font-bold text-gray-900">{{ value }}</span>
        </template>

        <!-- Tarih -->
        <template #cell-request_date="{ value }">
          <span class="font-mono text-[12px] text-gray-500">
            {{ value ? new Date(value).toLocaleDateString('tr-TR') : '—' }}
          </span>
        </template>

        <!-- Donanım chips -->
        <template #cell-equipment="{ row }">
          <div class="flex flex-wrap gap-1">
            <template v-if="row.equipment_needed">
              <span
                v-for="eq in (() => { try { return JSON.parse(row.equipment_needed) } catch { return [] } })()"
                :key="eq"
                class="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-bold whitespace-nowrap"
              >{{ eq }}</span>
            </template>
            <span v-else class="text-gray-300 text-[11px]">—</span>
          </div>
        </template>

        <!-- Durum -->
        <template #cell-status="{ value, row }">
          <div class="flex items-center gap-2">
            <span :class="[
              'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold',
              value === 'PENDING' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
            ]">
              <span class="w-1.5 h-1.5 rounded-full" :class="value === 'PENDING' ? 'bg-amber-500' : 'bg-emerald-500'"></span>
              {{ value === 'PENDING' ? 'Bekliyor' : 'Tamamlandı' }}
            </span>
            <button
              v-if="value === 'PENDING'"
              @click.stop="updateStatus(row.id, 'COMPLETED')"
              class="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-emerald-500 hover:bg-emerald-50 rounded transition-all"
              title="Tamamlandı olarak işaretle"
            >
              <i class="fas fa-check text-[10px]"></i>
            </button>
            <button
              v-else
              @click.stop="updateStatus(row.id, 'PENDING')"
              class="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-amber-500 hover:bg-amber-50 rounded transition-all"
              title="Bekliyor'a geri al"
            >
              <i class="fas fa-undo text-[10px]"></i>
            </button>
          </div>
        </template>
      </AppTable>
    </div>

    <!-- ── Add/Edit Modal ─────────────────────────────────────────── -->
    <Teleport to="body">
      <div v-if="showModal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        @click.self="showModal = false">
        <div class="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">

          <!-- Modal Header -->
          <div class="px-7 py-5 border-b border-gray-100 shrink-0 flex items-center justify-between"
            :class="formType === 'ENTRY' ? 'bg-blue-50/40' : 'bg-red-50/40'">
            <div class="flex items-center gap-3">
              <div :class="[
                'w-10 h-10 rounded-xl flex items-center justify-center',
                formType === 'ENTRY' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'
              ]">
                <i :class="['fas text-[15px]', formType === 'ENTRY' ? 'fa-user-plus' : 'fa-user-minus']"></i>
              </div>
              <div>
                <h2 class="text-[17px] font-bold text-gray-900">
                  {{ editTarget ? 'Bildirimi Düzenle' : (formType === 'ENTRY' ? 'Yeni Giriş Bildirimi' : 'Yeni Çıkış Bildirimi') }}
                </h2>
                <p class="text-[12px] text-gray-400 mt-0.5">Lütfen çalışan bilgilerini eksiksiz doldurun</p>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <!-- Tür Toggle -->
              <div v-if="!editTarget" class="flex items-center p-1 bg-white border border-gray-200 rounded-lg">
                <button type="button" @click="formType = 'ENTRY'"
                  :class="formType === 'ENTRY' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700'"
                  class="px-4 py-1.5 rounded-md text-[12px] font-bold transition-all">Giriş</button>
                <button type="button" @click="formType = 'EXIT'"
                  :class="formType === 'EXIT' ? 'bg-red-500 text-white' : 'text-gray-500 hover:text-gray-700'"
                  class="px-4 py-1.5 rounded-md text-[12px] font-bold transition-all">Çıkış</button>
              </div>
              <button @click="showModal = false" class="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100">
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>

          <!-- Modal Body -->
          <div class="p-7 overflow-y-auto flex-1 space-y-7">

            <!-- 1. Kişisel Bilgiler -->
            <div class="space-y-4">
              <h4 class="text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2 flex items-center gap-2">
                <i class="fas fa-id-card text-blue-400"></i> Kişisel Bilgiler
              </h4>
              <div class="grid grid-cols-2 gap-4">
                <div class="col-span-2 space-y-1">
                  <label class="text-[11px] font-bold text-gray-400 uppercase">Adı Soyadı <span class="text-red-500">*</span></label>
                  <input v-model="form.full_name" type="text" required placeholder="Ahmet Yılmaz"
                    class="w-full h-10 px-3 text-[13px] border border-gray-200 rounded-lg outline-none focus:border-blue-500">
                </div>
                <div class="space-y-1">
                  <label class="text-[11px] font-bold text-gray-400 uppercase">Unvan</label>
                  <input v-model="form.position" type="text" placeholder="Örn: Uzman / Specialist"
                    class="w-full h-10 px-3 text-[13px] border border-gray-200 rounded-lg outline-none focus:border-blue-500">
                </div>
                <div class="space-y-1">
                  <label class="text-[11px] font-bold text-gray-400 uppercase">
                    {{ formType === 'ENTRY' ? 'İşe Başlama' : 'Ayrılış' }} Tarihi <span class="text-red-500">*</span>
                  </label>
                  <input v-model="form.request_date" type="date"
                    class="w-full h-10 px-3 text-[13px] border border-gray-200 rounded-lg outline-none focus:border-blue-500">
                </div>
                <div class="space-y-1">
                  <label class="text-[11px] font-bold text-gray-400 uppercase">Şirket</label>
                  <select v-model="form.company_id"
                    class="w-full h-10 px-3 text-[13px] border border-gray-200 rounded-lg outline-none focus:border-blue-500 bg-white">
                    <option :value="null">Seçiniz...</option>
                    <option v-for="c in masterData.companies" :key="c.id" :value="c.id">{{ c.name }}</option>
                  </select>
                </div>
                <div class="space-y-1">
                  <label class="text-[11px] font-bold text-gray-400 uppercase">Departman</label>
                  <select v-model="form.department_id" :disabled="!form.company_id"
                    class="w-full h-10 px-3 text-[13px] border border-gray-200 rounded-lg outline-none focus:border-blue-500 bg-white disabled:bg-gray-50 disabled:cursor-not-allowed">
                    <option :value="null">Seçiniz...</option>
                    <option v-for="d in filteredDepts" :key="d.id" :value="d.id">{{ d.name }}</option>
                  </select>
                </div>
                <div class="space-y-1">
                  <label class="text-[11px] font-bold text-gray-400 uppercase">Lokasyon</label>
                  <select v-model="form.location_id"
                    class="w-full h-10 px-3 text-[13px] border border-gray-200 rounded-lg outline-none focus:border-blue-500 bg-white">
                    <option :value="null">Seçiniz...</option>
                    <option v-for="l in masterData.locations" :key="l.id" :value="l.id">{{ l.name }}</option>
                  </select>
                </div>
                <div class="space-y-1">
                  <label class="text-[11px] font-bold text-gray-400 uppercase">Masraf Yeri</label>
                  <select v-model="form.cost_center_id" :disabled="!form.company_id"
                    class="w-full h-10 px-3 text-[13px] border border-gray-200 rounded-lg outline-none focus:border-blue-500 bg-white disabled:bg-gray-50 disabled:cursor-not-allowed">
                    <option :value="null">Seçiniz...</option>
                    <option v-for="cc in filteredCostCenters" :key="cc.id" :value="cc.id">{{ cc.name }}</option>
                  </select>
                </div>
                <div class="space-y-1">
                  <label class="text-[11px] font-bold text-gray-400 uppercase">Bağlı Yönetici</label>
                  <input v-model="form.manager_name" type="text" placeholder="Yönetici Adı Soyadı"
                    class="w-full h-10 px-3 text-[13px] border border-gray-200 rounded-lg outline-none focus:border-blue-500">
                </div>
              </div>
            </div>

            <!-- 2. Donanım -->
            <div class="space-y-3">
              <h4 class="text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2 flex items-center gap-2">
                <i class="fas fa-laptop text-blue-400"></i> Şirket Donanımları
              </h4>
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5 bg-gray-50 p-4 rounded-xl border border-gray-100">
                <label v-for="eq in equipmentOptions" :key="eq"
                  class="flex items-center gap-2.5 cursor-pointer group p-2 rounded-lg hover:bg-white transition-all">
                  <input type="checkbox" v-model="form.equipment_needed" :value="eq"
                    class="w-4 h-4 accent-blue-600 rounded">
                  <span class="text-[13px] text-gray-600 font-medium select-none">{{ eq }}</span>
                </label>
              </div>
            </div>

            <!-- 3. Yetkilendirme -->
            <div class="space-y-4">
              <h4 class="text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2 flex items-center gap-2">
                <i class="fas fa-key text-blue-400"></i> Yetkilendirme & Notlar
              </h4>
              <div class="grid grid-cols-2 gap-4">
                <div class="col-span-2 space-y-1">
                  <label class="text-[11px] font-bold text-gray-400 uppercase">Üye Olacağı Mail Grupları</label>
                  <input v-model="form.email_groups" type="text" placeholder="Örn: ALL TALAY, IT DEPT"
                    class="w-full h-10 px-3 text-[13px] border border-gray-200 rounded-lg outline-none focus:border-blue-500">
                </div>
                <div class="space-y-1">
                  <label class="text-[11px] font-bold text-gray-400 uppercase">ERP (Siber) Yetkileri</label>
                  <input v-model="form.erp_permissions" type="text" placeholder="—"
                    class="w-full h-10 px-3 text-[13px] border border-gray-200 rounded-lg outline-none focus:border-blue-500">
                </div>
                <div class="space-y-1">
                  <label class="text-[11px] font-bold text-gray-400 uppercase">Dosya Erişim Yetkileri</label>
                  <input v-model="form.file_permissions" type="text" placeholder="Örn: Ortak IK Klasörü"
                    class="w-full h-10 px-3 text-[13px] border border-gray-200 rounded-lg outline-none focus:border-blue-500">
                </div>
                <div class="col-span-2 space-y-1">
                  <label class="text-[11px] font-bold text-gray-400 uppercase">BT Ekibine Notlar</label>
                  <textarea v-model="form.notes" rows="2" placeholder="Ek notlar..."
                    class="w-full px-3 py-2.5 text-[13px] border border-gray-200 rounded-lg outline-none focus:border-blue-500 resize-none"></textarea>
                </div>
              </div>
            </div>

          </div>

          <!-- Modal Footer -->
          <div class="px-7 py-4 border-t border-gray-100 bg-gray-50/40 shrink-0 flex justify-end gap-2">
            <button @click="showModal = false"
              class="px-5 py-2 text-[13px] font-semibold text-gray-500 hover:text-gray-700">Vazgeç</button>
            <button @click="save"
              :class="['px-6 py-2 text-[13px] font-bold text-white rounded-lg shadow-sm flex items-center gap-1.5',
                formType === 'ENTRY' ? 'bg-[#1a73e8] hover:bg-blue-700' : 'bg-red-500 hover:bg-red-600']">
              <i class="fas fa-save text-[11px]"></i>
              {{ editTarget ? 'Güncelle' : 'Bildirimi Oluştur' }}
            </button>
          </div>

        </div>
      </div>
    </Teleport>
  </div>
</template>
