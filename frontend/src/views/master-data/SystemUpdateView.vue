<script setup>
import { ref, onMounted } from 'vue'
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

const backupDownloaded = ref(false)
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
    backupDownloaded.value = true
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

// ── Güncellemeyi Başlat ──────────────────────────────────
const startUpdate = async () => {
  if (!backupDownloaded.value) {
    if (!confirm('Henüz veritabanı yedeği indirmediniz! Sunucuda otomatik yedek alındı ama tarayıcıya indirmeniz önerilir. Yine de devam etmek istiyor musunuz?')) {
      return
    }
  }

  if (!confirm(`Sistem v${updateInfo.value.latestVersion} sürümüne güncellenecek. Güncelleme sırasında sunucu yeniden başlayacak. Devam edilsin mi?`)) {
    return
  }

  updating.value = true
  updateErrorMessage.value = ''
  updateSuccessMessage.value = ''
  logMessages.value = []

  const addLog = (msg) => logMessages.value.push({ time: new Date().toLocaleTimeString(), msg })

  addLog('Güncelleme isteği sunucuya iletiliyor...')

  try {
    const res = await axios.post('/api/update/apply', { targetVersion: updateInfo.value.latestVersion })
    addLog(res.data.message || 'Güncelleme başlatıldı.')
    addLog('Git pull ve npm install işlemleri yürütülüyor...')
    addLog('Sunucu 5-10 saniye içinde yeniden başlatılacak.')
    updateSuccessMessage.value = 'Güncelleme başlatıldı! Sayfa birkaç saniye içinde yeniden yüklenecektir...'

    setTimeout(() => {
      window.location.reload()
    }, 10000)
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
</script>

<template>
  <div class="h-full overflow-y-auto bg-gray-50/50 p-6">
    <div class="max-w-5xl mx-auto space-y-6">
      
      <!-- Başlık & Tab Seçimi -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 class="text-xl font-bold text-gray-900 flex items-center gap-2">
            <i class="fas fa-cloud-download-alt text-blue-600"></i>
            Sistem Güncelleme & Yedekleme
          </h1>
          <p class="text-xs text-gray-500 mt-1">
            GitHub (ufukkay/ITManager) üzerinden otomatik versiyon kontrolü, veritabanı yedeği ve sürüm yükseltme.
          </p>
        </div>

        <div class="flex items-center gap-2 bg-gray-100 p-1 rounded-xl shrink-0">
          <button 
            @click="activeTab = 'update'"
            class="px-4 py-2 rounded-lg text-xs font-bold transition-all"
            :class="activeTab === 'update' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'"
          >
            <i class="fas fa-sync-alt mr-1"></i> Güncelleme
          </button>
          <button 
            @click="activeTab = 'backups'"
            class="px-4 py-2 rounded-lg text-xs font-bold transition-all"
            :class="activeTab === 'backups' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'"
          >
            <i class="fas fa-database mr-1"></i> Sunucu Yedekleri ({{ serverBackups.length }})
          </button>
          <button 
            @click="activeTab = 'history'"
            class="px-4 py-2 rounded-lg text-xs font-bold transition-all"
            :class="activeTab === 'history' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'"
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
          <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <span class="text-xs font-bold text-gray-400 uppercase tracking-wider">Mevcut Çalışan Sürüm</span>
              <div class="text-2xl font-black text-gray-800 mt-1">
                v{{ updateInfo?.currentVersion || '...' }}
              </div>
            </div>
            <div class="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl font-bold">
              <i class="fas fa-server"></i>
            </div>
          </div>

          <!-- En Son GitHub Sürümü -->
          <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <span class="text-xs font-bold text-gray-400 uppercase tracking-wider">GitHub En Son Sürüm</span>
              <div class="text-2xl font-black mt-1 flex items-center gap-2" :class="updateInfo?.hasUpdate ? 'text-emerald-600' : 'text-gray-800'">
                v{{ updateInfo?.latestVersion || '...' }}
                <span v-if="updateInfo?.hasUpdate" class="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Yeni!</span>
              </div>
            </div>
            <button 
              @click="checkUpdate" 
              :disabled="checking"
              class="w-12 h-12 rounded-2xl bg-gray-50 hover:bg-gray-100 text-gray-600 flex items-center justify-center text-lg transition-colors"
              title="Yeniden Kontrol Et"
            >
              <i class="fas fa-sync-alt" :class="{ 'fa-spin': checking }"></i>
            </button>
          </div>
        </div>

        <!-- Hata Mesajı -->
        <div v-if="updateErrorMessage" class="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-medium flex items-center gap-3">
          <i class="fas fa-exclamation-circle text-base text-rose-500"></i>
          <span>{{ updateErrorMessage }}</span>
        </div>

        <!-- Başarı Mesajı -->
        <div v-if="updateSuccessMessage" class="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-medium flex items-center gap-3">
          <i class="fas fa-check-circle text-base text-emerald-500"></i>
          <span>{{ updateSuccessMessage }}</span>
        </div>

        <!-- Güncelleme Durum Alanı -->
        <div v-if="updateInfo" class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          
          <!-- Durum Banner -->
          <div 
            class="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            :class="updateInfo.hasUpdate ? 'bg-emerald-50/50' : 'bg-gray-50/50'"
          >
            <div class="flex items-center gap-4">
              <div 
                class="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0"
                :class="updateInfo.hasUpdate ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200' : 'bg-blue-500 text-white shadow-md shadow-blue-200'"
              >
                <i :class="updateInfo.hasUpdate ? 'fas fa-arrow-alt-circle-up' : 'fas fa-check-circle'"></i>
              </div>
              <div>
                <h3 class="font-bold text-gray-900 text-base">
                  {{ updateInfo.hasUpdate ? `Yeni Güncelleme Mevcut: ${updateInfo.tagName}` : 'Sisteminiz Güncel!' }}
                </h3>
                <p class="text-xs text-gray-500 mt-0.5">
                  {{ updateInfo.hasUpdate ? `Yayınlanma Tarihi: ${formatDate(updateInfo.publishedAt)}` : 'En son sürüm kullanılıyor. Herhangi bir güncellemeye gerek yok.' }}
                </p>
              </div>
            </div>

            <!-- Aksiyon Butonları -->
            <div class="flex items-center gap-3 shrink-0">
              <button
                @click="downloadBackup"
                :disabled="backupLoading"
                class="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-2"
              >
                <i class="fas fa-database" :class="{ 'fa-spin': backupLoading }"></i>
                {{ backupLoading ? 'Yedek Alınıyor...' : '1. Veritabanı Yedeği İndir' }}
              </button>

              <button
                v-if="updateInfo.hasUpdate"
                @click="startUpdate"
                :disabled="updating"
                class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-200 flex items-center gap-2"
              >
                <i class="fas fa-rocket" :class="{ 'fa-spin': updating }"></i>
                {{ updating ? 'Güncelleniyor...' : '2. Güncellemeyi Başlat' }}
              </button>
            </div>
          </div>

          <!-- Sürüm Notları -->
          <div class="p-6 space-y-4">
            <h4 class="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <i class="fas fa-file-alt text-blue-500"></i>
              Sürüm Notları ve Değişiklikler
            </h4>

            <div v-if="updateInfo.releaseNotes" class="bg-gray-50 p-4 rounded-xl text-xs text-gray-700 font-mono whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto border border-gray-200/60">
              {{ updateInfo.releaseNotes }}
            </div>
            <div v-else class="text-xs text-gray-400 italic">
              Bu sürüm için detaylı not eklenmemiş.
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
      <div v-if="activeTab === 'backups'" class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div class="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 class="font-bold text-gray-900 text-sm">Sunucudaki Otomatik Yedekler (`/backups` Klasörü)</h3>
            <p class="text-xs text-gray-500">Her güncellemeden önce alınan tüm veritabanı snapshots zip dosyaları burada saklanır.</p>
          </div>
          <button @click="downloadBackup" :disabled="backupLoading" class="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-xs font-bold transition-colors">
            + Anlık Yedek Al
          </button>
        </div>

        <div v-if="serverBackupsLoading" class="p-8 text-center text-xs text-gray-400">
          Yedekler yükleniyor...
        </div>

        <div v-else-if="serverBackups.length === 0" class="p-8 text-center text-xs text-gray-400">
          Henüz alınmış sunucu yedeği bulunmuyor.
        </div>

        <div v-else class="divide-y divide-gray-100">
          <div v-for="file in serverBackups" :key="file.name" class="p-4 flex items-center justify-between hover:bg-gray-50/80 transition-colors">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-base font-bold shrink-0">
                <i class="fas fa-file-archive"></i>
              </div>
              <div>
                <div class="font-mono font-bold text-xs text-gray-800">{{ file.name }}</div>
                <div class="text-[11px] text-gray-400 mt-0.5 flex items-center gap-3">
                  <span><i class="far fa-clock mr-1"></i>{{ formatDate(file.createdAt) }}</span>
                  <span><i class="fas fa-weight-hanging mr-1"></i>{{ formatBytes(file.size) }}</span>
                </div>
              </div>
            </div>

            <button 
              @click="downloadServerBackupFile(file.name)"
              class="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5"
            >
              <i class="fas fa-download"></i> İndir
            </button>
          </div>
        </div>
      </div>

      <!-- TAB 3: GÜNCELLEME GEÇMİŞİ -->
      <div v-if="activeTab === 'history'" class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div class="p-5 border-b border-gray-100">
          <h3 class="font-bold text-gray-900 text-sm">Geçmiş Güncelleme Kayıtları</h3>
          <p class="text-xs text-gray-500">Daha önce yapılan güncelleme işlemleri ve sonuçları.</p>
        </div>

        <div v-if="history.length === 0" class="p-8 text-center text-xs text-gray-400">
          Henüz kaydedilmiş güncelleme geçmişi yok.
        </div>

        <div v-else class="divide-y divide-gray-100">
          <div v-for="(item, idx) in history" :key="idx" class="p-4 space-y-2">
            <div class="flex items-center justify-between text-xs">
              <div class="flex items-center gap-2 font-bold">
                <span :class="item.status === 'success' ? 'text-emerald-600' : 'text-rose-600'">
                  <i :class="item.status === 'success' ? 'fas fa-check-circle' : 'fas fa-times-circle'"></i>
                </span>
                <span>v{{ item.fromVersion }} → v{{ item.toVersion }}</span>
              </div>
              <span class="text-gray-400">{{ formatDate(item.startedAt) }}</span>
            </div>

            <div v-if="item.log && item.log.length > 0" class="bg-gray-50 p-2.5 rounded-lg text-[11px] font-mono text-gray-600 space-y-1">
              <div v-for="(l, i) in item.log" :key="i">{{ l.msg }}</div>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>
