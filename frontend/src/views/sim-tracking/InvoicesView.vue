<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import api from '../../api'

// -- State --
const summaries = ref([])
const invoices = ref([])
const loading = ref(false)
const uploading = ref(false)

// Global Filters
const selectedPeriod = ref('')
const selectedOperator = ref('')
const selectedSourceFile = ref('')
const searchQuery = ref('')
const statusFilter = ref('') // 'matched', 'unmatched', ''

// Selection
const selectedIds = ref([])

// Pagination
const pageSize = ref(100)
const currentPage = ref(1)
const pageSizeOptions = [
    { label: '50 Kayıt', value: 50 },
    { label: '100 Kayıt', value: 100 },
    { label: '500 Kayıt', value: 500 },
    { label: 'Hepsi', value: 0 }
]

// Modal / Upload
const isUploadModalOpen = ref(false)
const uploadPeriod = ref(new Date().toISOString().slice(0, 7)) // YYYY-MM
const uploadOperator = ref('Turkcell')
const selectedFiles = ref([])
const fileInput = ref(null)

// History Modal
const isHistoryModalOpen = ref(false)
const historyData = ref(null)
const historyLoading = ref(false)

// Column Sort & Filter
const sortBy = ref('')
const sortOrder = ref('asc')
const activeFilterMenu = ref(null)
const columnFilters = ref({
    personnel_name: [],
    company_name: [],
    cost_center: [],
    phone_no: [],
    tariff: [],
    status: []
})

// -- Methods --

const fetchSummaries = async () => {
    try {
        const res = await api.get('/sim-takip/api/invoices/summary')
        summaries.value = res.data
        if (!selectedPeriod.value && summaries.value.length > 0) {
            selectedPeriod.value = summaries.value[0].period
        }
    } catch (err) {
        console.error('Özetler yüklenemedi:', err)
    }
}

const fetchInvoices = async () => {
    loading.value = true
    try {
        const params = {
            period: selectedPeriod.value,
            operator: selectedOperator.value,
            source_file: selectedSourceFile.value,
            search: searchQuery.value,
            is_matched: statusFilter.value === 'matched' ? '1' : (statusFilter.value === 'unmatched' ? '0' : '')
        }
        const res = await api.get('/sim-takip/api/invoices/list', { params })
        invoices.value = res.data
    } catch (err) {
        console.error('Faturalar yüklenemedi:', err)
    } finally {
        loading.value = false
    }
}

const toggleSort = (column) => {
    if (sortBy.value === column) {
        sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
    } else {
        sortBy.value = column
        sortOrder.value = 'asc'
    }
}

const toggleFilterMenu = (column, event) => {
    if (activeFilterMenu.value === column) {
        activeFilterMenu.value = null
    } else {
        activeFilterMenu.value = column
    }
}

const toggleFilterValue = (column, value) => {
    const filters = columnFilters.value[column] || []
    const index = filters.indexOf(value)
    if (index > -1) filters.splice(index, 1)
    else filters.push(value)
    columnFilters.value[column] = [...filters]
}

const clearColumnFilter = (column) => {
    columnFilters.value[column] = []
}

const getFilteredUniqueValues = (column) => {
    // We look at 'invoices' but filtered by other column filters?
    // Usually it's better to show all unique values currently in the dataList
    const values = invoices.value.map(item => {
        if (column === 'status') return item.is_matched ? 'Eşleşti' : 'Açık'
        return item[column] || '(Boş)'
    })
    return [...new Set(values)].sort()
}

const uploadInvoices = async () => {
    if (selectedFiles.value.length === 0) return
    uploading.value = true
    const formData = new FormData()
    formData.append('period', uploadPeriod.value)
    formData.append('operator', uploadOperator.value)
    selectedFiles.value.forEach(file => {
        formData.append('file', file)
    })
    try {
        await api.post('/sim-takip/api/invoices/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        })
        isUploadModalOpen.value = false
        selectedFiles.value = []
        fetchSummaries()
        fetchInvoices()
    } catch (err) {
        alert('Yükleme hatası: ' + (err.response?.data?.message || err.message))
    } finally {
        uploading.value = false
    }
}

const exportInvoices = async () => {
    try {
        const params = {
            period: selectedPeriod.value,
            operator: selectedOperator.value,
            source_file: selectedSourceFile.value
        }
        const res = await api.get('/sim-takip/api/invoices/export', { 
            params, 
            responseType: 'blob' 
        })
        const url = window.URL.createObjectURL(new Blob([res.data]))
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `faturalar-${selectedPeriod.value || 'tum'}.xlsx`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    } catch (err) {
        console.error('Dışa aktarma hatası:', err)
    }
}

const deleteSelectedInvoices = async () => {
    if (selectedIds.value.length === 0) return
    if (!confirm(`${selectedIds.value.length} kaydı silmek istediğinize emin misiniz?`)) return
    try {
        await api.post('/sim-takip/api/invoices/bulk-delete', { ids: selectedIds.value })
        selectedIds.value = []
        fetchInvoices()
        fetchSummaries()
    } catch (err) {
        alert('Silme hatası: ' + (err.response?.data?.message || err.message))
    }
}

const showHistory = async (phoneNo) => {
    historyLoading.value = true
    isHistoryModalOpen.value = true
    try {
        const res = await api.get(`/sim-takip/api/invoices/history/${phoneNo}`)
        historyData.value = res.data
    } catch (err) {
        console.error('Geçmiş yüklenemedi:', err)
    } finally {
        historyLoading.value = false
    }
}

// -- Computed --

const periods = computed(() => {
    const pSet = new Set(summaries.value.map(s => s.period))
    return [...pSet].sort((a,b) => b.localeCompare(a))
})

const filesForSelectedPeriod = computed(() => {
    if (!selectedPeriod.value) return []
    return summaries.value.filter(s => s.period === selectedPeriod.value)
})

const filteredList = computed(() => {
    let list = invoices.value

    // Apply Column Filters
    Object.keys(columnFilters.value).forEach(col => {
        const filters = columnFilters.value[col]
        if (filters && filters.length > 0) {
            list = list.filter(item => {
                let val = ''
                if (col === 'status') val = item.is_matched ? 'Eşleşti' : 'Açık'
                else val = item[col] || '(Boş)'
                return filters.includes(val)
            })
        }
    })

    // Apply Sorting
    if (sortBy.value) {
        list = [...list].sort((a, b) => {
            const aVal = a[sortBy.value] || ''
            const bVal = b[sortBy.value] || ''
            if (aVal < bVal) return sortOrder.value === 'asc' ? -1 : 1
            if (aVal > bVal) return sortOrder.value === 'asc' ? 1 : -1
            return 0
        })
    }

    return list
})

const stats = computed(() => {
    const list = filteredList.value
    return {
        totalPayable: list.reduce((a, b) => a + (b.total_amount || 0), 0),
        ticketCount: list.length,
        unmatchedCount: list.filter(i => !i.is_matched).length
    }
})

const displayList = computed(() => {
    if (pageSize.value === 0) return filteredList.value
    const start = (currentPage.value - 1) * pageSize.value
    return filteredList.value.slice(start, start + pageSize.value)
})

const totalPages = computed(() => {
    if (pageSize.value === 0) return 1
    return Math.ceil(filteredList.value.length / (pageSize.value || 1))
})

const pageNumbers = computed(() => {
    const current = currentPage.value
    const total = totalPages.value
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
    
    if (current <= 4) return [1, 2, 3, 4, 5, '...', total]
    if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total]
    
    return [1, '...', current - 1, current, current + 1, '...', total]
})

// -- Watchers --
watch(selectedPeriod, () => {
    selectedSourceFile.value = '' 
})

watch([selectedPeriod, selectedOperator, selectedSourceFile, statusFilter], () => {
    currentPage.value = 1
    fetchInvoices()
})

let searchTimeout = null
watch(searchQuery, () => {
    if (searchTimeout) clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
        currentPage.value = 1
        fetchInvoices()
    }, 500)
})

onMounted(() => {
    fetchSummaries()
    fetchInvoices()
})
</script>

<template>
  <div class="h-full flex flex-col text-[#3c4043] bg-[#f1f3f4] overflow-hidden font-sans">
    
    <!-- Google Inspired Top Header -->
    <div class="bg-white px-6 py-3 border-b border-[#dadce0] flex items-center justify-between shrink-0 shadow-sm z-50">
        <div class="flex items-center gap-6">
            <h1 class="text-[20px] font-normal text-gray-700 tracking-tight">Fatura Yönetimi</h1>
            <div class="h-6 w-px bg-gray-200"></div>
            <div class="flex items-center gap-6">
                <div class="flex flex-col">
                    <span class="text-[10px] text-gray-400 font-bold uppercase tracking-widest">TOPLAM ÖDENECEK</span>
                    <span class="text-[15px] font-bold text-gray-900">{{ stats.totalPayable.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }} ₺</span>
                </div>
                <div class="flex flex-col">
                    <span class="text-[10px] text-gray-400 font-bold uppercase tracking-widest">KAYIT SAYISI</span>
                    <span class="text-[15px] font-bold text-gray-700">{{ stats.ticketCount }}</span>
                </div>
                <div v-if="stats.unmatchedCount > 0" class="flex flex-col">
                    <span class="text-[10px] text-red-400 font-bold uppercase tracking-widest">EŞLEŞMEYEN</span>
                    <span class="text-[15px] font-bold text-red-600">{{ stats.unmatchedCount }}</span>
                </div>
            </div>
        </div>
        <div class="flex gap-2">
            <button @click="exportInvoices" class="h-9 px-4 bg-white border border-[#dadce0] text-[#3c4043] rounded hover:bg-gray-50 flex items-center gap-2 text-[13px] font-medium transition-colors">
                <i class="fas fa-download text-gray-400"></i> Dışa Aktar
            </button>
            <button @click="isUploadModalOpen = true" class="h-9 px-4 bg-[#1a73e8] text-white rounded hover:bg-[#1b66c9] flex items-center gap-2 text-[13px] font-bold transition-colors shadow-sm">
                <i class="fas fa-plus"></i> DOSYA YÜKLE
            </button>
        </div>
    </div>

    <!-- Filter Toolbar -->
    <div class="px-6 py-3 bg-white border-b border-[#dadce0] flex items-center gap-2 shrink-0">
        
        <div class="flex items-center gap-2 flex-1">
             <!-- Selection Summary -->
            <div v-if="selectedIds.length > 0" class="flex items-center gap-4 bg-blue-50 px-3 py-1.5 rounded text-[13px] border border-blue-100 mr-2">
                <span class="font-bold text-[#1a73e8]">{{ selectedIds.length }} Seçili</span>
                <button @click="deleteSelectedInvoices" class="text-red-600 font-bold hover:text-red-800"><i class="fas fa-trash-alt"></i> Sil</button>
                <button @click="selectedIds = []" class="text-gray-500 hover:text-gray-800">Seçimi Kaldır</button>
            </div>

            <!-- Global Selects -->
            <select v-model="selectedPeriod" class="h-9 min-w-[140px] px-3 bg-white border border-[#dadce0] rounded text-[13px] outline-none focus:border-[#1a73e8] cursor-pointer">
                <option value="">Tüm Dönemler</option>
                <option v-for="p in periods" :key="p" :value="p">{{ p }}</option>
            </select>

            <select v-model="selectedSourceFile" class="h-9 flex-1 max-w-[400px] px-3 bg-white border border-[#dadce0] rounded text-[13px] outline-none focus:border-[#1a73e8] cursor-pointer">
                <option value="">Tüm Belgeler / Dosyalar</option>
                <option v-for="s in filesForSelectedPeriod" :key="s.source_file" :value="s.source_file">{{ s.source_file }}</option>
            </select>

            <div class="relative w-[300px]">
                <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[12px]"></i>
                <input v-model="searchQuery" type="text" placeholder="Hızlı ara..." class="w-full h-9 pl-9 pr-4 bg-[#f1f3f4] border-transparent rounded text-[13px] focus:bg-white focus:border-[#1a73e8] outline-none transition-all">
            </div>
            
            <button @click="fetchInvoices" class="w-9 h-9 flex items-center justify-center text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Veriyi Yenile">
                <i class="fas fa-sync-alt text-[12px]"></i>
            </button>
        </div>

        <div class="flex items-center gap-2 border-l border-gray-200 pl-4">
             <span class="text-[11px] font-bold text-gray-400 uppercase">Limit:</span>
            <select v-model="pageSize" class="h-9 px-2 bg-white border border-[#dadce0] rounded text-[12px] outline-none">
                <option v-for="opt in pageSizeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
        </div>
    </div>

    <!-- Table Section -->
    <div class="flex-1 overflow-hidden m-4 bg-white border border-[#dadce0] rounded shadow-sm flex flex-col">
        <div class="overflow-x-auto flex-1">
            <table class="w-full text-left border-collapse table-fixed min-w-[1200px]">
                <thead>
                    <tr class="bg-[#f8f9fa] border-b border-[#dadce0] text-[#5f6368] text-[11px] font-bold uppercase tracking-wider">
                        <th class="w-[48px] py-2 px-4 text-center border-r border-[#dadce0]">
                            <input type="checkbox" @change="e => selectedIds = e.target.checked ? displayList.map(i => i.id) : []" class="accent-[#1a73e8]">
                        </th>
                        
                        <th v-for="col in [
                            { key: 'personnel_name', label: 'Personel / Paydaş', width: '220px' },
                            { key: 'company_name', label: 'Şirket', width: '160px' },
                            { key: 'cost_center', label: 'Masraf Merkezi', width: '160px' },
                            { key: 'phone_no', label: 'Telefon No', width: '130px', align: 'center' },
                            { key: 'tariff', label: 'Hizmet / Tarife', width: '250px' },
                            { key: 'total_amount', label: 'Tutar', width: '120px', align: 'right' },
                            { key: 'status', label: 'Durum', width: '100px', align: 'center' }
                        ]" :key="col.key" 
                           class="py-2 px-4 group relative border-r border-[#dadce0] overflow-visible" 
                           :style="{ width: col.width }">
                            <div class="flex items-center justify-between">
                                <div @click="toggleSort(col.key)" class="flex items-center gap-1.5 cursor-pointer hover:text-blue-600 transition-colors flex-1 truncate">
                                    {{ col.label }}
                                    <i v-if="sortBy === col.key" class="fas text-[10px] text-blue-600" :class="sortOrder === 'asc' ? 'fa-sort-up' : 'fa-sort-down'"></i>
                                    <i v-else class="fas fa-sort text-[9px] text-gray-300 opacity-0 group-hover:opacity-100"></i>
                                </div>
                                <div @click.stop="toggleFilterMenu(col.key, $event)" class="cursor-pointer px-1.5 py-1 hover:text-blue-600 rounded transition-all" 
                                     :class="(columnFilters[col.key] || []).length > 0 ? 'text-blue-600' : 'text-gray-400 opacity-0 group-hover:opacity-100'">
                                    <i class="fas fa-filter text-[10px]"></i>
                                </div>
                            </div>
                            
                            <!-- Dropdown Portal Style -->
                            <div v-if="activeFilterMenu === col.key" class="absolute top-full left-0 mt-1 min-w-[200px] bg-white border border-[#dadce0] rounded shadow-2xl z-[100] py-2 px-1 animate-in fade-in zoom-in duration-75">
                                <div class="max-h-60 overflow-y-auto px-1 space-y-0.5">
                                    <label v-for="val in getFilteredUniqueValues(col.key)" :key="val" 
                                           class="flex items-center gap-2 px-2 py-1.5 hover:bg-[#f1f3f4] rounded cursor-pointer select-none transition-colors group/item">
                                        <input type="checkbox" :checked="(columnFilters[col.key] || []).includes(val)" @change="toggleFilterValue(col.key, val)" class="w-3.5 h-3.5 accent-[#1a73e8]">
                                        <span class="text-[12px] truncate flex-1 text-[#3c4043]">{{ val }}</span>
                                    </label>
                                </div>
                                <div class="mt-2 pt-2 border-t border-gray-100 flex justify-between px-3">
                                    <button @click="clearColumnFilter(col.key)" class="text-[11px] text-[#1a73e8] font-bold hover:underline">TEMİZLE</button>
                                    <button @click="activeFilterMenu = null" class="text-[11px] text-gray-500 font-bold hover:text-black">TAMAM</button>
                                </div>
                            </div>
                        </th>
                        
                        <th class="w-[80px] py-2 px-4 text-center">İşlem</th>
                    </tr>
                </thead>
                <tbody class="text-[13px] text-[#3c4043]">
                    <tr v-for="item in displayList" :key="item.id" 
                        class="border-b border-[#dadce0] transition-none group even:bg-[#fbfbfb]"
                        :class="selectedIds.includes(item.id) ? 'bg-[#e8f0fe]' : 'hover:bg-[#f1f3f4]'">
                        <td class="py-2.5 px-4 text-center border-r border-[#dadce0]">
                            <input type="checkbox" v-model="selectedIds" :value="item.id" class="accent-[#1a73e8]">
                        </td>
                        <td class="py-2.5 px-4 font-bold border-r border-[#dadce0] truncate" :title="item.personnel_name">{{ item.personnel_name || '-' }}</td>
                        <td class="py-2.5 px-4 border-r border-[#dadce0] truncate text-gray-500 underline-offset-4 decoration-gray-200" :title="item.company_name">{{ item.company_name || '-' }}</td>
                        <td class="py-2.5 px-4 border-r border-[#dadce0] truncate text-gray-500" :title="item.cost_center">{{ item.cost_center || '-' }}</td>
                        <td class="py-2.5 px-4 text-center font-mono text-[12px] border-r border-[#dadce0]">{{ item.phone_no }}</td>
                        <td class="py-2.5 px-4 border-r border-[#dadce0] truncate text-gray-500 text-[12px]" :title="item.tariff">{{ item.tariff || '-' }}</td>
                        <td class="py-2.5 px-4 text-right border-r border-[#dadce0] font-bold text-gray-900">{{ item.total_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }} ₺</td>
                        <td class="py-2.5 px-4 text-center border-r border-[#dadce0]">
                            <span v-if="item.is_matched" class="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-[#e6f4ea] text-[#1e8e3e]">EŞLEŞTİ</span>
                            <span v-else class="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-[#fce8e6] text-[#d93025]">AÇIK</span>
                        </td>
                        <td class="py-2.5 px-4 text-center">
                            <button @click="showHistory(item.phone_no)" class="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded-full transition-all">
                                <i class="fas fa-history text-xs"></i>
                            </button>
                        </td>
                    </tr>
                    <tr v-if="loading" v-for="n in 10">
                        <td colspan="9" class="p-6"><div class="h-4 bg-gray-100 animate-pulse rounded"></div></td>
                    </tr>
                    <tr v-if="!loading && displayList.length === 0">
                        <td colspan="9" class="p-20 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">Sonuç bulunamadı</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Google Style Pagination -->
        <div class="px-6 py-2 border-t border-[#dadce0] bg-[#f8f9fa] flex items-center justify-between shrink-0">
            <div class="text-[12px] text-gray-500">
                Toplam <span class="font-bold text-gray-700">{{ filteredList.length }}</span> kayıt arasından gösteriliyor
            </div>
            
            <div class="flex items-center gap-1">
                <button @click="currentPage--" :disabled="currentPage === 1" class="h-8 px-2 flex items-center gap-1 text-[11px] font-bold text-gray-600 hover:bg-white rounded disabled:opacity-30 border border-transparent hover:border-gray-200">
                    <i class="fas fa-chevron-left"></i> ÖNCEKİ
                </button>
                
                <div class="flex items-center gap-0.5">
                    <button v-for="p in pageNumbers" :key="p" @click="typeof p === 'number' && (currentPage = p)"
                            class="w-8 h-8 flex items-center justify-center text-[11px] font-bold rounded border"
                            :class="currentPage === p ? 'bg-[#1a73e8] text-white border-[#1a73e8]' : (typeof p === 'number' ? 'bg-white text-gray-600 border-gray-200 hover:border-gray-400' : 'border-transparent text-gray-400 cursor-default')">
                        {{ p }}
                    </button>
                </div>

                <button @click="currentPage++" :disabled="currentPage === totalPages" class="h-8 px-2 flex items-center gap-1 text-[11px] font-bold text-gray-600 hover:bg-white rounded disabled:opacity-30 border border-transparent hover:border-gray-200">
                    SONRAKİ <i class="fas fa-chevron-right"></i>
                </button>
            </div>
        </div>
    </div>

    <!-- Modals (Simple Layouts) -->
    <dialog class="modal" :class="{ 'modal-open': isUploadModalOpen }">
        <div class="modal-box bg-white max-w-lg p-0 rounded shadow-2xl overflow-hidden">
            <div class="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                <h3 class="text-[16px] font-bold text-gray-700">Fatura Dosyası Yükle</h3>
                <button @click="isUploadModalOpen = false" class="text-gray-400 hover:text-black"><i class="fas fa-times"></i></button>
            </div>
            <div class="p-6 space-y-4">
                <div class="grid grid-cols-2 gap-4">
                    <div class="space-y-1">
                        <label class="text-[11px] font-bold text-gray-500 uppercase">Dönem</label>
                        <input v-model="uploadPeriod" type="month" class="w-full h-10 px-3 border border-gray-300 rounded outline-none focus:border-[#1a73e8]">
                    </div>
                    <div class="space-y-1">
                        <label class="text-[11px] font-bold text-gray-500 uppercase">Operatör</label>
                        <select v-model="uploadOperator" class="w-full h-10 px-3 border border-gray-300 rounded outline-none focus:border-[#1a73e8] bg-white text-[13px] font-bold">
                            <option value="Turkcell">Turkcell</option>
                            <option value="Vodafone">Vodafone</option>
                            <option value="Türk Telekom">Türk Telekom</option>
                        </select>
                    </div>
                </div>
                <div @click="fileInput.click()" class="border-2 border-dashed border-gray-200 rounded p-10 flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50/30 transition-all">
                    <input type="file" ref="fileInput" multiple @change="handleFileUpload" class="hidden" accept=".pdf,.xml">
                    <i class="fas fa-cloud-upload-alt text-3xl text-gray-300 mb-2"></i>
                    <span class="text-[13px] font-bold text-gray-600">PDF veya XML dosyalarını seçin</span>
                    <div v-if="selectedFiles.length > 0" class="mt-4 text-[12px] font-bold text-[#1a73e8] bg-blue-50 px-3 py-1 rounded">{{ selectedFiles.length }} dosya seçildi</div>
                </div>
            </div>
            <div class="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
                <button @click="isUploadModalOpen = false" class="px-4 py-2 text-[13px] font-bold text-gray-500 hover:text-black uppercase">İptal</button>
                <button @click="uploadInvoices" :disabled="selectedFiles.length === 0 || uploading" class="px-6 py-2 bg-[#1a73e8] text-white rounded text-[13px] font-bold hover:bg-blue-700 disabled:opacity-50">YÜKLEMYİ BAŞLAT</button>
            </div>
        </div>
    </dialog>

    <!-- History Modal -->
    <dialog class="modal" :class="{ 'modal-open': isHistoryModalOpen }">
        <div class="modal-box bg-white max-w-xl p-0 rounded shadow-2xl overflow-hidden border border-gray-200">
            <div class="px-6 py-4 bg-[#f8f9fa] border-b border-[#dadce0] flex justify-between items-center">
                <h3 class="text-[16px] font-bold text-gray-700">Maliyet Geçmişi <span class="font-mono ml-2 text-gray-400">{{ historyData?.phone_no }}</span></h3>
                <button @click="isHistoryModalOpen = false" class="text-gray-400 hover:text-black"><i class="fas fa-times"></i></button>
            </div>
            <div class="p-6 max-h-[500px] overflow-y-auto divide-y divide-gray-100">
                <div v-for="h in historyData?.history" :key="h.period + h.source_file" class="py-3 flex justify-between items-center group">
                    <div class="flex flex-col">
                        <span class="text-[10px] font-bold text-gray-400 uppercase">{{ h.period }}</span>
                        <span class="text-[14px] font-bold text-gray-700 group-hover:text-blue-600 transition-colors">{{ h.tariff || 'Tanımsız Tarife' }}</span>
                    </div>
                    <span class="text-[15px] font-black text-gray-900">{{ h.total_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }} ₺</span>
                </div>
            </div>
        </div>
        <form method="dialog" class="modal-backdrop" @click="isHistoryModalOpen = false"><button>close</button></form>
    </dialog>

  </div>
</template>

<style scoped>
/* Scrollbar Google Cloud Style */
::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #dadce0; border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: #bdc1c6; }

.modal-box {
    animation: fadeInScale 0.1s ease-out;
}

@keyframes fadeInScale {
    from { opacity: 0; transform: scale(0.98); }
    to { opacity: 1; transform: scale(1); }
}
</style>
