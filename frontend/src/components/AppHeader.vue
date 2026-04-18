<script setup>
import { useAuthStore } from '../stores/auth'
import { useRouter, useRoute } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

const handleLogout = async () => {
  await authStore.logout()
  router.push('/login')
}

const goBack = () => {
  // Kullanıcı her zaman modül seçim (Ana Sayfa) ekranına dönmek istediği için '/' rotasına yönlendiriyoruz
  router.push('/')
}
</script>

<template>
  <header class="h-12 border-b border-gray-200 flex items-center justify-between px-4 md:px-6 bg-white sticky top-0 z-50 shrink-0 shadow-sm w-full">
    <!-- Sol: Geri Butonu -->
    <div class="flex-1 flex items-center">
      <button 
        v-if="route.path !== '/'" 
        @click="goBack" 
        class="text-gray-500 hover:text-gray-900 flex items-center gap-2 group transition-none"
      >
        <i class="fas fa-chevron-left text-[10px]"></i>
        <span class="text-[12px] font-bold uppercase tracking-wider whitespace-nowrap">Geri</span>
      </button>
    </div>

    <!-- Orta: Boş (Kullanıcı isteği üzerine başlık kaldırıldı) -->
    <div class="flex-1 flex justify-center">
    </div>

    <!-- Sağ: Kullanıcı ve Çıkış -->
    <div class="flex-1 flex items-center justify-end gap-6 font-bold uppercase tracking-widest text-[11px]">
      <div v-if="authStore.user" class="flex items-center gap-6">
        <div class="text-gray-700 hidden sm:block truncate max-w-[150px]">
          {{ authStore.userName.toUpperCase() }}
        </div>
        <button 
          @click="handleLogout" 
          class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-none whitespace-nowrap font-black"
        >
          ÇIKIŞ YAP
        </button>
      </div>
    </div>
  </header>
</template>

<style scoped>
/* Scoped styles if needed */
</style>
