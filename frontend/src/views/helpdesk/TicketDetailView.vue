<template>
  <div class="h-full flex flex-col bg-[#f8f9fa] overflow-hidden" v-if="ticket">
    
    <!-- PREMIUM HEADER (Görsel Referansa Birebir Uygun) -->
    <div class="bg-white border-b border-[#dadce0] px-6 py-4 flex flex-col gap-4 shrink-0">
      
      <!-- Top Row: Icon, Title & Actions -->
      <div class="flex items-start justify-between gap-4">
        <div class="flex items-center gap-4 min-w-0">
          <button @click="$router.back()" class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#f1f3f4] text-[#5f6368] transition-colors shrink-0">
            <i class="fas fa-arrow-left"></i>
          </button>
          
          <!-- Orange Ticket Badge -->
          <div class="w-12 h-12 rounded-full bg-[#fef7e0] border border-[#fbbc04]/30 flex items-center justify-center text-[#b06000] shrink-0 text-xl shadow-sm">
            <i class="fas fa-ticket-alt"></i>
          </div>

          <div class="min-w-0">
            <h1 class="text-lg font-semibold text-[#202124] flex items-center gap-3 flex-wrap">
              <span class="text-[#5f6368] font-mono">#{{ ticket.ticket_no }}</span>
              <span>{{ ticket.title }}</span>
              <span class="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full border shadow-sm" :class="getStatusColor(ticket.status).badge">
                {{ ticket.status }}
              </span>
            </h1>
            <div class="text-xs text-[#5f6368] mt-1.5 flex items-center gap-2 flex-wrap">
              <span>yapan</span>
              <span class="font-semibold text-[#1a73e8]">{{ ticket.user_name }}</span>
              <span class="text-[#dadce0]">|</span>
              <span class="font-medium text-[#202124]">{{ ticket.user_company_name || ticket.user_department_name || 'Şirket Belirtilmedi' }}</span>
              <i class="far fa-comment-dots text-[#1a73e8] ml-1"></i>
              <span class="text-[#dadce0]">|</span>
              <span>Tarih</span>
              <span class="font-medium text-[#202124]">{{ fmtDateShort(ticket.created_at) }}</span>
              <span class="text-[#dadce0]">|</span>
              <span class="font-medium">Öngörülen Çözüm Tarihi :</span>
              <span class="font-semibold" :class="ticket.sla_due_at ? 'text-[#c5221f]' : 'text-gray-400'">
                {{ ticket.sla_due_at ? fmtDateShort(ticket.sla_due_at) : 'Yok (Belirtilmedi)' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Ticket Assign / Status Quick Actions -->
        <div v-if="isAdminOrTech" class="flex items-center gap-2 shrink-0">
          <button v-if="ticket.status === 'Açık'" @click="assignTicket" class="h-9 px-4 bg-[#1a73e8] text-white text-sm font-medium rounded hover:bg-[#174ea6] transition-colors shadow-sm">
            Üzerime Al
          </button>
          <div v-else class="flex items-center gap-2">
            <span class="text-xs text-[#5f6368] font-medium">Durum:</span>
            <select :value="ticket.status" @change="handleStatusChange" class="h-9 border border-[#dadce0] px-3 rounded text-sm text-[#202124] bg-white outline-none focus:border-[#1a73e8] transition-colors font-medium shadow-sm">
              <option value="İşlemde">İşlemde</option>
              <option value="Beklemede">Beklemede</option>
              <option value="Çözüldü">Çözüldü</option>
              <option value="Kapalı">Kapalı</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Tab Bar Navigation (Görsel Referanstaki Ayrıntılar, Görevler, Kontrol Listesi, vb.) -->
      <div class="flex border-b border-[#dadce0] -mb-4 overflow-x-auto gap-6 text-sm shrink-0">
        <button 
          v-for="tab in tabs" 
          :key="tab.id"
          @click="activeTab = tab.id"
          class="pb-3 border-b-2 font-medium transition-all whitespace-nowrap"
          :class="[activeTab === tab.id ? 'border-[#1a73e8] text-[#1a73e8]' : 'border-transparent text-[#5f6368] hover:text-[#202124] hover:border-[#dadce0]']"
        >
          {{ tab.name }}
        </button>
      </div>

    </div>

    <!-- MAIN PANELS CONTAINER -->
    <div class="flex-1 min-h-0 overflow-hidden flex flex-col">

      <!-- TAB 1: AYRINTILAR (Detay + Dokümanlar + Chat) -->
      <div v-if="activeTab === 'details'" class="flex-1 flex min-h-0 overflow-hidden">
        
        <!-- Left Panel: Form Layout & Documents -->
        <div class="flex-1 flex flex-col p-6 overflow-y-auto border-r border-[#dadce0] space-y-6">
          
          <!-- Form Grid -->
          <div class="bg-white border border-[#dadce0] rounded-md p-6 space-y-4 shadow-sm">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-[#5f6368] uppercase tracking-wide mb-1">Talep No:</label>
                <input type="text" :value="ticket.ticket_no" disabled class="w-full h-9 border border-[#dadce0] px-3 rounded text-sm text-[#5f6368] bg-[#f8f9fa] outline-none">
              </div>
              <div>
                <label class="block text-xs font-medium text-[#5f6368] uppercase tracking-wide mb-1">İlgili (Departman):</label>
                <input type="text" :value="ticket.related_dep_name || 'Belirlenmedi'" disabled class="w-full h-9 border border-[#dadce0] px-3 rounded text-sm text-[#5f6368] bg-[#f8f9fa] outline-none">
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-[#5f6368] uppercase tracking-wide mb-1">Talep Türü:</label>
                <input type="text" :value="ticket.ticket_type || 'İş Talebi'" disabled class="w-full h-9 border border-[#dadce0] px-3 rounded text-sm text-[#5f6368] bg-[#f8f9fa] outline-none">
              </div>
              <div>
                <label class="block text-xs font-medium text-[#5f6368] uppercase tracking-wide mb-1">Öncelik Derecesi:</label>
                <input type="text" :value="ticket.priority" disabled class="w-full h-9 border border-[#dadce0] px-3 rounded text-sm text-[#5f6368] bg-[#f8f9fa] outline-none">
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-[#5f6368] uppercase tracking-wide mb-1">Konu Başlığı:</label>
                <input type="text" :value="ticket.title" disabled class="w-full h-9 border border-[#dadce0] px-3 rounded text-sm text-[#5f6368] bg-[#f8f9fa] outline-none">
              </div>
              <div>
                <label class="block text-xs font-medium text-[#5f6368] uppercase tracking-wide mb-1">Talep Durumu:</label>
                <input type="text" :value="ticket.status" disabled class="w-full h-9 border border-[#dadce0] px-3 rounded text-sm text-[#5f6368] bg-[#f8f9fa] outline-none">
              </div>
            </div>

            <div>
              <label class="block text-xs font-medium text-[#5f6368] uppercase tracking-wide mb-1">Detay Metni:</label>
              <textarea :value="ticket.description" disabled rows="5" class="w-full border border-[#dadce0] px-3 py-2 rounded text-sm text-[#5f6368] bg-[#f8f9fa] outline-none resize-none"></textarea>
            </div>
          </div>

          <!-- Documents Table -->
          <div class="bg-white border border-[#dadce0] rounded-md p-6 space-y-4 shadow-sm">
            <h3 class="text-sm font-medium text-[#202124]">Dokümanlar</h3>
            
            <div class="border border-dashed border-[#dadce0] rounded p-4 text-center hover:bg-[#f8f9fa] transition-colors cursor-pointer relative" @dragover.prevent @drop.prevent="onFileDrop" @click="triggerFileInput">
              <p class="text-xs text-[#5f6368]">Doküman eklemek için dokümanı buraya sürükleyin veya <span class="text-[#1a73e8] font-medium">tıklayın...</span></p>
              <input type="file" ref="fileInputRef" multiple @change="handleFileChange" class="hidden">
            </div>

            <div class="overflow-x-auto border border-[#dadce0] rounded">
              <table class="w-full text-sm border-collapse">
                <thead>
                  <tr class="bg-[#f8f9fa] border-b border-[#dadce0]">
                    <th class="px-4 py-3 text-left w-10">
                      <input type="checkbox" @change="toggleSelectAll" class="w-4 h-4 border border-[#dadce0] rounded text-[#1a73e8] outline-none">
                    </th>
                    <th class="text-left text-xs font-medium text-[#5f6368] uppercase px-4 py-3">Dosya</th>
                    <th class="text-left text-xs font-medium text-[#5f6368] uppercase px-4 py-3">Doküman Tipi</th>
                    <th class="text-left text-xs font-medium text-[#5f6368] uppercase px-4 py-3">Boyut</th>
                    <th class="text-left text-xs font-medium text-[#5f6368] uppercase px-4 py-3">Oluşturan</th>
                    <th class="text-left text-xs font-medium text-[#5f6368] uppercase px-4 py-3">Oluşturma Tarihi</th>
                  </tr>
                  <tr class="bg-white border-b border-[#dadce0]">
                    <td></td>
                    <td class="px-2 py-1.5">
                      <input v-model="fileFilter" type="text" placeholder="Dosya ara..." class="w-full h-7 border border-[#dadce0] px-2 rounded text-xs bg-white outline-none">
                    </td>
                    <td class="px-2 py-1.5">
                      <input v-model="typeFilter" type="text" placeholder="Tip ara..." class="w-full h-7 border border-[#dadce0] px-2 rounded text-xs bg-white outline-none">
                    </td>
                    <td colspan="3"></td>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="att in filteredAttachments" :key="att.id" class="bg-white border-b border-[#f1f3f4] hover:bg-[#f8f9fa] transition-colors">
                    <td class="px-4 py-3">
                      <input type="checkbox" :value="att.id" v-model="selectedAttachments" class="w-4 h-4 border border-[#dadce0] rounded text-[#1a73e8] outline-none">
                    </td>
                    <td class="px-4 py-3 text-[#1a73e8] font-medium">
                      <a :href="'http://localhost:3001' + att.file_path" target="_blank" class="hover:underline flex items-center gap-2">
                        <i class="fas fa-file-alt text-gray-400"></i> {{ att.file_name }}
                      </a>
                    </td>
                    <td class="px-4 py-3 text-[#5f6368] font-mono text-xs">{{ att.file_type || 'Bilinmiyor' }}</td>
                    <td class="px-4 py-3 text-[#5f6368]">{{ formatBytes(att.file_size) }}</td>
                    <td class="px-4 py-3 text-[#202124]">{{ att.uploader_name || 'Talep Sahibi' }}</td>
                    <td class="px-4 py-3 text-[#5f6368]">{{ fmtDateShort(att.created_at) }}</td>
                  </tr>
                  <tr v-if="filteredAttachments.length === 0">
                    <td colspan="6" class="text-center py-6 text-xs text-gray-400 italic">Eklenti bulunamadı.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="flex gap-2">
              <button @click="downloadSelected" :disabled="selectedAttachments.length === 0" class="h-8 px-3 bg-white text-[#1a73e8] border border-[#dadce0] text-xs font-medium rounded hover:bg-[#f1f3f4] transition-colors disabled:opacity-50 flex items-center gap-1.5">
                <i class="fas fa-download"></i> İndir
              </button>
              <button @click="deleteSelected" :disabled="selectedAttachments.length === 0" class="h-8 px-3 bg-white text-[#ea4335] border border-[#dadce0] text-xs font-medium rounded hover:bg-[#fce8e6] transition-colors disabled:opacity-50 flex items-center gap-1.5">
                <i class="fas fa-trash"></i> Sil
              </button>
              <button @click="sendEmailSelected" :disabled="selectedAttachments.length === 0 || emailSending" class="h-8 px-3 bg-white text-[#34a853] border border-[#dadce0] text-xs font-medium rounded hover:bg-[#e6f4ea] transition-colors disabled:opacity-50 flex items-center gap-1.5">
                <i :class="emailSending ? 'fas fa-spinner fa-spin' : 'fas fa-envelope'"></i>
                Bana E-Posta Gönder
              </button>
            </div>
          </div>
        </div>

        <!-- Right Panel: Live timer & WhatsApp-style chat timeline -->
        <div class="w-96 flex flex-col bg-white border-l border-[#dadce0]">
          <!-- Live work timer and SLA -->
          <div class="p-4 border-b border-[#dadce0] bg-[#f8f9fa] space-y-3 shrink-0">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium text-[#5f6368] uppercase tracking-wider">Çalışma Süresi</span>
              <span class="text-sm font-mono font-medium text-[#202124]">{{ formatSeconds(displayTotalSeconds) }}</span>
            </div>
            
            <div v-if="activeWorkLog" class="flex items-center justify-center gap-2 text-xs text-[#c5221f] font-medium animate-pulse bg-[#fce8e6] py-1 px-2 rounded border border-[#ea4335]/20">
              <span class="w-2.5 h-2.5 bg-[#ea4335] rounded-full"></span>
              <span>Aktif Çalışma: {{ formatSeconds(activeSeconds) }}</span>
            </div>

            <div v-if="isAdminOrTech" class="flex gap-2">
              <button v-if="!activeWorkLog" @click="startWorkTimer" class="flex-1 h-8 bg-[#1a73e8] text-white text-xs font-medium rounded hover:bg-[#174ea6] transition-colors flex items-center justify-center gap-2">
                <i class="fas fa-play text-[9px]"></i> Çalışmayı Başlat
              </button>
              <button v-else @click="stopWorkTimer" class="flex-1 h-8 bg-white text-[#ea4335] text-xs font-medium rounded border border-[#dadce0] hover:bg-[#fce8e6] transition-colors flex items-center justify-center gap-2">
                <i class="fas fa-pause text-[9px]"></i> Çalışmayı Durdur
              </button>
            </div>
          </div>

          <!-- Messages Timeline -->
          <div class="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50" id="messagesContainer">
            <div v-for="msg in messages" :key="msg.id" class="flex flex-col w-full" :class="[msg.user_id === authStore.userId ? 'items-end' : 'items-start']">
              <div v-if="!msg.user_id" class="self-center my-2">
                <span class="px-3 py-1 bg-white text-gray-500 text-[11px] font-medium rounded border border-gray-100 shadow-sm">
                  <i class="fas fa-info-circle mr-1 text-[#1a73e8]"></i> {{ msg.message }}
                </span>
              </div>
              <div v-else class="flex flex-col max-w-[85%]" :class="[msg.user_id === authStore.userId ? 'items-end' : 'items-start']">
                <div class="text-[10px] text-gray-400 mb-0.5 px-1 font-normal">
                  {{ msg.user_name }} • {{ fmtTime(msg.created_at) }}
                  <span v-if="msg.is_internal" class="text-[#b06000] ml-2 font-medium"><i class="fas fa-eye-slash text-[9px]"></i> Gizli</span>
                </div>
                <div class="p-3 rounded border text-xs leading-relaxed break-words"
                     :class="[
                       msg.is_internal ? 'bg-[#fef7e0] text-[#b06000] border-[#fbbc04]/30 rounded-bl-none' :
                       msg.user_id === authStore.userId ? 'bg-[#e8f0fe] text-[#1a73e8] border-[#1a73e8]/30 rounded-br-none' : 'bg-white border-[#dadce0] text-[#202124] rounded-bl-none'
                     ]">
                  <p class="whitespace-pre-wrap">{{ msg.message }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Message Input -->
          <div class="p-3 bg-white border-t border-[#dadce0] shrink-0">
            <form @submit.prevent="sendMessage" class="flex gap-2 items-end">
              <div class="flex-1 bg-white border border-[#dadce0] rounded p-1.5 focus-within:border-[#1a73e8] transition-all flex flex-col">
                <textarea v-model="newMessage" rows="2" class="w-full bg-transparent resize-none outline-none text-xs px-1 placeholder-[#9aa0a6] text-[#202124]" placeholder="Mesajınızı yazın..." @keydown.enter.exact.prevent="sendMessage"></textarea>
                <div class="flex items-center justify-between mt-1 pt-1.5 border-t border-[#f1f3f4]">
                  <div v-if="isAdminOrTech" class="flex items-center gap-1.5">
                    <label class="flex items-center gap-1 cursor-pointer">
                      <input type="checkbox" v-model="isInternal" class="w-3.5 h-3.5 border border-[#dadce0] rounded text-[#1a73e8] outline-none">
                      <span class="text-[10px] font-medium text-[#5f6368] select-none">Gizli Not</span>
                    </label>
                  </div>
                </div>
              </div>
              <button type="submit" :disabled="!newMessage.trim()" class="w-9 h-9 shrink-0 rounded bg-[#1a73e8] text-white flex items-center justify-center hover:bg-[#174ea6] transition-all disabled:opacity-50">
                <i class="fas fa-paper-plane text-[10px]"></i>
              </button>
            </form>
          </div>
        </div>

      </div>

      <!-- TAB 2: ÇÖZÜMLEME -->
      <div v-if="activeTab === 'resolve'" class="flex-1 overflow-y-auto p-6 max-w-4xl w-full mx-auto space-y-6">
        <div class="bg-white border border-[#dadce0] rounded-md p-6 shadow-sm space-y-6">
          <div class="flex items-center gap-3 border-b border-[#dadce0] pb-4">
            <div class="w-10 h-10 rounded-full bg-[#e6f4ea] text-[#137333] flex items-center justify-center text-lg">
              <i class="fas fa-check-circle"></i>
            </div>
            <div>
              <h2 class="text-base font-semibold text-[#202124]">Talep Çözüm Bilgileri</h2>
              <p class="text-xs text-[#5f6368]">Bu talebin çözümüne dair ayrıntılı bilgiler.</p>
            </div>
          </div>

          <!-- If ticket is resolved -->
          <div v-if="ticket.status === 'Çözüldü' || ticket.status === 'Kapalı'" class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span class="text-xs font-semibold text-[#5f6368] block uppercase">Çözüm Tarihi:</span>
                <span class="text-sm font-medium text-[#202124]">{{ ticket.resolved_at ? fmtDateShort(ticket.resolved_at) : '-' }}</span>
              </div>
              <div>
                <span class="text-xs font-semibold text-[#5f6368] block uppercase">Kapatılma Tarihi:</span>
                <span class="text-sm font-medium text-[#202124]">{{ ticket.closed_at ? fmtDateShort(ticket.closed_at) : 'Henüz kapatılmadı' }}</span>
              </div>
            </div>
            <div class="bg-[#f8f9fa] border border-[#dadce0] rounded p-4">
              <span class="text-xs font-semibold text-[#5f6368] block uppercase mb-2">Çözüm Açıklaması / Raporu:</span>
              <p class="text-sm text-[#202124] whitespace-pre-wrap leading-relaxed">{{ ticket.resolution_note || 'Açıklama girilmemiş.' }}</p>
            </div>
          </div>

          <!-- If ticket is not resolved (Inline resolution form) -->
          <div v-else class="space-y-4">
            <div class="bg-yellow-50 border border-yellow-100 rounded-md p-4 flex gap-3 text-yellow-800 text-xs leading-relaxed">
              <i class="fas fa-exclamation-triangle text-yellow-600 text-sm"></i>
              <div>
                <span class="font-semibold block mb-0.5">Talep Henüz Çözülmedi</span>
                Bu talebi sonuca ulaştırmak için aşağıdaki çözüm açıklamasını eksiksiz doldurarak bilet durumunu "Çözüldü" olarak işaretleyebilirsiniz. Kullanıcıya otomatik bildirim gönderilecektir.
              </div>
            </div>

            <div class="space-y-2">
              <label class="block text-xs font-semibold text-[#5f6368] uppercase">Çözüm Açıklaması (Zorunlu) *</label>
              <textarea v-model="resolutionNote" rows="6" class="w-full border border-[#dadce0] px-3 py-2 rounded text-sm text-[#202124] bg-white outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] transition-colors resize-none" placeholder="Sorunun nasıl çözüldüğünü açıklayınız..."></textarea>
            </div>

            <div class="flex justify-end gap-3 pt-2">
              <button @click="submitResolve" :disabled="!resolutionNote.trim()" class="h-9 px-5 bg-[#34a853] text-white text-sm font-medium rounded hover:bg-[#137333] transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm">
                <i class="fas fa-check"></i> Çözüldü İşaretle
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 3: GÖREVLER -->
      <div v-if="activeTab === 'tasks'" class="flex-1 overflow-y-auto p-6 max-w-4xl w-full mx-auto space-y-6">
        <div class="bg-white border border-[#dadce0] rounded-md p-6 shadow-sm space-y-6">
          <div class="flex items-center justify-between border-b border-[#dadce0] pb-4 flex-wrap gap-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center text-lg">
                <i class="fas fa-tasks"></i>
              </div>
              <div>
                <h2 class="text-base font-semibold text-[#202124]">Talep Alt Görevleri</h2>
                <p class="text-xs text-[#5f6368]">Bu talebin tamamlanması için oluşturulmuş teknik alt görevler.</p>
              </div>
            </div>
            
            <div class="text-xs font-medium text-[#1a73e8] bg-[#e8f0fe] py-1 px-3 rounded-full border border-[#1a73e8]/10">
              {{ tasks.filter(t => t.status === 'Completed').length }} / {{ tasks.length }} Tamamlandı
            </div>
          </div>

          <!-- Add Task Form -->
          <div v-if="isAdminOrTech" class="bg-[#f8f9fa] border border-[#dadce0] rounded p-4 flex gap-3 flex-wrap items-end">
            <div class="flex-1 min-w-[200px] space-y-1">
              <label class="block text-[11px] font-semibold text-[#5f6368] uppercase">Görev Tanımı</label>
              <input v-model="newTaskTitle" type="text" placeholder="Yapılacak iş..." class="w-full h-9 border border-[#dadce0] px-3 rounded text-sm bg-white outline-none focus:border-[#1a73e8]">
            </div>
            <div class="w-48 min-w-[150px] space-y-1">
              <label class="block text-[11px] font-semibold text-[#5f6368] uppercase">Sorumlu</label>
              <select v-model="newTaskAssignee" class="w-full h-9 border border-[#dadce0] px-3 rounded text-sm bg-white outline-none focus:border-[#1a73e8]">
                <option value="">Ata (Bilinmeyen)</option>
                <option v-for="user in eligibleUsers" :key="user.id" :value="user.id">{{ user.full_name }}</option>
              </select>
            </div>
            <button @click="addNewTask" :disabled="!newTaskTitle.trim()" class="h-9 px-4 bg-[#1a73e8] text-white text-sm font-medium rounded hover:bg-[#174ea6] transition-colors disabled:opacity-50 shadow-sm shrink-0">
              <i class="fas fa-plus mr-1"></i> Görev Ekle
            </button>
          </div>

          <!-- Tasks List -->
          <div class="border border-[#dadce0] rounded overflow-hidden">
            <table class="w-full text-sm border-collapse">
              <thead>
                <tr class="bg-[#f8f9fa] border-b border-[#dadce0] text-xs font-semibold text-[#5f6368] uppercase">
                  <th class="px-4 py-3 text-left w-12">Durum</th>
                  <th class="px-4 py-3 text-left">Görev</th>
                  <th class="px-4 py-3 text-left w-48">Sorumlu</th>
                  <th class="px-4 py-3 text-left w-36">Tarih</th>
                  <th class="px-4 py-3 text-center w-16" v-if="isAdminOrTech">İşlem</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="task in tasks" :key="task.id" class="bg-white border-b border-[#f1f3f4] hover:bg-[#f8f9fa] transition-colors" :class="{'opacity-60 bg-gray-50/50': task.status === 'Completed'}">
                  <td class="px-4 py-3 text-center">
                    <input type="checkbox" :checked="task.status === 'Completed'" @change="toggleTaskStatus(task.id)" :disabled="!isAdminOrTech" class="w-4.5 h-4.5 border border-[#dadce0] rounded text-[#1a73e8] outline-none cursor-pointer">
                  </td>
                  <td class="px-4 py-3 font-medium" :class="{'line-through text-gray-400': task.status === 'Completed'}">
                    {{ task.title }}
                  </td>
                  <td class="px-4 py-3 text-[#202124] font-medium text-xs">
                    <i class="far fa-user text-gray-400 mr-1.5"></i> {{ task.assigned_name || 'Atanmadı' }}
                  </td>
                  <td class="px-4 py-3 text-[#5f6368] text-xs">
                    {{ fmtDateShort(task.created_at) }}
                  </td>
                  <td class="px-4 py-3 text-center" v-if="isAdminOrTech">
                    <button @click="deleteTaskById(task.id)" class="w-7 h-7 flex items-center justify-center rounded text-[#ea4335] hover:bg-[#fce8e6] transition-colors mx-auto">
                      <i class="fas fa-trash-alt text-xs"></i>
                    </button>
                  </td>
                </tr>
                <tr v-if="tasks.length === 0">
                  <td colspan="5" class="text-center py-8 text-xs text-gray-400 italic">Bu bilet için henüz alt görev eklenmedi.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- TAB 4: KONTROL LİSTESİ -->
      <div v-if="activeTab === 'checklist'" class="flex-1 overflow-y-auto p-6 max-w-4xl w-full mx-auto space-y-6">
        <div class="bg-white border border-[#dadce0] rounded-md p-6 shadow-sm space-y-6">
          
          <div class="flex items-center justify-between border-b border-[#dadce0] pb-4 flex-wrap gap-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-[#fef7e0] text-[#b06000] flex items-center justify-center text-lg">
                <i class="fas fa-list-ol"></i>
              </div>
              <div>
                <h2 class="text-base font-semibold text-[#202124]">Kontrol Listesi (Checklist)</h2>
                <p class="text-xs text-[#5f6368]">Talep tamamlanmadan önce yerine getirilmesi gereken standart prosedür adımları.</p>
              </div>
            </div>
          </div>

          <!-- Progress Bar -->
          <div class="space-y-2" v-if="checklist.length > 0">
            <div class="flex justify-between text-xs font-medium text-[#202124]">
              <span>Tamamlanma Oranı</span>
              <span>{{ Math.round((checklist.filter(c => c.is_checked === 1).length / checklist.length) * 100) }}%</span>
            </div>
            <div class="w-full bg-[#f1f3f4] h-2 rounded-full overflow-hidden">
              <div class="bg-[#34a853] h-full transition-all duration-300" :style="{width: `${(checklist.filter(c => c.is_checked === 1).length / checklist.length) * 100}%`}"></div>
            </div>
          </div>

          <!-- Add Item Form -->
          <div v-if="isAdminOrTech" class="flex gap-3">
            <input v-model="newChecklistTitle" type="text" placeholder="Yeni adım ekle..." class="flex-1 h-9 border border-[#dadce0] px-3 rounded text-sm bg-white outline-none focus:border-[#1a73e8]" @keydown.enter.prevent="addChecklistItem">
            <button @click="addChecklistItem" :disabled="!newChecklistTitle.trim()" class="h-9 px-4 bg-[#b06000] text-white text-sm font-medium rounded hover:bg-[#8f4f00] transition-colors disabled:opacity-50 shadow-sm shrink-0">
              <i class="fas fa-plus"></i> Ekle
            </button>
          </div>

          <!-- Checklist Items -->
          <div class="space-y-2.5">
            <div v-for="item in checklist" :key="item.id" class="flex items-center justify-between p-3.5 bg-white border border-[#dadce0] rounded hover:shadow-sm transition-all" :class="{'bg-[#f8f9fa] border-dashed border-[#dadce0]/60 opacity-70': item.is_checked === 1}">
              <label class="flex items-center gap-3 cursor-pointer flex-1 min-w-0 select-none">
                <input type="checkbox" :checked="item.is_checked === 1" @change="toggleChecklistItemStatus(item.id)" :disabled="!isAdminOrTech" class="w-4.5 h-4.5 border border-[#dadce0] rounded text-[#1a73e8] outline-none cursor-pointer shrink-0">
                <span class="text-sm font-medium text-[#202124] break-words" :class="{'line-through text-gray-400': item.is_checked === 1}">{{ item.title }}</span>
              </label>
              <button v-if="isAdminOrTech" @click="deleteChecklistItemById(item.id)" class="w-7 h-7 flex items-center justify-center text-[#ea4335] hover:bg-[#fce8e6] rounded-full transition-colors shrink-0 ml-2">
                <i class="fas fa-times text-sm"></i>
              </button>
            </div>
            
            <div v-if="checklist.length === 0" class="text-center py-8 text-xs text-gray-400 italic">Kontrol listesi tanımlanmamış.</div>
          </div>

        </div>
      </div>

      <!-- TAB 5: İŞ GÜNLÜKLERİ -->
      <div v-if="activeTab === 'worklogs'" class="flex-1 overflow-y-auto p-6 max-w-4xl w-full mx-auto space-y-6">
        <div class="bg-white border border-[#dadce0] rounded-md p-6 shadow-sm space-y-6">
          <div class="flex items-center justify-between border-b border-[#dadce0] pb-4 flex-wrap gap-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-[#e6f4ea] text-[#137333] flex items-center justify-center text-lg">
                <i class="far fa-clock"></i>
              </div>
              <div>
                <h2 class="text-base font-semibold text-[#202124]">Zaman Kayıtları (İş Günlükleri)</h2>
                <p class="text-xs text-[#5f6368]">Teknisyenlerin bu talep üzerinde harcadığı tüm çalışma sürelerinin dökümü.</p>
              </div>
            </div>
            
            <div class="text-sm font-mono font-medium text-[#202124] bg-gray-100 py-1 px-3.5 rounded border border-gray-200 shadow-sm">
              Toplam Süre: {{ formatSeconds(displayTotalSeconds) }}
            </div>
          </div>

          <!-- Active Log Warning -->
          <div v-if="activeWorkLog" class="bg-[#fce8e6] border border-[#ea4335]/20 rounded p-4 flex items-center gap-3 text-[#c5221f] text-xs font-semibold animate-pulse">
            <span class="w-2.5 h-2.5 bg-[#ea4335] rounded-full shrink-0"></span>
            <div>Şu anda aktif çalışan bir sayaç bulunuyor: {{ formatSeconds(activeSeconds) }} (Teknisyen tarafından başlatıldı)</div>
          </div>

          <!-- Logs Table -->
          <div class="border border-[#dadce0] rounded overflow-hidden">
            <table class="w-full text-sm border-collapse">
              <thead>
                <tr class="bg-[#f8f9fa] border-b border-[#dadce0] text-xs font-semibold text-[#5f6368] uppercase">
                  <th class="px-4 py-3 text-left">Teknisyen</th>
                  <th class="px-4 py-3 text-left">Başlangıç</th>
                  <th class="px-4 py-3 text-left">Bitiş</th>
                  <th class="px-4 py-3 text-right">Süre (Saniye / Saat)</th>
                </tr>
              </thead>
              <tbody>
                <!-- Active Running Work Log if exists -->
                <tr v-if="activeWorkLog" class="bg-[#fffdf4] border-b border-[#dadce0]/50 italic">
                  <td class="px-4 py-3 font-semibold text-[#b06000]">
                    {{ eligibleUsers.find(u => u.id === activeWorkLog.user_id)?.full_name || authStore.userName || 'Aktif Teknisyen' }}
                    <span class="text-[10px] bg-[#fef7e0] border border-[#fbbc04]/30 px-1.5 py-0.5 rounded ml-1.5 uppercase font-bold text-[#b06000]">Aktif</span>
                  </td>
                  <td class="px-4 py-3 text-xs">{{ fmtDateShort(activeWorkLog.started_at) }}</td>
                  <td class="px-4 py-3 text-xs text-gray-400 italic">Sürüyor...</td>
                  <td class="px-4 py-3 text-right font-mono text-xs font-bold text-[#b06000]">{{ formatSeconds(activeSeconds) }}</td>
                </tr>
                
                <!-- Completed Logs -->
                <tr v-for="log in workLogs.filter(wl => wl.ended_at)" :key="log.id" class="bg-white border-b border-[#f1f3f4] hover:bg-[#f8f9fa] transition-colors">
                  <td class="px-4 py-3 font-medium text-[#202124]">{{ log.user_name || 'Bilinmeyen Teknisyen' }}</td>
                  <td class="px-4 py-3 text-[#5f6368] text-xs">{{ fmtDateShort(log.started_at) }}</td>
                  <td class="px-4 py-3 text-[#5f6368] text-xs">{{ fmtDateShort(log.ended_at) }}</td>
                  <td class="px-4 py-3 text-right font-mono text-xs font-medium text-gray-700">
                    {{ log.duration_seconds }} sn ({{ formatSeconds(log.duration_seconds) }})
                  </td>
                </tr>

                <tr v-if="workLogs.filter(wl => wl.ended_at).length === 0 && !activeWorkLog">
                  <td colspan="4" class="text-center py-8 text-xs text-gray-400 italic">Bu talep üzerinde kaydedilmiş çalışma süresi bulunamadı.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- TAB 6: ZAMAN ANALİZİ -->
      <div v-if="activeTab === 'timeanalysis'" class="flex-1 overflow-y-auto p-6 max-w-4xl w-full mx-auto space-y-6">
        <div class="bg-white border border-[#dadce0] rounded-md p-6 shadow-sm space-y-6">
          <div class="flex items-center gap-3 border-b border-[#dadce0] pb-4">
            <div class="w-10 h-10 rounded-full bg-[#f1f3f4] text-[#5f6368] flex items-center justify-center text-lg">
              <i class="fas fa-chart-pie"></i>
            </div>
            <div>
              <h2 class="text-base font-semibold text-[#202124]">Zaman Analizi & Efor Dağılımı</h2>
              <p class="text-xs text-[#5f6368]">Kayıtlı eforların teknisyen bazında analizi ve SLA durum özeti.</p>
            </div>
          </div>

          <!-- Dashboard Cards -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <!-- SLA status card -->
            <div class="border border-[#dadce0] rounded-lg p-5 bg-[#f8f9fa] flex flex-col justify-between">
              <span class="text-xs font-semibold text-[#5f6368] uppercase tracking-wider block mb-2">SLA Hedefi</span>
              <div>
                <span class="text-sm font-semibold block text-[#202124]">{{ slaText || 'SLA Yok' }}</span>
                <span class="text-[11px] text-[#5f6368] mt-1 block">Öngörülen çözüm vadesi.</span>
              </div>
            </div>

            <!-- Total active logs card -->
            <div class="border border-[#dadce0] rounded-lg p-5 bg-[#f8f9fa] flex flex-col justify-between">
              <span class="text-xs font-semibold text-[#5f6368] uppercase tracking-wider block mb-2">Toplam Süre</span>
              <div>
                <span class="text-sm font-mono font-bold block text-[#1a73e8]">{{ formatSeconds(displayTotalSeconds) }}</span>
                <span class="text-[11px] text-[#5f6368] mt-1 block">Tüm teknisyenlerin toplam eforu.</span>
              </div>
            </div>

            <!-- Co-technicians count card -->
            <div class="border border-[#dadce0] rounded-lg p-5 bg-[#f8f9fa] flex flex-col justify-between">
              <span class="text-xs font-semibold text-[#5f6368] uppercase tracking-wider block mb-2">Katkı Sağlayanlar</span>
              <div>
                <span class="text-sm font-semibold block text-[#34a853]">{{ timeAnalysisBreakdown.length }} Teknisyen</span>
                <span class="text-[11px] text-[#5f6368] mt-1 block">Efor kaydeden çalışan sayısı.</span>
              </div>
            </div>
          </div>

          <!-- Technician Breakdown Progress meters -->
          <div class="space-y-4">
            <h3 class="text-sm font-semibold text-[#202124]">Teknisyen Efor Dağılımı</h3>
            <div class="space-y-3.5">
              <div v-for="user in timeAnalysisBreakdown" :key="user.name" class="space-y-1">
                <div class="flex justify-between text-xs font-medium">
                  <span class="text-[#202124]"><i class="far fa-user text-gray-400 mr-1.5"></i> {{ user.name }}</span>
                  <span class="font-mono text-[#5f6368] font-semibold">{{ user.formatted }} ({{ Math.round((user.seconds / (displayTotalSeconds || 1)) * 100) }}%)</span>
                </div>
                <div class="w-full bg-[#f1f3f4] h-2 rounded-full overflow-hidden">
                  <div class="bg-[#1a73e8] h-full transition-all duration-300" :style="{width: `${(user.seconds / (displayTotalSeconds || 1)) * 100}%`}"></div>
                </div>
              </div>
              <div v-if="timeAnalysisBreakdown.length === 0" class="text-center py-6 text-xs text-gray-400 italic">Analiz edilecek süre kaydı bulunmuyor.</div>
            </div>
          </div>

        </div>
      </div>

      <!-- TAB 7: GEÇMİŞ -->
      <div v-if="activeTab === 'history'" class="flex-1 overflow-y-auto p-6 max-w-4xl w-full mx-auto space-y-6">
        <div class="bg-white border border-[#dadce0] rounded-md p-6 shadow-sm space-y-6">
          <div class="flex items-center gap-3 border-b border-[#dadce0] pb-4">
            <div class="w-10 h-10 rounded-full bg-[#f1f3f4] text-[#5f6368] flex items-center justify-center text-lg">
              <i class="fas fa-history"></i>
            </div>
            <div>
              <h2 class="text-base font-semibold text-[#202124]">Talep İşlem Geçmişi (Audit Logs)</h2>
              <p class="text-xs text-[#5f6368]">Talep üzerinde gerçekleşen tüm durum, sahiplik ve zamanlama güncellemelerinin kronolojik akışı.</p>
            </div>
          </div>

          <!-- History Timeline -->
          <div class="relative border-l border-[#dadce0] pl-6 ml-4 space-y-6 py-2">
            <div v-for="log in historyLogs" :key="log.id" class="relative">
              <!-- Dot marker icon -->
              <span class="absolute -left-[31px] top-0.5 w-4.5 h-4.5 rounded-full bg-white border-2 border-[#1a73e8] flex items-center justify-center">
                <span class="w-1.5 h-1.5 bg-[#1a73e8] rounded-full"></span>
              </span>
              <div class="space-y-1">
                <p class="text-sm font-medium text-[#202124]">{{ log.message }}</p>
                <p class="text-xs text-[#5f6368] flex items-center gap-1.5">
                  <i class="far fa-clock"></i> {{ fmtDateShort(log.created_at) }}
                </p>
              </div>
            </div>

            <div v-if="historyLogs.length === 0" class="text-center py-8 text-xs text-gray-400 italic">İşlem geçmişi bulunamadı.</div>
          </div>
        </div>
      </div>

    </div>

    <!-- RESOLUTION MODAL -->
    <Teleport to="body">
      <div v-if="showResolveModal" class="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-[#202124]/50">
        <div class="relative bg-white border border-[#dadce0] rounded-md shadow-md w-full max-w-md flex flex-col overflow-hidden">
          <div class="px-6 py-4 border-b border-[#dadce0] bg-[#f8f9fa] flex items-center justify-between shrink-0">
            <h3 class="text-base font-medium text-[#202124]"><i class="fas fa-check-circle text-[#34a853] mr-2"></i> Talebi Çözümle</h3>
            <button @click="showResolveModal = false" class="text-[#5f6368] hover:text-[#202124]">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="p-6 space-y-4">
            <label class="block text-xs font-medium text-[#5f6368] uppercase tracking-wide">Çözüm Açıklaması (Zorunlu) <span class="text-red-500">*</span></label>
            <textarea v-model="resolutionNote" rows="4" class="w-full border border-[#dadce0] px-3 py-2 rounded text-sm text-[#202124] bg-white outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] transition-colors resize-none" placeholder="Sorunun nasıl çözüldüğünü açıklayınız (Kullanıcıya mail atılacaktır)..."></textarea>
          </div>
          <div class="px-6 py-4 border-t border-[#dadce0] bg-[#f8f9fa] flex justify-end gap-3 shrink-0">
            <button @click="showResolveModal = false" class="h-9 px-4 bg-white text-[#3c4043] text-sm font-medium rounded border border-[#dadce0] hover:bg-[#f1f3f4] transition-colors">
              İptal
            </button>
            <button @click="submitResolve" :disabled="!resolutionNote.trim()" class="h-9 px-4 bg-[#34a853] text-white text-sm font-medium rounded hover:bg-[#137333] transition-colors disabled:opacity-50">
              Çözüldü İşaretle
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
 


<script setup>
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue'
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

// Sekme Yönetimi Refs
const activeTab = ref('details')
const tabs = [
  { id: 'details', name: 'Ayrıntılar' },
  { id: 'resolve', name: 'Çözümleme' },
  { id: 'tasks', name: 'Görevler' },
  { id: 'checklist', name: 'Kontrol Listesi' },
  { id: 'worklogs', name: 'İş Günlükleri' },
  { id: 'timeanalysis', name: 'Zaman Analizi' },
  { id: 'history', name: 'Geçmiş' }
]

const tasks = ref([])
const checklist = ref([])
const workLogs = ref([])

// Form Inputs
const newTaskTitle = ref('')
const newTaskAssignee = ref('')
const newChecklistTitle = ref('')

// Zaman Takibi Refs
const totalWorkSeconds = ref(0)
const activeWorkLog = ref(null)
const activeSeconds = ref(0)
let timerInterval = null

// Ortak Çalışanlar Refs
const collaborators = ref([])
const eligibleUsers = ref([])
const selectedColUser = ref('')

// Çözüm Raporu Refs
const showResolveModal = ref(false)
const resolutionNote = ref('')

// SLA Refs
const slaText = ref('')
const slaClass = ref('')
let slaInterval = null

// Görsel Referans Dosya Yönetimi Refs
const allAttachments = ref([])
const fileFilter = ref('')
const typeFilter = ref('')
const selectedAttachments = ref([])
const emailSending = ref(false)
const fileInputRef = ref(null)

const isAdminOrTech = computed(() => authStore.hasPermission('helpdesk:manage'))

const displayTotalSeconds = computed(() => {
  return totalWorkSeconds.value + (activeWorkLog.value ? activeSeconds.value : 0);
})

const filteredAttachments = computed(() => {
  return allAttachments.value.filter(att => {
    const matchesName = !fileFilter.value || att.file_name.toLowerCase().includes(fileFilter.value.toLowerCase());
    const matchesType = !typeFilter.value || (att.file_type && att.file_type.toLowerCase().includes(typeFilter.value.toLowerCase()));
    return matchesName && matchesType;
  });
})

const historyLogs = computed(() => {
  return messages.value.filter(msg => !msg.user_id)
})

const timeAnalysisBreakdown = computed(() => {
  const breakdown = {}
  workLogs.value.forEach(log => {
    if (log.duration_seconds) {
      const name = log.user_name || 'Bilinmeyen Teknisyen'
      breakdown[name] = (breakdown[name] || 0) + log.duration_seconds
    }
  })
  if (activeWorkLog.value) {
    const activeUser = eligibleUsers.value.find(u => u.id === activeWorkLog.value.user_id)?.full_name || authStore.userName || 'Ben'
    breakdown[activeUser] = (breakdown[activeUser] || 0) + activeSeconds.value
  }
  return Object.entries(breakdown).map(([name, seconds]) => ({
    name,
    seconds,
    formatted: formatSeconds(seconds)
  }))
})

const getStatusColor = (status) => {
  switch (status) {
    case 'Açık': return { badge: 'bg-[#fce8e6] text-[#c5221f] border-[#ea4335]/30' }
    case 'İşlemde': return { badge: 'bg-[#e8f0fe] text-[#1a73e8] border-[#1a73e8]/30' }
    case 'Beklemede': return { badge: 'bg-[#fef7e0] text-[#b06000] border-[#fbbc04]/30' }
    case 'Çözüldü': return { badge: 'bg-[#e6f4ea] text-[#137333] border-[#34a853]/30' }
    case 'Kapalı': return { badge: 'bg-[#f1f3f4] text-[#5f6368] border-[#dadce0]' }
    default: return { badge: 'bg-[#f1f3f4] text-[#5f6368] border-[#dadce0]' }
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

const formatSeconds = (totalSec) => {
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

const formatBytes = (bytes, decimals = 1) => {
  if (!bytes) return '0 B'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

const updateSlaCountdown = () => {
  if (!ticket.value || !ticket.value.sla_due_at) return
  
  const now = new Date()
  const due = new Date(ticket.value.sla_due_at)
  const diffMs = due - now

  if (diffMs <= 0) {
    const overdueMs = Math.abs(diffMs)
    const h = Math.floor(overdueMs / 3600000)
    const m = Math.floor((overdueMs % 3600000) / 60000)
    slaText.value = `SLA Aşıldı (${h}sa ${m}dk)`
    slaClass.value = 'bg-[#fce8e6] text-[#c5221f] border-[#ea4335]/30'
  } else {
    const h = Math.floor(diffMs / 3600000)
    const m = Math.floor((diffMs % 3600000) / 60000)
    slaText.value = `SLA: ${h}sa ${m}dk`
    if (h < 2) {
      slaClass.value = 'bg-[#fef7e0] text-[#b06000] border-[#fbbc04]/30'
    } else {
      slaClass.value = 'bg-[#e6f4ea] text-[#137333] border-[#34a853]/30'
    }
  }
}

const startLocalTimer = () => {
  if (timerInterval) clearInterval(timerInterval)
  if (!activeWorkLog.value) return

  let rawDate = activeWorkLog.value.started_at;
  if (rawDate && !rawDate.includes('T') && rawDate.includes(' ')) {
    rawDate = rawDate.replace(' ', 'T') + 'Z';
  }
  const startedAt = new Date(rawDate);

  if (isNaN(startedAt.getTime())) {
    console.error('Invalid started_at date:', activeWorkLog.value.started_at);
    return;
  }

  timerInterval = setInterval(() => {
    const now = new Date()
    activeSeconds.value = Math.max(0, Math.floor((now - startedAt) / 1000))
  }, 1000)
}

const stopLocalTimer = () => {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
  activeSeconds.value = 0
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
    totalWorkSeconds.value = ticket.value.total_work_seconds || 0
    allAttachments.value = res.data.allAttachments || []
    
    collaborators.value = res.data.collaborators || []
    activeWorkLog.value = res.data.activeWorkLog || null
    tasks.value = res.data.tasks || []
    checklist.value = res.data.checklist || []
    workLogs.value = res.data.workLogs || []

    if (activeWorkLog.value) {
      startLocalTimer()
    } else {
      stopLocalTimer()
    }

    updateSlaCountdown()
    scrollToBottom()
  } catch (err) {
    showToast('Talep yüklenemedi.', 'error')
  }
}

const loadEligibleUsers = async () => {
  if (!isAdminOrTech.value) return
  try {
    const res = await api.get('/admin/api/users')
    if (res.data.success) {
      eligibleUsers.value = res.data.users.filter(u => 
        (u.role_name === 'Teknisyen' || u.role_name === 'Admin') && 
        u.id !== ticket.value.assigned_to &&
        !collaborators.value.some(col => col.id === u.id)
      )
    }
  } catch (err) {
    console.error('Kullanıcı listesi alınamadı:', err)
  }
}

const handleStatusChange = (e) => {
  const newStatus = e.target.value
  if (newStatus === 'Çözüldü') {
    resolutionNote.value = ''
    showResolveModal.value = true
  } else {
    updateStatus(newStatus)
  }
}

const submitResolve = async () => {
  if (!resolutionNote.value.trim()) return
  showResolveModal.value = false
  await updateStatus('Çözüldü', resolutionNote.value)
}

const updateStatus = async (status, note = null) => {
  try {
    await api.put(`/api/helpdesk/tickets/${ticket.value.id}/status`, { status, resolution_note: note })
    showToast('Durum güncellendi.', 'success')
    await loadTicket()
  } catch (err) {
    showToast(err.response?.data?.error || 'Durum güncellenemedi.', 'error')
  }
}

// --- DOKÜMANLAR YÜKLEME VE YÖNETME ---

const triggerFileInput = () => {
  if (fileInputRef.value) fileInputRef.value.click()
}

const handleFileChange = async (e) => {
  if (e.target.files && e.target.files.length > 0) {
    await uploadFiles(e.target.files);
  }
}

const onFileDrop = async (e) => {
  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    await uploadFiles(e.dataTransfer.files);
  }
}

const uploadFiles = async (fileList) => {
  try {
    const formData = new FormData()
    formData.append('message', 'Yeni dosya yüklendi.')
    formData.append('is_internal', 'false')
    for (let f of fileList) {
      formData.append('attachments', f)
    }
    await api.post(`/api/helpdesk/tickets/${ticket.value.id}/messages`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    showToast('Dosyalar başarıyla yüklendi.', 'success')
    await loadTicket()
  } catch (err) {
    showToast('Dosya yüklenemedi.', 'error')
  }
}

const toggleSelectAll = (e) => {
  if (e.target.checked) {
    selectedAttachments.value = filteredAttachments.value.map(a => a.id);
  } else {
    selectedAttachments.value = [];
  }
}

const downloadSelected = () => {
  selectedAttachments.value.forEach(id => {
    const att = allAttachments.value.find(a => a.id === id);
    if (att) {
      const link = document.createElement('a');
      link.href = 'http://localhost:3001' + att.file_path;
      link.download = att.file_name;
      link.target = '_blank';
      link.click();
    }
  });
}

const deleteSelected = async () => {
  if (selectedAttachments.value.length === 0) return
  if (!confirm('Seçili dosyaları silmek istediğinize emin misiniz?')) return
  try {
    for (let id of selectedAttachments.value) {
      await api.delete(`/api/helpdesk/tickets/${ticket.value.id}/attachments/${id}`)
    }
    showToast('Seçili dosyalar silindi.', 'success')
    selectedAttachments.value = []
    await loadTicket()
  } catch (err) {
    showToast('Dosyalar silinirken hata oluştu.', 'error')
  }
}

const sendEmailSelected = async () => {
  if (selectedAttachments.value.length === 0) return
  emailSending.value = true
  try {
    await api.post(`/api/helpdesk/tickets/${ticket.value.id}/email-attachments`, {
      attachmentIds: selectedAttachments.value
    })
    showToast('Seçili dosyalar e-posta adresinize gönderildi.', 'success')
    selectedAttachments.value = []
  } catch (err) {
    showToast('E-posta gönderimi başarısız.', 'error')
  } finally {
    emailSending.value = false
  }
}

const sendMessage = async () => {
  if (!newMessage.value.trim()) return
  
  try {
    const formData = new FormData()
    formData.append('message', newMessage.value)
    formData.append('is_internal', isInternal.value)

    await api.post(`/api/helpdesk/tickets/${ticket.value.id}/messages`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    
    newMessage.value = ''
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
    await loadEligibleUsers()
  } catch (err) {
    showToast('Atama yapılamadı.', 'error')
  }
}

const startWorkTimer = async () => {
  try {
    await api.post(`/api/helpdesk/tickets/${ticket.value.id}/work/start`)
    showToast('Zaman sayacı başlatıldı.', 'success')
    await loadTicket()
  } catch (err) {
    showToast(err.response?.data?.error || 'Zaman sayacı başlatılamadı.', 'error')
  }
}

const stopWorkTimer = async () => {
  try {
    const res = await api.post(`/api/helpdesk/tickets/${ticket.value.id}/work/stop`)
    showToast(`Zaman sayacı durduruldu. Süre kaydedildi: +${res.data.duration_seconds}sn.`, 'success')
    await loadTicket()
  } catch (err) {
    showToast(err.response?.data?.error || 'Zaman sayacı durdurulamadı.', 'error')
  }
}

// Görev Aksiyonları
const addNewTask = async () => {
  if (!newTaskTitle.value.trim()) return
  try {
    await api.post(`/api/helpdesk/tickets/${ticket.value.id}/tasks`, {
      title: newTaskTitle.value,
      assigned_to: newTaskAssignee.value || null
    })
    showToast('Görev eklendi.', 'success')
    newTaskTitle.value = ''
    newTaskAssignee.value = ''
    await loadTicket()
  } catch (err) {
    showToast('Görev eklenemedi.', 'error')
  }
}

const toggleTaskStatus = async (taskId) => {
  try {
    await api.put(`/api/helpdesk/tasks/${taskId}/toggle`)
    await loadTicket()
  } catch (err) {
    showToast('Görev durumu güncellenemedi.', 'error')
  }
}

const deleteTaskById = async (taskId) => {
  if (!confirm('Bu görevi silmek istediğinize emin misiniz?')) return
  try {
    await api.delete(`/api/helpdesk/tasks/${taskId}`)
    showToast('Görev silindi.', 'success')
    await loadTicket()
  } catch (err) {
    showToast('Görev silinemedi.', 'error')
  }
}

// Kontrol Listesi Aksiyonları
const addChecklistItem = async () => {
  if (!newChecklistTitle.value.trim()) return
  try {
    await api.post(`/api/helpdesk/tickets/${ticket.value.id}/checklist`, {
      title: newChecklistTitle.value
    })
    showToast('Kontrol listesi elemanı eklendi.', 'success')
    newChecklistTitle.value = ''
    await loadTicket()
  } catch (err) {
    showToast('Eleman eklenemedi.', 'error')
  }
}

const toggleChecklistItemStatus = async (itemId) => {
  try {
    await api.put(`/api/helpdesk/checklist/${itemId}/toggle`)
    await loadTicket()
  } catch (err) {
    showToast('Güncelleme başarısız.', 'error')
  }
}

const deleteChecklistItemById = async (itemId) => {
  try {
    await api.delete(`/api/helpdesk/checklist/${itemId}`)
    showToast('Eleman silindi.', 'success')
    await loadTicket()
  } catch (err) {
    showToast('Silme başarısız.', 'error')
  }
}

onMounted(async () => {
  await loadTicket()
  await loadEligibleUsers()

  slaInterval = setInterval(updateSlaCountdown, 60000)
})

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval)
  if (slaInterval) clearInterval(slaInterval)
})
</script>
