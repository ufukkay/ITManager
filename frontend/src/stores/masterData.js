import { defineStore } from 'pinia'
import api from '../api'

export const useMasterDataStore = defineStore('masterData', {
  state: () => ({
    companies: [],
    departments: [],
    costCenters: [],
    personnel: [],
    vehicles: [],
    locations: [],
    operators: [],
    packages: [],
    licenses: [],
    servers: [],
    loading: false,
    error: null
  }),

  actions: {
    async fetchCompanies() {
      this.loading = true
      try {
        const response = await api.get('/api/master-data/companies')
        this.companies = response.data
      } catch (err) {
        this.error = err.message
      } finally {
        this.loading = false
      }
    },

    async fetchDepartments(companyId = null) {
      this.loading = true
      try {
        const url = companyId ? `/api/master-data/departments?companyId=${companyId}` : '/api/master-data/departments'
        const response = await api.get(url)
        this.departments = response.data
      } catch (err) {
        this.error = err.message
      } finally {
        this.loading = false
      }
    },

    async fetchCostCenters(companyId = null) {
      this.loading = true
      try {
        const url = companyId ? `/api/master-data/cost-centers?companyId=${companyId}` : '/api/master-data/cost-centers'
        const response = await api.get(url)
        this.costCenters = response.data
      } catch (err) {
        this.error = err.message
      } finally {
        this.loading = false
      }
    },

    async fetchPersonnel(filters = {}) {
      this.loading = true
      try {
        const params = new URLSearchParams(filters).toString()
        const response = await api.get(`/api/master-data/personnel?${params}`)
        this.personnel = response.data
      } catch (err) {
        this.error = err.message
      } finally {
        this.loading = false
      }
    },

    async fetchVehicles() {
        this.loading = true
        try {
          const response = await api.get('/api/master-data/vehicles')
          this.vehicles = response.data
        } catch (err) {
          this.error = err.message
        } finally {
          this.loading = false
        }
    },

    async fetchLocations() {
        this.loading = true
        try {
          const response = await api.get('/api/master-data/locations')
          this.locations = response.data
        } catch (err) {
          this.error = err.message
        } finally {
          this.loading = false
        }
    },

    async fetchOperators() {
        this.loading = true
        try {
          const response = await api.get('/api/master-data/operators')
          this.operators = response.data
        } catch (err) {
          this.error = err.message
        } finally {
          this.loading = false
        }
    },

    async fetchPackages(type = null) {
        this.loading = true
        try {
          const url = type ? `/api/master-data/packages?type=${type}` : '/api/master-data/packages'
          const response = await api.get(url)
          this.packages = response.data
        } catch (err) {
          this.error = err.message
        } finally {
          this.loading = false
        }
    },

    async createPersonnel(data) {
      this.loading = true
      try {
        const response = await api.post('/api/master-data/personnel', data)
        await this.fetchPersonnel()
        return response.data
      } catch (err) {
        this.error = err.message
        throw err
      } finally {
        this.loading = false
      }
    },

    async updatePersonnel(id, data) {
      this.loading = true
      try {
        await api.put(`/api/master-data/personnel/${id}`, data)
        await this.fetchPersonnel()
      } catch (err) {
        this.error = err.message
        throw err
      } finally {
        this.loading = false
      }
    },

    async deletePersonnel(id) {
      this.loading = true
      try {
        await api.delete(`/api/master-data/personnel/${id}`)
        await this.fetchPersonnel()
      } catch (err) {
        this.error = err.message
        throw err
      } finally {
        this.loading = false
      }
    },

    async bulkDeletePersonnel(ids) {
      this.loading = true
      try {
        await api.post('/api/master-data/personnel/bulk-delete', { ids })
        await this.fetchPersonnel()
      } catch (err) {
        this.error = err.message
        throw err
      } finally {
        this.loading = false
      }
    },

    async bulkUpdatePersonnel(ids, data) {
      this.loading = true
      try {
        await api.post('/api/master-data/personnel/bulk-update', { ids, data })
        await this.fetchPersonnel()
      } catch (err) {
        this.error = err.message
        throw err
      } finally {
        this.loading = false
      }
    },

    // Global CRUD helper for other entities
    async createItem(type, data) {
        this.loading = true
        try {
            const response = await api.post(`/api/master-data/${type}`, data)
            await this.refreshType(type)
            return response.data
        } catch (err) {
            this.error = err.message
            throw err
        } finally {
            this.loading = false
        }
    },

    async updateItem(type, id, data) {
        this.loading = true
        try {
            await api.put(`/api/master-data/${type}/${id}`, data)
            await this.refreshType(type)
        } catch (err) {
            this.error = err.message
            throw err
        } finally {
            this.loading = false
        }
    },

    async deleteItem(type, id) {
        this.loading = true
        try {
            await api.delete(`/api/master-data/${type}/${id}`)
            await this.refreshType(type)
        } catch (err) {
            this.error = err.message
            throw err
        } finally {
            this.loading = false
        }
    },

    async fetchLicenses() {
        this.loading = true
        try {
          const response = await api.get('/api/master-data/licenses')
          this.licenses = response.data
        } catch (err) {
          this.error = err.message
        } finally {
          this.loading = false
        }
    },

    async fetchServers(type = null) {
        this.loading = true
        try {
          const url = type ? `/api/master-data/servers?type=${type}` : '/api/master-data/servers'
          const response = await api.get(url)
          this.servers = response.data
        } catch (err) {
          this.error = err.message
        } finally {
          this.loading = false
        }
    },

    async refreshType(type) {
        const map = {
            'companies': () => this.fetchCompanies(),
            'departments': () => this.fetchDepartments(),
            'cost-centers': () => this.fetchCostCenters(),
            'vehicles': () => this.fetchVehicles(),
            'locations': () => this.fetchLocations(),
            'operators': () => this.fetchOperators(),
            'packages': () => this.fetchPackages(),
            'licenses': () => this.fetchLicenses(),
            'servers': () => this.fetchServers()
        }
        if (map[type]) await map[type]()
    },

    async getDeleteImpact(type, id) {
        try {
            const response = await api.get(`/api/master-data/${type}/${id}/impact`)
            return response.data
        } catch (err) {
            console.error('Impact analysis error:', err)
            return [] // Fail safe
        }
    },

    async fetchPersonnelFinancialHistory(id) {
        try {
            const response = await api.get(`/api/master-data/reports/financial/personnel/${id}`)
            return response.data
        } catch (err) {
            console.error('Financial history fetch error:', err)
            return []
        }
    },

    async fetchFinancialStats() {
        try {
            const response = await api.get('/api/master-data/reports/financial/stats')
            return response.data
        } catch (err) {
            console.error('Financial stats fetch error:', err)
            return null
        }
    },

    async fetchAuditLogs(limit = 20) {
      try {
        const response = await api.get(`/api/master-data/audit-logs?limit=${limit}`)
        return response.data
      } catch (err) {
        console.error('Audit logs fetch error:', err)
        return []
      }
    },

    async fetchResourceHistory(module, id) {
      try {
        const response = await api.get(`/api/master-data/audit-logs/${module}/${id}`)
        return response.data
      } catch (err) {
        console.error('Resource history fetch error:', err)
        return []
      }
    }
  }
})
