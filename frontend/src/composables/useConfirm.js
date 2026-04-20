import { ref } from 'vue'

const show = ref(false)
const title = ref('')
const message = ref('')
const confirmLabel = ref('Sil')
const loading = ref(false)
const impactData = ref([])
const resolvePromise = ref(null)

export function useConfirm() {
  const ask = (options = {}) => {
    title.value = options.title || 'Onay'
    message.value = options.message || 'Bu işlemi yapmak istediğinize emin misiniz?'
    confirmLabel.value = options.confirmLabel || 'Evet'
    impactData.value = options.impact || []
    show.value = true
    loading.value = false

    return new Promise((resolve) => {
      resolvePromise.value = resolve
    })
  }

  const confirm = () => {
    if (resolvePromise.value) {
      resolvePromise.value(true)
    }
  }

  const cancel = () => {
    show.value = false
    if (resolvePromise.value) {
      resolvePromise.value(false)
    }
  }

  const stopLoading = () => {
    loading.value = false
    show.value = false
  }

  const startLoading = () => {
    loading.value = true
  }

  return {
    show,
    title,
    message,
    confirmLabel,
    loading,
    impactData,
    ask,
    confirm,
    cancel,
    startLoading,
    stopLoading
  }
}
