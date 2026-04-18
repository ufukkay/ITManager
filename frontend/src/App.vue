<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

// Dynamic layout wrappers (we will create these)
import MainLayout from './layouts/MainLayout.vue'
import AuthLayout from './layouts/AuthLayout.vue'

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
