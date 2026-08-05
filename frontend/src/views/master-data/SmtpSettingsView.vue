<script setup>
import { ref, onMounted } from 'vue'
import api from '../../api'
import { useToast } from '../../composables/useToast'

const smtpSettings = ref({ host: '', port: 587, user: '', pass: '', secure: true, from_email: '' })
const loading = ref(true)
const savingSmtp = ref(false)
const showTestMailModal = ref(false)
const testEmail = ref('')
const isTestingSmtp = ref(false)
const { showToast } = useToast()

const notificationSettings = ref({
    hr_notification_email: '',
    admin_affairs_notification_email: '',
    hr_manager_options: ['', '', '']
})
const savingNotifications = ref(false)

const loadSettings = async () => {
    loading.value = true
    try {
        const resSmtp = await api.get('/admin/api/settings/smtp')

        if (resSmtp.data.success && resSmtp.data.settings) {
            smtpSettings.value = { ...smtpSettings.value, ...resSmtp.data.settings }
            smtpSettings.value.secure = resSmtp.data.settings.secure === 1
            smtpSettings.value.pass = ''
        }

        const resNotif = await api.get('/admin/api/settings/notifications')
        if (resNotif.data.success && resNotif.data.settings) {
            const managerOptions = resNotif.data.settings.hr_manager_options || []
            notificationSettings.value = {
                hr_notification_email: resNotif.data.settings.hr_notification_email || '',
                admin_affairs_notification_email: resNotif.data.settings.admin_affairs_notification_email || '',
                hr_manager_options: [0, 1, 2].map(i => managerOptions[i] || '')
            }
        }
    } catch (err) {
        console.error('Ayarlar yüklenemedi:', err)
        showToast('Ayarlar yüklenemedi.', 'error')
    } finally {
        loading.value = false
    }
}

const saveNotificationSettings = async () => {
    savingNotifications.value = true
    try {
        const payload = {
            hr_notification_email: notificationSettings.value.hr_notification_email,
            admin_affairs_notification_email: notificationSettings.value.admin_affairs_notification_email,
            hr_manager_options: notificationSettings.value.hr_manager_options.filter(n => n && n.trim())
        }
        const res = await api.post('/admin/api/settings/notifications', payload)
        if (res.data.success) {
            showToast('Bildirim ayarları başarıyla kaydedildi.', 'success')
        }
    } catch (err) {
        showToast('Bildirim ayarları kaydedilemedi.', 'error')
    } finally {
        savingNotifications.value = false
    }
}

const saveSmtpSettings = async () => {
    savingSmtp.value = true
    try {
        const payload = { ...smtpSettings.value, secure: smtpSettings.value.secure ? 1 : 0 }
        const res = await api.post('/admin/api/settings/smtp', payload)
        if (res.data.success) {
            showToast('SMTP ayarları başarıyla kaydedildi.', 'success')
        }
    } catch(err) {
        showToast('SMTP ayarları kaydedilemedi.', 'error')
    } finally {
        savingSmtp.value = false
    }
}


const sendTestMail = async () => {
    if (!testEmail.value) {
        showToast('Lütfen bir test e-posta adresi girin.', 'error')
        return
    }
    isTestingSmtp.value = true
    try {
        const res = await api.post('/admin/api/settings/smtp/test', { email: testEmail.value })
        if (res.data.success) {
            showToast('Test e-postası başarıyla gönderildi.', 'success')
            showTestMailModal.value = false
        } else {
            showToast(res.data.message || 'Gönderilemedi.', 'error')
        }
    } catch(err) {
        showToast(err.response?.data?.message || 'Test maili gönderilirken hata oluştu. Ayarlarınızı kontrol edin.', 'error')
    } finally {
        isTestingSmtp.value = false
    }
}

onMounted(() => {
    loadSettings()
})
</script>

<template>
  <div class="h-full flex flex-col bg-gray-50/50 dark:bg-slate-900">
    <div class="p-8 max-w-2xl">
        <div class="mb-8">
            <h1 class="text-[20px] font-bold text-gray-900 dark:text-slate-100 flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex items-center justify-center text-gray-500 dark:text-slate-400 shadow-sm">
                    <i class="fas fa-paper-plane"></i>
                </div>
                SMTP & Mail Ayarları
            </h1>
            <p class="text-[13px] text-gray-500 dark:text-slate-400 mt-2 ml-[52px]">Sistem bildirimleri ve şifre sıfırlama e-postaları için SMTP sunucu yapılandırması.</p>
        </div>

        <div class="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
            <form @submit.prevent="saveSmtpSettings" class="p-7 space-y-6">

                <div class="grid grid-cols-4 gap-5">
                    <div class="col-span-3">
                        <label class="block text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-1.5">Sunucu (Host) <span class="text-red-500 dark:text-red-400">*</span></label>
                        <input v-model="smtpSettings.host" required type="text" class="w-full h-10 px-3 text-[13px] border border-gray-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-500/20 transition-all" placeholder="smtp.gmail.com">
                    </div>
                    <div>
                        <label class="block text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-1.5">Port <span class="text-red-500 dark:text-red-400">*</span></label>
                        <input v-model="smtpSettings.port" required type="number" class="w-full h-10 px-3 text-[13px] border border-gray-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-500/20 transition-all" placeholder="587">
                    </div>
                </div>

                <div class="flex items-center gap-2">
                    <label class="flex items-center gap-2 cursor-pointer">
                        <div class="relative inline-block w-9 h-5">
                            <input type="checkbox" v-model="smtpSettings.secure" class="peer sr-only">
                            <div class="w-full h-full bg-gray-200 dark:bg-slate-700 rounded-full peer-checked:bg-blue-600 transition-colors"></div>
                            <div class="absolute left-1 top-1 w-3 h-3 bg-white rounded-full transition-all peer-checked:translate-x-4"></div>
                        </div>
                        <span class="text-[13px] font-bold text-gray-700 dark:text-slate-300">SSL/TLS Güvenli Bağlantı Kullan</span>
                    </label>
                </div>

                <div class="grid grid-cols-2 gap-5">
                    <div>
                        <label class="block text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-1.5">Kullanıcı Adı <span class="text-red-500 dark:text-red-400">*</span></label>
                        <input v-model="smtpSettings.user" required type="text" class="w-full h-10 px-3 text-[13px] border border-gray-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-500/20 transition-all" placeholder="mail@sirket.com">
                    </div>
                    <div>
                        <label class="block text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-1.5">Parola (Uygulama Şifresi)</label>
                        <input v-model="smtpSettings.pass" type="password" class="w-full h-10 px-3 text-[13px] border border-gray-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-500/20 transition-all" placeholder="Değiştirmek için girin">
                    </div>
                </div>

                <div>
                    <label class="block text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-1.5">Gönderen Adresi (Kimden) <span class="text-red-500 dark:text-red-400">*</span></label>
                    <input v-model="smtpSettings.from_email" required type="text" class="w-full h-10 px-3 text-[13px] border border-gray-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-500/20 transition-all" placeholder="IT Manager <noreply@sirket.com>">
                </div>

                <div class="pt-6 border-t border-gray-100 dark:border-slate-700 flex items-center justify-end gap-3">
                    <button type="button" @click="showTestMailModal = true" class="px-5 py-2 text-[13px] font-semibold text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors">
                        <i class="fas fa-flask mr-1"></i> Test Gönder
                    </button>
                    <button type="submit" :disabled="savingSmtp || loading" class="px-8 py-2 text-[13px] font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm shadow-blue-200 dark:shadow-blue-900/30 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
                        <i :class="savingSmtp ? 'fas fa-spinner fa-spin' : 'fas fa-save'"></i>
                        {{ savingSmtp ? 'Kaydediliyor...' : 'SMTP Ayarlarını Kaydet' }}
                    </button>
                </div>
            </form>
        </div>

        <div class="mt-8 mb-8">
            <h1 class="text-[20px] font-bold text-gray-900 dark:text-slate-100 flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex items-center justify-center text-gray-500 dark:text-slate-400 shadow-sm">
                    <i class="fas fa-bell"></i>
                </div>
                İK Bildirim Ayarları
            </h1>
            <p class="text-[13px] text-gray-500 dark:text-slate-400 mt-2 ml-[52px]">İK talebi bildirimlerinin gideceği mail grupları ve "Bağlı Yönetici" seçim listesi.</p>
        </div>

        <div class="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
            <form @submit.prevent="saveNotificationSettings" class="p-7 space-y-6">
                <div>
                    <label class="block text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-1.5">BT Bildirim Mail Grubu</label>
                    <input v-model="notificationSettings.hr_notification_email" type="email" placeholder="bt-grubu@sirket.com"
                        class="w-full h-10 px-3 text-[13px] border border-gray-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-500/20 transition-all">
                    <p class="text-[11px] text-gray-400 dark:text-slate-500 mt-1">Yeni bir İK talebi (giriş/çıkış) oluşturulduğunda bilgilendirme maili bu adrese gönderilir.</p>
                </div>
                <div>
                    <label class="block text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-1.5">İdari İşler Mail Grubu</label>
                    <input v-model="notificationSettings.admin_affairs_notification_email" type="email" placeholder="idari-isler@sirket.com"
                        class="w-full h-10 px-3 text-[13px] border border-gray-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-500/20 transition-all">
                    <p class="text-[11px] text-gray-400 dark:text-slate-500 mt-1">Talepte "Şirket Aracı" donanımı seçildiğinde ayrıca bu adrese de bildirim gönderilir.</p>
                </div>
                <div>
                    <label class="block text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-1.5">Bağlı Yönetici Seçenekleri</label>
                    <div class="space-y-2">
                        <input v-for="(_, i) in notificationSettings.hr_manager_options" :key="i"
                            v-model="notificationSettings.hr_manager_options[i]" type="text"
                            :placeholder="`${i + 1}. Yönetici Adı Soyadı`"
                            class="w-full h-10 px-3 text-[13px] border border-gray-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-500/20 transition-all">
                    </div>
                    <p class="text-[11px] text-gray-400 dark:text-slate-500 mt-1">İK talep formundaki "Bağlı Yönetici" seçim listesinde gösterilecek isimler.</p>
                </div>
                <div class="pt-6 border-t border-gray-100 dark:border-slate-700 flex items-center justify-end">
                    <button type="submit" :disabled="savingNotifications || loading" class="px-8 py-2 text-[13px] font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm shadow-blue-200 dark:shadow-blue-900/30 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
                        <i :class="savingNotifications ? 'fas fa-spinner fa-spin' : 'fas fa-save'"></i>
                        {{ savingNotifications ? 'Kaydediliyor...' : 'Bildirim Ayarlarını Kaydet' }}
                    </button>
                </div>
            </form>
        </div>

    </div>

    <!-- Test Mail Modalı -->
    <Teleport to="body">
        <div v-if="showTestMailModal" class="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" @click.self="showTestMailModal = false">
            <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
                <div class="px-6 py-4 border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/50">
                    <h3 class="text-[15px] font-bold text-gray-900 dark:text-slate-100">Test E-postası Gönder</h3>
                </div>
                <div class="p-6">
                    <label class="block text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-1.5">Gönderilecek Adres</label>
                    <input v-model="testEmail" type="email" class="w-full h-10 px-3 text-[13px] border border-gray-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-500/20 transition-all" placeholder="test@ornek.com">
                </div>
                <div class="px-6 py-4 bg-gray-50/50 dark:bg-slate-900/50 flex justify-end gap-2 border-t border-gray-100 dark:border-slate-700">
                    <button @click="showTestMailModal = false" class="px-4 py-2 text-[13px] font-semibold text-gray-500 dark:text-slate-400">Vazgeç</button>
                    <button @click="sendTestMail" :disabled="isTestingSmtp" class="px-5 py-2 bg-blue-600 text-white text-[13px] font-bold rounded-lg hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2">
                        <i v-if="isTestingSmtp" class="fas fa-spinner fa-spin"></i>
                        {{ isTestingSmtp ? 'Gönderiliyor...' : 'Gönder' }}
                    </button>
                </div>
            </div>
        </div>
    </Teleport>
  </div>
</template>
