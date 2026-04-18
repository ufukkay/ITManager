import { ref } from 'vue'

const toasts = ref([])
let toastId = 0

export function useToast() {
  const showToast = (message, type = 'success', duration = 3000) => {
    const id = toastId++
    toasts.value.push({ id, message, type })
    
    setTimeout(() => {
      removeToast(id)
    }, duration)
  }
  
  const removeToast = (id) => {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }

  const toggleLoading = (isActive, message = 'Yükleniyor...') => {
    if (isActive) {
      showToast(message, 'info', 999999) // Will be manually removed, actually should implement a separate spinner logic, but keeping it simple
    } else {
        // Just clear all info toasts for now as a makeshift loader closer
        toasts.value = toasts.value.filter(t => t.type !== 'info')
    }
  }

  return {
    toasts,
    showToast,
    removeToast,
    toggleLoading
  }
}
