<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import * as XLSX from 'xlsx'
import api from '../../api'

const route = useRoute()
const activeTab = ref(route.query.tab || 'simcards')
const activeCategory = ref('operations')

// --- Bug Fix: Missing variable declarations ---
const loading = ref(false)
const simType = ref('m2m')
const selectedTable = ref('sim_m2m')
const uploadMode = ref('transfer')

// --- Toast Notification System ---
const toasts = ref([])
let toastId = 0
const showToast = (message, type = 'success') => {
    const id = ++toastId
    toasts.value.push({ id, message, type })
    setTimeout(() => {
        toasts.value = toasts.value.filter(t => t.id !== id)
    }, 3500)
}

// --- Search/Filter for lists ---
const listSearchQuery = ref('')

// --- Delete Confirmation Modal ---
const deleteModal = ref({ show: false, type: '', id: null, name: '' })
const showDeleteModal = (type, id, name) => {
    deleteModal.value = { show: true, type, id, name }
}
const closeDeleteModal = () => {
    deleteModal.value = { show: false, type: '', id: null, name: '' }
}

// --- Bulk Selection State ---
const selectedIds = ref([])
const isBulkEditModalShow = ref(false)
const bulkEditForm = ref({
    company_id: '',
    department_id: '',
    operator_id: '',
    type: '',
    price: null,
    status: ''
})

const toggleSelectAll = () => {
    if (selectedIds.value.length === currentListData.value.length && currentListData.value.length > 0) {
        selectedIds.value = []
    } else {
        selectedIds.value = currentListData.value.map(item => item.id)
    }
}

const toggleSelect = (id) => {
    const index = selectedIds.value.indexOf(id)
    if (index > -1) {
        selectedIds.value.splice(index, 1)
    } else {
        selectedIds.value.push(id)
    }
}
const confirmDelete = async () => {
    const { type, id } = deleteModal.value
    closeDeleteModal()
    loading.value = true
    try {
        if (type === 'bulk') {
            const endpointMap = {
                operators: 'operators',
                companies: 'companies',
                packages: 'packages',
                vehicles: 'vehicles',
                locations: 'locations',
                personnel: 'personnel',
                departments: 'departments'
            }
            const endpoint = endpointMap[activeTab.value]
            await Promise.all(selectedIds.value.map(sId => api.delete(`/sim-takip/api/${endpoint}/${sId}`)))
            showToast(`${selectedIds.value.length} kayıt silindi.`)
            selectedIds.value = []
        } else {
            const endpoints = {
                operator: `/sim-takip/api/operators/${id}`,
                company: `/sim-takip/api/companies/${id}`,
                package: `/sim-takip/api/packages/${id}`,
                vehicle: `/sim-takip/api/vehicles/${id}`,
                location: `/sim-takip/api/locations/${id}`,
                personnel: `/sim-takip/api/personnel/${id}`,
                department: `/sim-takip/api/departments/${id}`
            }
            await api.delete(endpoints[type])
            showToast('Kayıt başarıyla silindi.', 'success')
            // If the deleted item was selected, remove it
            selectedIds.value = selectedIds.value.filter(sId => sId !== id)
        }
        fetchData()
    } catch (err) {
        showToast(err.response?.data?.message || err.response?.data?.error || 'Silme hatası!', 'error')
    } finally {
        loading.value = false
    }
}

const openBulkEditModal = () => {
    bulkEditForm.value = {
        company_id: '',
        department_id: '',
        operator_id: '',
        type: '',
        price: null,
        status: ''
    }
    isBulkEditModalShow.value = true
}

const confirmBulkEdit = async () => {
    loading.value = true
    isBulkEditModalShow.value = false
    try {
        const endpointMap = {
            operators: 'operators',
            companies: 'companies',
            packages: 'packages',
            vehicles: 'vehicles',
            locations: 'locations',
            personnel: 'personnel',
            departments: 'departments'
        }
        const endpoint = endpointMap[activeTab.value]
        
        // Filter out empty fields from bulkEditForm
        const updateData = {}
        Object.keys(bulkEditForm.value).forEach(key => {
            if (bulkEditForm.value[key] !== '' && bulkEditForm.value[key] !== null) {
                updateData[key] = bulkEditForm.value[key]
            }
        })

        if (Object.keys(updateData).length === 0) {
            showToast('Lütfen en az bir alanı doldurun.', 'error')
            return
        }

        await Promise.all(selectedIds.value.map(sId => api.put(`/sim-takip/api/${endpoint}/${sId}`, updateData)))
        showToast(`${selectedIds.value.length} kayıt güncellendi.`)
        selectedIds.value = []
        fetchData()
    } catch (err) {
        showToast('Toplu güncelleme hatası!', 'error')
    } finally {
        loading.value = false
    }
}

// --- Filtered lists based on search ---
const filteredOperators = computed(() => {
    if (!listSearchQuery.value) return operators.value
    const q = listSearchQuery.value.toLowerCase()
    return operators.value.filter(o => o.name.toLowerCase().includes(q))
})
const filteredCompanies = computed(() => {
    if (!listSearchQuery.value) return companies.value
    const q = listSearchQuery.value.toLowerCase()
    return companies.value.filter(c => c.name.toLowerCase().includes(q) || (c.notes || '').toLowerCase().includes(q))
})
const filteredDepartments = computed(() => {
    if (!listSearchQuery.value) return departments.value
    const q = listSearchQuery.value.toLowerCase()
    return departments.value.filter(d => d.name.toLowerCase().includes(q))
})
const filteredPersonnel = computed(() => {
    if (!listSearchQuery.value) return personnel.value
    const q = listSearchQuery.value.toLowerCase()
    return personnel.value.filter(p => `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) || (p.company_name || '').toLowerCase().includes(q))
})
const filteredVehicles = computed(() => {
    if (!listSearchQuery.value) return vehicles.value
    const q = listSearchQuery.value.toLowerCase()
    return vehicles.value.filter(v => v.plate_no.toLowerCase().includes(q) || (v.vehicle_type || '').toLowerCase().includes(q))
})
const filteredLocations = computed(() => {
    if (!listSearchQuery.value) return locations.value
    const q = listSearchQuery.value.toLowerCase()
    return locations.value.filter(l => l.name.toLowerCase().includes(q) || (l.address || '').toLowerCase().includes(q))
})
const filteredPackages = computed(() => {
    if (!listSearchQuery.value) return packages.value
    const q = listSearchQuery.value.toLowerCase()
    return packages.value.filter(p => p.name.toLowerCase().includes(q) || (p.operator_name || '').toLowerCase().includes(q))
})

// Current list helpers
const currentListData = computed(() => {
    const map = { operators: filteredOperators, companies: filteredCompanies, departments: filteredDepartments, personnel: filteredPersonnel, vehicles: filteredVehicles, locations: filteredLocations, packages: filteredPackages }
    const key = activeTab.value === 'operators' ? 'operators' : activeTab.value === 'companies' ? 'companies' : activeTab.value === 'departments' ? 'departments' : activeTab.value === 'personnel' ? 'personnel' : activeTab.value === 'vehicles' ? 'vehicles' : activeTab.value === 'locations' ? 'locations' : activeTab.value === 'packages' ? 'packages' : null
    return key ? map[key].value : []
})
const totalListCount = computed(() => {
    const map = { operators, companies, departments, personnel, vehicles, locations, packages }
    const key = activeTab.value
    return map[key] ? map[key].value.length : 0
})

const categories = [
    {
        id: 'operations',
        name: 'İşlemler',
        icon: 'fa-tasks',
        tabs: [
            { id: 'simcards', name: 'Hat Aktarımı', icon: 'fa-exchange-alt' }
        ]
    },
    {
        id: 'organizational',
        name: 'Organizasyon',
        icon: 'fa-users-cog',
        tabs: [
            { id: 'companies', name: 'Şirketler', icon: 'fa-building' },
            { id: 'departments', name: 'Departmanlar', icon: 'fa-sitemap' },
            { id: 'personnel', name: 'Personeller', icon: 'fa-user-tie' }
        ]
    },
    {
        id: 'assets',
        name: 'Varlık & Konum',
        icon: 'fa-map-marked-alt',
        tabs: [
            { id: 'vehicles', name: 'Araçlar', icon: 'fa-truck-moving' },
            { id: 'locations', name: 'Lokasyonlar', icon: 'fa-map-marker-alt' }
        ]
    },
    {
        id: 'telecom',
        name: 'Telekom',
        icon: 'fa-broadcast-tower',
        tabs: [
            { id: 'operators', name: 'Operatörler', icon: 'fa-broadcast-tower' },
            { id: 'packages', name: 'Paketler', icon: 'fa-box-open' }
        ]
    }
]


// Reactive state for management
const operators = ref([])
const companies = ref([])
const packages = ref([])
const vehicles = ref([])
const locations = ref([])
const personnel = ref([])
const departments = ref([])

// Forms for adding new items
const newOperator = ref('')
const newCompany = ref({ name: '', notes: '' })
const newPackage = ref({ name: '', type: 'm2m', operator_id: '', price: 0 })
const newVehicle = ref({ plate_no: '', vehicle_type: 'Çekici', notes: '' })
const newLocation = ref({ name: '', address: '', notes: '' })
const newDepartment = ref({ name: '', notes: '' })
const newPerson = ref({ first_name: '', last_name: '', department_id: '', company_id: '', phone: '', notes: '' })

// Edit State
const editingItem = ref(null) // { id: 1, type: 'operator', data: { name: '...' } }

// Data Fetching
const fetchData = async () => {
    loading.value = true
    const endpoints = [
        { key: 'operators', url: '/sim-takip/api/operators' },
        { key: 'companies', url: '/sim-takip/api/companies' },
        { key: 'packages', url: '/sim-takip/api/packages' },
        { key: 'vehicles', url: '/sim-takip/api/vehicles' },
        { key: 'locations', url: '/sim-takip/api/locations' },
        { key: 'personnel', url: '/sim-takip/api/personnel' },
        { key: 'departments', url: '/sim-takip/api/departments' }
    ]

    try {
        await Promise.all(endpoints.map(async (ep) => {
            try {
                const res = await api.get(ep.url)
                if (ep.key === 'operators') operators.value = res.data
                else if (ep.key === 'companies') companies.value = res.data
                else if (ep.key === 'packages') packages.value = res.data
                else if (ep.key === 'vehicles') vehicles.value = res.data
                else if (ep.key === 'locations') locations.value = res.data
                else if (ep.key === 'personnel') personnel.value = res.data
                else if (ep.key === 'departments') departments.value = res.data
            } catch (err) {
                console.error(`${ep.key} yükleme hatası:`, err)
            }
        }))
    } finally {
        loading.value = false
    }
}

onMounted(() => {
    fetchData()
    if (route.query.tab) {
        activeTab.value = route.query.tab
    }
})

watch(() => route.query.tab, (newTab) => {
    if (newTab) {
        activeTab.value = newTab
        editingItem.value = null
    }
})

// CRUD Operations
const addOperator = async () => {
    if (!newOperator.value) return
    try {
        if (editingItem.value && editingItem.value.type === 'operator') {
            await api.put(`/sim-takip/api/operators/${editingItem.value.id}`, { name: newOperator.value })
            editingItem.value = null
        } else {
            await api.post('/sim-takip/api/operators', { name: newOperator.value })
        }
        newOperator.value = ''
        showToast(editingItem.value ? 'Operatör güncellendi.' : 'Operatör eklendi.')
        fetchData()
    } catch (err) {
        showToast(err.response?.data?.message || 'Hata oluştu', 'error')
    }
}

const startEditOperator = (op) => {
    editingItem.value = { id: op.id, type: 'operator', data: { ...op } }
    newOperator.value = op.name
}

const cancelEdit = () => {
    editingItem.value = null
    newOperator.value = ''
    newCompany.value = { name: '', notes: '' }
    newPackage.value = { name: '', type: 'm2m', operator_id: '', price: 0 }
    newVehicle.value = { plate_no: '', vehicle_type: 'Çekici', notes: '' }
    newLocation.value = { name: '', address: '', notes: '' }
    newDepartment.value = { name: '', notes: '' }
    newPerson.value = { first_name: '', last_name: '', department_id: '', company_id: '', phone: '', notes: '' }
}

const addCompany = async () => {
    if (!newCompany.value.name) return
    try {
        if (editingItem.value && editingItem.value.type === 'company') {
            await api.put(`/sim-takip/api/companies/${editingItem.value.id}`, newCompany.value)
            editingItem.value = null
        } else {
            await api.post('/sim-takip/api/companies', newCompany.value)
        }
        newCompany.value = { name: '', notes: '' }
        showToast(editingItem.value ? 'Şirket güncellendi.' : 'Şirket eklendi.')
        fetchData()
    } catch (err) {
        showToast(err.response?.data?.error || 'Hata oluştu', 'error')
    }
}

const startEditCompany = (comp) => {
    editingItem.value = { id: comp.id, type: 'company', data: { ...comp } }
    newCompany.value = { name: comp.name, notes: comp.notes }
}

const addPackage = async () => {
    if (!newPackage.value.name || !newPackage.value.operator_id) {
        showToast('İsim ve Operatör zorunludur!', 'error')
        return
    }
    try {
        if (editingItem.value && editingItem.value.type === 'package') {
            await api.put(`/sim-takip/api/packages/${editingItem.value.id}`, newPackage.value)
            editingItem.value = null
        } else {
            await api.post('/sim-takip/api/packages', newPackage.value)
        }
        newPackage.value = { name: '', type: 'm2m', operator_id: '', price: 0 }
        showToast(editingItem.value ? 'Paket güncellendi.' : 'Paket eklendi.')
        fetchData()
    } catch (err) {
        showToast(err.response?.data?.error || 'Hata oluştu', 'error')
    }
}

const startEditPackage = (pkg) => {
    editingItem.value = { id: pkg.id, type: 'package', data: { ...pkg } }
    newPackage.value = { 
        name: pkg.name, 
        type: pkg.type, 
        operator_id: pkg.operator_id, 
        price: pkg.price 
    }
}

const addVehicle = async () => {
    if (!newVehicle.value.plate_no) return
    try {
        if (editingItem.value && editingItem.value.type === 'vehicle') {
            await api.put(`/sim-takip/api/vehicles/${editingItem.value.id}`, newVehicle.value)
            editingItem.value = null
        } else {
            await api.post('/sim-takip/api/vehicles', newVehicle.value)
        }
        newVehicle.value = { plate_no: '', vehicle_type: 'Çekici', notes: '' }
        showToast(editingItem.value ? 'Araç güncellendi.' : 'Araç eklendi.')
        fetchData()
    } catch (err) {
        showToast(err.response?.data?.error || 'Hata oluştu', 'error')
    }
}

const startEditVehicle = (ve) => {
    editingItem.value = { id: ve.id, type: 'vehicle', data: { ...ve } }
    newVehicle.value = { 
        plate_no: ve.plate_no, 
        vehicle_type: ve.vehicle_type, 
        notes: ve.notes 
    }
}

const addLocation = async () => {
    if (!newLocation.value.name) return
    try {
        if (editingItem.value && editingItem.value.type === 'location') {
            await api.put(`/sim-takip/api/locations/${editingItem.value.id}`, newLocation.value)
            editingItem.value = null
        } else {
            await api.post('/sim-takip/api/locations', newLocation.value)
        }
        newLocation.value = { name: '', address: '', notes: '' }
        showToast(editingItem.value ? 'Lokasyon güncellendi.' : 'Lokasyon eklendi.')
        fetchData()
    } catch (err) {
        showToast(err.response?.data?.error || 'Hata oluştu', 'error')
    }
}

const startEditLocation = (loc) => {
    editingItem.value = { id: loc.id, type: 'location', data: { ...loc } }
    newLocation.value = { 
        name: loc.name, 
        address: loc.address, 
        notes: loc.notes 
    }
}

const addDepartment = async () => {
    if (!newDepartment.value.name) return
    try {
        if (editingItem.value && editingItem.value.type === 'department') {
            await api.put(`/sim-takip/api/departments/${editingItem.value.id}`, newDepartment.value)
            editingItem.value = null
        } else {
            await api.post('/sim-takip/api/departments', newDepartment.value)
        }
        newDepartment.value = { name: '', notes: '' }
        showToast(editingItem.value ? 'Departman güncellendi.' : 'Departman eklendi.')
        fetchData()
    } catch (err) {
        showToast(err.response?.data?.error || 'Hata oluştu', 'error')
    }
}

const startEditDepartment = (d) => {
    editingItem.value = { id: d.id, type: 'department', data: { ...d } }
    newDepartment.value = { name: d.name, notes: d.notes }
}

const addPerson = async () => {
    if (!newPerson.value.first_name || !newPerson.value.last_name) return
    try {
        if (editingItem.value && editingItem.value.type === 'personnel') {
            await api.put(`/sim-takip/api/personnel/${editingItem.value.id}`, newPerson.value)
            editingItem.value = null
        } else {
            await api.post('/sim-takip/api/personnel', newPerson.value)
        }
        newPerson.value = { first_name: '', last_name: '', department_id: '', company_id: '', phone: '', notes: '' }
        showToast(editingItem.value ? 'Personel güncellendi.' : 'Personel eklendi.')
        fetchData()
    } catch (err) {
        showToast(err.response?.data?.error || 'Hata oluştu', 'error')
    }
}

const startEditPerson = (p) => {
    editingItem.value = { id: p.id, type: 'personnel', data: { ...p } }
    newPerson.value = { 
        first_name: p.first_name,
        last_name: p.last_name,
        department_id: p.department_id || '',
        company_id: p.company_id || '',
        phone: p.phone,
        notes: p.notes
    }
}


const statuses = ['Aktif', 'Pasif', 'İptal']
const vehicleTypesArr = ['Çekici', 'Dorse', 'Binek', 'Kamyon', 'Diğer']

const filteredPackagesList = computed(() => {
    return packages.value.filter(p => p.type === simType.value)
})

const form = ref({
    iccid: '',
    phone_no: '',
    operator: '',
    package_id: '',
    status: 'Aktif',
    vehicle_id: '',
    location_id: '',
    personnel_id: '',
    department_id: '',
    company_id: '',
    notes: '' // description yerine notes
})

const recentAdditions = ref([])

const resetForm = () => {
    form.value = {
        ...form.value,
        iccid: '',
        phone_no: '',
        vehicle_id: '',
        location_id: '',
        personnel_id: '',
        department_id: '',
        company_id: '',
        notes: ''
    }
}

const quickAddText = ref('')

// --- Smart Transfer (Akıllı Aktarım) Logic ---
const searchQuery = ref('')
const searchResults = ref([])
const selectedSim = ref(null)
const transferTargetType = ref('stock') // 'vehicle', 'personnel', 'location', 'stock'
const transferTargetId = ref('')

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
    
    loading.value = true
    try {
        const simId = selectedSim.value.id
        const currentType = selectedSim.value.type
        let targetType = currentType // Default to no type change
        
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
            targetData = {
                vehicle_id: transferTargetId.value,
                status: 'Aktif'
            }
        } else if (transferTargetType.value === 'personnel') {
            targetType = 'voice'
            targetData = {
                personnel_id: transferTargetId.value,
                status: 'Aktif'
            }
        } else if (transferTargetType.value === 'location') {
            targetType = 'data'
            targetData = {
                location_id: transferTargetId.value,
                status: 'Aktif'
            }
        }

        const res = await api.post('/sim-takip/api/sim/transfer', {
            id: simId,
            currentType: currentType,
            targetType: targetType,
            targetData: targetData
        })
        
        showToast(res.data.message || 'Aktarım işlemi başarıyla tamamlandı.')
        selectedSim.value = null
        searchQuery.value = ''
        fetchData()
    } catch (err) {
        showToast(err.response?.data?.message || 'Aktarım hatası', 'error')
    } finally {
        loading.value = false
    }
}



const saveSim = async () => {
    if (!form.value.phone_no || !form.value.operator) {
        alert('Lütfen zorunlu alanları (Telefon ve Operatör) doldurunuz!')
        return
    }

    try {
        const endpoint = simType.value === 'm2m' ? '/sim-takip/api/m2m' : 
                         simType.value === 'data' ? '/sim-takip/api/data' : 
                         '/sim-takip/api/voice'
        
        await api.post(endpoint, form.value)
        
        recentAdditions.value.unshift({
            id: Date.now(),
            phone: form.value.phone_no,
            type: simType.value,
            time: new Date().toLocaleTimeString()
        })

        if (recentAdditions.value.length > 5) recentAdditions.value.pop()

        showToast(`${simType.value.toUpperCase()} hattı başarıyla eklendi!`)
        resetForm()
    } catch (err) {
        showToast(err.response?.data?.message || err.response?.data?.error || 'Kayıt hatası', 'error')
    }
}

const quickAddSims = async () => {
    if (!quickAddText.value || !form.value.operator) {
        showToast('Lütfen operatör seçin ve numaraları girin!', 'error')
        return
    }

    const numbers = quickAddText.value.split(/[\n,]+/).map(n => n.trim()).filter(n => n)
    if (numbers.length === 0) return

    loading.value = true
    let successCount = 0
    let errors = []

    try {
        const endpoint = simType.value === 'm2m' ? '/sim-takip/api/m2m' : 
                         simType.value === 'data' ? '/sim-takip/api/data' : 
                         '/sim-takip/api/voice'

        for (const num of numbers) {
            try {
                await api.post(endpoint, {
                    ...form.value,
                    phone_no: num,
                    iccid: '' // Quick add usually doesn't have ICCID initially
                })
                successCount++
            } catch (err) {
                errors.push(`${num}: ${err.response?.data?.message || err.response?.data?.error || 'Hata'}`)
            }
        }

        showToast(`${successCount} hat başarıyla eklendi.${errors.length > 0 ? ' Hatalar: ' + errors.join(', ') : ''}`, errors.length > 0 ? 'error' : 'success')
        quickAddText.value = ''
        if (successCount > 0) fetchData()
    } finally {
        loading.value = false
    }
}

// Excel Logic
const bulkData = ref([])
const fileInput = ref(null)

const downloadTemplate = (type) => {
    let headers = [['Telefon Numarası*', 'Operatör*', 'Şirket', 'ICCID', 'Durum', 'Paket']]
    let example = [['05321234567', 'Turkcell', 'Talay Logistics', '8990...', 'Aktif', 'Paket Adı']]

    if (type === 'data') {
        headers[0].push('Konum')
        example[0].push('Tuzla Antrepo')
    } else if (type === 'voice') {
        headers[0].push('Atanan Personel')
        example[0].push('Ahmet Yılmaz')
    }

    const ws = XLSX.utils.aoa_to_sheet([...headers, ...example])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Veri Girişi")
    XLSX.writeFile(wb, `Sim_Sablon_${type}.xlsx`)
}

const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
        const bstr = evt.target.result
        const wb = XLSX.read(bstr, { type: 'binary' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const data = XLSX.utils.sheet_to_json(ws)
        bulkData.value = data.map(row => ({
            phone_no: row['Telefon Numarası*'] || row['Telefon Numarası'],
            operator: row['Operatör*'] || row['Operatör'],
            isValid: !!(row['Telefon Numarası*'] || row['Telefon Numarası'])
        }))
        // Backend integration for bulk upload will go here if requested
    }
    reader.readAsBinaryString(file)
}
</script>

<template>
    <div class="h-full flex flex-col bg-[#f8f9fa] overflow-hidden">
        <!-- Toast Notifications -->
        <div class="fixed top-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
            <transition-group name="toast">
                <div v-for="toast in toasts" :key="toast.id"
                    class="px-5 py-3 rounded-xl shadow-2xl text-[13px] font-semibold pointer-events-auto flex items-center gap-3 min-w-[280px] backdrop-blur-lg border animate-slide-in-right"
                    :class="toast.type === 'error' ? 'bg-red-50/95 text-red-700 border-red-200' : 'bg-emerald-50/95 text-emerald-700 border-emerald-200'">
                    <div class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                        :class="toast.type === 'error' ? 'bg-red-100' : 'bg-emerald-100'">
                        <i class="fas text-[11px]" :class="toast.type === 'error' ? 'fa-times' : 'fa-check'"></i>
                    </div>
                    {{ toast.message }}
                </div>
            </transition-group>
        </div>

        <!-- Delete Confirmation Modal -->
        <transition name="modal">
            <div v-if="deleteModal.show" class="fixed inset-0 z-[9998] flex items-center justify-center p-4" @click.self="closeDeleteModal">
                <div class="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>
                <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5 animate-scale-in">
                    <div class="flex items-center gap-3">
                        <div class="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center text-red-500">
                            <i class="fas fa-trash-alt text-lg"></i>
                        </div>
                        <div>
                            <h3 class="text-[15px] font-bold text-gray-800">Silme Onayı</h3>
                            <p class="text-[12px] text-gray-400 mt-0.5">Bu işlem geri alınamaz.</p>
                        </div>
                    </div>
                    <div class="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <p class="text-[13px] text-gray-600"><span class="font-bold text-gray-800">{{ deleteModal.name }}</span> kaydını silmek istediğinize emin misiniz?</p>
                    </div>
                    <div class="flex gap-3">
                        <button @click="closeDeleteModal" class="flex-1 h-11 rounded-xl border border-gray-200 text-[12px] font-bold text-gray-500 hover:bg-gray-50 transition-all">
                            Vazgeç
                        </button>
                        <button @click="confirmDelete" class="flex-1 h-11 rounded-xl bg-red-500 text-white text-[12px] font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-200">
                            Evet, Sil
                        </button>
                    </div>
                </div>
            </div>
        </transition>

        <div class="flex-1 overflow-hidden flex flex-col p-4">
            <!-- Main Content Container (fills the screen minus sidebar) -->
            <div class="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
                
                <!-- 1. SIM CARDS (Transfer/Management) -->
                <div v-if="activeTab === 'simcards'" class="flex-1 flex flex-col bg-white">
                    <!-- Sub-Header for SIM Management -->
                    <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                <i class="fas fa-sim-card"></i>
                            </div>
                            <h2 class="text-[15px] font-bold text-gray-800">Hat Yönetimi & Akıllı Aktarım</h2>
                        </div>
                        <div class="flex bg-gray-50 p-1 rounded-lg border border-gray-100">
                            <button v-for="m in [{id:'transfer', n:'Hat Aktar', i:'fa-exchange-alt'}, {id:'single', n:'Yeni Hat', i:'fa-plus'}, {id:'bulk', n:'Excel', i:'fa-file-excel'}]" 
                                :key="m.id" @click="uploadMode = m.id; selectedSim = null; searchQuery = ''"
                                class="flex items-center gap-2 px-4 py-1.5 rounded-md text-[11px] font-bold transition-all"
                                :class="uploadMode === m.id ? 'bg-white text-blue-600 shadow-sm border border-gray-100' : 'text-gray-400 hover:text-gray-600'">
                                <i class="fas" :class="m.i"></i> {{ m.n }}
                            </button>
                        </div>
                    </div>

                    <!-- Mode: TRANSFER -->
                    <div v-if="uploadMode === 'transfer'" class="flex-1 flex flex-col overflow-hidden">
                        <!-- Search Bar Area -->
                        <div class="p-6 border-b border-gray-50 bg-gray-50/30">
                            <div class="max-w-2xl mx-auto relative">
                                <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                                <input v-model="searchQuery" @input="searchSims" type="text"
                                    placeholder="Telefon veya ICCID ile anında bulun..."
                                    class="w-full h-12 bg-white border border-gray-200 pl-11 pr-4 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none text-[14px] transition-all">
                                
                                <!-- Search Results Dropdown -->
                                <div v-if="searchResults.length > 0" class="absolute z-50 left-0 right-0 mt-2 bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden divide-y divide-gray-50">
                                    <button v-for="res in searchResults" :key="res.id + res.type" 
                                        @click="selectSimForTransfer(res)"
                                        class="w-full px-5 py-3.5 flex items-center justify-between hover:bg-gray-50 transition-colors text-left">
                                        <div class="flex items-center gap-4">
                                            <div class="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-[10px] uppercase bg-gray-100 text-gray-500">
                                                {{ res.type }}
                                            </div>
                                            <div class="flex flex-col">
                                                <span class="text-[14px] font-bold text-gray-700 leading-none mb-1">{{ res.phone_no || 'No Yok' }}</span>
                                                <span class="text-[11px] text-gray-400 font-mono">{{ res.iccid || 'ICCID Yok' }}</span>
                                            </div>
                                        </div>
                                        <div class="text-right">
                                            <div class="text-[12px] text-gray-500 font-medium">
                                                {{ res.type === 'm2m' ? (res.plate_no || 'Stok') : res.type === 'data' ? (res.location_name || 'Stok') : (res.personnel_name || 'Stok') }}
                                            </div>
                                            <span class="text-[10px] text-gray-400 uppercase tracking-tighter">{{ res.operator }}</span>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- Transfer Action Area -->
                        <div class="flex-1 overflow-y-auto p-6">
                            <div v-if="selectedSim" class="max-w-4xl mx-auto grid grid-cols-2 gap-6">
                                <!-- LEFT: Current State -->
                                <div class="space-y-4">
                                    <h3 class="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">MEVCUT DURUM</h3>
                                    <div class="bg-gray-50/50 p-6 rounded-xl border border-gray-100 space-y-6">
                                        <div class="flex items-center gap-4">
                                            <div class="w-12 h-12 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-gray-400">
                                                <i class="fas fa-sim-card text-xl"></i>
                                            </div>
                                            <div>
                                                <p class="text-[10px] text-gray-400 font-bold uppercase tracking-tight">{{ selectedSim.type }} HATTI</p>
                                                <p class="text-[18px] font-black text-gray-800">{{ selectedSim.phone_no }}</p>
                                            </div>
                                        </div>
                                        <div class="p-4 bg-white border border-gray-100 rounded-xl">
                                            <p class="text-[9px] text-gray-400 font-bold uppercase mb-2">Atandığı Yer</p>
                                            <div class="flex items-center gap-3">
                                                <i class="fas text-[16px] text-gray-400" :class="selectedSim.type === 'm2m' ? 'fa-truck' : selectedSim.type === 'data' ? 'fa-building' : 'fa-user'"></i>
                                                <span class="text-[14px] font-bold text-gray-700">
                                                    {{ selectedSim.type === 'm2m' ? (selectedSim.plate_no || 'Depo / Stok') : selectedSim.type === 'data' ? (selectedSim.location_name || 'Depo / Stok') : (selectedSim.personnel_name || 'Depo / Stok') }}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- RIGHT: New Assignment -->
                                <div class="space-y-4">
                                    <h3 class="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">YENİ HEDEF</h3>
                                    <div class="bg-white p-6 rounded-xl border border-blue-100 shadow-sm ring-4 ring-blue-50/30 space-y-6">
                                        <div class="grid grid-cols-2 gap-2">
                                            <button v-for="t in ['vehicle', 'personnel', 'location', 'stock']" :key="t"
                                                @click="transferTargetType = t; transferTargetId = ''"
                                                class="py-2.5 rounded-lg text-[11px] font-bold border transition-all"
                                                :class="transferTargetType === t ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'">
                                                {{ t === 'vehicle' ? 'Araç' : t === 'personnel' ? 'Personel' : t === 'location' ? 'Lokasyon' : 'Stok' }}
                                            </button>
                                        </div>
                                        <div v-if="transferTargetType !== 'stock'" class="space-y-1">
                                            <select v-model="transferTargetId" class="w-full h-11 bg-gray-50 border border-gray-200 px-4 rounded-lg outline-none text-[13px] focus:bg-white focus:border-blue-500">
                                                <option value="">Hedef Seçiniz...</option>
                                                <template v-if="transferTargetType === 'vehicle'"><option v-for="v in vehicles" :key="v.id" :value="v.id">{{ v.plate_no }}</option></template>
                                                <template v-else-if="transferTargetType === 'personnel'"><option v-for="p in personnel" :key="p.id" :value="p.id">{{ p.first_name }} {{ p.last_name }}</option></template>
                                                <template v-else-if="transferTargetType === 'location'"><option v-for="l in locations" :key="l.id" :value="l.id">{{ l.name }}</option></template>
                                            </select>
                                        </div>
                                        <button @click="performTransfer" :disabled="loading" 
                                            class="w-full h-11 bg-blue-600 text-white rounded-lg font-bold uppercase tracking-wide hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200">
                                            Transferi Gerçekleştir
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div v-else class="h-full flex flex-col items-center justify-center text-center opacity-40">
                                <i class="fas fa-search text-3xl mb-3"></i>
                                <p class="text-[15px] font-bold">Arama yaparak başlayın</p>
                                <p class="text-[12px]">Hattın numarasını veya ICCID bilgisini girin</p>
                            </div>
                        </div>
                    </div>

                    <!-- Mode: SINGLE -->
                    <!-- Mode: SINGLE -->
                    <div v-else-if="uploadMode === 'single'" class="flex-1 overflow-y-auto p-8 bg-white">
                        <div class="max-w-xl mx-auto space-y-8">
                            <div class="flex items-center gap-3 border-b border-gray-100 pb-4">
                                <i class="fas fa-plus-circle text-blue-500"></i>
                                <h3 class="text-[15px] font-bold text-gray-800">YENİ HAT KAYDI</h3>
                            </div>
                            <div class="grid grid-cols-2 gap-6">
                                <div class="space-y-2">
                                    <label class="text-[10px] font-bold text-gray-400 uppercase ml-1">TELEFON</label>
                                    <input v-model="form.phone_no" type="text" placeholder="05xx..." 
                                        class="w-full h-11 bg-gray-50 border border-gray-200 px-4 rounded-lg outline-none focus:bg-white focus:border-blue-500 transition-all text-[13px]">
                                </div>
                                <div class="space-y-2">
                                    <label class="text-[10px] font-bold text-gray-400 uppercase ml-1">ICCID</label>
                                    <input v-model="form.iccid" type="text" placeholder="8990..." 
                                        class="w-full h-11 bg-gray-50 border border-gray-200 px-4 rounded-lg outline-none focus:bg-white focus:border-blue-500 transition-all text-[13px]">
                                </div>
                            </div>
                            <div class="grid grid-cols-2 gap-6">
                                <div class="space-y-2">
                                    <label class="text-[10px] font-bold text-gray-400 uppercase ml-1">TİP</label>
                                    <select v-model="selectedTable" class="w-full h-11 bg-gray-50 border border-gray-200 px-4 rounded-lg outline-none cursor-pointer focus:bg-white focus:border-blue-500 text-[13px]">
                                        <option value="sim_m2m">M2M Hattı</option>
                                        <option value="sim_data">Data Hattı</option>
                                        <option value="sim_voice">Ses Hattı</option>
                                    </select>
                                </div>
                                <div class="space-y-2">
                                    <label class="text-[10px] font-bold text-gray-400 uppercase ml-1">OPERATÖR</label>
                                    <select v-model="form.operator" class="w-full h-11 bg-gray-50 border border-gray-200 px-4 rounded-lg outline-none cursor-pointer focus:bg-white focus:border-blue-500 text-[13px]">
                                        <option value="">Seçiniz...</option>
                                        <option v-for="op in operators" :key="op.id" :value="op.name">{{ op.name }}</option>
                                    </select>
                                </div>
                            </div>
                            <button @click="saveSim" :disabled="loading" 
                                class="w-full h-12 bg-blue-600 text-white rounded-lg font-bold shadow-lg hover:bg-blue-700 transition-all uppercase tracking-wide">
                                Sisteme Kaydet
                            </button>
                        </div>
                    </div>

                    <!-- Mode: BULK -->
                    <div v-else-if="uploadMode === 'bulk'" class="flex-1 flex flex-col items-center justify-center p-8">
                        <div class="max-w-md w-full bg-white p-10 rounded-2xl border-2 border-dashed border-gray-100 flex flex-col items-center text-center space-y-6">
                            <div class="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center text-green-600 mb-2">
                                <i class="fas fa-file-excel text-2xl"></i>
                            </div>
                            <div>
                                <h3 class="text-[16px] font-bold text-gray-800">Toplu Excel Yükleme</h3>
                                <p class="text-[12px] text-gray-400 mt-1">Lütfen formatın doğruluğundan emin olun.</p>
                            </div>
                            <div class="w-full space-y-3">
                                <select v-model="selectedTable" class="w-full h-11 bg-gray-50 border border-gray-200 px-4 rounded-lg outline-none text-[13px] cursor-pointer">
                                    <option value="sim_m2m">M2M Tablosu</option>
                                    <option value="sim_data">Data Tablosu</option>
                                    <option value="sim_voice">Ses Tablosu</option>
                                </select>
                                <input type="file" ref="fileInput" @change="handleFileUpload" class="hidden">
                                <button @click="$refs.fileInput.click()" 
                                    class="w-full bg-gray-900 text-white h-11 rounded-lg text-[12px] font-bold hover:bg-black transition-all shadow-sm">
                                    DOSYA SEÇ VE YÜKLE
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 2. MANAGEMENT VIEWS (Companies, Personnel, etc.) -->
                <div v-else class="flex-1 flex flex-col overflow-hidden bg-white">
                    <!-- Dynamic Header -->
                    <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
                        <div class="flex items-center gap-3">
                            <div class="w-9 h-9 rounded-xl flex items-center justify-center text-white bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-200">
                                <i class="fas text-[13px]" :class="categories.flatMap(c => c.tabs).find(t => t.id === activeTab)?.icon"></i>
                            </div>
                            <div>
                                <h2 class="text-[15px] font-bold text-gray-800">
                                    {{ categories.flatMap(c => c.tabs).find(t => t.id === activeTab)?.name }} Yönetimi
                                </h2>
                                <p class="text-[11px] text-gray-400">Kayıt ekle, düzenle veya kaldır</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-3">
                            <div class="text-[11px] font-bold text-blue-600 bg-blue-50 px-4 py-1.5 rounded-full border border-blue-100">
                                {{ totalListCount }} KAYIT
                            </div>
                        </div>
                    </div>

                    <div class="flex-1 overflow-y-auto p-6 bg-gray-50/30">
                        <div class="max-w-4xl mx-auto space-y-6">

                            <!-- Edit Mode Banner -->
                            <div v-if="editingItem" class="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between animate-fade-in">
                                <div class="flex items-center gap-3">
                                    <div class="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
                                        <i class="fas fa-pen text-[11px]"></i>
                                    </div>
                                    <span class="text-[13px] font-semibold text-amber-700">Düzenleme modu aktif — Değişikliklerinizi kaydedin veya iptal edin.</span>
                                </div>
                                <button @click="cancelEdit" class="text-[11px] text-amber-600 font-bold uppercase px-3 py-1.5 hover:bg-amber-100 rounded-lg transition-colors">
                                    <i class="fas fa-times mr-1"></i> İptal
                                </button>
                            </div>

                            <!-- Add/Edit Form -->
                            <div class="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
                                <h3 class="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                    <i class="fas fa-plus-circle text-blue-400"></i>
                                    {{ editingItem ? 'KAYIT DÜZENLEME' : 'YENİ KAYIT EKLEME' }}
                                </h3>

                                <div v-if="activeTab === 'operators'" class="flex gap-3">
                                    <input v-model="newOperator" type="text" placeholder="Operatör adı..."
                                        class="flex-1 h-11 bg-gray-50 border border-gray-200 px-4 rounded-xl focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 outline-none text-[13px] transition-all">
                                    <button @click="addOperator"
                                        class="bg-blue-600 text-white px-8 h-11 rounded-xl font-bold text-[12px] hover:bg-blue-700 transition-all uppercase shadow-lg shadow-blue-200 hover:shadow-blue-300">
                                        {{ editingItem ? 'Güncelle' : 'Ekle' }}
                                    </button>
                                </div>

                                <div v-else-if="activeTab === 'companies'" class="space-y-3">
                                    <div class="flex gap-3">
                                        <input v-model="newCompany.name" type="text" placeholder="Şirket adı..."
                                            class="flex-1 h-11 bg-gray-50 border border-gray-200 px-4 rounded-xl focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 outline-none text-[13px] transition-all">
                                        <button @click="addCompany"
                                            class="bg-blue-600 text-white px-8 h-11 rounded-xl font-bold text-[12px] hover:bg-blue-700 transition-all uppercase shadow-lg shadow-blue-200">
                                            {{ editingItem ? 'Güncelle' : 'Ekle' }}
                                        </button>
                                    </div>
                                    <input v-model="newCompany.notes" type="text" placeholder="Kısa not veya açıklama..."
                                        class="w-full h-11 bg-gray-50 border border-gray-200 px-4 rounded-xl focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 outline-none text-[13px] transition-all">
                                </div>

                                <div v-else-if="activeTab === 'packages'" class="space-y-3">
                                    <div class="flex gap-3">
                                        <input v-model="newPackage.name" type="text" placeholder="Paket adı (örn: 10GB)"
                                            class="flex-1 h-11 bg-gray-50 border border-gray-200 px-4 rounded-xl focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 outline-none text-[13px] transition-all">
                                        <select v-model="newPackage.type" class="w-32 h-11 bg-gray-50 border border-gray-200 px-3 rounded-xl outline-none text-[13px] cursor-pointer">
                                            <option value="m2m">M2M</option>
                                            <option value="data">Data</option>
                                            <option value="voice">Ses</option>
                                        </select>
                                    </div>
                                    <div class="flex gap-3">
                                        <select v-model="newPackage.operator_id" class="flex-1 h-11 bg-gray-50 border border-gray-200 px-4 rounded-xl outline-none text-[13px] cursor-pointer">
                                            <option value="">Operatör Seçin...</option>
                                            <option v-for="op in operators" :key="op.id" :value="op.id">{{ op.name }}</option>
                                        </select>
                                        <input v-model="newPackage.price" type="number" placeholder="Birim Fiyat"
                                            class="w-32 h-11 bg-gray-50 border border-gray-200 px-4 rounded-xl outline-none text-[13px]">
                                        <button @click="addPackage"
                                            class="bg-blue-600 text-white px-8 h-11 rounded-xl font-bold text-[12px] hover:bg-blue-700 transition-all uppercase shadow-lg shadow-blue-200">
                                            {{ editingItem ? 'Kaydet' : 'Ekle' }}
                                        </button>
                                    </div>
                                </div>

                                <div v-else-if="activeTab === 'vehicles'" class="flex gap-3">
                                    <input v-model="newVehicle.plate_no" type="text" placeholder="Plaka (Örn: 34ABC123)"
                                        class="flex-1 h-11 bg-gray-50 border border-gray-200 px-4 rounded-xl focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 outline-none text-[13px] transition-all">
                                    <select v-model="newVehicle.vehicle_type" class="w-40 h-11 bg-gray-50 border border-gray-200 px-3 rounded-xl outline-none text-[13px] cursor-pointer">
                                        <option v-for="vt in vehicleTypesArr" :key="vt" :value="vt">{{ vt }}</option>
                                    </select>
                                    <button @click="addVehicle"
                                        class="bg-blue-600 text-white px-8 h-11 rounded-xl font-bold text-[12px] hover:bg-blue-700 transition-all uppercase shadow-lg shadow-blue-200">
                                        {{ editingItem ? 'Güncelle' : 'Ekle' }}
                                    </button>
                                </div>

                                <div v-else-if="activeTab === 'locations'" class="space-y-3">
                                    <div class="flex gap-3">
                                        <input v-model="newLocation.name" type="text" placeholder="Lokasyon/Şantiye adı..."
                                            class="flex-1 h-11 bg-gray-50 border border-gray-200 px-4 rounded-xl focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 outline-none text-[13px] transition-all">
                                        <button @click="addLocation"
                                            class="bg-blue-600 text-white px-8 h-11 rounded-xl font-bold text-[12px] hover:bg-blue-700 transition-all uppercase shadow-lg shadow-blue-200">
                                            {{ editingItem ? 'Güncelle' : 'Ekle' }}
                                        </button>
                                    </div>
                                    <input v-model="newLocation.address" type="text" placeholder="Kısa Adres (Opsiyonel)..."
                                        class="w-full h-11 bg-gray-50 border border-gray-200 px-4 rounded-xl focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 outline-none text-[13px] transition-all">
                                </div>

                                <div v-else-if="activeTab === 'personnel'" class="space-y-4">
                                    <div class="grid grid-cols-2 gap-3">
                                        <input v-model="newPerson.first_name" type="text" placeholder="Ad"
                                            class="h-11 bg-gray-50 border border-gray-200 px-4 rounded-xl focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 outline-none text-[13px] transition-all">
                                        <input v-model="newPerson.last_name" type="text" placeholder="Soyad"
                                            class="h-11 bg-gray-50 border border-gray-200 px-4 rounded-xl focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 outline-none text-[13px] transition-all">
                                    </div>
                                    <div class="grid grid-cols-2 gap-3">
                                        <div class="flex gap-2">
                                            <select v-model="newPerson.company_id" class="flex-1 h-11 bg-gray-50 border border-gray-200 px-4 rounded-xl outline-none text-[13px] cursor-pointer">
                                                <option value="">Şirket Seçin...</option>
                                                <option v-for="c in companies" :key="c.id" :value="c.id">{{ c.name }}</option>
                                            </select>
                                            <button @click="activeTab = 'companies'" class="w-11 h-11 bg-gray-100 text-gray-400 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all">
                                                <i class="fas fa-plus"></i>
                                            </button>
                                        </div>
                                        <div class="flex gap-2">
                                            <select v-model="newPerson.department_id" class="flex-1 h-11 bg-gray-50 border border-gray-200 px-4 rounded-xl outline-none text-[13px] cursor-pointer">
                                                <option value="">Departman Seçin...</option>
                                                <option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name }}</option>
                                            </select>
                                            <button @click="activeTab = 'departments'" class="w-11 h-11 bg-gray-100 text-gray-400 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all">
                                                <i class="fas fa-plus"></i>
                                            </button>
                                        </div>
                                    </div>
                                    <button @click="addPerson" class="w-full h-11 bg-blue-600 text-white rounded-xl font-bold uppercase tracking-wide hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200">
                                        {{ editingItem ? 'PERSONEL BİLGİLERİNİ GÜNCELLE' : 'YENİ PERSONEL EKLE' }}
                                    </button>
                                </div>

                                <div v-else-if="activeTab === 'departments'" class="flex gap-3">
                                    <input v-model="newDepartment.name" type="text" placeholder="Departman adı (Örn: IT, Lojistik)..."
                                        class="flex-1 h-11 bg-gray-50 border border-gray-200 px-4 rounded-xl focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 outline-none text-[13px] transition-all">
                                    <button @click="addDepartment"
                                        class="bg-blue-600 text-white px-8 h-11 rounded-xl font-bold text-[12px] hover:bg-blue-700 transition-all uppercase shadow-lg shadow-blue-200">
                                        {{ editingItem ? 'Güncelle' : 'Ekle' }}
                                    </button>
                                </div>
                            </div>

                            <!-- Search + List Section -->
                            <div class="space-y-3">
                                <!-- Search Bar -->
                                <div class="relative">
                                    <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 text-[12px]"></i>
                                    <input v-model="listSearchQuery" type="text" placeholder="Kayıtlarda ara..."
                                        class="w-full h-10 bg-white border border-gray-200 pl-10 pr-4 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none text-[13px] transition-all">
                                    <div v-if="listSearchQuery" class="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                        <span class="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{{ currentListData.length }}/{{ totalListCount }}</span>
                                        <button @click="listSearchQuery = ''" class="text-gray-400 hover:text-gray-600"><i class="fas fa-times text-[10px]"></i></button>
                                    </div>
                                </div>

                                <!-- Select All Toggle -->
                                <div class="px-2 pb-1 flex items-center justify-between">
                                    <div class="flex items-center gap-2 cursor-pointer group" @click="toggleSelectAll">
                                        <div class="w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shadow-sm"
                                            :class="selectedIds.length === currentListData.length && currentListData.length > 0 ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-200 group-hover:border-blue-400 bg-white'">
                                            <i v-if="selectedIds.length === currentListData.length && currentListData.length > 0" class="fas fa-check text-[10px]"></i>
                                            <div v-else-if="selectedIds.length > 0" class="w-2 h-0.5 bg-blue-400 rounded-full"></div>
                                        </div>
                                        <span class="text-[11px] font-bold text-gray-500 group-hover:text-blue-600 transition-colors uppercase tracking-tight">Tümünü Seç ({{ currentListData.length }})</span>
                                    </div>
                                    <span v-if="selectedIds.length > 0" class="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                                        {{ selectedIds.length }} SEÇİLİ
                                    </span>
                                </div>

                                <!-- List -->
                                <div v-if="currentListData.length > 0" class="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                                    <template v-if="activeTab === 'operators'">
                                        <div v-for="(op, idx) in filteredOperators" :key="op.id" @click="toggleSelect(op.id)" class="group px-5 py-3.5 flex justify-between items-center hover:bg-blue-50/30 transition-all border-b border-gray-50 last:border-0 cursor-pointer">
                                            <div class="flex items-center gap-3">
                                                <!-- Checkbox -->
                                                <div class="w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0"
                                                    :class="selectedIds.includes(op.id) ? 'bg-blue-600 border-blue-600 text-white shadow-sm' : 'border-gray-100 group-hover:border-blue-200 bg-white'">
                                                    <i v-if="selectedIds.includes(op.id)" class="fas fa-check text-[10px]"></i>
                                                </div>
                                                <span class="text-[10px] font-bold text-gray-300 w-5 text-right">{{ idx + 1 }}</span>
                                                <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center text-purple-400"><i class="fas fa-broadcast-tower text-[11px]"></i></div>
                                                <span class="text-[13px] font-semibold text-gray-700">{{ op.name }}</span>
                                            </div>
                                            <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button @click="startEditOperator(op)" class="w-8 h-8 flex items-center justify-center text-blue-400 hover:bg-blue-100 rounded-lg transition-all"><i class="fas fa-edit text-[11px]"></i></button>
                                                <button @click="showDeleteModal('operator', op.id, op.name)" class="w-8 h-8 flex items-center justify-center text-red-400 hover:bg-red-100 rounded-lg transition-all"><i class="fas fa-trash-alt text-[11px]"></i></button>
                                            </div>
                                        </div>
                                    </template>

                                    <template v-else-if="activeTab === 'companies'">
                                        <div v-for="(comp, idx) in filteredCompanies" :key="comp.id" @click="toggleSelect(comp.id)" class="group px-5 py-3.5 flex justify-between items-center hover:bg-blue-50/30 transition-all border-b border-gray-50 last:border-0 cursor-pointer">
                                            <div class="flex items-center gap-3">
                                                <!-- Checkbox -->
                                                <div class="w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0"
                                                    :class="selectedIds.includes(comp.id) ? 'bg-blue-600 border-blue-600 text-white shadow-sm' : 'border-gray-100 group-hover:border-blue-200 bg-white'">
                                                    <i v-if="selectedIds.includes(comp.id)" class="fas fa-check text-[10px]"></i>
                                                </div>
                                                <span class="text-[10px] font-bold text-gray-300 w-5 text-right">{{ idx + 1 }}</span>
                                                <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center text-blue-400"><i class="fas fa-building text-[11px]"></i></div>
                                                <div class="flex flex-col">
                                                    <span class="text-[13px] font-semibold text-gray-700 leading-tight">{{ comp.name }}</span>
                                                    <span class="text-[11px] text-gray-400">{{ comp.notes || '—' }}</span>
                                                </div>
                                            </div>
                                            <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button @click="startEditCompany(comp)" class="w-8 h-8 flex items-center justify-center text-blue-400 hover:bg-blue-100 rounded-lg transition-all"><i class="fas fa-edit text-[11px]"></i></button>
                                                <button @click="showDeleteModal('company', comp.id, comp.name)" class="w-8 h-8 flex items-center justify-center text-red-400 hover:bg-red-100 rounded-lg transition-all"><i class="fas fa-trash-alt text-[11px]"></i></button>
                                            </div>
                                        </div>
                                    </template>

                                    <template v-else-if="activeTab === 'packages'">
                                        <div v-for="(pkg, idx) in filteredPackages" :key="pkg.id" @click="toggleSelect(pkg.id)" class="group px-5 py-3.5 flex justify-between items-center hover:bg-blue-50/30 transition-all border-b border-gray-50 last:border-0 cursor-pointer">
                                            <div class="flex items-center gap-3">
                                                <!-- Checkbox -->
                                                <div class="w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0"
                                                    :class="selectedIds.includes(pkg.id) ? 'bg-blue-600 border-blue-600 text-white shadow-sm' : 'border-gray-100 group-hover:border-blue-200 bg-white'">
                                                    <i v-if="selectedIds.includes(pkg.id)" class="fas fa-check text-[10px]"></i>
                                                </div>
                                                <span class="text-[10px] font-bold text-gray-300 w-5 text-right">{{ idx + 1 }}</span>
                                                <div class="w-8 h-8 rounded-lg flex items-center justify-center" :class="pkg.type === 'm2m' ? 'bg-gradient-to-br from-blue-50 to-blue-100 text-blue-400' : pkg.type === 'data' ? 'bg-gradient-to-br from-cyan-50 to-cyan-100 text-cyan-400' : 'bg-gradient-to-br from-pink-50 to-pink-100 text-pink-400'"><i class="fas fa-box-open text-[11px]"></i></div>
                                                <div class="flex flex-col">
                                                    <span class="text-[13px] font-semibold text-gray-700 leading-tight">{{ pkg.name }}</span>
                                                    <span class="text-[11px] text-gray-400">{{ pkg.operator_name }} · <span class="text-gray-700 font-bold">{{ pkg.price }}₺</span></span>
                                                </div>
                                            </div>
                                            <div class="flex items-center gap-2">
                                                <span class="text-[9px] px-2 py-1 rounded-md font-black uppercase" :class="pkg.type === 'm2m' ? 'bg-blue-50 text-blue-500' : pkg.type === 'data' ? 'bg-cyan-50 text-cyan-500' : 'bg-pink-50 text-pink-500'">{{ pkg.type }}</span>
                                                <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button @click="startEditPackage(pkg)" class="w-8 h-8 flex items-center justify-center text-blue-400 hover:bg-blue-100 rounded-lg transition-all"><i class="fas fa-edit text-[11px]"></i></button>
                                                    <button @click="showDeleteModal('package', pkg.id, pkg.name)" class="w-8 h-8 flex items-center justify-center text-red-400 hover:bg-red-100 rounded-lg transition-all"><i class="fas fa-trash-alt text-[11px]"></i></button>
                                                </div>
                                            </div>
                                        </div>
                                    </template>

                                    <template v-else-if="activeTab === 'vehicles'">
                                        <div v-for="(v, idx) in filteredVehicles" :key="v.id" @click="toggleSelect(v.id)" class="group px-5 py-3.5 flex justify-between items-center hover:bg-blue-50/30 transition-all border-b border-gray-50 last:border-0 cursor-pointer">
                                            <div class="flex items-center gap-3">
                                                <!-- Checkbox -->
                                                <div class="w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0"
                                                    :class="selectedIds.includes(v.id) ? 'bg-blue-600 border-blue-600 text-white shadow-sm' : 'border-gray-100 group-hover:border-blue-200 bg-white'">
                                                    <i v-if="selectedIds.includes(v.id)" class="fas fa-check text-[10px]"></i>
                                                </div>
                                                <span class="text-[10px] font-bold text-gray-300 w-5 text-right">{{ idx + 1 }}</span>
                                                <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-50 to-amber-100 flex items-center justify-center text-amber-500"><i class="fas fa-truck-moving text-[11px]"></i></div>
                                                <div class="flex flex-col">
                                                    <span class="text-[13px] font-bold text-gray-700 leading-tight uppercase tracking-wide">{{ v.plate_no }}</span>
                                                    <span class="text-[11px] text-gray-400">{{ v.vehicle_type }}</span>
                                                </div>
                                            </div>
                                            <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button @click="startEditVehicle(v)" class="w-8 h-8 flex items-center justify-center text-blue-400 hover:bg-blue-100 rounded-lg transition-all"><i class="fas fa-edit text-[11px]"></i></button>
                                                <button @click="showDeleteModal('vehicle', v.id, v.plate_no)" class="w-8 h-8 flex items-center justify-center text-red-400 hover:bg-red-100 rounded-lg transition-all"><i class="fas fa-trash-alt text-[11px]"></i></button>
                                            </div>
                                        </div>
                                    </template>

                                    <template v-else-if="activeTab === 'locations'">
                                        <div v-for="(l, idx) in filteredLocations" :key="l.id" @click="toggleSelect(l.id)" class="group px-5 py-3.5 flex justify-between items-center hover:bg-blue-50/30 transition-all border-b border-gray-50 last:border-0 cursor-pointer">
                                            <div class="flex items-center gap-3">
                                                <!-- Checkbox -->
                                                <div class="w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0"
                                                    :class="selectedIds.includes(l.id) ? 'bg-blue-600 border-blue-600 text-white shadow-sm' : 'border-gray-100 group-hover:border-blue-200 bg-white'">
                                                    <i v-if="selectedIds.includes(l.id)" class="fas fa-check text-[10px]"></i>
                                                </div>
                                                <span class="text-[10px] font-bold text-gray-300 w-5 text-right">{{ idx + 1 }}</span>
                                                <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center text-emerald-400"><i class="fas fa-map-marker-alt text-[11px]"></i></div>
                                                <div class="flex flex-col">
                                                    <span class="text-[13px] font-semibold text-gray-700 leading-tight">{{ l.name }}</span>
                                                    <span class="text-[11px] text-gray-400">{{ l.address || 'Adres bilgisi yok' }}</span>
                                                </div>
                                            </div>
                                            <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button @click="startEditLocation(l)" class="w-8 h-8 flex items-center justify-center text-blue-400 hover:bg-blue-100 rounded-lg transition-all"><i class="fas fa-edit text-[11px]"></i></button>
                                                <button @click="showDeleteModal('location', l.id, l.name)" class="w-8 h-8 flex items-center justify-center text-red-400 hover:bg-red-100 rounded-lg transition-all"><i class="fas fa-trash-alt text-[11px]"></i></button>
                                            </div>
                                        </div>
                                    </template>

                                    <template v-else-if="activeTab === 'personnel'">
                                        <div v-for="(p, idx) in filteredPersonnel" :key="p.id" @click="toggleSelect(p.id)" class="group px-5 py-3.5 flex justify-between items-center hover:bg-blue-50/30 transition-all border-b border-gray-50 last:border-0 cursor-pointer">
                                            <div class="flex items-center gap-3">
                                                <!-- Checkbox -->
                                                <div class="w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0"
                                                    :class="selectedIds.includes(p.id) ? 'bg-blue-600 border-blue-600 text-white shadow-sm' : 'border-gray-100 group-hover:border-blue-200 bg-white'">
                                                    <i v-if="selectedIds.includes(p.id)" class="fas fa-check text-[10px]"></i>
                                                </div>
                                                <span class="text-[10px] font-bold text-gray-300 w-5 text-right">{{ idx + 1 }}</span>
                                                <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-50 to-indigo-100 flex items-center justify-center text-indigo-400"><i class="fas fa-user-tie text-[11px]"></i></div>
                                                <div class="flex flex-col">
                                                    <span class="text-[13px] font-semibold text-gray-700 leading-tight">{{ p.first_name }} {{ p.last_name }}</span>
                                                    <span class="text-[11px] text-gray-400">{{ p.company_name || '—' }} · {{ p.department_name || '—' }}</span>
                                                </div>
                                            </div>
                                            <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button @click="startEditPerson(p)" class="w-8 h-8 flex items-center justify-center text-blue-400 hover:bg-blue-100 rounded-lg transition-all"><i class="fas fa-edit text-[11px]"></i></button>
                                                <button @click="showDeleteModal('personnel', p.id, p.first_name + ' ' + p.last_name)" class="w-8 h-8 flex items-center justify-center text-red-400 hover:bg-red-100 rounded-lg transition-all"><i class="fas fa-trash-alt text-[11px]"></i></button>
                                            </div>
                                        </div>
                                    </template>

                                    <template v-else-if="activeTab === 'departments'">
                                        <div v-for="(d, idx) in filteredDepartments" :key="d.id" @click="toggleSelect(d.id)" class="group px-5 py-3.5 flex justify-between items-center hover:bg-blue-50/30 transition-all border-b border-gray-50 last:border-0 cursor-pointer">
                                            <div class="flex items-center gap-3">
                                                <!-- Checkbox -->
                                                <div class="w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0"
                                                    :class="selectedIds.includes(d.id) ? 'bg-blue-600 border-blue-600 text-white shadow-sm' : 'border-gray-100 group-hover:border-blue-200 bg-white'">
                                                    <i v-if="selectedIds.includes(d.id)" class="fas fa-check text-[10px]"></i>
                                                </div>
                                                <span class="text-[10px] font-bold text-gray-300 w-5 text-right">{{ idx + 1 }}</span>
                                                <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-50 to-teal-100 flex items-center justify-center text-teal-400"><i class="fas fa-sitemap text-[11px]"></i></div>
                                                <span class="text-[13px] font-semibold text-gray-700">{{ d.name }}</span>
                                            </div>
                                            <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button @click="startEditDepartment(d)" class="w-8 h-8 flex items-center justify-center text-blue-400 hover:bg-blue-100 rounded-lg transition-all"><i class="fas fa-edit text-[11px]"></i></button>
                                                <button @click="showDeleteModal('department', d.id, d.name)" class="w-8 h-8 flex items-center justify-center text-red-400 hover:bg-red-100 rounded-lg transition-all"><i class="fas fa-trash-alt text-[11px]"></i></button>
                                            </div>
                                        </div>
                                    </template>
                                </div>

                                <!-- Empty State -->
                                <div v-else class="bg-white rounded-xl border border-gray-200 p-12 flex flex-col items-center justify-center text-center">
                                    <div class="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-300 mb-4">
                                        <i class="fas fa-inbox text-2xl"></i>
                                    </div>
                                    <p class="text-[12px] text-gray-300 mt-1" v-if="listSearchQuery">Farklı bir arama terimi deneyin</p>
                                    <p class="text-[12px] text-gray-300 mt-1" v-else>Yukarıdaki formu kullanarak ilk kaydınızı ekleyin</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Loading Overlay -->
        <div v-if="loading" class="fixed inset-0 z-[10000] bg-white/60 backdrop-blur-[2px] flex items-center justify-center">
            <div class="flex flex-col items-center gap-3">
                <div class="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                <span class="text-[13px] font-black text-blue-600 tracking-widest animate-pulse">İŞLENİYOR...</span>
            </div>
        </div>

        <!-- Floating Bulk Action Bar -->
        <transition name="slide-up">
            <div v-if="selectedIds.length > 0" class="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] bg-gray-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-6 animate-slide-up border border-white/10 ring-8 ring-black/5">
                <div class="flex items-center gap-3 border-r border-gray-700 pr-6">
                    <div class="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center font-black text-[14px] shadow-lg shadow-blue-500/30">
                        {{ selectedIds.length }}
                    </div>
                    <span class="text-[13px] font-bold text-gray-300 uppercase tracking-tight">Kayıt Seçildi</span>
                </div>
                <div class="flex items-center gap-2">
                    <button @click="openBulkEditModal" class="flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-white/10 transition-all text-[12px] font-black uppercase tracking-wide">
                        <i class="fas fa-edit text-blue-400"></i> Toplu Düzenle
                    </button>
                    <button @click="showDeleteModal('bulk', null, `${selectedIds.length} kayıt`)" class="flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-red-500/20 text-red-400 transition-all text-[12px] font-black uppercase tracking-wide">
                        <i class="fas fa-trash-alt"></i> Toplu Sil
                    </button>
                </div>
                <button @click="selectedIds = []" class="ml-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-gray-500 hover:text-white">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </transition>

        <!-- Bulk Edit Modal -->
        <transition name="modal">
            <div v-if="isBulkEditModalShow" class="fixed inset-0 z-[9998] flex items-center justify-center p-4">
                <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="isBulkEditModalShow = false"></div>
                <div class="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 space-y-6 animate-scale-in">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <div class="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-sm border border-blue-100/50">
                                <i class="fas fa-edit text-xl"></i>
                            </div>
                            <div>
                                <h3 class="text-[17px] font-black text-gray-800 tracking-tight">Toplu Düzenleme</h3>
                                <p class="text-[12px] text-gray-400 font-medium">{{ selectedIds.length }} kayıt için ortak değerleri girin.</p>
                            </div>
                        </div>
                        <button @click="isBulkEditModalShow = false" class="text-gray-300 hover:text-gray-500 transition-colors"><i class="fas fa-times text-lg"></i></button>
                    </div>

                    <div class="space-y-4">
                        <!-- Personnel Specific -->
                        <template v-if="activeTab === 'personnel'">
                            <div class="space-y-2">
                                <label class="text-[10px] font-bold text-gray-400 uppercase ml-1">Yeni Şirket</label>
                                <select v-model="bulkEditForm.company_id" class="w-full h-12 bg-gray-50 border border-gray-200 px-4 rounded-xl outline-none text-[13px] focus:bg-white focus:border-blue-500">
                                    <option value="">Değişiklik Yok</option>
                                    <option v-for="c in companies" :key="c.id" :value="c.id">{{ c.name }}</option>
                                </select>
                            </div>
                            <div class="space-y-2">
                                <label class="text-[10px] font-bold text-gray-400 uppercase ml-1">Yeni Departman</label>
                                <select v-model="bulkEditForm.department_id" class="w-full h-12 bg-gray-50 border border-gray-200 px-4 rounded-xl outline-none text-[13px] focus:bg-white focus:border-blue-500">
                                    <option value="">Değişiklik Yok</option>
                                    <option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name }}</option>
                                </select>
                            </div>
                        </template>

                        <!-- Packages Specific -->
                        <template v-else-if="activeTab === 'packages'">
                            <div class="space-y-2">
                                <label class="text-[10px] font-bold text-gray-400 uppercase ml-1">Yeni Operatör</label>
                                <select v-model="bulkEditForm.operator_id" class="w-full h-12 bg-gray-50 border border-gray-200 px-4 rounded-xl outline-none text-[13px] focus:bg-white focus:border-blue-500">
                                    <option value="">Değişiklik Yok</option>
                                    <option v-for="op in operators" :key="op.id" :value="op.id">{{ op.name }}</option>
                                </select>
                            </div>
                            <div class="space-y-2">
                                <label class="text-[10px] font-bold text-gray-400 uppercase ml-1">Birim Fiyat Güncelle</label>
                                <input v-model="bulkEditForm.price" type="number" placeholder="Yeni fiyat..." class="w-full h-12 bg-gray-50 border border-gray-200 px-4 rounded-xl outline-none text-[13px] focus:bg-white focus:border-blue-500">
                            </div>
                        </template>

                        <div class="p-4 bg-amber-50 rounded-2xl border border-amber-100/50">
                            <p class="text-[11px] text-amber-700 leading-relaxed font-medium">
                                <i class="fas fa-info-circle mr-1"></i> Boş bıraktığınız alanlar mevcut değerlerini koruyacaktır. Sadece değiştirmek istediğiniz alanları doldurun.
                            </p>
                        </div>
                    </div>

                    <div class="flex gap-3 pt-2">
                        <button @click="isBulkEditModalShow = false" class="flex-1 h-12 rounded-2xl border-2 border-gray-100 text-[13px] font-black text-gray-400 hover:bg-gray-50 transition-all uppercase tracking-wide">
                            İptal
                        </button>
                        <button @click="confirmBulkEdit" class="flex-1 h-12 rounded-2xl bg-blue-600 text-white text-[13px] font-black shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all uppercase tracking-wide">
                            Güncelle
                        </button>
                    </div>
                </div>
            </div>
        </transition>
    </div>
</template>

<style scoped>
/* Scrollbar */
::-webkit-scrollbar { width: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }

.animate-fade-in { animation: fadeIn 0.3s ease-out; }
.animate-scale-in { animation: scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
.animate-slide-up { animation: slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }

@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
@keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
@keyframes slideUp { from { opacity: 0; transform: translate(-50%, 40px); } to { opacity: 1; transform: translate(-50%, 0); } }

@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
@keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
@keyframes slideUp { from { opacity: 0; transform: translate(-50%, 40px); } to { opacity: 1; transform: translate(-50%, 0); } }

/* Vue Transiton Animations */
.toast-enter-active, .toast-leave-active { transition: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55); }
.toast-enter-from { opacity: 0; transform: translateX(50px) scale(0.9); }
.toast-leave-to { opacity: 0; transform: translateX(50px) scale(0.9); }

.modal-enter-active, .modal-leave-active { transition: opacity 0.3s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }

.slide-up-enter-active, .slide-up-leave-active { transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }
.slide-up-enter-from { opacity: 0; transform: translate(-50%, 100px); }
.slide-up-leave-to { opacity: 0; transform: translate(-50%, 100px); }
</style>
