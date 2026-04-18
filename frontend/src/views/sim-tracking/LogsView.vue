<script setup>
import { ref } from 'vue'

const dummyLogs = ref([
    { id: 1, date: '2026-03-18 15:30', user: 'Ufuk Kaya', action: 'Hat Güncelleme', details: '8990123... No\'lu M2M hattı Aktif edildi.' },
    { id: 2, date: '2026-03-18 14:15', user: 'Admin', action: 'Paket Silme', details: '10GB Data paketi silindi.' },
    { id: 3, date: '2026-03-17 09:00', user: 'Ufuk Kaya', action: 'Yeni Hat Ekleme', details: 'Yeni Ses hattı oluşturuldu (532...).' }
])
</script>

<template>
  <div class="h-full flex flex-col">
    <div class="mb-4">
      <h1 class="text-2xl font-black text-error tracking-tight mb-2">İşlem Geçmişi (Logs) 🗄️</h1>
      <p class="text-sm text-base-content/60 font-medium">Sistem üzerindeki tüm modifikasyon ve giriş/çıkış hareketleri.</p>
    </div>

    <!-- Data Table -->
    <div class="flex-1 min-h-0 card bg-base-100 shadow-sm border border-base-200 overflow-hidden relative">
        <div class="p-2 border-b border-base-200 flex justify-between shrink-0">
            <div class="text-sm font-bold text-base-content/60">Son 30 Günün Kayıtları</div>
            <button class="btn btn-sm btn-outline btn-error">Temizle (Sadece Admin)</button>
        </div>

        <div class="overflow-x-auto h-full p-0">
            <table class="table table-pin-rows table-zebra w-full">
                <thead>
                    <tr class="bg-base-200/50">
                        <th class="font-black uppercase tracking-wider text-xs">Tarih</th>
                        <th class="font-black uppercase tracking-wider text-xs">Kullanıcı</th>
                        <th class="font-black uppercase tracking-wider text-xs">İşlem Tipi</th>
                        <th class="font-black uppercase tracking-wider text-xs">Detaylar</th>
                    </tr>
                </thead>
                <tbody class="text-sm">
                    <tr v-for="log in dummyLogs" :key="log.id">
                        <td class="font-medium text-base-content/70 whitespace-nowrap">{{ log.date }}</td>
                        <td class="font-bold">{{ log.user }}</td>
                        <td>
                            <div class="badge badge-neutral shadow-sm font-bold text-xs">{{ log.action }}</div>
                        </td>
                        <td class="w-full text-base-content/80">{{ log.details }}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
  </div>
</template>
