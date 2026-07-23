<script setup>
import { ref, onMounted, computed } from 'vue'
import api from '../../api'
import { useToast } from '../../composables/useToast'

const entraSettings = ref({
    tenant_id: '',
    client_id: '',
    client_secret: '',
    is_active: false,
    sync_interval_minutes: 60,
    last_sync: null,
    allowed_domains: '["talay.com"]',
    domain_company_map: '{}'
})

const loading = ref(true)
const saving = ref(false)
const syncing = ref(false)
const syncResult = ref(null)

// Domain Sync State
const loadingDomains = ref(false)
const azureDomains = ref([])
const selectedDomains = ref([])
const domainCompanyMap = ref({}) // { 'talay.com': 3, 'partner.com': 5 }
const companies = ref([])       // Sistemdeki şirketler listesi
const personnelSyncing = ref(false)
const personnelSyncResult = ref(null)
const showSyncConfirm = ref(false)
const activeTab = ref('connection') // 'connection' | 'domains'

const { showToast } = useToast()

const isMockMode = computed(() => {
    const tenant = entraSettings.value.tenant_id;
    return !entraSettings.value.is_active || 
           !tenant || 
           tenant.includes('mock') || 
           tenant.includes('sandbox') || 
           tenant === '';
})

const totalSelectedUsers = computed(() => {
    return selectedDomains.value.reduce((sum, d) => {
        const domain = azureDomains.value.find(ad => ad.domain === d)
        return sum + (domain ? domain.total : 0)
    }, 0)
})

const loadSettings = async () => {
    loading.value = true
    try {
        const res = await api.get('/admin/api/settings/entra')
        if (res.data.success && res.data.settings) {
            const s = res.data.settings
            entraSettings.value = { 
                ...s,
                is_active: s.is_active === 1
            }
            // Kayıtlı domain seçimlerini yükle
            try {
                selectedDomains.value = JSON.parse(s.allowed_domains || '["talay.com"]')
            } catch {
                selectedDomains.value = ['talay.com']
            }
            // Kayıtlı domain-şirket eşleşmesini yükle
            try {
                domainCompanyMap.value = JSON.parse(s.domain_company_map || '{}')
            } catch {
                domainCompanyMap.value = {}
            }
        }
    } catch (err) {
        console.error('Entra ID ayarları yüklenemedi:', err)
        showToast('Entegrasyon ayarları yüklenemedi.', 'error')
    } finally {
        loading.value = false
    }
}

const saveSettings = async () => {
    saving.value = true
    try {
        const payload = {
            ...entraSettings.value,
            is_active: entraSettings.value.is_active ? 1 : 0,
            allowed_domains: JSON.stringify(selectedDomains.value)
        }
        const res = await api.post('/admin/api/settings/entra', payload)
        if (res.data.success) {
            showToast('Entra ID ayarları başarıyla kaydedildi.', 'success')
            if (res.data.settings) {
                entraSettings.value = {
                    ...res.data.settings,
                    is_active: res.data.settings.is_active === 1
                }
            }
        }
    } catch (err) {
        showToast('Ayarlar kaydedilirken hata oluştu.', 'error')
    } finally {
        saving.value = false
    }
}

const triggerSync = async () => {
    syncing.value = true
    syncResult.value = null
    try {
        const res = await api.post('/admin/api/settings/entra/sync')
        if (res.data.success) {
            showToast(res.data.message || 'Senkronizasyon tamamlandı.', 'success')
            syncResult.value = res.data
            loadSettings()
        } else {
            showToast(res.data.message || 'Senkronizasyon başarısız oldu.', 'error')
        }
    } catch (err) {
        showToast(err.response?.data?.message || 'Senkronizasyon tetiklenirken hata oluştu.', 'error')
    } finally {
        syncing.value = false
    }
}

const loadAzureDomains = async () => {
    loadingDomains.value = true
    azureDomains.value = []
    try {
        const res = await api.get('/admin/api/settings/entra/domains')
        if (res.data.success) {
            azureDomains.value = res.data.domains
            // Kaydedilmiş seçimleri uygula - eğer yoksa ilk büyük domain seç
            if (selectedDomains.value.length === 0) {
                selectedDomains.value = ['talay.com']
            }
            showToast(`${res.data.domains.length} domain bulundu.`, 'success')
        }
    } catch (err) {
        showToast(err.response?.data?.message || 'Domain listesi alınamadı.', 'error')
    } finally {
        loadingDomains.value = false
    }
}

const toggleDomain = (domain) => {
    const idx = selectedDomains.value.indexOf(domain)
    if (idx >= 0) {
        selectedDomains.value.splice(idx, 1)
    } else {
        selectedDomains.value.push(domain)
    }
}

const isDomainSelected = (domain) => selectedDomains.value.includes(domain)

const startPersonnelSync = async () => {
    showSyncConfirm.value = false
    personnelSyncing.value = true
    personnelSyncResult.value = null
    try {
        const res = await api.post('/admin/api/settings/entra/personnel-sync', {
            allowed_domains: selectedDomains.value,
            domain_company_map: domainCompanyMap.value
        })
        if (res.data.success) {
            showToast(res.data.message, 'success')
            personnelSyncResult.value = res.data
        } else {
            showToast(res.data.message || 'Senkronizasyon başarısız.', 'error')
        }
    } catch (err) {
        showToast(err.response?.data?.message || 'Hata oluştu.', 'error')
    } finally {
        personnelSyncing.value = false
    }
}

const formatDate = (dateStr) => {
    if (!dateStr) return 'Hiç yapılmadı'
    try {
        return new Date(dateStr).toLocaleString('tr-TR')
    } catch { return dateStr }
}

const loadCompanies = async () => {
    try {
        const res = await api.get('/api/master-data/companies')
        if (res.data && Array.isArray(res.data)) {
            companies.value = res.data
        } else if (res.data && Array.isArray(res.data.data)) {
            companies.value = res.data.data
        }
    } catch (err) {
        console.error('Şirket listesi yüklenemedi:', err)
    }
}

onMounted(() => {
    loadSettings()
    loadCompanies()
})
</script>

<template>
  <div class="h-full flex flex-col bg-gray-50/50">
    <div class="p-8 max-w-5xl">
        <!-- Başlık -->
        <div class="mb-6">
            <h1 class="text-[20px] font-bold text-gray-900 flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-blue-600 shadow-sm">
                    <i class="fab fa-microsoft"></i>
                </div>
                Microsoft Graph / Entra ID Entegrasyonu
            </h1>
            <p class="text-[13px] text-gray-500 mt-2 ml-[52px]">
                Azure Active Directory (Entra ID) kullanıcılarını ve lisans bilgilerini yönetin.
            </p>
        </div>

        <!-- Tab Bar -->
        <div class="flex gap-1 mb-6 bg-white border border-gray-200 rounded-xl p-1 w-fit shadow-sm">
            <button 
                @click="activeTab = 'connection'"
                :class="activeTab === 'connection' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'"
                class="px-5 py-2 text-[13px] font-semibold rounded-lg transition-all"
            >
                <i class="fas fa-plug mr-2"></i>Bağlantı Ayarları
            </button>
            <button 
                @click="activeTab = 'domains'"
                :class="activeTab === 'domains' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'"
                class="px-5 py-2 text-[13px] font-semibold rounded-lg transition-all"
            >
                <i class="fas fa-users mr-2"></i>Personel İçe Aktarma
            </button>
        </div>

        <div v-if="loading" class="flex items-center justify-center py-12">
            <i class="fas fa-spinner fa-spin text-2xl text-blue-600"></i>
        </div>

        <!-- TAB: Bağlantı Ayarları -->
        <div v-else-if="activeTab === 'connection'" class="grid grid-cols-3 gap-6">
            <!-- Sol Form -->
            <div class="col-span-2 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <form @submit.prevent="saveSettings" class="p-7 space-y-6">
                    <div class="flex items-center justify-between pb-4 border-b border-gray-100">
                        <h2 class="text-sm font-bold text-gray-800">Bağlantı Bilgileri</h2>
                        <label class="flex items-center gap-2 cursor-pointer">
                            <span class="text-[13px] font-semibold text-gray-600">Entegrasyon Durumu</span>
                            <div class="relative inline-block w-9 h-5">
                                <input type="checkbox" v-model="entraSettings.is_active" class="peer sr-only">
                                <div class="w-full h-full bg-gray-200 rounded-full peer-checked:bg-blue-600 transition-colors"></div>
                                <div class="absolute left-1 top-1 w-3 h-3 bg-white rounded-full transition-all peer-checked:translate-x-4"></div>
                            </div>
                        </label>
                    </div>

                    <div class="space-y-4">
                        <div>
                            <label class="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Tenant ID (Dizin Kimliği)</label>
                            <input v-model="entraSettings.tenant_id" type="text" class="w-full h-10 px-3 text-[13px] border border-gray-200 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-mono" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx">
                        </div>
                        <div>
                            <label class="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Client ID (Uygulama Kimliği)</label>
                            <input v-model="entraSettings.client_id" type="text" class="w-full h-10 px-3 text-[13px] border border-gray-200 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-mono" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx">
                        </div>
                        <div>
                            <label class="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Client Secret (İstemci Sırrı)</label>
                            <input v-model="entraSettings.client_secret" type="password" class="w-full h-10 px-3 text-[13px] border border-gray-200 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-mono" placeholder="Değiştirmek için girin">
                        </div>
                        <div>
                            <label class="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Eşitleme Sıklığı</label>
                            <select v-model="entraSettings.sync_interval_minutes" class="w-full h-10 px-3 text-[13px] border border-gray-200 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all">
                                <option :value="30">30 Dakikada Bir</option>
                                <option :value="60">Saatlik (Önerilen)</option>
                                <option :value="360">6 Saatte Bir</option>
                                <option :value="720">12 Saatte Bir</option>
                                <option :value="1440">Günlük</option>
                            </select>
                        </div>
                    </div>

                    <div class="pt-6 border-t border-gray-100 flex items-center justify-end gap-3">
                        <button type="submit" :disabled="saving" class="px-8 py-2.5 text-[13px] font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm shadow-blue-200 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-60">
                            <i :class="saving ? 'fas fa-spinner fa-spin' : 'fas fa-save'"></i>
                            {{ saving ? 'Kaydediliyor...' : 'Bağlantı Ayarlarını Kaydet' }}
                        </button>
                    </div>
                </form>
            </div>

            <!-- Sağ Senkronizasyon Paneli -->
            <div class="space-y-6">
                <div class="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
                    <h3 class="text-sm font-bold text-gray-800 mb-4">Senkronizasyon Kontrolü</h3>
                    <div class="space-y-4">
                        <div class="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-3">
                            <div class="flex items-center justify-between text-xs">
                                <span class="text-gray-500">Çalışma Modu:</span>
                                <span v-if="isMockMode" class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-yellow-50 text-yellow-700 border border-yellow-200">Simülasyon Modu</span>
                                <span v-else class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">Bulut Bağlantısı</span>
                            </div>
                            <div class="flex items-center justify-between text-xs">
                                <span class="text-gray-500">Son Güncelleme:</span>
                                <span class="font-semibold text-gray-700">{{ formatDate(entraSettings.last_sync) }}</span>
                            </div>
                        </div>

                        <button type="button" @click="triggerSync" :disabled="syncing"
                            class="w-full h-11 px-4 text-[13px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-60">
                            <i :class="syncing ? 'fas fa-spinner fa-spin' : 'fas fa-sync'"></i>
                            {{ syncing ? 'Eşitleniyor...' : 'Lisans Eşitleme (Sync)' }}
                        </button>
                    </div>
                </div>

                <div v-if="syncResult" class="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-4">
                    <h4 class="text-xs font-bold text-gray-400 uppercase tracking-wide">Son Eşitleme Sonucu</h4>
                    <div class="p-3 bg-green-50/50 border border-green-100 rounded-xl flex items-start gap-3">
                        <div class="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-xs shrink-0 mt-0.5">
                            <i class="fas fa-check"></i>
                        </div>
                        <div>
                            <p class="text-[12px] font-semibold text-green-800">{{ syncResult.message }}</p>
                            <div class="mt-2 space-y-1 text-[11px] text-green-700" v-if="syncResult.details">
                                <div class="flex gap-4">
                                    <span>Lisanslar: <strong>{{ syncResult.details.licensesSynced }} adet</strong></span>
                                    <span>Kullanıcılar: <strong>{{ syncResult.details.usersSynced }} adet</strong></span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- TAB: Personel İçe Aktarma (Domain Seçimi) -->
        <div v-else-if="activeTab === 'domains'" class="space-y-6">
            <!-- Üst Açıklama Kartı -->
            <div class="bg-blue-50 border border-blue-200 rounded-2xl p-5 flex items-start gap-4">
                <div class="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                    <i class="fas fa-info-circle"></i>
                </div>
                <div>
                    <p class="text-[13px] font-semibold text-blue-900">Azure'dan Personel İçe Aktarma</p>
                    <p class="text-[12px] text-blue-700 mt-1">
                        Hangi domain'lerdeki kullanıcıların ITManager personel listesine aktarılacağını seçin. 
                        Mevcut personel kayıtları Azure verileriyle güncellenecek, yeni kullanıcılar eklenecek. 
                        Eşleşmeyen kayıtlar "legacy" olarak işaretlenecek (silinmez).
                    </p>
                </div>
            </div>

            <div class="grid grid-cols-3 gap-6">
                <!-- Domain Listesi -->
                <div class="col-span-2 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                    <div class="flex items-center justify-between p-5 border-b border-gray-100">
                        <h3 class="text-sm font-bold text-gray-800">
                            <i class="fas fa-globe mr-2 text-blue-500"></i>
                            Azure Domain Listesi
                        </h3>
                        <button @click="loadAzureDomains" :disabled="loadingDomains"
                            class="flex items-center gap-2 px-4 py-2 text-[12px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-all disabled:opacity-50">
                            <i :class="loadingDomains ? 'fas fa-spinner fa-spin' : 'fas fa-download'"></i>
                            {{ loadingDomains ? 'Yükleniyor...' : 'Domain\'leri Getir' }}
                        </button>
                    </div>

                    <!-- Boş Durum -->
                    <div v-if="azureDomains.length === 0 && !loadingDomains" class="flex flex-col items-center justify-center py-16 text-gray-400">
                        <i class="fas fa-cloud-download-alt text-4xl mb-3"></i>
                        <p class="text-[13px] font-semibold">Domain listesi henüz yüklenmedi</p>
                        <p class="text-[12px] mt-1">Yukarıdaki "Domain'leri Getir" butonuna tıklayın</p>
                    </div>

                    <!-- Yükleme -->
                    <div v-else-if="loadingDomains" class="flex items-center justify-center py-16">
                        <div class="text-center text-gray-400">
                            <i class="fas fa-spinner fa-spin text-3xl mb-3 text-blue-500"></i>
                            <p class="text-[13px]">Azure'dan domain listesi alınıyor...</p>
                        </div>
                    </div>

                    <!-- Domain Listesi -->
                    <div v-else class="divide-y divide-gray-50 max-h-80 overflow-y-auto">
                        <div v-for="d in azureDomains" :key="d.domain"
                            @click="toggleDomain(d.domain)"
                            :class="isDomainSelected(d.domain) ? 'bg-blue-50/80 border-l-4 border-l-blue-500' : 'border-l-4 border-l-transparent hover:bg-gray-50'"
                            class="flex items-center justify-between px-5 py-3.5 cursor-pointer transition-all group"
                        >
                            <div class="flex items-center gap-3">
                                <div :class="isDomainSelected(d.domain) ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300 group-hover:border-blue-400'"
                                    class="w-5 h-5 rounded border-2 flex items-center justify-center transition-all shrink-0">
                                    <i v-if="isDomainSelected(d.domain)" class="fas fa-check text-white text-[10px]"></i>
                                </div>
                                <div>
                                    <span class="text-[13px] font-semibold text-gray-800">@{{ d.domain }}</span>
                                    <p class="text-[11px] text-gray-400 mt-0.5">
                                        <i class="fas fa-info-circle mr-1 text-blue-400"></i>
                                        Şirket bilgisi kullanıcı bazında Azure'dan alınır
                                    </p>
                                </div>
                            </div>
                            <div class="flex items-center gap-2 text-[11px]">
                                <div class="flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                                    <i class="fas fa-users"></i>
                                    <span class="font-bold">{{ d.total }}</span> toplam
                                </div>
                                <div class="flex items-center gap-1 px-2 py-1 rounded-full bg-green-50 text-green-700">
                                    <i class="fas fa-id-badge"></i>
                                    <span class="font-bold">{{ d.licensed }}</span> lisanslı
                                </div>
                                <div class="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 text-blue-700">
                                    <i class="fas fa-circle" style="font-size:6px"></i>
                                    <span class="font-bold">{{ d.enabled }}</span> aktif
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Bilgi Notu -->
                    <div v-if="azureDomains.length > 0" class="px-5 py-3 bg-blue-50 border-t border-blue-100">
                        <p class="text-[11px] text-blue-700 flex items-start gap-2">
                            <i class="fas fa-info-circle mt-0.5 shrink-0"></i>
                            <span>
                                <strong>Şirket Eşleştirme:</strong> Bir domain birden fazla şirkete ait kullanıcıları barındırabilir
                                (örn. <em>talay.com</em> → Talay Lojistik + Talay Gümrük). Bu nedenle şirket bilgisi her kullanıcı için
                                Azure'daki <code class="bg-blue-100 px-1 rounded">companyName</code> alanından ayrı ayrı okunur.
                            </span>
                        </p>
                    </div>
                </div>

                <!-- Sağ Panel: Seçim Özeti + Sync Butonu -->
                <div class="space-y-4 sticky top-6 self-start">
                    <!-- Seçim Özeti -->
                    <div class="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
                        <h4 class="text-xs font-bold text-gray-400 uppercase tracking-wide mb-4">Seçim Özeti</h4>
                        <div class="space-y-3">
                            <div class="flex items-center justify-between">
                                <span class="text-[12px] text-gray-600">Seçili Domain:</span>
                                <span class="font-bold text-blue-600 text-[13px]">{{ selectedDomains.length }}</span>
                            </div>
                            <div class="flex items-center justify-between">
                                <span class="text-[12px] text-gray-600">Aktarılacak Kullanıcı:</span>
                                <span class="font-bold text-gray-800 text-[13px]">~{{ totalSelectedUsers.toLocaleString() }}</span>
                            </div>
                        </div>

                        <!-- Seçili Domain'ler Listesi -->
                        <div class="mt-4 flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                            <div v-for="d in selectedDomains" :key="d"
                                class="flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-[11px] font-semibold">
                                <span>@{{ d }}</span>
                                <button @click.stop="toggleDomain(d)" class="ml-1 hover:text-red-500 transition-colors">
                                    <i class="fas fa-times text-[9px]"></i>
                                </button>
                            </div>
                            <div v-if="selectedDomains.length === 0" class="text-[12px] text-gray-400 italic py-1">
                                Henüz domain seçilmedi
                            </div>
                        </div>
                    </div>

                    <!-- Sync Butonu -->
                    <button 
                        @click="showSyncConfirm = true"
                        :disabled="selectedDomains.length === 0 || personnelSyncing"
                        class="w-full py-3.5 text-[13px] font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl shadow-md shadow-blue-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <i :class="personnelSyncing ? 'fas fa-spinner fa-spin' : 'fas fa-cloud-download-alt'"></i>
                        {{ personnelSyncing ? 'Aktarılıyor...' : 'Personeli Azure\'dan Aktar' }}
                    </button>

                    <p v-if="isMockMode" class="text-[11px] text-green-700 text-center">
                        <i class="fas fa-info-circle mr-1"></i>
                        Simülasyon modu aktif. Test verileri yüklenecektir.
                    </p>

                    <!-- Sonuç -->
                    <div v-if="personnelSyncResult" class="bg-white border border-green-200 rounded-2xl shadow-sm p-5 space-y-3">
                        <div class="flex items-center gap-2 text-green-700">
                            <i class="fas fa-check-circle"></i>
                            <span class="text-[12px] font-bold">Aktarım Tamamlandı</span>
                        </div>
                        <div class="space-y-2 text-[12px]" v-if="personnelSyncResult.details">
                            <div class="flex justify-between">
                                <span class="text-gray-500">Güncellenen</span>
                                <span class="font-bold text-blue-600">{{ personnelSyncResult.details.updated }} kişi</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-500">Yeni Eklenen</span>
                                <span class="font-bold text-green-600">{{ personnelSyncResult.details.inserted }} kişi</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-500">Legacy (Eski)</span>
                                <span class="font-bold text-orange-500">{{ personnelSyncResult.details.legacy }} kişi</span>
                            </div>
                            <div class="flex justify-between border-t border-gray-100 pt-2">
                                <span class="text-gray-700 font-semibold">Toplam Personel</span>
                                <span class="font-bold text-gray-900">{{ personnelSyncResult.details.total }} kişi</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Onay Modalı -->
    <div v-if="showSyncConfirm" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-7 animate-fade-in">
            <div class="flex items-start gap-4 mb-5">
                <div class="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600 shrink-0">
                    <i class="fas fa-exclamation-triangle text-xl"></i>
                </div>
                <div>
                    <h3 class="text-[16px] font-bold text-gray-900">Personel Senkronizasyonunu Onayla</h3>
                    <p class="text-[12px] text-gray-500 mt-1">
                        Seçili {{ selectedDomains.length }} domain'den <strong>~{{ totalSelectedUsers.toLocaleString() }} kullanıcı</strong> ITManager'a aktarılacak.
                    </p>
                </div>
            </div>

            <div class="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 space-y-2">
                <p class="text-[12px] font-semibold text-amber-800"><i class="fas fa-info-circle mr-1"></i>Bu işlem şunları yapar:</p>
                <ul class="text-[11px] text-amber-700 space-y-1 ml-4 list-disc">
                    <li>Eşleşen personel kayıtları Azure verileriyle güncellenir</li>
                    <li>Azure'da bulunup ITManager'da olmayan kullanıcılar eklenir</li>
                    <li>Eşleşemeyen eski kayıtlar "legacy" işaretiyle saklanır, SİLİNMEZ</li>
                    <li>SIM ve envanter bağlantıları eşleşen kayıtlar için korunur</li>
                </ul>
            </div>

            <div class="flex gap-3">
                <button @click="showSyncConfirm = false" class="flex-1 py-2.5 text-[13px] font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all">
                    İptal
                </button>
                <button @click="startPersonnelSync" class="flex-1 py-2.5 text-[13px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-sm shadow-blue-200">
                    <i class="fas fa-cloud-download-alt mr-2"></i>Evet, Aktar
                </button>
            </div>
        </div>
    </div>
  </div>
</template>
