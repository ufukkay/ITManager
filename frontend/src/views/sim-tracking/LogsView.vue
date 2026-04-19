<script setup>
import { ref } from 'vue'
import AppTable from '../../components/AppTable.vue'

const columns = [
  { key: 'date',    label: 'Tarih',      width: '160px', sortable: true, filterable: false },
  { key: 'user',    label: 'Kullanıcı',  width: '160px', sortable: true  },
  { key: 'action',  label: 'İşlem Tipi', width: '180px', sortable: true  },
  { key: 'details', label: 'Detaylar',   nowrap: false,  sortable: false, filterable: false },
]

const logs = ref([
  { id: 1, date: '2026-03-18 15:30', user: 'Ufuk Kaya', action: 'Hat Güncelleme',  details: '8990123... No\'lu M2M hattı Aktif edildi.' },
  { id: 2, date: '2026-03-18 14:15', user: 'Admin',     action: 'Paket Silme',     details: '10GB Data paketi silindi.' },
  { id: 3, date: '2026-03-17 09:00', user: 'Ufuk Kaya', action: 'Yeni Hat Ekleme', details: 'Yeni Ses hattı oluşturuldu (532...).' },
  { id: 4, date: '2026-03-17 08:45', user: 'Admin',     action: 'Kullanıcı Ekleme', details: 'yeni.kullanici@firma.com sisteme eklendi.' },
  { id: 5, date: '2026-03-16 17:20', user: 'Ufuk Kaya', action: 'Hat Güncelleme',  details: '8990456... No\'lu Voice hattı Pasife alındı.' },
])
</script>

<template>
  <div class="h-full flex flex-col gap-4">
    <div>
      <h1 class="text-xl font-bold text-gray-800 mb-1">İşlem Geçmişi</h1>
      <p class="text-sm text-gray-500">Sistem üzerindeki tüm modifikasyon ve giriş/çıkış hareketleri.</p>
    </div>

    <AppTable
      :columns="columns"
      :rows="logs"
      :actions="false"
      empty-text="Henüz işlem kaydı yok"
    >
      <!-- İşlem tipi badge -->
      <template #cell-action="{ value }">
        <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-100 text-gray-600">
          {{ value }}
        </span>
      </template>

      <!-- Toolbar'a ek buton -->
      <template #toolbar>
        <button type="button" class="ml-2 text-[12px] text-red-500 hover:text-red-700 px-3 py-1.5 border border-red-200 rounded-lg bg-white hover:bg-red-50">
          <i class="fas fa-trash mr-1"></i>Temizle (Sadece Admin)
        </button>
      </template>
    </AppTable>
  </div>
</template>
