<script setup>
import { ref, onMounted, computed } from 'vue'
import api from '../api'

// -- State --
const roles = ref([])
const permissions = ref([])
const rolePermissions = ref([])
const users = ref([])
const loading = ref(true)
const activeTab = ref('permissions') // 'permissions' or 'users'
const selectedRoleId = ref(null)

// -- Load Data --
const loadData = async () => {
  loading.value = true
  try {
    const [permRes, userRes] = await Promise.all([
      api.get('/admin/api/permissions'),
      api.get('/admin/api/users')
    ])
    
    if (permRes.data.success) {
      roles.value = permRes.data.roles
      permissions.value = permRes.data.permissions
      rolePermissions.value = permRes.data.rolePermissions
      if (roles.value.length > 0 && !selectedRoleId.value) {
        selectedRoleId.value = roles.value[0].id
      }
    }

    if (userRes.data.success) {
      users.value = userRes.data.users
    }
  } catch (err) {
    console.error('Veriler yüklenemedi:', err)
  } finally {
    loading.value = false
  }
}

// -- Computed --
const groupedPermissions = computed(() => {
  const groups = {}
  permissions.value.forEach(p => {
    if (!groups[p.module]) groups[p.module] = []
    groups[p.module].push(p)
  })
  return groups
})

const selectedRole = computed(() => {
  return roles.value.find(r => r.id === selectedRoleId.value) || null
})

// -- Methods --
const isPermissionActive = (permissionId) => {
    return rolePermissions.value.some(
        rp => rp.role_id === selectedRoleId.value && rp.permission_id === permissionId
    )
}

const handlePermissionChange = (permissionId, e) => {
    if (!selectedRoleId.value) return
    const isChecked = e.target.checked
    
    if (isChecked) {
        rolePermissions.value.push({
            role_id: selectedRoleId.value,
            permission_id: permissionId
        })
    } else {
        rolePermissions.value = rolePermissions.value.filter(
            rp => !(rp.role_id === selectedRoleId.value && rp.permission_id === permissionId)
        )
    }
}

const saveRolePermissions = async () => {
  if (!selectedRoleId.value) return
  const activeIds = rolePermissions.value
    .filter(rp => rp.role_id === selectedRoleId.value)
    .map(rp => rp.permission_id)

  try {
    const res = await api.post('/admin/api/permissions/update', {
        role_id: selectedRoleId.value,
        permission_ids: activeIds
    })
    if (res.data.success) {
        alert('Yetkiler başarıyla kaydedildi.')
    }
  } catch (err) {
    alert('Kaydetme hatası.')
  }
}

const updateUserRole = async (userId, roleId) => {
    try {
        await api.post('/admin/api/users/update-role', {
            user_id: userId,
            role_id: roleId
        })
        // Update local state is optional if we refresh
        loadData()
    } catch (err) {
        alert('Rol güncelleme hatası.')
    }
}

const formatPermissionKey = (key) => {
    return key.replace(/_/g, ' ').replace(/:/g, ' ')
}

onMounted(() => {
    loadData()
})
</script>

<template>
  <div class="h-full flex flex-col bg-[#f1f3f4] text-[#3c4043] font-sans">
    
    <!-- Header -->
    <div class="bg-white border-b border-[#dadce0] px-6 py-4 shrink-0 flex items-center justify-between shadow-sm">
        <div class="flex items-center gap-6">
            <h1 class="text-[20px] font-normal text-gray-700 tracking-tight">Yetki ve Kullanıcı Yönetimi</h1>
            
            <!-- Tabs -->
            <div class="flex items-center gap-1 ml-4 h-full">
                <button 
                    @click="activeTab = 'permissions'"
                    class="h-10 px-6 text-[13px] font-medium border-b-2 transition-all"
                    :class="activeTab === 'permissions' ? 'border-[#1a73e8] text-[#1a73e8]' : 'border-transparent text-gray-500 hover:text-gray-700'"
                >
                    Rol Yetkileri
                </button>
                <button 
                    @click="activeTab = 'users'"
                    class="h-10 px-6 text-[13px] font-medium border-b-2 transition-all"
                    :class="activeTab === 'users' ? 'border-[#1a73e8] text-[#1a73e8]' : 'border-transparent text-gray-500 hover:text-gray-700'"
                >
                    Kullanıcılar
                </button>
            </div>
        </div>
        
        <button v-if="activeTab === 'permissions'" @click="saveRolePermissions" class="h-9 px-6 bg-[#1a73e8] text-white rounded text-[13px] font-bold hover:bg-blue-700 shadow-sm">
            DEĞİŞİKLİKLERİ KAYDET
        </button>
    </div>

    <!-- Content Area -->
    <div class="flex-1 overflow-hidden flex p-4 min-h-0">
        
        <!-- Tab 1: Permissions Matrix -->
        <div v-if="activeTab === 'permissions'" class="flex-1 flex gap-4 overflow-hidden">
            <!-- Sidebar: Roles -->
            <div class="w-[280px] bg-white border border-[#dadce0] rounded shadow-sm overflow-y-auto shrink-0 flex flex-col p-2 space-y-1">
                <div class="px-3 py-2 text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Rollar</div>
                <button 
                    v-for="role in roles" 
                    :key="role.id"
                    @click="selectedRoleId = role.id"
                    class="w-full text-left p-3 rounded text-[13px] transition-all flex flex-col"
                    :class="selectedRoleId === role.id ? 'bg-[#e8f0fe] text-[#1a73e8]' : 'hover:bg-gray-50 text-gray-600'"
                >
                    <span class="font-bold">{{ role.name }}</span>
                    <span class="text-[11px] opacity-70">{{ role.description }}</span>
                </button>
            </div>

            <!-- Workspace: Permissions -->
            <div class="flex-1 bg-white border border-[#dadce0] rounded shadow-sm overflow-y-auto p-8">
                <div v-if="selectedRole" class="max-w-4xl mx-auto space-y-12">
                    <div class="border-b border-gray-100 pb-6 mb-8">
                        <h2 class="text-[20px] font-normal text-gray-900">{{ selectedRole.name }} Yetkileri</h2>
                        <p class="text-[13px] text-gray-500 mt-1">Bu rol için modül bazlı yetkileri aşağıdan yönetebilirsiniz.</p>
                    </div>

                    <div v-for="(perms, moduleName) in groupedPermissions" :key="moduleName" class="space-y-4">
                        <h3 class="text-[11px] font-bold text-[#1a73e8] uppercase tracking-widest flex items-center gap-2">
                             <span class="w-1.5 h-1.5 rounded-full bg-[#1a73e8]"></span>
                             {{ moduleName }} Modülü
                        </h3>
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <label 
                                v-for="p in perms" 
                                :key="p.id"
                                class="flex gap-4 p-4 border border-[#e0e0e0] rounded hover:border-[#1a73e8] hover:bg-[#f8faff] transition-colors cursor-pointer"
                                :class="{ 'bg-[#f8faff] border-[#d2e3fc]': isPermissionActive(p.id) }"
                            >
                                <input 
                                    type="checkbox" 
                                    class="accent-[#1a73e8] w-4 h-4 mt-0.5"
                                    :checked="isPermissionActive(p.id)"
                                    @change="handlePermissionChange(p.id, $event)"
                                >
                                <div class="flex flex-col">
                                    <span class="text-[13px] font-bold text-[#3c4043]">{{ formatPermissionKey(p.permission_key) }}</span>
                                    <span class="text-[12px] text-gray-500 leading-tight mt-1">{{ p.description }}</span>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>
                <div v-else-if="!loading" class="h-full flex flex-col items-center justify-center text-gray-400">
                    <i class="fas fa-shield-alt text-4xl mb-4 opacity-20"></i>
                    <span class="text-[15px]">Lütfen yetkilerini düzenlemek için bir rol seçin.</span>
                </div>
            </div>
        </div>

        <!-- Tab 2: Users List -->
        <div v-if="activeTab === 'users'" class="flex-1 bg-white border border-[#dadce0] rounded shadow-sm overflow-hidden flex flex-col">
            <div class="overflow-x-auto flex-1">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-[#f8f9fa] border-b border-[#dadce0] text-[#5f6368] text-[11px] font-bold uppercase tracking-wider">
                            <th class="py-3 px-6 w-[250px] border-r border-[#dadce0]">Kullanıcı</th>
                            <th class="py-3 px-6 w-[200px] border-r border-[#dadce0]">Kullanıcı Adı</th>
                            <th class="py-3 px-6 w-[250px] border-r border-[#dadce0]">Aktif Rol</th>
                            <th class="py-3 px-6">İşlemler</th>
                        </tr>
                    </thead>
                    <tbody class="text-[13px] text-[#3c4043]">
                        <tr v-for="user in users" :key="user.id" class="border-b border-[#dadce0] hover:bg-[#f1f3f4] transition-none group">
                            <td class="py-3 px-6 border-r border-[#dadce0] font-bold">{{ user.full_name }}</td>
                            <td class="py-3 px-6 border-r border-[#dadce0] font-mono text-gray-500">{{ user.username }}</td>
                            <td class="py-3 px-6 border-r border-[#dadce0]">
                                <select 
                                    @change="updateUserRole(user.id, $event.target.value)"
                                    class="h-8 w-full border border-[#dadce0] rounded bg-white px-2 outline-none focus:border-[#1a73e8] text-[12px] font-bold"
                                >
                                    <option v-for="role in roles" :key="role.id" :value="role.id" :selected="user.role_id === role.id">
                                        {{ role.name }}
                                    </option>
                                </select>
                            </td>
                            <td class="py-3 px-6">
                                <div class="flex items-center gap-2">
                                    <button class="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all" title="Şifre Sıfırla">
                                        <i class="fas fa-key text-[12px]"></i>
                                    </button>
                                    <button class="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all" title="Kullanıcıyı Sil">
                                        <i class="fas fa-user-minus text-[12px]"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div class="px-6 py-3 border-t border-[#dadce0] bg-[#f8f9fa] text-[12px] text-gray-500">
                Toplam <span class="font-bold text-gray-700">{{ users.length }}</span> kullanıcı listeleniyor.
            </div>
        </div>

    </div>

    <!-- Global Loading Overlay -->
    <div v-if="loading" class="fixed inset-0 bg-white/50 z-[1000] flex items-center justify-center">
        <div class="flex flex-col items-center gap-4">
            <span class="loading loading-spinner text-[#1a73e8] loading-lg"></span>
            <span class="text-[13px] font-bold text-gray-500">Veriler hazırlanıyor...</span>
        </div>
    </div>

  </div>
</template>

<style scoped>
/* Scrollbar Google Cloud Style */
::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #dadce0; border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: #bdc1c6; }
</style>
