import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginView.vue'),
    meta: { layout: 'auth', requiresAuth: false }
  },
  {
    path: '/',
    name: 'dashboard',
    component: () => import('../views/DashboardView.vue'),
    meta: { layout: 'main', requiresAuth: true }
  },
  {
    path: '/monitoring',
    name: 'monitoring',
    component: () => import('../views/MonitoringView.vue'),
    meta: { layout: 'main', requiresAuth: true }
  },
  {
    path: '/admin/permissions',
    name: 'permissions',
    component: () => import('../views/PermissionsView.vue'),
    meta: { layout: 'main', requiresAuth: true }
  },
  {
    path: '/hr-requests',
    name: 'hr-requests',
    component: () => import('../views/hr-requests/PersonnelRequestsView.vue'),
    meta: { layout: 'main', requiresAuth: true }
  },
  // SIM Takip (Nested Routes)
  {
    path: '/sim-takip',
    component: () => import('../layouts/SimTrackingLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/sim-takip/m2m'
      },
      {
        path: 'm2m',
        name: 'sim-m2m',
        component: () => import('../views/sim-tracking/M2MView.vue')
      },
      {
        path: 'data',
        name: 'sim-data',
        component: () => import('../views/sim-tracking/DataView.vue')
      },
      {
        path: 'voice',
        name: 'sim-voice',
        component: () => import('../views/sim-tracking/VoiceView.vue')
      },
      {
        path: 'reports',
        name: 'sim-reports',
        component: () => import('../views/sim-tracking/ReportsView.vue')
      },
      {
        path: 'invoices',
        name: 'sim-invoices',
        component: () => import('../views/sim-tracking/InvoicesView.vue')
      },
      {
        path: 'settings',
        name: 'sim-settings',
        component: () => import('../views/sim-tracking/SettingsView.vue')
      },
      {
        path: 'logs',
        name: 'sim-logs',
        component: () => import('../views/sim-tracking/LogsView.vue')
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

// Navigation Guard
router.beforeEach(async (to, from) => {
  const authStore = useAuthStore()

  // Sadece sayfa ilk yüklendiğinde checkAuth yap (loading = true iken)
  if (authStore.loading) {
    await authStore.checkAuth()
  }

  // Auth korumalı rotalar ve kullanıcı giriş yapmamışsa
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    // Giriş yapmamış ama giriş yapmak isteyen kullanıcıları tutmak için 
    // dönüş yolunu saklayabiliriz (query.redirect) - şu anlık düz /login'e atalım
    return { name: 'login' }
  }

  // Kullanıcı giriş yapmış ama login sayfasına gitmeye çalışıyorsa 
  // Ana sayfaya (Dashboard) yönlendir
  if (to.name === 'login' && authStore.isAuthenticated) {
    return { name: 'dashboard' }
  }
})

export default router
