<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../../api'
import AppTable from '../../components/AppTable.vue'

// Active Tab
const activeTab = ref('users') // 'users' | 'matrix'

// Loading & Notification states
const loading = ref(false)
const notification = ref({ show: false, message: '', type: 'success' })

const showToast = (message, type = 'success') => {
  notification.value = { show: true, message, type }
  setTimeout(() => { notification.value.show = false }, 4000)
}

// ----------------------------------------------------
// TAB 1: KULLANICI LİSTESİ & YÖNETİMİ
// ----------------------------------------------------
const users = ref([])
const roles = ref([])
const personnelList = ref([])
const searchQuery = ref('')
const selectedRoleFilter = ref('ALL')

// Modals
const showCreateModal = ref(false)
const showPasswordModal = ref(false)
const showPermissionsModal = ref(false)

// Form States
const newUser = ref({ full_name: '', email: '', role_id: 2, personnel_id: null })
const selectedUserForPassword = ref(null)
const newPasswordInput = ref('')
const selectedUserForPerms = ref(null)
const userPermsGrantedIds = ref([])
const allPermissionsList = ref([])
const rolePermissionsList = ref([])

const loadData = async () => {
  try {
    loading.value = true
    const [usersRes, permsRes, persRes] = await Promise.all([
      api.get('/admin/api/users'),
      api.get('/admin/api/permissions'),
      api.get('/master-data/personnel')
    ])

    if (usersRes.data.success) {
      users.value = usersRes.data.users
    }
    if (permsRes.data.success) {
      roles.value = permsRes.data.roles || []
      allPermissionsList.value = permsRes.data.permissions || []
      rolePermissionsList.value = permsRes.data.rolePermissions || []
    }
    if (persRes.data) {
      personnelList.value = Array.isArray(persRes.data) ? persRes.data : (persRes.data.personnel || [])
    }
  } catch (err) {
    console.error('Data load error:', err)
    showToast('Veriler yüklenirken bir hata oluştu.', 'error')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})

const filteredUsers = computed(() => {
  return users.value.filter(u => {
    const matchesSearch = !searchQuery.value || 
      (u.full_name && u.full_name.toLowerCase().includes(searchQuery.value.toLowerCase())) ||
      (u.email && u.email.toLowerCase().includes(searchQuery.value.toLowerCase())) ||
      (u.username && u.username.toLowerCase().includes(searchQuery.value.toLowerCase()))

    const matchesRole = selectedRoleFilter.value === 'ALL' || u.role_id === parseInt(selectedRoleFilter.value)

    return matchesSearch && matchesRole
  })
})

const tableColumns = [
  { key: 'user_info', label: 'Kullanıcı Bilgisi' },
  { key: 'role_name', label: 'Rol' },
  { key: 'personnel_name', label: 'İlişkili Personel' },
  { key: 'is_active', label: 'Durum' },
  { key: 'actions', label: 'İşlemler' }
]

// Actions
const handleToggleStatus = async (user) => {
  try {
    const res = await api.post(`/admin/api/users/${user.id}/toggle-status`)
    if (res.data.success) {
      user.is_active = res.data.is_active
      showToast(res.data.message, 'success')
    }
  } catch (err) {
    showToast(err.response?.data?.message || 'Durum değiştirilemedi.', 'error')
  }
}

const handleRoleChange = async (user, newRoleId) => {
  try {
    const res = await api.post('/admin/api/users/update-role', {
      user_id: user.id,
      role_id: parseInt(newRoleId)
    })
    if (res.data.success) {
      user.role_id = parseInt(newRoleId)
      const roleObj = roles.value.find(r => r.id === parseInt(newRoleId))
      if (roleObj) user.role_name = roleObj.name
      showToast('Kullanıcı rolü başarıyla güncellendi.', 'success')
    }
  } catch (err) {
    showToast(err.response?.data?.message || 'Rol güncellenemedi.', 'error')
  }
}

const openPasswordModal = (user) => {
  selectedUserForPassword.value = user
  newPasswordInput.value = ''
  showPasswordModal.value = true
}

const handleResetPassword = async () => {
  if (!newPasswordInput.value || newPasswordInput.value.length < 4) {
    showToast('Lütfen en az 4 karakterli bir şifre girin.', 'error')
    return
  }
  try {
    const res = await api.post(`/admin/api/users/${selectedUserForPassword.value.id}/reset-password`, {
      new_password: newPasswordInput.value
    })
    if (res.data.success) {
      showToast('Kullanıcı şifresi başarıyla güncellendi.', 'success')
      showPasswordModal.value = false
    }
  } catch (err) {
    showToast(err.response?.data?.message || 'Şifre sıfırlanamadı.', 'error')
  }
}

const openPermissionsModal = async (user) => {
  selectedUserForPerms.value = user
  try {
    const res = await api.get(`/admin/api/users/${user.id}/permissions`)
    if (res.data.success) {
      userPermsGrantedIds.value = res.data.userPermissions.filter(p => p.granted === 1).map(p => p.permission_id)
    }
    showPermissionsModal.value = true
  } catch (err) {
    showToast('Kullanıcı izinleri alınamadı.', 'error')
  }
}

const handleSaveUserPermissions = async () => {
  try {
    const res = await api.post(`/admin/api/users/${selectedUserForPerms.value.id}/permissions`, {
      grantedIds: userPermsGrantedIds.value
    })
    if (res.data.success) {
      showToast('Kullanıcıya özel yetkiler kaydedildi.', 'success')
      showPermissionsModal.value = false
    }
  } catch (err) {
    showToast(err.response?.data?.message || 'Yetkiler kaydedilemedi.', 'error')
  }
}

const handleCreateUser = async () => {
  if (!newUser.value.email || !newUser.value.full_name) {
    showToast('Lütfen ad soyad ve e-posta alanlarını doldurun.', 'error')
    return
  }
  try {
    const res = await api.post('/admin/api/users/create', newUser.value)
    if (res.data.success) {
      showToast(res.data.message, 'success')
      showCreateModal.value = false
      newUser.value = { full_name: '', email: '', role_id: 2, personnel_id: null }
      loadData()
    }
  } catch (err) {
    showToast(err.response?.data?.message || 'Kullanıcı oluşturulamadı.', 'error')
  }
}

// ----------------------------------------------------
// TAB 2: ROL YETKİ MATRİSİ (ROLE PERMISSION MATRIX)
// ----------------------------------------------------
const matrixState = ref({})

const initMatrixState = () => {
  const state = {}
  roles.value.forEach(r => {
    state[r.id] = new Set()
  })
  rolePermissionsList.value.forEach(rp => {
    if (state[rp.role_id]) {
      state[rp.role_id].add(rp.permission_id)
    }
  })
  matrixState.value = state
}

const onTabChange = (tab) => {
  activeTab.value = tab
  if (tab === 'matrix') {
    initMatrixState()
  }
}

const groupedPermissions = computed(() => {
  const groups = {}
  allPermissionsList.value.forEach(p => {
    const mod = p.module || 'Genel'
    if (!groups[mod]) groups[mod] = []
    groups[mod].push(p)
  })
  return groups
})

const isPermissionChecked = (roleId, permissionId) => {
  if (roleId === 1) return true
  return matrixState.value[roleId] && matrixState.value[roleId].has(permissionId)
}

const toggleMatrixPermission = (roleId, permissionId) => {
  if (roleId === 1) return
  if (!matrixState.value[roleId]) matrixState.value[roleId] = new Set()

  if (matrixState.value[roleId].has(permissionId)) {
    matrixState.value[roleId].delete(permissionId)
  } else {
    matrixState.value[roleId].add(permissionId)
  }
}

const saveRoleMatrix = async (roleId) => {
  try {
    const pIds = Array.from(matrixState.value[roleId] || [])
    const res = await api.post('/admin/api/permissions/update', {
      role_id: roleId,
      permission_ids: pIds
    })
    if (res.data.success) {
      showToast('Rol izinleri başarıyla güncellendi.', 'success')
      loadData()
    }
  } catch (err) {
    showToast(err.response?.data?.message || 'İzinler güncellenemedi.', 'error')
  }
}
</script>

<template>
  <div class="h-full flex flex-col bg-gray-50/50 dark:bg-slate-900 p-6 overflow-y-auto">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
      <div>
        <h1 class="text-xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
          <i class="fas fa-user-shield text-blue-600 dark:text-blue-400"></i>
          Kullanıcı ve Yetki Yönetimi
        </h1>
        <p class="text-xs text-gray-500 dark:text-slate-400 mt-1">
          Sistemdeki Admin, Teknisyen ve Personel hesaplarını ve rol erişim matrisini buradan yönetin.
        </p>
      </div>

      <!-- Actions / Tab Switcher -->
      <div class="flex items-center gap-2 bg-white dark:bg-slate-800 p-1 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
        <button
          @click="onTabChange('users')"
          class="px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2"
          :class="activeTab === 'users' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700'"
        >
          <i class="fas fa-users text-xs"></i>
          Kullanıcı Hesapları ({{ users.length }})
        </button>

        <button
          @click="onTabChange('matrix')"
          class="px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2"
          :class="activeTab === 'matrix' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700'"
        >
          <i class="fas fa-th-list text-xs"></i>
          Rol Yetki Matrisi
        </button>
      </div>
    </div>

    <!-- Notification Toast -->
    <transition name="fade">
      <div
        v-if="notification.show"
        class="mb-4 p-4 rounded-xl text-xs font-bold flex items-center justify-between shadow-sm transition-all"
        :class="notification.type === 'error' ? 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/30' : 'bg-emerald-50 dark:bg-green-500/10 text-emerald-700 dark:text-green-400 border border-emerald-200 dark:border-green-500/30'"
      >
        <div class="flex items-center gap-2">
          <i :class="notification.type === 'error' ? 'fas fa-exclamation-circle' : 'fas fa-check-circle'"></i>
          {{ notification.message }}
        </div>
        <button @click="notification.show = false" class="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300">
          <i class="fas fa-times"></i>
        </button>
      </div>
    </transition>

    <!-- TAB 1: KULLANICI LİSTESİ -->
    <div v-if="activeTab === 'users'" class="flex-1 flex flex-col gap-4">
      <!-- Search & Filters -->
      <div class="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div class="flex items-center gap-3 w-full sm:w-auto flex-1">
          <!-- Search -->
          <div class="relative flex-1 max-w-md">
            <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 text-xs"></i>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="İsim, e-posta veya kullanıcı adı ara..."
              class="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 dark:text-slate-100 rounded-xl text-xs outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
            />
          </div>

          <!-- Role Filter -->
          <select
            v-model="selectedRoleFilter"
            class="px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 dark:text-slate-100 rounded-xl text-xs font-medium outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
          >
            <option value="ALL">Tüm Roller</option>
            <option v-for="r in roles" :key="r.id" :value="r.id">{{ r.name }}</option>
          </select>
        </div>

        <button
          @click="showCreateModal = true"
          class="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2"
        >
          <i class="fas fa-user-plus text-xs"></i>
          Yeni Kullanıcı Hesabı Ekle
        </button>
      </div>

      <!-- Users Table -->
      <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden flex-1 flex flex-col">
        <AppTable
          :columns="tableColumns"
          :data="filteredUsers"
          :loading="loading"
        >
          <!-- User Info Column -->
          <template #cell-user_info="{ row }">
            <div class="flex items-center gap-3">
              <div
                class="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                :class="{
                  'bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400': row.role_id === 1,
                  'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400': row.role_id === 2,
                  'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300': row.role_id === 3
                }"
              >
                {{ (row.full_name || row.email).substring(0, 2).toUpperCase() }}
              </div>
              <div>
                <div class="font-bold text-gray-900 dark:text-slate-100 text-xs flex items-center gap-1.5">
                  {{ row.full_name || 'İsimsiz Kullanıcı' }}
                  <span v-if="row.role_id === 1" class="px-1.5 py-0.5 bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-500/30 text-[10px] font-bold rounded">Admin</span>
                </div>
                <div class="text-[11px] text-gray-500 dark:text-slate-400 font-mono mt-0.5">{{ row.email }}</div>
              </div>
            </div>
          </template>

          <!-- Role Select Column -->
          <template #cell-role_name="{ row }">
            <select
              :value="row.role_id"
              @change="handleRoleChange(row, $event.target.value)"
              class="px-2.5 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg text-xs font-bold bg-gray-50 dark:bg-slate-900 dark:text-slate-100 hover:bg-white dark:hover:bg-slate-800 focus:border-blue-500 outline-none transition-all"
              :disabled="row.id === 1"
            >
              <option v-for="r in roles" :key="r.id" :value="r.id">{{ r.name }}</option>
            </select>
          </template>

          <!-- Personnel Column -->
          <template #cell-personnel_name="{ row }">
            <div v-if="row.personnel_name" class="text-xs text-gray-700 dark:text-slate-300 flex items-center gap-1.5 font-medium">
              <i class="fas fa-id-card text-gray-400 dark:text-slate-500 text-xs"></i>
              {{ row.personnel_name }}
            </div>
            <span v-else class="text-[11px] text-gray-400 dark:text-slate-500 italic">Eşleşen Personel Yok</span>
          </template>

          <!-- Status Column -->
          <template #cell-is_active="{ row }">
            <button
              @click="handleToggleStatus(row)"
              :disabled="row.id === 1"
              class="px-3 py-1 rounded-full text-[11px] font-bold transition-all flex items-center gap-1.5"
              :class="row.is_active === 1
                ? 'bg-emerald-50 dark:bg-green-500/10 text-emerald-700 dark:text-green-400 border border-emerald-200 dark:border-green-500/30 hover:bg-emerald-100 dark:hover:bg-green-500/20'
                : 'bg-rose-50 dark:bg-red-500/10 text-rose-700 dark:text-red-400 border border-rose-200 dark:border-red-500/30 hover:bg-rose-100 dark:hover:bg-red-500/20'"
            >
              <span class="w-1.5 h-1.5 rounded-full" :class="row.is_active === 1 ? 'bg-emerald-500' : 'bg-rose-500'"></span>
              {{ row.is_active === 1 ? 'Aktif' : 'Pasif (Dondurulmuş)' }}
            </button>
          </template>

          <!-- Actions Column -->
          <template #cell-actions="{ row }">
            <div class="flex items-center gap-2">
              <!-- Reset Password -->
              <button
                @click="openPasswordModal(row)"
                title="Şifre Değiştir"
                class="p-1.5 text-gray-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-all"
              >
                <i class="fas fa-key text-xs"></i>
              </button>

              <!-- Custom Permissions Override -->
              <button
                @click="openPermissionsModal(row)"
                title="Kullanıcıya Özel Yetkiler (Override)"
                class="p-1.5 text-gray-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-500/10 rounded-lg transition-all"
              >
                <i class="fas fa-sliders-h text-xs"></i>
              </button>
            </div>
          </template>
        </AppTable>
      </div>
    </div>

    <!-- TAB 2: ROL YETKİ MATRİSİ -->
    <div v-if="activeTab === 'matrix'" class="flex-1 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden flex flex-col p-6 space-y-6">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-gray-100 dark:border-slate-700">
        <div>
          <h2 class="text-base font-bold text-gray-900 dark:text-slate-100">Rol Bazlı İzin Matrisi (RBAC)</h2>
          <p class="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
            Sistemdeki Teknisyen ve Personel rollerine varsayılan olarak tanımlı yetkileri işaretleyin ve kaydedin.
          </p>
        </div>

        <div class="flex items-center gap-3">
          <button
            v-for="r in roles.filter(role => role.id !== 1)"
            :key="r.id"
            @click="saveRoleMatrix(r.id)"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-2"
          >
            <i class="fas fa-save text-xs"></i>
            {{ r.name }} İzinlerini Kaydet
          </button>
        </div>
      </div>

      <!-- Permission Matrix Table -->
      <div class="overflow-x-auto border border-gray-100 dark:border-slate-700 rounded-xl">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-gray-50 dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700 text-xs font-bold text-gray-600 dark:text-slate-400">
              <th class="py-3 px-4 w-1/3">Modül / İzin Tanımı</th>
              <th class="py-3 px-4 w-1/6 text-center bg-purple-50/50 dark:bg-purple-500/10 text-purple-900 dark:text-purple-400">
                <i class="fas fa-crown text-purple-500 mr-1.5"></i> Admin
              </th>
              <th v-for="r in roles.filter(role => role.id !== 1)" :key="r.id" class="py-3 px-4 w-1/4 text-center">
                <i class="fas fa-user-cog text-blue-500 mr-1.5"></i> {{ r.name }}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-slate-700 text-xs">
            <template v-for="(perms, moduleName) in groupedPermissions" :key="moduleName">
              <!-- Module Header Row -->
              <tr class="bg-gray-100/70 dark:bg-slate-700/50 font-bold text-gray-800 dark:text-slate-200">
                <td colspan="4" class="py-2.5 px-4 text-xs uppercase tracking-wider text-gray-600 dark:text-slate-400">
                  <i class="fas fa-folder-open text-blue-500 mr-2"></i>
                  {{ moduleName }}
                </td>
              </tr>

              <!-- Permission Rows -->
              <tr v-for="p in perms" :key="p.id" class="hover:bg-gray-50/80 dark:hover:bg-slate-700/50 transition-colors">
                <td class="py-3 px-4">
                  <div class="font-bold text-gray-900 dark:text-slate-100">{{ p.permission_key }}</div>
                  <div class="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">{{ p.description }}</div>
                </td>

                <!-- Admin Column (Always checked & disabled) -->
                <td class="py-3 px-4 text-center bg-purple-50/20 dark:bg-purple-500/5">
                  <input type="checkbox" checked disabled class="w-4 h-4 text-purple-600 rounded border-purple-300 opacity-60 cursor-not-allowed">
                </td>

                <!-- Other Roles Columns -->
                <td v-for="r in roles.filter(role => role.id !== 1)" :key="r.id" class="py-3 px-4 text-center">
                  <input
                    type="checkbox"
                    :checked="isPermissionChecked(r.id, p.id)"
                    @change="toggleMatrixPermission(r.id, p.id)"
                    class="w-4 h-4 text-blue-600 rounded border-gray-300 dark:border-slate-600 focus:ring-blue-500 cursor-pointer"
                  />
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>

    <!-- MODAL: YENİ KULLANICI OLUŞTUR -->
    <div v-if="showCreateModal" class="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-150">
        <h3 class="text-base font-bold text-gray-900 dark:text-slate-100 mb-4 flex items-center gap-2">
          <i class="fas fa-user-plus text-blue-600 dark:text-blue-400"></i>
          Yeni Kullanıcı Hesabı Oluştur
        </h3>

        <div class="space-y-4 text-xs">
          <div>
            <label class="block font-bold text-gray-700 dark:text-slate-300 mb-1">Ad Soyad</label>
            <input v-model="newUser.full_name" type="text" placeholder="Örn: Ahmet Yılmaz" class="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-xl outline-none focus:border-blue-500" />
          </div>

          <div>
            <label class="block font-bold text-gray-700 dark:text-slate-300 mb-1">E-posta Adresi</label>
            <input v-model="newUser.email" type="email" placeholder="ahmet.yilmaz@itmanager.com" class="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-xl outline-none focus:border-blue-500" />
          </div>

          <div>
            <label class="block font-bold text-gray-700 dark:text-slate-300 mb-1">Rol</label>
            <select v-model="newUser.role_id" class="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 bg-white dark:bg-slate-900 dark:text-slate-100">
              <option v-for="r in roles" :key="r.id" :value="r.id">{{ r.name }}</option>
            </select>
          </div>

          <div>
            <label class="block font-bold text-gray-700 dark:text-slate-300 mb-1">İlişkili Personel Kartı (İsteğe Bağlı)</label>
            <select v-model="newUser.personnel_id" class="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 bg-white dark:bg-slate-900 dark:text-slate-100">
              <option :value="null">-- Eşleşen Personel Seçilmedi --</option>
              <option v-for="p in personnelList" :key="p.id" :value="p.id">{{ p.first_name }} {{ p.last_name }} ({{ p.email }})</option>
            </select>
          </div>
        </div>

        <div class="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100 dark:border-slate-700">
          <button @click="showCreateModal = false" class="px-4 py-2 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all">İptal</button>
          <button @click="handleCreateUser" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm">Kullanıcıyı Kaydet</button>
        </div>
      </div>
    </div>

    <!-- MODAL: ŞİFRE SIFIRLA -->
    <div v-if="showPasswordModal" class="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-white dark:bg-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-xl border border-gray-100 dark:border-slate-700">
        <h3 class="text-base font-bold text-gray-900 dark:text-slate-100 mb-2 flex items-center gap-2">
          <i class="fas fa-key text-amber-500"></i>
          Şifre Sıfırla
        </h3>
        <p class="text-xs text-gray-500 dark:text-slate-400 mb-4">
          <strong>{{ selectedUserForPassword?.full_name || selectedUserForPassword?.email }}</strong> kullanıcısı için yeni şifre belirleyin.
        </p>

        <div>
          <label class="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Yeni Şifre</label>
          <input v-model="newPasswordInput" type="password" placeholder="En az 4 karakter" class="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-xl text-xs outline-none focus:border-blue-500" />
        </div>

        <div class="flex justify-end gap-2 mt-6">
          <button @click="showPasswordModal = false" class="px-4 py-2 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-300 rounded-xl text-xs font-bold">İptal</button>
          <button @click="handleResetPassword" class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm">Şifreyi Güncelle</button>
        </div>
      </div>
    </div>

    <!-- MODAL: KULLANICIYA ÖZEL İZİNLER (OVERRIDE) -->
    <div v-if="showPermissionsModal" class="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-100 dark:border-slate-700 max-h-[85vh] flex flex-col">
        <h3 class="text-base font-bold text-gray-900 dark:text-slate-100 mb-1 flex items-center gap-2">
          <i class="fas fa-sliders-h text-purple-600 dark:text-purple-400"></i>
          Kullanıcıya Özel İzin Tanımlama
        </h3>
        <p class="text-xs text-gray-500 dark:text-slate-400 mb-4">
          <strong>{{ selectedUserForPerms?.full_name }}</strong> kullanıcısına genel rol haricinde ekstra yetkiler tanıyın.
        </p>

        <div class="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
          <div v-for="(perms, mod) in groupedPermissions" :key="mod" class="bg-gray-50 dark:bg-slate-900 p-3 rounded-xl border border-gray-100 dark:border-slate-700">
            <div class="font-bold text-gray-800 dark:text-slate-200 mb-2">{{ mod }}</div>
            <div class="space-y-2">
              <label v-for="p in perms" :key="p.id" class="flex items-start gap-2.5 cursor-pointer hover:bg-white dark:hover:bg-slate-800 p-1.5 rounded-lg transition-all">
                <input
                  type="checkbox"
                  :value="p.id"
                  v-model="userPermsGrantedIds"
                  class="w-4 h-4 text-purple-600 rounded border-gray-300 dark:border-slate-600 mt-0.5"
                />
                <div>
                  <div class="font-bold text-gray-900 dark:text-slate-100">{{ p.permission_key }}</div>
                  <div class="text-[11px] text-gray-500 dark:text-slate-400">{{ p.description }}</div>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div class="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-slate-700">
          <button @click="showPermissionsModal = false" class="px-4 py-2 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-300 rounded-xl text-xs font-bold">İptal</button>
          <button @click="handleSaveUserPermissions" class="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-sm">Özel Yetkileri Kaydet</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
