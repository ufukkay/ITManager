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
    title: 'SIM Kart Havuzu',
    desc: 'Ses, Data ve M2M hatlarının merkezi envanter yönetimi',
    icon: 'fa-sim-card',
    path: '/master-data/sim-cards',
    color: 'bg-cyan-600'
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
  <div class="h-full overflow-y-auto bg-[#fcfcfc]">
    <div class="max-w-6xl mx-auto py-10 px-8">
        <!-- Header -->
        <div class="mb-10">
            <div class="flex items-center gap-4 mb-8">
                <div class="w-12 h-12 bg-white border border-gray-100 text-blue-600 rounded-2xl flex items-center justify-center shadow-sm">
                    <i class="fas fa-database text-xl"></i>
                </div>
                <div>
                    <h1 class="text-2xl font-bold text-gray-900 tracking-tight">Master Veri Konsolu</h1>
                    <p class="text-gray-400 text-[13px] font-medium mt-1">Platform genelindeki merkezi veri havuzunu buradan yönetin.</p>
                </div>
            </div>

            <!-- Stats Bar (Subtle) -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div v-for="stat in [
                    { label: 'Personeller', count: masterData.personnel.length, icon: 'fa-users' },
                    { label: 'Şirketler', count: masterData.companies.length, icon: 'fa-building' },
                    { label: 'Sunucular', count: masterData.servers.length, icon: 'fa-server' },
                    { label: 'Araçlar', count: masterData.vehicles.length, icon: 'fa-truck' }
                ]" :key="stat.label" class="bg-white border border-gray-100/60 p-5 rounded-2xl shadow-sm flex items-center gap-4">
                    <div class="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
                        <i :class="['fas text-[14px]', stat.icon]"></i>
                    </div>
                    <div>
                        <div class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{{ stat.label }}</div>
                        <div class="text-xl font-black text-gray-900">{{ stat.count }}</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Grid (Simple & Beautiful) -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <router-link
                v-for="m in masterModules"
                :key="m.path"
                :to="m.path"
                class="group bg-white border border-gray-100 rounded-2xl p-6 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/[0.03] transition-all duration-300 flex flex-col items-start gap-4"
            >
                <div class="w-11 h-11 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all">
                    <i :class="['fas text-[16px]', m.icon]"></i>
                </div>
                
                <div class="flex-1">
                    <h3 class="text-[15px] font-bold text-gray-900">{{ m.title }}</h3>
                    <p class="text-gray-400 mt-1.5 text-[12.5px] leading-relaxed">{{ m.desc }}</p>
                </div>

                <div class="w-full pt-4 border-t border-gray-50 flex items-center justify-between text-[11px] font-bold text-gray-300 group-hover:text-blue-600 transition-colors">
                    <span>YÖNETİME GİT</span>
                    <i class="fas fa-chevron-right text-[10px] transition-transform group-hover:translate-x-1"></i>
                </div>
            </router-link>
        </div>

        <!-- Info Card (Minimalist) -->
        <div class="mt-12 p-8 bg-blue-50/30 rounded-[2rem] border border-blue-100/50 flex flex-col md:flex-row items-center gap-8">
            <div class="w-14 h-14 rounded-2xl bg-white text-blue-500 flex items-center justify-center shrink-0 shadow-sm">
                <i class="fas fa-info-circle text-xl"></i>
            </div>
            <div>
                <h4 class="text-gray-900 font-bold text-[15px]">Veri Bütünlüğü Hakkında</h4>
                <p class="text-gray-500 text-[13px] mt-1.5 pr-10 leading-relaxed">
                    Buradaki veriler "Tek Kaynak Gerçekliği" ilkesine göre çalışır. 
                    Yapılan her güncelleme tüm modüllerde anında geçerli olur.
                </p>
            </div>
        </div>
    </div>
  </div>
</template>

<style scoped>
</style>
