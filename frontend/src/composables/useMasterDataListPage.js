import { ref } from 'vue'
import { useMasterDataStore } from '../stores/masterData'
import { useToast } from './useToast'
import { useConfirm } from './useConfirm'

// Master Data altındaki basit CRUD liste ekranlarında (Araçlar, Lokasyonlar vb.)
// tekrar eden loading/modal/kaydetme/silme akışını tek yerde toplar.
export function useMasterDataListPage({ type, defaultForm, deleteMessage }) {
  const masterData = useMasterDataStore()
  const { showToast } = useToast()
  const { ask, startLoading, stopLoading } = useConfirm()

  const makeDefaultForm = () => (typeof defaultForm === 'function' ? defaultForm() : { ...defaultForm })

  const loading = ref(false)
  const isModalOpen = ref(false)
  const selectedItem = ref(null)
  const form = ref(makeDefaultForm())

  // masterData store'daki refreshType(type) haritası bu type'a karşılık gelen fetch action'ını çağırır
  const fetchData = async () => {
    loading.value = true
    await masterData.refreshType(type)
    loading.value = false
  }

  const openAddModal = () => {
    selectedItem.value = null
    form.value = makeDefaultForm()
    isModalOpen.value = true
  }

  const openEditModal = (row) => {
    selectedItem.value = row
    form.value = { ...row }
    isModalOpen.value = true
  }

  const saveItem = async (successMessages = {}) => {
    try {
      if (selectedItem.value) {
        await masterData.updateItem(type, selectedItem.value.id, form.value)
        showToast(successMessages.update || 'Kayıt başarıyla güncellendi', 'success')
      } else {
        await masterData.createItem(type, form.value)
        showToast(successMessages.create || 'Yeni kayıt başarıyla eklendi', 'success')
      }
      isModalOpen.value = false
    } catch (err) {
      showToast('Hata: ' + (err.response?.data?.error || err.message), 'error')
    }
  }

  const handleDelete = async (row) => {
    const impact = await masterData.getDeleteImpact(type, row.id)
    const confirmed = await ask({
      title: deleteMessage?.title || 'Kaydı Sil',
      message: deleteMessage?.message ? deleteMessage.message(row) : 'Bu kaydı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
      confirmLabel: deleteMessage?.confirmLabel || 'Evet, Sil',
      impact
    })

    if (confirmed) {
      try {
        startLoading()
        await masterData.deleteItem(type, row.id)
        showToast(deleteMessage?.successMessage || 'Kayıt başarıyla silindi', 'success')
      } catch (err) {
        showToast('Hata: ' + err.message, 'error')
      } finally {
        stopLoading()
      }
    }
  }

  return {
    masterData,
    loading,
    isModalOpen,
    selectedItem,
    form,
    fetchData,
    openAddModal,
    openEditModal,
    saveItem,
    handleDelete
  }
}
