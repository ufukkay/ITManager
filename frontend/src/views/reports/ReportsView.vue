<template>
  <div class="h-full flex flex-col bg-white dark:bg-slate-900 overflow-hidden">
    <!-- SUB-TABS & FILTERS BAR -->
    <div class="border-b border-[#dadce0] dark:border-slate-800 bg-[#f8f9fa] dark:bg-slate-900 shrink-0">
      <!-- Top Horizontal Browser-style Sub Tab Bar -->
      <div class="px-3 pt-2 bg-[#f8f9fa] dark:bg-slate-900 border-b border-[#dadce0] dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto overflow-y-hidden no-scrollbar">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          @click="activeTab = tab.key"
          :class="['flex items-center gap-2 px-4 py-2 text-xs font-semibold transition-all select-none shrink-0 border-t-2',
            activeTab === tab.key
              ? 'bg-white dark:bg-slate-900 text-[#1a73e8] dark:text-blue-400 border-t-[#1a73e8] border-x border-x-[#dadce0] dark:border-x-slate-800 border-b-transparent shadow-[0_-2px_8px_rgba(0,0,0,0.03)] relative -mb-[1px] z-10 font-bold'
              : 'border-t-transparent text-[#5f6368] dark:text-slate-400 hover:text-[#202124] dark:hover:text-slate-100 hover:bg-[#e8eaed]/70 dark:hover:bg-slate-800/70']"
        >
          <i :class="[tab.icon, 'text-[12px]', activeTab === tab.key ? 'text-[#1a73e8] dark:text-blue-400' : 'text-gray-400']"></i>
          <span>{{ tab.label }}</span>
        </button>
      </div>

    </div>

    <!-- CONTENT AREA -->
    <main class="flex-1 overflow-hidden flex flex-col bg-white dark:bg-slate-900">
      <div v-if="loading" class="flex flex-col items-center justify-center h-64 text-gray-400 dark:text-slate-500 gap-3">
        <i class="fas fa-circle-notch fa-spin text-3xl text-[#1a73e8]"></i>
        <span class="text-xs font-semibold">Rapor verileri hazırlanıyor...</span>
      </div>

      <!-- TAB: PERSONEL BAZLI -->
      <template v-else-if="activeTab === 'personnel'">
        <div class="flex-1 overflow-hidden flex flex-col">
          <AppTable
            storage-key="rapor-personel-maliyet"
            :columns="personnelColumns"
            :rows="personnelData.rows || []"
            :loading="loading"
            :actions="false"
            :selectable="false"
            :searchable="false"
            empty-text="Filtrelere uygun personel maliyet verisi bulunamadı"
          >
            <template #cell-personnel_name="{ row, value }">
              <div @click="openPersonnelDetail(row)" class="cursor-pointer group">
                <div class="font-bold text-gray-900 dark:text-slate-100 group-hover:text-[#1a73e8] transition-colors flex items-center gap-1.5">
                  <i class="fas fa-user-circle text-gray-300 dark:text-slate-600 text-sm"></i>
                  {{ value || 'Eşleşmemiş' }}
                </div>
              </div>
            </template>

            <!-- Hizmetler: GSM / Lisans / Amortisman badge'leri -->
            <template #cell-services="{ row }">
              <div class="flex flex-wrap gap-1.5">
                <!-- GSM Badge -->
                <button
                  v-if="row.gsm_total > 0"
                  @click="openPersonnelDetail(row)"
                  class="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold border transition-all hover:scale-105 hover:shadow-sm
                         bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20"
                  title="GSM hizmet detayı"
                >
                  <i class="fas fa-sim-card text-[9px]"></i>
                  GSM · {{ fmt(row.gsm_total) }}
                </button>
                <!-- Lisans Badge — M365 lisans maliyeti tek kaynaktan (Azure atamasından, USD) gelir -->
                <button
                  v-if="row.m365_live_license_total > 0"
                  @click="openPersonnelDetail(row)"
                  class="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold border transition-all hover:scale-105 hover:shadow-sm
                         bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-500/20"
                  title="Lisans detayı (USD)"
                >
                  <i class="fab fa-microsoft text-[9px]"></i>
                  Lisans · {{ fmtUsd(row.m365_live_license_total) }}
                </button>
                <!-- Amortisman Badge -->
                <button
                  v-if="row.amortisman_total > 0"
                  @click="openPersonnelDetail(row)"
                  class="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold border transition-all hover:scale-105 hover:shadow-sm
                         bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20"
                  title="Amortisman detayı"
                >
                  <i class="fas fa-laptop text-[9px]"></i>
                  Amortisman · {{ fmt(row.amortisman_total) }}
                </button>
                <span v-if="!row.gsm_total && !row.m365_live_license_total && !row.amortisman_total"
                      class="text-gray-300 dark:text-slate-600 text-[11px] italic">—</span>
              </div>
            </template>

            <template #cell-grand_total="{ row }">
              <span class="font-black text-gray-900 dark:text-slate-100">
                {{ fmt((row.grand_total || 0) + (row.amortisman_total || 0)) }}
                <template v-if="row.m365_live_license_total > 0"> | {{ fmtUsd(row.m365_live_license_total) }}</template>
              </span>
            </template>
          </AppTable>
        </div>
      </template>

      <!-- TAB: HİZMET & OPERATÖR -->
      <template v-else-if="activeTab === 'service'">
        <div class="overflow-y-auto flex-1 p-6 space-y-6 bg-[#f8f9fa]/30 dark:bg-slate-950">
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Hizmet Tipi Tablosu -->
            <div class="bg-white dark:bg-slate-800 border border-[#dadce0] dark:border-slate-700 overflow-hidden shadow-sm">
              <AppTable
                storage-key="rapor-hizmet-tipi"
                :columns="serviceTypeColumns"
                :rows="serviceData.byType || []"
                :loading="loading"
                :actions="false"
                :selectable="false"
                :searchable="false"
                empty-text="Veri bulunamadı"
              >
                <template #cell-invoice_type="{ value }">
                  <span :class="['badge-type', value === 'gsm' ? 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400' : 'bg-emerald-100 dark:bg-green-500/10 text-emerald-700 dark:text-green-400']">
                    {{ value?.toUpperCase() }}
                  </span>
                </template>

                <template #cell-net_amount="{ value }">
                  <span>{{ fmt(value) }}</span>
                </template>

                <template #cell-total_kdv="{ value }">
                  <span class="text-gray-400 dark:text-slate-500">{{ fmt(value) }}</span>
                </template>

                <template #cell-total_amount="{ value }">
                  <span class="font-bold text-gray-900 dark:text-slate-100">{{ fmt(value) }}</span>
                </template>
              </AppTable>
            </div>

            <!-- Masraf Merkezi Tablosu -->
            <div class="bg-white dark:bg-slate-800 border border-[#dadce0] dark:border-slate-700 overflow-hidden shadow-sm">
              <AppTable
                storage-key="rapor-hizmet-masraf"
                :columns="serviceCostCenterColumns"
                :rows="serviceData.byCostCenter || []"
                :loading="loading"
                :actions="false"
                :selectable="false"
                :searchable="false"
                empty-text="Veri bulunamadı"
              >
                <template #cell-gsm_total="{ value }">
                  <span class="text-blue-600 dark:text-blue-400 font-semibold">{{ fmt(value) }}</span>
                </template>

                <template #cell-m365_live_license_total="{ value }">
                  <span class="text-purple-600 dark:text-purple-400 font-semibold">{{ fmtUsd(value) }}</span>
                </template>

                <template #cell-grand_total="{ value }">
                  <span class="font-bold text-gray-900 dark:text-slate-100">{{ fmt(value) }}</span>
                </template>
              </AppTable>
            </div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Microsoft Lisansları (USD) Tablosu -->
            <div class="bg-white dark:bg-slate-800 border border-[#dadce0] dark:border-slate-700 overflow-hidden shadow-sm">
              <div class="px-5 py-3 border-b border-[#dadce0] dark:border-slate-700 bg-[#f8f9fa] dark:bg-slate-900 flex items-center justify-between">
                <span class="text-xs font-bold text-[#202124] dark:text-slate-100 uppercase tracking-tight flex items-center gap-2">
                  <i class="fab fa-microsoft text-[#1a73e8]"></i> Microsoft Lisansları
                </span>
                <span class="text-xs font-black text-purple-600 dark:text-purple-400">{{ fmtUsd(serviceData.m365LiveTotal) }}</span>
              </div>
              <AppTable
                storage-key="rapor-hizmet-m365-canli"
                :columns="m365LiveColumns"
                :rows="serviceData.m365Live || []"
                :loading="loading"
                :actions="false"
                :selectable="false"
                :searchable="false"
                empty-text="Lisans ataması bulunamadı"
              >
                <template #cell-unit_price="{ value }">
                  <span class="text-gray-500 dark:text-slate-400">{{ fmtUsd(value) }}</span>
                </template>
                <template #cell-monthly_cost="{ value }">
                  <span class="font-bold text-purple-600 dark:text-purple-400">{{ fmtUsd(value) }}</span>
                </template>
              </AppTable>
            </div>

            <!-- Amortisman (Aylık, TL) Tablosu -->
            <div class="bg-white dark:bg-slate-800 border border-[#dadce0] dark:border-slate-700 overflow-hidden shadow-sm">
              <div class="px-5 py-3 border-b border-[#dadce0] dark:border-slate-700 bg-[#f8f9fa] dark:bg-slate-900 flex items-center justify-between">
                <span class="text-xs font-bold text-[#202124] dark:text-slate-100 uppercase tracking-tight flex items-center gap-2">
                  <i class="fas fa-laptop text-amber-500"></i> Amortisman (Aylık)
                </span>
                <span class="text-xs font-black text-amber-600 dark:text-amber-400">{{ fmt(serviceData.amortismanTotal) }}</span>
              </div>
              <AppTable
                storage-key="rapor-hizmet-amortisman"
                :columns="amortismanColumns"
                :rows="serviceData.amortisman || []"
                :loading="loading"
                :actions="false"
                :selectable="false"
                :searchable="false"
                empty-text="Zimmetli varlık bulunamadı"
              >
                <template #cell-monthly_amortisman="{ value }">
                  <span class="font-bold text-amber-600 dark:text-amber-400">{{ fmt(value) }}</span>
                </template>
              </AppTable>
            </div>
          </div>

          <!-- Trend Grafiği Kartı -->
          <div class="rcard h-[320px] flex flex-col">
            <div class="rcard-head">
              <div class="flex items-center gap-2">
                <i class="fas fa-chart-bar text-[#1a73e8]"></i>
                <span class="rtitle">Dönemsel Maliyet Trendi</span>
              </div>
            </div>
            <div class="flex-1 p-4 min-h-0">
              <Bar v-if="serviceData.monthlyTrend?.length" :data="trendChartData" :options="barOpts" />
              <div v-else class="h-full flex items-center justify-center text-gray-400 dark:text-slate-500 text-xs">Trend verisi bulunamadı</div>
            </div>
          </div>
        </div>
      </template>

      <!-- TAB: ŞİRKET BAZLI -->
      <template v-else-if="activeTab === 'company'">
        <div class="overflow-y-auto flex-1 p-6 space-y-6 bg-[#f8f9fa]/30 dark:bg-slate-950">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Şirket Tablosu -->
          <div class="bg-white dark:bg-slate-800 border border-[#dadce0] dark:border-slate-700 overflow-hidden shadow-sm">
            <AppTable
              storage-key="rapor-sirket-maliyet"
              :columns="companyColumns"
              :rows="companyData.byCompany || []"
              :loading="loading"
              :actions="false"
              :selectable="false"
              :searchable="false"
              empty-text="Veri bulunamadı"
            >
              <template #cell-company_name="{ row, value }">
                <span @click="filters.company_id = row.company_id; load()" class="font-bold text-gray-900 dark:text-slate-100 hover:text-[#1a73e8] cursor-pointer transition-colors">
                  {{ value }}
                </span>
              </template>

              <template #cell-gsm_total="{ value }">
                <span class="text-blue-600 dark:text-blue-400 font-semibold">{{ fmt(value) }}</span>
              </template>

              <template #cell-m365_live_license_total="{ value }">
                <span class="text-purple-600 dark:text-purple-400 font-semibold">{{ fmtUsd(value) }}</span>
              </template>

              <template #cell-grand_total="{ row, value }">
                <span class="font-black text-gray-900 dark:text-slate-100">
                  {{ fmt(value) }}
                  <template v-if="row.m365_live_license_total > 0"> | {{ fmtUsd(row.m365_live_license_total) }}</template>
                </span>
              </template>
            </AppTable>
          </div>

          <!-- Şirket Masraf Kalemi Detay Tablosu -->
          <div class="bg-white dark:bg-slate-800 border border-[#dadce0] dark:border-slate-700 overflow-hidden shadow-sm">
            <AppTable
              storage-key="rapor-sirket-masraf-detay"
              :columns="companyCostCenterColumns"
              :rows="companyData.costCenterDetail || []"
              :loading="loading"
              :actions="false"
              :selectable="false"
              :searchable="false"
              empty-text="Detay görmek için soldan bir şirket seçin"
            >
              <template #cell-gsm_total="{ value }">
                <span class="text-blue-600 dark:text-blue-400 font-semibold">{{ fmt(value) }}</span>
              </template>

              <template #cell-m365_live_license_total="{ value }">
                <span class="text-purple-600 dark:text-purple-400 font-semibold">{{ fmtUsd(value) }}</span>
              </template>

              <template #cell-grand_total="{ value }">
                <span class="font-bold text-gray-900 dark:text-slate-100">{{ fmt(value) }}</span>
              </template>
            </AppTable>
          </div>
        </div>

        <div class="rcard h-[320px] flex flex-col mt-6">
          <div class="rcard-head">
            <div class="flex items-center gap-2">
              <i class="fas fa-chart-line text-[#1a73e8]"></i>
              <span class="rtitle">Şirket Dönemsel Maliyet Trendi</span>
            </div>
          </div>
          <div class="flex-1 p-4 min-h-0">
            <Bar v-if="companyData.monthlyTrend?.length" :data="companyTrendData" :options="barOpts" />
            <div v-else class="h-full flex items-center justify-center text-gray-400 dark:text-slate-500 text-xs">Trend verisi bulunamadı</div>
          </div>
        </div>
        </div>
      </template>
    </main>

    <!-- PERSONNEL DETAIL MODAL -->
    <div v-if="detailModal.open" class="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4" @click.self="closePersonnelDetail">
      <div class="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden border border-[#dadce0] dark:border-slate-700">
        <!-- Modal Header with User Icon Avatar -->
        <div class="px-6 py-4 border-b border-[#dadce0] dark:border-slate-700 bg-[#f8f9fa] dark:bg-slate-900 flex items-center justify-between shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-500/20 text-[#1a73e8] dark:text-blue-400 font-bold text-sm flex items-center justify-center border border-blue-200 dark:border-blue-500/30">
              <i class="fas fa-user"></i>
            </div>
            <div>
              <div class="text-sm font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                <span>{{ detailModal.row?.personnel_name || 'Eşleşmemiş Personel' }}</span>
              </div>
              <div class="text-[11px] text-gray-500 dark:text-slate-400 font-medium flex items-center gap-1.5 mt-0.5">
                <span>{{ detailModal.row?.company_name || 'Şirket Belirtilmemiş' }}</span>
                <span v-if="detailModal.row?.cost_center_name" class="text-gray-300 dark:text-slate-600">•</span>
                <span v-if="detailModal.row?.cost_center_name" class="text-blue-600 dark:text-blue-400 font-semibold">{{ detailModal.row.cost_center_name }}</span>
              </div>
            </div>
          </div>
          <button @click="closePersonnelDetail" class="w-8 h-8 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 flex items-center justify-center transition-colors">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <!-- Modal Content Area -->
        <div class="flex-1 overflow-y-auto p-6 space-y-6 bg-white dark:bg-slate-800">
          <AppFinancialHistory v-if="detailModal.row?.personnel_id" :personnel-id="detailModal.row.personnel_id" />

          <!-- Invoice Details Card -->
          <div class="border border-[#dadce0] dark:border-slate-700 rounded-xl p-4 bg-[#f8f9fa]/50 dark:bg-slate-900/50">
            <div class="text-xs font-bold text-[#1a73e8] uppercase tracking-wider mb-3 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <i class="fas fa-receipt"></i> Fatura Detayları
              </div>
              <span class="text-[11px] text-gray-400 dark:text-slate-500 font-normal normal-case">Dönem: {{ filters.period || 'Tüm Dönemler' }}</span>
            </div>

            <div v-if="detailModal.loadingInvoices" class="h-20 flex items-center justify-center text-gray-400 dark:text-slate-500 text-xs font-semibold">
              <i class="fas fa-spinner fa-spin mr-2 text-[#1a73e8]"></i> Fatura verileri yükleniyor...
            </div>
            <div v-else-if="detailModal.error" class="h-20 flex items-center justify-center bg-red-50 dark:bg-red-500/10 rounded-lg border border-dashed border-red-200 dark:border-red-500/30 text-red-500 dark:text-red-400 text-xs font-semibold">
              <i class="fas fa-exclamation-triangle mr-2"></i> {{ detailModal.error }}
            </div>
            <div v-else-if="!detailModal.invoices.length" class="h-20 flex items-center justify-center bg-white dark:bg-slate-900 rounded-lg border border-dashed border-gray-200 dark:border-slate-700 text-gray-400 dark:text-slate-500 text-xs">
              Bu dönem için henüz fatura kaydı bulunamadı.
            </div>
            <div v-else class="border border-[#dadce0] dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
              <table class="rtable">
                <thead>
                  <tr>
                    <th>Dönem</th><th>Tip</th><th>Operatör</th><th>Telefon / Tarife</th><th class="text-right">Tutar</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="inv in detailModal.invoices" :key="inv.id" class="hover:bg-blue-50/40 dark:hover:bg-slate-800 transition-colors">
                    <td class="text-xs font-semibold text-gray-800 dark:text-slate-200">{{ inv.period }}</td>
                    <td>
                      <span :class="['badge-type', inv.invoice_type === 'gsm' ? 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400' : 'bg-emerald-100 dark:bg-green-500/10 text-emerald-700 dark:text-green-400']">
                        {{ inv.invoice_type?.toUpperCase() }}
                      </span>
                    </td>
                    <td class="text-xs text-gray-700 dark:text-slate-300 font-semibold">{{ inv.operator }}</td>
                    <td class="text-[11px] text-gray-500 dark:text-slate-400 font-mono">{{ inv.phone_no || inv.tariff || '-' }}</td>
                    <td class="text-right text-xs font-bold text-gray-900 dark:text-slate-100">{{ fmt(inv.total_amount) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../../api'
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js'
import { Bar } from 'vue-chartjs'
import * as XLSX from 'xlsx'
import AppFinancialHistory from '../../components/AppFinancialHistory.vue'
import AppTable from '../../components/AppTable.vue'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

const loading = ref(false)
const periods = ref([])

// AppTable Columns Definition
const personnelColumns = [
  { key: 'personnel_name', label: 'Personel', sortable: true, defaultSort: 'asc' },
  { key: 'company_name', label: 'Şirket', sortable: true },
  { key: 'cost_center_name', label: 'Masraf Kalemi', sortable: true },
  { key: 'services', label: 'Alınan Hizmetler', sortable: false },
  { key: 'grand_total', label: 'Toplam Maliyet', sortable: true, align: 'right' },
]

const serviceTypeColumns = [
  { key: 'invoice_type', label: 'Tip', sortable: true },
  { key: 'operator', label: 'Operatör', sortable: true },
  { key: 'net_amount', label: 'Net Tutar', sortable: true, align: 'right' },
  { key: 'total_kdv', label: 'KDV', sortable: true, align: 'right' },
  { key: 'total_amount', label: 'Toplam', sortable: true, align: 'right' },
]

const serviceCostCenterColumns = [
  { key: 'cost_center_name', label: 'Masraf Kalemi', sortable: true },
  { key: 'gsm_total', label: 'GSM', sortable: true, align: 'right' },
  { key: 'm365_live_license_total', label: 'M365 Lisans', sortable: true, align: 'right' },
  { key: 'grand_total', label: 'Toplam', sortable: true, align: 'right' },
]

const m365LiveColumns = [
  { key: 'license_name', label: 'Lisans Planı', sortable: true },
  { key: 'seat_count', label: 'Koltuk', sortable: true, align: 'right' },
  { key: 'unit_price', label: 'Birim Fiyat', sortable: true, align: 'right' },
  { key: 'monthly_cost', label: 'Aylık Toplam', sortable: true, align: 'right' },
]

const amortismanColumns = [
  { key: 'category_name', label: 'Kategori', sortable: true },
  { key: 'asset_count', label: 'Adet', sortable: true, align: 'right' },
  { key: 'monthly_amortisman', label: 'Aylık Amortisman', sortable: true, align: 'right' },
]

const companyColumns = [
  { key: 'company_name', label: 'Şirket', sortable: true },
  { key: 'personnel_count', label: 'Personel', sortable: true, align: 'right' },
  { key: 'gsm_total', label: 'GSM', sortable: true, align: 'right' },
  { key: 'm365_live_license_total', label: 'M365 Lisans', sortable: true, align: 'right' },
  { key: 'grand_total', label: 'Toplam', sortable: true, align: 'right' },
]

const companyCostCenterColumns = [
  { key: 'cost_center_name', label: 'Masraf Kalemi', sortable: true },
  { key: 'gsm_total', label: 'GSM', sortable: true, align: 'right' },
  { key: 'm365_live_license_total', label: 'M365 Lisans', sortable: true, align: 'right' },
  { key: 'grand_total', label: 'Toplam', sortable: true, align: 'right' },
]

const activeTab = ref('personnel')
const tabs = [
  { key: 'personnel', label: 'Personel Bazlı', icon: 'fas fa-user' },
  { key: 'service', label: 'Hizmet Bazlı', icon: 'fas fa-layer-group' },
  { key: 'company', label: 'Şirket Bazlı', icon: 'fas fa-building' }
]

const filters = ref({ period: '', company_id: '', operator: '', department_id: '', cost_center_id: '' })
const detailModal = ref({ open: false, row: null, invoices: [], loadingInvoices: false })
const personnelData = ref({ rows: [], totals: null })
const serviceData = ref({ byType: [], byCostCenter: [], monthlyTrend: [], totals: null, m365Live: [], m365LiveTotal: 0, amortisman: [], amortismanTotal: 0 })
const companyData = ref({ byCompany: [], costCenterDetail: [], monthlyTrend: [], totals: null })

const fmt = (v) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(v || 0)
// Canlı M365 lisans bedeli (Azure atamasından hesaplanan) USD üzerinden tutuluyor — faturalanan
// GSM/M365 tutarları gibi TL değil, bu yüzden ayrı formatlanıyor.
const fmtUsd = (v) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v || 0)

const barOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { boxWidth: 8, font: { size: 10 } } } }, scales: { x: { grid: { display: false }, ticks: { font: { size: 10 } } }, y: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 10 } } } } }

const trendChartData = computed(() => ({
  labels: serviceData.value.monthlyTrend?.map(r => r.period) || [],
  datasets: [
    { label: 'GSM', backgroundColor: '#3b82f6', data: serviceData.value.monthlyTrend?.map(r => r.gsm) || [], borderRadius: 3 },
    { label: 'M365', backgroundColor: '#10b981', data: serviceData.value.monthlyTrend?.map(r => r.m365) || [], borderRadius: 3 }
  ]
}))

const companyTrendData = computed(() => ({
  labels: companyData.value.monthlyTrend?.map(r => r.period) || [],
  datasets: [
    { label: 'GSM', backgroundColor: '#3b82f6', data: companyData.value.monthlyTrend?.map(r => r.gsm) || [], borderRadius: 3 },
    { label: 'M365', backgroundColor: '#10b981', data: companyData.value.monthlyTrend?.map(r => r.m365) || [], borderRadius: 3 }
  ]
}))

const load = async () => {
  loading.value = true
  try {
    const q = new URLSearchParams()
    if (filters.value.period) q.set('period', filters.value.period)
    if (filters.value.company_id) q.set('company_id', filters.value.company_id)
    if (filters.value.operator) q.set('operator', filters.value.operator)
    if (filters.value.department_id) q.set('department_id', filters.value.department_id)
    if (filters.value.cost_center_id) q.set('cost_center_id', filters.value.cost_center_id)
    const qs = q.toString()

    const [pRes, sRes, cRes] = await Promise.all([
      api.get(`/api/master-data/reports/personnel?${qs}`),
      api.get(`/api/master-data/reports/service?${qs}`),
      api.get(`/api/master-data/reports/company?${qs}`)
    ])
    personnelData.value = pRes.data
    serviceData.value = sRes.data
    companyData.value = cRes.data
  } catch (e) {
    console.error('Reports load error:', e)
  } finally {
    loading.value = false
  }
}

const exportExcel = () => {
  let data = []
  let sheetName = 'Rapor'
  if (activeTab.value === 'personnel') {
    sheetName = 'Personel Bazlı'
    data = (personnelData.value.rows || []).map(r => ({
      'Personel': r.personnel_name, 'Şirket': r.company_name, 'Masraf Kalemi': r.cost_center_name,
      'Operatör': r.operators, 'GSM (₺)': r.gsm_total, 'M365 Lisans ($)': r.m365_live_license_total, 'Toplam (₺)': r.grand_total
    }))
  } else if (activeTab.value === 'service') {
    sheetName = 'Hizmet Bazlı'
    data = (serviceData.value.byType || []).map(r => ({
      'Hizmet Tipi': r.invoice_type.toUpperCase(), 'Operatör': r.operator,
      'Net (₺)': r.net_amount, 'KDV (₺)': r.total_kdv, 'ÖİV (₺)': r.total_oiv, 'Toplam (₺)': r.total_amount
    }))
  } else {
    sheetName = 'Şirket Bazlı'
    data = (companyData.value.byCompany || []).map(r => ({
      'Şirket': r.company_name, 'Personel': r.personnel_count,
      'GSM (₺)': r.gsm_total, 'M365 Lisans ($)': r.m365_live_license_total, 'Toplam (₺)': r.grand_total
    }))
  }
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(data)
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, `ITManager_${sheetName}_${filters.value.period || 'Tum'}.xlsx`)
}

const openPersonnelDetail = async (row) => {
  if (!row.personnel_id) return
  detailModal.value = { open: true, row, invoices: [], loadingInvoices: true, error: '' }
  try {
    const q = new URLSearchParams()
    if (filters.value.period) q.set('period', filters.value.period)
    const res = await api.get(`/api/master-data/reports/personnel/${row.personnel_id}/invoices?${q.toString()}`)
    detailModal.value.invoices = res.data || []
  } catch (e) {
    console.error('Personnel invoice detail load error:', e)
    detailModal.value.error = e.response?.data?.error || 'Fatura detayları yüklenemedi.'
  } finally {
    detailModal.value.loadingInvoices = false
  }
}

const closePersonnelDetail = () => {
  detailModal.value = { open: false, row: null, invoices: [], loadingInvoices: false }
}

onMounted(async () => {
  const pRes = await api.get('/api/master-data/reports/periods')
  periods.value = pRes.data
  if (periods.value.length) filters.value.period = periods.value[0]
  await load()
})
</script>

<style scoped>
.filter-select { @apply w-full h-8 px-2.5 bg-white dark:bg-slate-800 border border-[#dadce0] dark:border-slate-700 rounded-lg text-xs font-semibold text-gray-800 dark:text-slate-200 outline-none focus:border-[#1a73e8] transition-colors cursor-pointer shadow-sm; }
.rcard { @apply bg-white dark:bg-slate-800 border border-[#dadce0] dark:border-slate-700 rounded-lg shadow-sm overflow-hidden; }
.rcard-head { @apply px-5 py-3 border-b border-[#dadce0] dark:border-slate-700 flex items-center justify-between bg-[#f8f9fa] dark:bg-slate-900; }
.rtitle { @apply text-xs font-bold text-[#202124] dark:text-slate-100 uppercase tracking-tight; }
.badge { @apply px-2.5 py-0.5 bg-blue-50 dark:bg-blue-500/10 text-[#1a73e8] dark:text-blue-400 text-[10px] font-bold rounded-full border border-[#1a73e8]/20; }
.badge-type { @apply px-2 py-0.5 text-[10px] font-bold rounded uppercase; }
.rtable { @apply w-full text-left border-collapse; }
.rtable thead tr { @apply bg-[#f8f9fa] dark:bg-slate-900 border-b border-[#dadce0] dark:border-slate-700; }
.rtable thead th { @apply px-4 py-3 text-[10.5px] font-bold text-[#5f6368] dark:text-slate-400 uppercase tracking-wider; }
.rtable tbody tr { @apply border-b border-gray-100 dark:border-slate-800 transition-colors; }
.rtable tbody td { @apply px-4 py-3 text-xs; }
.rtable tfoot td { @apply px-4 py-3; }
</style>
