<template>
  <div class="flex h-full overflow-hidden bg-white">

    <!-- ── Left Sidebar ───────────────────────────────── -->
    <aside class="w-48 bg-[#fbfbfb] border-r border-gray-100 flex flex-col shrink-0">
      <div class="px-4 py-5 border-b border-gray-100">
        <h2 class="text-[12px] font-bold text-gray-800 uppercase tracking-widest flex items-center gap-2">
          <i class="fas fa-boxes text-[#1a73e8] text-[11px]"></i>
          Envanter
        </h2>
      </div>

      <nav class="flex-1 overflow-y-auto px-2 py-4 flex flex-col gap-1">
        <RouterLink
          to="/inventory/matrix"
          class="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-semibold transition-all"
          :class="$route.path.startsWith('/inventory/matrix')
            ? 'bg-blue-50 text-blue-600'
            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'"
        >
          <i class="fas fa-sitemap w-4 text-center text-[12px]"></i>
          Kumanda Matrisi
        </RouterLink>

        <RouterLink
          to="/inventory/assets"
          class="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-semibold transition-all"
          :class="$route.path.startsWith('/inventory/assets') || $route.path === '/inventory'
            ? 'bg-blue-50 text-blue-600'
            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'"
        >
          <i class="fas fa-laptop w-4 text-center text-[12px]"></i>
          Varlık Listesi
        </RouterLink>

        <RouterLink
          to="/inventory/personnel"
          class="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-semibold transition-all"
          :class="$route.path.startsWith('/inventory/personnel')
            ? 'bg-blue-50 text-blue-600'
            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'"
        >
          <i class="fas fa-user-tag w-4 text-center text-[12px]"></i>
          Personel Zimmetleri
        </RouterLink>

        <RouterLink
          to="/inventory/audit"
          class="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-semibold transition-all"
          :class="$route.path.startsWith('/inventory/audit')
            ? 'bg-blue-50 text-blue-600'
            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'"
        >
          <i class="fas fa-clipboard-check w-4 text-center text-[12px] text-indigo-600"></i>
          Zimmet Stok Sayımı
        </RouterLink>

        <RouterLink
          to="/inventory/reports"
          class="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-semibold transition-all"
          :class="$route.path.startsWith('/inventory/reports')
            ? 'bg-blue-50 text-blue-600'
            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'"
        >
          <i class="fas fa-chart-pie w-4 text-center text-[12px]"></i>
          Amortisman Raporu
        </RouterLink>
      </nav>
    </aside>

    <!-- ── Content ──────────────────────────────────────── -->
    <main class="flex-1 overflow-hidden flex flex-col bg-white">
      <router-view v-slot="{ Component }">
        <component :is="Component" />
      </router-view>
    </main>

  </div>
</template>

<script setup>
import { RouterLink } from 'vue-router'
</script>
