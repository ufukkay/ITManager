<template>
  <div class="h-full flex flex-col bg-white overflow-hidden">
    <!-- HEADER -->
    <header class="h-14 border-b border-gray-100 flex items-center px-6 gap-4 bg-white shrink-0">
      <div class="flex items-center gap-2 shrink-0">
        <i class="fas fa-boxes text-gray-400"></i>
        <h1 class="text-[15px] font-bold text-gray-900">Envanter Takibi</h1>
      </div>

      <!-- SEARCH & FILTERS -->
      <div class="flex items-center gap-2 ml-4 flex-1">
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="Seri No, Barkod veya Notlarda ara..." 
          class="search-input w-64"
        />
        <select v-model="filters.category_id" class="filter-select">
          <option value="">Tüm Kategoriler</option>
          <option v-for="c in assetStore.metadata.categories" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
        <select v-model="filters.brand_id" class="filter-select">
          <option value="">Tüm Markalar</option>
          <option v-for="b in assetStore.metadata.brands" :key="b.id" :value="b.id">{{ b.name }}</option>
        </select>
        <select v-model="filters.status_id" class="filter-select">
          <option value="">Tüm Durumlar</option>
          <option v-for="s in assetStore.metadata.statuses" :key="s.id" :value="s.id">{{ s.name }}</option>
        </select>

        <!-- Dynamic Status Filters (All, Assigned, Unassigned) -->
        <div class="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5 ml-2">
          <button 
            @click="assignmentFilter = 'ALL'" 
            :class="['px-2.5 py-1 rounded text-[11px] font-bold transition-all', assignmentFilter === 'ALL' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700']"
          >
            Hepsi
          </button>
          <button 
            @click="assignmentFilter = 'ASSIGNED'" 
            :class="['px-2.5 py-1 rounded text-[11px] font-bold transition-all', assignmentFilter === 'ASSIGNED' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700']"
          >
            Zimmetli (Atanmış)
          </button>
          <button 
            @click="assignmentFilter = 'UNASSIGNED'" 
            :class="['px-2.5 py-1 rounded text-[11px] font-bold transition-all', assignmentFilter === 'UNASSIGNED' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700']"
          >
            Depoda (Atanabilir)
          </button>
        </div>
      </div>

      <!-- ACTIONS -->
      <div class="ml-auto flex items-center gap-2">
        <button @click="openConfigModal" class="btn-secondary">
          <i class="fas fa-cog mr-1.5"></i>Tanımlamalar
        </button>
        <button @click="openAddModal" class="btn-primary" v-if="authStore.hasPermission('asset:edit')">
          <i class="fas fa-plus mr-1.5"></i>Yeni Varlık Ekle
        </button>
      </div>
    </header>

    <!-- KPI / FINANCIAL SUMMARY BAR -->
    <div class="grid grid-cols-4 gap-px bg-gray-100 border-b border-gray-100 shrink-0">
      <div class="bg-white px-6 py-3 flex items-center gap-3">
        <div class="w-9 h-9 rounded-lg flex items-center justify-center bg-blue-50 text-blue-600 text-sm">
          <i class="fas fa-laptop"></i>
        </div>
        <div>
          <div class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Toplam Varlık</div>
          <div class="text-[16px] font-black text-gray-900">{{ filteredAssets.length }} / {{ assetStore.assets.length }}</div>
        </div>
      </div>
      <div class="bg-white px-6 py-3 flex items-center gap-3">
        <div class="w-9 h-9 rounded-lg flex items-center justify-center bg-emerald-50 text-emerald-600 text-sm">
          <i class="fas fa-wallet"></i>
        </div>
        <div>
          <div class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Envanter Değeri</div>
          <div class="text-[16px] font-black text-gray-900">{{ fmt(assetStore.financialSummary.totalValuation) }}</div>
        </div>
      </div>
      <div class="bg-white px-6 py-3 flex items-center gap-3">
        <div class="w-9 h-9 rounded-lg flex items-center justify-center bg-purple-50 text-purple-600 text-sm">
          <i class="fas fa-chart-line"></i>
        </div>
        <div>
          <div class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Aylık Amortisman/Maliyet</div>
          <div class="text-[16px] font-black text-gray-900">{{ fmt(assetStore.financialSummary.monthlyAmortization) }}</div>
        </div>
      </div>
      <div class="bg-white px-6 py-3 flex items-center gap-3">
        <div class="w-9 h-9 rounded-lg flex items-center justify-center bg-amber-50 text-amber-600 text-sm">
          <i class="fas fa-user-check"></i>
        </div>
        <div>
          <div class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Zimmetli / Boşta</div>
          <div class="text-[16px] font-black text-gray-900">
            {{ inUseCount }} / {{ warehouseCount }}
          </div>
        </div>
      </div>
    </div>

    <!-- MAIN TABLE AREA -->
    <main class="flex-1 overflow-y-auto bg-gray-50/40 p-6">
      <div v-if="assetStore.loading" class="flex items-center justify-center h-64 text-gray-300">
        <i class="fas fa-circle-notch fa-spin text-3xl"></i>
      </div>

      <div v-else class="bg-white border border-gray-100 rounded-lg shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-gray-100 bg-gray-50/50 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                <th class="px-5 py-3">Varlık Bilgileri</th>
                <th class="px-5 py-3">Kategori & Marka / Model</th>
                <th class="px-5 py-3">Durum</th>
                <th class="px-5 py-3">Şirket & Konum / Kullanıcı</th>
                <th class="px-5 py-3">Belgeler</th>
                <th class="px-5 py-3 text-right">Aylık Amortisman</th>
                <th class="px-5 py-3 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
              <tr v-if="filteredAssets.length === 0" class="text-center">
                <td colspan="7" class="py-12 text-gray-400 text-sm">Hiçbir varlık bulunamadı.</td>
              </tr>
              <tr v-for="asset in filteredAssets" :key="asset.id" class="hover:bg-gray-50/50 transition-colors text-[12.5px]">
                <td class="px-5 py-3">
                  <div class="font-bold text-gray-900">{{ asset.serial_no }}</div>
                  <div class="text-[10.5px] text-gray-400 flex items-center gap-1.5 mt-0.5" v-if="asset.barcode">
                    <i class="fas fa-barcode"></i> {{ asset.barcode }}
                  </div>
                </td>
                <td class="px-5 py-3">
                  <div class="font-semibold text-gray-700">{{ asset.brand_name }} {{ asset.model_name }}</div>
                  <div class="text-[10.5px] text-gray-400">{{ asset.category_name }}</div>
                </td>
                <td class="px-5 py-3">
                  <span :class="['px-2 py-0.5 rounded-full text-[10px] font-bold uppercase', getStatusClass(asset.status_name)]">
                    {{ asset.status_name }}
                  </span>
                </td>
                <td class="px-5 py-3">
                  <div class="font-medium text-gray-800">{{ asset.company_name }}</div>
                  <div class="text-[11.5px] text-gray-500 mt-0.5">
                    <span v-if="asset.personnel_id" class="text-blue-600 font-semibold">
                      <i class="fas fa-user mr-1 text-[10px]"></i> {{ asset.personnel_name }}
                    </span>
                    <span v-else-if="asset.location_id" class="text-purple-600 font-semibold">
                      <i class="fas fa-map-marker-alt mr-1 text-[10px]"></i> {{ asset.location_name }}
                    </span>
                    <span v-else class="text-gray-400 italic">Depoda / Atanmamış</span>
                  </div>
                </td>
                <td class="px-5 py-3">
                  <div class="flex items-center gap-2">
                    <a v-if="asset.invoice_path" :href="asset.invoice_path" target="_blank" class="text-blue-600 hover:text-blue-800 text-[11px] font-bold flex items-center gap-1" title="Faturayı Görüntüle">
                      <i class="fas fa-file-invoice"></i> Fatura
                    </a>
                    <a v-if="asset.warranty_path" :href="asset.warranty_path" target="_blank" class="text-purple-600 hover:text-purple-800 text-[11px] font-bold flex items-center gap-1" title="Garanti Belgesini Görüntüle">
                      <i class="fas fa-shield-alt"></i> Garanti
                    </a>
                    <span v-if="!asset.invoice_path && !asset.warranty_path" class="text-gray-300 text-[11px] italic">Dosya yok</span>
                  </div>
                </td>
                <td class="px-5 py-3 text-right">
                  <div class="font-semibold text-gray-900">{{ fmt(calculateMonthlyCost(asset)) }}</div>
                  <div class="text-[10px] text-gray-400">
                    Ömür: {{ asset.lifetime_months }} Ay · Bedel: {{ fmt(asset.purchase_price) }}
                  </div>
                </td>
                <td class="px-5 py-3 text-right">
                  <div class="flex items-center justify-end gap-1.5">
                    <button @click="showLogs(asset)" class="btn-actions" title="İşlem Geçmişi">
                      <i class="fas fa-history text-gray-500"></i>
                    </button>
                    <!-- Checkout (Zimmetle) -->
                    <button 
                      v-if="!asset.personnel_id && !asset.location_id && authStore.hasPermission('asset:edit')" 
                      @click="openCheckoutModal(asset)" 
                      class="btn-actions" 
                      title="Zimmet Atama"
                    >
                      <i class="fas fa-user-plus text-emerald-600"></i>
                    </button>
                    <!-- Checkin (Zimmet İade) -->
                    <button 
                      v-if="(asset.personnel_id || asset.location_id) && authStore.hasPermission('asset:edit')" 
                      @click="handleCheckin(asset)" 
                      class="btn-actions" 
                      title="Depoya İade Et"
                    >
                      <i class="fas fa-undo text-amber-600"></i>
                    </button>
                    <!-- Edit -->
                    <button 
                      v-if="authStore.hasPermission('asset:edit')" 
                      @click="openEditModal(asset)" 
                      class="btn-actions" 
                      title="Düzenle"
                    >
                      <i class="fas fa-edit text-blue-600"></i>
                    </button>
                    <!-- Delete -->
                    <button 
                      v-if="authStore.hasPermission('asset:edit')" 
                      @click="handleDelete(asset)" 
                      class="btn-actions" 
                      title="Sil"
                    >
                      <i class="fas fa-trash text-red-500"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>

    <!-- CONFIGURATION DIALOG / MODAL -->
    <dialog ref="configDialog" class="modal">
      <div class="modal-box w-11/12 max-w-2xl bg-white p-6 rounded-2xl relative shadow-2xl">
        <h3 class="font-bold text-[16px] text-gray-900 mb-4 flex items-center gap-2">
          <i class="fas fa-cog text-brand"></i> Envanter Tanımlamaları
        </h3>
        
        <div class="grid grid-cols-2 gap-6">
          <!-- Add Category -->
          <div class="border border-gray-100 rounded-xl p-4 bg-gray-50/50">
            <h4 class="font-bold text-[13px] text-gray-700 mb-3">Kategori Ekle</h4>
            <div class="flex gap-2">
              <input v-model="newCategory" type="text" placeholder="Kategori adı..." class="form-input flex-1" />
              <button @click="submitCategory" class="btn-primary-sm">Ekle</button>
            </div>
          </div>

          <!-- Add Brand -->
          <div class="border border-gray-100 rounded-xl p-4 bg-gray-50/50">
            <h4 class="font-bold text-[13px] text-gray-700 mb-3">Marka Ekle</h4>
            <div class="flex gap-2">
              <input v-model="newBrand" type="text" placeholder="Marka adı..." class="form-input flex-1" />
              <button @click="submitBrand" class="btn-primary-sm">Ekle</button>
            </div>
          </div>
        </div>

        <!-- Add Model -->
        <div class="border border-gray-100 rounded-xl p-4 bg-gray-50/50 mt-6">
          <h4 class="font-bold text-[13px] text-gray-700 mb-3">Model Ekle</h4>
          <div class="grid grid-cols-3 gap-3">
            <select v-model="newModelData.category_id" class="form-select">
              <option value="">Kategori Seçin</option>
              <option v-for="c in assetStore.metadata.categories" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
            <select v-model="newModelData.brand_id" class="form-select">
              <option value="">Marka Seçin</option>
              <option v-for="b in assetStore.metadata.brands" :key="b.id" :value="b.id">{{ b.name }}</option>
            </select>
            <input v-model="newModelData.name" type="text" placeholder="Model adı..." class="form-input" />
          </div>
          <button @click="submitModel" class="btn-primary-sm w-full mt-3">Yeni Modeli Kaydet</button>
        </div>

        <div class="modal-action mt-6">
          <button @click="closeConfigModal" class="btn-secondary">Kapat</button>
        </div>
      </div>
    </dialog>

    <!-- ADD/EDIT ASSET DIALOG -->
    <dialog ref="assetDialog" class="modal">
      <div class="modal-box w-11/12 max-w-xl bg-white p-6 rounded-2xl relative shadow-2xl">
        <h3 class="font-bold text-[16px] text-gray-900 mb-4">
          {{ isEditMode ? 'Varlık Düzenle' : 'Yeni Varlık Ekle' }}
        </h3>
        
        <form @submit.prevent="saveAsset" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="form-label">Seri Numarası *</label>
              <input v-model="assetForm.serial_no" type="text" class="form-input" required />
            </div>
            <div>
              <label class="form-label">Barkod / Asset Tag</label>
              <input v-model="assetForm.barcode" type="text" class="form-input" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="form-label">Model Seçin *</label>
              <select v-model="assetForm.model_id" class="form-select" required>
                <option value="">Model Seçiniz</option>
                <option v-for="m in assetStore.metadata.models" :key="m.id" :value="m.id">
                  [{{ m.category_name }}] {{ m.brand_name }} - {{ m.name }}
                </option>
              </select>
            </div>
            <div>
              <label class="form-label">Şirket *</label>
              <select v-model="assetForm.company_id" class="form-select" required>
                <option value="">Şirket Seçiniz</option>
                <option v-for="c in assetStore.metadata.companies" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-4">
            <div>
              <label class="form-label">Alış Bedeli (₺)</label>
              <input v-model.number="assetForm.purchase_price" type="number" step="0.01" class="form-input" />
            </div>
            <div>
              <label class="form-label">Alış Tarihi</label>
              <input v-model="assetForm.purchase_date" type="date" class="form-input" />
            </div>
            <div>
              <label class="form-label">Kullanım Ömrü (Ay)</label>
              <input v-model.number="assetForm.lifetime_months" type="number" class="form-input" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="form-label">Fatura Belgesi (PDF/Görsel)</label>
              <input type="file" @change="handleFileChange($event, 'invoice')" class="file-input-custom" accept=".pdf,image/*" />
              <div v-if="assetForm.invoice_path" class="text-[10px] text-green-600 mt-1">✓ Fatura yüklü</div>
            </div>
            <div>
              <label class="form-label">Garanti Belgesi (PDF/Görsel)</label>
              <input type="file" @change="handleFileChange($event, 'warranty')" class="file-input-custom" accept=".pdf,image/*" />
              <div v-if="assetForm.warranty_path" class="text-[10px] text-green-600 mt-1">✓ Garanti Belgesi yüklü</div>
            </div>
          </div>

          <div>
            <label class="form-label">Genel Durum *</label>
            <select v-model="assetForm.status_id" class="form-select" required>
              <option value="">Durum Seçiniz</option>
              <option v-for="s in assetStore.metadata.statuses" :key="s.id" :value="s.id">{{ s.name }}</option>
            </select>
          </div>

          <div>
            <label class="form-label">Notlar / Açıklama</label>
            <textarea v-model="assetForm.notes" class="form-textarea" rows="3"></textarea>
          </div>

          <div class="modal-action mt-6 flex justify-end gap-2">
            <button type="button" @click="closeAssetModal" class="btn-secondary">İptal</button>
            <button type="submit" class="btn-primary">Kaydet</button>
          </div>
        </form>
      </div>
    </dialog>

    <!-- CHECKOUT DIALOG (ZİMMET ATAMA) -->
    <dialog ref="checkoutDialog" class="modal">
      <div class="modal-box w-11/12 max-w-md bg-white p-6 rounded-2xl relative shadow-2xl">
        <h3 class="font-bold text-[16px] text-gray-900 mb-4">
          Varlık Zimmetle: {{ selectedAsset?.serial_no }}
        </h3>
        
        <form @submit.prevent="saveCheckout" class="space-y-4">
          <div>
            <label class="form-label">Zimmet Hedefi</label>
            <div class="flex items-center gap-4 mt-2">
              <label class="flex items-center gap-1.5 text-[12.5px] cursor-pointer">
                <input type="radio" v-model="checkoutForm.target_type" value="PERSONNEL" />
                Personel
              </label>
              <label class="flex items-center gap-1.5 text-[12.5px] cursor-pointer">
                <input type="radio" v-model="checkoutForm.target_type" value="LOCATION" />
                Lokasyon / Konum
              </label>
            </div>
          </div>

          <div v-if="checkoutForm.target_type === 'PERSONNEL'">
            <label class="form-label">Zimmetlenecek Personel *</label>
            <select v-model="checkoutForm.target_id" class="form-select" required>
              <option value="">Personel Seçin</option>
              <option v-for="p in assetStore.metadata.personnel" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
          </div>

          <div v-if="checkoutForm.target_type === 'LOCATION'">
            <label class="form-label">Zimmetlenecek Lokasyon *</label>
            <select v-model="checkoutForm.target_id" class="form-select" required>
              <option value="">Lokasyon Seçin</option>
              <option v-for="l in assetStore.metadata.locations" :key="l.id" :value="l.id">{{ l.name }}</option>
            </select>
          </div>

          <div>
            <label class="form-label">Zimmet Notu</label>
            <textarea v-model="checkoutForm.notes" class="form-textarea" rows="2" placeholder="Zimmet açıklama notu..."></textarea>
          </div>

          <div class="modal-action mt-6 flex justify-end gap-2">
            <button type="button" @click="closeCheckoutModal" class="btn-secondary">İptal</button>
            <button type="submit" class="btn-primary">Zimmeti Tamamla</button>
          </div>
        </form>
      </div>
    </dialog>

    <!-- LOGS / HISTORY DIALOG -->
    <dialog ref="logsDialog" class="modal">
      <div class="modal-box w-11/12 max-w-xl bg-white p-6 rounded-2xl relative shadow-2xl flex flex-col max-h-[500px]">
        <h3 class="font-bold text-[16px] text-gray-900 mb-4 shrink-0 flex items-center gap-2">
          <i class="fas fa-history text-gray-500"></i> Zimmet & İşlem Geçmişi: {{ selectedAsset?.serial_no }}
        </h3>
        
        <div class="flex-1 overflow-y-auto pr-1 space-y-4">
          <div v-if="assetLogs.length === 0" class="text-center py-10 text-gray-400">
            Hiçbir işlem kaydı bulunmuyor.
          </div>
          <div v-for="log in assetLogs" :key="log.id" class="border-l-2 border-gray-150 pl-4 py-1 relative">
            <div class="absolute w-2 h-2 rounded-full bg-gray-300 -left-[5px] top-2"></div>
            <div class="flex justify-between items-center text-[11px] text-gray-400">
              <span>{{ formatDate(log.created_at) }}</span>
              <span>Yapan: {{ log.user_name || 'Sistem' }}</span>
            </div>
            <div class="font-bold text-[12.5px] text-gray-800 mt-1">
              {{ getActionLabel(log.action) }}
              <span v-if="log.action === 'CHECKOUT' && log.target_type === 'PERSONNEL'" class="text-blue-600">
                👉 Personel: {{ log.personnel_target_name }}
              </span>
              <span v-else-if="log.action === 'CHECKOUT' && log.target_type === 'LOCATION'" class="text-purple-600">
                👉 Lokasyon: {{ log.location_target_name }}
              </span>
            </div>
            <div class="text-[11.5px] text-gray-500 mt-0.5" v-if="log.notes">
              Not: {{ log.notes }}
            </div>
          </div>
        </div>

        <div class="modal-action shrink-0 mt-6">
          <button @click="closeLogsModal" class="btn-secondary">Kapat</button>
        </div>
      </div>
    </dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAssetStore } from '../../stores/assetStore'
import { useAuthStore } from '../../stores/auth'

const assetStore = useAssetStore()
const authStore = useAuthStore()

// Filter states
const searchQuery = ref('')
const assignmentFilter = ref('ALL') // ALL, ASSIGNED, UNASSIGNED
const filters = ref({
  category_id: '',
  brand_id: '',
  status_id: ''
})

// Dialog references
const configDialog = ref(null)
const assetDialog = ref(null)
const checkoutDialog = ref(null)
const logsDialog = ref(null)

// Forms & States
const isEditMode = ref(false)
const selectedAsset = ref(null)
const assetLogs = ref([])

const assetForm = ref({
  id: null,
  serial_no: '',
  barcode: '',
  model_id: '',
  status_id: '',
  company_id: '',
  purchase_price: 0,
  purchase_date: '',
  lifetime_months: 60,
  notes: '',
  invoice_path: null,
  warranty_path: null
})

// File upload references
const invoiceFile = ref(null)
const warrantyFile = ref(null)

const checkoutForm = ref({
  target_type: 'PERSONNEL',
  target_id: '',
  notes: ''
})

// Config Add states
const newCategory = ref('')
const newBrand = ref('')
const newModelData = ref({
  name: '',
  category_id: '',
  brand_id: ''
})

// Currency Formatting
const fmt = (v) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(v || 0)

// Helper Calculations
const calculateMonthlyCost = (asset) => {
  const price = asset.purchase_price || 0
  const lifetime = asset.lifetime_months || 60
  if (price <= 0 || !asset.purchase_date) return 0
  
  const pDate = new Date(asset.purchase_date)
  const now = new Date()
  const diffMonths = (now.getFullYear() - pDate.getFullYear()) * 12 + (now.getMonth() - pDate.getMonth())
  
  if (diffMonths >= lifetime || diffMonths < 0) return 0
  return price / lifetime
}

// Fetch Initial Data
onMounted(async () => {
  await assetStore.fetchAssets()
  await assetStore.fetchMetadata()
  await assetStore.fetchFinancialSummary()
})

// Computed List View Filterings
const filteredAssets = computed(() => {
  return assetStore.assets.filter(a => {
    // Search query matches
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      const inSerial = (a.serial_no || '').toLowerCase().includes(q)
      const inBarcode = (a.barcode || '').toLowerCase().includes(q)
      const inNotes = (a.notes || '').toLowerCase().includes(q)
      if (!inSerial && !inBarcode && !inNotes) return false
    }

    // Dynamic assignment filter
    if (assignmentFilter.value === 'ASSIGNED' && !a.personnel_id && !a.location_id) return false
    if (assignmentFilter.value === 'UNASSIGNED' && (a.personnel_id || a.location_id)) return false

    // Field filter matches
    if (filters.value.category_id && a.category_id !== Number(filters.value.category_id)) return false
    if (filters.value.brand_id && a.brand_id !== Number(filters.value.brand_id)) return false
    if (filters.value.status_id && a.status_id !== Number(filters.value.status_id)) return false
    return true
  })
})

const inUseCount = computed(() => {
  return assetStore.assets.filter(a => a.personnel_id || a.location_id).length
})

const warehouseCount = computed(() => {
  return assetStore.assets.length - inUseCount.value
})

// CSS Helpers
const getStatusClass = (statusName) => {
  if (!statusName) return 'bg-gray-100 text-gray-500'
  const name = statusName.toLowerCase()
  if (name.includes('zimmet') || name.includes('kullanım')) return 'bg-emerald-100 text-emerald-700'
  if (name.includes('arıza') || name.includes('servis')) return 'bg-amber-100 text-amber-700'
  if (name.includes('hurda')) return 'bg-red-100 text-red-700'
  return 'bg-blue-100 text-blue-700'
}

// File handles
const handleFileChange = (e, type) => {
  const file = e.target.files[0]
  if (type === 'invoice') {
    invoiceFile.value = file
  } else {
    warrantyFile.value = file
  }
}

// Modals management
const openConfigModal = () => configDialog.value.showModal()
const closeConfigModal = () => {
  configDialog.value.close()
  newCategory.value = ''
  newBrand.value = ''
  newModelData.value = { name: '', category_id: '', brand_id: '' }
}

const openAddModal = () => {
  isEditMode.value = false
  invoiceFile.value = null
  warrantyFile.value = null
  assetForm.value = {
    id: null,
    serial_no: '',
    barcode: '',
    model_id: '',
    status_id: '',
    company_id: '',
    purchase_price: 0,
    purchase_date: '',
    lifetime_months: 60,
    notes: '',
    invoice_path: null,
    warranty_path: null
  }
  assetDialog.value.showModal()
}

const openEditModal = (asset) => {
  isEditMode.value = true
  invoiceFile.value = null
  warrantyFile.value = null
  assetForm.value = { ...asset }
  assetDialog.value.showModal()
}

const closeAssetModal = () => assetDialog.value.close()

const openCheckoutModal = (asset) => {
  selectedAsset.value = asset
  checkoutForm.value = {
    target_type: 'PERSONNEL',
    target_id: '',
    notes: ''
  }
  checkoutDialog.value.showModal()
}

const closeCheckoutModal = () => checkoutDialog.value.close()

const showLogs = async (asset) => {
  selectedAsset.value = asset
  assetLogs.value = await assetStore.getAssetLogs(asset.id)
  logsDialog.value.showModal()
}

const closeLogsModal = () => logsDialog.value.close()

// Submissions
const submitCategory = async () => {
  if (!newCategory.value) return
  try {
    await assetStore.addCategory(newCategory.value)
    newCategory.value = ''
  } catch (err) {
    alert(err)
  }
}

const submitBrand = async () => {
  if (!newBrand.value) return
  try {
    await assetStore.addBrand(newBrand.value)
    newBrand.value = ''
  } catch (err) {
    alert(err)
  }
}

const submitModel = async () => {
  const { name, category_id, brand_id } = newModelData.value
  if (!name || !category_id || !brand_id) {
    alert('Lütfen tüm alanları doldurun.')
    return
  }
  try {
    await assetStore.addModel(newModelData.value)
    newModelData.value = { name: '', category_id: '', brand_id: '' }
  } catch (err) {
    alert(err)
  }
}

const saveAsset = async () => {
  try {
    // Generate FormData for file uploading compatibility
    const formData = new FormData()
    formData.append('serial_no', assetForm.value.serial_no)
    formData.append('barcode', assetForm.value.barcode || '')
    formData.append('model_id', assetForm.value.model_id)
    formData.append('status_id', assetForm.value.status_id)
    formData.append('company_id', assetForm.value.company_id)
    formData.append('purchase_price', assetForm.value.purchase_price || 0)
    formData.append('purchase_date', assetForm.value.purchase_date || '')
    formData.append('lifetime_months', assetForm.value.lifetime_months || 60)
    formData.append('notes', assetForm.value.notes || '')
    
    if (invoiceFile.value) {
      formData.append('invoice', invoiceFile.value)
    }
    if (warrantyFile.value) {
      formData.append('warranty', warrantyFile.value)
    }

    if (isEditMode.value) {
      await assetStore.updateAsset(assetForm.value.id, formData)
    } else {
      await assetStore.addAsset(formData)
    }
    closeAssetModal()
  } catch (err) {
    alert(err.response?.data?.error || 'Kayıt işlemi başarısız.')
  }
}

const handleDelete = async (asset) => {
  if (confirm(`"${asset.serial_no}" seri numaralı varlığı silmek istediğinize emin misiniz?`)) {
    try {
      await assetStore.deleteAsset(asset.id)
    } catch (err) {
      alert(err)
    }
  }
}

const saveCheckout = async () => {
  if (!checkoutForm.value.target_id) {
    alert('Lütfen bir hedef seçin.')
    return
  }
  try {
    await assetStore.checkoutAsset(selectedAsset.value.id, checkoutForm.value)
    closeCheckoutModal()
  } catch (err) {
    alert(err)
  }
}

const handleCheckin = async (asset) => {
  const notes = prompt('Zimmet iade/depoya çekme açıklaması (Opsiyonel):')
  if (notes !== null) {
    try {
      await assetStore.checkinAsset(asset.id, { notes })
    } catch (err) {
      alert(err)
    }
  }
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString('tr-TR')
}

const getActionLabel = (action) => {
  const map = {
    'CREATE': 'Varlık oluşturuldu.',
    'UPDATE': 'Varlık detayları güncellendi.',
    'CHECKOUT': 'Zimmet atandı',
    'CHECKIN': 'Zimmet iade edildi / Depoya çekildi.'
  }
  return map[action] || action
}
</script>

<style scoped>
.search-input {
  @apply h-8 px-3 bg-gray-50 border border-gray-200 rounded text-[12px] font-medium text-gray-700 outline-none focus:border-blue-500;
}
.filter-select { 
  @apply h-8 px-2 bg-gray-50 border border-gray-200 rounded text-[12px] font-medium text-gray-700 outline-none focus:border-blue-500 cursor-pointer; 
}
.btn-primary { 
  @apply h-8 px-4 bg-blue-600 text-white rounded text-[11px] font-bold hover:bg-blue-700 flex items-center transition-all shadow-sm; 
}
.btn-secondary { 
  @apply h-8 px-4 bg-gray-100 text-gray-700 rounded text-[11px] font-bold hover:bg-gray-200 flex items-center transition-all; 
}
.btn-primary-sm { 
  @apply px-3 py-1.5 bg-blue-600 text-white rounded text-[11px] font-bold hover:bg-blue-700 transition-all shadow-sm; 
}
.btn-actions {
  @apply w-7 h-7 rounded border border-gray-100 bg-white hover:bg-gray-50 flex items-center justify-center transition-all shadow-sm;
}
.form-label {
  @apply block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1;
}
.form-input {
  @apply w-full h-9 px-3 bg-gray-50 border border-gray-200 rounded-lg text-[13px] text-gray-800 outline-none focus:border-blue-500 focus:bg-white transition-all;
}
.form-select {
  @apply w-full h-9 px-2 bg-gray-50 border border-gray-200 rounded-lg text-[13px] text-gray-800 outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer;
}
.form-textarea {
  @apply w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-[13px] text-gray-800 outline-none focus:border-blue-500 focus:bg-white transition-all resize-none;
}
.file-input-custom {
  @apply block w-full text-[11px] text-gray-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-[11px] file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer;
}
</style>
