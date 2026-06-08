<template>
  <div class="h-full flex flex-col bg-white overflow-hidden" v-if="ticket">
    <!-- HEADER -->
    <header class="h-16 border-b border-gray-100 flex items-center px-6 justify-between bg-white shrink-0">
      <div class="flex items-center gap-4">
        <button @click="$router.back()" class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 transition-colors">
          <i class="fas fa-arrow-left"></i>
        </button>
        <div>
          <div class="flex items-center gap-2 mb-0.5">
            <span class="text-[12px] font-mono font-bold text-gray-500">{{ ticket.ticket_no }}</span>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider" :class="getStatusColor(ticket.status).badge">
              {{ ticket.status }}
            </span>
          </div>
          <h1 class="text-[15px] font-bold text-gray-900 truncate max-w-xl">{{ ticket.title }}</h1>
        </div>
      </div>
      
      <!-- Tech Actions -->
      <div v-if="isAdminOrTech" class="flex gap-2">
        <button v-if="ticket.status === 'Açık'" @click="assignTicket" class="px-4 py-2 bg-blue-600 text-white text-[12px] font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
          Üzerime Al
        </button>
        <select v-else v-model="statusSelect" @change="updateStatus" class="h-9 px-3 text-[12px] font-bold border border-gray-200 rounded-lg outline-none focus:border-blue-500 bg-gray-50 text-gray-700">
          <option value="İşlemde">İşlemde</option>
          <option value="Beklemede">Beklemede</option>
          <option value="Çözüldü">Çözüldü</option>
          <option value="Kapalı">Kapalı</option>
        </select>
      </div>
    </header>

    <div class="flex flex-1 min-h-0">
      <!-- MESSAGES AREA -->
      <main class="flex-1 flex flex-col bg-gray-50/50 relative">
        <div class="flex-1 overflow-y-auto p-6 space-y-6" id="messagesContainer">
          <div v-for="msg in messages" :key="msg.id" class="flex flex-col max-w-3xl" :class="[msg.user_id === authStore.userId ? 'ml-auto items-end' : 'mr-auto items-start']">
            <!-- Sistem Mesajı -->
            <div v-if="!msg.user_id" class="self-center my-4">
              <span class="px-4 py-1.5 bg-gray-200 text-gray-600 text-[11px] font-bold rounded-full">
                <i class="fas fa-info-circle mr-1"></i> {{ msg.message }}
              </span>
            </div>
            
            <!-- Normal Mesaj -->
            <div v-else class="flex flex-col" :class="[msg.user_id === authStore.userId ? 'items-end' : 'items-start']">
              <div class="text-[11px] text-gray-400 mb-1 px-1 font-medium">
                {{ msg.user_name }} • {{ fmtTime(msg.created_at) }}
                <span v-if="msg.is_internal" class="text-amber-500 ml-2 font-bold"><i class="fas fa-eye-slash"></i> Gizli Not</span>
              </div>
              <div class="p-4 rounded-2xl shadow-sm text-[13px] leading-relaxed break-words"
                   :class="[
                     msg.is_internal ? 'bg-amber-50 text-amber-900 border border-amber-200 rounded-bl-sm' :
                     msg.user_id === authStore.userId ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm'
                   ]">
                <p class="whitespace-pre-wrap">{{ msg.message }}</p>
                
                <!-- Attachments -->
                <div v-if="msg.attachments && msg.attachments.length > 0" class="mt-3 pt-3 border-t border-white/20 grid grid-cols-2 gap-2">
                  <a v-for="att in msg.attachments" :key="att.id" :href="'http://localhost:3001' + att.file_path" target="_blank" class="flex items-center gap-2 p-2 rounded bg-black/10 hover:bg-black/20 transition-colors">
                    <i class="fas fa-paperclip text-lg"></i>
                    <span class="text-[10px] font-mono truncate w-24" :title="att.file_name">{{ att.file_name }}</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- MESSAGE INPUT -->
        <div class="p-4 bg-white border-t border-gray-100 shrink-0">
          <form @submit.prevent="sendMessage" class="flex gap-3 items-end">
            <div class="flex-1 bg-gray-50 border border-gray-200 rounded-xl p-2 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all flex flex-col">
              <textarea v-model="newMessage" rows="2" class="w-full bg-transparent resize-none outline-none text-[13px] px-2 py-1 placeholder:text-gray-400" placeholder="Mesajınızı buraya yazın..." @keydown.enter.exact.prevent="sendMessage"></textarea>
              
              <div class="flex items-center justify-between mt-2 px-2 border-t border-gray-200 pt-2">
                <div class="flex items-center gap-3">
                  <label class="cursor-pointer text-gray-400 hover:text-blue-500 transition-colors" title="Dosya Ekle">
                    <i class="fas fa-paperclip text-lg"></i>
                    <input type="file" multiple @change="handleFileChange" class="hidden">
                  </label>
                  <span v-if="files.length > 0" class="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{{ files.length }} dosya eklendi</span>
                </div>
                
                <div v-if="isAdminOrTech" class="flex items-center gap-2">
                  <label class="flex items-center gap-2 cursor-pointer">
                    <div class="relative inline-block w-7 h-4">
                      <input type="checkbox" v-model="isInternal" class="peer sr-only">
                      <div class="w-full h-full bg-gray-300 rounded-full peer-checked:bg-amber-500 transition-colors"></div>
                      <div class="absolute left-1 top-0.5 w-3 h-3 bg-white rounded-full transition-all peer-checked:translate-x-3"></div>
                    </div>
                    <span class="text-[10px] font-bold text-gray-500 select-none">Sadece Teknisyenler Görsün</span>
                  </label>
                </div>
              </div>
            </div>
            
            <button type="submit" :disabled="!newMessage.trim() && files.length === 0" class="w-12 h-12 shrink-0 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 shadow-sm">
              <i class="fas fa-paper-plane"></i>
            </button>
          </form>
        </div>
      </main>

      <!-- SIDEBAR INFO -->
      <aside class="w-72 bg-white border-l border-gray-100 flex flex-col shrink-0 overflow-y-auto">
        <div class="p-6">
          <h3 class="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-4">Talep Bilgileri</h3>
          
          <div class="space-y-5">
            <div>
              <div class="text-[10px] text-gray-400 font-semibold mb-1">Talep Sahibi</div>
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[12px]">
                  {{ ticket.user_name ? ticket.user_name.charAt(0).toUpperCase() : '?' }}
                </div>
                <div>
                  <div class="text-[13px] font-bold text-gray-900">{{ ticket.user_name || 'Bilinmeyen Kullanıcı' }}</div>
                  <div class="text-[11px] text-gray-500">{{ ticket.user_email }}</div>
                </div>
              </div>
            </div>

            <div class="h-px bg-gray-100"></div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <div class="text-[10px] text-gray-400 font-semibold mb-0.5">Kategori</div>
                <div class="text-[12px] font-bold text-gray-700">{{ ticket.category_name }}</div>
              </div>
              <div>
                <div class="text-[10px] text-gray-400 font-semibold mb-0.5">Alt Kategori</div>
                <div class="text-[12px] font-bold text-gray-700">{{ ticket.subcategory_name }}</div>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <div class="text-[10px] text-gray-400 font-semibold mb-0.5">Öncelik</div>
                <div class="text-[12px] font-bold" :class="ticket.priority === 'Acil' ? 'text-red-600' : 'text-gray-700'">{{ ticket.priority }}</div>
              </div>
              <div>
                <div class="text-[10px] text-gray-400 font-semibold mb-0.5">Oluşturulma</div>
                <div class="text-[12px] font-bold text-gray-700">{{ fmtDateShort(ticket.created_at) }}</div>
              </div>
            </div>

            <div v-if="ticket.assigned_name" class="p-3 bg-blue-50/50 rounded-lg border border-blue-100">
              <div class="text-[10px] text-blue-400 font-bold uppercase tracking-wide mb-1">İlgilenen Teknisyen</div>
              <div class="text-[13px] font-bold text-blue-900 flex items-center gap-2">
                <i class="fas fa-user-shield text-blue-500"></i> {{ ticket.assigned_name }}
              </div>
            </div>
            <div v-else class="p-3 bg-amber-50/50 rounded-lg border border-amber-100 text-[12px] text-amber-700 font-semibold text-center">
              Henüz teknisyen atanmadı.
            </div>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, computed } from 'vue'
import { useRoute } from 'vue-router'
import api from '../../api'
import { useToast } from '../../composables/useToast'
import { useAuthStore } from '../../stores/auth'

const route = useRoute()
const { showToast } = useToast()
const authStore = useAuthStore()

const ticket = ref(null)
const messages = ref([])
const newMessage = ref('')
const files = ref([])
const isInternal = ref(false)
const statusSelect = ref('')

const isAdminOrTech = computed(() => authStore.hasPermission('helpdesk:manage'))

const getStatusColor = (status) => {
  switch (status) {
    case 'Açık': return { badge: 'bg-red-100 text-red-700' }
    case 'İşlemde': return { badge: 'bg-blue-100 text-blue-700' }
    case 'Beklemede': return { badge: 'bg-amber-100 text-amber-700' }
    case 'Çözüldü': return { badge: 'bg-emerald-100 text-emerald-700' }
    case 'Kapalı': return { badge: 'bg-gray-200 text-gray-700' }
    default: return { badge: 'bg-gray-100 text-gray-600' }
  }
}

const fmtTime = (d) => {
  if (!d) return ''
  return new Date(d).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
}

const fmtDateShort = (d) => {
  if (!d) return ''
  return new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' }) + ' ' + fmtTime(d)
}

const scrollToBottom = async () => {
  await nextTick()
  const el = document.getElementById('messagesContainer')
  if (el) el.scrollTop = el.scrollHeight
}

const loadTicket = async () => {
  try {
    const res = await api.get(`/api/helpdesk/tickets/${route.params.id}`)
    ticket.value = res.data.ticket
    messages.value = res.data.messages
    statusSelect.value = ticket.value.status
    scrollToBottom()
  } catch (err) {
    showToast('Talep yüklenemedi.', 'error')
  }
}

const handleFileChange = (e) => {
  files.value = Array.from(e.target.files).slice(0, 5)
}

const sendMessage = async () => {
  if (!newMessage.value.trim() && files.value.length === 0) return
  
  try {
    const formData = new FormData()
    formData.append('message', newMessage.value)
    formData.append('is_internal', isInternal.value)
    
    for (let f of files.value) {
      formData.append('attachments', f)
    }

    await api.post(`/api/helpdesk/tickets/${ticket.value.id}/messages`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    
    newMessage.value = ''
    files.value = []
    isInternal.value = false
    await loadTicket()
  } catch (err) {
    showToast('Mesaj gönderilemedi.', 'error')
  }
}

const assignTicket = async () => {
  try {
    await api.put(`/api/helpdesk/tickets/${ticket.value.id}/assign`)
    showToast('Talep üzerinize alındı.', 'success')
    await loadTicket()
  } catch (err) {
    showToast('Atama yapılamadı.', 'error')
  }
}

const updateStatus = async () => {
  try {
    await api.put(`/api/helpdesk/tickets/${ticket.value.id}/status`, { status: statusSelect.value })
    showToast('Durum güncellendi.', 'success')
    await loadTicket()
  } catch (err) {
    showToast('Durum güncellenemedi.', 'error')
  }
}

onMounted(() => {
  loadTicket()
})
</script>
