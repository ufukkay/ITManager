<script setup>
import { useToast } from '../composables/useToast'

const { toasts, removeToast } = useToast()

const copyError = (toast) => {
  const errorText = `Mesaj: ${toast.message}\nDetay: ${JSON.stringify(toast.details, null, 2)}`
  navigator.clipboard.writeText(errorText).then(() => {
    // Mini bir başarı göstergesi ekleyebiliriz ama şimdilik kopyalaması yeterli
  })
}
</script>

<template>
  <div class="fixed top-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none min-w-[320px] max-w-md">
    <TransitionGroup name="toast">
      <div v-for="toast in toasts" :key="toast.id"
        class="toast-item pointer-events-auto bg-white rounded-2xl shadow-2xl border border-slate-100 flex items-stretch overflow-hidden"
        :class="toast.type === 'error' ? 'border-l-4 border-l-red-500' : 
                toast.type === 'warning' ? 'border-l-4 border-l-amber-500' : 
                'border-l-4 border-l-blue-500'"
      >
        <div class="p-4 flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
               :class="toast.type === 'error' ? 'bg-red-50 text-red-500' : 
                       toast.type === 'warning' ? 'bg-amber-50 text-amber-500' : 
                       'bg-blue-50 text-blue-500'">
            <i class="fas" :class="toast.type === 'error' ? 'fa-circle-xmark' : 
                                   toast.type === 'warning' ? 'fa-triangle-exclamation' : 
                                   'fa-circle-check'"></i>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-[14px] font-bold text-slate-800 leading-tight truncate">{{ toast.message }}</p>
            <p v-if="toast.details" class="text-[11px] text-slate-400 mt-1">Teknik detay için kopyalayın.</p>
          </div>

          <div class="flex items-center gap-1">
            <button v-if="toast.type === 'error'" 
              @click="copyError(toast)"
              title="Hatayı Kopyala"
              class="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
            >
              <i class="fas fa-copy text-[12px]"></i>
            </button>
            <button @click="removeToast(toast.id)" class="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
              <i class="fas fa-times text-[12px]"></i>
            </button>
          </div>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active, .toast-leave-active {
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(100%) scale(0.6);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(40px) scale(0.9);
}

.toast-item {
  animation: slide-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes slide-in {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}
</style>
