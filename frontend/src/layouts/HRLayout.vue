<script setup>
import { ref, onMounted, computed } from 'vue'
import { useMasterDataStore } from '../stores/masterData'

const masterData = useMasterDataStore()

const selectedCompanyId = ref(null)
const selectedType       = ref(null) // null=Tümü, 'ENTRY', 'EXIT'

// Expose filters to child via provide
import { provide } from 'vue'
provide('hrFilters', { selectedCompanyId, selectedType })

onMounted(() => masterData.fetchCompanies())
</script>

<template>
  <div class="flex h-full overflow-hidden bg-white">

    <!-- ── Left Sidebar ───────────────────────────────────────────── -->
    <aside class="w-52 bg-[#fbfbfb] border-r border-gray-100 flex flex-col shrink-0">

      <!-- Header -->
      <div class="px-4 py-5 border-b border-gray-100">
        <h2 class="text-[12px] font-bold text-gray-800 uppercase tracking-widest flex items-center gap-2">
          <i class="fas fa-users text-[#1a73e8] text-[11px]"></i>
          İK Bildirimleri
        </h2>
      </div>

      <nav class="flex-1 overflow-y-auto px-2 py-4 flex flex-col gap-5">

        <!-- Bildirim Türü -->
        <div>
          <p class="px-3 mb-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Bildirim Türü</p>
          <div class="flex flex-col gap-0.5">
            <button
              v-for="item in [
                { type: null,    icon: 'fa-list',       label: 'Tüm Talepler' },
                { type: 'ENTRY', icon: 'fa-user-plus',  label: 'Girişler' },
                { type: 'EXIT',  icon: 'fa-user-minus', label: 'Çıkışlar' },
              ]"
              :key="String(item.type)"
              @click="selectedType = item.type"
              class="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-semibold transition-all text-left w-full"
              :class="selectedType === item.type
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'"
            >
              <i :class="['fas', item.icon, 'w-4 text-center text-[12px]',
                selectedType === item.type ? 'text-blue-500' : 'text-gray-400']"></i>
              {{ item.label }}
            </button>
          </div>
        </div>

        <!-- Şirketler -->
        <div>
          <p class="px-3 mb-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Şirketler</p>
          <div class="flex flex-col gap-0.5">
            <button
              @click="selectedCompanyId = null"
              class="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-semibold transition-all text-left w-full"
              :class="selectedCompanyId === null
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'"
            >
              <i :class="['fas fa-building w-4 text-center text-[12px]',
                selectedCompanyId === null ? 'text-blue-500' : 'text-gray-400']"></i>
              Tüm Şirketler
            </button>
            <button
              v-for="c in masterData.companies"
              :key="c.id"
              @click="selectedCompanyId = c.id"
              class="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-semibold transition-all text-left w-full truncate"
              :class="selectedCompanyId === c.id
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'"
            >
              <i :class="['fas fa-building w-4 text-center text-[12px] shrink-0',
                selectedCompanyId === c.id ? 'text-blue-500' : 'text-gray-300']"></i>
              <span class="truncate">{{ c.name }}</span>
            </button>
          </div>
        </div>

      </nav>
    </aside>

    <!-- ── Content ─────────────────────────────────────────────────── -->
    <main class="flex-1 overflow-hidden flex flex-col bg-white">
      <router-view v-slot="{ Component }">
        <component :is="Component" />
      </router-view>
    </main>

  </div>
</template>
