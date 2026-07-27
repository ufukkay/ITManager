import { ref } from 'vue'

// Modül seviyesinde tek (singleton) state - useToast/useConfirm ile aynı desen.
const isMaintenanceMode = ref(false)

export function useMaintenanceMode() {
  const setMaintenanceMode = (value) => {
    isMaintenanceMode.value = value
  }

  return { isMaintenanceMode, setMaintenanceMode }
}
