<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const username = ref('')
const password = ref('')
const isSubmitting = ref(false)
const errorMessage = ref('')

const handleLogin = async () => {
  if (!username.value || !password.value) {
    errorMessage.value = 'Lütfen kullanıcı adı ve şifrenizi girin.'
    return
  }

  isSubmitting.value = true
  errorMessage.value = ''

  const success = await authStore.login(username.value, password.value)

  if (success) {
    router.push('/')
  } else {
    errorMessage.value = authStore.error || 'Giriş başarısız oldu.'
  }

  isSubmitting.value = false
}
</script>

<template>
  <div class="fixed inset-0 w-screen h-screen flex items-center justify-center bg-[#f8f9fa] font-['Inter'] z-[9999]">
    <div class="w-full max-w-[400px] p-4">

      <!-- Login Card -->
      <div
        class="bg-white rounded-lg border border-[#dadce0] p-10 shadow-[0_1px_2px_0_rgba(60,64,67,0.3),0_1px_3px_1px_rgba(60,64,67,0.15)]">

        <!-- Logo Area -->
        <div class="text-center mb-10">
          <div class="inline-flex items-center justify-center w-14 h-14 bg-[#e8f0fe] text-[#1a73e8] rounded-full mb-4">
            <i class="fas fa-satellite-dish text-2xl"></i>
          </div>
          <h1 class="text-[24px] font-medium text-[#202124] tracking-tight">IT Manager Pro</h1>
          <p class="text-[14px] text-[#5f6368] mt-2">Sisteme giriş yapın</p>
        </div>

        <!-- Form -->
        <form @submit.prevent="handleLogin" class="space-y-6">

          <div v-if="errorMessage"
            class="p-3 bg-red-50 text-red-600 text-[13px] rounded border border-red-100 flex items-start gap-2 mb-4">
            <i class="fas fa-exclamation-circle mt-0.5"></i>
            <span>{{ errorMessage }}</span>
          </div>

          <div class="space-y-1.5 text-left">
            <label class="text-[13px] font-medium text-[#3c4043] ml-1">Kullanıcı Adı</label>
            <div class="relative">
              <i class="fas fa-user absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[13px]"></i>
              <input v-model="username" type="text"
                class="w-full h-11 bg-white border border-[#dadce0] rounded px-10 text-[14px] outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] transition-all"
                placeholder="Adınız veya sicil no" required autofocus />
            </div>
          </div>

          <div class="space-y-1.5 text-left">
            <label class="text-[13px] font-medium text-[#3c4043] ml-1">Şifre</label>
            <div class="relative">
              <i class="fas fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[13px]"></i>
              <input v-model="password" type="password"
                class="w-full h-11 bg-white border border-[#dadce0] rounded px-10 text-[14px] outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] transition-all"
                placeholder="••••••••" required />
            </div>
          </div>

          <button type="submit"
            class="w-full h-11 bg-[#1a73e8] text-white text-[14px] font-bold rounded hover:bg-[#174ea6] transition-none mt-6 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
            :disabled="isSubmitting">
            <span v-if="isSubmitting" class="flex items-center justify-center gap-2">
              <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              Giriş Yapılıyor
            </span>
            <span v-else>Giriş Yap</span>
          </button>
        </form>

        <div class="mt-10 text-center text-[12px] text-[#70757a] font-medium uppercase tracking-widest opacity-50">
          © {{ new Date().getFullYear() }} ITManager Platformu
        </div>

      </div>

    </div>
  </div>
</template>

<style scoped>
/* Container overrides for full-screen centering */
:deep(body) {
  background-color: #f8f9fa !important;
}
</style>
