<template>
  <div class="h-full flex flex-col bg-white overflow-hidden">
    <!-- HEADER -->
    <header class="h-14 border-b border-gray-100 flex items-center px-6 justify-between bg-white shrink-0">
      <div class="flex items-center gap-2">
        <h1 class="text-[15px] font-bold text-gray-900">Taleplerim</h1>
      </div>
      <button @click="showNewTicketModal = true" class="px-4 py-2 bg-blue-600 text-white text-[12px] font-bold rounded-lg hover:bg-blue-700 shadow-sm transition-all active:scale-95 flex items-center gap-2">
        <i class="fas fa-plus"></i> Yeni Talep
      </button>
    </header>

    <!-- MAIN CONTENT -->
    <main class="flex-1 overflow-y-auto bg-gray-50/40 p-6">
      <div v-if="loading" class="flex items-center justify-center h-64 text-gray-300">
        <i class="fas fa-circle-notch fa-spin text-3xl"></i>
      </div>

      <div v-else class="max-w-5xl mx-auto">
        <div v-if="tickets.length === 0" class="bg-white border border-gray-100 rounded-xl p-8 text-center shadow-sm">
          <i class="fas fa-ticket-alt text-4xl text-gray-200 mb-3"></i>
          <h3 class="text-gray-900 font-bold text-sm mb-1">Talebiniz Bulunmuyor</h3>
          <p class="text-gray-400 text-xs mb-4">Şu an için açılmış bir destek talebiniz görünmüyor.</p>
          <button @click="showNewTicketModal = true" class="px-5 py-2 bg-blue-50 text-blue-600 text-[12px] font-bold rounded-lg hover:bg-blue-100 transition-colors">
            Yeni Talep Aç
          </button>
        </div>

        <div v-else class="grid gap-3">
          <router-link
            v-for="ticket in tickets"
            :key="ticket.id"
            :to="'/helpdesk/ticket/' + ticket.id"
            class="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-all flex items-center gap-4 group"
          >
            <div class="w-12 h-12 rounded-full flex items-center justify-center shrink-0" :class="getStatusColor(ticket.status).bg">
              <i :class="['fas text-lg', getStatusColor(ticket.status).icon, getStatusColor(ticket.status).text]"></i>
            </div>
            
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-[11px] font-mono font-bold text-gray-400">{{ ticket.ticket_no }}</span>
                <span class="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider" :class="getStatusColor(ticket.status).badge">
                  {{ ticket.status }}
                </span>
                <span v-if="ticket.assigned_name" class="text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded font-medium ml-auto">
                  <i class="fas fa-user-tie mr-1 text-gray-400"></i> {{ ticket.assigned_name }}
                </span>
              </div>
              <h3 class="font-bold text-gray-900 text-[14px] truncate group-hover:text-blue-600 transition-colors">
                {{ ticket.title }}
              </h3>
              <div class="text-[12px] text-gray-500 flex items-center gap-3 mt-1">
                <span><i class="fas fa-folder-open mr-1 text-gray-300"></i> {{ ticket.category_name }} <i class="fas fa-angle-right text-[10px] mx-1"></i> {{ ticket.subcategory_name }}</span>
                <span><i class="far fa-clock mr-1 text-gray-300"></i> {{ fmtDate(ticket.created_at) }}</span>
              </div>
            </div>
          </router-link>
        </div>
      </div>
    </main>

    <!-- NEW TICKET MODAL -->
    <Teleport to="body">
      <div v-if="showNewTicketModal" class="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" @click.self="showNewTicketModal = false">
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
          <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
            <h3 class="text-[16px] font-bold text-gray-900 flex items-center gap-2">
              <i class="fas fa-plus-circle text-blue-500"></i> Yeni Destek Talebi
            </h3>
            <button @click="showNewTicketModal = false" class="text-gray-400 hover:text-gray-600">
              <i class="fas fa-times text-lg"></i>
            </button>
          </div>
          
          <div class="p-6 overflow-y-auto flex-1">
            <form id="ticketForm" @submit.prevent="submitTicket" class="space-y-5">
              
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">Kategori <span class="text-red-500">*</span></label>
                  <select v-model="form.category_id" required class="w-full h-10 px-3 text-[13px] border border-gray-200 rounded-lg outline-none focus:border-blue-500 transition-all bg-white">
                    <option value="" disabled>Kategori Seçin</option>
                    <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }} ({{ c.type }})</option>
                  </select>
                </div>
                <div>
                  <label class="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">Alt Kategori <span class="text-red-500">*</span></label>
                  <select v-model="form.subcategory_id" required :disabled="!form.category_id" class="w-full h-10 px-3 text-[13px] border border-gray-200 rounded-lg outline-none focus:border-blue-500 transition-all bg-white disabled:bg-gray-50 disabled:text-gray-400">
                    <option value="" disabled>Alt Kategori Seçin</option>
                    <option v-for="s in filteredSubcategories" :key="s.id" :value="s.id">{{ s.name }}</option>
                  </select>
                </div>
              </div>

              <div>
                <label class="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">Konu Başlığı <span class="text-red-500">*</span></label>
                <div class="flex gap-3">
                  <input v-model="form.title" required type="text" class="flex-1 h-10 px-3 text-[13px] border border-gray-200 rounded-lg outline-none focus:border-blue-500 transition-all" placeholder="Örn: Bilgisayarım açılmıyor">
                  
                  <select v-model="form.priority" class="w-36 h-10 px-3 text-[13px] border border-gray-200 rounded-lg outline-none focus:border-blue-500 transition-all bg-white font-semibold">
                    <option value="Düşük">🟢 Düşük</option>
                    <option value="Normal">🔵 Normal</option>
                    <option value="Yüksek">🔴 Yüksek</option>
                  </select>
                </div>
              </div>

              <div>
                <label class="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">Açıklama <span class="text-red-500">*</span></label>
                <textarea v-model="form.description" required rows="5" class="w-full p-3 text-[13px] border border-gray-200 rounded-lg outline-none focus:border-blue-500 transition-all resize-none" placeholder="Lütfen sorununuzu detaylı bir şekilde açıklayın..."></textarea>
              </div>

              <div>
                <label class="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">Ekler (İsteğe Bağlı)</label>
                <input type="file" multiple @change="handleFileChange" class="w-full text-[12px] text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[11px] file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all">
                <p class="text-[10px] text-gray-400 mt-1">Ekran görüntüsü, fotoğraf veya kısa videolar ekleyebilirsiniz. (Maks 5 dosya)</p>
              </div>
            </form>
          </div>

          <div class="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50 shrink-0">
            <button @click="showNewTicketModal = false" type="button" class="px-5 py-2 text-[13px] font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors">
              İptal
            </button>
            <button form="ticketForm" type="submit" :disabled="submitting" class="px-6 py-2 bg-blue-600 text-white text-[13px] font-bold rounded-lg hover:bg-blue-700 shadow-sm transition-all flex items-center gap-2 disabled:opacity-60">
              <i v-if="submitting" class="fas fa-spinner fa-spin"></i>
              <i v-else class="fas fa-paper-plane"></i>
              {{ submitting ? 'Gönderiliyor...' : 'Talebi Gönder' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import api from '../../api'
import { useToast } from '../../composables/useToast'

const { showToast } = useToast()
const loading = ref(true)
const tickets = ref([])
const showNewTicketModal = ref(false)
const submitting = ref(false)

const categories = ref([])
const subcategories = ref([])

const form = ref({
  category_id: '',
  subcategory_id: '',
  title: '',
  description: '',
  priority: 'Normal',
  files: []
})

const filteredSubcategories = computed(() => {
  if (!form.value.category_id) return []
  return subcategories.value.filter(s => s.category_id === form.value.category_id)
})

const fmtDate = (d) => {
  if (!d) return ''
  const date = new Date(d)
  return date.toLocaleDateString('tr-TR') + ' ' + date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
}

const getStatusColor = (status) => {
  switch (status) {
    case 'Açık': return { bg: 'bg-red-50', text: 'text-red-500', icon: 'fa-exclamation-circle', badge: 'bg-red-100 text-red-700' }
    case 'İşlemde': return { bg: 'bg-blue-50', text: 'text-blue-500', icon: 'fa-tools', badge: 'bg-blue-100 text-blue-700' }
    case 'Beklemede': return { bg: 'bg-amber-50', text: 'text-amber-500', icon: 'fa-pause-circle', badge: 'bg-amber-100 text-amber-700' }
    case 'Çözüldü': return { bg: 'bg-emerald-50', text: 'text-emerald-500', icon: 'fa-check-circle', badge: 'bg-emerald-100 text-emerald-700' }
    case 'Kapalı': return { bg: 'bg-gray-100', text: 'text-gray-500', icon: 'fa-lock', badge: 'bg-gray-200 text-gray-700' }
    default: return { bg: 'bg-gray-50', text: 'text-gray-500', icon: 'fa-ticket-alt', badge: 'bg-gray-100 text-gray-600' }
  }
}

const loadData = async () => {
  loading.value = true
  try {
    const [metaRes, ticketsRes] = await Promise.all([
      api.get('/api/helpdesk/metadata'),
      api.get('/api/helpdesk/my-tickets')
    ])
    categories.value = metaRes.data.categories || []
    subcategories.value = metaRes.data.subcategories || []
    tickets.value = ticketsRes.data || []
  } catch (err) {
    showToast('Veriler alınırken hata oluştu.', 'error')
  } finally {
    loading.value = false
  }
}

const handleFileChange = (e) => {
  form.value.files = Array.from(e.target.files).slice(0, 5) // Maks 5
}

const submitTicket = async () => {
  submitting.value = true
  try {
    const formData = new FormData()
    formData.append('category_id', form.value.category_id)
    formData.append('subcategory_id', form.value.subcategory_id)
    formData.append('title', form.value.title)
    formData.append('description', form.value.description)
    formData.append('priority', form.value.priority)
    
    for (let f of form.value.files) {
      formData.append('attachments', f)
    }

    await api.post('/api/helpdesk/tickets', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    
    showToast('Talebiniz başarıyla oluşturuldu.', 'success')
    showNewTicketModal.value = false
    form.value = { category_id: '', subcategory_id: '', title: '', description: '', priority: 'Normal', files: [] }
    await loadData()
  } catch (err) {
    showToast(err.response?.data?.error || 'Talep oluşturulamadı.', 'error')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>
