<template>
  <div class="h-full flex flex-col bg-white dark:bg-slate-900 overflow-hidden">
    <!-- HEADER -->
    <header class="h-16 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between px-8 bg-white dark:bg-slate-800 shrink-0">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-lg">
          <i class="fas fa-boxes"></i>
        </div>
        <div>
          <h1 class="text-base font-bold text-gray-900 dark:text-slate-100">Envanter & Donanım Tanımlamaları</h1>
          <p class="text-xs text-gray-400 dark:text-slate-500 font-medium">Donanım kategorileri, markalar, modeller ve envanter genel durum tanımları</p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <RouterLink to="/master-data/label-designer" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-sm">
          <i class="fas fa-ruler-combined"></i> Etiket Studio
        </RouterLink>
        <RouterLink to="/master-data/form-designer" class="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-sm">
          <i class="fas fa-file-signature"></i> A4 Zimmet Form Studio
        </RouterLink>
        <button @click="fetchData" class="px-3 py-1.5 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-300 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5">
          <i class="fas fa-sync-alt" :class="{ 'fa-spin': loading }"></i> Yenile
        </button>
      </div>
    </header>

    <!-- CONTENT -->
    <main class="flex-1 overflow-y-auto p-8 bg-gray-50/40 dark:bg-slate-900 space-y-6">

      <!-- 1. GENEL DURUM TANIMLARI (ASSET STATUSES) -->
      <div class="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6 shadow-sm flex flex-col">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="font-bold text-gray-900 dark:text-slate-100 text-sm flex items-center gap-2">
              <i class="fas fa-flag text-amber-500"></i> Envanter Genel Durum Tanımları ({{ assetStore.metadata.statuses?.length || 0 }})
            </h3>
            <p class="text-xs text-gray-400 dark:text-slate-500 font-normal mt-0.5">Varlık ekleme ve zimmetleme sırasında seçilecek genel durum seçeneklerini ekleyin, güncelleyin veya kaldırın.</p>
          </div>
        </div>

        <!-- Add Status Input -->
        <div class="flex gap-2 mb-4">
          <input
            v-model="newStatus"
            type="text"
            placeholder="Yeni durum adı (ör. Zimmet İçin Hazır Bekliyor, Test Aşamasında)..."
            class="flex-1 h-9 px-3 border border-gray-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-lg text-xs font-medium outline-none focus:border-amber-500"
            @keyup.enter="submitStatus"
          />
          <button @click="submitStatus" class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1">
            <i class="fas fa-plus text-[10px]"></i> Durum Ekle
          </button>
        </div>

        <!-- Statuses List Grid -->
        <div class="grid grid-cols-3 gap-3">
          <div
            v-for="st in assetStore.metadata.statuses"
            :key="st.id"
            class="p-3 bg-gray-50/70 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-xl flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
          >
            <!-- Normal Mode -->
            <template v-if="editingStatusId !== st.id">
              <div class="flex items-center gap-2 overflow-hidden">
                <span class="w-2 h-2 rounded-full bg-amber-400 shrink-0"></span>
                <span class="text-xs font-bold text-gray-800 dark:text-slate-200 truncate" :title="st.name">{{ st.name }}</span>
              </div>
              <div class="flex items-center gap-1 shrink-0 ml-2">
                <button @click="startEditStatus(st)" class="w-6 h-6 rounded-md hover:bg-white dark:hover:bg-slate-700 text-gray-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 flex items-center justify-center transition-colors" title="Düzenle">
                  <i class="fas fa-pencil-alt text-[11px]"></i>
                </button>
                <button @click="removeStatus(st.id)" class="w-6 h-6 rounded-md hover:bg-white dark:hover:bg-slate-700 text-gray-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 flex items-center justify-center transition-colors" title="Sil">
                  <i class="fas fa-trash-alt text-[11px]"></i>
                </button>
              </div>
            </template>

            <!-- Edit Mode -->
            <template v-else>
              <input
                v-model="editStatusName"
                type="text"
                class="flex-1 h-7 px-2 border border-blue-400 dark:bg-slate-900 rounded text-xs font-bold text-gray-900 dark:text-slate-100 outline-none"
                @keyup.enter="saveEditStatus(st.id)"
              />
              <div class="flex items-center gap-1 ml-2">
                <button @click="saveEditStatus(st.id)" class="w-6 h-6 bg-emerald-600 text-white rounded flex items-center justify-center" title="Kaydet">
                  <i class="fas fa-check text-[10px]"></i>
                </button>
                <button @click="editingStatusId = null" class="w-6 h-6 bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-slate-300 rounded flex items-center justify-center" title="İptal">
                  <i class="fas fa-times text-[10px]"></i>
                </button>
              </div>
            </template>
          </div>
        </div>
      </div>

      <!-- 2. CATEGORIES & BRANDS ROW -->
      <div class="grid grid-cols-2 gap-6">
        <!-- CATEGORIES -->
        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6 shadow-sm flex flex-col">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-bold text-gray-900 dark:text-slate-100 text-sm flex items-center gap-2">
              <i class="fas fa-tags text-blue-500"></i> Envanter Kategorileri ({{ assetStore.metadata.categories?.length || 0 }})
            </h3>
          </div>

          <div class="flex gap-2 mb-4">
            <input
              v-model="newCategory"
              type="text"
              placeholder="Yeni kategori adı (ör. Monitör, Yazıcı)..."
              class="flex-1 h-9 px-3 border border-gray-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-lg text-xs font-medium outline-none focus:border-blue-500"
              @keyup.enter="submitCategory"
            />
            <button @click="submitCategory" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors">
              Ekle
            </button>
          </div>

          <div class="flex-1 overflow-y-auto max-h-56 divide-y divide-gray-50 dark:divide-slate-700 border rounded-xl border-gray-100 dark:border-slate-700">
            <div
              v-for="cat in assetStore.metadata.categories"
              :key="cat.id"
              class="px-4 py-2.5 flex items-center justify-between text-xs font-semibold text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/50"
            >
              <span>{{ cat.name }}</span>
              <div class="flex items-center gap-2">
                <button
                  @click="openFieldsModal(cat)"
                  class="px-2 py-1 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-700 dark:text-blue-400 font-bold text-[11px] rounded-lg transition-colors flex items-center gap-1"
                  title="Bu kategoriye özel teknik alanları tanımla"
                >
                  <i class="fas fa-sliders-h text-[10px]"></i> Özellik Alanları ({{ cat.custom_fields?.length || 0 }})
                </button>
                <span class="text-[10px] text-gray-400 dark:text-slate-500 font-mono">ID: {{ cat.id }}</span>
                <button @click="removeCategory(cat.id)" class="text-gray-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 transition-colors ml-1" title="Sil">
                  <i class="fas fa-times"></i>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- BRANDS -->
        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6 shadow-sm flex flex-col">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-bold text-gray-900 dark:text-slate-100 text-sm flex items-center gap-2">
              <i class="fas fa-copyright text-purple-500"></i> Marka Tanımları ({{ assetStore.metadata.brands?.length || 0 }})
            </h3>
          </div>

          <div class="flex gap-2 mb-4">
            <input
              v-model="newBrand"
              type="text"
              placeholder="Yeni marka adı (ör. Dell, Lenovo)..."
              class="flex-1 h-9 px-3 border border-gray-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-lg text-xs font-medium outline-none focus:border-purple-500"
              @keyup.enter="submitBrand"
            />
            <button @click="submitBrand" class="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg transition-colors">
              Ekle
            </button>
          </div>

          <div class="flex-1 overflow-y-auto max-h-56 divide-y divide-gray-50 dark:divide-slate-700 border rounded-xl border-gray-100 dark:border-slate-700">
            <div
              v-for="brand in assetStore.metadata.brands"
              :key="brand.id"
              class="px-4 py-2.5 flex items-center justify-between text-xs font-semibold text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/50"
            >
              <span>{{ brand.name }}</span>
              <div class="flex items-center gap-2">
                <span class="text-[10px] text-gray-400 dark:text-slate-500 font-mono">ID: {{ brand.id }}</span>
                <button @click="removeBrand(brand.id)" class="text-gray-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 transition-colors ml-2" title="Sil">
                  <i class="fas fa-times"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. MODELS SECTION -->
      <div class="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6 shadow-sm">
        <h3 class="font-bold text-gray-900 dark:text-slate-100 text-sm mb-4 flex items-center gap-2">
          <i class="fas fa-laptop text-emerald-500"></i> Cihaz Modelleri ({{ assetStore.metadata.models?.length || 0 }})
        </h3>

        <!-- Add Model Form -->
        <div class="grid grid-cols-4 gap-3 bg-gray-50 dark:bg-slate-900 p-4 rounded-xl border border-gray-100 dark:border-slate-700 mb-6">
          <select v-model="newModel.category_id" class="h-9 px-3 border border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg text-xs font-medium outline-none focus:border-blue-500">
            <option value="">Kategori Seçin *</option>
            <option v-for="c in assetStore.metadata.categories" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>

          <select v-model="newModel.brand_id" class="h-9 px-3 border border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg text-xs font-medium outline-none focus:border-blue-500">
            <option value="">Marka Seçin *</option>
            <option v-for="b in assetStore.metadata.brands" :key="b.id" :value="b.id">{{ b.name }}</option>
          </select>

          <input
            v-model="newModel.name"
            type="text"
            placeholder="Model adı (ör. Latitude 5430)..."
            class="h-9 px-3 border border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg text-xs font-medium outline-none focus:border-blue-500"
          />

          <button @click="submitModel" class="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors">
            Yeni Model Kaydet
          </button>
        </div>

        <!-- Models Table -->
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="bg-gray-50 dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700 text-gray-400 dark:text-slate-500 font-bold uppercase text-[9.5px]">
                <th class="px-4 py-3">Model Adı</th>
                <th class="px-4 py-3">Kategori</th>
                <th class="px-4 py-3">Marka</th>
                <th class="px-4 py-3 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50 dark:divide-slate-700">
              <tr v-for="m in assetStore.metadata.models" :key="m.id" class="hover:bg-gray-50/50 dark:hover:bg-slate-700/50 transition-colors">
                <td class="px-4 py-3 font-bold text-gray-900 dark:text-slate-100">{{ m.name }}</td>
                <td class="px-4 py-3 font-semibold text-blue-600 dark:text-blue-400">{{ m.category_name }}</td>
                <td class="px-4 py-3 font-semibold text-purple-600 dark:text-purple-400">{{ m.brand_name }}</td>
                <td class="px-4 py-3 text-right">
                  <button @click="removeModel(m.id)" class="text-gray-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 transition-colors p-1" title="Modeli Sil">
                    <i class="fas fa-trash-alt text-[11px]"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>

    <!-- KATEGORİ ÖZEL ALANLARI TANIMLAMA MODALI -->
    <dialog ref="categoryFieldsDialog" class="modal">
      <div class="modal-box w-11/12 max-w-lg bg-white dark:bg-slate-800 p-6 rounded-2xl relative shadow-2xl space-y-4">
        <div class="flex items-center justify-between border-b pb-3 border-gray-100 dark:border-slate-700">
          <h3 class="font-extrabold text-[15px] text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <i class="fas fa-sliders-h text-blue-600 dark:text-blue-400"></i> Kategori Teknik Özellik Alanları: <span class="text-blue-600 dark:text-blue-400">{{ selectedCategoryForFields?.name }}</span>
          </h3>
          <button @click="categoryFieldsDialog?.close()" class="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 font-bold text-sm">✕</button>
        </div>

        <p class="text-xs text-gray-500 dark:text-slate-400">
          Bu kategoriye ait varlıklar eklenirken veya düzenlenirken "Özel Özellik Ekle" ile kullanıcıya gösterilecek alan başlıklarını belirleyin.
        </p>

        <!-- New Field Input -->
        <div class="flex gap-2">
          <input
            v-model="newFieldName"
            type="text"
            placeholder="Yeni alan başlığı (ör. İşlemci, RAM, Disk)..."
            class="flex-1 h-9 px-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 dark:text-slate-100 rounded-lg text-xs font-medium outline-none focus:border-blue-500"
            @keyup.enter="addFieldToCategory"
          />
          <button @click="addFieldToCategory" class="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1">
            <i class="fas fa-plus text-[10px]"></i> Ekle
          </button>
        </div>

        <!-- Field List -->
        <div class="space-y-2 max-h-60 overflow-y-auto pr-1">
          <div v-if="editingCategoryFields.length === 0" class="text-center py-6 text-xs text-gray-400 dark:text-slate-500 border border-dashed dark:border-slate-700 rounded-xl">
            Henüz tanımlı özel alan yok.
          </div>
          <div
            v-for="(field, idx) in editingCategoryFields"
            :key="idx"
            class="px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl flex items-center justify-between text-xs font-bold text-gray-800 dark:text-slate-200"
          >
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-blue-500"></span>
              <span>{{ field }}</span>
            </div>
            <button @click="removeFieldFromCategory(idx)" class="text-gray-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition-colors" title="Alanı Sil">
              <i class="fas fa-trash-alt text-[11px]"></i>
            </button>
          </div>
        </div>

        <div class="modal-action border-t pt-3 flex justify-end gap-2 dark:border-slate-700">
          <button type="button" @click="categoryFieldsDialog?.close()" class="px-4 py-2 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-300 font-bold text-xs rounded-lg">İptal</button>
          <button type="button" @click="saveCategoryFields" class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm">Alanları Kaydet</button>
        </div>
      </div>
    </dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAssetStore } from '../../stores/assetStore'
import { useToast } from '../../composables/useToast'

const assetStore = useAssetStore()
const { showToast } = useToast()

const loading = ref(false)
const newStatus = ref('')
const newCategory = ref('')
const newBrand = ref('')
const newModel = ref({ name: '', category_id: '', brand_id: '' })

const editingStatusId = ref(null)
const editStatusName = ref('')

const fetchData = async () => {
  loading.value = true
  try {
    await assetStore.fetchMetadata()
  } finally {
    loading.value = false
  }
}

// STATUS CRUD
const submitStatus = async () => {
  if (!newStatus.value.trim()) return
  try {
    await assetStore.addStatus(newStatus.value.trim())
    showToast('Yeni genel durum başarıyla eklendi', 'success')
    newStatus.value = ''
  } catch (err) {
    showToast(err.toString(), 'error')
  }
}

const startEditStatus = (st) => {
  editingStatusId.value = st.id
  editStatusName.value = st.name
}

const saveEditStatus = async (id) => {
  if (!editStatusName.value.trim()) return
  try {
    await assetStore.updateStatus(id, editStatusName.value.trim())
    showToast('Genel durum başarıyla güncellendi', 'success')
    editingStatusId.value = null
  } catch (err) {
    showToast(err.toString(), 'error')
  }
}

const removeStatus = async (id) => {
  if (!confirm('Bu durumu silmek istediğinize emin misiniz?')) return
  try {
    await assetStore.deleteStatus(id)
    showToast('Durum tanımı silindi', 'info')
  } catch (err) {
    showToast(err.toString(), 'error')
  }
}

// CATEGORY CRUD
const categoryFieldsDialog = ref(null)
const selectedCategoryForFields = ref(null)
const editingCategoryFields = ref([])
const newFieldName = ref('')

const openFieldsModal = (cat) => {
  selectedCategoryForFields.value = cat
  editingCategoryFields.value = [...(cat.custom_fields || [])]
  newFieldName.value = ''
  categoryFieldsDialog.value?.showModal()
}

const addFieldToCategory = () => {
  if (!newFieldName.value.trim()) return
  if (editingCategoryFields.value.includes(newFieldName.value.trim())) {
    showToast('Bu alan zaten ekli', 'warning')
    return
  }
  editingCategoryFields.value.push(newFieldName.value.trim())
  newFieldName.value = ''
}

const removeFieldFromCategory = (idx) => {
  editingCategoryFields.value.splice(idx, 1)
}

const saveCategoryFields = async () => {
  if (!selectedCategoryForFields.value) return
  try {
    await assetStore.updateCategoryFields(selectedCategoryForFields.value.id, editingCategoryFields.value)
    showToast('Kategori teknik alanları kaydedildi', 'success')
    categoryFieldsDialog.value?.close()
  } catch (err) {
    showToast(err.toString(), 'error')
  }
}

const submitCategory = async () => {
  if (!newCategory.value.trim()) return
  try {
    await assetStore.addCategory(newCategory.value.trim())
    showToast('Kategori başarıyla eklendi', 'success')
    newCategory.value = ''
  } catch (err) {
    showToast(err.toString(), 'error')
  }
}

const removeCategory = async (id) => {
  if (!confirm('Bu kategoriyi silmek istediğinize emin misiniz?')) return
  try {
    await assetStore.deleteCategory(id)
    showToast('Kategori silindi', 'info')
  } catch (err) {
    showToast(err.toString(), 'error')
  }
}

// BRAND CRUD
const submitBrand = async () => {
  if (!newBrand.value.trim()) return
  try {
    await assetStore.addBrand(newBrand.value.trim())
    showToast('Marka başarıyla eklendi', 'success')
    newBrand.value = ''
  } catch (err) {
    showToast(err.toString(), 'error')
  }
}

const removeBrand = async (id) => {
  if (!confirm('Bu markayı silmek istediğinize emin misiniz?')) return
  try {
    await assetStore.deleteBrand(id)
    showToast('Marka silindi', 'info')
  } catch (err) {
    showToast(err.toString(), 'error')
  }
}

// MODEL CRUD
const submitModel = async () => {
  const { name, category_id, brand_id } = newModel.value
  if (!name || !category_id || !brand_id) {
    showToast('Lütfen tüm model alanlarını doldurun', 'warning')
    return
  }
  try {
    await assetStore.addModel(newModel.value)
    showToast('Model başarıyla kaydedildi', 'success')
    newModel.value = { name: '', category_id: '', brand_id: '' }
  } catch (err) {
    showToast(err.toString(), 'error')
  }
}

const removeModel = async (id) => {
  if (!confirm('Bu modeli silmek istediğinize emin misiniz?')) return
  try {
    await assetStore.deleteModel(id)
    showToast('Model silindi', 'info')
  } catch (err) {
    showToast(err.toString(), 'error')
  }
}

onMounted(() => {
  fetchData()
})
</script>
