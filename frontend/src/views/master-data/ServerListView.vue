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

const fetchData = async () => {
  loading.value = true
  await Promise.all([
    masterData.fetchServers(),
    masterData.fetchCompanies()
  ])
  loading.value = false
}

// ── İstatistikler ────────────────────────────────────────────────────────────
const stats = computed(() => {
  const all = masterData.servers || []
  return {
    total: all.length,
    online: all.filter(s => s.status === 'online').length,
    cloud: all.filter(s => s.type === 'cloud').length,
    local: all.filter(s => s.type === 'local').length
  }
})

// ── Tablo Tanımları ──────────────────────────────────────────────────────────
const columns = [
  { key: 'name',        label: 'Sunucu Adı',   width: '200px', sortable: true },
  { key: 'ip_address',  label: 'IP Adresi',    width: '140px', sortable: true },
  { key: 'type',        label: 'Tip',          width: '120px', sortable: true },
  { key: 'os_version',  label: 'İşletim Sistemi', width: '180px', sortable: true },
  { key: 'companies',   label: 'Şirket Ataması',  sortable: false },
  { key: 'status',      label: 'Durum',        width: '100px', sortable: true },
]

const rows = computed(() => masterData.servers)

// ── Modal İşlemleri ──────────────────────────────────────────────────────────
const showModal = ref(false)
const showHistoryModal = ref(false)
const editingItem = ref(null)
const historyItem = ref(null)
const formData = ref({
  name: '',
  ip_address: '',
  os_version: '',
  description: '',
  type: 'cloud',
  status: 'online',
  companies: []
})

const typeOptions = [
  { value: 'cloud',    label: 'Cloud',    icon: 'fa-cloud' },
  { value: 'local',    label: 'Physical',  icon: 'fa-server' },
  { value: 'vodafone', label: 'Vodafone', icon: 'fa-network-wired' },
]

const openModal = (item = null) => {
  editingItem.value = item
  if (item) {
    formData.value = {
      ...item,
      companies: (item.companies || []).map(c => ({ 
        id: c.company_id, 
        name: c.name, 
        share_ratio: c.share_ratio 
      }))
    }
  } else {
    formData.value = { name: '', ip_address: '', os_version: '', description: '', type: 'cloud', status: 'online', companies: [] }
  }
  showModal.value = true
}

const openHistory = (item) => {
  historyItem.value = item
  showHistoryModal.value = true
}

const addCompany = () => {
  formData.value.companies.push({ id: '', share_ratio: 0 })
}

const removeCompany = (index) => {
  formData.value.companies.splice(index, 1)
}

const submitForm = async () => {
  try {
    const totalShare = formData.value.companies.reduce((sum, c) => sum + (c.share_ratio || 0), 0)
    if (formData.value.companies.length > 0 && totalShare > 100) {
      const ok = await ask({
        title: 'Uyarı',
        message: `Toplam paylaşım oranı %${totalShare}. %100'ü geçiyor, devam edilsin mi?`,
        confirmLabel: 'Devam Et'
      })
      if (!ok) return
    }

    startLoading()
    if (editingItem.value) {
      await masterData.updateItem('servers', editingItem.value.id, formData.value)
      showToast('Sunucu başarıyla güncellendi', 'success')
    } else {
      await masterData.createItem('servers', formData.value)
      showToast('Yeni sunucu başarıyla eklendi', 'success')
    }
    
    showModal.value = false
    await masterData.fetchServers()
  } catch (err) { showToast('Hata: ' + (err.response?.data?.error || err.message), 'error') }
  finally { stopLoading() }
}

const handleDelete = async (row) => {
  const impact = await masterData.getDeleteImpact('servers', row.id)
  const confirmed = await ask({
    title: 'Sunucuyu Sil',
    message: `"${row.name}" isimli sunucuyu silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`,
    confirmLabel: 'Evet, Sil',
    impact: impact
  })
  if (confirmed) {
    try {
      startLoading()
      await masterData.deleteItem('servers', row.id)
      showToast('Sunucu başarıyla silindi', 'success')
      await masterData.fetchServers()
    } catch (err) {
      showToast('Hata: ' + err.message, 'error')
    } finally {
      stopLoading()
    }
  }
}

// ── Excel İşlemleri ──────────────────────────────────────────────────────────
const downloadTemplate = () => {
  const templateData = [
    { 
      'Sunucu Adı': 'SRV-WEB-01', 
      'IP Adresi': '192.168.1.50', 
      'Tip': 'cloud', 
      'İşletim Sistemi': 'Ubuntu 22.04', 
      'Açıklama': 'Web Sunucusu' 
    }
  ]
  const ws = XLSX.utils.json_to_sheet(templateData)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'SunucuSablon')
  XLSX.writeFile(wb, 'Sunucu_Yukleme_Sablonu.xlsx')
}

const handleExcelImport = (e) => {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = async (evt) => {
    try {
      loading.value = true
      const workbook = XLSX.read(evt.target.result, { type: 'binary' })
      const jsonRows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]])
      
      let success = 0, error = 0, lastErr = ''
      for (const row of jsonRows) {
        if (row['Sunucu Adı']) {
          try {
            await masterData.createItem('servers', {
              name: row['Sunucu Adı'],
              ip_address: row['IP Adresi'],
              type: row['Tip'] || 'cloud',
              os_version: row['İşletim Sistemi'],
              description: row['Açıklama'],
              status: 'online'
            })
            success++
          } catch (err) { error++; lastErr = err.message }
        }
      }
      alert(`${success} sunucu eklendi. ${error > 0 ? error + ' hata! (' + lastErr + ')' : ''}`)
      await masterData.fetchServers()
    } catch (err) { alert('Excel işlenirken hata oluştu.') }
    finally { loading.value = false; e.target.value = '' }
  }
  reader.readAsBinaryString(file)
}

onMounted(fetchData)
</script>

<template>
  <div class="h-full flex flex-col p-6 overflow-hidden bg-[#fbfbfb]">
    <!-- Header -->
    <div class="flex items-center justify-between mb-8 shrink-0">
      <div>
        <h1 class="text-[20px] font-bold text-gray-900 tracking-tight">Sunucu Envanteri</h1>
        <p class="text-[13px] text-gray-400 mt-1 uppercase tracking-widest font-bold">Data Center & Cloud Infrastructure</p>
      </div>

      <!-- Stats -->
      <div class="flex gap-4">
        <div v-for="s in [
          { label: 'Toplam', count: stats.total, color: 'text-gray-900', bg: 'bg-white' },
          { label: 'Online', count: stats.online, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Cloud', count: stats.cloud, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Local', count: stats.local, color: 'text-orange-600', bg: 'bg-orange-50' }
        ]" :key="s.label" 
        class="px-5 py-3 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center min-w-[100px]" :class="s.bg">
          <span class="text-[10px] font-bold text-gray-400 uppercase mb-1">{{ s.label }}</span>
          <span class="text-xl font-black" :class="s.color">{{ s.count }}</span>
        </div>
      </div>
    </div>

    <!-- Table Section -->
    <div class="flex-1 min-h-0 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
      <AppTable
        :key="masterData.servers.length"
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
              class="px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-[12px] font-bold hover:bg-gray-50 flex items-center gap-1.5 transition-all">
              <i class="fas fa-download text-gray-400"></i> Şablon
            </button>
            
            <label class="cursor-pointer px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg text-[12px] font-bold hover:bg-emerald-100 flex items-center gap-1.5 transition-colors">
              <i class="fas fa-file-excel"></i> Excel Yükle
              <input type="file" @change="handleExcelImport" class="hidden" accept=".xlsx,.xls">
            </label>

            <button type="button"
              class="flex items-center gap-2 px-4 py-1.5 bg-indigo-600 text-white text-[12.5px] font-bold rounded-lg hover:bg-indigo-700 shadow-sm ml-2"
              @click="openModal()">
              <i class="fas fa-plus text-[11px]"></i> Yeni Sunucu
            </button>
          </div>
        </template>

        <!-- Custom Cell Renderers -->
        <template #cell-name="{ value }">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center border border-gray-100">
              <i class="fas fa-server text-gray-400 text-[12px]"></i>
            </div>
            <span class="text-[13px] font-bold text-gray-800">{{ value }}</span>
          </div>
        </template>

        <template #cell-ip_address="{ value }">
          <span class="font-mono text-[13px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">{{ value || '—' }}</span>
        </template>

        <template #cell-type="{ value }">
          <span :class="[
            'inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-bold uppercase tracking-wider',
            value === 'cloud' ? 'bg-sky-50 text-sky-600 border border-sky-100' :
            value === 'local' ? 'bg-orange-50 text-orange-600 border border-orange-100' :
            'bg-indigo-50 text-indigo-600 border border-indigo-100'
          ]">
            <i :class="['fas', typeOptions.find(o => o.value === value)?.icon || 'fa-info-circle']"></i>
            {{ value }}
          </span>
        </template>

        <template #cell-companies="{ row }">
          <div class="flex flex-wrap gap-1.5">
            <span v-for="c in row.companies" :key="c.company_id" 
              class="px-2 py-0.5 rounded-lg bg-gray-50 border border-gray-100 text-[11px] font-bold text-gray-600">
              {{ c.name }} <span class="text-blue-500 ml-1">%{{ c.share_ratio }}</span>
            </span>
            <span v-if="!row.companies?.length" class="text-gray-300 italic text-[11px]">Hissedar yok</span>
          </div>
        </template>

        <template #cell-status="{ value }">
          <span :class="[
            'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold',
            value === 'online' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
          ]">
            <span class="w-1.5 h-1.5 rounded-full animate-pulse" :class="value === 'online' ? 'bg-emerald-500' : 'bg-red-500'"></span>
            {{ value === 'online' ? 'Aktif' : 'Pasif' }}
          </span>
        </template>
      </AppTable>
    </div>

    <!-- Edit/Add Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" @click.self="showModal = false">
        <div class="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
          <div class="px-8 py-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
            <div>
              <h2 class="text-[17px] font-bold text-gray-900">{{ editingItem ? 'Sunucu Düzenle' : 'Yeni Sunucu Kaydı' }}</h2>
              <p class="text-[11px] text-gray-400 mt-1 uppercase tracking-widest font-bold">Envanter Detayları</p>
            </div>
            <button @click="showModal = false" class="w-10 h-10 rounded-xl hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-colors">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <div class="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
            <div class="grid grid-cols-2 gap-6">
              <div class="col-span-2 space-y-2">
                <label class="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Sunucu Adı (Hostname)</label>
                <input v-model="formData.name" type="text" placeholder="Örn: TR-SRV-WEB01"
                  class="w-full h-11 px-4 text-[13px] border border-gray-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition-all font-bold">
              </div>

              <div class="space-y-2">
                <label class="text-[11px] font-bold text-gray-400 uppercase tracking-widest">IP Adresi</label>
                <input v-model="formData.ip_address" type="text" placeholder="10.0.x.x"
                  class="w-full h-11 px-4 text-[13px] border border-gray-200 rounded-xl outline-none focus:border-indigo-500 font-mono">
              </div>

              <div class="space-y-2">
                <label class="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Altyapı Tipi</label>
                <select v-model="formData.type" class="w-full h-11 px-4 text-[13px] border border-gray-200 rounded-xl outline-none bg-white font-bold">
                  <option v-for="opt in typeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
              </div>

              <div class="space-y-2">
                <label class="text-[11px] font-bold text-gray-400 uppercase tracking-widest">İşletim Sistemi</label>
                <input v-model="formData.os_version" type="text" placeholder="Windows / Linux Version"
                  class="w-full h-11 px-4 text-[13px] border border-gray-200 rounded-xl outline-none focus:border-indigo-500">
              </div>

              <div class="space-y-2">
                <label class="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Sunucu Durumu</label>
                <select v-model="formData.status" class="w-full h-11 px-4 text-[13px] border border-gray-200 rounded-xl outline-none bg-white font-bold text-emerald-600">
                  <option value="online">Aktif (Online)</option>
                  <option value="offline" class="text-red-500">Pasif (Offline)</option>
                </select>
              </div>

              <div class="col-span-2 space-y-2">
                <label class="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Açıklama / Notlar</label>
                <textarea v-model="formData.description" rows="2" class="w-full p-4 text-[13px] border border-gray-200 rounded-xl outline-none focus:border-indigo-500 resize-none"></textarea>
              </div>
            </div>

            <!-- Şirket Maliyet Paylaşımı -->
            <div class="mt-8 pt-8 border-t border-gray-100">
              <div class="flex items-center justify-between mb-4">
                <div>
                  <h4 class="text-[13px] font-bold text-gray-900">Şirket Bazlı Maliyet Paylaşımı</h4>
                  <p class="text-[11px] text-gray-400 mt-0.5">Sunucu maliyetinin şirketlere dağılım oranı (%)</p>
                </div>
                <button @click="addCompany" type="button" class="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[11px] font-bold hover:bg-blue-100 transition-colors">
                  + Şirket Ekle
                </button>
              </div>

              <div class="space-y-3">
                <div v-for="(comp, index) in formData.companies" :key="index" class="flex gap-3 items-center bg-gray-50/50 p-2 rounded-2xl border border-gray-100">
                  <select v-model="comp.id" class="flex-1 h-10 px-3 border border-gray-200 rounded-xl outline-none bg-white text-[13px] font-medium">
                    <option value="" disabled>Şirket Seçin</option>
                    <option v-for="c in masterData.companies" :key="c.id" :value="c.id">{{ c.name }}</option>
                  </select>
                  <div class="w-24 relative">
                    <input v-model.number="comp.share_ratio" type="number" class="w-full h-10 pl-3 pr-8 border border-gray-200 rounded-xl outline-none focus:border-indigo-500 text-[13px] font-bold text-center">
                    <span class="absolute right-3 top-2.5 text-[11px] text-gray-400 font-bold">%</span>
                  </div>
                  <button @click="removeCompany(index)" type="button" class="w-10 h-10 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl flex items-center justify-center transition-colors">
                    <i class="fas fa-trash-alt text-[13px]"></i>
                  </button>
                </div>
                <div v-if="!formData.companies.length" class="text-center py-6 border-2 border-dashed border-gray-100 rounded-2xl">
                  <span class="text-[12px] text-gray-400">Henüz bir şirket atanmadı.</span>
                </div>
              </div>
            </div>
          </div>

          <div class="px-8 py-5 border-t border-gray-50 bg-gray-50/30 flex justify-end gap-3">
            <button @click="showModal = false" class="px-5 py-2.5 text-[13px] font-bold text-gray-500 hover:text-gray-900">Vazgeç</button>
            <button @click="submitForm" class="px-8 py-2.5 bg-indigo-600 text-white text-[13px] font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all">
              {{ editingItem ? 'Değişiklikleri Kaydet' : 'Sunucuyu Kaydet' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- History Modal -->
    <Teleport to="body">
      <div v-if="showHistoryModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" @click.self="showHistoryModal = false">
        <div class="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
          <div class="px-8 py-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
            <div>
              <h2 class="text-[17px] font-bold text-gray-900">Sunucu Kayıt Geçmişi</h2>
              <p class="text-[11px] text-gray-400 mt-1 uppercase tracking-widest font-bold">Inventory Audit / Logs</p>
            </div>
            <button @click="showHistoryModal = false" class="w-10 h-10 rounded-xl hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-colors">
              <i class="fas fa-times"></i>
            </button>
          </div>
          
          <div class="p-8">
            <div class="space-y-8">
              <!-- Created At -->
              <div class="flex items-start gap-4">
                <div class="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center shrink-0 border border-indigo-100">
                  <i class="fas fa-file-signature text-indigo-500"></i>
                </div>
                <div>
                  <h4 class="text-[14px] font-bold text-gray-900">Envanter Kaydı Oluşturuldu</h4>
                  <p class="text-[12px] text-gray-500 mt-1.5 leading-relaxed">
                    Bu sunucu kaydı <span class="text-indigo-600 font-bold">{{ historyItem?.created_at ? new Date(historyItem.created_at).toLocaleString('tr-TR') : 'Bilinmiyor' }}</span> tarihinde sisteme tanımlanmıştır.
                  </p>
                  <div class="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-lg border border-gray-100">
                    <span class="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">System ID:</span>
                    <span class="text-[11px] font-mono font-bold text-gray-600">{{ historyItem?.id }}</span>
                  </div>
                </div>
              </div>

              <!-- Metadata -->
              <div class="flex items-start gap-4">
                <div class="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0 border border-emerald-100">
                  <i class="fas fa-server text-emerald-500"></i>
                </div>
                <div class="flex-1">
                  <h4 class="text-[14px] font-bold text-gray-900">Kayıt Detayları</h4>
                  <div class="mt-4 p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-3">
                    <div class="flex justify-between items-center text-[12px]">
                      <span class="font-bold text-gray-400">HOSTNAME</span>
                      <span class="font-bold text-gray-800 uppercase">{{ historyItem?.name }}</span>
                    </div>
                    <div class="flex justify-between items-center text-[12px]">
                      <span class="font-bold text-gray-400">IP ADDRESS</span>
                      <span class="font-mono font-bold text-blue-600">{{ historyItem?.ip_address }}</span>
                    </div>
                    <div class="flex justify-between items-center text-[12px]">
                      <span class="font-bold text-gray-400">LOCATION TYPE</span>
                      <span class="font-bold text-gray-800 uppercase">{{ historyItem?.type }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="mt-10 p-5 bg-amber-50 rounded-2xl border border-amber-100/50 flex gap-4">
              <i class="fas fa-info-circle text-amber-500 text-lg"></i>
              <p class="text-[11px] text-amber-800 leading-relaxed font-medium">
                Bu modül "Tek Kaynak Gerçekliği" kapsamında lisans ve sim takip modülleriyle entegredir. Buradaki değişiklikler ilgili tüm kaynakları etkiler.
              </p>
            </div>
          </div>

          <div class="px-8 py-5 border-t border-gray-50 bg-gray-50/30 flex justify-end">
            <button @click="showHistoryModal = false" class="px-8 py-2.5 bg-gray-900 text-white text-[13px] font-bold rounded-xl hover:bg-black transition-all">
              Kapat
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 5px; }
.custom-scrollbar::-webkit-scrollbar-track { background: #f9fafb; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #d1d5db; }
</style>
