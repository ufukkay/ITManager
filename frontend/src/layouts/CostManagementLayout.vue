<template>
  <div class="flex flex-col h-full overflow-hidden bg-white dark:bg-slate-900">
    <!-- Top Horizontal Browser-style Tab Bar -->
    <div class="px-3 pt-2 bg-[#f8f9fa] dark:bg-slate-900 border-b border-[#dadce0] dark:border-slate-800 shrink-0 flex items-center gap-1.5 overflow-x-auto overflow-y-hidden no-scrollbar">
      <router-link
        v-for="item in [
          { to: '/cost-management/invoices',           icon: 'fas fa-file-invoice-dollar', label: 'Faturalar & Masraf Yansıtma' },
          { to: '/cost-management/personnel-benefits', icon: 'fas fa-hand-holding-usd',    label: 'Personel Aylık Destekleri' },
          { to: '/cost-management/reports',            icon: 'fas fa-chart-line',         label: 'Maliyet & Finans Raporları' },
        ]"
        :key="item.to"
        :to="item.to"
        class="flex items-center gap-2 px-4 py-2 text-xs font-semibold transition-all select-none shrink-0 border-t-2"
        :class="$route.path === item.to || ($route.path === '/cost-management' && item.to === '/cost-management/invoices')
          ? 'bg-white dark:bg-slate-900 text-[#1a73e8] dark:text-blue-400 border-t-[#1a73e8] border-x border-x-[#dadce0] dark:border-x-slate-800 border-b-transparent shadow-[0_-2px_8px_rgba(0,0,0,0.03)] relative -mb-[1px] z-10 font-bold'
          : 'border-t-transparent text-[#5f6368] dark:text-slate-400 hover:text-[#202124] dark:hover:text-slate-100 hover:bg-[#e8eaed]/70 dark:hover:bg-slate-800/70'"
      >
        <i :class="[item.icon, 'text-[12px]', $route.path === item.to || ($route.path === '/cost-management' && item.to === '/cost-management/invoices') ? 'text-[#1a73e8] dark:text-blue-400' : 'text-gray-400']"></i>
        <span>{{ item.label }}</span>
      </router-link>
    </div>

    <!-- Main Content Area (Full 100% Width) -->
    <main class="flex-1 overflow-hidden flex flex-col bg-white dark:bg-slate-900 p-0">
      <router-view v-slot="{ Component }">
        <component :is="Component" />
      </router-view>
    </main>
  </div>
</template>

<script setup>
</script>
