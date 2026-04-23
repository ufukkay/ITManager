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
  // Sunucu İzleme (Nested Routes)
  {
    path: '/monitoring',
    component: () => import('../layouts/MonitoringLayout.vue'),
    meta: { layout: 'main', requiresAuth: true, fullBleed: true },
    children: [
      {
        path: '',
        redirect: '/monitoring/cloud'
      },
      {
        path: 'cloud',
        name: 'monitoring-cloud',
        component: () => import('../views/MonitoringView.vue'),
        props: { type: 'cloud' }
      },
      {
        path: 'vodafone',
        name: 'monitoring-vodafone',
        component: () => import('../views/MonitoringView.vue'),
        props: { type: 'vodafone' }
      },
      {
        path: 'local',
        name: 'monitoring-local',
        component: () => import('../views/MonitoringView.vue'),
        props: { type: 'local' }
      }
    ]
  },
  {
    path: '/admin/permissions',
    name: 'permissions',
    component: () => import('../views/PermissionsView.vue'),
    meta: { layout: 'main', requiresAuth: true }
  },
  // İK Bildirimleri (Nested Layout)
  {
    path: '/hr-requests',
    component: () => import('../layouts/HRLayout.vue'),
    meta: { layout: 'main', requiresAuth: true, fullBleed: true },
    children: [
      {
        path: '',
        name: 'hr-requests',
        component: () => import('../views/hr-requests/PersonnelRequestsView.vue')
      }
    ]
  },
  // SIM Takip (Nested Routes)
  {
    path: '/sim-takip',
    component: () => import('../layouts/SimTrackingLayout.vue'),
    meta: { layout: 'main', requiresAuth: true, fullBleed: true },
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
        path: 'transfer',
        name: 'sim-transfer',
        component: () => import('../views/sim-tracking/SimTransferView.vue')
      }
    ]
  },
  // Lisans Yönetimi
  {
    path: '/licensing',
    component: () => import('../layouts/LicensingLayout.vue'),
    meta: { layout: 'main', requiresAuth: true, fullBleed: true },
    children: [
      {
        path: '',
        redirect: '/licensing/m365'
      },
      {
        path: 'm365',
        name: 'license-m365',
        component: () => import('../views/m365/M365LicensesView.vue')
      },
      {
        path: 'itarian',
        name: 'license-itarian',
        component: () => import('../views/m365/ItarianLicensesView.vue')
      }
    ]
  },
  // Master Data (Şirket, Personel, Organizasyon) - Unified Console
  {
    path: '/master-data',
    component: () => import('../views/master-data/MasterDataLayout.vue'),
    meta: { layout: 'main', requiresAuth: true, fullBleed: true },
    children: [
      {
        path: '',
        name: 'master-home',
        component: () => import('../views/master-data/MasterDataDashboardView.vue')
      },
      {
        path: 'personnel',
        name: 'master-personnel',
        component: () => import('../views/master-data/PersonnelListView.vue')
      },
      {
        path: 'organization',
        name: 'master-organization',
        component: () => import('../views/master-data/OrganizationView.vue')
      },
      {
        path: 'vehicles',
        name: 'master-vehicles',
        component: () => import('../views/master-data/VehicleListView.vue')
      },
      {
        path: 'locations',
        name: 'master-locations',
        component: () => import('../views/master-data/LocationListView.vue')
      },
      {
        path: 'servers',
        name: 'master-servers',
        component: () => import('../views/master-data/ServerListView.vue')
      },
      {
        path: 'services',
        name: 'master-services',
        component: () => import('../views/master-data/ServiceListView.vue')
      },
      {
        path: 'licensing',
        name: 'master-licensing',
        component: () => import('../views/master-data/LicensingListView.vue')
      },
      {
        path: 'sim-cards',
        name: 'master-sims',
        component: () => import('../views/master-data/SimCardListView.vue')
      },
    ]
  },
  // Maliyet Yönetimi (Masraf Yansıtma)
  {
    path: '/cost-management',
    name: 'cost-management',
    component: () => import('../views/cost-management/InvoicesView.vue'),
    meta: { layout: 'main', requiresAuth: true, fullBleed: true }
  },
  // Raporlar ve Analitik
  {
    path: '/reports',
    name: 'reports',
    component: () => import('../views/reports/ReportsView.vue'),
    meta: { layout: 'main', requiresAuth: true }
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
