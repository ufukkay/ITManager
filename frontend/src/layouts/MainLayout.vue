<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import AppHeader from '../components/AppHeader.vue'

const authStore = useAuthStore()
const route = useRoute()
const isFullBleed = computed(() => route.meta.fullBleed === true)
</script>

<template>
  <div class="h-screen bg-white flex flex-col overflow-hidden">
    <!-- Standardized Header Component -->
    <AppHeader />

    <!-- Main Content Area (Full Width) -->
    <main 
      class="flex-1 overflow-y-auto w-full"
      :class="isFullBleed ? 'overflow-hidden flex flex-col min-h-0' : 'p-4 md:p-8'"
    >
      <div v-if="!isFullBleed" class="max-w-[1600px] mx-auto w-full h-full">
        <slot />
      </div>
      <slot v-else />
    </main>

  </div>
</template>

