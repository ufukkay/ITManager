import { defineStore } from 'pinia'
import api from '../api'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    isAuthenticated: false,
    loading: true,
    error: null
  }),

  getters: {
    userName: (state) => state.user?.full_name || '',
    userId: (state) => state.user?.id || null,
    isAdmin: (state) => state.user?.role_id === 1,
    userRoleName: (state) => state.user?.role_name || '',
    userPermissions: (state) => state.user?.permissions || []
  },

  actions: {
    hasPermission(key) {
      if (this.isAdmin) return true
      return this.userPermissions.includes(key)
    },
    async checkAuth() {
      this.loading = true
      try {
        const response = await api.get('/auth/api/me')
        this.user = response.data.user
        this.isAuthenticated = true
      } catch (err) {
        this.user = null
        this.isAuthenticated = false
        // 401 is expected if not logged in
        if (err.response?.status !== 401) {
            console.error('Check auth error:', err)
        }
      } finally {
        this.loading = false
      }
    },

    async login(email, password) {
      this.loading = true
      this.error = null
      try {
        const response = await api.post('/auth/api/login', { email, password })
        if (response.data.success && response.data.user) {
          this.user = response.data.user
          this.isAuthenticated = true
          return true
        } else {
          this.error = response.data.message || 'Giriş başarısız'
          return false
        }
      } catch (err) {
        this.error = err.response?.data?.message || 'Bağlantı hatası'
        return false
      } finally {
        this.loading = false
      }
    },

    async logout() {
      try {
        await api.post('/auth/api/logout')
      } catch (err) {
        console.error('Logout request failed, clearing local state anyway', err)
      } finally {
        this.user = null
        this.isAuthenticated = false
      }
    }
  }
})
