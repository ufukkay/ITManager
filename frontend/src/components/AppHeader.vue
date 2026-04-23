<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useRouter, useRoute } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

const dropdownOpen = ref(false)
const dropdownRef = ref(null)

const userInitials = computed(() => {
  const name = authStore.userName
  if (!name) return '?'
  return name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()
})

const handleLogout = async () => {
  dropdownOpen.value = false
  await authStore.logout()
  router.push('/login')
}

const handleClickOutside = (e) => {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target)) {
    dropdownOpen.value = false
  }
}

onMounted(() => document.addEventListener('mousedown', handleClickOutside))
onUnmounted(() => document.removeEventListener('mousedown', handleClickOutside))
</script>

<template>
  <header class="h-14 border-b border-gray-100 flex items-center px-6 gap-8 bg-white/80 backdrop-blur-md shrink-0 sticky top-0 z-50 shadow-sm shadow-black/[0.02]">

    <!-- Logo -->
    <router-link to="/" class="flex items-center gap-2.5 shrink-0">
      <div class="w-7 h-7 flex items-center justify-center bg-brand shadow-sm shadow-brand/30">
        <i class="fas fa-cube text-white text-[13px]"></i>
      </div>
      <span class="text-[15px] font-bold text-gray-900 tracking-tight">ITManager <span class="text-brand font-black ml-0.5">.</span></span>
    </router-link>
    <!-- Navigation Removed as per user request -->
    <div class="flex-1"></div>

    <!-- Actions -->
    <div class="flex items-center gap-2 shrink-0">

      <!-- Bildirim zili -->
      <button class="relative w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-50 transition-all">
        <i class="far fa-bell text-[15px]"></i>
        <span class="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-red-500 border-2 border-white"></span>
      </button>

      <!-- Avatar + Dropdown -->
      <div ref="dropdownRef" class="relative">
        <button
          @click="dropdownOpen = !dropdownOpen"
          class="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-semibold text-gray-900 bg-brand hover:brightness-95 transition-all"
        >
          {{ userInitials }}
        </button>

        <Transition
          enter-active-class="transition ease-out duration-100"
          enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100"
          leave-active-class="transition ease-in duration-75"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-95"
        >
          <div
            v-if="dropdownOpen"
            class="absolute right-0 top-full mt-1.5 w-52 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1 origin-top-right"
          >
            <div class="px-4 py-2.5 border-b border-gray-100">
              <div class="text-[13px] font-semibold text-gray-900 truncate">{{ authStore.userName }}</div>
            </div>
            <button
              @click="handleLogout"
              class="w-full text-left px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 transition-colors"
            >
              <i class="fas fa-sign-out-alt text-gray-400 text-[12px] w-4"></i>
              Çıkış Yap
            </button>
          </div>
        </Transition>
      </div>

    </div>
  </header>
</template>
