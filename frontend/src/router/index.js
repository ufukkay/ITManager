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
    path: '/forgot-password',
    name: 'forgot-password',
    component: () => import('../views/ForgotPasswordView.vue'),
    meta: { layout: 'auth', requiresAuth: false }
  },
  {
    path: '/reset-password',
    name: 'reset-password',
    component: () => import('../views/ResetPasswordView.vue'),
    meta: { layout: 'auth', requiresAuth: false }
  },
  {
    path: '/feedback/:ticket_id',
    name: 'ticket-feedback',
    component: () => import('../views/helpdesk/TicketFeedbackView.vue'),
    meta: { layout: 'auth', requiresAuth: false }
  },
  {
    path: '/scan/asset/:id',
    name: 'mobile-asset-scan',
    component: () => import('../views/inventory/MobileAuditView.vue'),
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
    meta: { layout: 'main', requiresAuth: true, fullBleed: true, permission: 'monitoring:view' },
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

  // İK Bildirimleri (Nested Layout)
  {
    path: '/hr-requests',
    component: () => import('../layouts/HRLayout.vue'),
    meta: { layout: 'main', requiresAuth: true, fullBleed: true, permission: 'hr:view' },
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
    meta: { layout: 'main', requiresAuth: true, fullBleed: true, permission: 'sim:view' },
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
    meta: { layout: 'main', requiresAuth: true, fullBleed: true, permission: 'm365:view' },
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
  // Envanter Takip (Inventory Management)
  {
    path: '/inventory',
    component: () => import('../layouts/InventoryLayout.vue'),
    meta: { layout: 'main', requiresAuth: true, fullBleed: true, permission: 'asset:view' },
    children: [
      {
        path: '',
        redirect: '/inventory/assets'
      },
      {
        path: 'matrix',
        name: 'inventory-matrix',
        component: () => import('../views/inventory/InventoryMatrixView.vue')
      },
      {
        path: 'assets',
        name: 'inventory-assets',
        component: () => import('../views/inventory/InventoryView.vue')
      },
      {
        path: 'personnel',
        name: 'inventory-personnel',
        component: () => import('../views/inventory/PersonnelAssetsView.vue')
      },
      {
        path: 'audit',
        name: 'inventory-audit',
        component: () => import('../views/inventory/AssetAuditView.vue')
      },
      {
        path: 'reports',
        name: 'inventory-reports',
        component: () => import('../views/inventory/AmortizationView.vue')
      }
    ]
  },
  // Kendi Zimmetlerim (Tüm personeller için)
  {
    path: '/my-assets',
    name: 'my-assets',
    component: () => import('../views/inventory/MyAssetsView.vue'),
    meta: { layout: 'main', requiresAuth: true, fullBleed: true }
  },
  // IT Destek Merkezi (Help Desk)
  {
    path: '/helpdesk',
    component: () => import('../views/helpdesk/HelpDeskLayout.vue'),
    meta: { layout: 'main', requiresAuth: true, fullBleed: true },
    children: [
      { path: '', redirect: '/helpdesk/my-tickets' },
      { path: 'my-tickets', component: () => import('../views/helpdesk/MyTicketsView.vue') },
      { path: 'pool', component: () => import('../views/helpdesk/TechnicianPoolView.vue'), meta: { permission: 'helpdesk:manage' } },
      { path: 'csat', component: () => import('../views/helpdesk/CSATReportView.vue'), meta: { permission: 'helpdesk:manage' } },
      { path: 'ticket/:id', component: () => import('../views/helpdesk/TicketDetailView.vue') }
    ]
  },
  // Master Data (Şirket, Personel, Organizasyon) - Unified Console
  {
    path: '/master-data',
    component: () => import('../views/master-data/MasterDataLayout.vue'),
    meta: { layout: 'main', requiresAuth: true, fullBleed: true, adminOnly: true },
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
        path: 'asset-definitions',
        name: 'master-asset-definitions',
        component: () => import('../views/master-data/AssetDefinitionsView.vue')
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
      {
        path: 'smtp-settings',
        name: 'master-smtp-settings',
        component: () => import('../views/master-data/SmtpSettingsView.vue'),
        meta: { permission: 'system:settings' }
      },
      {
        path: 'm365-settings',
        name: 'master-m365-settings',
        component: () => import('../views/master-data/M365SettingsView.vue'),
        meta: { permission: 'system:settings' }
      },
      {
        path: 'helpdesk-settings',
        name: 'master-helpdesk-settings',
        component: () => import('../views/master-data/HelpDeskSettingsView.vue'),
        meta: { permission: 'system:settings' }
      },
      {
        path: 'label-designer',
        name: 'master-label-designer',
        component: () => import('../views/master-data/LabelDesignerView.vue')
      },
      {
        path: 'form-designer',
        name: 'master-form-designer',
        component: () => import('../views/master-data/ZimmetFormDesignerView.vue')
      },
      {
        path: 'system-update',
        name: 'master-system-update',
        component: () => import('../views/master-data/SystemUpdateView.vue')
      },
      {
        path: 'audit-logs',
        name: 'master-audit-logs',
        component: () => import('../views/master-data/AuditLogsView.vue')
      }
    ]
  },
  // Maliyet Yönetimi (Masraf Yansıtma)
  {
    path: '/cost-management',
    name: 'cost-management',
    component: () => import('../views/cost-management/InvoicesView.vue'),
    meta: { layout: 'main', requiresAuth: true, fullBleed: true, permission: 'invoice:view' }
  },
  // Raporlar ve Analitik
  {
    path: '/reports',
    name: 'reports',
    component: () => import('../views/reports/ReportsView.vue'),
    meta: { layout: 'main', requiresAuth: true, adminOnly: true }
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
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  // Admin korumalı rotalar
  if (to.meta.adminOnly && !authStore.isAdmin) {
    return { name: 'dashboard' }
  }

  // Özel yetki gerektiren rotalar
  if (to.meta.permission && !authStore.hasPermission(to.meta.permission)) {
    return { name: 'dashboard' }
  }

  // Kullanıcı giriş yapmış ama auth sayfalarından birine gitmeye çalışıyorsa 
  // Ana sayfaya (Dashboard) yönlendir
  if (!to.meta.requiresAuth && authStore.isAuthenticated && to.name !== 'not-found') {
    return { name: 'dashboard' }
  }
})

export default router
