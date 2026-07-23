<template>
  <div class="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4 font-sans text-gray-800">
    <div class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-200 flex flex-col justify-between">
      
      <!-- Top Mobile Header -->
      <div>
        <div class="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
          <div class="flex items-center gap-2.5">
            <div class="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-lg shadow-md">
              <i class="fas fa-qrcode"></i>
            </div>
            <div>
              <div class="font-extrabold text-sm text-gray-900">ITManager Saha Audit</div>
              <div class="text-[11px] text-gray-400 font-semibold">Mobil QR Zimmet Doğrulama</div>
            </div>
          </div>
          <span :class="['px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider', asset ? getStatusClass(asset.status_name) : 'bg-gray-100']">
            {{ asset?.status_name || 'YÜKLENİYOR' }}
          </span>
        </div>

        <div v-if="loading" class="flex flex-col items-center justify-center py-12 text-gray-400 gap-3">
          <i class="fas fa-circle-notch fa-spin text-3xl text-blue-600"></i>
          <span class="text-xs font-bold">Cihaz Bilgileri Getiriliyor...</span>
        </div>

        <div v-else-if="error" class="flex flex-col items-center justify-center py-12 text-red-500 gap-2 text-center">
          <i class="fas fa-exclamation-triangle text-4xl mb-2"></i>
          <div class="font-bold text-sm">{{ error }}</div>
          <p class="text-xs text-gray-400">Okutulan QR Koda ait envanter kaydı bulunamadı.</p>
        </div>

        <!-- ASSET INFORMATION CARD -->
        <div v-else-if="asset" class="space-y-4">
          <!-- Main Device Title -->
          <div class="bg-blue-50/60 border border-blue-100 rounded-2xl p-4 text-center">
            <div class="text-[11px] font-extrabold text-blue-600 uppercase tracking-widest">{{ asset.category_name }}</div>
            <h2 class="text-lg font-black text-gray-900 mt-0.5 leading-snug">{{ asset.brand_name }} {{ asset.model_name }}</h2>
            <div class="flex items-center justify-center gap-3 mt-2 text-xs font-mono">
              <span class="bg-white px-2.5 py-1 rounded-lg border text-blue-800 font-bold">SN: {{ asset.serial_no }}</span>
              <span v-if="asset.barcode" class="bg-white px-2.5 py-1 rounded-lg border text-gray-800 font-bold">ENV: {{ asset.barcode }}</span>
            </div>
          </div>

          <!-- Assignment & Location Details -->
          <div class="grid grid-cols-2 gap-3 text-xs">
            <div class="bg-gray-50 p-3 rounded-xl border border-gray-100">
              <div class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Zimmetli Personel</div>
              <div class="font-bold text-gray-900 flex items-center gap-1.5">
                <i class="fas fa-user text-blue-500"></i>
                <span class="truncate">{{ asset.personnel_name || 'Atanmamış (Depoda)' }}</span>
              </div>
            </div>

            <div class="bg-gray-50 p-3 rounded-xl border border-gray-100">
              <div class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Saha Lokasyonu</div>
              <div class="font-bold text-gray-900 flex items-center gap-1.5">
                <i class="fas fa-map-marker-alt text-purple-500"></i>
                <span class="truncate">{{ asset.location_name || 'Depo' }}</span>
              </div>
            </div>
          </div>

          <!-- Notes -->
          <div class="bg-gray-50 p-3 rounded-xl border border-gray-100 text-xs">
            <div class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Kurum & Şirket</div>
            <div class="font-bold text-gray-800">{{ asset.company_name }}</div>
          </div>

          <!-- Technical & Dynamic Specs (Mobile) -->
          <div v-if="asset.cpu_model || asset.ram_gb || asset.disk_gb || parseCustomSpecs(asset.specs_json).length > 0" class="bg-blue-50/40 p-3 rounded-xl border border-blue-100 text-xs space-y-1.5">
            <div class="text-[10.5px] font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1">
              <i class="fas fa-microchip"></i> Donanım & Teknik Detaylar
            </div>
            <div v-if="asset.cpu_model" class="flex justify-between text-[11px]"><span class="text-gray-500">CPU:</span> <span class="font-bold text-gray-900">{{ asset.cpu_model }}</span></div>
            <div v-if="asset.ram_gb" class="flex justify-between text-[11px]"><span class="text-gray-500">RAM:</span> <span class="font-bold text-gray-900">{{ asset.ram_gb }} GB</span></div>
            <div v-if="asset.disk_gb" class="flex justify-between text-[11px]"><span class="text-gray-500">Disk:</span> <span class="font-bold text-gray-900">{{ asset.disk_gb }} GB</span></div>
            <div v-if="asset.os_version" class="flex justify-between text-[11px]"><span class="text-gray-500">OS:</span> <span class="font-bold text-gray-900">{{ asset.os_version }}</span></div>
            
            <div v-for="spec in parseCustomSpecs(asset.specs_json)" :key="spec.key" class="flex justify-between text-[11px]">
              <span class="text-gray-500">{{ spec.key }}:</span>
              <span class="font-bold text-gray-900">{{ spec.value }}</span>
            </div>
          </div>

          <!-- Quick Link to Full Personnel Audit Session -->
          <div v-if="asset.personnel_id" class="pt-1">
            <RouterLink 
              to="/inventory/audit" 
              class="w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-800 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              <i class="fas fa-clipboard-check text-indigo-600"></i>
              <span>Zimmet Stok Sayımı Modülüne Git</span>
            </RouterLink>
          </div>

          <!-- Audit Log History -->
          <div v-if="audits && audits.length > 0" class="pt-2">
            <div class="text-[10.5px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <i class="fas fa-history text-blue-500"></i> Son Saha Sayım Doğrulamaları
            </div>
            <div class="space-y-1.5">
              <div v-for="a in audits.slice(0, 3)" :key="a.id" class="text-[11px] bg-emerald-50 text-emerald-900 p-2 rounded-xl border border-emerald-100 flex items-center justify-between">
                <span class="font-bold flex items-center gap-1">
                  <i class="fas fa-check-circle text-emerald-600"></i> {{ a.audited_by_name }}
                </span>
                <span class="text-[10px] text-emerald-700 font-mono">{{ fmtDate(a.created_at) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Bottom Area -->
      <div v-if="asset" class="pt-6 mt-4 border-t border-gray-100">
        <button 
          @click="confirmAudit"
          :disabled="submitting || auditDone"
          :class="[
            'w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-all',
            auditDone ? 'bg-emerald-500 text-white cursor-default' : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95'
          ]"
        >
          <i :class="['fas', auditDone ? 'fa-check-double' : (submitting ? 'fa-circle-notch fa-spin' : 'fa-check-circle')]"></i>
          <span>{{ auditDone ? 'Saha Sayımı Doğrulandı ✓' : (submitting ? 'Kaydediliyor...' : 'Zimmet Doğrulaması Yap (OK)') }}</span>
        </button>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'

const route = useRoute()
const assetId = route.params.id

const loading = ref(true)
const submitting = ref(false)
const auditDone = ref(false)
const error = ref('')
const asset = ref(null)
const audits = ref([])

const parseCustomSpecs = (jsonStr) => {
  if (!jsonStr) return []
  try {
    const parsed = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr
    const list = []
    for (const [k, v] of Object.entries(parsed)) {
      if (v !== null && v !== undefined && v !== '') {
        let label = k
        if (k === 'imei') label = 'IMEI 1'
        else if (k === 'imei2') label = 'IMEI 2'
        else if (k === 'storage_gb') label = 'Depolama'
        else if (k === 'color') label = 'Renk'
        list.push({ key: label, value: String(v) })
      }
    }
    return list
  } catch (e) {
    return []
  }
}

const getStatusClass = (statusName) => {
  if (!statusName) return 'bg-gray-100 text-gray-700'
  if (statusName.includes('Zimmet') || statusName.includes('Kullanım')) return 'bg-emerald-100 text-emerald-800'
  if (statusName.includes('Hazır') || statusName.includes('Boşta')) return 'bg-blue-100 text-blue-800'
  return 'bg-amber-100 text-amber-800'
}

const fmtDate = (d) => d ? new Date(d).toLocaleString('tr-TR') : '—'

const fetchAssetDetail = async () => {
  loading.value = true
  error.value = ''
  try {
    const res = await axios.get(`/api/assets/scan/${assetId}`)
    asset.value = res.data.asset
    audits.value = res.data.audits || []
  } catch (err) {
    error.value = err.response?.data?.error || 'Envanter kaydı bulunamadı.'
  } finally {
    loading.value = false
  }
}

const confirmAudit = async () => {
  submitting.value = true
  try {
    await axios.post(`/api/assets/${asset.value.id}/audit`, {
      notes: 'Mobil QR Saha Doğrulaması Yapıldı'
    })
    auditDone.value = true
    await fetchAssetDetail()
  } catch (err) {
    alert('Saha sayımı kaydedilirken hata oluştu.')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  fetchAssetDetail()
})
</script>
