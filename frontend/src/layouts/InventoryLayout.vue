<template>
  <div class="flex flex-col h-full overflow-hidden bg-white dark:bg-slate-950">
    <!-- Top Horizontal Browser-style Tab Bar -->
    <div class="px-3 pt-2 bg-[#f8f9fa] dark:bg-slate-900 border-b border-[#dadce0] dark:border-slate-800 shrink-0 flex items-center gap-1.5 overflow-x-auto overflow-y-hidden no-scrollbar">
      <RouterLink
        v-for="tab in [
          { to: '/inventory/matrix', icon: 'fas fa-sitemap', label: 'Kumanda Matrisi' },
          { to: '/inventory/assets', icon: 'fas fa-laptop', label: 'Varlık Listesi' },
          { to: '/inventory/personnel', icon: 'fas fa-user-tag', label: 'Personel Zimmetleri' },
          { to: '/inventory/audit', icon: 'fas fa-clipboard-check', label: 'Zimmet Stok Sayımı' },
          { to: '/inventory/reports', icon: 'fas fa-chart-pie', label: 'Amortisman Raporu' }
        ]"
        :key="tab.to"
        :to="tab.to"
        class="flex items-center gap-2 px-4 py-2 text-xs font-semibold transition-all select-none shrink-0 border-t-2"
        :class="$route.path.startsWith(tab.to) || (tab.to === '/inventory/matrix' && $route.path === '/inventory')
          ? 'bg-white dark:bg-slate-950 text-[#1a73e8] dark:text-blue-400 border-t-[#1a73e8] border-x border-x-[#dadce0] dark:border-x-slate-800 border-b-transparent shadow-[0_-2px_8px_rgba(0,0,0,0.03)] relative -mb-[1px] z-10 font-bold'
          : 'border-t-transparent text-[#5f6368] dark:text-slate-400 hover:text-[#202124] dark:hover:text-slate-100 hover:bg-[#e8eaed]/70 dark:hover:bg-slate-800/70'"
      >
        <i :class="[tab.icon, 'text-[12px]', $route.path.startsWith(tab.to) || (tab.to === '/inventory/matrix' && $route.path === '/inventory') ? 'text-[#1a73e8] dark:text-blue-400' : 'text-gray-400']"></i>
        <span>{{ tab.label }}</span>
      </RouterLink>
    </div>

    <!-- Main Workspace (Full 100% Width) -->
    <main class="flex-1 overflow-hidden flex flex-col bg-white dark:bg-slate-950 p-0">
      <router-view v-slot="{ Component }">
        <component :is="Component" />
      </router-view>
    </main>
  </div>
</template>

<script setup>
</script>
