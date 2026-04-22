import { ref } from 'vue'
import api from '../api'
import { useToast } from './useToast'

export function useSimApi(endpoint) {
  const dataList = ref([])
  const loading = ref(false)
  const error = ref(null)
  const { showToast } = useToast()

  const fetchList = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      const res = await api.get(`/sim-takip/api/${endpoint}`, { params })
      dataList.value = res.data.data || res.data // handle both wrapper and raw array
      return dataList.value
    } catch (err) {
      error.value = err.response?.data?.message || 'Veri çekilirken hata oluştu'
      showToast(error.value, 'error', 5000, err)
      return []
    } finally {
      loading.value = false
    }
  }

  const createItem = async (payload) => {
    loading.value = true
    try {
      const res = await api.post(`/sim-takip/api/${endpoint}`, payload)
      showToast('Kayıt başarıyla oluşturuldu')
      await fetchList()
      return res.data
    } catch (err) {
      const msg = err.response?.data?.message || 'Kayıt oluşturulamadı'
      showToast(msg, 'error', 5000, err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateItem = async (id, payload) => {
    loading.value = true
    try {
      const res = await api.put(`/sim-takip/api/${endpoint}/${id}`, payload)
      showToast('Kayıt başarıyla güncellendi')
      await fetchList()
      return res.data
    } catch (err) {
      const msg = err.response?.data?.message || 'Güncelleme başarısız'
      showToast(msg, 'error', 5000, err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteItem = async (id) => {
    loading.value = true
    try {
      await api.delete(`/sim-takip/api/${endpoint}/${id}`)
      showToast('Kayıt başarıyla silindi')
      await fetchList()
      return true
    } catch (err) {
      const msg = err.response?.data?.message || 'Silme işlemi başarısız'
      showToast(msg, 'error', 5000, err)
      return false
    } finally {
      loading.value = false
    }
  }

  const bulkDelete = async (ids) => {
    if (!ids || ids.length === 0) return false
    loading.value = true
    try {
      await api.post(`/sim-takip/api/${endpoint}/bulk-delete`, { ids })
      showToast(`${ids.length} kayıt başarıyla silindi`)
      await fetchList()
      return true
    } catch (err) {
      const msg = err.response?.data?.message || 'Toplu silme başarısız'
      showToast(msg, 'error', 5000, err)
      return false
    } finally {
      loading.value = false
    }
  }

  return {
    dataList,
    loading,
    error,
    fetchList,
    createItem,
    updateItem,
    deleteItem,
    bulkDelete
  }
}

