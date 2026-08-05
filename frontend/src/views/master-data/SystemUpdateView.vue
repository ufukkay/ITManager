<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import axios from 'axios'

const loading = ref(false)
const checking = ref(false)
const updating = ref(false)
const backupLoading = ref(false)
const serverBackupsLoading = ref(false)

const updateInfo = ref(null)
const serverBackups = ref([])
const history = ref([])
const activeTab = ref('update') // 'update' | 'backups' | 'history'

const updateSuccessMessage = ref('')
const updateErrorMessage = ref('')
const logMessages = ref([])

// ── Güncelleme Kontrolü ──────────────────────────────────
const checkUpdate = async () => {
  checking.value = true
  updateErrorMessage.value = ''
  try {
    const res = await axios.get('/api/update/check')
    updateInfo.value = res.data
  } catch (err) {
    updateErrorMessage.value = err.response?.data?.error || 'Güncelleme kontrolü sırasında hata oluştu.'
  } finally {
    checking.value = false
  }
}

// ── DB Backup İndir ──────────────────────────────────────
const downloadBackup = async () => {
  backupLoading.value = true
  try {
    const response = await axios.get('/api/update/db-backup', { responseType: 'blob' })
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    const contentDisposition = response.headers['content-disposition']
    let fileName = `itmanager_backup_${new Date().toISOString().slice(0,10)}.zip`
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^"]+)"?/)
      if (match && match[1]) fileName = match[1]
    }
    link.setAttribute('download', fileName)
    document.body.appendChild(link)
    link.click()
    link.remove()
    await fetchServerBackups()
  } catch (err) {
    alert('Yedek alma sırasında hata oluştu: ' + (err.message || 'Bilinmeyen hata'))
  } finally {
    backupLoading.value = false
  }
}

// ── Sunucu Yedeklerini Getir ─────────────────────────────
const fetchServerBackups = async () => {
  serverBackupsLoading.value = true
  try {
    const res = await axios.get('/api/update/backups')
    serverBackups.value = res.data
  } catch (err) {
    console.error(err)
  } finally {
    serverBackupsLoading.value = false
  }
}

// ── Sunucudaki Yedeği İndir ──────────────────────────────
const downloadServerBackupFile = (filename) => {
  window.open(`/api/update/backups/${filename}`, '_blank')
}

// ── Güncelleme Geçmişini Getir ───────────────────────────
const fetchHistory = async () => {
  try {
    const res = await axios.get('/api/update/history')
    history.value = res.data
  } catch (err) {
    console.error(err)
  }
}

// ── Güncelleme İlerlemesini Takip Et (gerçek zamanlı, polling) ───
let pollTimer = null

const stopPolling = () => {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

const pollUpdateStatus = () => {
  stopPolling()
  pollTimer = setInterval(async () => {
    try {
      const res = await axios.get('/api/update/status')
      const state = res.data
      logMessages.value = (state.steps || []).map(s => ({
        time: new Date(s.time).toLocaleTimeString(),
        msg: s.msg
      }))

      if (!state.inProgress) {
        stopPolling()
        updating.value = false
        if (state.success) {
          updateSuccessMessage.value = 'Güncelleme başarıyla tamamlandı! Sayfa birkaç saniye içinde yeniden yüklenecek...'
          setTimeout(() => window.location.reload(), 3000)
        } else if (state.success === false) {
          updateErrorMessage.value = state.error || 'Güncelleme sırasında bir hata oluştu.'
        }
      }
    } catch (err) {
      // Güncelleme sırasında sunucu bakım modunda olabilir (503) - polling'i durdurmuyoruz,
      // sunucu geri geldiğinde otomatik olarak devam edecek.
      console.warn('Durum sorgusu başarısız, tekrar denenecek:', err.message)
    }
  }, 1500)
}

// ── Güncellemeyi Başlat ──────────────────────────────────
const startUpdate = async () => {
  const targetCommit = updateInfo.value?.latestCommit || 'main'
  if (!confirm(`Sistem GitHub'daki main branch'inin son hali (${targetCommit}) ile güncellenecek ve yeniden başlatılacak. Devam edilsin mi?`)) {
    return
  }

  updating.value = true
  updateErrorMessage.value = ''
  updateSuccessMessage.value = ''
  logMessages.value = []

  try {
    const res = await axios.post('/api/update/apply')
    logMessages.value = [{ time: new Date().toLocaleTimeString(), msg: res.data.message || 'Güncelleme başlatıldı.' }]
    pollUpdateStatus()
  } catch (err) {
    updating.value = false
    updateErrorMessage.value = err.response?.data?.error || 'Güncelleme başlatılırken bir hata oluştu.'
  }
}

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('tr-TR')
}

onMounted(() => {
  checkUpdate()
  fetchServerBackups()
  fetchHistory()
})

onUnmounted(() => stopPolling())
</script>

<template>
  <div class="h-full overflow-y-auto bg-gray-50/50 dark:bg-slate-900 p-6">
    <div class="max-w-5xl mx-auto space-y-6">

      <!-- Başlık & Tab Seçimi -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm">
        <div>
          <h1 class="text-xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <i class="fas fa-cloud-download-alt text-blue-600 dark:text-blue-400"></i>
            Sistem Güncelleme & Yedekleme
            <span v-if="updateInfo?.currentVersion" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-400">
              v{{ updateInfo.currentVersion }}
            </span>
          </h1>
          <p class="text-xs text-gray-500 dark:text-slate-400 mt-1">
            GitHub (ufukkay/ITManager) üzerinden otomatik versiyon kontrolü, veritabanı yedeği ve sürüm yükseltme.
          </p>
        </div>

        <div class="flex items-center gap-2 bg-gray-100 dark:bg-slate-900 p-1 rounded-xl shrink-0">
          <button
            @click="activeTab = 'update'"
            class="px-4 py-2 rounded-lg text-xs font-bold transition-all"
            :class="activeTab === 'update' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100'"
          >
            <i class="fas fa-sync-alt mr-1"></i> Güncelleme
          </button>
          <button
            @click="activeTab = 'backups'"
            class="px-4 py-2 rounded-lg text-xs font-bold transition-all"
            :class="activeTab === 'backups' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100'"
          >
            <i class="fas fa-database mr-1"></i> Sunucu Yedekleri ({{ serverBackups.length }})
          </button>
          <button
            @click="activeTab = 'history'"
            class="px-4 py-2 rounded-lg text-xs font-bold transition-all"
            :class="activeTab === 'history' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100'"
          >
            <i class="fas fa-history mr-1"></i> Geçmiş
          </button>
        </div>
      </div>

      <!-- TAB 1: GÜNCELLEME EKRANI -->
      <div v-if="activeTab === 'update'" class="space-y-6">
        
        <!-- Sürüm Kartı -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Mevcut Sürüm -->
          <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm flex items-center justify-between">
            <div>
              <span class="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Mevcut Çalışan Sürüm</span>
              <div class="text-2xl font-black text-gray-800 dark:text-slate-100 mt-1 flex items-center gap-2">
                v{{ updateInfo?.currentVersion || '...' }}
                <span v-if="updateInfo?.currentCommit" class="text-xs font-mono font-normal text-gray-400 dark:text-slate-500">({{ updateInfo.currentCommit }})</span>
              </div>
            </div>
            <div class="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xl font-bold">
              <i class="fas fa-server"></i>
            </div>
          </div>

          <!-- En Son GitHub Commit'i -->
          <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm flex items-center justify-between">
            <div>
              <span class="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">GitHub main (son commit)</span>
              <div class="text-2xl font-black mt-1 flex items-center gap-2 font-mono" :class="updateInfo?.hasUpdate ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-800 dark:text-slate-100'">
                {{ updateInfo?.latestCommit || '...' }}
                <span v-if="updateInfo?.hasUpdate" class="text-xs font-bold bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full font-sans">Yeni!</span>
              </div>
            </div>
            <button
              @click="checkUpdate"
              :disabled="checking"
              class="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-600 dark:text-slate-300 flex items-center justify-center text-lg transition-colors"
              title="Yeniden Kontrol Et"
            >
              <i class="fas fa-sync-alt" :class="{ 'fa-spin': checking }"></i>
            </button>
          </div>
        </div>

        <!-- Hata Mesajı -->
        <div v-if="updateErrorMessage" class="p-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 rounded-2xl text-xs font-medium flex items-center gap-3">
          <i class="fas fa-exclamation-circle text-base text-rose-500 dark:text-rose-400"></i>
          <span>{{ updateErrorMessage }}</span>
        </div>

        <!-- Başarı Mesajı -->
        <div v-if="updateSuccessMessage" class="p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-400 rounded-2xl text-xs font-medium flex items-center gap-3">
          <i class="fas fa-check-circle text-base text-emerald-500 dark:text-emerald-400"></i>
          <span>{{ updateSuccessMessage }}</span>
        </div>

        <!-- Güncelleme Durum Alanı -->
        <div v-if="updateInfo" class="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">

          <!-- Durum Banner -->
          <div
            class="p-6 border-b border-gray-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            :class="updateInfo.hasUpdate ? 'bg-emerald-50/50 dark:bg-emerald-500/5' : 'bg-gray-50/50 dark:bg-slate-900/50'"
          >
            <div class="flex items-center gap-4">
              <div
                class="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0"
                :class="updateInfo.hasUpdate ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200 dark:shadow-emerald-900/30' : 'bg-blue-500 text-white shadow-md shadow-blue-200 dark:shadow-blue-900/30'"
              >
                <i :class="updateInfo.hasUpdate ? 'fas fa-arrow-alt-circle-up' : 'fas fa-check-circle'"></i>
              </div>
              <div>
                <h3 class="font-bold text-gray-900 dark:text-slate-100 text-base">
                  {{ updateInfo.hasUpdate ? 'Yeni Güncelleme Mevcut' : 'Sisteminiz Güncel!' }}
                </h3>
                <p class="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                  {{ updateInfo.hasUpdate ? (updateInfo.latestCommitDate ? `Yayınlanma: ${formatDate(updateInfo.latestCommitDate)}` : '') : 'main branch ile aynı commit\'tesiniz.' }}
                </p>
                <p class="text-[11px] text-gray-400 dark:text-slate-500 mt-1">
                  Güncelleme, GitHub'daki main branch'in son halini indirir. Öncesinde otomatik veritabanı yedeği alınır, sonrasında backend ve frontend yeniden kurulup derlenir.
                </p>
              </div>
            </div>

            <!-- Aksiyon Butonları -->
            <div class="flex flex-wrap items-center gap-3 shrink-0">
              <button
                @click="downloadBackup"
                :disabled="backupLoading"
                class="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-2"
              >
                <i class="fas fa-database" :class="{ 'fa-spin': backupLoading }"></i>
                {{ backupLoading ? 'Yedek Alınıyor...' : 'Veritabanı Yedeği İndir' }}
              </button>

              <button
                @click="startUpdate"
                :disabled="updating"
                class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-200 flex items-center gap-2 cursor-pointer"
              >
                <i class="fas fa-rocket" :class="{ 'fa-spin': updating }"></i>
                {{ updating ? 'Sistem Güncelleniyor...' : (updateInfo.hasUpdate ? 'Güncellemeyi Başlat' : 'Sistemi Şimdi Güncelle (Git Pull)') }}
              </button>
            </div>
          </div>

          <!-- Son Commit Bilgisi -->
          <div class="p-6 space-y-4">
            <h4 class="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <i class="fas fa-file-alt text-blue-500 dark:text-blue-400"></i>
              GitHub main - Son Commit Mesajı
            </h4>

            <div v-if="updateInfo.latestCommitMessage" class="bg-gray-50 dark:bg-slate-900 p-4 rounded-xl text-xs text-gray-700 dark:text-slate-300 font-mono whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto border border-gray-200/60 dark:border-slate-700">
              {{ updateInfo.latestCommitMessage }}
            </div>
            <div v-else class="text-xs text-gray-400 dark:text-slate-500 italic">
              Commit mesajı alınamadı.
            </div>
          </div>
        </div>

        <!-- Canlı Log Ekranı (Güncelleme Sırasında) -->
        <div v-if="logMessages.length > 0" class="bg-gray-900 text-gray-100 rounded-2xl p-5 font-mono text-xs space-y-2 shadow-lg">
          <div class="flex items-center justify-between border-b border-gray-800 pb-3 mb-2">
            <span class="font-bold text-gray-400 flex items-center gap-2">
              <i class="fas fa-terminal text-emerald-400"></i> Güncelleme İşlem Günlüğü
            </span>
            <span class="text-[10px] bg-gray-800 px-2 py-0.5 rounded text-gray-400">Live Terminal</span>
          </div>
          <div v-for="(log, idx) in logMessages" :key="idx" class="flex gap-3">
            <span class="text-gray-500 shrink-0">[{{ log.time }}]</span>
            <span class="text-emerald-400">{{ log.msg }}</span>
          </div>
        </div>

      </div>

      <!-- TAB 2: SUNUCU YEDEKLERİ -->
      <div v-if="activeTab === 'backups'" class="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
        <div class="p-5 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
          <div>
            <h3 class="font-bold text-gray-900 dark:text-slate-100 text-sm">Sunucudaki Otomatik Yedekler (`/backups` Klasörü)</h3>
            <p class="text-xs text-gray-500 dark:text-slate-400">Her güncellemeden önce alınan tüm veritabanı snapshots zip dosyaları burada saklanır.</p>
          </div>
          <button @click="downloadBackup" :disabled="backupLoading" class="px-3 py-1.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 rounded-xl text-xs font-bold transition-colors">
            + Anlık Yedek Al
          </button>
        </div>

        <div v-if="serverBackupsLoading" class="p-8 text-center text-xs text-gray-400 dark:text-slate-500">
          Yedekler yükleniyor...
        </div>

        <div v-else-if="serverBackups.length === 0" class="p-8 text-center text-xs text-gray-400 dark:text-slate-500">
          Henüz alınmış sunucu yedeği bulunmuyor.
        </div>

        <div v-else class="divide-y divide-gray-100 dark:divide-slate-700">
          <div v-for="file in serverBackups" :key="file.name" class="p-4 flex items-center justify-between hover:bg-gray-50/80 dark:hover:bg-slate-700/50 transition-colors">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-base font-bold shrink-0">
                <i class="fas fa-file-archive"></i>
              </div>
              <div>
                <div class="font-mono font-bold text-xs text-gray-800 dark:text-slate-100">{{ file.name }}</div>
                <div class="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5 flex items-center gap-3">
                  <span><i class="far fa-clock mr-1"></i>{{ formatDate(file.createdAt) }}</span>
                  <span><i class="fas fa-weight-hanging mr-1"></i>{{ formatBytes(file.size) }}</span>
                </div>
              </div>
            </div>

            <button
              @click="downloadServerBackupFile(file.name)"
              class="px-3 py-1.5 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-300 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5"
            >
              <i class="fas fa-download"></i> İndir
            </button>
          </div>
        </div>
      </div>

      <!-- TAB 3: GÜNCELLEME GEÇMİŞİ -->
      <div v-if="activeTab === 'history'" class="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
        <div class="p-5 border-b border-gray-100 dark:border-slate-700">
          <h3 class="font-bold text-gray-900 dark:text-slate-100 text-sm">Geçmiş Güncelleme Kayıtları</h3>
          <p class="text-xs text-gray-500 dark:text-slate-400">Daha önce yapılan güncelleme işlemleri ve sonuçları.</p>
        </div>

        <div v-if="history.length === 0" class="p-8 text-center text-xs text-gray-400 dark:text-slate-500">
          Henüz kaydedilmiş güncelleme geçmişi yok.
        </div>

        <div v-else class="divide-y divide-gray-100 dark:divide-slate-700">
          <div v-for="(item, idx) in history" :key="idx" class="p-4 space-y-2">
            <div class="flex items-center justify-between text-xs">
              <div class="flex items-center gap-2 font-bold">
                <span :class="item.status === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'">
                  <i :class="item.status === 'success' ? 'fas fa-check-circle' : 'fas fa-times-circle'"></i>
                </span>
                <span class="font-mono dark:text-slate-300">{{ (item.fromCommit || '').slice(0,7) || '?' }} → {{ (item.toCommit || '').slice(0,7) || '?' }}</span>
              </div>
              <span class="text-gray-400 dark:text-slate-500">{{ formatDate(item.startedAt) }}</span>
            </div>

            <div v-if="item.error" class="bg-rose-50 dark:bg-rose-500/10 p-2.5 rounded-lg text-[11px] font-mono text-rose-600 dark:text-rose-400">
              {{ item.error }}
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>
