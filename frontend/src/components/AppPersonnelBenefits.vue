<script setup>
import { ref, onMounted, watch } from 'vue'
import api from '../api'
import { useToast } from '../composables/useToast'

const props = defineProps({
  personnelId: {
    type: [Number, String],
    required: true
  }
})

const { showToast } = useToast()

const benefits = ref([])
const loading = ref(false)
const saving = ref(false)

const benefitTypeLabels = {
  PHONE: 'Telefon Desteği',
  INTERNET: 'İnternet Desteği',
  VEHICLE_FUEL: 'Araç Kirası & Yakıt Desteği'
}

const newBenefit = ref({ benefit_type: 'PHONE', amount: '', notes: '' })

const formatCurrency = (val) => {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 }).format(val || 0)
}

const fetchBenefits = async () => {
  if (!props.personnelId) return
  loading.value = true
  try {
    const res = await api.get(`/api/master-data/personnel/${props.personnelId}/benefits`)
    benefits.value = res.data || []
  } catch (err) {
    console.error('Personnel benefits fetch failed:', err)
  } finally {
    loading.value = false
  }
}

const addBenefit = async () => {
  if (!newBenefit.value.amount || Number(newBenefit.value.amount) <= 0) {
    showToast('Lütfen geçerli bir tutar girin.', 'error')
    return
  }
  saving.value = true
  try {
    await api.post(`/api/master-data/personnel/${props.personnelId}/benefits`, newBenefit.value)
    newBenefit.value = { benefit_type: 'PHONE', amount: '', notes: '' }
    await fetchBenefits()
    showToast('Destek kaydı eklendi', 'success')
  } catch (err) {
    showToast('Hata: ' + (err.response?.data?.error || err.message), 'error')
  } finally {
    saving.value = false
  }
}

const deleteBenefit = async (benefit) => {
  try {
    await api.delete(`/api/master-data/personnel/${props.personnelId}/benefits/${benefit.id}`)
    await fetchBenefits()
    showToast('Destek kaydı silindi', 'success')
  } catch (err) {
    showToast('Hata: ' + (err.response?.data?.error || err.message), 'error')
  }
}

onMounted(fetchBenefits)
watch(() => props.personnelId, fetchBenefits)
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center gap-2 text-[11px] font-bold text-blue-600 uppercase tracking-wider">
      <i class="fas fa-hand-holding-dollar"></i> Aylık Destekler ({{ benefits.length }})
    </div>

    <div v-if="loading" class="h-16 flex items-center justify-center text-gray-400 dark:text-slate-500 text-[12px]">
      <i class="fas fa-spinner fa-spin mr-2"></i> Yükleniyor...
    </div>

    <div v-else-if="benefits.length === 0" class="h-16 flex items-center justify-center bg-gray-50 dark:bg-slate-800 rounded-xl border border-dashed border-gray-200 dark:border-slate-700 text-gray-400 dark:text-slate-500 text-[12px]">
      Kayıtlı aylık destek bulunmuyor.
    </div>

    <div v-else class="border border-gray-100 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-800 shadow-sm">
      <table class="w-full text-left text-[12.5px]">
        <thead class="bg-gray-50 dark:bg-slate-900 text-gray-400 dark:text-slate-500 uppercase text-[9.5px] font-bold">
          <tr>
            <th class="px-4 py-2.5">Destek Türü</th>
            <th class="px-4 py-2.5">Aylık Tutar</th>
            <th class="px-4 py-2.5">Not</th>
            <th class="px-4 py-2.5 w-10"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50 dark:divide-slate-700">
          <tr v-for="b in benefits" :key="b.id" class="hover:bg-blue-50/20 dark:hover:bg-slate-700/50 transition-colors">
            <td class="px-4 py-2.5 font-semibold text-gray-800 dark:text-slate-100">{{ benefitTypeLabels[b.benefit_type] || b.benefit_type }}</td>
            <td class="px-4 py-2.5 font-bold text-emerald-600 dark:text-green-400">{{ formatCurrency(b.amount) }}</td>
            <td class="px-4 py-2.5 text-gray-500 dark:text-slate-400 italic max-w-[220px] truncate" :title="b.notes">{{ b.notes || '—' }}</td>
            <td class="px-4 py-2.5 text-right">
              <button type="button" @click="deleteBenefit(b)" class="w-7 h-7 flex items-center justify-center text-gray-300 dark:text-slate-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-all">
                <i class="fas fa-trash text-[11px]"></i>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Yeni destek ekleme -->
    <div class="flex items-end gap-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700">
      <div class="flex-1">
        <label class="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-1">Destek Türü</label>
        <select v-model="newBenefit.benefit_type" class="w-full h-9 px-2.5 text-[12.5px] border border-gray-200 dark:border-slate-700 rounded-lg outline-none focus:border-blue-500 bg-white dark:bg-slate-900 dark:text-slate-100">
          <option value="PHONE">Telefon Desteği</option>
          <option value="INTERNET">İnternet Desteği</option>
          <option value="VEHICLE_FUEL">Araç Kirası & Yakıt Desteği</option>
        </select>
      </div>
      <div class="w-32">
        <label class="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-1">Aylık Tutar (₺)</label>
        <input v-model="newBenefit.amount" type="number" min="0" step="0.01" placeholder="0.00"
          class="w-full h-9 px-2.5 text-[12.5px] border border-gray-200 dark:border-slate-700 rounded-lg outline-none focus:border-blue-500 dark:bg-slate-900 dark:text-slate-100">
      </div>
      <div class="flex-1">
        <label class="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-1">Not (Opsiyonel)</label>
        <input v-model="newBenefit.notes" type="text" placeholder="Örn: Aylık ev interneti katkısı"
          class="w-full h-9 px-2.5 text-[12.5px] border border-gray-200 dark:border-slate-700 rounded-lg outline-none focus:border-blue-500 dark:bg-slate-900 dark:text-slate-100">
      </div>
      <button type="button" @click="addBenefit" :disabled="saving"
        class="h-9 px-4 bg-blue-600 text-white text-[12px] font-bold rounded-lg hover:bg-blue-700 shadow-sm disabled:opacity-60 flex items-center gap-1.5 shrink-0">
        <i :class="saving ? 'fas fa-spinner fa-spin' : 'fas fa-plus'" class="text-[10px]"></i> Ekle
      </button>
    </div>
  </div>
</template>
