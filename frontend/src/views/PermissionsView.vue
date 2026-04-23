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
  <div class="h-full flex flex-col bg-white text-gray-900 overflow-hidden">
    
    <!-- HEADER (SIM STYLE) -->
    <header class="h-14 border-b border-gray-100 flex items-center px-6 gap-8 bg-white shrink-0 sticky top-0 z-50">
        <div class="flex items-center gap-2.5 shrink-0">
            <i class="fas fa-shield-halved text-gray-400 text-lg"></i>
            <h1 class="text-[16px] font-bold text-gray-900 tracking-tight">Yetki Yönetimi</h1>
        </div>
        
        <nav class="flex h-full">
            <button @click="activeTab = 'users'" class="tab-item" :class="{ 'active': activeTab === 'users' }">Kullanıcılar</button>
            <button @click="activeTab = 'mail'" class="tab-item" :class="{ 'active': activeTab === 'mail' }">Sistem Ayarları</button>
        </nav>

        <div class="ml-auto">
            <button v-if="activeTab === 'users'" @click="showUserModal = true" class="btn-action-primary">
                <i class="fas fa-plus"></i> Yeni Kullanıcı
            </button>
        </div>
    </header>

    <main class="flex-1 flex overflow-hidden">

        <!-- TAB: KULLANICI & YETKİ -->
        <template v-if="activeTab === 'users'">
            <!-- SOL: KULLANICI LİSTESİ (Minimal Sidebar) -->
            <aside class="w-[260px] bg-white border-r border-gray-100 flex flex-col shrink-0">
                <div class="p-3 border-b border-gray-50 bg-gray-50/30">
                    <div class="relative">
                        <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[11px]"></i>
                        <input type="text" placeholder="Kullanıcı ara..." class="w-full h-8 pl-8 pr-3 bg-white border border-gray-100 rounded text-[12px] outline-none focus:border-blue-500 transition-all">
                    </div>
                </div>
                <div class="flex-1 overflow-y-auto p-1.5 space-y-0.5">
                    <button
                        v-for="user in users"
                        :key="user.id"
                        @click="selectedUserId = user.id"
                        class="user-row"
                        :class="{ 'active': selectedUserId === user.id }"
                    >
                        <div class="user-dot" :class="{ 'active': selectedUserId === user.id }">
                            {{ user.full_name?.charAt(0) }}
                        </div>
                        <div class="flex flex-col min-w-0">
                            <span class="text-[12.5px] font-semibold truncate">{{ user.full_name }}</span>
                            <span class="text-[10px] text-gray-400 font-bold uppercase tracking-tight">{{ roles.find(r => r.id === user.role_id)?.name }}</span>
                        </div>
                    </button>
                </div>
            </aside>

            <!-- SAĞ: YETKİ TABLOSU (SIM Table Style) -->
            <section class="flex-1 overflow-y-auto bg-white flex flex-col">
                <div v-if="selectedUser" class="flex flex-col h-full">
                    
                    <!-- USER INFO BAR -->
                    <div class="px-6 py-4 border-b border-gray-50 bg-[#fafafa] flex items-center justify-between shrink-0">
                        <div class="flex items-center gap-4">
                            <div class="w-10 h-10 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center text-lg font-bold">
                                {{ selectedUser.full_name?.charAt(0) }}
                            </div>
                            <div>
                                <h2 class="text-[15px] font-bold text-gray-900">{{ selectedUser.full_name }}</h2>
                                <p class="text-[11px] text-gray-400 font-medium">{{ selectedUser.email }}</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-4">
                             <div class="flex flex-col items-end">
                                 <span class="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Sistem Rolü</span>
                                 <select :value="selectedUser.role_id" @change="updateUserRole(selectedUser.id, $event.target.value)" class="role-select-minimal">
                                    <option v-for="role in roles" :key="role.id" :value="role.id">{{ role.name }}</option>
                                 </select>
                             </div>
                             <button @click="saveUserPermissions" :disabled="isSavingPerms" class="btn-save-minimal">
                                <i class="fas" :class="isSavingPerms ? 'fa-spinner fa-spin' : 'fa-save'"></i>
                                {{ isSavingPerms ? 'Kaydediliyor...' : 'YETKİLERİ KAYDET' }}
                            </button>
                        </div>
                    </div>

                    <!-- MATRIX TABLE -->
                    <div class="flex-1 overflow-x-auto">
                        <table class="w-full text-left border-collapse">
                            <thead class="sticky top-0 bg-gray-50 z-10">
                                <tr>
                                    <th class="px-6 py-3 border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider w-[350px]">Modül / Yetki Tanımı</th>
                                    <th class="px-6 py-3 border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-center">Görüntüleme</th>
                                    <th class="px-6 py-3 border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-center">Düzenleme</th>
                                    <th class="px-6 py-3 border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-center">Kaynak</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-50">
                                <tr v-for="mod in modules" :key="mod.name" class="hover:bg-gray-50/50 transition-colors">
                                    <td class="px-6 py-3.5">
                                        <span class="text-[13px] font-bold text-gray-800 block">{{ mod.name }}</span>
                                        <span class="text-[11px] text-gray-400">{{ mod.view?.description || mod.edit?.description }}</span>
                                    </td>
                                    
                                    <td class="px-6 py-3.5 text-center">
                                        <div class="flex justify-center">
                                            <label class="sim-switch" :class="{ 'disabled': isInherited(mod.view?.id) || selectedUser.role_id === 1 }">
                                                <input type="checkbox" :checked="isPermissionGranted(mod.view?.id)" @change="togglePermission(mod.view?.id)" :disabled="isInherited(mod.view?.id) || selectedUser.role_id === 1">
                                                <span class="sim-slider"></span>
                                            </label>
                                        </div>
                                    </td>

                                    <td class="px-6 py-3.5 text-center">
                                        <div class="flex justify-center" v-if="mod.edit">
                                            <label class="sim-switch" :class="{ 'disabled': isInherited(mod.edit?.id) || selectedUser.role_id === 1 }">
                                                <input type="checkbox" :checked="isPermissionGranted(mod.edit?.id)" @change="togglePermission(mod.edit?.id)" :disabled="isInherited(mod.edit?.id) || selectedUser.role_id === 1">
                                                <span class="sim-slider"></span>
                                            </label>
                                        </div>
                                        <span v-else class="text-[10px] text-gray-200">—</span>
                                    </td>

                                    <td class="px-6 py-3.5">
                                        <div class="flex justify-center">
                                            <span v-if="selectedUser.role_id === 1" class="tag-minimal purple">ADMIN</span>
                                            <span v-else-if="isInherited(mod.view?.id) || isInherited(mod.edit?.id)" class="tag-minimal gray">ROL</span>
                                            <span v-else-if="userOverrides.includes(mod.view?.id) || userOverrides.includes(mod.edit?.id)" class="tag-minimal blue">ÖZEL</span>
                                            <span v-else class="text-[10px] text-gray-200">YOK</span>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <!-- FOOTER INFO -->
                    <div v-if="selectedUser.role_id === 1" class="px-6 py-3 border-t border-gray-50 bg-gray-50/50 flex items-center gap-3">
                        <i class="fas fa-info-circle text-gray-400 text-[12px]"></i>
                        <span class="text-[11px] text-gray-500 font-medium">Bu kullanıcı Admin yetkilerine sahiptir ve tüm kısıtlamalardan muaftır.</span>
                    </div>

                </div>
                <div v-else class="flex-1 flex items-center justify-center text-gray-300">
                    <p class="text-[12px] font-bold uppercase tracking-widest opacity-40">Kullanıcı Seçin</p>
                </div>
            </section>
        </template>

        <!-- TAB: MAİL AYARLARI (Minimal) -->
        <template v-if="activeTab === 'mail'">
            <div class="flex-1 overflow-y-auto bg-white p-8">
                <div class="max-w-xl">
                    <h2 class="text-[16px] font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <i class="fas fa-paper-plane text-gray-400"></i>
                        SMTP Ayarları
                    </h2>

                    <form @submit.prevent="saveSmtpSettings" class="space-y-5">
                        <div class="grid grid-cols-4 gap-4">
                            <div class="col-span-3 flex flex-col gap-1.5">
                                <label class="text-[11px] font-bold text-gray-400 uppercase tracking-tight">Sunucu (Host)</label>
                                <input v-model="smtpSettings.host" type="text" class="sim-input" placeholder="smtp.gmail.com">
                            </div>
                            <div class="flex flex-col gap-1.5">
                                <label class="text-[11px] font-bold text-gray-400 uppercase tracking-tight">Port</label>
                                <input v-model="smtpSettings.port" type="number" class="sim-input" placeholder="587">
                            </div>
                        </div>

                        <div class="flex items-center gap-2 py-1">
                            <input type="checkbox" v-model="smtpSettings.secure" id="chk-secure" class="accent-blue-600">
                            <label for="chk-secure" class="text-[12px] font-bold text-gray-600 cursor-pointer">SSL/TLS Güvenli Bağlantı</label>
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div class="flex flex-col gap-1.5">
                                <label class="text-[11px] font-bold text-gray-400 uppercase tracking-tight">Kullanıcı</label>
                                <input v-model="smtpSettings.user" type="text" class="sim-input" placeholder="mail@talay.com">
                            </div>
                            <div class="flex flex-col gap-1.5">
                                <label class="text-[11px] font-bold text-gray-400 uppercase tracking-tight">Yeni Şifre</label>
                                <input v-model="smtpSettings.pass" type="password" class="sim-input" placeholder="••••••••">
                            </div>
                        </div>

                        <div class="flex flex-col gap-1.5">
                            <label class="text-[11px] font-bold text-gray-400 uppercase tracking-tight">Gönderen E-Posta</label>
                            <input v-model="smtpSettings.from_email" type="text" class="sim-input" placeholder="Talay IT <noreply@talay.com>">
                        </div>
                        
                        <div class="flex items-center gap-3 pt-6 border-t border-gray-50">
                            <button type="submit" class="btn-action-primary">Kaydet</button>
                            <button type="button" @click="showTestMailModal = true" class="btn-action-ghost">Test Gönder</button>
                        </div>
                    </form>
                </div>
            </div>
        </template>

    </main>

    <!-- MODAL (SIM STYLE) -->
    <Teleport to="body">
        <div v-if="showUserModal" class="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/30" @click.self="showUserModal = false">
            <div class="bg-white rounded shadow-xl w-full max-w-sm overflow-hidden border border-gray-200">
                <div class="px-5 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 class="text-[14px] font-bold text-gray-800">Yeni Kullanıcı</h3>
                    <button @click="showUserModal = false" class="text-gray-400 hover:text-gray-600"><i class="fas fa-times"></i></button>
                </div>
                <form @submit.prevent="createUser" class="p-5 space-y-4">
                    <div class="flex flex-col gap-1.5">
                        <label class="text-[11px] font-bold text-gray-400 uppercase">Ad Soyad</label>
                        <input v-model="newUser.full_name" required class="sim-input" placeholder="Ad Soyad">
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-[11px] font-bold text-gray-400 uppercase">E-posta</label>
                        <input v-model="newUser.email" type="email" required class="sim-input" placeholder="mail@talay.com">
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-[11px] font-bold text-gray-400 uppercase">Rol</label>
                        <select v-model="newUser.role_id" required class="sim-input bg-white">
                            <option v-for="role in roles" :key="role.id" :value="role.id">{{ role.name }}</option>
                        </select>
                    </div>
                    <div class="flex justify-end gap-2 pt-2">
                        <button type="button" @click="showUserModal = false" class="px-4 py-2 text-[12px] font-bold text-gray-400">İptal</button>
                        <button type="submit" :disabled="isCreatingUser" class="px-6 py-2 bg-blue-600 text-white text-[12px] font-bold rounded">Oluştur</button>
                    </div>
                </form>
            </div>
        </div>
    </Teleport>

  </div>
</template>

<style scoped>
.tab-item {
    @apply h-full px-5 text-[13px] font-bold text-gray-400 border-b-2 border-transparent transition-all;
}
.tab-item.active {
    @apply text-blue-600 border-blue-600 bg-blue-50/10;
}

.btn-action-primary {
    @apply h-9 px-4 bg-blue-600 text-white rounded text-[12px] font-bold hover:bg-blue-700 transition-all shadow-sm flex items-center gap-2;
}
.btn-action-ghost {
    @apply h-9 px-4 border border-gray-200 text-gray-500 rounded text-[12px] font-bold hover:bg-gray-50 transition-all;
}

.user-row {
    @apply w-full flex items-center gap-3 px-3 py-2 rounded transition-all text-left;
}
.user-row:hover { @apply bg-gray-50; }
.user-row.active { @apply bg-blue-50/50; }
.user-row.active span { @apply text-blue-600; }

.user-dot {
    @apply w-8 h-8 rounded bg-gray-100 text-gray-400 flex items-center justify-center text-[12px] font-bold;
}
.user-dot.active { @apply bg-blue-600 text-white; }

.role-select-minimal {
    @apply h-7 rounded border border-gray-100 bg-white text-[12px] font-bold px-2 outline-none focus:border-blue-500 transition-all cursor-pointer;
}

.sim-input {
    @apply w-full h-9 border border-gray-200 rounded px-3 text-[12px] font-medium outline-none focus:border-blue-500 transition-all;
}

.btn-save-minimal {
    @apply h-8 px-4 bg-blue-600 text-white rounded text-[11px] font-bold hover:bg-blue-700 transition-all flex items-center gap-2 disabled:opacity-50;
}

.tag-minimal {
    @apply px-2 py-0.5 rounded text-[9px] font-bold border uppercase;
}
.tag-minimal.blue { @apply bg-blue-50 text-blue-600 border-blue-100; }
.tag-minimal.purple { @apply bg-purple-50 text-purple-600 border-purple-100; }
.tag-minimal.gray { @apply bg-gray-50 text-gray-400 border-gray-100; }

/* SIM SWITCH */
.sim-switch {
    @apply relative inline-block w-8 h-4 cursor-pointer;
}
.sim-switch input { @apply opacity-0 w-0 h-0; }
.sim-slider {
    @apply absolute inset-0 bg-gray-200 rounded-full transition-all duration-200;
}
.sim-slider:before {
    @apply absolute content-[''] h-3 w-3 left-0.5 bottom-0.5 bg-white rounded-full transition-all duration-200;
}
input:checked + .sim-slider { @apply bg-blue-600; }
input:checked + .sim-slider:before { @apply translate-x-4; }
.sim-switch.disabled { @apply opacity-30 cursor-not-allowed; }
</style>
