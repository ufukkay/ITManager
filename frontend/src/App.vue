<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

// Dynamic layout wrappers (we will create these)
import MainLayout from './layouts/MainLayout.vue'
import AuthLayout from './layouts/AuthLayout.vue'
import AppToastContainer from './components/AppToastContainer.vue'
import AppConfirmModal from './components/AppConfirmModal.vue'
import { useConfirm } from './composables/useConfirm'
import { useMaintenanceMode } from './composables/useMaintenanceMode'

const { show, title, message, confirmLabel, loading, impactData, confirm, cancel } = useConfirm()
const { isMaintenanceMode } = useMaintenanceMode()

const route = useRoute()

// Determine layout based on route meta
const layout = computed(() => {
  if (route.meta.layout === 'auth') {
    return AuthLayout
  }
  
  if (route.meta.layout === 'main') {
    return MainLayout
  }
  
  // Default fallback (for nested layouts handled directly by Vue Router like SimTrackingLayout)
  return 'div'
})
</script>

<template>
  <component :is="layout">
    <router-view />
  </component>
  <AppToastContainer />

  <!-- Global Confirmation Modal -->
  <AppConfirmModal
    :show="show"
    :title="title"
    :message="message"
    :confirm-label="confirmLabel"
    :loading="loading"
    :impact="impactData"
    @confirm="confirm"
    @cancel="cancel"
  />

  <!-- Bakım Modu Overlay: sistem güncellenirken tüm ekranı kaplar -->
  <div
    v-if="isMaintenanceMode"
    class="fixed inset-0 z-[9999] bg-white/95 backdrop-blur-sm flex items-center justify-center p-6"
  >
    <div class="max-w-md text-center space-y-4">
      <div class="text-5xl">🛠️</div>
      <h2 class="text-xl font-bold text-gray-800">Sistem Güncelleniyor</h2>
      <p class="text-sm text-gray-500 leading-relaxed">
        ITManager şu anda bir güncelleme nedeniyle kısa süreliğine kullanım dışı. Kısa süre içinde tekrar kullanılabilir olacak.
      </p>
      <button
        type="button"
        class="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors"
        @click="() => window.location.reload()"
      >
        Yeniden Dene
      </button>
    </div>
  </div>
</template>

<style>
/* Global Transition utilities can go here */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
