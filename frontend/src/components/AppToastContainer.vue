<script setup>
import { useToast } from '../composables/useToast'

const { toasts, removeToast } = useToast()
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
          <div class="flex-1">
            <p class="text-[14px] font-bold text-slate-800 leading-tight">{{ toast.message }}</p>
          </div>
          <button @click="removeToast(toast.id)" class="text-slate-300 hover:text-slate-500 transition-colors p-1">
            <i class="fas fa-times text-[12px]"></i>
          </button>
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
