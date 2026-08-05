<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useRouter, useRoute } from 'vue-router'
import api from '../api'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

const dropdownOpen = ref(false)
const dropdownRef = ref(null)

const theme = ref(localStorage.getItem('theme') || 'light')

const toggleTheme = () => {
  theme.value = theme.value === 'light' ? 'dark' : 'light'
  localStorage.setItem('theme', theme.value)
  document.documentElement.setAttribute('data-theme', theme.value)
  if (theme.value === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

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

// --- Bildirimler ---
const notifOpen = ref(false)
const notifRef = ref(null)
const notifications = ref([])
const unreadCount = ref(0)
const notifLoading = ref(false)
let pollInterval = null

const notifIcon = (type) => {
  switch (type) {
    case 'ticket_assigned': return 'fas fa-user-tag text-blue-500'
    case 'ticket_status': return 'fas fa-check-circle text-emerald-500'
    case 'ticket_message': return 'far fa-comment-dots text-blue-500'
    case 'hr_new': return 'fas fa-user-plus text-purple-500'
    case 'hr_status': return 'fas fa-id-card text-purple-500'
    case 'monitoring_alert': return 'fas fa-triangle-exclamation text-red-500'
    default: return 'far fa-bell text-gray-400'
  }
}

const timeAgo = (dateStr) => {
  if (!dateStr) return ''
  const raw = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T') + 'Z'
  const diffMs = Date.now() - new Date(raw).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'az önce'
  if (mins < 60) return `${mins} dk önce`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} sa önce`
  const days = Math.floor(hours / 24)
  return `${days} gün önce`
}

const fetchUnreadCount = async () => {
  try {
    const res = await api.get('/api/notifications/unread-count')
    if (res.data.success) unreadCount.value = res.data.count
  } catch (e) { /* sessizce geç */ }
}

const fetchNotifications = async () => {
  notifLoading.value = true
  try {
    const res = await api.get('/api/notifications?limit=20')
    if (res.data.success) notifications.value = res.data.notifications
  } catch (e) { /* sessizce geç */ }
  finally { notifLoading.value = false }
}

const toggleNotifDropdown = () => {
  notifOpen.value = !notifOpen.value
  if (notifOpen.value) fetchNotifications()
}

const openNotification = async (n) => {
  notifOpen.value = false
  if (!n.is_read) {
    try {
      await api.post(`/api/notifications/${n.id}/read`)
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    } catch (e) { /* sessizce geç */ }
  }
  if (n.link) router.push(n.link)
}

const markAllRead = async () => {
  try {
    await api.post('/api/notifications/mark-all-read')
    notifications.value = notifications.value.map(n => ({ ...n, is_read: 1 }))
    unreadCount.value = 0
  } catch (e) { /* sessizce geç */ }
}

const handleClickOutside = (e) => {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target)) {
    dropdownOpen.value = false
  }
  if (notifRef.value && !notifRef.value.contains(e.target)) {
    notifOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside)
  // Ensure correct class on load
  if (theme.value === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
  fetchUnreadCount()
  pollInterval = setInterval(fetchUnreadCount, 60000)
})
onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside)
  if (pollInterval) clearInterval(pollInterval)
})
</script>

<template>
  <header class="h-14 border-b border-gray-100 dark:border-slate-700 flex items-center px-6 gap-8 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shrink-0 sticky top-0 z-50 shadow-sm shadow-black/[0.02]">

    <!-- Logo -->
    <router-link to="/" class="flex items-center gap-2.5 shrink-0">
      <div class="w-7 h-7 flex items-center justify-center bg-brand shadow-sm shadow-brand/30">
        <i class="fas fa-cube text-white text-[13px]"></i>
      </div>
      <span class="text-[15px] font-bold text-gray-900 dark:text-white tracking-tight">ITManager <span class="text-brand font-black ml-0.5">.</span></span>
    </router-link>
    <div class="flex-1"></div>

    <!-- Actions -->
    <div class="flex items-center gap-2 shrink-0">

      <!-- Tema seçici -->
      <button
        @click="toggleTheme"
        class="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-all"
        title="Tema Değiştir"
      >
        <i :class="[theme === 'dark' ? 'fas fa-sun text-amber-500' : 'far fa-moon', 'text-[15px]']"></i>
      </button>

      <!-- Bildirim zili -->
      <div ref="notifRef" class="relative">
        <button
          @click="toggleNotifDropdown"
          class="relative w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-all"
          title="Bildirimler"
        >
          <i class="far fa-bell text-[15px]"></i>
          <span v-if="unreadCount > 0" class="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-red-500 border-2 border-white dark:border-slate-900"></span>
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
            v-if="notifOpen"
            class="absolute right-0 top-full mt-1.5 w-80 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg z-50 origin-top-right overflow-hidden"
          >
            <div class="px-4 py-2.5 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
              <span class="text-[13px] font-semibold text-gray-900 dark:text-white">Bildirimler</span>
              <button
                v-if="notifications.some(n => !n.is_read)"
                @click="markAllRead"
                class="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                Tümünü okundu işaretle
              </button>
            </div>

            <div class="max-h-96 overflow-y-auto">
              <div v-if="notifLoading" class="py-8 text-center text-gray-400 dark:text-slate-500 text-xs">
                <i class="fas fa-spinner fa-spin mr-1.5"></i> Yükleniyor...
              </div>
              <div v-else-if="notifications.length === 0" class="py-10 flex flex-col items-center gap-2 text-gray-400 dark:text-slate-500">
                <i class="far fa-bell-slash text-xl"></i>
                <span class="text-xs">Henüz bildirim yok</span>
              </div>
              <button
                v-else
                v-for="n in notifications"
                :key="n.id"
                @click="openNotification(n)"
                class="w-full text-left px-4 py-3 flex items-start gap-3 border-b border-gray-50 dark:border-slate-700/50 last:border-b-0 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                :class="{ 'bg-blue-50/50 dark:bg-blue-500/5': !n.is_read }"
              >
                <div class="w-7 h-7 rounded-full bg-gray-50 dark:bg-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                  <i :class="[notifIcon(n.type), 'text-[11px]']"></i>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-1.5">
                    <span class="text-[12.5px] font-semibold text-gray-900 dark:text-slate-100 truncate">{{ n.title }}</span>
                    <span v-if="!n.is_read" class="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                  </div>
                  <p v-if="n.message" class="text-[11.5px] text-gray-500 dark:text-slate-400 mt-0.5 line-clamp-2">{{ n.message }}</p>
                  <span class="text-[10px] text-gray-400 dark:text-slate-500 mt-1 block">{{ timeAgo(n.created_at) }}</span>
                </div>
              </button>
            </div>
          </div>
        </Transition>
      </div>

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
            class="absolute right-0 top-full mt-1.5 w-52 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg z-50 py-1 origin-top-right"
          >
            <div class="px-4 py-2.5 border-b border-gray-100 dark:border-slate-700">
              <div class="text-[13px] font-semibold text-gray-900 dark:text-white truncate">{{ authStore.userName }}</div>
            </div>
            <button
              @click="handleLogout"
              class="w-full text-left px-4 py-2 text-[13px] text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/50 flex items-center gap-2.5 transition-colors"
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
