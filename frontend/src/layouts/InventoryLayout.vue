<template>
  <div class="flex flex-col h-full overflow-hidden bg-white dark:bg-slate-950">
    <!-- Clean Minimalist Header -->
    <header class="px-6 py-3 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 shrink-0">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-[#1a73e8] flex items-center justify-center shrink-0 text-sm font-bold">
          <i class="fas fa-boxes"></i>
        </div>
        <div>
          <h1 class="text-base font-bold text-gray-900 dark:text-white tracking-tight">Envanter & Zimmet Yönetimi</h1>
        </div>
      </div>
    </header>

    <!-- Main Workspace with Sub-Sidebar -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Sub-Sidebar -->
      <aside class="w-52 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 flex flex-col shrink-0">
        <nav class="flex-1 overflow-y-auto p-3 flex flex-col gap-1">
          <p class="px-3 mb-2 text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Modüller</p>
          
          <RouterLink
            to="/inventory/matrix"
            class="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
            :class="$route.path.startsWith('/inventory/matrix') || $route.path === '/inventory'
              ? 'bg-[#1a73e8] text-white font-semibold'
              : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'"
          >
            <i class="fas fa-sitemap w-4 text-center text-xs" :class="$route.path.startsWith('/inventory/matrix') || $route.path === '/inventory' ? 'text-white' : 'text-gray-500'"></i>
            <span>Kumanda Matrisi</span>
          </RouterLink>

          <RouterLink
            to="/inventory/assets"
            class="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
            :class="$route.path.startsWith('/inventory/assets')
              ? 'bg-[#1a73e8] text-white font-semibold'
              : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'"
          >
            <i class="fas fa-laptop w-4 text-center text-xs" :class="$route.path.startsWith('/inventory/assets') ? 'text-white' : 'text-gray-500'"></i>
            <span>Varlık Listesi</span>
          </RouterLink>

          <RouterLink
            to="/inventory/personnel"
            class="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
            :class="$route.path.startsWith('/inventory/personnel')
              ? 'bg-[#1a73e8] text-white font-semibold'
              : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'"
          >
            <i class="fas fa-user-tag w-4 text-center text-xs" :class="$route.path.startsWith('/inventory/personnel') ? 'text-white' : 'text-gray-500'"></i>
            <span>Personel Zimmetleri</span>
          </RouterLink>

          <RouterLink
            to="/inventory/audit"
            class="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
            :class="$route.path.startsWith('/inventory/audit')
              ? 'bg-[#1a73e8] text-white font-semibold'
              : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'"
          >
            <i class="fas fa-clipboard-check w-4 text-center text-xs" :class="$route.path.startsWith('/inventory/audit') ? 'text-white' : 'text-gray-500'"></i>
            <span>Zimmet Stok Sayımı</span>
          </RouterLink>

          <RouterLink
            to="/inventory/reports"
            class="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
            :class="$route.path.startsWith('/inventory/reports')
              ? 'bg-[#1a73e8] text-white font-semibold'
              : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'"
          >
            <i class="fas fa-chart-pie w-4 text-center text-xs" :class="$route.path.startsWith('/inventory/reports') ? 'text-white' : 'text-gray-500'"></i>
            <span>Amortisman Raporu</span>
          </RouterLink>
        </nav>
      </aside>

      <!-- Content Area -->
      <main class="flex-1 overflow-hidden flex flex-col bg-white dark:bg-slate-950 p-0">
        <router-view v-slot="{ Component }">
          <component :is="Component" />
        </router-view>

        <!-- Mobile Bottom Tab Nav -->
        <nav class="sm:hidden shrink-0 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 grid grid-cols-5 px-1 py-1">
          <RouterLink
            to="/inventory/matrix"
            class="flex flex-col items-center justify-center py-1.5 gap-0.5"
            :class="$route.path.startsWith('/inventory/matrix') || $route.path === '/inventory' ? 'text-[#1a73e8]' : 'text-gray-500'"
          >
            <i class="fas fa-sitemap text-base"></i>
            <span class="text-[9px] font-medium">Matris</span>
          </RouterLink>

          <RouterLink
            to="/inventory/assets"
            class="flex flex-col items-center justify-center py-1.5 gap-0.5"
            :class="$route.path.startsWith('/inventory/assets') ? 'text-[#1a73e8]' : 'text-gray-500'"
          >
            <i class="fas fa-laptop text-base"></i>
            <span class="text-[9px] font-medium">Varlıklar</span>
          </RouterLink>

          <RouterLink
            to="/inventory/personnel"
            class="flex flex-col items-center justify-center py-1.5 gap-0.5"
            :class="$route.path.startsWith('/inventory/personnel') ? 'text-[#1a73e8]' : 'text-gray-500'"
          >
            <i class="fas fa-user-tag text-base"></i>
            <span class="text-[9px] font-medium">Zimmet</span>
          </RouterLink>

          <RouterLink
            to="/inventory/audit"
            class="flex flex-col items-center justify-center py-1.5 gap-0.5"
            :class="$route.path.startsWith('/inventory/audit') ? 'text-[#1a73e8]' : 'text-gray-500'"
          >
            <i class="fas fa-clipboard-check text-base"></i>
            <span class="text-[9px] font-medium">Sayım</span>
          </RouterLink>

          <RouterLink
            to="/inventory/reports"
            class="flex flex-col items-center justify-center py-1.5 gap-0.5"
            :class="$route.path.startsWith('/inventory/reports') ? 'text-[#1a73e8]' : 'text-gray-500'"
          >
            <i class="fas fa-chart-pie text-base"></i>
            <span class="text-[9px] font-medium">Rapor</span>
          </RouterLink>
        </nav>
      </main>
    </div>
  </div>
</template>

<script setup>
</script>
