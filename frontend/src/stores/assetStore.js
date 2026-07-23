import { defineStore } from 'pinia'
import api from '../api'

export const useAssetStore = defineStore('asset', {
  state: () => ({
    assets: [],
    metadata: {
      categories: [],
      brands: [],
      statuses: [],
      companies: [],
      locations: [],
      personnel: [],
      models: []
    },
    financialSummary: {
      totalValuation: 0,
      monthlyAmortization: 0
    },
    loading: false,
    error: null
  }),

  actions: {
    async fetchAssets() {
      this.loading = true
      this.error = null
      try {
        const response = await api.get('/assets')
        this.assets = response.data
      } catch (err) {
        this.error = err.response?.data?.error || 'Varlıklar yüklenirken bir hata oluştu.'
        console.error(err)
      } finally {
        this.loading = false
      }
    },

    async fetchMetadata() {
      try {
        const response = await api.get('/assets/metadata')
        this.metadata = response.data
      } catch (err) {
        console.error('Metadata loading error:', err)
      }
    },

    async fetchFinancialSummary() {
      try {
        const response = await api.get('/assets/financial-summary')
        this.financialSummary = response.data
      } catch (err) {
        console.error('Financial summary loading error:', err)
      }
    },

    async addAsset(formData) {
      this.loading = true
      try {
        const response = await api.post('/assets', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        await this.fetchAssets()
        await this.fetchFinancialSummary()
        return response.data
      } catch (err) {
        this.error = err.response?.data?.error || 'Varlık eklenirken hata oluştu.'
        throw err
      } finally {
        this.loading = false
      }
    },

    async updateAsset(id, formData) {
      this.loading = true
      try {
        const response = await api.put(`/assets/${id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        await this.fetchAssets()
        await this.fetchFinancialSummary()
        return response.data
      } catch (err) {
        this.error = err.response?.data?.error || 'Varlık güncellenirken hata oluştu.'
        throw err
      } finally {
        this.loading = false
      }
    },

    async deleteAsset(id) {
      this.loading = true
      try {
        await api.delete(`/assets/${id}`)
        await this.fetchAssets()
        await this.fetchFinancialSummary()
      } catch (err) {
        this.error = err.response?.data?.error || 'Varlık silinirken hata oluştu.'
        throw err
      } finally {
        this.loading = false
      }
    },

    async checkoutAsset(id, checkoutData) {
      this.loading = true
      try {
        const response = await api.post(`/assets/${id}/checkout`, checkoutData)
        await this.fetchAssets()
        return response.data
      } catch (err) {
        this.error = err.response?.data?.error || 'Zimmet ataması yapılamadı.'
        throw err
      } finally {
        this.loading = false
      }
    },

    async checkinAsset(id, checkinData) {
      this.loading = true
      try {
        const response = await api.post(`/assets/${id}/checkin`, checkinData)
        await this.fetchAssets()
        return response.data
      } catch (err) {
        this.error = err.response?.data?.error || 'Zimmet iadesi yapılamadı.'
        throw err
      } finally {
        this.loading = false
      }
    },

    async addCategory(name) {
      try {
        const response = await api.post('/assets/categories', { name })
        await this.fetchMetadata()
        return response.data
      } catch (err) {
        throw err.response?.data?.error || 'Kategori eklenemedi.'
      }
    },

    async deleteCategory(id) {
      try {
        await api.delete(`/assets/categories/${id}`)
        await this.fetchMetadata()
      } catch (err) {
        throw err.response?.data?.error || 'Kategori silinemedi.'
      }
    },

    async addBrand(name) {
      try {
        const response = await api.post('/assets/brands', { name })
        await this.fetchMetadata()
        return response.data
      } catch (err) {
        throw err.response?.data?.error || 'Marka eklenemedi.'
      }
    },

    async deleteBrand(id) {
      try {
        await api.delete(`/assets/brands/${id}`)
        await this.fetchMetadata()
      } catch (err) {
        throw err.response?.data?.error || 'Marka silinemedi.'
      }
    },

    async addModel(modelData) {
      try {
        const response = await api.post('/assets/models', modelData)
        await this.fetchMetadata()
        return response.data
      } catch (err) {
        throw err.response?.data?.error || 'Model eklenemedi.'
      }
    },

    async deleteModel(id) {
      try {
        await api.delete(`/assets/models/${id}`)
        await this.fetchMetadata()
      } catch (err) {
        throw err.response?.data?.error || 'Model silinemedi.'
      }
    },

    async addStatus(name) {
      try {
        const response = await api.post('/assets/statuses', { name })
        await this.fetchMetadata()
        return response.data
      } catch (err) {
        throw err.response?.data?.error || 'Durum eklenemedi.'
      }
    },

    async updateStatus(id, name) {
      try {
        const response = await api.put(`/assets/statuses/${id}`, { name })
        await this.fetchMetadata()
        return response.data
      } catch (err) {
        throw err.response?.data?.error || 'Durum güncellenemedi.'
      }
    },

    async deleteStatus(id) {
      try {
        await api.delete(`/assets/statuses/${id}`)
        await this.fetchMetadata()
      } catch (err) {
        throw err.response?.data?.error || 'Durum silinemedi.'
      }
    },

    async getAssetLogs(id) {
      try {
        const response = await api.get(`/assets/${id}/logs`)
        return response.data
      } catch (err) {
        console.error('Logs error:', err)
        return []
      }
    },

    async fetchPersonnelAssets(personnelId) {
      try {
        const response = await api.get(`/assets/personnel/${personnelId}`)
        return response.data
      } catch (err) {
        console.error('Personnel assets fetch error:', err)
        throw err
      }
    },

    async fetchMyAssets() {
      try {
        const response = await api.get('/assets/my-assets')
        return response.data
      } catch (err) {
        console.error('My assets fetch error:', err)
        throw err
      }
    }
  }
})
