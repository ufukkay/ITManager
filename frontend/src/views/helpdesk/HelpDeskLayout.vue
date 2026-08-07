<template>
  <div class="flex flex-col h-full overflow-hidden bg-white dark:bg-slate-900">
    <!-- Top Horizontal Browser-style Tab Bar -->
    <div class="px-3 pt-2 bg-[#f8f9fa] dark:bg-slate-900 border-b border-[#dadce0] dark:border-slate-800 shrink-0 flex items-center gap-1.5 overflow-x-auto overflow-y-hidden no-scrollbar">
      <router-link
        to="/helpdesk/my-tickets"
        class="flex items-center gap-2 px-4 py-2 text-xs font-semibold transition-all select-none shrink-0 border-t-2"
        :class="$route.path.includes('/my-tickets') || $route.path === '/helpdesk'
          ? 'bg-white dark:bg-slate-900 text-[#1a73e8] dark:text-blue-400 border-t-[#1a73e8] border-x border-x-[#dadce0] dark:border-x-slate-800 border-b-transparent shadow-[0_-2px_8px_rgba(0,0,0,0.03)] relative -mb-[1px] z-10 font-bold'
          : 'border-t-transparent text-[#5f6368] dark:text-slate-400 hover:text-[#202124] dark:hover:text-slate-100 hover:bg-[#e8eaed]/70 dark:hover:bg-slate-800/70'"
      >
        <i class="fas fa-ticket-alt text-[12px]" :class="$route.path.includes('/my-tickets') || $route.path === '/helpdesk' ? 'text-[#1a73e8] dark:text-blue-400' : 'text-gray-400'"></i>
        <span>Taleplerim</span>
      </router-link>

      <router-link
        v-if="authStore.hasPermission('helpdesk:manage')"
        to="/helpdesk/pool"
        class="flex items-center gap-2 px-4 py-2 text-xs font-semibold transition-all select-none shrink-0 border-t-2"
        :class="$route.path.includes('/pool')
          ? 'bg-white dark:bg-slate-900 text-[#1a73e8] dark:text-blue-400 border-t-[#1a73e8] border-x border-x-[#dadce0] dark:border-x-slate-800 border-b-transparent shadow-[0_-2px_8px_rgba(0,0,0,0.03)] relative -mb-[1px] z-10 font-bold'
          : 'border-t-transparent text-[#5f6368] dark:text-slate-400 hover:text-[#202124] dark:hover:text-slate-100 hover:bg-[#e8eaed]/70 dark:hover:bg-slate-800/70'"
      >
        <i class="fas fa-inbox text-[12px]" :class="$route.path.includes('/pool') ? 'text-[#1a73e8] dark:text-blue-400' : 'text-gray-400'"></i>
        <span>Talep Havuzu</span>
      </router-link>

      <router-link
        v-if="authStore.hasPermission('helpdesk:manage')"
        to="/helpdesk/csat"
        class="flex items-center gap-2 px-4 py-2 text-xs font-semibold transition-all select-none shrink-0 border-t-2"
        :class="$route.path.includes('/csat')
          ? 'bg-white dark:bg-slate-900 text-[#1a73e8] dark:text-blue-400 border-t-[#1a73e8] border-x border-x-[#dadce0] dark:border-x-slate-800 border-b-transparent shadow-[0_-2px_8px_rgba(0,0,0,0.03)] relative -mb-[1px] z-10 font-bold'
          : 'border-t-transparent text-[#5f6368] dark:text-slate-400 hover:text-[#202124] dark:hover:text-slate-100 hover:bg-[#e8eaed]/70 dark:hover:bg-slate-800/70'"
      >
        <i class="fas fa-smile text-[12px]" :class="$route.path.includes('/csat') ? 'text-[#1a73e8] dark:text-blue-400' : 'text-gray-400'"></i>
        <span>Memnuniyet (CSAT)</span>
      </router-link>
    </div>

    <!-- Main Content (Full 100% Width) -->
    <div class="flex-1 flex flex-col min-w-0 overflow-hidden bg-white dark:bg-slate-900 p-0">
      <router-view></router-view>
    </div>
  </div>
</template>

<script setup>
import { useAuthStore } from '../../stores/auth'

const authStore = useAuthStore()
</script>
