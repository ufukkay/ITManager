<script setup>
import { ref, onMounted } from 'vue'
import api from '../../api'

const loading = ref(true)
const stats = ref({ avgScore: 0, totalRatings: 0 })
const distribution = ref({ 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 })
const ratings = ref([])

const loadReportData = async () => {
    loading.value = true
    try {
        const res = await api.get('/api/helpdesk/csat/report')
        if (res.data.success) {
            stats.value = res.data.stats
            distribution.value = res.data.distribution
            ratings.value = res.data.ratings
        }
    } catch (err) {
        console.error('CSAT rapor verileri yüklenemedi:', err)
    } finally {
        loading.value = false
    }
}

const getPercentage = (count) => {
    if (stats.value.totalRatings === 0) return '0%'
    const pct = (count / stats.value.totalRatings) * 100
    return `${pct.toFixed(0)}%`
}

const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    try {
        const date = new Date(dateStr)
        return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    } catch (e) {
        return dateStr
    }
}

onMounted(() => {
    loadReportData()
})
</script>

<template>
  <div class="h-full flex flex-col bg-gray-50/50 overflow-hidden">
    <!-- Header -->
    <div class="px-8 py-6 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white">
      <div>
        <h1 class="text-[18px] font-black text-gray-900 tracking-tight leading-none mb-1.5">Müşteri Memnuniyeti (CSAT)</h1>
        <p class="text-[12px] text-gray-400 font-medium">Kullanıcılardan gelen destek memnuniyet puanları ve değerlendirmeler</p>
      </div>
      
      <button @click="loadReportData" :disabled="loading" class="h-9 w-9 bg-white hover:bg-gray-50 text-gray-400 hover:text-blue-600 rounded-xl border border-gray-200 transition-all flex items-center justify-center active:scale-95 disabled:opacity-50">
        <i class="fas fa-sync-alt" :class="{ 'fa-spin': loading }"></i>
      </button>
    </div>

    <!-- Scrollable content -->
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <i class="fas fa-spinner fa-spin text-2xl text-indigo-600"></i>
    </div>

    <div v-else class="flex-1 overflow-y-auto p-8 space-y-6">
      
      <!-- Top Grid: KPI Cards -->
      <div class="grid grid-cols-3 gap-6">
        <!-- Average Score Card -->
        <div class="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex items-center gap-5">
          <div class="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500 text-2xl shrink-0">
            <i class="fas fa-star"></i>
          </div>
          <div>
            <span class="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Ortalama Skor</span>
            <div class="flex items-baseline gap-1 mt-0.5">
                <span class="text-2xl font-black text-gray-900">{{ stats.avgScore.toFixed(1) }}</span>
                <span class="text-xs text-gray-400 font-bold">/ 5.0</span>
            </div>
            <!-- Interactive Stars display -->
            <div class="flex gap-0.5 mt-1">
                <i v-for="star in 5" :key="star" 
                   :class="[stats.avgScore >= star ? 'fas fa-star text-amber-400' : stats.avgScore >= star - 0.5 ? 'fas fa-star-half-alt text-amber-400' : 'far fa-star text-gray-200']"
                   class="text-[11px]"></i>
            </div>
          </div>
        </div>

        <!-- Total Ratings Card -->
        <div class="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex items-center gap-5">
          <div class="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-500 text-2xl shrink-0">
            <i class="fas fa-comment-dots"></i>
          </div>
          <div>
            <span class="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Toplam Oy Sayısı</span>
            <div class="flex items-baseline gap-1 mt-0.5">
                <span class="text-2xl font-black text-gray-900">{{ stats.totalRatings }}</span>
                <span class="text-xs text-gray-400 font-bold">adet oy</span>
            </div>
            <p class="text-[10px] text-gray-400 mt-1 font-medium">Bilet çözümü ardından gelen yanıtlar</p>
          </div>
        </div>

        <!-- CSAT Rating Indicator (Satisfied ratio) -->
        <div class="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex items-center gap-5">
          <div class="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-500 text-2xl shrink-0">
            <i class="fas fa-smile-beam"></i>
          </div>
          <div>
            <span class="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Memnuniyet Oranı</span>
            <div class="flex items-baseline gap-1 mt-0.5">
                <span class="text-2xl font-black text-gray-900">
                    {{ stats.totalRatings > 0 ? (((distribution[5] + distribution[4]) / stats.totalRatings) * 100).toFixed(0) : '0' }}%
                </span>
            </div>
            <p class="text-[10px] text-gray-400 mt-1 font-medium">4 ve 5 yıldız veren kullanıcı oranı</p>
          </div>
        </div>
      </div>

      <!-- Center Grid: Distribution and Comments -->
      <div class="grid grid-cols-3 gap-6">
        
        <!-- Score Distribution -->
        <div class="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 class="text-xs font-black text-gray-400 uppercase tracking-wider">Puan Dağılımı</h3>
          
          <div class="space-y-3">
            <div v-for="score in [5, 4, 3, 2, 1]" :key="score" class="flex items-center gap-3">
              <span class="text-xs font-bold text-gray-500 w-3">{{ score }}</span>
              <i class="fas fa-star text-amber-400 text-[10px]"></i>
              
              <!-- Progress Bar -->
              <div class="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                    class="h-full rounded-full transition-all duration-500"
                    :class="[
                        score >= 4 ? 'bg-emerald-500' : score === 3 ? 'bg-amber-400' : 'bg-red-400'
                    ]"
                    :style="{ width: getPercentage(distribution[score]) }"
                ></div>
              </div>
              
              <span class="text-[11px] font-bold text-gray-400 w-8 text-right">{{ distribution[score] }} oy</span>
            </div>
          </div>
        </div>

        <!-- Recent Ratings comments (Span 2) -->
        <div class="col-span-2 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div class="p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
            <h3 class="text-xs font-black text-gray-400 uppercase tracking-wider">Son Geri Bildirimler</h3>
            <span class="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100">
                Son {{ ratings.length }} Değerlendirme
            </span>
          </div>

          <div class="divide-y divide-gray-100 overflow-y-auto max-h-[350px] custom-scrollbar flex-1">
            <div v-if="ratings.length === 0" class="p-12 text-center text-gray-400 text-xs italic">
                Henüz değerlendirme veya yorum bırakılmamış.
            </div>
            
            <div v-for="item in ratings" :key="item.id" class="p-5 hover:bg-gray-50/50 transition-colors space-y-2">
              <div class="flex items-start justify-between">
                <div class="flex items-center gap-2.5">
                  <div class="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-[11px] shrink-0">
                    {{ item.user_name?.[0] || 'K' }}
                  </div>
                  <div>
                    <h4 class="text-[12px] font-bold text-gray-900 leading-none">{{ item.user_name || 'Kullanıcı' }}</h4>
                    <span class="text-[9px] text-gray-400 font-bold block mt-1 uppercase tracking-tight">{{ item.ticket_no }} — {{ item.ticket_title }}</span>
                  </div>
                </div>
                
                <div class="text-right">
                  <div class="flex gap-0.5">
                    <i v-for="star in 5" :key="star" 
                       :class="[item.score >= star ? 'fas fa-star text-yellow-400' : 'far fa-star text-gray-200']"
                       class="text-[9px]"></i>
                  </div>
                  <span class="text-[9px] text-gray-400 font-semibold block mt-1">{{ formatDate(item.created_at) }}</span>
                </div>
              </div>

              <!-- Comment details -->
              <p class="text-[12px] text-gray-600 pl-[42px] leading-relaxed italic" v-if="item.feedback">
                "{{ item.feedback }}"
              </p>
              <p class="text-[11px] text-gray-300 pl-[42px] leading-none italic" v-else>
                Yorum bırakılmadı.
              </p>
            </div>
          </div>
        </div>

      </div>

    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 10px;
}
</style>
