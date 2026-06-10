<template>
  <div class="h-full flex flex-col bg-[#f8f9fa] overflow-hidden">
    <!-- HEADER -->
    <header class="h-12 border-b border-[#dadce0] flex items-center px-6 justify-between bg-white shrink-0 sticky top-0 z-50">
      <div class="flex items-center gap-2">
        <h1 class="text-xl font-medium text-[#202124]">Taleplerim</h1>
      </div>
      <button @click="showNewTicketModal = true" class="h-9 px-4 bg-[#1a73e8] text-white text-sm font-medium rounded hover:bg-[#174ea6] transition-colors flex items-center gap-2">
        <i class="fas fa-plus text-xs"></i> Yeni Talep
      </button>
    </header>

    <!-- MAIN CONTENT -->
    <main class="flex-1 overflow-y-auto p-6 space-y-6">
      <div v-if="loading" class="flex items-center justify-center h-64 text-gray-300">
        <i class="fas fa-circle-notch fa-spin text-3xl"></i>
      </div>

      <div v-else class="max-w-5xl mx-auto space-y-6">
        <!-- STATS CARDS -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="bg-white border border-[#dadce0] rounded-md p-5 flex items-center justify-between">
            <div>
              <p class="text-xs font-medium text-[#5f6368] uppercase tracking-wide mb-1">Toplam Talep</p>
              <p class="text-2xl font-medium text-[#202124]">{{ stats.total }}</p>
            </div>
            <div class="w-10 h-10 bg-[#f1f3f4] rounded-md flex items-center justify-center">
              <i class="fas fa-ticket-alt text-[#5f6368]"></i>
            </div>
          </div>
          <div class="bg-white border border-[#dadce0] rounded-md p-5 flex items-center justify-between">
            <div>
              <p class="text-xs font-medium text-[#5f6368] uppercase tracking-wide mb-1">Aktif Talepler</p>
              <p class="text-2xl font-medium text-[#202124]">{{ stats.active }}</p>
            </div>
            <div class="w-10 h-10 bg-[#e8f0fe] rounded-md flex items-center justify-center">
              <i class="fas fa-clock text-[#1a73e8]"></i>
            </div>
          </div>
          <div class="bg-white border border-[#dadce0] rounded-md p-5 flex items-center justify-between">
            <div>
              <p class="text-xs font-medium text-[#5f6368] uppercase tracking-wide mb-1">Çözülen / Kapatılan</p>
              <p class="text-2xl font-medium text-[#202124]">{{ stats.completed }}</p>
            </div>
            <div class="w-10 h-10 bg-[#e6f4ea] rounded-md flex items-center justify-center">
              <i class="fas fa-check-circle text-[#34a853]"></i>
            </div>
          </div>
        </div>

        <!-- SEARCH & FILTERS -->
        <div class="bg-white border border-[#dadce0] rounded-md p-4 flex flex-col md:flex-row gap-4 items-center">
          <div class="relative flex-1 w-full">
            <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
              <i class="fas fa-search text-xs"></i>
            </span>
            <input v-model="searchQuery" type="text" placeholder="Talep no veya konu ara..." class="w-full h-9 border border-[#dadce0] pl-8 pr-3 rounded text-sm text-[#202124] bg-white outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] transition-colors placeholder-[#9aa0a6]">
          </div>
          <div class="flex flex-wrap gap-3 w-full md:w-auto">
            <select v-model="selectedCategory" class="h-9 border border-[#dadce0] px-3 rounded text-sm text-[#202124] bg-white outline-none focus:border-[#1a73e8] transition-colors">
              <option value="">Kategori: Tümü</option>
              <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
            <select v-model="selectedStatus" class="h-9 border border-[#dadce0] px-3 rounded text-sm text-[#202124] bg-white outline-none focus:border-[#1a73e8] transition-colors">
              <option value="">Durum: Tümü</option>
              <option value="Açık">Açık</option>
              <option value="İşlemde">İşlemde</option>
              <option value="Beklemede">Beklemede</option>
              <option value="Çözüldü">Çözüldü</option>
              <option value="Kapalı">Kapalı</option>
            </select>
            <select v-model="selectedPriority" class="h-9 border border-[#dadce0] px-3 rounded text-sm text-[#202124] bg-white outline-none focus:border-[#1a73e8] transition-colors">
              <option value="">Öncelik: Tümü</option>
              <option value="Düşük">Düşük</option>
              <option value="Normal">Normal</option>
              <option value="Yüksek">Yüksek</option>
              <option value="Acil">Acil</option>
            </select>
          </div>
        </div>

        <!-- LIST -->
        <div v-if="filteredTickets.length === 0" class="bg-white border border-[#dadce0] rounded-md p-8 text-center">
          <div class="w-16 h-16 bg-[#f1f3f4] rounded-md flex items-center justify-center mx-auto mb-3">
            <i class="fas fa-inbox text-2xl text-[#9aa0a6]"></i>
          </div>
          <h3 class="text-sm font-medium text-[#202124] mb-1">Talep bulunamadı</h3>
          <p class="text-xs text-[#5f6368] mb-4">Arama kriterlerinizi değiştirin ya da yeni bir kayıt oluşturun.</p>
          <button @click="showNewTicketModal = true" class="h-9 px-4 bg-white text-sm font-medium text-[#1a73e8] border border-[#dadce0] rounded hover:bg-[#f1f3f4] transition-colors">
            Yeni Talep Aç
          </button>
        </div>

        <div v-else class="grid gap-3">
          <router-link
            v-for="ticket in filteredTickets"
            :key="ticket.id"
            :to="'/helpdesk/ticket/' + ticket.id"
            class="bg-white border border-[#dadce0] rounded-md p-4 hover:border-[#bdc1c6] transition-colors flex items-center gap-4 group"
          >
            <div class="w-10 h-10 rounded flex items-center justify-center shrink-0" :class="getStatusColor(ticket.status).bg">
              <i :class="['fas text-sm', getStatusColor(ticket.status).icon, getStatusColor(ticket.status).text]"></i>
            </div>
            
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-xs font-mono font-medium text-[#5f6368]">{{ ticket.ticket_no }}</span>
                <span class="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded border" :class="getStatusColor(ticket.status).badge">
                  {{ ticket.status }}
                </span>
                <span class="text-xs text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded">
                  {{ ticket.ticket_type || 'İş Talebi' }}
                </span>
                <span v-if="ticket.assigned_name" class="text-xs text-[#5f6368] bg-[#f1f3f4] px-2 py-0.5 rounded font-medium ml-auto">
                  <i class="fas fa-user-tie mr-1 text-[#5f6368]"></i> {{ ticket.assigned_name }}
                </span>
              </div>
              <h3 class="text-sm font-medium text-[#202124] truncate group-hover:text-[#1a73e8] transition-colors">
                {{ ticket.title }}
              </h3>
              <div class="text-xs text-[#5f6368] flex items-center gap-3 mt-1">
                <span><i class="fas fa-building mr-1 text-gray-400"></i> İlgili: {{ ticket.related_dep_name || 'Belirlenmedi' }}</span>
                <span><i class="fas fa-folder-open mr-1 text-gray-400"></i> {{ ticket.category_name }} <i class="fas fa-angle-right text-[10px] mx-1 text-gray-400"></i> {{ ticket.subcategory_name }}</span>
                <span><i class="far fa-clock mr-1 text-gray-400"></i> {{ fmtDate(ticket.created_at) }}</span>
              </div>
            </div>
          </router-link>
        </div>
      </div>
    </main>

    <!-- NEW TICKET MODAL (Görsel Referanstaki Tasarım) -->
    <Teleport to="body">
      <div v-if="showNewTicketModal" class="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-[#202124]/50" @click.self="showNewTicketModal = false">
        <div class="relative bg-white border border-[#dadce0] rounded-md shadow-md w-full max-w-3xl flex flex-col max-h-[95vh] overflow-hidden">
          <div class="px-6 py-4 border-b border-[#dadce0] bg-[#f8f9fa] flex items-center justify-between shrink-0">
            <h3 class="text-base font-medium text-[#202124] flex items-center gap-2">
              <i class="fas fa-plus-circle text-[#1a73e8]"></i> Yeni Destek Talebi
            </h3>
            <button @click="showNewTicketModal = false" class="text-[#5f6368] hover:text-[#202124] transition-colors">
              <i class="fas fa-times text-base"></i>
            </button>
          </div>
          
          <div class="px-6 py-5 overflow-y-auto flex-1 space-y-4">
            <form id="ticketForm" @submit.prevent="submitTicket" class="space-y-4">
              
              <!-- Row 1: Talep No & İlgili -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-medium text-[#5f6368] uppercase tracking-wide mb-1.5">Talep No:</label>
                  <input type="text" value="Belirlenmedi" disabled class="w-full h-9 border border-[#dadce0] px-3 rounded text-sm text-[#5f6368] bg-[#f1f3f4] outline-none">
                </div>
                <div>
                  <label class="block text-xs font-medium text-[#5f6368] uppercase tracking-wide mb-1.5">İlgili (Departman) <span class="text-red-500">*</span></label>
                  <select v-model="form.related_dep_id" required class="w-full h-9 border border-[#dadce0] px-3 rounded text-sm text-[#202124] bg-white outline-none focus:border-[#1a73e8] transition-colors">
                    <option value="" disabled>Seçiniz</option>
                    <option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name }}</option>
                  </select>
                </div>
              </div>

              <!-- Row 2: Talep Türü & Öncelik -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-medium text-[#5f6368] uppercase tracking-wide mb-1.5">Talep Türü <span class="text-red-500">*</span></label>
                  <select v-model="form.ticket_type" required class="w-full h-9 border border-[#dadce0] px-3 rounded text-sm text-[#202124] bg-white outline-none focus:border-[#1a73e8] transition-colors">
                    <option value="" disabled>Seçiniz</option>
                    <option value="İş Talebi">İş Talebi</option>
                    <option value="Arıza">Arıza</option>
                    <option value="Değişiklik">Değişiklik</option>
                    <option value="Bilgi / Soru">Bilgi / Soru</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-medium text-[#5f6368] uppercase tracking-wide mb-1.5">Öncelik Derecesi <span class="text-red-500">*</span></label>
                  <select v-model="form.priority" required class="w-full h-9 border border-[#dadce0] px-3 rounded text-sm text-[#202124] bg-white outline-none focus:border-[#1a73e8] transition-colors">
                    <option value="" disabled>Seçiniz</option>
                    <option value="Düşük">🟢 Düşük</option>
                    <option value="Normal">🔵 Normal</option>
                    <option value="Yüksek">🔴 Yüksek</option>
                    <option value="Acil">⚡ Acil</option>
                  </select>
                </div>
              </div>

              <!-- Row 3: Konu Başlığı & Durum -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-medium text-[#5f6368] uppercase tracking-wide mb-1.5">Konu Başlığı <span class="text-red-500">*</span></label>
                  <input v-model="form.title" required type="text" class="w-full h-9 border border-[#dadce0] px-3 rounded text-sm text-[#202124] bg-white outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] transition-colors" placeholder="Örn: Bilgisayar açılmıyor">
                </div>
                <div>
                  <label class="block text-xs font-medium text-[#5f6368] uppercase tracking-wide mb-1.5">Talep Durumu:</label>
                  <input type="text" value="Kayıt Aşamasında" disabled class="w-full h-9 border border-[#dadce0] px-3 rounded text-sm text-[#5f6368] bg-[#f1f3f4] outline-none">
                </div>
              </div>

              <!-- Row 4: Kategori & Alt Kategori -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-medium text-[#5f6368] uppercase tracking-wide mb-1.5">Kategori <span class="text-red-500">*</span></label>
                  <select v-model="form.category_id" required class="w-full h-9 border border-[#dadce0] px-3 rounded text-sm text-[#202124] bg-white outline-none focus:border-[#1a73e8] transition-colors">
                    <option value="" disabled>Seçiniz</option>
                    <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-medium text-[#5f6368] uppercase tracking-wide mb-1.5">Alt Kategori <span class="text-red-500">*</span></label>
                  <select v-model="form.subcategory_id" required :disabled="!form.category_id" class="w-full h-9 border border-[#dadce0] px-3 rounded text-sm text-[#202124] bg-white outline-none focus:border-[#1a73e8] transition-colors disabled:bg-[#f1f3f4] disabled:text-[#9aa0a6]">
                    <option value="" disabled>Seçiniz</option>
                    <option v-for="s in filteredSubcategories" :key="s.id" :value="s.id">{{ s.name }}</option>
                  </select>
                </div>
              </div>

              <!-- Detay Metni -->
              <div>
                <label class="block text-xs font-medium text-[#5f6368] uppercase tracking-wide mb-1.5">Detay Metni <span class="text-red-500">*</span></label>
                <textarea v-model="form.description" required rows="5" class="w-full border border-[#dadce0] px-3 py-2 rounded text-sm text-[#202124] bg-white outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] transition-colors resize-none" placeholder="Lütfen sorununuzu detaylı bir şekilde açıklayın..."></textarea>
              </div>

              <!-- Dokümanlar Yükleme Alanı -->
              <div class="space-y-2">
                <label class="block text-xs font-medium text-[#5f6368] uppercase tracking-wide">Dokümanlar</label>
                <div class="border-2 border-dashed border-[#dadce0] rounded p-6 text-center hover:bg-[#f8f9fa] transition-colors cursor-pointer relative" @dragover.prevent @drop.prevent="onFileDrop" @click="triggerFileInput">
                  <i class="fas fa-cloud-upload-alt text-2xl text-gray-400 mb-2 animate-bounce"></i>
                  <p class="text-xs text-[#5f6368]">Doküman eklemek için dokümanı buraya sürükleyin veya <span class="text-[#1a73e8] font-medium">tıklayın...</span></p>
                  <input type="file" ref="fileInputRef" multiple @change="handleFileChange" class="hidden">
                </div>
                <!-- Seçilen Dosyaların Önizlemesi -->
                <div v-if="form.files.length > 0" class="mt-2 space-y-1">
                  <div v-for="(f, idx) in form.files" :key="idx" class="text-xs text-[#1a73e8] bg-[#e8f0fe] px-2.5 py-1 rounded flex justify-between items-center">
                    <span><i class="fas fa-file-alt mr-1"></i> {{ f.name }} ({{ (f.size / 1024).toFixed(1) }} KB)</span>
                    <button type="button" @click.stop="removeSelectedFile(idx)" class="text-[#ea4335]"><i class="fas fa-times"></i></button>
                  </div>
                </div>
              </div>
            </form>
          </div>

          <div class="px-6 py-4 border-t border-[#dadce0] bg-[#f8f9fa] flex justify-end gap-3 shrink-0">
            <button @click="showNewTicketModal = false" type="button" class="h-9 px-4 bg-white text-[#3c4043] text-sm font-medium rounded border border-[#dadce0] hover:bg-[#f1f3f4] transition-colors">
              İptal
            </button>
            <button form="ticketForm" type="submit" :disabled="submitting" class="h-9 px-4 bg-[#1a73e8] text-white text-sm font-medium rounded hover:bg-[#174ea6] transition-colors flex items-center gap-2 disabled:opacity-60">
              <i v-if="submitting" class="fas fa-spinner fa-spin"></i>
              <i v-else class="fas fa-save"></i>
              {{ submitting ? 'Kaydediliyor...' : 'Kaydet' }}
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
const departments = ref([])

const searchQuery = ref('')
const selectedCategory = ref('')
const selectedStatus = ref('')
const selectedPriority = ref('')

const fileInputRef = ref(null)

const form = ref({
  category_id: '',
  subcategory_id: '',
  related_dep_id: '',
  ticket_type: 'İş Talebi',
  title: '',
  description: '',
  priority: 'Normal',
  files: []
})

const stats = computed(() => {
  const total = tickets.value.length;
  const active = tickets.value.filter(t => ['Açık', 'İşlemde', 'Beklemede'].includes(t.status)).length;
  const completed = tickets.value.filter(t => ['Çözüldü', 'Kapalı'].includes(t.status)).length;
  return { total, active, completed };
})

const filteredTickets = computed(() => {
  return tickets.value.filter(ticket => {
    const matchesQuery = !searchQuery.value.trim() || 
      ticket.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      ticket.ticket_no.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      (ticket.description && ticket.description.toLowerCase().includes(searchQuery.value.toLowerCase()));
      
    const matchesCategory = !selectedCategory.value || ticket.category_id === parseInt(selectedCategory.value);
    const matchesStatus = !selectedStatus.value || ticket.status === selectedStatus.value;
    const matchesPriority = !selectedPriority.value || ticket.priority === selectedPriority.value;
    
    return matchesQuery && matchesCategory && matchesStatus && matchesPriority;
  });
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
    case 'Açık': return { bg: 'bg-[#fce8e6]', text: 'text-[#c5221f]', icon: 'fa-exclamation-circle', badge: 'bg-[#fce8e6] text-[#c5221f] border-[#ea4335]/30' }
    case 'İşlemde': return { bg: 'bg-[#e8f0fe]', text: 'text-[#1a73e8]', icon: 'fa-tools', badge: 'bg-[#e8f0fe] text-[#1a73e8] border-[#1a73e8]/30' }
    case 'Beklemede': return { bg: 'bg-[#fef7e0]', text: 'text-[#b06000]', icon: 'fa-pause-circle', badge: 'bg-[#fef7e0] text-[#b06000] border-[#fbbc04]/30' }
    case 'Çözüldü': return { bg: 'bg-[#e6f4ea]', text: 'text-[#137333]', icon: 'fa-check-circle', badge: 'bg-[#e6f4ea] text-[#137333] border-[#34a853]/30' }
    case 'Kapalı': return { bg: 'bg-[#f1f3f4]', text: 'text-[#5f6368]', icon: 'fa-lock', badge: 'bg-[#f1f3f4] text-[#5f6368] border-[#dadce0]' }
    default: return { bg: 'bg-[#f1f3f4]', text: 'text-[#5f6368]', icon: 'fa-ticket-alt', badge: 'bg-[#f1f3f4] text-[#5f6368] border-[#dadce0]' }
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
    departments.value = metaRes.data.departments || []
    tickets.value = ticketsRes.data || []
  } catch (err) {
    showToast('Veriler alınırken hata oluştu.', 'error')
  } finally {
    loading.value = false
  }
}

const triggerFileInput = () => {
  if (fileInputRef.value) fileInputRef.value.click()
}

const handleFileChange = (e) => {
  form.value.files = Array.from(e.target.files).slice(0, 5)
}

const onFileDrop = (e) => {
  if (e.dataTransfer.files) {
    form.value.files = Array.from(e.dataTransfer.files).slice(0, 5)
  }
}

const removeSelectedFile = (index) => {
  form.value.files.splice(index, 1)
}

const submitTicket = async () => {
  submitting.value = true
  try {
    const formData = new FormData()
    formData.append('category_id', form.value.category_id)
    formData.append('subcategory_id', form.value.subcategory_id)
    formData.append('related_dep_id', form.value.related_dep_id)
    formData.append('ticket_type', form.value.ticket_type)
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
    form.value = { category_id: '', subcategory_id: '', related_dep_id: '', ticket_type: 'İş Talebi', title: '', description: '', priority: 'Normal', files: [] }
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
