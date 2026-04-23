<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../../api'
import { useMasterDataStore } from '../../stores/masterData'
import { useToast } from '../../composables/useToast'
import { useConfirm } from '../../composables/useConfirm'

const masterData = useMasterDataStore()
const { showToast } = useToast()
const { ask, startLoading, stopLoading } = useConfirm()

const loading = ref(false)
const searchQuery = ref('')
const searchResults = ref([])
const selectedSim = ref(null)
const transferTargetType = ref('stock') // 'vehicle', 'personnel', 'location', 'stock'
const transferTargetId = ref('')

const fetchData = async () => {
    loading.value = true
    try {
        await Promise.all([
            masterData.fetchCompanies(),
            masterData.fetchDepartments(),
            masterData.fetchPersonnel(),
            masterData.fetchVehicles(),
            masterData.fetchLocations()
        ])
    } finally {
        loading.value = false
    }
}

const searchSims = async () => {
    if (searchQuery.value.length < 3) {
        searchResults.value = []
        return
    }
    try {
        const res = await api.get(`/sim-takip/api/sim/search?q=${searchQuery.value}`)
        searchResults.value = res.data
    } catch (err) {
        console.error('Arama hatası:', err)
    }
}

const selectSimForTransfer = (sim) => {
    selectedSim.value = sim
    searchResults.value = []
    searchQuery.value = sim.phone_no || sim.iccid
    
    // Set initial target based on type
    if (sim.type === 'm2m') transferTargetType.value = 'vehicle'
    else if (sim.type === 'voice') transferTargetType.value = 'personnel'
    else if (sim.type === 'data') transferTargetType.value = 'location'
}

const performTransfer = async () => {
    if (!selectedSim.value) return
    
    const confirmed = await ask({
        title: 'Aktarımı Onayla',
        message: `${selectedSim.value.phone_no} numaralı hattı yeni hedefe aktarmak istediğinize emin misiniz?`,
        confirmLabel: 'Aktarımı Başlat'
    })

    if (!confirmed) return

    startLoading()
    try {
        const simId = selectedSim.value.id
        const currentType = selectedSim.value.type
        let targetType = currentType
        
        let targetData = {}
        
        if (transferTargetType.value === 'stock') {
            targetData = {
                vehicle_id: null,
                personnel_id: null,
                location_id: null,
                department_id: null,
                company_id: null,
                status: 'Pasif'
            }
        } else if (transferTargetType.value === 'vehicle') {
            targetType = 'm2m'
            targetData = { vehicle_id: transferTargetId.value, status: 'Aktif' }
        } else if (transferTargetType.value === 'personnel') {
            targetType = 'voice'
            targetData = { personnel_id: transferTargetId.value, status: 'Aktif' }
        } else if (transferTargetType.value === 'location') {
            targetType = 'data'
            targetData = { location_id: transferTargetId.value, status: 'Aktif' }
        }

        const res = await api.post('/sim-takip/api/sim/transfer', {
            id: simId,
            currentType: currentType,
            targetType: targetType,
            targetData: targetData
        })
        
        showToast(res.data.message || 'Aktarım işlemi başarıyla tamamlandı.', 'success')
        selectedSim.value = null
        searchQuery.value = ''
        transferTargetId.value = ''
    } catch (err) {
        showToast(err.response?.data?.message || 'Aktarım hatası', 'error')
    } finally {
        stopLoading()
    }
}

onMounted(fetchData)
</script>

<template>
    <div class="h-full flex flex-col bg-white">
        <!-- Header -->
        <div class="px-8 py-6 border-b border-gray-100 flex items-center justify-between shrink-0 bg-gray-50/30">
            <div>
                <h1 class="text-[18px] font-black text-gray-900 tracking-tight leading-none mb-1.5">Hat Aktarım Merkezi</h1>
                <p class="text-[12px] text-gray-400 font-medium">SIM kartları araç, personel veya lokasyonlar arasında taşıyın</p>
            </div>
            
            <div class="flex items-center gap-3 text-[11px] font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-xl border border-blue-100">
                <i class="fas fa-info-circle"></i>
                Aktarım işlemi tarihçeye otomatik kaydedilir.
            </div>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto p-8 flex justify-center">
            <div class="w-full max-w-3xl space-y-8">
                
                <!-- 1. Hat Arama -->
                <div class="space-y-3">
                    <label class="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">1. ADIM: HATTI BULUN</label>
                    <div class="relative group">
                        <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors"></i>
                        <input v-model="searchQuery" @input="searchSims" type="text"
                            placeholder="Telefon numarası veya ICCID giriniz..."
                            class="w-full h-14 bg-white border border-gray-200 pl-12 pr-4 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none text-[15px] font-medium transition-all shadow-sm">
                        
                        <!-- Dropdown -->
                        <div v-if="searchResults.length > 0" class="absolute z-50 left-0 right-0 mt-2 bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden divide-y divide-gray-50">
                            <button v-for="res in searchResults" :key="res.id + res.type" 
                                @click="selectSimForTransfer(res)"
                                class="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left group">
                                <div class="flex items-center gap-4">
                                    <div class="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-[12px] uppercase transition-colors"
                                        :class="res.type === 'm2m' ? 'bg-orange-50 text-orange-600' : res.type === 'voice' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'">
                                        {{ res.type }}
                                    </div>
                                    <div class="flex flex-col">
                                        <span class="text-[14px] font-bold text-gray-800">{{ res.phone_no }}</span>
                                        <span class="text-[11px] text-gray-400 font-medium">{{ res.iccid || 'ICCID Yok' }}</span>
                                    </div>
                                </div>
                                <div class="flex items-center gap-4">
                                    <div class="text-right flex flex-col">
                                        <span class="text-[12px] font-bold text-gray-700">{{ res.owner_name || 'STOKTA' }}</span>
                                        <span class="text-[10px] text-gray-400 font-bold uppercase tracking-tight">{{ res.company_name || 'BOŞ' }}</span>
                                    </div>
                                    <i class="fas fa-chevron-right text-gray-300 group-hover:text-blue-500 transition-colors"></i>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- 2. Hedef Seçimi -->
                <Transition name="fade">
                    <div v-if="selectedSim" class="space-y-6 pt-4">
                        <div class="p-5 bg-blue-600 rounded-2xl text-white shadow-xl shadow-blue-100 flex items-center justify-between">
                            <div class="flex items-center gap-4">
                                <div class="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                                    <i class="fas fa-sim-card text-xl"></i>
                                </div>
                                <div>
                                    <p class="text-[11px] font-bold text-white/70 uppercase tracking-widest leading-none mb-1">Seçili Hat</p>
                                    <h3 class="text-[18px] font-black leading-none">{{ selectedSim.phone_no }}</h3>
                                </div>
                            </div>
                            <button @click="selectedSim = null; searchQuery = ''" class="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div class="space-y-4">
                                <label class="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">2. ADIM: HEDEF TİPİ</label>
                                <div class="grid grid-cols-1 gap-2">
                                    <button v-for="t in [
                                        {id:'vehicle', n:'Araç', i:'fa-truck', desc:'M2M Hattı olarak işaretlenir'},
                                        {id:'personnel', n:'Personel', i:'fa-user-tie', desc:'Ses Hattı olarak işaretlenir'},
                                        {id:'location', n:'Lokasyon', i:'fa-map-marker-alt', desc:'Data Hattı olarak işaretlenir'},
                                        {id:'stock', n:'Stok (Boşa Al)', i:'fa-archive', desc:'Hat kullanımdan çekilir'}
                                    ]" :key="t.id"
                                        @click="transferTargetType = t.id; transferTargetId = ''"
                                        class="flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left"
                                        :class="transferTargetType === t.id ? 'border-blue-600 bg-blue-50/50' : 'border-gray-100 hover:border-gray-200 bg-white'">
                                        <div class="w-10 h-10 rounded-xl flex items-center justify-center"
                                            :class="transferTargetType === t.id ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-400'">
                                            <i class="fas" :class="t.i"></i>
                                        </div>
                                        <div>
                                            <div class="text-[14px] font-bold" :class="transferTargetType === t.id ? 'text-blue-900' : 'text-gray-700'">{{ t.n }}</div>
                                            <div class="text-[11px] font-medium text-gray-400">{{ t.desc }}</div>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            <div class="space-y-4">
                                <label class="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">3. ADIM: HEDEF SEÇİN</label>
                                
                                <div v-if="transferTargetType === 'stock'" class="p-8 border-2 border-dashed border-gray-100 rounded-3xl flex flex-col items-center justify-center text-center">
                                    <div class="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-4">
                                        <i class="fas fa-box-open text-2xl"></i>
                                    </div>
                                    <p class="text-[13px] font-bold text-gray-500">Hedef Seçimi Gerekli Değil</p>
                                    <p class="text-[11px] text-gray-400 mt-1">Hat doğrudan boş havuza aktarılacaktır.</p>
                                </div>

                                <div v-else class="space-y-2">
                                    <select v-if="transferTargetType === 'vehicle'" v-model="transferTargetId"
                                        class="w-full h-14 px-5 bg-white border-2 border-gray-100 rounded-2xl outline-none focus:border-blue-600 text-[14px] font-bold text-gray-700 transition-all appearance-none">
                                        <option value="">Araç Seçiniz...</option>
                                        <option v-for="v in masterData.vehicles" :key="v.id" :value="v.id">{{ v.plate_no }} ({{ v.vehicle_type }})</option>
                                    </select>

                                    <select v-if="transferTargetType === 'personnel'" v-model="transferTargetId"
                                        class="w-full h-14 px-5 bg-white border-2 border-gray-100 rounded-2xl outline-none focus:border-blue-600 text-[14px] font-bold text-gray-700 transition-all appearance-none">
                                        <option value="">Personel Seçiniz...</option>
                                        <option v-for="p in masterData.personnel" :key="p.id" :value="p.id">{{ p.first_name }} {{ p.last_name }} ({{ p.company_name }})</option>
                                    </select>

                                    <select v-if="transferTargetType === 'location'" v-model="transferTargetId"
                                        class="w-full h-14 px-5 bg-white border-2 border-gray-100 rounded-2xl outline-none focus:border-blue-600 text-[14px] font-bold text-gray-700 transition-all appearance-none">
                                        <option value="">Lokasyon Seçiniz...</option>
                                        <option v-for="l in masterData.locations" :key="l.id" :value="l.id">{{ l.name }}</option>
                                    </select>

                                    <div class="p-4 bg-gray-50 rounded-xl flex items-start gap-3 mt-4">
                                        <i class="fas fa-shield-alt text-blue-400 mt-0.5"></i>
                                        <p class="text-[11px] text-gray-500 font-medium leading-relaxed">
                                            Aktarım yapıldığında hattın tipi otomatik olarak hedefe göre (M2M/Ses/Data) güncellenecektir. Eski atama kayıtları silinir.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="pt-8 border-t border-gray-100 flex justify-center">
                            <button @click="performTransfer" :disabled="transferTargetType !== 'stock' && !transferTargetId"
                                class="h-16 px-12 bg-gray-900 text-white rounded-2xl text-[16px] font-black hover:bg-black disabled:opacity-30 disabled:grayscale transition-all shadow-2xl shadow-gray-200 flex items-center gap-3 active:scale-95">
                                <i class="fas fa-exchange-alt"></i> AKTARIMI TAMAMLA
                            </button>
                        </div>
                    </div>
                </Transition>

            </div>
        </div>
    </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: all 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(10px); }

select {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 1.25rem center;
    background-size: 1.25rem;
}
</style>
