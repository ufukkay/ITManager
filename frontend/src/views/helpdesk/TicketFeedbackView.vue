<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '../../api'

const route = useRoute()
const ticketId = route.params.ticket_id

const loading = ref(true)
const submitting = ref(false)
const submitted = ref(false)
const errorMsg = ref('')

const ticketInfo = ref({ ticket_no: '', title: '' })
const score = ref(0)
const hoverScore = ref(0)
const feedback = ref('')

const scoreLabels = {
    1: 'Çok Kötü',
    2: 'Kötü',
    3: 'Orta',
    4: 'İyi',
    5: 'Çok İyi'
}

const loadTicketInfo = async () => {
    loading.value = true
    errorMsg.value = ''
    try {
        const res = await api.get(`/api/helpdesk/tickets/${ticketId}/public-info`)
        if (res.data.success) {
            ticketInfo.value = res.data
        }
    } catch (err) {
        console.error('Bilet bilgileri yüklenemedi:', err)
        errorMsg.value = err.response?.data?.error || 'Bilet bilgileri bulunamadı veya bağlantı hatası oluştu.'
    } finally {
        loading.value = false
    }
}

const submitRating = async () => {
    if (score.value === 0) {
        alert('Lütfen en az 1 yıldız seçerek puanlama yapın.')
        return
    }
    
    submitting.value = true
    try {
        const res = await api.post(`/api/helpdesk/tickets/${ticketId}/feedback`, {
            score: score.value,
            feedback: feedback.value
        })
        if (res.data.success) {
            submitted.value = true
        }
    } catch (err) {
        console.error('Memnuniyet anketi gönderilemedi:', err)
        alert(err.response?.data?.error || 'Geri bildirim gönderilirken bir hata oluştu.')
    } finally {
        submitting.value = false
    }
}

onMounted(() => {
    loadTicketInfo()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center p-6">
    <div class="w-full max-w-md bg-white border border-gray-200 rounded-3xl shadow-xl overflow-hidden">
      <!-- Top Branding -->
      <div class="px-8 pt-8 pb-6 bg-gradient-to-r from-blue-600 to-indigo-700 text-white text-center">
        <div class="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mx-auto mb-4 text-xl shadow-inner">
            <i class="fas fa-heart text-red-400"></i>
        </div>
        <h1 class="text-lg font-black tracking-tight">IT Memnuniyet Anketi</h1>
        <p class="text-[12px] text-blue-100/80 font-medium mt-1">Hizmet kalitemizi artırmamıza yardımcı olun</p>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="p-8 text-center">
        <i class="fas fa-spinner fa-spin text-2xl text-blue-600 mb-2"></i>
        <p class="text-xs font-semibold text-gray-400 uppercase tracking-widest">Bilet Bilgileri Yükleniyor...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="errorMsg" class="p-8 text-center space-y-4">
        <div class="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto text-lg border border-red-100">
            <i class="fas fa-exclamation-triangle"></i>
        </div>
        <h3 class="text-sm font-bold text-gray-900">Bir Hata Oluştu</h3>
        <p class="text-xs text-gray-500">{{ errorMsg }}</p>
      </div>

      <!-- Success State -->
      <div v-else-if="submitted" class="p-8 text-center space-y-4">
        <div class="w-14 h-14 rounded-full bg-green-50 text-green-600 flex items-center justify-center mx-auto text-xl border border-green-100 shadow-sm animate-bounce">
            <i class="fas fa-check-circle"></i>
        </div>
        <h3 class="text-base font-bold text-gray-900">Teşekkür Ederiz!</h3>
        <p class="text-[13px] text-gray-500 max-w-xs mx-auto leading-relaxed">
            Değerlendirmeniz başarıyla kaydedildi. IT hizmet kalitemizi artırmak için geri bildirimlerinizi dikkatle inceleyeceğiz.
        </p>
      </div>

      <!-- Form View -->
      <div v-else class="p-8 space-y-6">
        <!-- Ticket Information Context -->
        <div class="p-4 rounded-2xl bg-gray-50 border border-gray-100 text-center space-y-1">
            <span class="text-[10px] font-black text-blue-600 uppercase tracking-wider">{{ ticketInfo.ticket_no }}</span>
            <h2 class="text-[13px] font-bold text-gray-800 line-clamp-1 px-2">{{ ticketInfo.title }}</h2>
            <p class="text-[11px] text-gray-400 font-medium pt-0.5">Destek talebiniz başarıyla çözülmüştür.</p>
        </div>

        <div class="space-y-4">
            <div class="text-center">
                <label class="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">Hizmeti Puanlayın</label>
                
                <!-- Star Rating System -->
                <div class="flex items-center justify-center gap-3">
                    <button 
                        v-for="star in 5" 
                        :key="star"
                        type="button"
                        @click="score = star"
                        @mouseover="hoverScore = star"
                        @mouseleave="hoverScore = 0"
                        class="text-3xl transition-transform active:scale-95 duration-100 focus:outline-none"
                    >
                        <i 
                            :class="[
                                (hoverScore || score) >= star 
                                    ? 'fas fa-star text-yellow-400 drop-shadow-sm scale-110' 
                                    : 'far fa-star text-gray-300'
                            ]"
                            class="transition-all"
                        ></i>
                    </button>
                </div>

                <!-- Star Active Description Label -->
                <div class="h-5 mt-2">
                    <span 
                        v-if="hoverScore || score" 
                        class="text-xs font-bold text-yellow-600 bg-yellow-50 px-2.5 py-0.5 rounded-full border border-yellow-100"
                    >
                        {{ scoreLabels[hoverScore || score] }}
                    </span>
                </div>
            </div>

            <!-- Comment Input -->
            <div class="space-y-2">
                <label class="block text-[11px] font-black text-gray-400 uppercase tracking-widest">Görüş ve Önerileriniz</label>
                <textarea 
                    v-model="feedback" 
                    rows="4" 
                    maxlength="500"
                    class="w-full p-4 text-[13px] border border-gray-200 rounded-2xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all resize-none"
                    placeholder="Deneyiminizi kısaca paylaşabilirsiniz..."
                ></textarea>
                <div class="text-right text-[10px] text-gray-400 font-medium">
                    {{ feedback.length }} / 500 karakter
                </div>
            </div>
        </div>

        <button 
            type="button" 
            @click="submitRating" 
            :disabled="score === 0 || submitting"
            class="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-[13px] transition-all shadow-md active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
            <i :class="submitting ? 'fas fa-spinner fa-spin' : 'fas fa-paper-plane'"></i>
            {{ submitting ? 'Gönderiliyor...' : 'Değerlendirmeyi Gönder' }}
        </button>
      </div>
    </div>
  </div>
</template>
