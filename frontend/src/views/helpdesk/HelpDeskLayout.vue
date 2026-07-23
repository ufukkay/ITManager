<template>
  <div class="flex h-full bg-gray-50/50">
    <!-- Sidebar -->
    <div class="w-64 bg-white border-r border-gray-100 flex flex-col shrink-0">
      <div class="h-14 flex items-center px-6 border-b border-gray-100 shrink-0">
        <h2 class="text-[13px] font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
          <i class="fas fa-headset text-blue-500"></i> IT Destek
        </h2>
      </div>
      
      <nav class="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        <router-link
          to="/helpdesk/my-tickets"
          class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors"
          active-class="bg-blue-50 text-blue-700 font-bold"
          exact-active-class="bg-blue-50 text-blue-700 font-bold"
          :class="[$route.path.includes('/my-tickets') ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-600 hover:bg-gray-50']"
        >
          <i class="fas fa-ticket-alt w-5 text-center"></i> Taleplerim
        </router-link>

        <router-link
          v-if="authStore.hasPermission('helpdesk:manage')"
          to="/helpdesk/pool"
          class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors mt-4"
          active-class="bg-amber-50 text-amber-700 font-bold"
          exact-active-class="bg-amber-50 text-amber-700 font-bold"
          :class="[$route.path.includes('/pool') ? 'bg-amber-50 text-amber-700 font-bold' : 'text-gray-600 hover:bg-gray-50']"
        >
          <i class="fas fa-inbox w-5 text-center"></i> Talep Havuzu
        </router-link>

        <router-link
          v-if="authStore.hasPermission('helpdesk:manage')"
          to="/helpdesk/csat"
          class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors mt-1"
          active-class="bg-indigo-50 text-indigo-700 font-bold"
          exact-active-class="bg-indigo-50 text-indigo-700 font-bold"
          :class="[$route.path.includes('/csat') ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-gray-600 hover:bg-gray-50']"
        >
          <i class="fas fa-smile w-5 text-center"></i> Memnuniyet (CSAT)
        </router-link>
      </nav>
    </div>

    <!-- Main Content -->
    <div class="flex-1 flex flex-col min-w-0">
      <router-view></router-view>
    </div>
  </div>
</template>

<script setup>
import { useAuthStore } from '../../stores/auth'

const authStore = useAuthStore()
</script>
