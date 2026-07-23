<template>
  <div class="h-full w-full flex flex-col bg-gray-50 overflow-hidden">

    <!-- ── HEADER ─────────────────────────────────────────── -->
    <header class="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between gap-3 shrink-0">
      <div class="flex items-center gap-2.5 min-w-0">
        <div class="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-sm shrink-0">
          <i class="fas fa-clipboard-check"></i>
        </div>
        <div class="min-w-0">
          <h1 class="text-[13px] font-bold text-gray-900 leading-tight truncate">Zimmet Stok Sayımı</h1>
          <p class="text-[10px] text-gray-400 hidden sm:block">Periyodik saha denetimleri ve QR zimmet sayım doğrulaması</p>
        </div>
      </div>

      <div class="flex items-center gap-1.5 shrink-0">
        <!-- QR Tara Butonu – prominent on mobile -->
        <button
          @click="showScannerModal = true"
          class="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-sm transition-colors"
        >
          <i class="fas fa-camera"></i>
          <span class="hidden sm:inline">Kamera ile QR Tara</span>
          <span class="sm:hidden">QR Tara</span>
        </button>

        <!-- Ayarlar -->
        <button
          @click="openSettingsModal"
          class="flex items-center gap-1.5 px-2.5 py-2 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 font-bold text-xs rounded-xl transition-colors"
          title="Sayım Periyodunu Düzenle"
        >
          <i class="fas fa-cog"></i>
          <span class="hidden sm:inline">{{ auditPeriodDays }} Gün</span>
        </button>

        <!-- Yenile -->
        <button
          @click="fetchSummary"
          class="flex items-center gap-1 px-2.5 py-2 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 font-bold text-xs rounded-xl transition-colors"
          title="Yenile"
        >
          <i class="fas fa-sync-alt"></i>
        </button>
      </div>
    </header>

    <!-- ── KPI CARDS ──────────────────────────────────────── -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-2.5 px-4 py-3 bg-white border-b border-gray-100 shrink-0">
      <div class="bg-blue-50 rounded-xl p-3 flex items-center gap-2.5">
        <div class="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center text-sm shrink-0">
          <i class="fas fa-calendar-alt"></i>
        </div>
        <div class="min-w-0">
          <div class="text-[10px] font-bold text-blue-600 uppercase">Periyot</div>
          <div class="text-sm font-black text-gray-900 leading-tight">{{ auditPeriodDays }} Gün</div>
        </div>
      </div>

      <div class="bg-purple-50 rounded-xl p-3 flex items-center gap-2.5">
        <div class="w-9 h-9 rounded-lg bg-purple-600 text-white flex items-center justify-center text-sm shrink-0">
          <i class="fas fa-boxes"></i>
        </div>
        <div class="min-w-0">
          <div class="text-[10px] font-bold text-purple-600 uppercase">Zimmetli</div>
          <div class="text-sm font-black text-gray-900 leading-tight">{{ summaryData.totalAssigned || 0 }} Cihaz</div>
        </div>
      </div>

      <div class="bg-emerald-50 rounded-xl p-3 flex items-center gap-2.5">
        <div class="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-sm shrink-0">
          <i class="fas fa-check-circle"></i>
        </div>
        <div class="min-w-0">
          <div class="text-[10px] font-bold text-emerald-600 uppercase">Güncel</div>
          <div class="text-sm font-black text-gray-900 leading-tight">{{ summaryData.auditedCount || 0 }} Cihaz</div>
        </div>
      </div>

      <div class="bg-amber-50 rounded-xl p-3 flex items-center gap-2.5">
        <div class="w-9 h-9 rounded-lg bg-amber-500 text-white flex items-center justify-center text-sm shrink-0">
          <i class="fas fa-exclamation-triangle"></i>
        </div>
        <div class="min-w-0">
          <div class="text-[10px] font-bold text-amber-600 uppercase">Gecikmiş</div>
          <div class="text-sm font-black text-gray-900 leading-tight">{{ summaryData.overduePersonnelCount || 0 }} Kişi</div>
        </div>
      </div>
    </div>

    <!-- ── FILTER / SEARCH BAR ────────────────────────────── -->
    <div class="px-4 py-2.5 bg-white border-b border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
      <!-- Tab Buttons -->
      <div class="flex items-center gap-1 bg-gray-100 p-0.5 rounded-xl">
        <button
          @click="activeTab = 'ALL'"
          :class="['flex-1 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap', activeTab === 'ALL' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500']"
        >
          Tümü ({{ summaryData.allPersonnel?.length || 0 }})
        </button>
        <button
          @click="activeTab = 'OVERDUE'"
          :class="['flex-1 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap flex items-center justify-center gap-1', activeTab === 'OVERDUE' ? 'bg-amber-500 text-white shadow-sm' : 'text-amber-600']"
        >
          <i class="fas fa-clock text-[10px]"></i> Gecikmiş ({{ summaryData.overduePersonnelCount || 0 }})
        </button>
        <button
          @click="activeTab = 'UPTODATE'"
          :class="['flex-1 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap flex items-center justify-center gap-1', activeTab === 'UPTODATE' ? 'bg-emerald-500 text-white shadow-sm' : 'text-emerald-600']"
        >
          <i class="fas fa-check text-[10px]"></i> Güncel
        </button>
      </div>

      <!-- Search -->
      <div class="relative flex-1 sm:max-w-xs">
        <i class="fas fa-search absolute left-3 top-2.5 text-gray-400 text-xs pointer-events-none"></i>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Personel ara..."
          class="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-indigo-500 focus:outline-none"
        />
      </div>
    </div>

    <!-- ── CONTENT LIST ────────────────────────────────────── -->
    <main class="flex-1 overflow-y-auto p-3 sm:p-5">
      <!-- Loading -->
      <div v-if="loading" class="flex flex-col items-center justify-center h-48 text-gray-400 gap-3">
        <i class="fas fa-circle-notch fa-spin text-3xl text-indigo-500"></i>
        <span class="text-sm font-medium">Yükleniyor...</span>
      </div>

      <!-- Empty -->
      <div v-else-if="filteredPersonnel.length === 0" class="flex flex-col items-center justify-center h-48 text-gray-400 gap-3">
        <i class="fas fa-user-slash text-4xl"></i>
        <p class="text-sm font-medium">Kriterlere uygun personel bulunamadı.</p>
      </div>

      <!-- PERSONNEL CARDS (Mobile-first card layout) -->
      <div v-else class="space-y-2.5">
        <div
          v-for="p in filteredPersonnel"
          :key="p.id"
          class="bg-white rounded-2xl border shadow-sm overflow-hidden"
          :class="isOverdue(p.max_last_audit_date) ? 'border-amber-200' : 'border-gray-100'"
        >
          <!-- Card Header -->
          <div class="p-4 flex items-start gap-3">
            <!-- Avatar -->
            <div
              class="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0"
              :class="isOverdue(p.max_last_audit_date) ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'"
            >
              {{ (p.first_name || '?')[0] }}{{ (p.last_name || '')[0] }}
            </div>

            <!-- Info -->
            <div class="flex-1 min-w-0">
              <div class="font-bold text-gray-900 text-sm leading-tight">
                {{ p.first_name }} {{ p.last_name }}
              </div>
              <div class="text-[11px] text-gray-500 mt-0.5 leading-tight">
                {{ p.title || 'Görev Belirtilmemiş' }}
                <span v-if="p.company_name" class="text-indigo-500 font-medium"> · {{ p.company_name }}</span>
              </div>
              <div v-if="p.department_name" class="text-[10.5px] text-gray-400 mt-0.5">{{ p.department_name }}</div>
            </div>

            <!-- Status Badge -->
            <div class="shrink-0 text-right">
              <span
                :class="['px-2 py-1 rounded-lg text-[10px] font-bold inline-flex items-center gap-1', isOverdue(p.max_last_audit_date) ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800']"
              >
                <i :class="isOverdue(p.max_last_audit_date) ? 'fas fa-exclamation-circle' : 'fas fa-check-circle'"></i>
                {{ isOverdue(p.max_last_audit_date) ? 'Gecikti' : 'Güncel' }}
              </span>
            </div>
          </div>

          <!-- Stats Row -->
          <div class="px-4 pb-3 flex items-center gap-2 flex-wrap">
            <span class="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg font-bold text-[11px] flex items-center gap-1">
              <i class="fas fa-laptop text-[10px]"></i> {{ p.assigned_asset_count }} Cihaz
            </span>
            <span class="px-2.5 py-1 bg-gray-50 text-gray-600 rounded-lg font-semibold text-[11px] flex items-center gap-1">
              <i class="fas fa-history text-[10px]"></i>
              {{ p.max_last_audit_date ? formatDate(p.max_last_audit_date) : 'Hiç sayılmadı' }}
            </span>
          </div>

          <!-- Action Buttons -->
          <div class="px-3 pb-3 flex gap-2">
            <button
              @click="openPersonnelSession(p)"
              class="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xs rounded-xl transition-colors shadow-sm flex items-center justify-center gap-1.5"
            >
              <i class="fas fa-clipboard-check"></i> Stok Sayımı Başlat
            </button>
            <button
              @click="showQR(p)"
              class="w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 rounded-xl transition-colors"
              title="Mobil Bağlantıyı Kopyala"
            >
              <i class="fas fa-qrcode text-sm"></i>
            </button>
          </div>
        </div>
      </div>
    </main>

    <!-- ══════════════════════════════════════════════════════ -->
    <!-- SAHA STOK SAYIMI CHECKLIST MODAL                      -->
    <!-- ══════════════════════════════════════════════════════ -->
    <dialog ref="sessionModal" class="modal">
      <div class="modal-box w-full max-w-lg bg-white rounded-2xl p-0 overflow-hidden flex flex-col max-h-[90vh] mx-3 sm:mx-auto">

        <!-- Modal Header -->
        <div class="px-5 pt-5 pb-4 border-b border-gray-100 shrink-0">
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <i class="fas fa-clipboard-check text-sm"></i>
              </div>
              <div class="min-w-0">
                <h3 class="font-bold text-sm text-gray-900 leading-tight truncate">
                  {{ activeSessionPerson?.first_name }} {{ activeSessionPerson?.last_name }}
                </h3>
                <p class="text-[10.5px] text-gray-400 truncate">
                  {{ activeSessionPerson?.title }} · {{ activeSessionPerson?.department_name }}
                </p>
              </div>
            </div>
            <button
              @click="showScannerModal = true"
              class="px-3 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shrink-0"
            >
              <i class="fas fa-camera"></i>
              <span class="hidden sm:inline">Kamera ile Tara</span>
              <span class="sm:hidden">Tara</span>
            </button>
          </div>

          <!-- Progress Bar -->
          <div class="mt-3">
            <div class="flex items-center justify-between text-[10.5px] font-bold text-gray-500 mb-1.5">
              <span>{{ selectedAuditAssetIds.length }} / {{ sessionAssets.length }} cihaz sayıldı</span>
              <span
                class="font-bold"
                :class="selectedAuditAssetIds.length === sessionAssets.length ? 'text-emerald-600' : 'text-indigo-600'"
              >
                %{{ sessionAssets.length > 0 ? Math.round((selectedAuditAssetIds.length / sessionAssets.length) * 100) : 0 }}
              </span>
            </div>
            <div class="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-500"
                :class="selectedAuditAssetIds.length === sessionAssets.length ? 'bg-emerald-500' : 'bg-indigo-500'"
                :style="{ width: sessionAssets.length > 0 ? (selectedAuditAssetIds.length / sessionAssets.length * 100) + '%' : '0%' }"
              ></div>
            </div>
          </div>
        </div>

        <!-- Modal Body – Asset Checklist -->
        <div class="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          <div
            v-for="asset in sessionAssets"
            :key="asset.id"
            @click="toggleAuditAssetSelect(asset.id)"
            :class="[
              'p-3.5 rounded-xl border transition-all cursor-pointer active:scale-[0.98]',
              selectedAuditAssetIds.includes(asset.id)
                ? 'border-emerald-400 bg-emerald-50'
                : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
            ]"
          >
            <div class="flex items-start gap-3">
              <!-- Checkbox -->
              <div
                :class="[
                  'w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all',
                  selectedAuditAssetIds.includes(asset.id)
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : 'bg-white border-gray-300'
                ]"
              >
                <i v-if="selectedAuditAssetIds.includes(asset.id)" class="fas fa-check text-[10px]"></i>
              </div>

              <!-- Asset Info -->
              <div class="flex-1 min-w-0">
                <div class="font-bold text-gray-900 text-sm leading-tight">
                  {{ asset.brand_name }} {{ asset.model_name }}
                </div>
                <div class="text-[11px] text-gray-500 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                  <span><span class="text-gray-400">SN:</span> <span class="font-mono font-bold text-gray-700">{{ asset.serial_no }}</span></span>
                  <span v-if="asset.barcode"><span class="text-gray-400">Barkod:</span> <span class="font-mono font-bold text-gray-700">{{ asset.barcode }}</span></span>
                </div>
                <div v-if="asset.specs_json" class="text-[10.5px] text-indigo-600 mt-1 font-semibold">
                  <i class="fas fa-microchip mr-1"></i>{{ formatSpecsBrief(asset.specs_json) }}
                </div>
              </div>

              <!-- Status badge -->
              <div class="shrink-0 text-right">
                <span
                  :class="[
                    'px-2 py-1 rounded-lg text-[10px] font-bold',
                    selectedAuditAssetIds.includes(asset.id)
                      ? 'bg-emerald-200 text-emerald-900'
                      : 'bg-gray-200 text-gray-600'
                  ]"
                >
                  {{ selectedAuditAssetIds.includes(asset.id) ? '✓ Sayıldı' : 'Bekliyor' }}
                </span>
                <div class="text-[10px] text-gray-400 mt-1">
                  {{ asset.last_audit_date ? formatDate(asset.last_audit_date) : 'Sayılmadı' }}
                </div>
              </div>
            </div>
          </div>

          <!-- Notes -->
          <div class="pt-2">
            <label class="block text-xs font-bold text-gray-700 mb-1.5">
              <i class="fas fa-sticky-note mr-1 text-gray-400"></i>Saha Notu (Opsiyonel):
            </label>
            <textarea
              v-model="auditNotes"
              rows="2"
              placeholder="Örn: Cihazlar sağlam görüldü, seri numaraları doğrulandı."
              class="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:border-indigo-500 focus:outline-none resize-none"
            ></textarea>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center gap-2 shrink-0">
          <button @click="selectAllAuditAssets" class="text-xs text-indigo-600 font-bold px-2 py-2 hover:bg-indigo-50 rounded-lg transition-colors">
            Tümünü Seç
          </button>
          <div class="flex-1 flex gap-2 justify-end">
            <button @click="closeSessionModal" class="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-xs rounded-xl transition-colors">
              İptal
            </button>
            <button
              @click="submitSession"
              :disabled="selectedAuditAssetIds.length === 0 || isSubmitting"
              class="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-xl transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <i class="fas fa-check-double"></i>
              <span>Sayımı Kaydet ({{ selectedAuditAssetIds.length }})</span>
            </button>
          </div>
        </div>
      </div>
    </dialog>

    <!-- ══════════════════════════════════════════════════════ -->
    <!-- PERIOD SETTINGS MODAL                                  -->
    <!-- ══════════════════════════════════════════════════════ -->
    <dialog ref="settingsModal" class="modal">
      <div class="modal-box max-w-sm w-full bg-white p-6 rounded-2xl shadow-2xl mx-3 sm:mx-auto">
        <h3 class="font-bold text-[15px] text-gray-900 mb-1 flex items-center gap-2">
          <i class="fas fa-cog text-gray-500"></i> Sayım Periyodu
        </h3>
        <p class="text-xs text-gray-500 mb-4">Kaç günde bir stok sayımı yapılmasını istiyorsunuz?</p>
        <div>
          <label class="block text-xs font-bold text-gray-700 mb-1.5">Gün Sayısı:</label>
          <input
            v-model.number="tempPeriodDays"
            type="number"
            min="7"
            max="365"
            class="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-lg font-black text-center focus:bg-white focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <div class="flex gap-2 mt-5">
          <button @click="closeSettingsModal" class="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm rounded-xl transition-colors">
            İptal
          </button>
          <button @click="savePeriodSettings" class="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-colors shadow-sm">
            Kaydet
          </button>
        </div>
      </div>
    </dialog>

    <!-- ══════════════════════════════════════════════════════ -->
    <!-- TELEFON KAMERA QR TARAYICI                             -->
    <!-- ══════════════════════════════════════════════════════ -->
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
const loading = ref(false)

const auditPeriodDays = ref(90)
const tempPeriodDays = ref(90)
const summaryData = ref({
  totalAssigned: 0,
  auditedCount: 0,
  overdueCount: 0,
  overduePersonnelCount: 0,
  allPersonnel: []
})

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
  if (diffDays > auditPeriodDays.value) return `Gecikti (${diffDays}g)`
  return `Güncel (${diffDays}g)`
}

const fetchSummary = async () => {
  loading.value = true
  try {
    const res = await api.get('/assets/audit/summary')
    summaryData.value = res.data || {}
    auditPeriodDays.value = res.data.audit_period_days || 90
  } catch (err) {
    console.error('Audit summary load error:', err)
  } finally {
    loading.value = false
  }
}

const filteredPersonnel = computed(() => {
  const list = summaryData.value.allPersonnel || []
  return list.filter(p => {
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      const name = `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase()
      const title = (p.title || '').toLowerCase()
      const dept = (p.department_name || '').toLowerCase()
      const comp = (p.company_name || '').toLowerCase()
      if (!name.includes(q) && !title.includes(q) && !dept.includes(q) && !comp.includes(q)) return false
    }
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

const handleScanResult = (scannedCode) => {
  if (!scannedCode) return
  const q = scannedCode.trim().toLowerCase()

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
      showToast(`✓ ${matchedAsset.brand_name} ${matchedAsset.model_name} sayıldı!`, 'success')
    } else {
      showToast(`⚠️ Taranan kod (${scannedCode}) bu personelin zimmetinde bulunamadı!`, 'warning')
    }
  } else {
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
  showToast(`Mobil sayım bağlantısı panoya kopyalandı!`, 'info')
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
