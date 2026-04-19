<script setup>
import { onMounted } from 'vue'
import { useMasterDataStore } from '../../stores/masterData'

const masterData = useMasterDataStore()

const masterModules = [
  {
    title: 'Personel Listesi',
    desc: 'Tüm çalışanların iletişim ve departman bilgileri',
    icon: 'fa-users',
    path: '/master-data/personnel',
    color: 'bg-blue-600'
  },
  {
    title: 'Organizasyon Yapısı',
    desc: 'Şirket, Departman ve Masraf Merkezi tanımları',
    icon: 'fa-sitemap',
    path: '/master-data/organization',
    color: 'bg-indigo-600'
  },
  {
    title: 'Sunucu Envanteri',
    desc: 'Fiziksel ve sanal sunucu kayıtları',
    icon: 'fa-server',
    path: '/master-data/servers',
    color: 'bg-slate-700'
  },
  {
    title: 'Araç Envanteri',
    desc: 'Şirket araçları ve plaka kayıtları',
    icon: 'fa-truck-moving',
    path: '/master-data/vehicles',
    color: 'bg-emerald-600'
  },
  {
    title: 'Lokasyonlar',
    desc: 'Ofis, depo ve saha lokasyon tanımları',
    icon: 'fa-map-marker-alt',
    path: '/master-data/locations',
    color: 'bg-orange-500'
  },
  {
    title: 'Operatör & Paketler',
    desc: 'GSM operatörleri ve tanımlı hizmet paketleri',
    icon: 'fa-hand-holding-heart',
    path: '/master-data/services',
    color: 'bg-rose-500'
  }
]

onMounted(async () => {
    // Fetch basic stats to show count
    await Promise.all([
        masterData.fetchPersonnel(),
        masterData.fetchCompanies(),
        masterData.fetchServers(),
        masterData.fetchVehicles()
    ])
})
</script>

<template>
  <div class="h-full overflow-y-auto bg-[#fbfbfb]">
    <div class="max-w-6xl mx-auto py-10 px-8">
        <!-- Header -->
        <div class="mb-12">
            <div class="flex items-center gap-4 mb-4">
                <div class="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                    <i class="fas fa-database text-xl"></i>
                </div>
                <div>
                    <h1 class="text-2xl font-bold text-gray-900 tracking-tight">Sistem Master Veri</h1>
                    <p class="text-gray-500 text-sm font-medium">Platform genelindeki merkezi veri havuzunu buradan yönetin.</p>
                </div>
            </div>

            <!-- Stats Bar -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                <div v-for="stat in [
                    { label: 'Personeller', count: masterData.personnel.length, color: 'text-blue-600' },
                    { label: 'Şirketler', count: masterData.companies.length, color: 'text-indigo-600' },
                    { label: 'Sunucular', count: masterData.servers.length, color: 'text-slate-600' },
                    { label: 'Araçlar', count: masterData.vehicles.length, color: 'text-emerald-600' }
                ]" :key="stat.label" class="bg-white border border-gray-100 p-4 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                    <div class="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">{{ stat.label }}</div>
                    <div class="text-2xl font-black" :class="stat.color">{{ stat.count }}</div>
                </div>
            </div>
        </div>

        <!-- Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <router-link
                v-for="m in masterModules"
                :key="m.path"
                :to="m.path"
                class="group bg-white border border-gray-100 rounded-2xl p-6 hover:border-transparent hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 flex flex-col items-start gap-4 relative overflow-hidden"
            >
                <!-- Background Accent -->
                <div class="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-5 transition-opacity">
                    <i :class="['fas text-8xl', m.icon]"></i>
                </div>

                <div :class="['w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110 relative z-10', m.color]">
                    <i :class="['fas text-xl', m.icon]"></i>
                </div>
                
                <div class="flex-1 relative z-10">
                    <h3 class="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{{ m.title }}</h3>
                    <p class="text-gray-500 mt-1 text-[13px] leading-relaxed">{{ m.desc }}</p>
                </div>

                <div class="w-full pt-4 border-t border-gray-100 flex items-center justify-between text-[13px] font-bold text-blue-600 relative z-10">
                    <span>YÖNETİME GİT</span>
                    <i class="fas fa-arrow-right transition-transform group-hover:translate-x-1"></i>
                </div>
            </router-link>
        </div>

        <!-- Info Card -->
        <div class="mt-12 bg-white border border-dashed border-gray-200 rounded-3xl p-8 flex flex-col md:flex-row items-center gap-8">
            <div class="w-16 h-16 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                <i class="fas fa-shield-halved text-2xl"></i>
            </div>
            <div>
                <h4 class="text-gray-900 font-bold text-lg">Biliyor muydunuz?</h4>
                <p class="text-gray-500 text-[14px] mt-1 pr-10">
                    Buradaki veriler "Tek Kaynak Gerçekliği" (Single Source of Truth) ilkesine göre çalışır. 
                    Bir aracın plakasını buradan güncellediğinizde, SIM Takip modülünde o araca bağlı olan tüm sim kartlardaki plaka bilgisi de anında güncellenir.
                </p>
            </div>
        </div>
    </div>
  </div>
</template>

<style scoped>
</style>
