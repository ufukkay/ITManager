<script setup>
import { ref, onMounted, computed } from 'vue';
import api from '../../services/api';
import * as XLSX from 'xlsx';

const loading = ref(false);
const requests = ref([]);
const companies = ref([]);
const departments = ref([]);
const locations = ref([]);
const activeTab = ref('all'); // all, entry, exit
const searchQuery = ref('');

// Form State
const isModalShow = ref(false);
const formType = ref('ENTRY'); // ENTRY, EXIT
const form = ref({
    full_name: '',
    position: '',
    request_date: '',
    company: '',
    department: '',
    location: '',
    equipment_needed: [],
    notes: ''
});

// Toast System
const toasts = ref([]);
const showToast = (msg, type = 'success') => {
    const id = Date.now();
    toasts.value.push({ id, msg, type });
    setTimeout(() => {
        toasts.value = toasts.value.filter(t => t.id !== id);
    }, 3000);
};

// Data Fetching
const fetchData = async () => {
    loading.value = true;
    try {
        const [reqRes, compRes, deptRes, locRes] = await Promise.all([
            api.get('/hr-requests'),
            api.get('/sim-takip/companies'),
            api.get('/sim-takip/departments'),
            api.get('/sim-takip/locations')
        ]);
        requests.value = reqRes.data;
        companies.value = compRes.data;
        departments.value = deptRes.data;
        locations.value = locRes.data;
    } catch (err) {
        showToast('Veriler yüklenirken hata oluştu', 'error');
    } finally {
        loading.value = false;
    }
};

// Filtered Requests
const filteredRequests = computed(() => {
    return requests.value.filter(r => {
        const matchesTab = activeTab.value === 'all' || r.type === activeTab.value.toUpperCase();
        const matchesSearch = r.full_name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                            (r.position && r.position.toLowerCase().includes(searchQuery.value.toLowerCase()));
        return matchesTab && matchesSearch;
    });
});

// Stats
const stats = computed(() => {
    return {
        pending: requests.value.filter(r => r.status === 'PENDING').length,
        completed: requests.value.filter(r => r.status === 'COMPLETED').length,
        total: requests.value.length
    };
});

// Actions
const submitForm = async () => {
    if (!form.value.full_name || !form.value.request_date) {
        showToast('İsim ve Tarih zorunludur', 'error');
        return;
    }

    loading.value = true;
    try {
        await api.post('/hr-requests', { ...form.value, type: formType.value });
        showToast('Talep başarıyla oluşturuldu');
        isModalShow.value = false;
        fetchData();
        resetForm();
    } catch (err) {
        showToast('Talep oluşturulamadı', 'error');
    } finally {
        loading.value = false;
    }
};

const updateStatus = async (id, newStatus) => {
    try {
        await api.put(`/hr-requests/${id}`, { status: newStatus });
        showToast('Durum güncellendi');
        fetchData();
    } catch (err) {
        showToast('Güncelleme hatası', 'error');
    }
};

const deleteRequest = async (id) => {
    if (!confirm('Bu talebi silmek istediğinize emin misiniz?')) return;
    try {
        await api.delete(`/hr-requests/${id}`);
        showToast('Talep silindi');
        fetchData();
    } catch (err) {
        showToast('Silme hatası', 'error');
    }
};

const resetForm = () => {
    form.value = {
        full_name: '',
        position: '',
        request_date: '',
        company: '',
        department: '',
        location: '',
        equipment_needed: [],
        notes: ''
    };
};

// Excel Import
const handleExcelImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
        try {
            const data = evt.target.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(sheet);

            loading.value = true;
            let successCount = 0;

            for (const row of rows) {
                // Excel columns: İsim (A), Unvan (B), Tarih (C), Departman (D), Durum (E), Lokasyon (F), Şirket (G)
                const payload = {
                    type: 'ENTRY', // Varsayılan olarak ENTRY
                    full_name: row['İsim'] || 'İsimsiz',
                    position: row['Unvan'] || '',
                    request_date: formatDate(row['Tarih']),
                    department: row['Departman'] || '',
                    location: row['Lokasyon'] || '',
                    company: row['Şirket'] || '',
                    status: row['Durum'] === 'Teslim Edildi' ? 'COMPLETED' : 'PENDING',
                    notes: 'Excel Import - 2023+ Migrasyonu'
                };

                try {
                    await api.post('/hr-requests', payload);
                    successCount++;
                } catch (e) { console.error('Row import error', e); }
            }

            showToast(`${successCount} kayıt başarıyla aktarıldı`);
            fetchData();
        } catch (err) {
            showToast('Excel okuma hatası', 'error');
        } finally {
            loading.value = false;
            e.target.value = ''; // Reset input
        }
    };
    reader.readAsBinaryString(file);
};

const formatDate = (val) => {
    if (!val) return null;
    // Excel date handling or string parsing (DD/MM/YYYY)
    if (typeof val === 'number') {
        const date = XLSX.utils.format_date(XLSX.utils.parse_date(val));
        return date;
    }
    const parts = val.split('/');
    if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    return val;
};

onMounted(fetchData);
</script>

<template>
    <div class="min-h-screen bg-[#F8FAFC] p-4 md:p-8 space-y-8 animate-fade-in relative">
        <!-- Toast Container -->
        <div class="fixed top-8 right-8 z-[9999] flex flex-col gap-3">
            <transition-group name="toast">
                <div v-for="t in toasts" :key="t.id" 
                    :class="t.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'"
                    class="px-5 py-3 rounded-2xl shadow-2xl text-white text-[13px] font-black flex items-center gap-3 ring-4 ring-white/10">
                    <i :class="t.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'" class="fas"></i>
                    {{ t.msg }}
                </div>
            </transition-group>
        </div>

        <!-- Header -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div class="space-y-1">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                        <i class="fas fa-user-plus text-lg"></i>
                    </div>
                    <h1 class="text-2xl font-black text-gray-900 tracking-tight uppercase">IK Bildirim Paneli</h1>
                </div>
                <p class="text-[13px] text-gray-400 font-medium ml-1">Personel giriş/çıkış süreçlerini IT ile koordine edin.</p>
            </div>

            <div class="flex items-center gap-3">
                <label class="px-5 h-11 bg-white border border-gray-200 rounded-xl flex items-center gap-2 text-[12px] font-black text-gray-600 cursor-pointer hover:bg-gray-50 transition-all shadow-sm">
                    <i class="fas fa-file-excel text-emerald-500"></i>
                    EXCEL'DEN AKTAR
                    <input type="file" @change="handleExcelImport" class="hidden" accept=".xlsx,.xls">
                </label>
                <button @click="resetForm(); formType = 'ENTRY'; isModalShow = true" class="px-6 h-11 bg-blue-600 text-white rounded-xl shadow-xl shadow-blue-500/30 hover:bg-blue-700 transition-all text-[12px] font-black uppercase tracking-wider flex items-center gap-2">
                    <i class="fas fa-plus"></i> YENİ GİRİŞ BİLDİR
                </button>
            </div>
        </div>

        <!-- Stats Grid -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-1 group hover:border-blue-200 transition-all">
                <span class="text-[11px] font-bold text-gray-400 uppercase tracking-widest">BEKLEYEN TALEPLER</span>
                <div class="flex items-end justify-between">
                    <h3 class="text-4xl font-black text-gray-800">{{ stats.pending }}</h3>
                    <div class="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-500"><i class="fas fa-clock"></i></div>
                </div>
            </div>
            <div class="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-1 group hover:border-emerald-200 transition-all">
                <span class="text-[11px] font-bold text-gray-400 uppercase tracking-widest">TAMAMLANANLAR</span>
                <div class="flex items-end justify-between">
                    <h3 class="text-4xl font-black text-gray-800">{{ stats.completed }}</h3>
                    <div class="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500"><i class="fas fa-check-double"></i></div>
                </div>
            </div>
            <div class="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-1 group hover:border-blue-200 transition-all">
                <span class="text-[11px] font-bold text-gray-400 uppercase tracking-widest">TOPLAM BİLDİRİM</span>
                <div class="flex items-end justify-between">
                    <h3 class="text-4xl font-black text-gray-800">{{ stats.total }}</h3>
                    <div class="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500"><i class="fas fa-history"></i></div>
                </div>
            </div>
        </div>

        <!-- Filters and List -->
        <div class="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden min-h-[500px] flex flex-col">
            <!-- Tabs -->
            <div class="px-8 pt-8 flex items-center justify-between flex-wrap gap-4">
                <div class="flex items-center gap-1 bg-gray-50 p-1.5 rounded-2xl">
                    <button @click="activeTab = 'all'" :class="activeTab === 'all' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'" class="px-6 py-2 rounded-xl text-[12px] font-black transition-all uppercase tracking-wide">Tüm Talepler</button>
                    <button @click="activeTab = 'entry'" :class="activeTab === 'entry' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'" class="px-6 py-2 rounded-xl text-[12px] font-black transition-all uppercase tracking-wide">Girişler</button>
                    <button @click="activeTab = 'exit'" :class="activeTab === 'exit' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'" class="px-6 py-2 rounded-xl text-[12px] font-black transition-all uppercase tracking-wide">Çıkışlar</button>
                </div>

                <div class="relative w-full md:w-80 group">
                    <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-blue-500 transition-colors"></i>
                    <input v-model="searchQuery" type="text" placeholder="İsim veya görev ara..." class="w-full h-12 bg-gray-50 border border-gray-100 pl-11 pr-4 rounded-2xl outline-none text-[13px] focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all">
                </div>
            </div>

            <!-- List Content -->
            <div class="flex-1 p-8">
                <div v-if="filteredRequests.length > 0" class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 gap-4">
                    <div v-for="r in filteredRequests" :key="r.id" 
                        class="bg-white rounded-[32px] border border-gray-100 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5 transition-all p-5 flex flex-col justify-between group">
                        
                        <div class="flex items-start justify-between mb-4">
                            <div class="flex items-center gap-4">
                                <div :class="r.type === 'ENTRY' ? 'bg-blue-50 text-blue-500' : 'bg-rose-50 text-rose-500'" 
                                    class="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-sm border border-current opacity-20 group-hover:opacity-100 transition-all duration-500">
                                    <i :class="r.type === 'ENTRY' ? 'fa-user-plus' : 'fa-user-minus'" class="fas"></i>
                                </div>
                                <div class="flex flex-col">
                                    <div class="flex items-center gap-2">
                                        <span class="text-[15px] font-black text-gray-800 tracking-tight">{{ r.full_name }}</span>
                                        <span :class="r.type === 'ENTRY' ? 'bg-blue-100 text-blue-600' : 'bg-rose-100 text-rose-600'" 
                                            class="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest">{{ r.type === 'ENTRY' ? 'GİRİŞ' : 'ÇIKIŞ' }}</span>
                                    </div>
                                    <span class="text-[12px] text-gray-400 font-medium">{{ r.position || 'Girdi Belirtilmemiş' }}</span>
                                </div>
                            </div>
                            
                            <!-- Status Badge -->
                            <div class="flex flex-col items-end gap-1">
                                <span v-if="r.status === 'PENDING'" class="text-[10px] bg-amber-50 text-amber-600 px-3 py-1.5 rounded-full font-black uppercase tracking-wider flex items-center gap-1.5 ring-1 ring-amber-100"><i class="fas fa-circle text-[6px]"></i> BEKLİYOR</span>
                                <span v-else class="text-[10px] bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-full font-black uppercase tracking-wider flex items-center gap-1.5 ring-1 ring-emerald-100"><i class="fas fa-check-circle"></i> TAMAMLANDI</span>
                                <span class="text-[10px] text-gray-300 font-bold uppercase tracking-tighter">{{ new Date(r.request_date).toLocaleDateString('tr-TR') }}</span>
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-4 py-4 border-y border-gray-50 mb-4">
                            <div class="flex flex-col gap-0.5">
                                <span class="text-[9px] font-bold text-gray-400 uppercase tracking-widest">ŞİRKET / LOKASYON</span>
                                <span class="text-[12px] font-bold text-gray-700">{{ r.company || '—' }} · {{ r.location || '—' }}</span>
                            </div>
                            <div class="flex flex-col gap-0.5">
                                <span class="text-[9px] font-bold text-gray-400 uppercase tracking-widest">DEPARTMAN</span>
                                <span class="text-[12px] font-bold text-gray-700">{{ r.department || '—' }}</span>
                            </div>
                        </div>

                        <!-- Notes/Equipment Mini View -->
                        <div v-if="r.notes || r.equipment_needed" class="mb-4 text-[11px] text-gray-500 italic bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                             "{{ r.notes || 'Not eklenmemiş.' }}"
                        </div>

                        <!-- Footer Actions (IT Control) -->
                        <div class="flex items-center justify-between mt-auto pt-2">
                             <div class="flex items-center gap-2">
                                <button v-if="r.status === 'PENDING'" @click="updateStatus(r.id, 'COMPLETED')" 
                                    class="h-9 px-4 rounded-xl bg-gray-900 text-white text-[11px] font-black uppercase tracking-wide hover:bg-blue-600 transition-all flex items-center gap-2">
                                    <i class="fas fa-check"></i> TESLİM EDİLDİ
                                </button>
                                <button v-else @click="updateStatus(r.id, 'PENDING')" 
                                    class="h-9 px-4 rounded-xl bg-gray-100 text-gray-500 text-[11px] font-black uppercase tracking-wide hover:bg-amber-100 hover:text-amber-600 transition-all flex items-center gap-2">
                                    <i class="fas fa-undo"></i> GERİ AL
                                </button>
                             </div>
                             <div class="flex items-center gap-1">
                                <button @click="deleteRequest(r.id)" class="w-9 h-9 flex items-center justify-center text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
                                    <i class="fas fa-trash-alt text-[13px]"></i>
                                </button>
                             </div>
                        </div>
                    </div>
                </div>

                <!-- Empty State -->
                <div v-else class="flex flex-col items-center justify-center py-20 text-center space-y-4">
                    <div class="w-20 h-20 rounded-[32px] bg-gray-50 flex items-center justify-center text-gray-200">
                        <i class="fas fa-inbox text-3xl"></i>
                    </div>
                    <div class="space-y-1">
                        <h3 class="text-[16px] font-black text-gray-800">Henüz bildirim bulunmamaktadır</h3>
                        <p class="text-[13px] text-gray-400 font-medium max-w-xs mx-auto">Yeni bir giriş veya çıkış bildirimi oluşturarak süreci başlatın.</p>
                    </div>
                    <button @click="isModalShow = true" class="px-6 h-11 border-2 border-gray-100 rounded-2xl text-[12px] font-black text-gray-400 hover:bg-gray-50 hover:text-blue-500 transition-all uppercase tracking-wide">İLK TALEBİ OLUŞTUR</button>
                </div>
            </div>
        </div>

        <!-- Add Modal -->
        <transition name="modal">
            <div v-if="isModalShow" class="fixed inset-0 z-[9998] flex items-center justify-center p-4">
                <div class="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" @click="isModalShow = false"></div>
                <div class="relative bg-white rounded-[40px] shadow-2xl w-full max-w-xl p-8 md:p-12 space-y-8 animate-scale-in max-h-[90vh] overflow-y-auto no-scrollbar">
                    
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-4">
                            <div class="w-14 h-14 rounded-3xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-sm border border-blue-100/50">
                                <i :class="formType === 'ENTRY' ? 'fa-user-plus' : 'fa-user-minus'" class="fas text-2xl"></i>
                            </div>
                            <div>
                                <h3 class="text-[20px] font-black text-gray-800 tracking-tight uppercase">YENİ {{ formType === 'ENTRY' ? 'GİRİŞ' : 'ÇIKIŞ' }} BİLDİRİMİ</h3>
                                <p class="text-[13px] text-gray-400 font-medium">Lütfen tüm alanları profesyonelce doldurun.</p>
                            </div>
                        </div>
                        <button @click="isModalShow = false" class="w-10 h-10 flex items-center justify-center text-gray-300 hover:text-gray-500 hover:bg-gray-100 rounded-2xl transition-all"><i class="fas fa-times text-lg"></i></button>
                    </div>

                    <!-- Type Selector in Modal -->
                    <div class="flex items-center gap-2 p-1.5 bg-gray-50 rounded-2xl w-fit">
                        <button @click="formType = 'ENTRY'" :class="formType === 'ENTRY' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'" class="px-6 py-2.5 rounded-xl text-[11px] font-black transition-all tracking-widest uppercase">GİRİŞ</button>
                        <button @click="formType = 'EXIT'" :class="formType === 'EXIT' ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-400'" class="px-6 py-2.5 rounded-xl text-[11px] font-black transition-all tracking-widest uppercase">ÇIKIŞ</button>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div class="space-y-2">
                            <label class="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">PERSONEL AD SOYAD</label>
                            <input v-model="form.full_name" type="text" placeholder="Ad Soyad..." class="w-full h-14 bg-gray-50 border border-gray-100 px-5 rounded-2xl outline-none text-[14px] focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all">
                        </div>
                        <div class="space-y-2">
                            <label class="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">ÜNVAN / GÖREV</label>
                            <input v-model="form.position" type="text" placeholder="Görev..." class="w-full h-14 bg-gray-50 border border-gray-100 px-5 rounded-2xl outline-none text-[14px] focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all">
                        </div>
                        <div class="space-y-2">
                            <label class="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">{{ formType === 'ENTRY' ? 'BAŞLANGIÇ TARİHİ' : 'ÇIKIŞ TARİHİ' }}</label>
                            <input v-model="form.request_date" type="date" class="w-full h-14 bg-gray-50 border border-gray-100 px-5 rounded-2xl outline-none text-[14px] focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all">
                        </div>
                        <div class="space-y-2">
                            <label class="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">ŞİRKET</label>
                            <select v-model="form.company" class="w-full h-14 bg-gray-50 border border-gray-100 px-5 rounded-2xl outline-none text-[14px] focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all">
                                <option value="">Şirket Seçin...</option>
                                <option v-for="c in companies" :key="c.id" :value="c.name">{{ c.name }}</option>
                            </select>
                        </div>
                        <div class="space-y-2">
                            <label class="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">DEPARTMAN</label>
                            <select v-model="form.department" class="w-full h-14 bg-gray-50 border border-gray-100 px-5 rounded-2xl outline-none text-[14px] focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all">
                                <option value="">Departman Seçin...</option>
                                <option v-for="d in departments" :key="d.id" :value="d.name">{{ d.name }}</option>
                            </select>
                        </div>
                        <div class="space-y-2">
                            <label class="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">LOKASYON</label>
                            <select v-model="form.location" class="w-full h-14 bg-gray-50 border border-gray-100 px-5 rounded-2xl outline-none text-[14px] focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all">
                                <option value="">Lokasyon Seçin...</option>
                                <option v-for="l in locations" :key="l.id" :value="l.name">{{ l.name }}</option>
                            </select>
                        </div>
                    </div>

                    <div class="space-y-2">
                        <label class="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">EK NOTLAR / ÖZEL TALEPLER</label>
                        <textarea v-model="form.notes" rows="3" placeholder="BT departmanına eklemek istediğiniz notlar..." class="w-full bg-gray-50 border border-gray-100 p-5 rounded-3xl outline-none text-[14px] focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all resize-none"></textarea>
                    </div>

                    <div class="flex gap-4 pt-4">
                        <button @click="isModalShow = false" class="flex-1 h-14 rounded-[20px] border-2 border-gray-100 text-[13px] font-black text-gray-400 hover:bg-gray-50 transition-all uppercase tracking-widest">İPTAL</button>
                        <button @click="submitForm" class="flex-[2] h-14 rounded-[20px] bg-blue-600 text-white text-[13px] font-black shadow-2xl shadow-blue-500/30 hover:bg-blue-700 hover:-translate-y-1 transition-all uppercase tracking-widest flex items-center justify-center gap-2">
                            <i class="fas fa-paper-plane"></i> BİLDİRİMİ GÖNDER
                        </button>
                    </div>
                </div>
            </div>
        </transition>

        <!-- Loading Overlay -->
        <div v-if="loading" class="fixed inset-0 z-[10000] bg-white/60 backdrop-blur-[2px] flex items-center justify-center">
            <div class="flex flex-col items-center gap-3">
                <div class="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                <span class="text-[13px] font-black text-blue-600 tracking-widest animate-pulse uppercase">İŞLENİYOR...</span>
            </div>
        </div>
    </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

.animate-fade-in { animation: fadeIn 0.4s ease-out; }
.animate-scale-in { animation: scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }

@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
@keyframes scaleIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }

/* Vue Transitions */
.toast-enter-active, .toast-leave-active { transition: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55); }
.toast-enter-from { opacity: 0; transform: translateX(50px) scale(0.9); }
.toast-leave-to { opacity: 0; transform: translateX(50px) scale(0.9); }

.modal-enter-active, .modal-leave-active { transition: opacity 0.3s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
