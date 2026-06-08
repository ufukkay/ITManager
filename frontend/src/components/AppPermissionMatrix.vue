<script setup>
import { computed } from 'vue'

const props = defineProps({
    user: { type: Object, required: true },
    roles: { type: Array, default: () => [] },
    permissions: { type: Array, default: () => [] },
    rolePermissions: { type: Array, default: () => [] },
    userOverrides: { type: Array, default: () => [] },
    isSaving: { type: Boolean, default: false },
    hideHeader: { type: Boolean, default: false },
    hideActions: { type: Boolean, default: false }
})

const emit = defineEmits(['update:userOverrides', 'update:role', 'save'])

// Rolün sahip olduğu yetki ID'leri
const rolePermissionIds = computed(() => {
  if (!props.user) return []
  return props.rolePermissions
    .filter(rp => rp.role_id === props.user.role_id)
    .map(rp => rp.permission_id)
})

// Modül bazlı gruplandırılmış yetkiler
const modules = computed(() => {
    const map = {}
    props.permissions.forEach(p => {
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

const isPermissionGranted = (pId) => {
    if (!props.user) return false
    // Admin her şeye yetkili
    if (props.user.role_id === 1) return true
    // Rol yetkisi varsa VEYA kullanıcı override'ı varsa
    return rolePermissionIds.value.includes(pId) || props.userOverrides.includes(pId)
}

const isInherited = (pId) => {
    return rolePermissionIds.value.includes(pId)
}

const togglePermission = (pId) => {
    if (isInherited(pId)) return 
    
    const newOverrides = [...props.userOverrides]
    const idx = newOverrides.indexOf(pId)
    if (idx > -1) newOverrides.splice(idx, 1)
    else newOverrides.push(pId)
    
    emit('update:userOverrides', newOverrides)
}

</script>

<template>
  <div class="flex flex-col h-full bg-white rounded shadow-sm border border-gray-100 overflow-hidden">
      <!-- USER INFO BAR -->
      <div v-if="!hideHeader" class="px-6 py-4 border-b border-gray-50 bg-[#fafafa] flex items-center justify-between shrink-0">
          <div class="flex items-center gap-4">
              <div class="w-10 h-10 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center text-lg font-bold">
                  {{ user?.full_name?.charAt(0) }}
              </div>
              <div>
                  <h2 class="text-[15px] font-bold text-gray-900">{{ user?.full_name }}</h2>
                  <p class="text-[11px] text-gray-400 font-medium">{{ user?.email }}</p>
              </div>
          </div>
          <div class="flex items-center gap-4">
                <div class="flex flex-col items-end">
                    <span class="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Sistem Rolü</span>
                    <select :value="user?.role_id" @change="emit('update:role', $event.target.value)" class="role-select-minimal">
                      <option v-for="role in roles" :key="role.id" :value="role.id">{{ role.name }}</option>
                    </select>
                </div>
                <button @click="emit('save')" :disabled="isSaving" class="btn-save-minimal">
                  <i class="fas" :class="isSaving ? 'fa-spinner fa-spin' : 'fa-save'"></i>
                  {{ isSaving ? 'Kaydediliyor...' : 'YETKİLERİ KAYDET' }}
              </button>
          </div>
      </div>

      <!-- MATRIX TABLE -->
      <div class="flex-1 overflow-x-auto min-h-0">
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
                              <label class="sim-switch" :class="{ 'disabled': isInherited(mod.view?.id) || user?.role_id === 1 }">
                                  <input type="checkbox" :checked="isPermissionGranted(mod.view?.id)" @change="togglePermission(mod.view?.id)" :disabled="isInherited(mod.view?.id) || user?.role_id === 1">
                                  <span class="sim-slider"></span>
                              </label>
                          </div>
                      </td>

                      <td class="px-6 py-3.5 text-center">
                          <div class="flex justify-center" v-if="mod.edit">
                              <label class="sim-switch" :class="{ 'disabled': isInherited(mod.edit?.id) || user?.role_id === 1 }">
                                  <input type="checkbox" :checked="isPermissionGranted(mod.edit?.id)" @change="togglePermission(mod.edit?.id)" :disabled="isInherited(mod.edit?.id) || user?.role_id === 1">
                                  <span class="sim-slider"></span>
                              </label>
                          </div>
                          <span v-else class="text-[10px] text-gray-200">—</span>
                      </td>

                      <td class="px-6 py-3.5">
                          <div class="flex justify-center">
                              <span v-if="user?.role_id === 1" class="tag-minimal purple">ADMIN</span>
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
      <div v-if="user?.role_id === 1" class="px-6 py-3 border-t border-gray-50 bg-gray-50/50 flex items-center gap-3 shrink-0">
          <i class="fas fa-info-circle text-gray-400 text-[12px]"></i>
          <span class="text-[11px] text-gray-500 font-medium">Bu kullanıcı Admin yetkilerine sahiptir ve tüm kısıtlamalardan muaftır.</span>
      </div>
      
      <!-- FOOTER ACTIONS FOR HIDE-HEADER MODE -->
      <div v-if="hideHeader && !hideActions" class="px-6 py-3 border-t border-gray-50 bg-[#fafafa] flex items-center justify-between shrink-0">
          <div class="flex items-center gap-3">
               <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Rol Değiştir:</span>
               <select :value="user?.role_id" @change="emit('update:role', $event.target.value)" class="role-select-minimal">
                  <option v-for="role in roles" :key="role.id" :value="role.id">{{ role.name }}</option>
               </select>
          </div>
          <button @click="emit('save')" :disabled="isSaving" class="btn-save-minimal">
              <i class="fas" :class="isSaving ? 'fa-spinner fa-spin' : 'fa-save'"></i>
              {{ isSaving ? 'Kaydediliyor...' : 'YETKİLERİ KAYDET' }}
          </button>
      </div>

  </div>
</template>

<style scoped>
.role-select-minimal {
    @apply h-7 rounded border border-gray-100 bg-white text-[12px] font-bold px-2 outline-none focus:border-blue-500 transition-all cursor-pointer;
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
