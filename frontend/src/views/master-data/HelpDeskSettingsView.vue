<script setup>
import { ref, onMounted, computed } from 'vue'
import api from '../../api'
import { useToast } from '../../composables/useToast'

const { showToast } = useToast()
const loading = ref(true)

// IMAP Settings
const imapSettings = ref({ host: '', port: 993, user: '', password: '', tls: true, delete_after_read: false, is_active: false })
const savingImap = ref(false)
const testingImap = ref(false)

// Categories
const categories = ref([])
const subcategories = ref([])
const newCategory = ref({ name: '', type: 'Genel' })
const newSubcategory = ref({ category_id: '', name: '' })

const loadData = async () => {
    loading.value = true
    try {
        const [imapRes, metaRes] = await Promise.all([
            api.get('/admin/api/settings/imap'),
            api.get('/api/helpdesk/metadata')
        ])

        if (imapRes.data.success && imapRes.data.settings) {
            imapSettings.value = { ...imapSettings.value, ...imapRes.data.settings }
            imapSettings.value.tls = imapRes.data.settings.tls === 1
            imapSettings.value.delete_after_read = imapRes.data.settings.delete_after_read === 1
            imapSettings.value.is_active = imapRes.data.settings.is_active === 1
            imapSettings.value.password = '' 
        }

        categories.value = metaRes.data.categories || []
        subcategories.value = metaRes.data.subcategories || []
    } catch (err) {
        showToast('Ayarlar yüklenemedi.', 'error')
    } finally {
        loading.value = false
    }
}

const saveImapSettings = async () => {
    savingImap.value = true
    try {
        const payload = { 
            ...imapSettings.value, 
            tls: imapSettings.value.tls ? 1 : 0,
            delete_after_read: imapSettings.value.delete_after_read ? 1 : 0,
            is_active: imapSettings.value.is_active ? 1 : 0
        }
        const res = await api.post('/admin/api/settings/imap', payload)
        if (res.data.success) {
            showToast(res.data.message || 'IMAP ayarları başarıyla kaydedildi.', 'success')
        }
    } catch(err) {
        showToast(err.response?.data?.message || 'IMAP ayarları kaydedilemedi.', 'error')
    } finally {
        savingImap.value = false
    }
}

const testImapSettings = async () => {
    testingImap.value = true
    try {
        const payload = { 
            ...imapSettings.value, 
            tls: imapSettings.value.tls ? 1 : 0,
            delete_after_read: imapSettings.value.delete_after_read ? 1 : 0,
            is_active: imapSettings.value.is_active ? 1 : 0
        }
        const res = await api.post('/admin/api/settings/imap/test', payload)
        if (res.data.success) {
            showToast(res.data.message || 'IMAP bağlantısı başarılı!', 'success')
        }
    } catch(err) {
        showToast(err.response?.data?.message || 'IMAP bağlantı testi başarısız.', 'error')
    } finally {
        testingImap.value = false
    }
}

// Category Methods
const addCategory = async () => {
    if (!newCategory.value.name.trim()) return
    try {
        await api.post('/api/helpdesk/categories', newCategory.value)
        showToast('Kategori eklendi.', 'success')
        newCategory.value = { name: '', type: 'Genel' }
        await loadData()
    } catch(err) {
        showToast('Kategori eklenemedi.', 'error', 3000, err.response?.data || err.message)
    }
}

const deleteCategory = async (id) => {
    if(!confirm('Bu kategoriyi silmek istediğinize emin misiniz?')) return
    try {
        await api.delete(`/api/helpdesk/categories/${id}`)
        showToast('Kategori silindi.', 'success')
        await loadData()
    } catch(err) {
        showToast(err.response?.data?.error || 'Silinemedi.', 'error')
    }
}

// Subcategory Methods
const addSubcategory = async () => {
    if (!newSubcategory.value.name.trim() || !newSubcategory.value.category_id) return
    try {
        await api.post('/api/helpdesk/subcategories', newSubcategory.value)
        showToast('Alt kategori eklendi.', 'success')
        newSubcategory.value.name = ''
        await loadData()
    } catch(err) {
        showToast('Alt kategori eklenemedi.', 'error', 3000, err.response?.data || err.message)
    }
}

const deleteSubcategory = async (id) => {
    if(!confirm('Bu alt kategoriyi silmek istediğinize emin misiniz?')) return
    try {
        await api.delete(`/api/helpdesk/subcategories/${id}`)
        showToast('Alt kategori silindi.', 'success')
        await loadData()
    } catch(err) {
        showToast(err.response?.data?.error || 'Silinemedi.', 'error')
    }
}

const getSubcategories = (catId) => {
    return subcategories.value.filter(s => s.category_id === catId)
}

onMounted(() => {
    loadData()
})
</script>

<template>
  <div class="h-full flex flex-col bg-[#f8f9fa] dark:bg-slate-900 overflow-y-auto">
    <div class="px-6 py-6 max-w-4xl mx-auto w-full space-y-6">
        <div class="flex items-center justify-between mb-4 border-b border-[#dadce0] dark:border-slate-700 pb-4">
            <div>
                <h1 class="text-xl font-medium text-[#202124] dark:text-slate-100">IT Destek Merkezi Ayarları</h1>
                <p class="text-xs text-[#5f6368] dark:text-slate-500 mt-0.5">Kategoriler, alt kırılımlar ve e-posta (IMAP) dinleyici yapılandırması.</p>
            </div>
        </div>

        <div v-if="loading" class="flex justify-center p-12">
            <i class="fas fa-spinner fa-spin text-3xl text-gray-300 dark:text-slate-600"></i>
        </div>

        <div v-else class="space-y-6">
            
            <!-- Kategoriler -->
            <div class="bg-white dark:bg-slate-800 border border-[#dadce0] dark:border-slate-700 rounded-md overflow-hidden">
                <div class="px-6 py-4 border-b border-[#dadce0] dark:border-slate-700 bg-[#f8f9fa] dark:bg-slate-900 flex justify-between items-center">
                    <h3 class="text-sm font-medium text-[#202124] dark:text-slate-100"><i class="fas fa-folder-tree text-[#1a73e8] dark:text-blue-400 mr-2"></i> Kategori Yapılandırması</h3>
                </div>
                <div class="p-6">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <!-- Ana Kategoriler -->
                        <div>
                            <h4 class="text-xs font-medium text-[#5f6368] dark:text-slate-500 uppercase tracking-wide mb-4">Ana Kategoriler</h4>

                            <form @submit.prevent="addCategory" class="flex gap-2 mb-4">
                                <input v-model="newCategory.name" required type="text" placeholder="Yeni Kategori Adı" class="flex-1 h-9 px-3 border border-[#dadce0] dark:border-slate-700 rounded text-sm text-[#202124] dark:text-slate-100 bg-white dark:bg-slate-800 outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] transition-colors placeholder-[#9aa0a6]">
                                <button type="submit" class="h-9 px-4 bg-white dark:bg-slate-800 text-[#1a73e8] dark:text-blue-400 text-sm font-medium rounded border border-[#dadce0] dark:border-slate-700 hover:bg-[#e8f0fe] dark:hover:bg-blue-500/10 transition-colors"><i class="fas fa-plus"></i></button>
                            </form>

                            <div class="space-y-2 max-h-96 overflow-y-auto pr-2">
                                <div v-for="cat in categories" :key="cat.id" class="flex items-center justify-between p-3 bg-white dark:bg-slate-800 border border-[#dadce0] dark:border-slate-700 rounded hover:bg-[#f8f9fa] dark:hover:bg-slate-700/50 transition-colors">
                                    <div class="text-sm text-[#202124] dark:text-slate-100 font-medium">{{ cat.name }}</div>
                                    <button @click="deleteCategory(cat.id)" class="w-8 h-8 rounded border border-[#dadce0] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#ea4335] dark:text-red-400 hover:bg-[#fce8e6] dark:hover:bg-red-500/10 flex items-center justify-center transition-colors">
                                        <i class="fas fa-trash text-xs"></i>
                                    </button>
                                </div>
                                <div v-if="categories.length === 0" class="text-xs text-gray-400 dark:text-slate-500 text-center py-4">Henüz kategori eklenmedi.</div>
                            </div>
                        </div>

                        <!-- Alt Kategoriler -->
                        <div>
                            <h4 class="text-xs font-medium text-[#5f6368] dark:text-slate-500 uppercase tracking-wide mb-4">Alt Kategoriler</h4>

                            <form @submit.prevent="addSubcategory" class="flex flex-col gap-2 mb-4">
                                <div class="flex gap-2">
                                    <select v-model="newSubcategory.category_id" required class="w-1/2 h-9 border border-[#dadce0] dark:border-slate-700 px-3 rounded text-sm text-[#202124] dark:text-slate-100 bg-white dark:bg-slate-800 outline-none focus:border-[#1a73e8] transition-colors">
                                        <option value="" disabled>Ana Kategori</option>
                                        <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
                                    </select>
                                    <input v-model="newSubcategory.name" required type="text" placeholder="Yeni Alt Kategori" class="flex-1 h-9 px-3 border border-[#dadce0] dark:border-slate-700 rounded text-sm text-[#202124] dark:text-slate-100 bg-white dark:bg-slate-800 outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] transition-colors placeholder-[#9aa0a6]">
                                    <button type="submit" class="h-9 px-4 bg-white dark:bg-slate-800 text-[#34a853] dark:text-green-400 text-sm font-medium rounded border border-[#dadce0] dark:border-slate-700 hover:bg-[#e6f4ea] dark:hover:bg-green-500/10 transition-colors"><i class="fas fa-plus"></i></button>
                                </div>
                            </form>

                            <div class="space-y-3 max-h-96 overflow-y-auto pr-2">
                                <div v-for="cat in categories" :key="'sublist-'+cat.id">
                                    <div class="text-xs font-medium text-[#5f6368] dark:text-slate-500 mb-1 pl-1">{{ cat.name }}</div>
                                    <div class="space-y-1">
                                        <div v-for="sub in getSubcategories(cat.id)" :key="sub.id" class="flex items-center justify-between p-2 pl-3 bg-white dark:bg-slate-800 border border-[#f1f3f4] dark:border-slate-700 rounded hover:bg-[#f8f9fa] dark:hover:bg-slate-700/50 group transition-colors">
                                            <div class="text-xs text-[#202124] dark:text-slate-200 font-normal flex items-center gap-2">
                                                <i class="fas fa-level-up-alt rotate-90 text-gray-300 dark:text-slate-600"></i> {{ sub.name }}
                                            </div>
                                            <button @click="deleteSubcategory(sub.id)" class="w-6 h-6 rounded text-gray-300 dark:text-slate-600 hover:text-[#ea4335] dark:hover:text-red-400 hover:bg-[#fce8e6] dark:hover:bg-red-500/10 flex items-center justify-center transition-colors">
                                                <i class="fas fa-times text-xs"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- IMAP Settings -->
            <div class="bg-white dark:bg-slate-800 border border-[#dadce0] dark:border-slate-700 rounded-md overflow-hidden mb-12">
                <div class="px-6 py-4 border-b border-[#dadce0] dark:border-slate-700 bg-[#f8f9fa] dark:bg-slate-900">
                    <h3 class="text-sm font-medium text-[#202124] dark:text-slate-100"><i class="fas fa-inbox text-[#1a73e8] dark:text-blue-400 mr-2"></i> IMAP & Gelen Kutu Ayarları</h3>
                </div>
                <form @submit.prevent="saveImapSettings" class="p-6 space-y-6">

                    <div class="flex items-center gap-2 mb-4 bg-[#f8f9fa] dark:bg-slate-900 p-4 rounded border border-[#dadce0] dark:border-slate-700">
                        <label class="flex items-center gap-2 cursor-pointer w-full">
                            <input type="checkbox" v-model="imapSettings.is_active" class="w-4 h-4 border border-[#dadce0] dark:border-slate-600 rounded text-[#1a73e8] outline-none">
                            <span class="text-sm font-medium text-[#202124] dark:text-slate-100">IMAP Mail Dinleyici Servisi Aktif</span>
                        </label>
                    </div>

                    <div class="grid grid-cols-4 gap-5">
                        <div class="col-span-3">
                            <label class="block text-xs font-medium text-[#5f6368] dark:text-slate-500 uppercase tracking-wide mb-1.5">IMAP Sunucu (Host) <span class="text-red-500">*</span></label>
                            <input v-model="imapSettings.host" required type="text" class="w-full h-9 border border-[#dadce0] dark:border-slate-700 px-3 rounded text-sm text-[#202124] dark:text-slate-100 bg-white dark:bg-slate-800 outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] transition-colors placeholder-[#9aa0a6]" placeholder="outlook.office365.com">
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-[#5f6368] dark:text-slate-500 uppercase tracking-wide mb-1.5">Port <span class="text-red-500">*</span></label>
                            <input v-model="imapSettings.port" required type="number" class="w-full h-9 border border-[#dadce0] dark:border-slate-700 px-3 rounded text-sm text-[#202124] dark:text-slate-100 bg-white dark:bg-slate-800 outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] transition-colors placeholder-[#9aa0a6]" placeholder="993">
                        </div>
                    </div>

                    <div class="flex items-center gap-6">
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" v-model="imapSettings.tls" class="w-4 h-4 border border-[#dadce0] dark:border-slate-600 rounded text-[#1a73e8] outline-none">
                            <span class="text-xs font-medium text-[#5f6368] dark:text-slate-500">SSL/TLS Kullan</span>
                        </label>
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" v-model="imapSettings.delete_after_read" class="w-4 h-4 border border-[#dadce0] dark:border-slate-600 rounded text-[#1a73e8] outline-none">
                            <span class="text-xs font-medium text-[#5f6368] dark:text-slate-500">Okunan (Bilete Dönüşen) Mailleri Sunucudan Sil</span>
                        </label>
                    </div>

                    <div class="grid grid-cols-2 gap-5">
                        <div>
                            <label class="block text-xs font-medium text-[#5f6368] dark:text-slate-500 uppercase tracking-wide mb-1.5">Kullanıcı Adı <span class="text-red-500">*</span></label>
                            <input v-model="imapSettings.user" required type="text" class="w-full h-9 border border-[#dadce0] dark:border-slate-700 px-3 rounded text-sm text-[#202124] dark:text-slate-100 bg-white dark:bg-slate-800 outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] transition-colors placeholder-[#9aa0a6]" placeholder="support@talay.com">
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-[#5f6368] dark:text-slate-500 uppercase tracking-wide mb-1.5">Parola (Uygulama Şifresi)</label>
                            <input v-model="imapSettings.password" type="password" class="w-full h-9 border border-[#dadce0] dark:border-slate-700 px-3 rounded text-sm text-[#202124] dark:text-slate-100 bg-white dark:bg-slate-800 outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] transition-colors placeholder-[#9aa0a6]" placeholder="Değiştirmek için girin">
                        </div>
                    </div>

                    <div class="pt-6 border-t border-[#dadce0] dark:border-slate-700 flex justify-end">
                        <button type="button" @click="testImapSettings" :disabled="testingImap" class="h-9 px-4 bg-white dark:bg-slate-800 text-[#3c4043] dark:text-slate-300 text-sm font-medium rounded border border-[#dadce0] dark:border-slate-700 hover:bg-[#f1f3f4] dark:hover:bg-slate-700 transition-colors flex items-center gap-2 mr-3">
                            <i :class="testingImap ? 'fas fa-spinner fa-spin' : 'fas fa-vial'"></i>
                            {{ testingImap ? 'Test Ediliyor...' : 'Bağlantıyı Test Et' }}
                        </button>
                        <button type="submit" :disabled="savingImap" class="h-9 px-4 bg-[#1a73e8] text-white text-sm font-medium rounded hover:bg-[#174ea6] transition-colors flex items-center gap-2">
                            <i :class="savingImap ? 'fas fa-spinner fa-spin' : 'fas fa-save'"></i>
                            {{ savingImap ? 'Kaydediliyor...' : 'IMAP Ayarlarını Kaydet' }}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
  </div>
</template>
