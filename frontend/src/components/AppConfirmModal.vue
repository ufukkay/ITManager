<script setup>
import { ref } from 'vue'

const props = defineProps({
  show: { type: Boolean, default: false },
  title: { type: String, default: 'Emin misiniz?' },
  message: { type: String, default: 'bu işlemi yapmak istediğinize emin misiniz?' },
  confirmLabel: { type: String, default: 'Evet, Sil' },
  cancelLabel: { type: String, default: 'Vazgeç' },
  type: { type: String, default: 'danger' }, // danger, warning, info
  loading: { type: Boolean, default: false },
  impact: { type: Array, default: () => [] }
})

const emit = defineEmits(['confirm', 'cancel'])

const onConfirm = () => {
  emit('confirm')
}

const onCancel = () => {
  if (props.loading) return
  emit('cancel')
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="show" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" @click.self="onCancel">
        <Transition name="scale">
          <div v-if="show" class="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-700">
            <!-- Icon & Header -->
            <div class="p-6 pb-0 flex flex-col items-center text-center">
              <div v-if="type === 'danger'" class="w-16 h-16 rounded-full bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400 flex items-center justify-center mb-4 animate-bounce-subtle">
                <i class="fas fa-exclamation-triangle text-2xl"></i>
              </div>
              <div v-else-if="type === 'warning'" class="w-16 h-16 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-500 dark:text-amber-400 flex items-center justify-center mb-4">
                <i class="fas fa-exclamation-circle text-2xl"></i>
              </div>
              <div v-else class="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-500 dark:text-blue-400 flex items-center justify-center mb-4">
                <i class="fas fa-info-circle text-2xl"></i>
              </div>

              <h3 class="text-xl font-bold text-slate-800 dark:text-slate-100">{{ title }}</h3>
              <p class="mt-2 text-slate-500 dark:text-slate-400 text-[14px] leading-relaxed px-4">
                {{ message }}
              </p>
            </div>

            <!-- Impact Analysis Section -->
            <div v-if="impact && impact.length > 0" class="px-6 py-2 animate-fade-in">
              <div class="bg-red-50/50 dark:bg-red-500/5 rounded-2xl border border-red-100 dark:border-red-500/20 overflow-hidden">
                <div class="px-4 py-2.5 bg-red-100/50 dark:bg-red-500/10 border-b border-red-100 dark:border-red-500/20 flex items-center gap-2">
                  <i class="fas fa-link text-red-500 dark:text-red-400 text-[12px]"></i>
                  <span class="text-[11px] font-bold text-red-700 dark:text-red-400 uppercase tracking-wider">İlişkili Kayıtlar Etkilenecek</span>
                </div>
                <div class="p-3 space-y-3 max-h-[180px] overflow-y-auto custom-scrollbar">
                  <div v-for="imp in impact" :key="imp.table" class="space-y-1.5">
                    <div class="flex items-center justify-between">
                      <span class="text-[12px] font-bold text-slate-700 dark:text-slate-300 uppercase">{{ imp.table }}</span>
                      <span class="text-[11px] font-bold px-2 py-0.5 bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-400 rounded-full">{{ imp.count }} Kayıt</span>
                    </div>
                    <div class="flex flex-wrap gap-1.5 pl-1">
                      <span v-for="sample in imp.samples" :key="sample" class="text-[10px] px-2 py-0.5 bg-white dark:bg-slate-800 border border-red-100 dark:border-red-500/20 text-red-500 dark:text-red-400 rounded font-medium">
                        {{ sample }}
                      </span>
                      <span v-if="imp.count > impsamples?.length" class="text-[10px] text-red-300 dark:text-red-500/60 font-bold italic">...ve dahası</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Warning Box -->
            <div class="px-6 py-4">
              <div class="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-100 dark:border-slate-700 flex items-start gap-3">
                <i class="fas fa-shield-alt text-slate-400 dark:text-slate-500 mt-0.5"></i>
                <p class="text-[12px] text-slate-500 dark:text-slate-400 font-medium">
                  {{ impact && impact.length > 0 ? 'Bu kayıt silindiğinde yukarıdaki tüm bağlantılar koparılacaktır.' : 'Bu işlem geri alınamaz. Lütfen devam etmeden önce seçiminizi kontrol edin.' }}
                </p>
              </div>
            </div>

            <!-- Actions -->
            <div class="p-6 pt-2 flex flex-col gap-2">
              <button
                type="button"
                @click="onConfirm"
                :disabled="loading"
                :class="[
                  'w-full py-3 rounded-xl font-bold text-[14px] transition-all active:scale-95 flex items-center justify-center gap-2',
                  type === 'danger' ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-200 dark:shadow-red-900/30' :
                  type === 'warning' ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-200 dark:shadow-amber-900/30' :
                  'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 dark:shadow-blue-900/30'
                ]"
              >
                <i v-if="loading" class="fas fa-spinner fa-spin"></i>
                {{ loading ? 'İşleniyor...' : confirmLabel }}
              </button>

              <button
                type="button"
                @click="onCancel"
                :disabled="loading"
                class="w-full py-3 rounded-xl font-bold text-[14px] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                {{ cancelLabel }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.scale-enter-active, .scale-leave-active {
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease;
}
.scale-enter-from {
  transform: scale(0.9);
  opacity: 0;
}
.scale-leave-to {
  transform: scale(0.95);
  opacity: 0;
}

@keyframes bounce-subtle {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}
.animate-bounce-subtle {
  animation: bounce-subtle 2s infinite ease-in-out;
}

.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #fee2e2; border-radius: 10px; }

.animate-fade-in {
  animation: fadeIn 0.4s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
