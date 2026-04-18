<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import api from '../../api'
import { useSimApi } from '../../composables/useSimApi'

const { dataList, loading, fetchList, createItem, updateItem, deleteItem } = useSimApi('voice')

// Global Filters
const searchQuery = ref('')
const pageSize = ref(50)
const currentPage = ref(1) // Added
const pageSizeOptions = [
    { label: '20 Kayıt', value: 20 },
    { label: '50 Kayıt', value: 50 },
    { label: '100 Kayıt', value: 100 },
    { label: '500 Kayıt', value: 500 },
    { label: 'Hepsi', value: 0 }
]
const operatorFilter = ref('')
const personnelFilter = ref('')
const statusFilter = ref('')

// Selection State
const selectedIds = ref([])
const toggleSelection = (id) => {
  const index = selectedIds.value.indexOf(id)
  if (index > -1) selectedIds.value.splice(index, 1)
  else selectedIds.value.push(id)
}
const toggleAllSelection = (event) => {
  if (event.target.checked) selectedIds.value = displayList.value.map(item => item.id)
  else selectedIds.value = []
}
const isSelected = (id) => selectedIds.value.includes(id)

// Column Sorting State
const sortBy = ref('')
const sortOrder = ref('asc')

// Column Filtering State (Excel Style)
const activeFilterMenu = ref(null)
const columnFilters = ref({
    iccid: [],
    phone_no: [],
    operator: [],
    personnel_name: [],
    status: []
})

// UI State
const isModalOpen = ref(false)
const selectedItem = ref(null)

const form = ref({
  iccid: '',
  phone_no: '',
  operator: '',
  company_id: '',
  department_id: '',
  package_id: '',
  personnel_id: '',
  status: 'Aktif',
  description: ''
})

const operators = ref([])
const personnel = ref([])
const companies = ref([])
const departments = ref([])
const packages = ref([])

const fetchOperators = async () => {
    try {
        const res = await api.get('/sim-takip/api/operators')
        operators.value = res.data
    } catch (err) {
        console.error('Operatörler yüklenemedi:', err)
    }
}

const fetchPersonnel = async () => {
    try {
        const res = await api.get('/sim-takip/api/personnel')
        personnel.value = res.data
    } catch (err) {
        console.error('Personel listesi yüklenemedi:', err)
    }
}

const fetchCompanies = async () => {
    try {
        const res = await api.get('/sim-takip/api/companies')
        companies.value = res.data
    } catch (err) {
        console.error('Şirketler yüklenemedi:', err)
    }
}

const fetchDepartments = async () => {
    try {
        const res = await api.get('/sim-takip/api/departments')
        departments.value = res.data
    } catch (err) {
        console.error('Departmanlar yüklenemedi:', err)
    }
}

const fetchPackages = async () => {
    try {
        const res = await api.get('/sim-takip/api/packages')
        packages.value = res.data.filter(p => p.type === 'voice')
    } catch (err) {
        console.error('Paketler yüklenemedi:', err)
    }
}

// Sorting Logic
const toggleSort = (column) => {
  if (sortBy.value === column) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = column
    sortOrder.value = 'asc'
  }
}

// Filtering Logic (Synchronized)
const toggleFilterMenu = (column, event) => {
    event.stopPropagation()
    activeFilterMenu.value = activeFilterMenu.value === column ? null : column
}

const toggleFilterValue = (column, value) => {
    const index = columnFilters.value[column].indexOf(value)
    if (index > -1) {
        columnFilters.value[column].splice(index, 1)
    } else {
        columnFilters.value[column].push(value)
    }
}

const getFilteredUniqueValues = (column) => {
    let list = [...dataList.value]
    
    // Global selects
    if (statusFilter.value) list = list.filter(item => item.status === statusFilter.value)
    if (operatorFilter.value) list = list.filter(item => item.operator === operatorFilter.value)
    if (personnelFilter.value) list = list.filter(item => item.personnel_name === personnelFilter.value)
    if (searchQuery.value) {
        const q = searchQuery.value.toLowerCase()
        list = list.filter(item => 
            (item.iccid && item.iccid.toLowerCase().includes(q)) ||
            (item.phone_no && item.phone_no.toLowerCase().includes(q)) ||
            (item.personnel_name && item.personnel_name.toLowerCase().includes(q))
        )
    }

    // Other column filters (Synchronized)
    Object.keys(columnFilters.value).forEach(key => {
        if (key !== column && columnFilters.value[key].length > 0) {
            list = list.filter(item => {
                const val = item[key] || '(Boş)'
                return columnFilters.value[key].includes(val)
            })
        }
    })

    const values = list.map(item => item[column] || '(Boş)')
    return [...new Set(values)].sort((a, b) => {
        if (a === '(Boş)') return -1
        if (b === '(Boş)') return 1
        return a.toString().localeCompare(b.toString(), undefined, { numeric: true })
    })
}

const clearColumnFilter = (column) => {
    columnFilters.value[column] = []
}

// Close menus on click outside
if (typeof window !== 'undefined') {
    window.addEventListener('click', () => { activeFilterMenu.value = null })
}

// Main Computed List
const filteredList = computed(() => {
  let list = [...dataList.value]
  
  if (statusFilter.value) list = list.filter(item => item.status === statusFilter.value)
  if (operatorFilter.value) list = list.filter(item => item.operator === operatorFilter.value)
  if (personnelFilter.value) list = list.filter(item => item.personnel_name === personnelFilter.value)

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(item => 
      (item.iccid && item.iccid.toLowerCase().includes(q)) ||
      (item.phone_no && item.phone_no.toLowerCase().includes(q)) ||
      (item.personnel_name && item.personnel_name.toLowerCase().includes(q))
    )
  }

  Object.keys(columnFilters.value).forEach(column => {
      const selectedValues = columnFilters.value[column]
      if (selectedValues.length > 0) {
          list = list.filter(item => {
              const val = item[column] || '(Boş)'
              return selectedValues.includes(val)
          })
      }
  })

  if (sortBy.value) {
    list.sort((a, b) => {
      const valA = (a[sortBy.value] || '').toString().toLowerCase()
      const valB = (b[sortBy.value] || '').toString().toLowerCase()
      if (valA < valB) return sortOrder.value === 'asc' ? -1 : 1
      if (valA > valB) return sortOrder.value === 'asc' ? 1 : -1
      return 0
    })
  }

  return list
})

// Selections
const statuses = ref(['Aktif', 'Pasif', 'İptal'])

// Actions
const openAddModal = () => {
    selectedItem.value = null
    form.value = { iccid: '', phone_no: '', operator: '', company_id: '', package_id: '', personnel_id: '', status: 'Aktif', description: '' }
    isModalOpen.value = true
}

const openEditModal = (item) => {
    selectedItem.value = item
    form.value = { ...item }
    isModalOpen.value = true
}

const saveItem = async () => {
    if (selectedItem.value) await updateItem(selectedItem.value.id, form.value)
    else await createItem(form.value)
    isModalOpen.value = false
}

const handleDelete = async (id) => {
    if (confirm('Emin misiniz?')) await deleteItem(id)
}

const refreshData = () => fetchList()

// Reset page when filters change
watch([searchQuery, operatorFilter, personnelFilter, statusFilter, pageSize, columnFilters], () => {
    currentPage.value = 1
}, { deep: true })

const totalPages = computed(() => {
    if (pageSize.value === 0) return 1
    return Math.ceil(filteredList.value.length / pageSize.value)
})

const pageNumbers = computed(() => {
    const pages = []
    const total = totalPages.value
    if (total <= 7) {
        for (let i = 1; i <= total; i++) pages.push(i)
    } else {
        if (currentPage.value <= 4) {
            pages.push(1, 2, 3, 4, 5, '...', total)
        } else if (currentPage.value >= total - 3) {
            pages.push(1, '...', total - 4, total - 3, total - 2, total - 1, total)
        } else {
            pages.push(1, '...', currentPage.value - 1, currentPage.value, currentPage.value + 1, '...', total)
        }
    }
    return pages
})

const displayList = computed(() => {
    if (pageSize.value === 0) return filteredList.value
    const start = (currentPage.value - 1) * pageSize.value
    return filteredList.value.slice(start, start + pageSize.value)
})

onMounted(() => { 
    fetchList()
    fetchOperators()
    fetchPersonnel()
    fetchCompanies()
    fetchDepartments()
    fetchPackages()
})
</script>

<template>
  <div class="h-full flex flex-col text-[#3c4043]">

    <!-- Filters / Bulk Actions Bar -->
    <div class="flex items-center gap-3 mb-4 bg-white p-2 rounded-lg border border-[#e0e0e0] flex-wrap min-h-[52px]">
      <template v-if="selectedIds.length > 0">
        <div class="flex items-center gap-4 px-2 w-full animate-in slide-in-from-top-1 duration-200">
          <div class="flex items-center gap-2">
            <span class="w-2 h-6 bg-[#1a73e8] rounded-full"></span>
            <span class="text-[14px] font-bold text-[#1a73e8]">
              {{ selectedIds.length }} Kayıt Seçildi
            </span>
          </div>

          <div class="h-6 w-px bg-gray-200 mx-2"></div>

          <div class="flex items-center gap-2">
            <button class="flex items-center gap-2 px-4 py-1.5 bg-[#1a73e8] text-white rounded-md text-[12px] font-bold hover:bg-[#174ea6] transition-all shadow-sm">
              <i class="fas fa-edit"></i> Toplu Düzenle
            </button>
            <button class="flex items-center gap-2 px-4 py-1.5 bg-red-50 text-red-600 border border-red-100 rounded-md text-[12px] font-bold hover:bg-red-100 transition-all">
              <i class="fas fa-trash"></i> Toplu Sil
            </button>
          </div>

          <button @click="selectedIds = []" class="ml-auto flex items-center gap-1 text-[12px] text-gray-500 hover:text-gray-800 font-medium px-3 py-1.5 hover:bg-gray-50 rounded-md transition-all">
            <i class="fas fa-times"></i> Seçimi Temizle
          </button>
        </div>
      </template>
      <template v-else>
        <div class="relative flex-1 min-w-[300px]">
            <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[13px]"></i>
            <input v-model="searchQuery" type="text" placeholder="Ad, numara veya ICCID ara..." class="w-full bg-white border border-[#e0e0e0] text-[13px] pl-9 pr-4 py-1.5 rounded-md focus:border-[#1a73e8] outline-none">
        </div>

        <select v-model="operatorFilter" class="bg-white border border-[#e0e0e0] text-[13px] px-3 py-1.5 rounded-md outline-none focus:border-[#1a73e8] min-w-[140px] cursor-pointer">
            <option value="">Tüm Operatörler</option>
            <option v-for="op in operators" :key="op.id" :value="op.name">{{ op.name }}</option>
        </select>

        <select v-model="personnelFilter" class="bg-white border border-[#e0e0e0] text-[13px] px-3 py-1.5 rounded-md outline-none focus:border-[#1a73e8] min-w-[140px] cursor-pointer">
            <option value="">Tüm Personeller</option>
            <option v-for="p in personnel" :key="p.id" :value="p.first_name + ' ' + p.last_name">{{ p.first_name + ' ' + p.last_name }}</option>
        </select>

        <select v-model="statusFilter" class="bg-white border border-[#e0e0e0] text-[13px] px-3 py-1.5 rounded-md outline-none focus:border-[#1a73e8] min-w-[140px] cursor-pointer">
            <option value="">Tüm Durumlar</option>
            <option v-for="st in statuses" :key="st" :value="st">{{ st }}</option>
        </select>

        <div class="flex items-center gap-2 border-l border-[#e0e0e0] pl-3">
            <span class="text-[11px] font-bold text-gray-400 uppercase">Limit:</span>
            <select v-model="pageSize" class="bg-white border border-[#e0e0e0] text-[12px] px-2 py-1.5 rounded-md outline-none focus:border-[#1a73e8]">
                <option v-for="opt in pageSizeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
        </div>

        <button @click="refreshData" class="flex items-center gap-2 px-4 py-1.5 text-gray-600 hover:bg-gray-50 border border-[#e0e0e0] rounded-md text-[13px] font-medium transition-none">
            <i class="fas fa-sync-alt text-[12px]"></i> Yenile
        </button>
      </template>
    </div>

    <!-- Table container -->
    <div class="flex-1 min-h-0 bg-white border-t border-[#e0e0e0] rounded-sm overflow-hidden flex flex-col">
        <div class="overflow-x-auto flex-1 border-l border-r border-[#e0e0e0]">
            <table class="w-full text-left border-collapse table-fixed">
                <thead>
                    <tr class="bg-[#f8f9fa] border-b border-[#e0e0e0] text-[#5f6368] text-[11px] font-bold uppercase tracking-wider">
                        <th class="py-2 px-4 text-center w-[40px] border-r border-[#e0e0e0]">
                            <input type="checkbox" @change="toggleAllSelection($event)" :checked="displayList.length > 0 && selectedIds.length === displayList.length" class="accent-[#1a73e8]">
                        </th>
                        <th class="py-2 px-4 text-center w-[40px] border-r border-[#e0e0e0]">#</th>
                        
                        <th v-for="col in [
                            { key: 'phone_no', label: 'Telefon No', width: '160px' },
                            { key: 'iccid', label: 'ICCID', width: '220px' },
                            { key: 'operator', label: 'Operatör', width: '140px' },
                            { key: 'personnel_name', label: 'Personel', width: '160px' },
                            { key: 'status', label: 'Durum', width: '130px' }
                        ]" :key="col.key" class="py-2 px-4 transition-colors group relative border-r border-[#e0e0e0]" :style="{ width: col.width }">
                            <div class="flex items-center justify-between">
                                <div @click="toggleSort(col.key)" class="flex items-center gap-1.5 cursor-pointer hover:text-[#1a73e8] transition-colors flex-1 truncate" :title="col.label">
                                    {{ col.label }}
                                    <i class="fas text-[9px]" :class="sortBy === col.key ? (sortOrder === 'asc' ? 'fa-sort-up text-blue-600' : 'fa-sort-down text-blue-600') : 'fa-sort text-gray-300 opacity-0 group-hover:opacity-100'"></i>
                                </div>
                                <div @click.stop="toggleFilterMenu(col.key, $event)" class="cursor-pointer px-1.5 py-1 hover:text-[#1a73e8] transition-all rounded" :class="(columnFilters[col.key] || []).length > 0 ? 'text-blue-600' : 'text-gray-400 opacity-0 group-hover:opacity-100'">
                                    <i class="fas fa-filter text-[10px]"></i>
                                </div>
                            </div>
                            
                             <!-- Filter Dropdown -->
                             <div v-if="activeFilterMenu === col.key" @click.stop class="absolute top-[85%] left-0 min-w-[200px] max-w-[300px] bg-white border border-[#dadce0] rounded shadow-2xl z-[100] mt-1 py-2 px-1 animate-in fade-in zoom-in duration-75">
                                <div class="max-h-60 overflow-y-auto px-1 space-y-0.5">
                                    <label v-for="val in getFilteredUniqueValues(col.key)" :key="val" 
                                           class="flex items-center gap-2 px-2 py-1.5 hover:bg-[#f8f9fa] rounded cursor-pointer select-none transition-colors"
                                           :title="val">
                                        <input type="checkbox" :checked="(columnFilters[col.key] || []).includes(val)" @change="toggleFilterValue(col.key, val)" class="w-3.5 h-3.5 accent-[#1a73e8]">
                                        <span class="text-[12px] truncate flex-1" :class="val === '(Boş)' ? 'text-gray-400 italic' : 'text-[#3c4043]'">{{ val }}</span>
                                    </label>
                                </div>
                                <div class="mt-2 pt-2 border-t border-gray-100 flex justify-between px-3 pb-1">
                                    <button @click="clearColumnFilter(col.key)" class="text-[11px] text-[#1a73e8] font-bold hover:text-[#174ea6] uppercase tracking-tighter">Temizle</button>
                                    <button @click="activeFilterMenu = null" class="text-[11px] text-gray-500 font-bold hover:text-gray-700 uppercase tracking-tighter">Tamam</button>
                                </div>
                            </div>
                        </th>
                        
                        <th class="py-3 px-4 text-center w-[120px] border-r border-[#e0e0e0]">İşlem</th>
                    </tr>
                </thead>
                <tbody class="text-[13px] text-[#3c4043]">
                    <tr v-for="(item, index) in displayList" :key="item.id" 
                        class="border-b border-[#e0e0e0] transition-none group even:bg-[#fafbfb]"
                        :class="isSelected(item.id) ? '!bg-[#e8f0fe]' : 'hover:bg-[#f1f3f4]'">
                        <td class="py-2 px-4 text-center border-r border-[#e0e0e0]">
                            <input type="checkbox" :checked="isSelected(item.id)" @change="toggleSelection(item.id)" class="accent-[#1a73e8]">
                        </td>
                        <td class="py-2 px-4 text-center text-gray-400 font-mono border-r border-[#e0e0e0]">{{ (currentPage - 1) * pageSize + index + 1 }}</td>
                        <td class="py-2 px-4 font-medium text-[#3c4043] whitespace-nowrap border-r border-[#e0e0e0]" :title="item.phone_no">{{ item.phone_no || '-' }}</td>
                        <td class="py-2 px-4 font-mono text-gray-500 truncate border-r border-[#e0e0e0]" :title="item.iccid">{{ item.iccid || '-' }}</td>
                        <td class="py-2 px-4 border-r border-[#e0e0e0]">
                            <span v-if="item.operator === 'Turkcell'" class="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-[#e0f2fe] text-[#0284c7]">Turkcell</span>
                            <span v-else-if="item.operator === 'Vodafone'" class="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-[#fee2e2] text-[#e11d48]">Vodafone</span>
                            <span v-else class="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-gray-100 text-gray-600">{{ item.operator || '-' }}</span>
                        </td>
                        <td class="py-2 px-4 font-medium truncate text-[#3c4043] border-r border-[#e0e0e0]" :title="item.personnel_name">{{ item.personnel_name || '-' }}</td>
                        <td class="py-2 px-4 border-r border-[#e0e0e0]">
                            <span v-if="item.status === 'Aktif'" class="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-[#e6f4ea] text-[#1e8e3e]">Aktif</span>
                            <span v-else-if="item.status === 'İptal'" class="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-[#feebe9] text-[#d93025]">İptal</span>
                            <span v-else class="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-gray-100 text-gray-600">{{ item.status || '-' }}</span>
                        </td>
                        <td class="py-2 px-4 border-r border-[#e0e0e0]">
                            <div class="flex justify-center gap-1">
                                <button class="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-[#d2e3fc] rounded-full transition-all" title="Faliyet"><i class="far fa-clock text-[13px]"></i></button>
                                <button @click="openEditModal(item)" class="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-[#d2e3fc] rounded-full transition-all" title="Düzenle"><i class="far fa-edit text-[13px]"></i></button>
                                <button @click="handleDelete(item.id)" class="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-[#f8d7da] rounded-full transition-all" title="Sil"><i class="far fa-trash-alt text-[13px]"></i></button>
                            </div>
                        </td>
                    </tr>
                    <tr v-if="displayList.length === 0 && !loading">
                        <td colspan="8" class="text-center py-20 text-gray-400 text-xs font-bold uppercase tracking-widest bg-gray-50/30">Kayıtlı veri bulunamadı</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Pagination Controls -->
        <div v-if="totalPages > 1 || pageSize !== 0" class="px-4 py-1.5 border-t border-[#e0e0e0] bg-[#f8f9fa] flex items-center justify-between shrink-0">
            <div class="text-[12px] text-gray-500 font-medium">
                <span class="font-bold text-[#1a73e8]">{{ filteredList.length }}</span> kayıttan 
                <span v-if="pageSize !== 0">
                    {{ (currentPage - 1) * pageSize + 1 }}-{{ Math.min(currentPage * pageSize, filteredList.length) }} arası gösteriliyor
                </span>
                <span v-else>tümü gösteriliyor</span>
            </div>
            
            <div v-if="pageSize !== 0" class="flex items-center gap-1">
                <button 
                    @click="currentPage > 1 && currentPage--"
                    :disabled="currentPage === 1"
                    class="px-2 py-1 text-[12px] font-bold rounded hover:bg-white border border-transparent hover:border-[#e0e0e0] disabled:opacity-30 disabled:cursor-not-allowed transition-none"
                >
                    <i class="fas fa-chevron-left mr-1"></i> ÖNCEKİ
                </button>
                
                <div class="flex items-center">
                    <button 
                        v-for="p in pageNumbers" 
                        :key="p"
                        @click="typeof p === 'number' && (currentPage = p)"
                        class="w-7 h-7 flex items-center justify-center text-[12px] font-bold rounded transition-none"
                        :class="[
                            currentPage === p ? 'bg-[#1a73e8] text-white' : 'text-gray-600 hover:bg-white hover:border-[#e0e0e0] border border-transparent',
                            typeof p !== 'number' ? 'cursor-default pointer-events-none' : 'cursor-pointer'
                        ]"
                    >
                        {{ p }}
                    </button>
                </div>

                <button 
                    @click="currentPage < totalPages && currentPage++"
                    :disabled="currentPage === totalPages"
                    class="px-2 py-1 text-[12px] font-bold rounded hover:bg-white border border-transparent hover:border-[#e0e0e0] disabled:opacity-30 disabled:cursor-not-allowed transition-none"
                >
                    SONRAKİ <i class="fas fa-chevron-right ml-1"></i>
                </button>
            </div>
        </div>
    </div>

    <!-- Modal Form -->
    <dialog class="modal" :class="{ 'modal-open': isModalOpen }">
        <div class="modal-box bg-white p-6 rounded-lg shadow-2xl border border-gray-100 max-w-xl">
            <div class="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
                <h3 class="font-bold text-[15px] text-gray-900">{{ selectedItem ? 'Ses Hattı Düzenle' : 'Yeni Ses Hattı Ekle' }}</h3>
                <button @click="isModalOpen = false" class="text-gray-400 hover:text-gray-600"><i class="fas fa-times"></i></button>
            </div>
            
            <form @submit.prevent="saveItem" class="space-y-4">
                <div class="grid grid-cols-2 gap-4">
                    <div class="flex flex-col gap-1.5">
                        <label class="text-[12px] font-bold text-gray-500 ml-0.5">Telefon No</label>
                        <input v-model="form.phone_no" type="text" class="w-full border border-gray-200 text-[13px] px-3 py-2 rounded-md outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8]" required>
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-[12px] font-bold text-gray-500 ml-0.5">ICCID</label>
                        <input v-model="form.iccid" type="text" class="w-full border border-gray-200 text-[13px] px-3 py-2 rounded-md outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8]">
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-[12px] font-bold text-gray-500 ml-0.5">Operatör</label>
                        <select v-model="form.operator" class="w-full border border-gray-200 text-[13px] px-3 py-2 rounded-md outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8]" required>
                            <option value="">Seçiniz</option>
                            <option v-for="op in operators" :key="op" :value="op">{{ op }}</option>
                        </select>
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-[12px] font-bold text-gray-500 ml-0.5">Personel</label>
                        <select v-model="form.personnel_id" class="w-full border border-gray-200 text-[13px] px-3 py-2 rounded-md outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8]">
                            <option value="">Seçiniz</option>
                            <option v-for="p in personnel" :key="p.id" :value="p.id">{{ p.first_name + ' ' + p.last_name }}</option>
                        </select>
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-[12px] font-bold text-gray-500 ml-0.5">Departman</label>
                        <select v-model="form.department_id" class="w-full border border-gray-200 text-[13px] px-3 py-2 rounded-md outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8]">
                            <option value="">Seçiniz</option>
                            <option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name }}</option>
                        </select>
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-[12px] font-bold text-gray-500 ml-0.5">Şirket</label>
                        <select v-model="form.company_id" class="w-full border border-gray-200 text-[13px] px-3 py-2 rounded-md outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8]">
                            <option value="">Seçiniz</option>
                            <option v-for="c in companies" :key="c.id" :value="c.id">{{ c.name }}</option>
                        </select>
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-[12px] font-bold text-gray-500 ml-0.5">Paket</label>
                        <select v-model="form.package_id" class="w-full border border-gray-200 text-[13px] px-3 py-2 rounded-md outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8]">
                            <option value="">Seçiniz</option>
                            <option v-for="p in packages" :key="p.id" :value="p.id">{{ p.name }}</option>
                        </select>
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-[12px] font-bold text-gray-500 ml-0.5">Durum</label>
                        <select v-model="form.status" class="w-full border border-gray-200 text-[13px] px-3 py-2 rounded-md outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8]" required>
                            <option v-for="st in statuses" :key="st" :value="st">{{ st }}</option>
                        </select>
                    </div>
                </div>
                <div class="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-100">
                    <button type="button" @click="isModalOpen = false" class="px-6 py-2 text-[13px] font-bold text-gray-500 hover:text-gray-900 transition-none">İPTAL</button>
                    <button type="submit" class="px-8 py-2 bg-[#1a73e8] text-white text-[13px] font-bold rounded-md hover:bg-[#174ea6] transition-none shadow-sm">KAYDET</button>
                </div>
            </form>
        </div>
        <form method="dialog" class="modal-backdrop" @click="isModalOpen = false"><button>close</button></form>
    </dialog>
  </div>
</template>

<style scoped>
</style>
