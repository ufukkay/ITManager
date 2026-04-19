<script setup>
import { ref, onMounted, computed } from 'vue'
import { useMasterDataStore } from '../../stores/masterData'
import api from '../../api'

const props = defineProps(['mode'])
const masterData = useMasterDataStore()

// State
const loading = ref(false)
const successMsg = ref('')

// Form - Add Org
const orgForm = ref({
    type: 'company', // 'company' or 'department'
    name: '',
    company_id: null,
    tax_number: '',
    notes: ''
})

// Form - Assign
const assignForm = ref({
    personnel_id: null,
    company_id: null,
    department_id: null
})

const fetchData = async () => {
    loading.value = true
    await Promise.all([
        masterData.fetchCompanies(),
        masterData.fetchDepartments(),
        masterData.fetchPersonnel()
    ])
    loading.value = false
}

const showSuccess = (msg) => {
    successMsg.value = msg
    setTimeout(() => successMsg.value = '', 3000)
}

const handleAddOrg = async () => {
    try {
        if (orgForm.value.type === 'company') {
            await api.post('/api/master-data/companies', { 
                name: orgForm.value.name,
                tax_number: orgForm.value.tax_number
            })
            showSuccess('Şirket başarıyla eklendi.')
        } else {
            if (!orgForm.value.company_id) return alert('Lütfen bağlı şirket seçiniz.')
            await api.post('/api/master-data/departments', { 
                name: orgForm.value.name,
                company_id: orgForm.value.company_id
            })
            showSuccess('Departman başarıyla eklendi.')
        }
        orgForm.value.name = ''
        await fetchData()
    } catch (e) {
        alert(e.response?.data?.message || 'Hata oluştu')
    }
}

const handleAssign = async () => {
    try {
        if (!assignForm.value.personnel_id) return alert('Lütfen personel seçiniz.')
        
        await api.put(`/api/master-data/personnel/${assignForm.value.personnel_id}`, {
            company_id: assignForm.value.company_id,
            department_id: assignForm.value.department_id
        })
        
        showSuccess('Personel ataması güncellendi.')
        await fetchData()
    } catch (e) {
        alert(e.response?.data?.message || 'Hata oluştu')
    }
}

onMounted(fetchData)
</script>

<template>
  <div class="h-full bg-white overflow-y-auto p-8">
    <div class="max-w-2xl">
        
        <!-- Mode: Add Org -->
        <div v-if="mode === 'add-org'" class="space-y-8 animate-in fade-in slide-in-from-bottom-2">
            <div>
                <h1 class="text-2xl font-bold text-gray-900 tracking-tight">Hızlı Şirket / Departman Ekle</h1>
                <p class="text-gray-500 mt-1">Sistem genelinde kullanılacak organizasyon birimlerini hızlıca tanımlayın.</p>
            </div>

            <div v-if="successMsg" class="bg-emerald-50 text-emerald-700 px-4 py-3 rounded-xl border border-emerald-100 flex items-center gap-3">
                <i class="fas fa-check-circle"></i>
                <span class="text-sm font-semibold">{{ successMsg }}</span>
            </div>

            <div class="bg-gray-50/50 rounded-2xl border border-gray-100 p-8 space-y-6">
                <div class="flex gap-1 p-1 bg-white border border-gray-200 rounded-xl w-fit">
                    <button @click="orgForm.type = 'company'" :class="orgForm.type === 'company' ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'text-gray-500 hover:bg-gray-50'" class="px-4 py-2 text-[12px] font-bold rounded-lg transition-all uppercase tracking-wider">Şirket</button>
                    <button @click="orgForm.type = 'department'" :class="orgForm.type === 'department' ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'text-gray-500 hover:bg-gray-50'" class="px-4 py-2 text-[12px] font-bold rounded-lg transition-all uppercase tracking-wider">Departman</button>
                </div>

                <div class="grid grid-cols-1 gap-5">
                    <div v-if="orgForm.type === 'department'" class="space-y-1.5 animate-in fade-in duration-300">
                        <label class="text-[12px] font-bold text-gray-500 ml-1">Üst Şirket</label>
                        <select v-model="orgForm.company_id" class="w-full h-11 px-4 bg-white border border-gray-200 rounded-xl text-[13px] focus:ring-4 focus:ring-blue-100 outline-none transition-all cursor-pointer">
                            <option :value="null">Seçiniz...</option>
                            <option v-for="c in masterData.companies" :key="c.id" :value="c.id">{{ c.name }}</option>
                        </select>
                    </div>

                    <div class="space-y-1.5">
                        <label class="text-[12px] font-bold text-gray-500 ml-1">{{ orgForm.type === 'company' ? 'Şirket Adı' : 'Departman Adı' }}</label>
                        <input v-model="orgForm.name" type="text" :placeholder="orgForm.type === 'company' ? 'Örn: Talay Lojistik A.Ş.' : 'Örn: Bilgi Teknolojileri'" class="w-full h-11 px-4 bg-white border border-gray-200 rounded-xl text-[13px] focus:ring-4 focus:ring-blue-100 outline-none transition-all">
                    </div>

                    <div v-if="orgForm.type === 'company'" class="space-y-1.5 animate-in fade-in duration-300">
                        <label class="text-[12px] font-bold text-gray-500 ml-1">Vergi Numarası</label>
                        <input v-model="orgForm.tax_number" type="text" class="w-full h-11 px-4 bg-white border border-gray-200 rounded-xl text-[13px] focus:ring-4 focus:ring-blue-100 outline-none transition-all">
                    </div>
                </div>

                <div class="pt-4 flex justify-end">
                    <button @click="handleAddOrg" class="bg-blue-600 text-white h-11 px-8 rounded-xl text-[14px] font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all flex items-center gap-2">
                        <i class="fas fa-save"></i>
                        Değişiklikleri Kaydet
                    </button>
                </div>
            </div>
        </div>

        <!-- Mode: Assign -->
        <div v-if="mode === 'assign'" class="space-y-8 animate-in fade-in slide-in-from-bottom-2">
            <div>
                <h1 class="text-2xl font-bold text-gray-900 tracking-tight">Personel Birim Atama</h1>
                <p class="text-gray-500 mt-1">Personelleri ilgili şirket ve departmanlara hızlıca eşleştirin.</p>
            </div>

            <div v-if="successMsg" class="bg-emerald-50 text-emerald-700 px-4 py-3 rounded-xl border border-emerald-100 flex items-center gap-3">
                <i class="fas fa-check-circle"></i>
                <span class="text-sm font-semibold">{{ successMsg }}</span>
            </div>

            <div class="bg-gray-50/50 rounded-2xl border border-gray-100 p-8 space-y-6">
                <div class="grid grid-cols-1 gap-5">
                    <div class="space-y-1.5">
                        <label class="text-[12px] font-bold text-gray-500 ml-1">Personel Seçin</label>
                        <select v-model="assignForm.personnel_id" class="w-full h-11 px-4 bg-white border border-gray-200 rounded-xl text-[13px] focus:ring-4 focus:ring-blue-100 outline-none transition-all cursor-pointer">
                            <option :value="null">Seçiniz...</option>
                            <option v-for="p in masterData.personnel" :key="p.id" :value="p.id">{{ p.first_name }} {{ p.last_name }}</option>
                        </select>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div class="space-y-1.5 text-left">
                            <label class="text-[12px] font-bold text-gray-500 ml-1">Şirket</label>
                            <select v-model="assignForm.company_id" class="w-full h-11 px-4 bg-white border border-gray-200 rounded-xl text-[13px] focus:ring-4 focus:ring-blue-100 outline-none transition-all cursor-pointer">
                                <option :value="null">Yok / Tanımsız</option>
                                <option v-for="c in masterData.companies" :key="c.id" :value="c.id">{{ c.name }}</option>
                            </select>
                        </div>
                        <div class="space-y-1.5 text-left">
                            <label class="text-[12px] font-bold text-gray-500 ml-1">Departman</label>
                            <select v-model="assignForm.department_id" class="w-full h-11 px-4 bg-white border border-gray-200 rounded-xl text-[13px] focus:ring-4 focus:ring-blue-100 outline-none transition-all cursor-pointer">
                                <option :value="null">Yok / Tanımsız</option>
                                <option v-for="d in masterData.departments" :key="d.id" :value="d.id">{{ d.name }}</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div class="pt-4 flex justify-end">
                    <button @click="handleAssign" class="bg-indigo-600 text-white h-11 px-8 rounded-xl text-[14px] font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all flex items-center gap-2">
                        <i class="fas fa-link"></i>
                        Eşleşmeyi Güncelle
                    </button>
                </div>
            </div>

            <!-- Helpful Info -->
            <div class="border-t border-gray-100 pt-8 mt-8">
                 <h4 class="text-[14px] font-bold text-gray-700 mb-4">Atama İpuçları</h4>
                 <ul class="space-y-3">
                     <li class="flex items-start gap-3 text-[13px] text-gray-500">
                         <div class="w-5 h-5 rounded bg-blue-50 text-blue-500 flex items-center justify-center shrink-0 mt-0.5"><i class="fas fa-info text-[10px]"></i></div>
                         Bir personeli atadığınızda, o personel tüm modüllerde (SIM, M365) yeni birimiyle görünür.
                     </li>
                     <li class="flex items-start gap-3 text-[13px] text-gray-500">
                         <div class="w-5 h-5 rounded bg-blue-50 text-blue-500 flex items-center justify-center shrink-0 mt-0.5"><i class="fas fa-info text-[10px]"></i></div>
                         Departman seçebilmek için personelin bağlı olduğu şirketi de seçmeniz önerilir.
                     </li>
                 </ul>
            </div>
        </div>
    </div>
  </div>
</template>

<style scoped>
</style>
