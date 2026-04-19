<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import api from '../api'

// -- State --
const roles = ref([])
const permissions = ref([])
const rolePermissions = ref([])
const users = ref([])
const smtpSettings = ref({ host: '', port: 587, user: '', pass: '', secure: true, from_email: '' })
const loading = ref(true)
const activeTab = ref('users') // 'users', 'mail'
const selectedUserId = ref(null)

// Kullanıcıya özel yetki override'ları (granted = 1 olan pId'ler)
const userOverrides = ref([]) 
const isSavingPerms = ref(false)

const showUserModal = ref(false)
const newUser = ref({ full_name: '', email: '', role_id: '' })
const isCreatingUser = ref(false)

const showTestMailModal = ref(false)
const testEmail = ref('')
const isTestingSmtp = ref(false)

// -- Load Data --
const loadData = async () => {
  loading.value = true
  try {
    const [permRes, userRes, smtpRes] = await Promise.all([
      api.get('/admin/api/permissions'),
      api.get('/admin/api/users'),
      api.get('/admin/api/settings/smtp')
    ])
    
    if (permRes.data.success) {
      roles.value = permRes.data.roles
      permissions.value = permRes.data.permissions
      rolePermissions.value = permRes.data.rolePermissions
      if (roles.value.length > 0) {
          newUser.value.role_id = roles.value[0].id
      }
    }

    if (userRes.data.success) {
      users.value = userRes.data.users
      if (users.value.length > 0 && !selectedUserId.value) {
        selectedUserId.value = users.value[0].id
      }
    }

    if (smtpRes.data.success && smtpRes.data.settings) {
      smtpSettings.value = { ...smtpSettings.value, ...smtpRes.data.settings }
      smtpSettings.value.secure = smtpRes.data.settings.secure === 1
      smtpSettings.value.pass = '' 
    }
  } catch (err) {
    console.error('Veriler yüklenemedi:', err)
  } finally {
    loading.value = false
  }
}

// Kullanıcı değişince özel yetkilerini çek
const loadUserOverrides = async (userId) => {
    if (!userId) return
    try {
        const res = await api.get(`/admin/api/users/${userId}/permissions`)
        if (res.data.success) {
            userOverrides.value = res.data.userPermissions.map(p => p.permission_id)
        }
    } catch (err) {
        console.error('Kullanıcı yetkileri yüklenemedi:', err)
    }
}

watch(selectedUserId, (newId) => {
    loadUserOverrides(newId)
})

// -- Computed --
const selectedUser = computed(() => users.value.find(u => u.id === selectedUserId.value) || null)

const selectedUserRole = computed(() => {
  if (!selectedUser.value) return null
  return roles.value.find(r => r.id === selectedUser.value.role_id) || null
})

// Rolün sahip olduğu yetki ID'leri
const rolePermissionIds = computed(() => {
  if (!selectedUser.value) return []
  return rolePermissions.value
    .filter(rp => rp.role_id === selectedUser.value.role_id)
    .map(rp => rp.permission_id)
})

// Modül bazlı gruplandırılmış yetkiler
const modules = computed(() => {
    const map = {}
    permissions.value.forEach(p => {
        if (!map[p.module]) {
            map[p.module] = { 
                name: p.module, 
                view: null, 
                edit: null,
                other: []
            }
        }
        if (p.permission_key.endsWith(':view')) map[p.module].view = p
        else if (p.permission_key.endsWith(':edit')) map[p.module].edit = p
        else map[p.module].other.push(p)
    })
    return Object.values(map)
})

// -- Actions --
const isPermissionGranted = (pId) => {
    // Admin her şeye yetkili
    if (selectedUser.value?.role_id === 1) return true
    // Rol yetkisi varsa VEYA kullanıcı override'ı varsa
    return rolePermissionIds.value.includes(pId) || userOverrides.value.includes(pId)
}

const isInherited = (pId) => {
    return rolePermissionIds.value.includes(pId)
}

const togglePermission = (pId) => {
    if (isInherited(pId)) return // Rolden geliyorsa switch'i elleme (şifreli gibi kalsın veya uyarı ver)
    
    const idx = userOverrides.value.indexOf(pId)
    if (idx > -1) userOverrides.value.splice(idx, 1)
    else userOverrides.value.push(pId)
}

const saveUserPermissions = async () => {
    if (!selectedUserId.value) return
    isSavingPerms.value = true
    try {
        const res = await api.post(`/admin/api/users/${selectedUserId.value}/permissions`, {
            grantedIds: userOverrides.value
        })
        if (res.data.success) {
            alert('Kullanıcı yetkileri başarıyla güncellendi.')
        }
    } catch (err) {
        alert('Yetkiler kaydedilirken bir hata oluştu.')
    } finally {
        isSavingPerms.value = false
    }
}

const updateUserRole = async (userId, newRoleId) => {
    const userSnapshot = users.value.find(u => u.id === userId)
    const oldRoleId = userSnapshot?.role_id
    
    if (userSnapshot) userSnapshot.role_id = parseInt(newRoleId)
    
    try {
        await api.post('/admin/api/users/update-role', { user_id: userId, role_id: parseInt(newRoleId) })
    } catch (err) {
        if (userSnapshot) userSnapshot.role_id = oldRoleId
        alert('Rol güncellenemedi.')
    }
}

const createUser = async () => {
    isCreatingUser.value = true
    try {
        const res = await api.post('/admin/api/users/create', newUser.value)
        if (res.data.success) {
            alert(res.data.message)
            showUserModal.value = false
            newUser.value = { full_name: '', email: '', role_id: roles.value[0]?.id || '' }
            loadData()
        }
    } catch (err) {
        alert(err.response?.data?.message || 'Hata oluştu.')
    } finally {
        isCreatingUser.value = false
    }
}

const saveSmtpSettings = async () => {
    try {
        const payload = { ...smtpSettings.value, secure: smtpSettings.value.secure ? 1 : 0 }
        const res = await api.post('/admin/api/settings/smtp', payload)
        if (res.data.success) alert('SMTP ayarları kaydedildi.')
    } catch(err) {
        alert('Kaydedilemedi.')
    }
}

onMounted(() => {
    loadData()
})
</script>

<template>
  <div class="h-full flex flex-col bg-[#f8f9fa] text-[#3c4043] font-sans overflow-hidden">
    
    <!-- HEADER -->
    <header class="bg-white border-b border-[#dadce0] px-8 py-4 shrink-0 flex items-center justify-between z-20 shadow-sm">
        <div class="flex items-center gap-10">
            <h1 class="text-[22px] font-medium text-[#202124]">Yönetim Paneli</h1>
            <nav class="flex items-center gap-2">
                <button @click="activeTab = 'users'" class="tab-btn" :class="{ 'active': activeTab === 'users' }">Kullanıcı & Yetki</button>
                <button @click="activeTab = 'mail'" class="tab-btn" :class="{ 'active': activeTab === 'mail' }">Sistem Ayarları</button>
            </nav>
        </div>
        <button v-if="activeTab === 'users'" @click="showUserModal = true" class="btn-primary">
            <i class="fas fa-plus"></i> Yeni Kullanıcı
        </button>
    </header>

    <main class="flex-1 flex overflow-hidden">

        <!-- TAB: KULLANICI & YETKİ -->
        <template v-if="activeTab === 'users'">
            <!-- SOL: KULLANICI LİSTESİ -->
            <aside class="w-[320px] bg-white border-r border-[#dadce0] flex flex-col shrink-0 shadow-sm">
                <div class="p-4 border-b border-[#f1f3f4] bg-[#f8f9fa]">
                    <div class="relative">
                        <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                        <input type="text" placeholder="Kullanıcı ara..." class="w-full h-9 pl-9 pr-3 bg-white border border-[#dadce0] rounded-full text-sm outline-none focus:border-[#1a73e8]">
                    </div>
                </div>
                <div class="flex-1 overflow-y-auto p-2 scroll-modern">
                    <button
                        v-for="user in users"
                        :key="user.id"
                        @click="selectedUserId = user.id"
                        class="user-card"
                        :class="{ 'active': selectedUserId === user.id }"
                    >
                        <div class="avatar" :class="{ 'active': selectedUserId === user.id }">
                            {{ user.full_name?.charAt(0) }}
                        </div>
                        <div class="flex flex-col min-w-0">
                            <span class="text-sm font-medium truncate">{{ user.full_name }}</span>
                            <span class="text-xs text-gray-500 truncate">{{ roles.find(r => r.id === user.role_id)?.name }}</span>
                        </div>
                        <i v-if="selectedUserId === user.id" class="fas fa-chevron-right ml-auto text-[#1a73e8] text-[10px]"></i>
                    </button>
                </div>
            </aside>

            <!-- SAĞ: YETKİ MATRİSİ -->
            <section class="flex-1 overflow-y-auto bg-white p-10 scroll-modern">
                <div v-if="selectedUser" class="max-w-4xl mx-auto animate-fade-in">
                    
                    <!-- USER INFO HEADER -->
                    <div class="flex items-center justify-between mb-8 pb-8 border-b border-[#f1f3f4]">
                        <div class="flex items-center gap-5">
                            <div class="w-16 h-16 rounded-2xl bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center text-3xl font-semibold shadow-inner">
                                {{ selectedUser.full_name?.charAt(0) }}
                            </div>
                            <div>
                                <h2 class="text-2xl font-medium text-[#202124]">{{ selectedUser.full_name }}</h2>
                                <p class="text-sm text-gray-500 flex items-center gap-2 mt-1">
                                    <i class="fas fa-envelope opacity-50"></i> {{ selectedUser.email }}
                                </p>
                            </div>
                        </div>
                        <div class="flex flex-col items-end">
                             <span class="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Mevcut Rol</span>
                             <select :value="selectedUser.role_id" @change="updateUserRole(selectedUser.id, $event.target.value)" class="role-select">
                                <option v-for="role in roles" :key="role.id" :value="role.id">{{ role.name }}</option>
                             </select>
                        </div>
                    </div>

                    <!-- PERMISSION MATRIX -->
                    <div class="bg-white rounded-xl border border-[#dadce0] overflow-hidden shadow-sm">
                        <div class="px-6 py-4 bg-[#f8f9fa] border-b border-[#dadce0] flex items-center justify-between">
                            <h3 class="text-sm font-semibold text-[#3c4043] flex items-center gap-2">
                                <i class="fas fa-shield-alt text-[#1a73e8]"></i>
                                Yetki Matrisi
                            </h3>
                            <button @click="saveUserPermissions" :disabled="isSavingPerms" class="btn-save">
                                <i class="fas" :class="isSavingPerms ? 'fa-spinner fa-spin' : 'fa-save'"></i>
                                {{ isSavingPerms ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet' }}
                            </button>
                        </div>

                        <div class="overflow-x-auto">
                            <table class="w-full text-left border-collapse">
                                <thead class="bg-[#fcfcfc] border-b border-[#dadce0]">
                                    <tr>
                                        <th class="px-6 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider w-1/3">Modül / İşlev</th>
                                        <th class="px-6 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">Görüntüleme</th>
                                        <th class="px-6 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">Düzenleme / Yönetim</th>
                                        <th class="px-6 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">Durum</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-[#f1f3f4]">
                                    <tr v-for="mod in modules" :key="mod.name" class="hover:bg-[#fcfcfc] transition-colors">
                                        <td class="px-6 py-4">
                                            <span class="text-sm font-medium text-[#202124]">{{ mod.name }}</span>
                                            <p class="text-[11px] text-gray-400 mt-0.5">{{ mod.view?.description || mod.edit?.description }}</p>
                                        </td>
                                        
                                        <!-- VIEW TOGGLE -->
                                        <td class="px-6 py-4 text-center">
                                            <div class="flex justify-center">
                                                <label class="switch" :class="{ 'opacity-50 cursor-not-allowed': isInherited(mod.view?.id) || selectedUser.role_id === 1 }">
                                                    <input type="checkbox" :checked="isPermissionGranted(mod.view?.id)" @change="togglePermission(mod.view?.id)" :disabled="isInherited(mod.view?.id) || selectedUser.role_id === 1">
                                                    <span class="slider"></span>
                                                </label>
                                            </div>
                                        </td>

                                        <!-- EDIT TOGGLE -->
                                        <td class="px-6 py-4 text-center">
                                            <div class="flex justify-center" v-if="mod.edit">
                                                <label class="switch" :class="{ 'opacity-50 cursor-not-allowed': isInherited(mod.edit?.id) || selectedUser.role_id === 1 }">
                                                    <input type="checkbox" :checked="isPermissionGranted(mod.edit?.id)" @change="togglePermission(mod.edit?.id)" :disabled="isInherited(mod.edit?.id) || selectedUser.role_id === 1">
                                                    <span class="slider"></span>
                                                </label>
                                            </div>
                                            <span v-else class="text-[10px] text-gray-300">—</span>
                                        </td>

                                        <!-- STATUS BADGE -->
                                        <td class="px-6 py-4">
                                            <div class="flex justify-center">
                                                <span v-if="selectedUser.role_id === 1" class="badge bg-purple-50 text-purple-600 border-purple-100">Full Access</span>
                                                <span v-else-if="isInherited(mod.view?.id) || isInherited(mod.edit?.id)" class="badge bg-blue-50 text-[#1a73e8] border-blue-100">Rolden Geliyor</span>
                                                <span v-else-if="userOverrides.includes(mod.view?.id) || userOverrides.includes(mod.edit?.id)" class="badge bg-amber-50 text-amber-600 border-amber-100">Özel Yetki</span>
                                                <span v-else class="badge bg-gray-50 text-gray-400 border-gray-100">Yetki Yok</span>
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- ADMIN ROLE WARNING -->
                    <div v-if="selectedUser.role_id === 1" class="mt-6 p-4 bg-purple-50 border border-purple-100 rounded-lg flex items-start gap-4">
                        <i class="fas fa-info-circle text-purple-600 mt-1"></i>
                        <div class="text-[13px] text-purple-800">
                            <strong>Bilgi:</strong> Bu kullanıcı <strong>Admin</strong> rolünde olduğu için sistem genelindeki tüm modüllere tam erişim yetkisine sahiptir. Admin yetkileri üzerinden özel kısıtlama (override) yapılamaz.
                        </div>
                    </div>

                </div>
                <div v-else class="h-full flex flex-col items-center justify-center text-gray-400 gap-4">
                    <div class="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center border-2 border-dashed border-gray-200">
                        <i class="fas fa-user text-3xl opacity-20"></i>
                    </div>
                    <p class="text-sm">Detayları görmek için sol listeden bir kullanıcı seçin.</p>
                </div>
            </section>
        </template>

        <!-- TAB: MAİL AYARLARI -->
        <template v-if="activeTab === 'mail'">
            <div class="flex-1 overflow-y-auto p-12 scroll-modern bg-white">
                <div class="max-w-2xl mx-auto">
                    <div class="flex items-center gap-4 mb-10 pb-6 border-b border-gray-100">
                        <div class="w-14 h-14 bg-[#1a73e8]/10 text-[#1a73e8] rounded-xl flex items-center justify-center text-2xl">
                            <i class="fas fa-paper-plane"></i>
                        </div>
                        <div>
                            <h2 class="text-2xl font-medium text-[#202124]">SMTP Bildirim Altyapısı</h2>
                            <p class="text-sm text-gray-500 mt-1">Sistem bildirimleri ve hoşgeldin e-postaları için ayarlar.</p>
                        </div>
                    </div>

                    <form @submit.prevent="saveSmtpSettings" class="grid grid-cols-2 gap-6 pb-10">
                        <div class="form-group col-span-2">
                            <label>Sunucu (Host)</label>
                            <input v-model="smtpSettings.host" type="text" placeholder="smtp.gmail.com">
                        </div>
                        <div class="form-group">
                            <label>Port</label>
                            <input v-model="smtpSettings.port" type="number" placeholder="587">
                        </div>
                        <div class="form-group flex items-end pb-3">
                            <label class="flex items-center gap-3 cursor-pointer select-none">
                                <input type="checkbox" v-model="smtpSettings.secure" class="w-5 h-5 accent-[#1a73e8]">
                                <span class="text-sm font-medium text-gray-700">SSL/TLS Güvenli Bağlantı</span>
                            </label>
                        </div>
                        <div class="form-group">
                            <label>Kullanıcı (Mail)</label>
                            <input v-model="smtpSettings.user" type="text" placeholder="bildirim@talay.com">
                        </div>
                        <div class="form-group">
                            <label>Yeni Şifre</label>
                            <input v-model="smtpSettings.pass" type="password" placeholder="••••••••">
                        </div>
                        <div class="form-group col-span-2">
                            <label>Gönderen E-Posta</label>
                            <input v-model="smtpSettings.from_email" type="text" placeholder="noreply@talay.com">
                        </div>
                        
                        <div class="col-span-2 flex items-center justify-between mt-6 pt-8 border-t border-gray-100">
                            <button type="button" @click="showTestMailModal = true" class="btn-secondary">Test Maili Gönder</button>
                            <button type="submit" class="btn-primary px-10">Güncellemeleri Kaydet</button>
                        </div>
                    </form>
                </div>
            </div>
        </template>

    </main>

    <!-- USER CREATION MODAL -->
    <div v-if="showUserModal" class="modal-overlay" @click.self="showUserModal = false">
        <div class="modal-content animate-slide-up">
            <div class="modal-header">
                <h3>Yeni Kullanıcı Ekle</h3>
                <button @click="showUserModal = false"><i class="fas fa-times"></i></button>
            </div>
            <form @submit.prevent="createUser" class="p-8 space-y-6">
                <div class="form-group">
                    <label>Ad Soyad</label>
                    <input v-model="newUser.full_name" required placeholder="Örn: Mehmet Öz">
                </div>
                <div class="form-group">
                    <label>E-posta Adresi</label>
                    <input v-model="newUser.email" type="email" required placeholder="mehmet@talay.com">
                </div>
                <div class="form-group">
                    <label>Başlangıç Rolü</label>
                    <select v-model="newUser.role_id" required>
                        <option v-for="role in roles" :key="role.id" :value="role.id">{{ role.name }}</option>
                    </select>
                </div>
                <div class="flex justify-end gap-3 pt-6">
                    <button type="button" @click="showUserModal = false" class="btn-text">İptal</button>
                    <button type="submit" :disabled="isCreatingUser" class="btn-primary px-8">Kullanıcıyı Oluştur</button>
                </div>
            </form>
        </div>
    </div>

  </div>
</template>

<style scoped>
/* GOOGLE PREMIUM STYLING */
.tab-btn {
    @apply h-14 px-6 text-[13px] font-medium text-gray-500 border-b-2 border-transparent transition-all hover:text-[#1a73e8];
}
.tab-btn.active {
    @apply text-[#1a73e8] border-[#1a73e8] bg-[#f8f9fa]/50;
}

.btn-primary {
    @apply h-10 px-5 bg-[#1a73e8] text-white rounded-lg text-sm font-semibold hover:bg-[#174ea6] transition-all shadow-sm flex items-center gap-2;
}
.btn-secondary {
    @apply h-10 px-5 border border-[#dadce0] text-[#1a73e8] rounded-lg text-sm font-semibold hover:bg-[#f8f9fa] transition-all;
}
.btn-save {
    @apply h-8 px-4 bg-[#1a73e8]/10 text-[#1a73e8] rounded-md text-[12px] font-bold hover:bg-[#1a73e8] hover:text-white transition-all flex items-center gap-2 disabled:opacity-50;
}
.btn-text {
    @apply h-10 px-5 text-gray-500 font-semibold text-sm hover:bg-gray-100 rounded-lg;
}

.user-card {
    @apply w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all mb-1 hover:bg-[#f8f9fa] text-left border border-transparent;
}
.user-card.active {
    @apply bg-[#e8f0fe] border-[#1a73e8]/20 text-[#1a73e8];
}

.avatar {
    @apply w-10 h-10 rounded-full bg-[#f1f3f4] text-gray-600 flex items-center justify-center text-sm font-bold transition-all;
}
.avatar.active {
    @apply bg-[#1a73e8] text-white scale-105 shadow-md;
}

.role-select {
    @apply h-10 rounded-lg border-[#dadce0] bg-[#f8f9fa] text-sm font-medium px-4 outline-none focus:border-[#1a73e8] cursor-pointer;
}

.badge {
    @apply px-2.5 py-1 rounded-full text-[10px] font-bold border;
}

.form-group label {
    @apply block text-[13px] font-bold text-gray-700 mb-2;
}
.form-group input, .form-group select {
    @apply w-full h-11 border border-[#dadce0] rounded-lg px-4 text-sm outline-none focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/10 transition-all;
}

/* SWITCH COMPONENT */
.switch {
    @apply relative inline-block w-11 h-5;
}
.switch input {
    @apply opacity-0 w-0 h-0;
}
.slider {
    @apply absolute cursor-pointer inset-0 bg-[#bdc1c6] rounded-full transition-all;
}
.slider:before {
    @apply absolute content-[''] h-4 w-4 left-0.5 bottom-0.5 bg-white rounded-full transition-all shadow-sm;
}
input:checked + .slider {
    @apply bg-[#1a73e8];
}
input:checked + .slider:before {
    @apply translate-x-6;
}

/* MODAL */
.modal-overlay {
    @apply fixed inset-0 bg-[#202124]/60 backdrop-blur-sm z-[3000] flex items-center justify-center p-4;
}
.modal-content {
    @apply bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-[#dadce0];
}
.modal-header {
    @apply px-8 py-5 border-b border-[#f1f3f4] flex justify-between items-center bg-[#f8f9fa];
}
.modal-header h3 { @apply text-lg font-medium text-[#202124]; }

/* UTILS */
.scroll-modern::-webkit-scrollbar { width: 6px; }
.scroll-modern::-webkit-scrollbar-thumb { @apply bg-gray-200 rounded-full hover:bg-gray-300; }
.animate-fade-in { animation: fadeIn 0.4s ease-out; }
.animate-slide-up { animation: slideUp 0.3s ease-out; }

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
</style>
