<script setup>
import { useAuthStore } from '../stores/auth'
import { useRoute } from 'vue-router'
import AppHeader from '../components/AppHeader.vue'

const authStore = useAuthStore()
const route = useRoute()

// Navigation helpers
const isRouteActive = (path) => route.path === path
</script>

<template>
  <div class="h-screen bg-[#f8f9fa] flex flex-col overflow-hidden text-[#3c4043]">
    <!-- Full-Width Standard Header -->
    <AppHeader />

    <div class="flex flex-1 overflow-hidden">
      <!-- Sidebar starts below header -->
      <aside class="w-48 bg-white border-r border-[#e0e0e0] flex flex-col shrink-0 z-40">
        <div class="flex-1 overflow-y-auto pt-4 flex flex-col gap-6">
          
          <!-- Section: HATLAR -->
          <div>
            <div class="px-6 mb-4 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] leading-none">Hatlar</div>
            <div class="flex flex-col gap-0.5">
              <router-link to="/sim-takip/m2m" class="flex items-center gap-3 px-6 py-2 transition-none group" :class="isRouteActive('/sim-takip/m2m') ? 'bg-[#e8f0fe] text-[#1a73e8] border-r-4 border-[#1a73e8]' : 'text-[#5f6368] hover:bg-[#f1f3f4]'">
                <i class="fas fa-sim-card w-5 text-center text-[16px]"></i>
                <span class="text-[13px] font-medium leading-none">M2M Hatları</span>
              </router-link>
              <router-link to="/sim-takip/data" class="flex items-center gap-3 px-6 py-2 transition-none group" :class="isRouteActive('/sim-takip/data') ? 'bg-[#e8f0fe] text-[#1a73e8] border-r-4 border-[#1a73e8]' : 'text-[#5f6368] hover:bg-[#f1f3f4]'">
                <i class="fas fa-wifi w-5 text-center text-[16px]"></i>
                <span class="text-[13px] font-medium leading-none">Data Hatları</span>
              </router-link>
              <router-link to="/sim-takip/voice" class="flex items-center gap-3 px-6 py-2 transition-none group" :class="isRouteActive('/sim-takip/voice') ? 'bg-[#e8f0fe] text-[#1a73e8] border-r-4 border-[#1a73e8]' : 'text-[#5f6368] hover:bg-[#f1f3f4]'">
                <i class="fas fa-phone-alt w-5 text-center text-[16px]"></i>
                <span class="text-[13px] font-medium leading-none">Ses Hatları</span>
              </router-link>
            </div>
          </div>

          <!-- Section: ANALİZ -->
          <div>
            <div class="px-6 mb-4 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] leading-none">Analiz</div>
            <div class="flex flex-col gap-0.5">
              <router-link to="/sim-takip/reports" class="flex items-center gap-3 px-6 py-2 transition-none group" :class="isRouteActive('/sim-takip/reports') ? 'bg-[#e8f0fe] text-[#1a73e8] border-r-4 border-[#1a73e8]' : 'text-[#5f6368] hover:bg-[#f1f3f4]'">
                <i class="fas fa-chart-bar w-5 text-center text-[16px]"></i>
                <span class="text-[13px] font-medium leading-none">Raporlar</span>
              </router-link>
              <router-link to="/sim-takip/invoices" class="flex items-center gap-3 px-6 py-2 transition-none group" :class="isRouteActive('/sim-takip/invoices') ? 'bg-[#e8f0fe] text-[#1a73e8] border-r-4 border-[#1a73e8]' : 'text-[#5f6368] hover:bg-[#f1f3f4]'">
                <i class="fas fa-file-invoice-dollar w-5 text-center text-[16px]"></i>
                <span class="text-[13px] font-medium leading-none">Faturalar</span>
              </router-link>
            </div>
          </div>

          <!-- Section: SİSTEM -->
          <div>
            <div class="px-6 mb-4 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] leading-none">Sistem</div>
            <div class="flex flex-col gap-0.5">
              <div class="flex flex-col">
                <router-link to="/sim-takip/settings?tab=simcards" 
                  class="flex items-center gap-3 px-6 py-2 transition-none group text-[#5f6368] hover:bg-[#f1f3f4]"
                  :class="route.path === '/sim-takip/settings' ? 'bg-[#f8f9fa] text-[#1a73e8]' : ''">
                  <i class="fas fa-cog w-5 text-center text-[16px]"></i>
                  <span class="text-[13px] font-bold leading-none uppercase tracking-tight">Ayarlar</span>
                </router-link>
                
                <!-- Sub Menu for Settings -->
                <div v-if="route.path === '/sim-takip/settings'" class="flex flex-col border-l-2 border-blue-100 ml-8 my-1 bg-white/50">
                  <router-link v-for="s in [
                    {t:'simcards', n:'Hat Aktarımı', i:'fa-exchange-alt'},
                    {t:'companies', n:'Şirketler', i:'fa-building'},
                    {t:'departments', n:'Departmanlar', i:'fa-sitemap'},
                    {t:'personnel', n:'Personeller', i:'fa-user-tie'},
                    {t:'vehicles', n:'Araçlar', i:'fa-truck-moving'},
                    {t:'locations', n:'Lokasyonlar', i:'fa-map-marker-alt'},
                    {t:'operators', n:'Operatörler', i:'fa-broadcast-tower'},
                    {t:'packages', n:'Paketler', i:'fa-box-open'}
                  ]" :key="s.t" :to="`/sim-takip/settings?tab=${s.t}`"
                    class="flex items-center gap-3 px-4 py-2 hover:bg-blue-50/50 transition-colors"
                    :class="route.query.tab === s.t ? 'text-[#1a73e8] font-bold' : 'text-gray-500'">
                    <i class="fas w-3 text-center text-[10px]" :class="s.i"></i>
                    <span class="text-[11px]">{{ s.n }}</span>
                  </router-link>
                </div>
              </div>

              <router-link v-if="authStore.isAdmin" to="/sim-takip/logs" class="flex items-center gap-3 px-6 py-2 transition-none group" :class="isRouteActive('/sim-takip/logs') ? 'bg-[#e8f0fe] text-[#1a73e8] border-r-4 border-[#1a73e8]' : 'text-[#5f6368] hover:bg-[#f1f3f4]'">
                <i class="fas fa-history w-5 text-center text-[16px]"></i>
                <span class="text-[13px] font-medium leading-none">İşlem Geçmişi</span>
              </router-link>
            </div>
          </div>
        </div>
      </aside>

      <!-- Main Workspace -->
      <main class="flex-1 overflow-y-auto p-3 bg-[#f8f9fa]">
          <router-view v-slot="{ Component }">
                <component :is="Component" />
          </router-view>
      </main>
    </div>
  </div>
</template>

<style scoped>
/* Transisyonlar global olarak style.css'te kapatıldı */
</style>
