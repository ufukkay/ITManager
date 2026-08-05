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
    servers: []
  }),

  actions: {
    async fetchCompanies() {
      try {
        const response = await api.get('/api/master-data/companies')
        this.companies = response.data
      } catch (err) { console.error('Fetch companies error:', err) }
    },

    async fetchDepartments(companyId = null) {
      try {
        const url = companyId ? `/api/master-data/departments?companyId=${companyId}` : '/api/master-data/departments'
        const response = await api.get(url)
        this.departments = response.data
      } catch (err) { console.error('Fetch departments error:', err) }
    },

    async fetchCostCenters(companyId = null) {
      try {
        const url = companyId ? `/api/master-data/cost-centers?companyId=${companyId}` : '/api/master-data/cost-centers'
        const response = await api.get(url)
        this.costCenters = response.data
      } catch (err) { console.error('Fetch cost centers error:', err) }
    },

    async fetchPersonnel(filters = {}) {
      try {
        const params = new URLSearchParams(filters).toString()
        const response = await api.get(`/api/master-data/personnel?${params}`)
        this.personnel = response.data
      } catch (err) { console.error('Fetch personnel error:', err) }
    },

    async fetchVehicles() {
      try {
        const response = await api.get('/api/master-data/vehicles')
        this.vehicles = response.data
      } catch (err) { console.error('Fetch vehicles error:', err) }
    },

    async fetchLocations() {
      try {
        const response = await api.get('/api/master-data/locations')
        this.locations = response.data
      } catch (err) { console.error('Fetch locations error:', err) }
    },

    async fetchOperators() {
      try {
        const response = await api.get('/api/master-data/operators')
        this.operators = response.data
      } catch (err) { console.error('Fetch operators error:', err) }
    },

    async fetchPackages(type = null) {
      try {
        const url = type ? `/api/master-data/packages?type=${type}` : '/api/master-data/packages'
        const response = await api.get(url)
        this.packages = response.data
      } catch (err) { console.error('Fetch packages error:', err) }
    },

    async createPersonnel(data) {
      const response = await api.post('/api/master-data/personnel', data)
      await this.fetchPersonnel()
      return response.data
    },

    async updatePersonnel(id, data) {
      await api.put(`/api/master-data/personnel/${id}`, data)
      await this.fetchPersonnel()
    },

    async deletePersonnel(id) {
      await api.delete(`/api/master-data/personnel/${id}`)
      await this.fetchPersonnel()
    },

    async bulkDeletePersonnel(ids) {
      await api.post('/api/master-data/personnel/bulk-delete', { ids })
      await this.fetchPersonnel()
    },

    async bulkUpdatePersonnel(ids, data) {
      await api.post('/api/master-data/personnel/bulk-update', { ids, data })
      await this.fetchPersonnel()
    },

    async getPersonnelUser(id) {
        try {
            const response = await api.get(`/api/master-data/personnel/${id}/user`)
            return response.data.user
        } catch (err) {
            console.error('Fetch personnel user error:', err)
            return null
        }
    },

    async createPersonnelUser(id) {
        const response = await api.post(`/api/master-data/personnel/${id}/create-user`)
        return response.data.userId
    },

    // Global CRUD helper for other entities
    async createItem(type, data) {
        const response = await api.post(`/api/master-data/${type}`, data)
        await this.refreshType(type)
        return response.data
    },

    async updateItem(type, id, data) {
        await api.put(`/api/master-data/${type}/${id}`, data)
        await this.refreshType(type)
    },

    async deleteItem(type, id) {
        await api.delete(`/api/master-data/${type}/${id}`)
        await this.refreshType(type)
    },

    async fetchLicenses() {
        try {
          const response = await api.get('/api/master-data/licenses')
          this.licenses = response.data
        } catch (err) { console.error('Fetch licenses error:', err) }
    },

    async fetchServers(type = null) {
        try {
          const url = type ? `/api/master-data/servers?type=${type}` : '/api/master-data/servers'
          const response = await api.get(url)
          this.servers = response.data
        } catch (err) { console.error('Fetch servers error:', err) }
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
    },

    async fetchAllocations() {
      try {
        const response = await api.get('/api/master-data/licenses/allocations')
        return response.data
      } catch (err) {
        console.error('Fetch allocations error:', err)
        return []
      }
    },

    async fetchDashboardStats() {
      try {
        const response = await api.get('/auth/api/dashboard/stats')
        return response.data
      } catch (err) {
        console.error('Fetch dashboard stats error:', err)
        return null
      }
    }
  }
})
