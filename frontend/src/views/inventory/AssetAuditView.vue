<template>
  <div class="h-full w-full flex flex-col bg-white overflow-hidden">
    <!-- HEADER -->
    <header class="h-14 border-b border-gray-100 flex items-center px-6 justify-between bg-white shrink-0">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
          <i class="fas fa-clipboard-check"></i>
        </div>
        <div>
          <h1 class="text-[14px] font-bold text-gray-900 leading-tight">Saha Zimmet Stok Sayımı & Denetim Takibi</h1>
          <p class="text-[10.5px] text-gray-400 font-medium">Periyodik saha denetimleri, mobil telefon kamera QR taramaları ve zimmet sayım doğrulaması</p>
        </div>
      </div>

      <div class="flex items-center gap-2 shrink-0">
        <!-- Telefon Kamera QR Tarama Butonu -->
        <button 
          @click="showScannerModal = true" 
          class="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11.5px] rounded-lg transition-colors shadow-sm flex items-center gap-1.5 animate-pulse"
          title="Telefon veya bilgisayar kamerası ile QR / Barkod okutun"
        >
          <i class="fas fa-camera text-xs"></i> Telefon Kamerasıyla QR Tara
        </button>

        <button 
          @click="openSettingsModal" 
          class="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-[11.5px] rounded-lg transition-colors flex items-center gap-1.5"
          title="Periyodik Sayım Kuralını Düzenle"
        >
          <i class="fas fa-cog text-gray-500"></i> Kural: {{ auditPeriodDays }} Gün
        </button>
        <button 
          @click="fetchSummary" 
          class="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11.5px] rounded-lg transition-colors flex items-center gap-1.5"
        >
          <i class="fas fa-sync-alt"></i> Yenile
        </button>
      </div>
    </header>

    <!-- KPI STATS SUMMARY BANNER -->
    <div class="bg-gray-50/80 border-b border-gray-200 px-6 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
      <div class="bg-white p-3.5 rounded-xl border border-gray-200/80 shadow-sm flex items-center justify-between">
        <div>
          <div class="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Periyot Kuralı</div>
          <div class="text-lg font-black text-gray-900 mt-0.5">{{ auditPeriodDays }} Günde Bir</div>
        </div>
        <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
          <i class="fas fa-calendar-alt"></i>
        </div>
      </div>

      <div class="bg-white p-3.5 rounded-xl border border-gray-200/80 shadow-sm flex items-center justify-between">
        <div>
          <div class="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Zimmetli Cihazlar</div>
          <div class="text-lg font-black text-gray-900 mt-0.5">{{ summaryData.totalAssigned || 0 }} Adet</div>
        </div>
        <div class="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
          <i class="fas fa-boxes"></i>
        </div>
      </div>

      <div class="bg-white p-3.5 rounded-xl border border-emerald-100 shadow-sm flex items-center justify-between">
        <div>
          <div class="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Sayımı Güncel</div>
          <div class="text-lg font-black text-emerald-700 mt-0.5">{{ summaryData.auditedCount || 0 }} Cihaz</div>
        </div>
        <div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
          <i class="fas fa-check-circle"></i>
        </div>
      </div>

      <div class="bg-white p-3.5 rounded-xl border border-amber-200 shadow-sm flex items-center justify-between relative overflow-hidden">
        <div class="absolute -right-2 -bottom-2 w-16 h-16 bg-amber-50 rounded-full opacity-40"></div>
        <div>
          <div class="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Denetim Gecikti</div>
          <div class="text-lg font-black text-amber-700 mt-0.5">{{ summaryData.overduePersonnelCount || 0 }} Personel</div>
        </div>
        <div class="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold relative z-10">
          <i class="fas fa-exclamation-triangle"></i>
        </div>
      </div>
    </div>

    <!-- FILTER BAR -->
    <div class="px-6 py-3 bg-white border-b border-gray-100 flex items-center justify-between gap-4 shrink-0 flex-wrap">
      <div class="flex items-center gap-1.5">
        <button 
          @click="activeTab = 'ALL'" 
          :class="['px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all', activeTab === 'ALL' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200']"
        >
          Tüm Personeller ({{ summaryData.allPersonnel?.length || 0 }})
        </button>
        <button 
          @click="activeTab = 'OVERDUE'" 
          :class="['px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all flex items-center gap-1.5', activeTab === 'OVERDUE' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100']"
        >
          <i class="fas fa-clock text-[11px]"></i> Sayımı Gecikenler ({{ summaryData.overduePersonnelCount || 0 }})
        </button>
        <button 
          @click="activeTab = 'UPTODATE'" 
          :class="['px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all flex items-center gap-1.5', activeTab === 'UPTODATE' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100']"
        >
          <i class="fas fa-check text-[11px]"></i> Güncel Olanlar
        </button>
      </div>

      <div class="relative w-64">
        <i class="fas fa-search absolute left-3 top-2.5 text-gray-400 text-xs"></i>
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="Personel veya departman ara..." 
          class="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:bg-white focus:border-indigo-500 focus:outline-none"
        />
      </div>
    </div>

    <!-- CONTENT: PERSONNEL LIST TABLE -->
    <main class="flex-1 overflow-y-auto p-6 bg-gray-50/50">
      <div class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-gray-200 bg-gray-50/80 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              <th class="px-5 py-3">Personel Bilgisi</th>
              <th class="px-5 py-3">Şirket / Departman</th>
              <th class="px-5 py-3">Zimmetli Cihaz</th>
              <th class="px-5 py-3">Son Sayım Tarihi</th>
              <th class="px-5 py-3">Sayım Durumu</th>
              <th class="px-5 py-3 text-right">İşlemler</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 text-[12.5px]">
            <tr v-if="filteredPersonnel.length === 0" class="text-center">
              <td colspan="6" class="py-12 text-gray-400 text-sm">
                Kriterlere uygun kayıt bulunamadı.
              </td>
            </tr>
            <tr v-for="p in filteredPersonnel" :key="p.id" class="hover:bg-gray-50/60 transition-colors">
              <td class="px-5 py-3.5">
                <div class="font-bold text-gray-900">{{ p.first_name }} {{ p.last_name }}</div>
                <div class="text-[10.5px] text-gray-400">{{ p.title || 'Görevi Belirtilmemiş' }}</div>
              </td>
              <td class="px-5 py-3.5">
                <div class="font-semibold text-gray-800">{{ p.company_name || '—' }}</div>
                <div class="text-[10.5px] text-gray-400">{{ p.department_name || '—' }}</div>
              </td>
              <td class="px-5 py-3.5">
                <span class="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg font-bold text-xs">
                  <i class="fas fa-laptop mr-1 text-[10px]"></i> {{ p.assigned_asset_count }} Cihaz
                </span>
              </td>
              <td class="px-5 py-3.5 text-gray-600 font-medium">
                {{ p.max_last_audit_date ? formatDate(p.max_last_audit_date) : 'Hiç Sayım Yapılmadı' }}
              </td>
              <td class="px-5 py-3.5">
                <span :class="['px-2.5 py-1 rounded-full text-[10.5px] font-bold inline-flex items-center gap-1', isOverdue(p.max_last_audit_date) ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800']">
                  <i :class="[isOverdue(p.max_last_audit_date) ? 'fas fa-exclamation-circle' : 'fas fa-check-circle']"></i>
                  {{ getAuditStatusText(p.max_last_audit_date) }}
                </span>
              </td>
              <td class="px-5 py-3.5 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button 
                    @click="openPersonnelSession(p)" 
                    class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] rounded-lg transition-colors shadow-sm flex items-center gap-1.5"
                  >
                    <i class="fas fa-clipboard-check"></i> Stok Sayımı Başlat
                  </button>
                  <button 
                    @click="showQR(p)" 
                    class="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-[11px] rounded-lg transition-colors"
                    title="Mobil Telefon QR Bağlantısı Panoya Kopyala"
                  >
                    <i class="fas fa-qrcode"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>

    <!-- SAHA STOK SAYIMI CHECKLIST MODAL -->
    <dialog ref="sessionModal" class="modal">
      <div class="modal-box w-11/12 max-w-2xl bg-white p-6 rounded-2xl relative shadow-2xl flex flex-col max-h-[85vh]">
        <div class="flex items-center justify-between border-b pb-3 mb-3">
          <div>
            <h3 class="font-bold text-[16px] text-gray-900 flex items-center gap-2">
              <i class="fas fa-clipboard-check text-indigo-600"></i> Saha Zimmet Stok Sayımı
            </h3>
            <p class="text-xs text-gray-400 mt-0.5">
              Personel: <strong class="text-gray-800">{{ activeSessionPerson?.first_name }} {{ activeSessionPerson?.last_name }}</strong> · 
              {{ activeSessionPerson?.title }} ({{ activeSessionPerson?.department_name }})
            </p>
          </div>
          <button 
            @click="showScannerModal = true"
            class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5"
          >
            <i class="fas fa-camera"></i> Kamera ile Tara
          </button>
        </div>

        <div class="flex-1 overflow-y-auto space-y-3 pr-1">
          <div class="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2 flex justify-between items-center">
            <span>Fiziksel Olarak Kontrol Edilen Cihazları İşaretleyin ({{ selectedAuditAssetIds.length }} / {{ sessionAssets.length }} Seçildi)</span>
          </div>

          <div 
            v-for="asset in sessionAssets" 
            :key="asset.id"
            @click="toggleAuditAssetSelect(asset.id)"
            :class="['p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-4', selectedAuditAssetIds.includes(asset.id) ? 'border-emerald-500 bg-emerald-50/40 shadow-sm' : 'border-gray-200 bg-gray-50/50 hover:bg-gray-100/60']"
          >
            <div class="flex items-center gap-3">
              <input 
                type="checkbox" 
                :checked="selectedAuditAssetIds.includes(asset.id)" 
                class="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                @click.stop
                @change="toggleAuditAssetSelect(asset.id)"
              />
              <div>
                <div class="font-bold text-gray-900 text-xs">{{ asset.brand_name }} {{ asset.model_name }}</div>
                <div class="text-[11px] text-gray-500 flex items-center gap-2 mt-0.5">
                  <span>Seri No: <strong class="font-mono text-gray-700">{{ asset.serial_no }}</strong></span>
                  <span v-if="asset.barcode">Barkod: <strong class="font-mono text-gray-700">{{ asset.barcode }}</strong></span>
                </div>
                <!-- Dynamic Technical Specs if any -->
                <div v-if="asset.specs_json" class="text-[10.5px] text-indigo-600 mt-1 font-semibold">
                  <i class="fas fa-info-circle mr-1"></i> {{ formatSpecsBrief(asset.specs_json) }}
                </div>
              </div>
            </div>

            <div class="text-right shrink-0">
              <span :class="['px-2.5 py-1 rounded-full text-[10.5px] font-bold uppercase', selectedAuditAssetIds.includes(asset.id) ? 'bg-emerald-200 text-emerald-900' : 'bg-gray-200 text-gray-600']">
                {{ selectedAuditAssetIds.includes(asset.id) ? '✓ OK Sayıldı' : 'Bekliyor' }}
              </span>
              <div class="text-[10px] text-gray-400 mt-1">
                Son Sayım: {{ asset.last_audit_date ? formatDate(asset.last_audit_date) : 'Yok' }}
              </div>
            </div>
          </div>

          <div class="mt-4">
            <label class="block text-xs font-bold text-gray-700 mb-1">Denetim & Saha Notları (Opsiyonel):</label>
            <textarea 
              v-model="auditNotes" 
              rows="2" 
              placeholder="Örn: Cihazlar fiziksel olarak sağlam görüldü, seri numaraları doğrulandı." 
              class="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:border-indigo-500 focus:outline-none"
            ></textarea>
          </div>
        </div>

        <div class="modal-action shrink-0 mt-4 flex items-center justify-between">
          <button @click="selectAllAuditAssets" class="btn-ghost text-xs text-indigo-600 font-bold">
            Tümünü Seç
          </button>
          <div class="flex gap-2">
            <button @click="closeSessionModal" class="btn-secondary text-xs">İptal</button>
            <button 
              @click="submitSession" 
              :disabled="selectedAuditAssetIds.length === 0 || isSubmitting" 
              class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors shadow-sm disabled:opacity-50"
            >
              <i class="fas fa-check-double mr-1"></i> Sayımı Kaydet & Tescille ({{ selectedAuditAssetIds.length }})
            </button>
          </div>
        </div>
      </div>
    </dialog>

    <!-- PERIOD SETTINGS MODAL -->
    <dialog ref="settingsModal" class="modal">
      <div class="modal-box max-w-sm bg-white p-6 rounded-2xl relative shadow-2xl">
        <h3 class="font-bold text-[15px] text-gray-900 mb-3 flex items-center gap-2">
          <i class="fas fa-cog text-gray-600"></i> Sayım Periyodu Kuralı
        </h3>
        <p class="text-xs text-gray-500 mb-4">
          Sistem, kaç günde bir zimmetli personellerin stok sayımını yapmanızı istesin?
        </p>
        <div class="space-y-3">
          <div>
            <label class="block text-xs font-bold text-gray-700 mb-1">Sayım Periyodu (Gün):</label>
            <input 
              v-model.number="tempPeriodDays" 
              type="number" 
              min="7" 
              max="365" 
              class="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:bg-white focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>
        <div class="modal-action mt-6">
          <button @click="closeSettingsModal" class="btn-secondary text-xs">İptal</button>
          <button @click="savePeriodSettings" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm">
            Kaydet
          </button>
        </div>
      </div>
    </dialog>

    <!-- TELEFON KAMERA QR / BARKOD TARAYICI MODAL -->
    <AssetScannerModal 
      :show="showScannerModal"
      @close="showScannerModal = false"
      @scan-result="handleScanResult"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../../api'
import { useToast } from '../../composables/useToast'
import AssetScannerModal from '../../components/AssetScannerModal.vue'

const { showToast } = useToast()

const activeTab = ref('ALL')
const searchQuery = ref('')
const showScannerModal = ref(false)

const auditPeriodDays = ref(90)
const tempPeriodDays = ref(90)
const summaryData = ref({
  totalAssigned: 0,
  auditedCount: 0,
  overdueCount: 0,
  overduePersonnelCount: 0,
  allPersonnel: []
})

// Modals
const sessionModal = ref(null)
const settingsModal = ref(null)

const activeSessionPerson = ref(null)
const sessionAssets = ref([])
const selectedAuditAssetIds = ref([])
const auditNotes = ref('')
const isSubmitting = ref(false)

const formatDate = (dateStr) => {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const isOverdue = (lastAuditDate) => {
  if (!lastAuditDate) return true
  const diffDays = (new Date() - new Date(lastAuditDate)) / (1000 * 60 * 60 * 24)
  return diffDays > auditPeriodDays.value
}

const getAuditStatusText = (lastAuditDate) => {
  if (!lastAuditDate) return 'Sayım Yapılmadı'
  const diffDays = Math.floor((new Date() - new Date(lastAuditDate)) / (1000 * 60 * 60 * 24))
  if (diffDays > auditPeriodDays.value) {
    return `Sayım Gecikti (${diffDays} Gün Önce)`
  }
  return `Güncel (${diffDays} Gün Önce)`
}

const fetchSummary = async () => {
  try {
    const res = await api.get('/assets/audit/summary')
    summaryData.value = res.data || {}
    auditPeriodDays.value = res.data.audit_period_days || 90
  } catch (err) {
    console.error('Audit summary load error:', err)
  }
}

const filteredPersonnel = computed(() => {
  const list = summaryData.value.allPersonnel || []
  return list.filter(p => {
    // 1. Search Query
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      const name = `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase()
      const title = (p.title || '').toLowerCase()
      const dept = (p.department_name || '').toLowerCase()
      const comp = (p.company_name || '').toLowerCase()
      if (!name.includes(q) && !title.includes(q) && !dept.includes(q) && !comp.includes(q)) return false
    }

    // 2. Filter Tab
    if (activeTab.value === 'OVERDUE' && !isOverdue(p.max_last_audit_date)) return false
    if (activeTab.value === 'UPTODATE' && isOverdue(p.max_last_audit_date)) return false

    return true
  })
})

const openPersonnelSession = async (person) => {
  activeSessionPerson.value = person
  auditNotes.value = ''
  try {
    const res = await api.get(`/assets/audit/personnel-session/${person.id}`)
    sessionAssets.value = res.data.assets || []
    selectedAuditAssetIds.value = sessionAssets.value.map(a => a.id)
    sessionModal.value?.showModal()
  } catch (err) {
    showToast('Personel cihazları yüklenirken hata oluştu.', 'error')
  }
}

// Camera scan result handler (Mobile Phone QR integration)
const handleScanResult = (scannedCode) => {
  if (!scannedCode) return
  const q = scannedCode.trim().toLowerCase()

  // If a checklist session modal is currently active
  if (activeSessionPerson.value && sessionAssets.value.length > 0) {
    const matchedAsset = sessionAssets.value.find(a => 
      (a.serial_no || '').toLowerCase() === q || 
      (a.barcode || '').toLowerCase() === q || 
      String(a.id) === q
    )

    if (matchedAsset) {
      if (!selectedAuditAssetIds.value.includes(matchedAsset.id)) {
        selectedAuditAssetIds.value.push(matchedAsset.id)
      }
      showToast(`✓ Taranan Cihaz Tescillendi: ${matchedAsset.brand_name} ${matchedAsset.model_name} (${matchedAsset.serial_no})`, 'success')
    } else {
      showToast(`⚠️ Taranan kod (${scannedCode}) bu personelin zimmetinde bulunamadı!`, 'warning')
    }
  } else {
    // Search personnel who owns this scanned asset
    searchQuery.value = scannedCode
    showToast(`Kamera ile taranan kod arandı: ${scannedCode}`, 'info')
  }
}

const toggleAuditAssetSelect = (id) => {
  if (selectedAuditAssetIds.value.includes(id)) {
    selectedAuditAssetIds.value = selectedAuditAssetIds.value.filter(i => i !== id)
  } else {
    selectedAuditAssetIds.value.push(id)
  }
}

const selectAllAuditAssets = () => {
  selectedAuditAssetIds.value = sessionAssets.value.map(a => a.id)
}

const closeSessionModal = () => {
  sessionModal.value?.close()
  activeSessionPerson.value = null
}

const submitSession = async () => {
  if (!activeSessionPerson.value || selectedAuditAssetIds.value.length === 0) return
  isSubmitting.value = true
  try {
    await api.post('/assets/audit/personnel-submit', {
      personnel_id: activeSessionPerson.value.id,
      audited_asset_ids: selectedAuditAssetIds.value,
      notes: auditNotes.value
    })
    showToast('Saha stok sayımı başarıyla tescillendi!', 'success')
    closeSessionModal()
    await fetchSummary()
  } catch (err) {
    showToast('Sayım kaydedilirken hata oluştu.', 'error')
  } finally {
    isSubmitting.value = false
  }
}

const openSettingsModal = () => {
  tempPeriodDays.value = auditPeriodDays.value
  settingsModal.value?.showModal()
}

const closeSettingsModal = () => {
  settingsModal.value?.close()
}

const savePeriodSettings = async () => {
  try {
    await api.put('/assets/audit/period-settings', {
      audit_period_days: tempPeriodDays.value
    })
    auditPeriodDays.value = tempPeriodDays.value
    showToast(`Sayım periyodu ${tempPeriodDays.value} gün olarak güncellendi.`, 'success')
    closeSettingsModal()
    await fetchSummary()
  } catch (err) {
    showToast('Kural güncellenirken hata oluştu.', 'error')
  }
}

const showQR = (p) => {
  const url = `${window.location.origin}/mobile-audit?personnel_id=${p.id}`
  navigator.clipboard.writeText(url)
  showToast(`Mobil sayım bağlantısı panoya kopyalandı: ${url}`, 'info')
}

const formatSpecsBrief = (jsonStr) => {
  if (!jsonStr) return ''
  try {
    const obj = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr
    return Object.entries(obj).map(([k, v]) => `${k}: ${v}`).join(' · ')
  } catch (e) {
    return ''
  }
}

onMounted(() => {
  fetchSummary()
})
</script>
