<script setup>
import { ref, onMounted, computed } from 'vue'
import api from '../../api'
import { useToast } from '../../composables/useToast'

const { showToast } = useToast()
const loading = ref(true)

// IMAP Settings
const imapSettings = ref({ host: '', port: 993, user: '', password: '', tls: true, delete_after_read: false, is_active: false })
const savingImap = ref(false)

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
  <div class="h-full flex flex-col bg-gray-50/50 overflow-y-auto">
    <div class="p-8 max-w-4xl mx-auto w-full">
        <div class="mb-8">
            <h1 class="text-[20px] font-bold text-gray-900 flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-500 shadow-sm">
                    <i class="fas fa-headset"></i>
                </div>
                IT Destek Merkezi Ayarları
            </h1>
            <p class="text-[13px] text-gray-500 mt-2 ml-[52px]">Kategoriler, alt kırılımlar ve e-posta (IMAP) dinleyici yapılandırması.</p>
        </div>

        <div v-if="loading" class="flex justify-center p-12">
            <i class="fas fa-spinner fa-spin text-3xl text-gray-300"></i>
        </div>

        <div v-else class="space-y-8">
            
            <!-- Kategoriler -->
            <div class="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <div class="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                    <h3 class="text-[14px] font-bold text-gray-900"><i class="fas fa-folder-tree text-blue-500 mr-2"></i> Kategori Yapılandırması</h3>
                </div>
                <div class="p-6">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <!-- Ana Kategoriler -->
                        <div>
                            <h4 class="text-[12px] font-bold text-gray-500 uppercase tracking-wide mb-4">Ana Kategoriler</h4>
                            
                            <form @submit.prevent="addCategory" class="flex gap-2 mb-4">
                                <input v-model="newCategory.name" required type="text" placeholder="Yeni Kategori Adı" class="flex-1 h-9 px-3 text-[12px] border border-gray-200 rounded-lg outline-none focus:border-blue-500">
                                <button type="submit" class="px-4 h-9 bg-blue-50 text-blue-600 font-bold text-[12px] rounded-lg hover:bg-blue-100"><i class="fas fa-plus"></i></button>
                            </form>

                            <div class="space-y-2 max-h-96 overflow-y-auto pr-2">
                                <div v-for="cat in categories" :key="cat.id" class="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-xl hover:border-gray-200 transition-colors">
                                    <div class="font-bold text-[13px] text-gray-800">{{ cat.name }}</div>
                                    <button @click="deleteCategory(cat.id)" class="w-7 h-7 rounded bg-white text-red-500 hover:bg-red-50 flex items-center justify-center border border-gray-100 transition-colors">
                                        <i class="fas fa-trash text-[11px]"></i>
                                    </button>
                                </div>
                                <div v-if="categories.length === 0" class="text-[12px] text-gray-400 text-center py-4">Henüz kategori eklenmedi.</div>
                            </div>
                        </div>

                        <!-- Alt Kategoriler -->
                        <div>
                            <h4 class="text-[12px] font-bold text-gray-500 uppercase tracking-wide mb-4">Alt Kategoriler</h4>
                            
                            <form @submit.prevent="addSubcategory" class="flex flex-col gap-2 mb-4">
                                <div class="flex gap-2">
                                    <select v-model="newSubcategory.category_id" required class="w-1/2 h-9 px-2 text-[12px] border border-gray-200 rounded-lg outline-none focus:border-blue-500 bg-white">
                                        <option value="" disabled>Ana Kategori</option>
                                        <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
                                    </select>
                                    <input v-model="newSubcategory.name" required type="text" placeholder="Yeni Alt Kategori" class="flex-1 h-9 px-3 text-[12px] border border-gray-200 rounded-lg outline-none focus:border-blue-500">
                                    <button type="submit" class="px-4 h-9 bg-emerald-50 text-emerald-600 font-bold text-[12px] rounded-lg hover:bg-emerald-100"><i class="fas fa-plus"></i></button>
                                </div>
                            </form>

                            <div class="space-y-3 max-h-96 overflow-y-auto pr-2">
                                <div v-for="cat in categories" :key="'sublist-'+cat.id">
                                    <div class="text-[11px] font-bold text-gray-400 mb-1 pl-1">{{ cat.name }}</div>
                                    <div class="space-y-1">
                                        <div v-for="sub in getSubcategories(cat.id)" :key="sub.id" class="flex items-center justify-between p-2 pl-3 bg-white border border-gray-100 rounded-lg hover:border-gray-200 group transition-colors">
                                            <div class="font-medium text-[12px] text-gray-700 flex items-center gap-2">
                                                <i class="fas fa-level-up-alt rotate-90 text-gray-300"></i> {{ sub.name }}
                                            </div>
                                            <button @click="deleteSubcategory(sub.id)" class="w-6 h-6 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors">
                                                <i class="fas fa-times text-[11px]"></i>
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
            <div class="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden mb-12">
                <div class="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <h3 class="text-[14px] font-bold text-gray-900"><i class="fas fa-inbox text-blue-500 mr-2"></i> IMAP & Gelen Kutu Ayarları</h3>
                </div>
                <form @submit.prevent="saveImapSettings" class="p-6 space-y-6">
                    
                    <div class="flex items-center gap-2 mb-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <label class="flex items-center gap-2 cursor-pointer w-full">
                            <div class="relative inline-block w-9 h-5">
                                <input type="checkbox" v-model="imapSettings.is_active" class="peer sr-only">
                                <div class="w-full h-full bg-gray-200 rounded-full peer-checked:bg-emerald-500 transition-colors"></div>
                                <div class="absolute left-1 top-1 w-3 h-3 bg-white rounded-full transition-all peer-checked:translate-x-4"></div>
                            </div>
                            <span class="text-[13px] font-bold text-gray-900">IMAP Mail Dinleyici Servisi Aktif</span>
                        </label>
                    </div>

                    <div class="grid grid-cols-4 gap-5">
                        <div class="col-span-3">
                            <label class="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">IMAP Sunucu (Host) <span class="text-red-500">*</span></label>
                            <input v-model="imapSettings.host" required type="text" class="w-full h-10 px-3 text-[13px] border border-gray-200 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" placeholder="outlook.office365.com">
                        </div>
                        <div>
                            <label class="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Port <span class="text-red-500">*</span></label>
                            <input v-model="imapSettings.port" required type="number" class="w-full h-10 px-3 text-[13px] border border-gray-200 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" placeholder="993">
                        </div>
                    </div>

                    <div class="flex items-center gap-6">
                        <label class="flex items-center gap-2 cursor-pointer">
                            <div class="relative inline-block w-9 h-5">
                                <input type="checkbox" v-model="imapSettings.tls" class="peer sr-only">
                                <div class="w-full h-full bg-gray-200 rounded-full peer-checked:bg-blue-600 transition-colors"></div>
                                <div class="absolute left-1 top-1 w-3 h-3 bg-white rounded-full transition-all peer-checked:translate-x-4"></div>
                            </div>
                            <span class="text-[13px] font-bold text-gray-700">SSL/TLS Kullan</span>
                        </label>
                        <label class="flex items-center gap-2 cursor-pointer">
                            <div class="relative inline-block w-9 h-5">
                                <input type="checkbox" v-model="imapSettings.delete_after_read" class="peer sr-only">
                                <div class="w-full h-full bg-gray-200 rounded-full peer-checked:bg-red-500 transition-colors"></div>
                                <div class="absolute left-1 top-1 w-3 h-3 bg-white rounded-full transition-all peer-checked:translate-x-4"></div>
                            </div>
                            <span class="text-[13px] font-bold text-gray-700">Okunan (Bilete Dönüşen) Mailleri Sunucudan Sil</span>
                        </label>
                    </div>

                    <div class="grid grid-cols-2 gap-5">
                        <div>
                            <label class="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Kullanıcı Adı <span class="text-red-500">*</span></label>
                            <input v-model="imapSettings.user" required type="text" class="w-full h-10 px-3 text-[13px] border border-gray-200 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" placeholder="support@talay.com">
                        </div>
                        <div>
                            <label class="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Parola (Uygulama Şifresi)</label>
                            <input v-model="imapSettings.password" type="password" class="w-full h-10 px-3 text-[13px] border border-gray-200 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" placeholder="Değiştirmek için girin">
                        </div>
                    </div>

                    <div class="pt-6 border-t border-gray-100 flex justify-end">
                        <button type="submit" :disabled="savingImap" class="px-8 py-2 text-[13px] font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-all flex items-center gap-2">
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
