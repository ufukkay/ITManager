<script setup>
import { useAuthStore } from '../stores/auth'
import AppHeader from '../components/AppHeader.vue'

const authStore = useAuthStore()
</script>

<template>
  <div class="min-h-screen bg-white flex flex-col">
    <!-- Standardized Header Component -->
    <AppHeader />

    <!-- Main Content Slot -->
    <main class="flex-1 w-full max-w-6xl mx-auto p-4 md:p-8">
      <slot />
    </main>

  </div>
</template>

