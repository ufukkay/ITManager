<template>
  <div class="h-full flex flex-col bg-white dark:bg-slate-800 dark:bg-slate-900 overflow-hidden">
    <!-- HEADER -->
    <header class="h-14 border-b border-gray-100 dark:border-slate-800 dark:border-slate-800 flex items-center px-6 justify-between bg-white dark:bg-slate-800 dark:bg-slate-800 shrink-0">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
          <i class="fas fa-boxes"></i>
        </div>
        <div>
          <h1 class="text-[14px] font-bold text-gray-900 dark:text-slate-100 dark:text-slate-100 leading-tight">Envanter Takibi</h1>
          <p class="text-[10.5px] text-gray-400 dark:text-slate-500 dark:text-slate-500 font-medium">Tüm donanım, zimmet ve depo varlıklarınızı akıllı filtrelerle süzün</p>
        </div>
      </div>

      <!-- ACTIONS (SHRINK-0) -->
      <div class="flex items-center gap-1.5 shrink-0">
        <button 
          v-if="selectedAssetIds.length > 0"
          @click="openBatchStickerModal"
          class="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11.5px] rounded-lg transition-colors whitespace-nowrap shadow-sm flex items-center gap-1.5 animate-pulse"
        >
          <i class="fas fa-barcode"></i> Toplu Etiket Yazdır ({{ selectedAssetIds.length }})
        </button>
        <input 
          type="file" 
          ref="excelInput" 
          class="hidden" 
          accept=".xlsx, .xls" 
          @change="handleExcelImport" 
        />
        <button @click="downloadTemplate" class="px-2.5 py-1.5 bg-gray-100 dark:bg-slate-700 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-300 dark:text-slate-300 font-bold text-[11.5px] rounded-lg transition-colors whitespace-nowrap" v-if="authStore.hasPermission('asset:edit')" title="Excel Şablonu İndir">
          <i class="fas fa-file-download mr-1"></i>Şablon
        </button>
        <button @click="$refs.excelInput.click()" class="px-2.5 py-1.5 bg-gray-100 dark:bg-slate-700 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-300 dark:text-slate-300 font-bold text-[11.5px] rounded-lg transition-colors whitespace-nowrap" v-if="authStore.hasPermission('asset:edit')" title="Excel ile Yükle">
          <i class="fas fa-file-import mr-1"></i>Excel Yükle
        </button>
        <button @click="openConfigModal" class="px-2.5 py-1.5 bg-gray-100 dark:bg-slate-700 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-300 dark:text-slate-300 font-bold text-[11.5px] rounded-lg transition-colors whitespace-nowrap" title="Kategori, Marka & Model Tanımlamaları">
          <i class="fas fa-cog mr-1"></i>Tanımlamalar
        </button>
        <button @click="openAddModal" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11.5px] rounded-lg transition-colors whitespace-nowrap shadow-sm" v-if="authStore.hasPermission('asset:edit')">
          <i class="fas fa-plus mr-1"></i>Yeni Varlık
        </button>
      </div>
    </header>

    <!-- SMART FILTER BAR (AKILLI FİLTRE & ÇOKLU SÜZME ÇUBUĞU) -->
    <div class="bg-gray-50/90 dark:bg-slate-900/90 border-b border-gray-200 dark:border-slate-700 dark:border-slate-700 px-6 py-2 flex items-center justify-between gap-3 shrink-0 flex-wrap">
      <div class="flex items-center gap-2 flex-1 flex-wrap min-w-0">
        <!-- 1. SMART SEARCH INPUT -->
        <div class="relative flex items-center shrink-0 w-64 xl:w-72">
          <i class="fas fa-search absolute left-3 text-gray-400 dark:text-slate-500 dark:text-slate-500 text-xs"></i>
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="Marka, Model, Personel, Seri No, Envanter No..." 
            class="h-8 pl-8 pr-8 w-full bg-white dark:bg-slate-800 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 dark:border-slate-700 rounded-lg text-xs font-medium text-gray-800 dark:text-slate-200 dark:text-slate-200 outline-none focus:border-blue-500 shadow-sm"
          />
          <button 
            v-if="searchQuery" 
            @click="searchQuery = ''" 
            class="absolute right-7 text-gray-400 dark:text-slate-500 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 dark:hover:text-slate-300 text-xs"
          >
            &times;
          </button>
          <button 
            @click="showScannerModal = true" 
            class="absolute right-2.5 text-gray-400 dark:text-slate-500 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 dark:hover:text-blue-400 transition-colors"
            title="Kamera ile QR / Barkod Tara"
          >
            <i class="fas fa-camera text-xs"></i>
          </button>
        </div>

        <!-- 2. ASSIGNMENT TABS -->
        <div class="flex items-center gap-0.5 bg-gray-200/70 dark:bg-slate-700/70 rounded-lg p-0.5 shrink-0">
          <button 
            @click="assignmentFilter = 'ALL'" 
            :class="['px-2.5 py-1 rounded text-[11px] font-bold transition-all', assignmentFilter === 'ALL' ? 'bg-white dark:bg-slate-800 dark:bg-slate-800 text-gray-900 dark:text-slate-100 dark:text-slate-100 shadow-sm' : 'text-gray-600 dark:text-slate-400 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 dark:hover:text-slate-100']"
          >
            Hepsi
          </button>
          <button 
            @click="assignmentFilter = 'ASSIGNED'" 
            :class="['px-2.5 py-1 rounded text-[11px] font-bold transition-all', assignmentFilter === 'ASSIGNED' ? 'bg-white dark:bg-slate-800 dark:bg-slate-800 text-emerald-800 dark:text-green-400 shadow-sm' : 'text-gray-600 dark:text-slate-400 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 dark:hover:text-slate-100']"
          >
            Zimmetli
          </button>
          <button 
            @click="assignmentFilter = 'UNASSIGNED'" 
            :class="['px-2.5 py-1 rounded text-[11px] font-bold transition-all', assignmentFilter === 'UNASSIGNED' ? 'bg-white dark:bg-slate-800 dark:bg-slate-800 text-blue-800 dark:text-blue-400 shadow-sm' : 'text-gray-600 dark:text-slate-400 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 dark:hover:text-slate-100']"
          >
            Depoda
          </button>
        </div>

        <!-- 3. CATEGORY SELECT -->
        <select v-model="filters.category_id" class="h-8 px-2.5 bg-white dark:bg-slate-800 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 dark:border-slate-700 rounded-lg text-xs font-medium text-gray-700 dark:text-slate-300 dark:text-slate-300 outline-none focus:border-blue-500 shadow-sm cursor-pointer shrink-0">
          <option value="">📂 Tüm Kategoriler</option>
          <option v-for="cat in assetStore.metadata.categories" :key="cat.id" :value="cat.id">
            {{ cat.name }}
          </option>
        </select>

        <!-- 4. BRAND SELECT -->
        <select v-model="filters.brand_id" class="h-8 px-2.5 bg-white dark:bg-slate-800 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 dark:border-slate-700 rounded-lg text-xs font-medium text-gray-700 dark:text-slate-300 dark:text-slate-300 outline-none focus:border-blue-500 shadow-sm cursor-pointer shrink-0">
          <option value="">🏷️ Tüm Markalar</option>
          <option v-for="b in assetStore.metadata.brands" :key="b.id" :value="b.id">
            {{ b.name }}
          </option>
        </select>

        <!-- 5. COMPANY SELECT -->
        <select v-model="filters.company_id" class="h-8 px-2.5 bg-white dark:bg-slate-800 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 dark:border-slate-700 rounded-lg text-xs font-medium text-gray-700 dark:text-slate-300 dark:text-slate-300 outline-none focus:border-blue-500 shadow-sm cursor-pointer shrink-0">
          <option value="">🏢 Tüm Şirketler</option>
          <option v-for="comp in assetStore.metadata.companies" :key="comp.id" :value="comp.id">
            {{ comp.name }}
          </option>
        </select>

        <!-- 6. STATUS SELECT -->
        <select v-model="filters.status_id" class="h-8 px-2.5 bg-white dark:bg-slate-800 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 dark:border-slate-700 rounded-lg text-xs font-medium text-gray-700 dark:text-slate-300 dark:text-slate-300 outline-none focus:border-blue-500 shadow-sm cursor-pointer shrink-0">
          <option value="">🚩 Tüm Durumlar</option>
          <option v-for="st in assetStore.metadata.statuses" :key="st.id" :value="st.id">
            {{ st.name }}
          </option>
        </select>

        <!-- 7. CLEAR FILTERS BUTTON -->
        <button 
          v-if="hasActiveFilters" 
          @click="resetFilters" 
          class="h-8 px-3 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shrink-0"
          title="Tüm filtreleri sıfırla"
        >
          <i class="fas fa-times text-[10px]"></i> Temizle
        </button>
      </div>

      <!-- RESULTS COUNT COUNTER -->
      <div class="text-xs font-bold text-gray-500 dark:text-slate-400 dark:text-slate-400 whitespace-nowrap flex items-center gap-1.5">
        <span>Gösterilen:</span>
        <span class="text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2.5 py-0.5 rounded-full font-mono font-black border border-blue-100 dark:border-blue-500/30">
          {{ filteredAssets.length }} / {{ assetStore.assets.length }}
        </span>
      </div>
    </div>

    <!-- KPI / FINANCIAL SUMMARY BAR -->
    <div class="grid grid-cols-4 gap-px bg-gray-100 dark:bg-slate-700 dark:bg-slate-700 border-b border-gray-100 dark:border-slate-800 dark:border-slate-800 shrink-0">
      <div class="bg-white dark:bg-slate-800 dark:bg-slate-800 px-6 py-3 flex items-center gap-3">
        <div class="w-9 h-9 rounded-lg flex items-center justify-center bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-sm">
          <i class="fas fa-laptop"></i>
        </div>
        <div>
          <div class="text-[10px] font-bold text-gray-400 dark:text-slate-500 dark:text-slate-500 uppercase tracking-widest">Toplam Varlık</div>
          <div class="text-[16px] font-black text-gray-900 dark:text-slate-100 dark:text-slate-100">{{ filteredAssets.length }} / {{ assetStore.assets.length }}</div>
        </div>
      </div>
      <div class="bg-white dark:bg-slate-800 dark:bg-slate-800 px-6 py-3 flex items-center gap-3">
        <div class="w-9 h-9 rounded-lg flex items-center justify-center bg-emerald-50 dark:bg-green-500/10 text-emerald-600 dark:text-green-400 text-sm">
          <i class="fas fa-wallet"></i>
        </div>
        <div>
          <div class="text-[10px] font-bold text-gray-400 dark:text-slate-500 dark:text-slate-500 uppercase tracking-widest">Envanter Değeri</div>
          <div class="text-[16px] font-black text-gray-900 dark:text-slate-100 dark:text-slate-100">{{ fmt(assetStore.financialSummary.totalValuation) }}</div>
        </div>
      </div>
      <div class="bg-white dark:bg-slate-800 dark:bg-slate-800 px-6 py-3 flex items-center gap-3">
        <div class="w-9 h-9 rounded-lg flex items-center justify-center bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 text-sm">
          <i class="fas fa-chart-line"></i>
        </div>
        <div>
          <div class="text-[10px] font-bold text-gray-400 dark:text-slate-500 dark:text-slate-500 uppercase tracking-widest">Aylık Amortisman/Maliyet</div>
          <div class="text-[16px] font-black text-gray-900 dark:text-slate-100 dark:text-slate-100">{{ fmt(assetStore.financialSummary.monthlyAmortization) }}</div>
        </div>
      </div>
      <div class="bg-white dark:bg-slate-800 dark:bg-slate-800 px-6 py-3 flex items-center gap-3">
        <div class="w-9 h-9 rounded-lg flex items-center justify-center bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 text-sm">
          <i class="fas fa-user-check"></i>
        </div>
        <div>
          <div class="text-[10px] font-bold text-gray-400 dark:text-slate-500 dark:text-slate-500 uppercase tracking-widest">Zimmetli / Boşta</div>
          <div class="text-[16px] font-black text-gray-900 dark:text-slate-100 dark:text-slate-100">
            {{ inUseCount }} / {{ warehouseCount }}
          </div>
        </div>
      </div>
    </div>

    <!-- MAIN TABLE AREA -->
    <main class="flex-1 overflow-y-auto bg-gray-50/40 dark:bg-slate-900 p-6">
      <AppTable
        :columns="columns"
        :rows="tableAssets"
        :loading="assetStore.loading"
        :quick-filters="tableQuickFilters"
        :selectable="true"
        empty-text="Hiçbir varlık bulunamadı"
        @selection-change="onTableSelectionChange"
      >
        <!-- Cell: Serial No / Barcode -->
        <template #cell-serial_no="{ row }">
          <div @click="toggleExpand(row.id)" class="flex items-center gap-1.5 cursor-pointer group hover:text-blue-600 dark:hover:text-blue-400">
            <i :class="['fas fa-chevron-right text-[10px] transition-transform text-gray-400 dark:text-slate-500 group-hover:text-blue-500', expandedAssetId === row.id ? 'rotate-90 text-blue-500' : '']"></i>
            <div class="font-bold text-gray-900 dark:text-slate-100">{{ row.phone_no || row.serial_no }}</div>
          </div>
          <div class="text-[10.5px] text-gray-400 dark:text-slate-500 flex items-center gap-1.5 mt-0.5 pl-4" v-if="row.phone_no && row.serial_no">
            <i class="fas fa-sim-card"></i> {{ row.serial_no }}
          </div>
          <div class="text-[10.5px] text-gray-400 dark:text-slate-500 flex items-center gap-1.5 mt-0.5 pl-4" v-else-if="!row.phone_no && row.barcode">
            <i class="fas fa-barcode"></i> {{ row.barcode }}
          </div>
        </template>

        <!-- Cell: Device / Model -->
        <template #cell-device_model="{ row }">
          <div class="font-semibold text-gray-700 dark:text-slate-300">{{ row.brand_name }} {{ row.model_name }}</div>
          <div class="text-[10.5px] text-gray-400 dark:text-slate-500">{{ row.category_name }}</div>
        </template>

        <!-- Cell: Status -->
        <template #cell-status_name="{ row, value }">
          <span :class="['px-2 py-0.5 rounded-full text-[10px] font-bold uppercase', getStatusClass(value)]">
            {{ value }}
          </span>
        </template>

        <!-- Cell: Company / Owner -->
        <template #cell-owner_display="{ row }">
          <div class="font-medium text-gray-800 dark:text-slate-200">{{ row.company_name }}</div>
          <div class="text-[11.5px] text-gray-500 dark:text-slate-400 mt-0.5">
            <span v-if="row.personnel_id" class="text-blue-600 dark:text-blue-400 font-semibold">
              <i class="fas fa-user mr-1 text-[10px]"></i> {{ row.personnel_name }}
            </span>
            <span v-else-if="row.location_id" class="text-purple-600 dark:text-purple-400 font-semibold">
              <i class="fas fa-map-marker-alt mr-1 text-[10px]"></i> {{ row.location_name }}
            </span>
            <span v-else-if="row.vehicle_id" class="text-emerald-600 dark:text-green-400 font-semibold">
              <i class="fas fa-car mr-1 text-[10px]"></i> {{ row.vehicle_plate_no }}
            </span>
            <span v-else-if="row.department_id" class="text-amber-600 dark:text-amber-400 font-semibold">
              <i class="fas fa-sitemap mr-1 text-[10px]"></i> {{ row.department_name }}
            </span>
            <span v-else-if="row.cost_center_id" class="text-rose-600 dark:text-red-400 font-semibold">
              <i class="fas fa-wallet mr-1 text-[10px]"></i> {{ row.cost_center_name }}
            </span>
            <span v-else class="text-gray-400 dark:text-slate-500 italic">Depoda / Atanmamış</span>
          </div>
        </template>

        <!-- Cell: Documents -->
        <template #cell-documents="{ row }">
          <div class="flex items-center gap-2">
            <a v-if="row.invoice_path" :href="row.invoice_path" target="_blank" class="text-blue-600 hover:text-blue-800 dark:hover:text-blue-300 text-[11px] font-bold flex items-center gap-1" title="Faturayı Görüntüle">
              <i class="fas fa-file-invoice"></i> Fatura
            </a>
            <a v-if="row.warranty_path" :href="row.warranty_path" target="_blank" class="text-purple-600 hover:text-purple-800 dark:hover:text-purple-300 text-[11px] font-bold flex items-center gap-1" title="Garanti Belgesini Görüntüle">
              <i class="fas fa-shield-alt"></i> Garanti
            </a>
            <span v-if="!row.invoice_path && !row.warranty_path" class="text-gray-300 dark:text-slate-600 text-[11px] italic">Dosya yok</span>
          </div>
        </template>

        <!-- Cell: Monthly Cost -->
        <template #cell-monthly_cost="{ row, value }">
          <div class="font-semibold text-gray-900 dark:text-slate-100">{{ fmt(value) }}</div>
          <div class="text-[10px] text-gray-400 dark:text-slate-500">
            Ömür: {{ row.lifetime_months }} Ay · Bedel: {{ fmt(row.purchase_price) }}
          </div>
        </template>

        <!-- Cell: Actions -->
        <template #actions="{ row }">
          <div class="flex items-center justify-end gap-1.5">
            <button @click="openStickerModal(row)" class="btn-actions" title="QR & Barkod Etiketi Yazdır">
              <i class="fas fa-qrcode text-blue-600"></i>
            </button>
            <RouterLink v-if="row.personnel_id" :to="{ path: '/inventory/personnel', query: { print_personnel_id: row.personnel_id } }" class="btn-actions" title="Zimmet Formu / Tutanağı Yazdır">
              <i class="fas fa-file-contract text-purple-600"></i>
            </RouterLink>
            <button @click="showLogs(row)" class="btn-actions" title="İşlem Geçmişi">
              <i class="fas fa-history text-gray-500 dark:text-slate-400"></i>
            </button>
            <button @click="showNotesModal(row)" class="btn-actions" title="Not Arşivi & Not Ekle">
              <i class="fas fa-sticky-note text-amber-500"></i>
            </button>
            <!-- Checkout (Zimmetle) -->
            <button 
              v-if="!row.personnel_id && !row.location_id && authStore.hasPermission('asset:edit')" 
              @click="openCheckoutModal(row)" 
              class="btn-actions" 
              title="Zimmet Atama"
            >
              <i class="fas fa-user-plus text-emerald-600"></i>
            </button>
            <!-- Checkin (Zimmet İade) -->
            <button 
              v-if="(row.personnel_id || row.location_id) && authStore.hasPermission('asset:edit')" 
              @click="handleCheckin(row)" 
              class="btn-actions" 
              title="Depoya İade Et"
            >
              <i class="fas fa-undo text-amber-600"></i>
            </button>
            <!-- Edit -->
            <button 
              v-if="authStore.hasPermission('asset:edit')" 
              @click="openEditModal(row)" 
              class="btn-actions" 
              title="Düzenle"
            >
              <i class="fas fa-edit text-blue-600"></i>
            </button>
            <!-- Delete -->
            <button 
              v-if="authStore.hasPermission('asset:edit')" 
              @click="handleDelete(row)" 
              class="btn-actions" 
              title="Sil"
            >
              <i class="fas fa-trash text-red-500"></i>
            </button>
          </div>
        </template>

        <!-- Drawer Row Expansion -->
        <template #row-expansion="{ row, colspan }">
          <tr v-if="expandedAssetId === row.id" class="bg-blue-50/20 dark:bg-blue-500/5 border-b border-blue-100 dark:border-blue-500/20 animate-fade-in">
            <td :colspan="colspan" class="px-8 py-4">
              <div class="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-800 p-4 rounded-xl border border-blue-100 dark:border-blue-500/20 shadow-sm">
                <!-- Column 1: Hardware Specs -->
                <div class="space-y-2 border-r border-gray-100 dark:border-slate-800 pr-4">
                  <div class="font-black text-gray-900 dark:text-slate-100 uppercase tracking-wider text-[10px] flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                    <i class="fas fa-microchip"></i> Donanım Özellikleri
                  </div>
                  <div class="flex justify-between py-0.5 border-b border-gray-50 dark:border-slate-800"><span class="text-gray-400 dark:text-slate-500">İşlemci (CPU):</span> <span class="font-bold text-gray-900 dark:text-slate-100">{{ row.cpu_model || '—' }}</span></div>
                  <div class="flex justify-between py-0.5 border-b border-gray-50 dark:border-slate-800"><span class="text-gray-400 dark:text-slate-500">RAM:</span> <span class="font-bold text-gray-900 dark:text-slate-100">{{ row.ram_gb ? row.ram_gb + ' GB' : '—' }}</span></div>
                  <div class="flex justify-between py-0.5 border-b border-gray-50 dark:border-slate-800"><span class="text-gray-400 dark:text-slate-500">Disk Depolama:</span> <span class="font-bold text-gray-900 dark:text-slate-100">{{ row.disk_gb ? row.disk_gb + ' GB' : '—' }}</span></div>
                  <div class="flex justify-between py-0.5"><span class="text-gray-400 dark:text-slate-500">İşletim Sistemi:</span> <span class="font-bold text-gray-900 dark:text-slate-100">{{ row.os_version || '—' }}</span></div>
                </div>

                <!-- Column 2: Network Specs -->
                <div class="space-y-2 border-r border-gray-100 dark:border-slate-800 pr-4">
                  <div class="font-black text-gray-900 dark:text-slate-100 uppercase tracking-wider text-[10px] flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
                    <i class="fas fa-network-wired"></i> Ağ & Bağlantı Bilgileri
                  </div>
                  <div class="flex justify-between py-0.5 border-b border-gray-50 dark:border-slate-800"><span class="text-gray-400 dark:text-slate-500">IP Adresi:</span> <span class="font-mono font-bold text-gray-900 dark:text-slate-100">{{ row.ip_address || '—' }}</span></div>
                  <div class="flex justify-between py-0.5"><span class="text-gray-400 dark:text-slate-500">MAC Adresi:</span> <span class="font-mono font-bold text-gray-900 dark:text-slate-100">{{ row.mac_address || '—' }}</span></div>
                </div>

                <!-- Column 3: Dynamic Category Specs (IMEI, Custom Attributes) -->
                <div class="space-y-2">
                  <div class="font-black text-gray-900 dark:text-slate-100 uppercase tracking-wider text-[10px] flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                    <i class="fas fa-sliders-h"></i> Dinamik & Kategori Özellikleri
                  </div>
                  <div v-if="parseCustomSpecs(row.specs_json).length === 0" class="text-gray-400 dark:text-slate-500 italic text-[11px] py-2">
                    Özel tanımlanmış detay bulunmuyor.
                  </div>
                  <div v-else class="space-y-1">
                    <div v-for="spec in parseCustomSpecs(row.specs_json)" :key="spec.key" class="flex justify-between py-0.5 border-b border-gray-50 dark:border-slate-800">
                      <span class="text-gray-400 dark:text-slate-500">{{ spec.key }}:</span>
                      <span class="font-bold text-gray-900 dark:text-slate-100">{{ spec.value || '—' }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </td>
          </tr>
        </template>
      </AppTable>
    </main>

    <!-- CONFIGURATION DIALOG / MODAL -->
    <dialog ref="configDialog" class="modal">
      <div class="modal-box w-11/12 max-w-2xl bg-white dark:bg-slate-800 p-6 rounded-2xl relative shadow-2xl">
        <h3 class="font-bold text-[16px] text-gray-900 dark:text-slate-100 mb-4 flex items-center gap-2">
          <i class="fas fa-cog text-brand"></i> Envanter Tanımlamaları
        </h3>
        
        <div class="grid grid-cols-2 gap-6">
          <!-- Add Category -->
          <div class="border border-gray-100 dark:border-slate-800 rounded-xl p-4 bg-gray-50/50 dark:bg-slate-900/50">
            <h4 class="font-bold text-[13px] text-gray-700 dark:text-slate-300 mb-3">Kategori Ekle</h4>
            <div class="flex gap-2">
              <input v-model="newCategory" type="text" placeholder="Kategori adı..." class="form-input flex-1" />
              <button @click="submitCategory" class="btn-primary-sm">Ekle</button>
            </div>
          </div>

          <!-- Add Brand -->
          <div class="border border-gray-100 dark:border-slate-800 rounded-xl p-4 bg-gray-50/50 dark:bg-slate-900/50">
            <h4 class="font-bold text-[13px] text-gray-700 dark:text-slate-300 mb-3">Marka Ekle</h4>
            <div class="flex gap-2">
              <input v-model="newBrand" type="text" placeholder="Marka adı..." class="form-input flex-1" />
              <button @click="submitBrand" class="btn-primary-sm">Ekle</button>
            </div>
          </div>
        </div>

        <!-- Add Model -->
        <div class="border border-gray-100 dark:border-slate-800 rounded-xl p-4 bg-gray-50/50 dark:bg-slate-900/50 mt-6">
          <h4 class="font-bold text-[13px] text-gray-700 dark:text-slate-300 mb-3">Model Ekle</h4>
          <div class="grid grid-cols-3 gap-3">
            <select v-model="newModelData.category_id" class="form-select">
              <option value="">Kategori Seçin</option>
              <option v-for="c in assetStore.metadata.categories" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
            <select v-model="newModelData.brand_id" class="form-select">
              <option value="">Marka Seçin</option>
              <option v-for="b in assetStore.metadata.brands" :key="b.id" :value="b.id">{{ b.name }}</option>
            </select>
            <input v-model="newModelData.name" type="text" placeholder="Model adı..." class="form-input" />
          </div>
          <button @click="submitModel" class="btn-primary-sm w-full mt-3">Yeni Modeli Kaydet</button>
        </div>

        <div class="modal-action mt-6">
          <button @click="closeConfigModal" class="btn-secondary">Kapat</button>
        </div>
      </div>
    </dialog>

    <!-- ADD/EDIT ASSET DIALOG -->
    <dialog ref="assetDialog" class="modal">
      <div class="modal-box w-11/12 max-w-xl bg-white dark:bg-slate-800 p-6 rounded-2xl relative shadow-2xl">
        <h3 class="font-bold text-[16px] text-gray-900 dark:text-slate-100 mb-4">
          {{ isEditMode ? 'Varlık Düzenle' : 'Yeni Varlık Ekle' }}
        </h3>
        
        <form @submit.prevent="saveAsset" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="form-label">{{ isSimCategory ? 'ICCID (varsa)' : 'Seri Numarası *' }}</label>
              <input v-model="assetForm.serial_no" type="text" class="form-input" :required="!isSimCategory" />
            </div>
            <div>
              <label class="form-label">{{ isSimCategory ? 'Telefon No *' : 'Envanter No (Demirbaş Etiketi)' }}</label>
              <input v-model="assetForm.barcode" type="text" class="form-input" :placeholder="isSimCategory ? '5XX XXX XX XX' : ''" :required="isSimCategory" />
            </div>
          </div>

          <!-- Cascading Selection: Category -> Brand -> Model -->
          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="form-label">1. Kategori Seçin</label>
              <select v-model="selectedCategoryId" class="form-select">
                <option value="">Tüm Kategoriler</option>
                <option v-for="c in assetStore.metadata.categories" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </div>
            <div>
              <label class="form-label">2. Marka Seçin</label>
              <select v-model="selectedBrandId" class="form-select">
                <option value="">Tüm Markalar</option>
                <option v-for="b in availableBrandsForSelect" :key="b.id" :value="b.id">{{ b.name }}</option>
              </select>
            </div>
            <div>
              <label class="form-label">3. Model Seçin *</label>
              <select v-model="assetForm.model_id" class="form-select" required>
                <option value="">Model Seçiniz</option>
                <option v-for="m in availableModelsForSelect" :key="m.id" :value="m.id">
                  {{ m.name }}
                </option>
              </select>
            </div>
          </div>

          <div>
            <label class="form-label">Şirket / Sahip Kurum *</label>
            <select v-model="assetForm.company_id" class="form-select" required>
              <option value="">Şirket Seçiniz</option>
              <option v-for="c in assetStore.metadata.companies" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>

          <div v-if="!isSimCategory" class="grid grid-cols-3 gap-4">
            <div>
              <label class="form-label">Alış Bedeli (₺)</label>
              <input v-model.number="assetForm.purchase_price" type="number" step="0.01" class="form-input" />
            </div>
            <div>
              <label class="form-label">Alış Tarihi</label>
              <input v-model="assetForm.purchase_date" type="date" class="form-input" />
            </div>
            <div>
              <label class="form-label">Kullanım Ömrü (Ay)</label>
              <input v-model.number="assetForm.lifetime_months" type="number" class="form-input" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="form-label">Fatura Belgesi (PDF/Görsel)</label>
              <input type="file" @change="handleFileChange($event, 'invoice')" class="file-input-custom" accept=".pdf,image/*" />
              <div v-if="assetForm.invoice_path" class="text-[10px] text-green-600 dark:text-green-400 mt-1">✓ Fatura yüklü</div>
            </div>
            <div>
              <label class="form-label">Garanti Belgesi (PDF/Görsel)</label>
              <input type="file" @change="handleFileChange($event, 'warranty')" class="file-input-custom" accept=".pdf,image/*" />
              <div v-if="assetForm.warranty_path" class="text-[10px] text-green-600 dark:text-green-400 mt-1">✓ Garanti Belgesi yüklü</div>
            </div>
          </div>

          <div v-if="!isSimCategory">
            <label class="form-label">Genel Durum *</label>
            <select v-model="assetForm.status_id" class="form-select" required>
              <option value="">Durum Seçiniz</option>
              <option v-for="s in assetStore.metadata.statuses" :key="s.id" :value="s.id">{{ s.name }}</option>
            </select>
          </div>
          <p v-else class="text-[11px] text-gray-400 dark:text-slate-500 -mt-2">
            Durum, atadığınız sahiplik bilgisine göre otomatik belirlenir (sahiplik yoksa Depoda, varsa Zimmetlendi).
          </p>

          <div>
            <label class="form-label">Notlar / Açıklama</label>
            <textarea v-model="assetForm.notes" class="form-textarea" rows="3"></textarea>
          </div>

          <!-- Technical & Dynamic Specs Section -->
          <div class="border-t border-b border-gray-100 dark:border-slate-800 py-3 my-2 space-y-3">
            <h4 class="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <i class="fas fa-microchip text-blue-500 dark:text-blue-400"></i> Kategoriye Özel & Teknik Özellikler
            </h4>

            <!-- Category-Defined Custom Dynamic Fields -->
            <div v-if="currentCategoryFields.length > 0" class="grid grid-cols-2 gap-3 bg-blue-50/50 dark:bg-blue-500/10 p-3 rounded-lg border border-blue-100 dark:border-blue-500/30">
              <div v-for="fieldName in currentCategoryFields" :key="fieldName">
                <label class="form-label text-blue-900 dark:text-blue-400 font-bold text-[11px]">{{ fieldName }}</label>
                <input v-model="categoryDynamicInputs[fieldName]" type="text" :placeholder="`${fieldName} giriniz...`" class="form-input" />
              </div>
            </div>

            <!-- Dynamic Custom Specs Rows -->
            <div v-if="customSpecsList.length > 0" class="space-y-2 pt-2 border-t border-gray-100 dark:border-slate-800">
              <div class="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase">Özel Özellik Listesi:</div>
              <div v-for="(spec, idx) in customSpecsList" :key="idx" class="flex items-center gap-2">
                <input v-model="spec.key" type="text" placeholder="Özellik Adı (Örn: Ekran Boyutu)" class="form-input flex-1" />
                <input v-model="spec.value" type="text" placeholder="Değer (Örn: 27 İnç)" class="form-input flex-1" />
                <button type="button" @click="removeCustomSpecRow(idx)" class="text-red-500 hover:text-red-700 dark:hover:text-red-400 text-xs px-2 font-bold" title="Sil">
                  <i class="fas fa-times"></i>
                </button>
              </div>
            </div>
          </div>

          <div class="modal-action mt-6 flex justify-end gap-2">
            <button type="button" @click="closeAssetModal" class="btn-secondary">İptal</button>
            <button type="submit" class="btn-primary">Kaydet</button>
          </div>
        </form>
      </div>
    </dialog>

    <!-- CHECKOUT DIALOG (ZİMMET ATAMA) -->
    <dialog ref="checkoutDialog" class="modal">
      <div class="modal-box w-11/12 max-w-md bg-white dark:bg-slate-800 p-6 rounded-2xl relative shadow-2xl">
        <h3 class="font-bold text-[16px] text-gray-900 dark:text-slate-100 mb-4">
          Varlık Zimmetle: {{ selectedAsset?.serial_no }}
        </h3>
        
        <form @submit.prevent="saveCheckout" class="space-y-4">
          <div>
            <label class="form-label">Zimmet Hedefi</label>
            <div class="flex items-center gap-4 mt-2 flex-wrap">
              <label class="flex items-center gap-1.5 text-[12.5px] cursor-pointer">
                <input type="radio" v-model="checkoutForm.target_type" value="PERSONNEL" />
                Personel
              </label>
              <label class="flex items-center gap-1.5 text-[12.5px] cursor-pointer">
                <input type="radio" v-model="checkoutForm.target_type" value="LOCATION" />
                Lokasyon / Konum
              </label>
              <label class="flex items-center gap-1.5 text-[12.5px] cursor-pointer">
                <input type="radio" v-model="checkoutForm.target_type" value="VEHICLE" />
                Araç
              </label>
            </div>
          </div>

          <div v-if="checkoutForm.target_type === 'PERSONNEL'">
            <label class="form-label">Zimmetlenecek Personel *</label>
            <select v-model="checkoutForm.target_id" class="form-select" required>
              <option value="">Personel Seçin</option>
              <option v-for="p in assetStore.metadata.personnel" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
          </div>

          <div v-if="checkoutForm.target_type === 'LOCATION'">
            <label class="form-label">Zimmetlenecek Lokasyon *</label>
            <select v-model="checkoutForm.target_id" class="form-select" required>
              <option value="">Lokasyon Seçin</option>
              <option v-for="l in assetStore.metadata.locations" :key="l.id" :value="l.id">{{ l.name }}</option>
            </select>
          </div>

          <div v-if="checkoutForm.target_type === 'VEHICLE'">
            <label class="form-label">Zimmetlenecek Araç *</label>
            <select v-model="checkoutForm.target_id" class="form-select" required>
              <option value="">Araç Seçin</option>
              <option v-for="v in assetStore.metadata.vehicles" :key="v.id" :value="v.id">{{ v.plate_no }} ({{ v.vehicle_type }})</option>
            </select>
          </div>

          <div>
            <label class="form-label">Zimmet Notu</label>
            <textarea v-model="checkoutForm.notes" class="form-textarea" rows="2" placeholder="Zimmet açıklama notu..."></textarea>
          </div>

          <div class="modal-action mt-6 flex justify-end gap-2">
            <button type="button" @click="closeCheckoutModal" class="btn-secondary">İptal</button>
            <button type="submit" class="btn-primary">Zimmeti Tamamla</button>
          </div>
        </form>
      </div>
    </dialog>

    <!-- LOGS / HISTORY DIALOG -->
    <dialog ref="logsDialog" class="modal">
      <div class="modal-box w-11/12 max-w-xl bg-white dark:bg-slate-800 p-6 rounded-2xl relative shadow-2xl flex flex-col max-h-[500px]">
        <h3 class="font-bold text-[16px] text-gray-900 dark:text-slate-100 mb-4 shrink-0 flex items-center gap-2">
          <i class="fas fa-history text-gray-500 dark:text-slate-400"></i> Zimmet & İşlem Geçmişi: {{ selectedAsset?.serial_no }}
        </h3>
        
        <div class="flex-1 overflow-y-auto pr-1 space-y-4">
          <div v-if="assetLogs.length === 0" class="text-center py-10 text-gray-400 dark:text-slate-500">
            Hiçbir işlem kaydı bulunmuyor.
          </div>
          <div v-for="log in assetLogs" :key="log.id" class="border-l-2 border-gray-150 dark:border-slate-700 pl-4 py-1 relative">
            <div class="absolute w-2 h-2 rounded-full bg-gray-300 dark:bg-slate-600 -left-[5px] top-2"></div>
            <div class="flex justify-between items-center text-[11px] text-gray-400 dark:text-slate-500">
              <span>{{ formatDate(log.created_at) }}</span>
              <span>Yapan: {{ log.user_name || 'Sistem' }}</span>
            </div>
            <div class="font-bold text-[12.5px] text-gray-800 dark:text-slate-200 mt-1">
              {{ getActionLabel(log.action) }}
              <span v-if="log.action === 'CHECKOUT' && log.target_type === 'PERSONNEL'" class="text-blue-600 dark:text-blue-400">
                👉 Personel: {{ log.personnel_target_name }}
              </span>
              <span v-else-if="log.action === 'CHECKOUT' && log.target_type === 'LOCATION'" class="text-purple-600 dark:text-purple-400">
                👉 Lokasyon: {{ log.location_target_name }}
              </span>
            </div>
            <div class="text-[11.5px] text-gray-500 dark:text-slate-400 mt-0.5" v-if="log.notes">
              Not: {{ log.notes }}
            </div>
          </div>
        </div>

        <div class="modal-action shrink-0 mt-6">
          <button @click="closeLogsModal" class="btn-secondary">Kapat</button>
        </div>
      </div>
    </dialog>

    <!-- NOT ARŞİVİ VE NOT EKLEME MODAL -->
    <dialog ref="notesDialog" class="modal">
      <div class="modal-box w-11/12 max-w-xl bg-white dark:bg-slate-800 p-6 rounded-2xl relative shadow-2xl flex flex-col max-h-[550px]">
        <h3 class="font-bold text-[16px] text-gray-900 dark:text-slate-100 mb-4 shrink-0 flex items-center gap-2">
          <i class="fas fa-sticky-note text-amber-500"></i> Not Arşivi: {{ selectedAsset?.serial_no }}
        </h3>
        
        <!-- Not Ekleme Formu -->
        <div class="bg-amber-50/60 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/30 p-3 rounded-xl mb-4 shrink-0 space-y-2">
          <div class="text-[11px] font-bold text-amber-900 dark:text-amber-300 uppercase">Yeni Not Ekle</div>
          <textarea
            v-model="newNoteText"
            class="w-full text-xs p-2.5 bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-500/30 rounded-lg outline-none focus:border-amber-500 font-medium dark:text-slate-100"
            rows="2" 
            placeholder="Bu varlık hakkında özel not veya servis/arıza detayı yazın..."
          ></textarea>
          <div class="flex justify-end">
            <button 
              @click="submitNewNote" 
              :disabled="!newNoteText.trim() || savingNote" 
              class="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-[11px] rounded-lg transition-colors flex items-center gap-1"
            >
              <i class="fas fa-paper-plane text-[10px]"></i> Notu Arşive Ekle
            </button>
          </div>
        </div>

        <!-- Geçmiş Notlar Listesi -->
        <div class="flex-1 overflow-y-auto pr-1 space-y-3">
          <div class="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Arşivlenmiş Notlar ({{ currentAssetNotes.length }})</div>
          <div v-if="currentAssetNotes.length === 0" class="text-center py-8 text-gray-400 dark:text-slate-500 text-xs italic">
            Bu cihaza ait henüz kaydedilmiş not bulunmuyor.
          </div>
          <div v-for="n in currentAssetNotes" :key="n.id" class="bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-3 rounded-xl space-y-1">
            <div class="flex justify-between items-center text-[10.5px] text-gray-400 dark:text-slate-500 font-medium">
              <span class="font-bold text-gray-700 dark:text-slate-300"><i class="fas fa-user-circle text-amber-500 dark:text-amber-400 mr-1"></i>{{ n.user_name || 'Kullanıcı' }}</span>
              <span>{{ formatDate(n.created_at) }}</span>
            </div>
            <div class="text-xs text-gray-800 dark:text-slate-200 font-medium whitespace-pre-wrap leading-relaxed">
              {{ n.note }}
            </div>
          </div>
        </div>

        <div class="modal-action shrink-0 mt-4">
          <button @click="closeNotesModal" class="btn-secondary">Kapat</button>
        </div>
      </div>
    </dialog>

    <!-- QR & BARCODE STICKER MODAL -->
    <AssetStickerModal 
      :show="showStickerModal"
      :asset="selectedStickerAsset"
      :assets="batchStickerAssets"
      @close="showStickerModal = false"
    />

    <!-- ══════════════════════════════════════════════════════ -->
    <!-- 🔍 KONTROL ET MODALI (QR SCAN AUDIT VERIFICATION)       -->
    <!-- ══════════════════════════════════════════════════════ -->
    <dialog :class="['modal', { 'modal-open': showVerifyModal }]">
      <div v-if="lookupAsset" class="modal-box max-w-lg w-full bg-white dark:bg-slate-800 p-0 rounded-3xl shadow-2xl overflow-hidden mx-3 sm:mx-auto">
        <!-- Header -->
        <div class="bg-indigo-600 text-white px-5 py-4 flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <i class="fas fa-search text-base"></i>
            </div>
            <div>
              <h3 class="font-bold text-sm leading-tight">🔍 Cihaz Bilgilerini Kontrol Et</h3>
              <p class="text-[10.5px] text-indigo-100">Fiziksel cihaz ile sistem kayıtlarını karşılaştırın</p>
            </div>
          </div>
          <button @click="closeVerifyModal" class="text-white/80 hover:text-white text-xl font-bold">&times;</button>
        </div>

        <!-- Asset Information Card Body -->
        <div class="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <!-- Model & Serial Header -->
          <div class="bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-4 flex items-start justify-between gap-3">
            <div>
              <div class="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">{{ lookupAsset.brand_name }}</div>
              <div class="text-base font-black text-gray-900 dark:text-slate-100 leading-snug">{{ lookupAsset.model_name }}</div>
              <div class="text-xs text-gray-500 dark:text-slate-400 font-mono mt-1">Seri No: <strong>{{ lookupAsset.serial_no }}</strong></div>
              <div v-if="lookupAsset.barcode" class="text-xs text-gray-500 dark:text-slate-400 font-mono">Barkod: <strong>{{ lookupAsset.barcode }}</strong></div>
            </div>
            <span class="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-500/10 text-blue-800 dark:text-blue-400 shrink-0">
              {{ lookupAsset.status_name }}
            </span>
          </div>

          <!-- Personnel & Location Information -->
          <div class="grid grid-cols-2 gap-3 text-xs">
            <div class="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              <div class="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase mb-0.5">Zimmetli Sahibi</div>
              <div class="font-bold text-gray-900 dark:text-slate-100 text-xs truncate">
                <i class="fas fa-user text-indigo-500 dark:text-indigo-400 mr-1"></i>
                {{ lookupAsset.personnel_name || '— (Zimmetsiz)' }}
              </div>
              <div v-if="lookupAsset.personnel_department" class="text-[10px] text-gray-500 dark:text-slate-400">{{ lookupAsset.personnel_department }}</div>
            </div>

            <div class="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              <div class="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase mb-0.5">Lokasyon / Konum</div>
              <div class="font-bold text-gray-900 dark:text-slate-100 text-xs truncate">
                <i class="fas fa-map-marker-alt text-red-500 dark:text-red-400 mr-1"></i>
                {{ lookupAsset.location_name || '— (Belirtilmemiş)' }}
              </div>
              <div class="text-[10px] text-gray-500 dark:text-slate-400">{{ lookupAsset.company_name }}</div>
            </div>
          </div>

          <!-- Category Dynamic Specs Section -->
          <div v-if="Object.keys(lookupAsset.specs || {}).length > 0" class="bg-amber-50/60 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/30 rounded-2xl p-4 space-y-2">
            <div class="text-[11px] font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5 border-b border-amber-200/50 dark:border-amber-500/20 pb-1.5">
              <i class="fas fa-microchip text-amber-600 dark:text-amber-400"></i> Kategoriye Özel Teknik Özellikler
            </div>
            <div class="grid grid-cols-2 gap-2 text-xs">
              <div v-for="(val, key) in lookupAsset.specs" :key="key" class="bg-white dark:bg-slate-800 p-2 rounded-lg border border-amber-100 dark:border-amber-500/30">
                <span class="text-[10px] font-bold text-amber-800 dark:text-amber-400 block">{{ key }}</span>
                <span class="font-mono text-gray-800 dark:text-slate-200 text-xs">{{ val || '—' }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Decision Footer Buttons -->
        <div class="bg-gray-50 dark:bg-slate-900 px-5 py-4 border-t border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row gap-2">
          <!-- 1. SAY (Bilgiler Doğru) Button -->
          <button
            @click="submitAuditItem('COUNTED')"
            :disabled="isSubmittingAudit"
            class="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm rounded-2xl transition-all shadow-md flex items-center justify-center gap-2"
          >
            <i class="fas fa-check-circle text-base"></i>
            <span>✅ Say (Bilgiler Doğru)</span>
          </button>

          <!-- 2. CİHAZ BİLGİLERİ HATALI Button -->
          <button
            @click="openDiscrepancyModal"
            :disabled="isSubmittingAudit"
            class="flex-1 py-3.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold text-sm rounded-2xl transition-all shadow-md flex items-center justify-center gap-2"
          >
            <i class="fas fa-exclamation-triangle text-base"></i>
            <span>⚠️ Cihaz Bilgileri Hatalı</span>
          </button>
        </div>
      </div>
    </dialog>

    <!-- ══════════════════════════════════════════════════════ -->
    <!-- 📝 ZORUNLU NOT / UYUMSUZLUK BİLDİRİM MODALI            -->
    <!-- ══════════════════════════════════════════════════════ -->
    <dialog :class="['modal', { 'modal-open': showDiscrepancyModal }]">
      <div class="modal-box max-w-md w-full bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-2xl mx-3 sm:mx-auto">
        <div class="flex items-center gap-3 text-amber-600 dark:text-amber-400 mb-3">
          <div class="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-xl shrink-0">
            <i class="fas fa-edit"></i>
          </div>
          <div>
            <h3 class="font-bold text-base text-gray-900 dark:text-slate-100 leading-tight">Hata / Uyumsuzluk Notu</h3>
            <p class="text-xs text-amber-700 dark:text-amber-400 font-medium">Bu cihaz için not düşülmesi zorunludur.</p>
          </div>
        </div>

        <p class="text-xs text-gray-500 dark:text-slate-400 mb-3">
          Lütfen cihazdaki teknik farkı, fiziksel durumu veya hatalı bilgiyi detaylıca yazınız:
        </p>

        <textarea
          v-model="discrepancyNote"
          rows="3"
          placeholder="Örn: Cihazın ekranında kırık var / RAM 16GB yerine 8GB çıktı / Cihaz farklı odada bulundu..."
          class="w-full p-3 border border-amber-200 dark:border-amber-500/30 rounded-2xl text-xs font-medium focus:border-amber-500 focus:outline-none bg-amber-50/30 dark:bg-amber-500/10 dark:text-slate-100 mb-4"
        ></textarea>

        <div class="flex gap-2">
          <button @click="closeDiscrepancyModal" class="flex-1 py-3 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-colors">
            İptal
          </button>
          <button
            @click="submitAuditItem('DATA_ERROR')"
            :disabled="isSubmittingAudit"
            class="flex-1 py-3 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold text-xs rounded-xl transition-colors shadow-sm flex items-center justify-center gap-1.5"
          >
            <i class="fas fa-save"></i>
            <span>Kaydet & Şerh Düş</span>
          </button>
        </div>
      </div>
    </dialog>

    <!-- CAMERA SCANNER MODAL -->
    <AssetScannerModal 
      :show="showScannerModal"
      @close="showScannerModal = false"
      @scan-result="handleScanResult"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAssetStore } from '../../stores/assetStore'
import { useAuthStore } from '../../stores/auth'
import * as XLSX from 'xlsx'
import { useMasterDataStore } from '../../stores/masterData'
import { useToast } from '../../composables/useToast'
import AppTable from '../../components/AppTable.vue'
import AssetStickerModal from '../../components/AssetStickerModal.vue'
import AssetScannerModal from '../../components/AssetScannerModal.vue'

const router = useRouter()
const assetStore = useAssetStore()
const authStore = useAuthStore()
const masterData = useMasterDataStore()
const { showToast } = useToast()

// Table Columns for AppTable
const columns = [
  { key: 'serial_no', label: 'Seri No / Envanter No', sortable: true, width: '220px' },
  { key: 'device_model', label: 'Cihaz / Model', sortable: true, width: '200px' },
  { key: 'status_name', label: 'Durum', sortable: true, width: '130px' },
  { key: 'owner_display', label: 'Şirket & Konum / Kullanıcı', sortable: true },
  { key: 'documents', label: 'Belgeler', sortable: false, width: '140px' },
  { key: 'monthly_cost', label: 'Aylık Amortisman', sortable: true, align: 'right', width: '170px' },
]

const tableQuickFilters = computed(() => [
  { key: 'category_name', label: 'Kategori', options: assetStore.metadata.categories.map(c => c.name) },
  { key: 'brand_name', label: 'Marka', options: assetStore.metadata.brands.map(b => b.name) },
  { key: 'company_name', label: 'Şirket', options: assetStore.metadata.companies.map(c => c.name) },
  { key: 'status_name', label: 'Durum', options: assetStore.metadata.statuses.map(s => s.name) },
])

// Multi Selection States
const selectedAssetIds = ref([])
const batchStickerAssets = ref([])

const onTableSelectionChange = (rows) => {
  selectedAssetIds.value = rows.map(r => r.id)
}

const isSelected = (id) => selectedAssetIds.value.includes(id)

const isAllSelected = computed(() => {
  if (!filteredAssets.value || filteredAssets.value.length === 0) return false
  return filteredAssets.value.every(a => selectedAssetIds.value.includes(a.id))
})

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedAssetIds.value = []
  } else {
    selectedAssetIds.value = filteredAssets.value.map(a => a.id)
  }
}

// Filter states
const searchQuery = ref('')
const assignmentFilter = ref('ALL') // ALL, ASSIGNED, UNASSIGNED
const filters = ref({
  category_id: '',
  brand_id: '',
  company_id: '',
  status_id: ''
})

const hasActiveFilters = computed(() => {
  return !!(
    searchQuery.value ||
    assignmentFilter.value !== 'ALL' ||
    filters.value.category_id ||
    filters.value.brand_id ||
    filters.value.company_id ||
    filters.value.status_id
  )
})

const resetFilters = () => {
  searchQuery.value = ''
  assignmentFilter.value = 'ALL'
  filters.value.category_id = ''
  filters.value.brand_id = ''
  filters.value.company_id = ''
  filters.value.status_id = ''
}

// Dialog & Sticker/Scanner references
const configDialog = ref(null)
const assetDialog = ref(null)
const checkoutDialog = ref(null)
const logsDialog = ref(null)
const notesDialog = ref(null)
const excelInput = ref(null)

const currentAssetNotes = ref([])
const newNoteText = ref('')
const savingNote = ref(false)

const showNotesModal = async (asset) => {
  selectedAsset.value = asset
  newNoteText.value = ''
  currentAssetNotes.value = await assetStore.fetchNotes(asset.id)
  notesDialog.value?.showModal()
}

const closeNotesModal = () => {
  notesDialog.value?.close()
}

const submitNewNote = async () => {
  if (!newNoteText.value.trim() || !selectedAsset.value) return
  savingNote.value = true
  try {
    const added = await assetStore.addNote(selectedAsset.value.id, newNoteText.value.trim())
    currentAssetNotes.value.unshift(added)
    newNoteText.value = ''
  } catch (err) {
    alert(err)
  } finally {
    savingNote.value = false
  }
}

const showStickerModal = ref(false)
const selectedStickerAsset = ref(null)
const showScannerModal = ref(false)

const openStickerModal = (asset) => {
  selectedStickerAsset.value = asset
  batchStickerAssets.value = []
  showStickerModal.value = true
}

const openBatchStickerModal = () => {
  if (selectedAssetIds.value.length === 0) return
  selectedStickerAsset.value = null
  batchStickerAssets.value = assetStore.assets.filter(a => selectedAssetIds.value.includes(a.id))
  showStickerModal.value = true
}

// Forms & States
const isEditMode = ref(false)
const selectedAsset = ref(null)
const assetLogs = ref([])

const assetForm = ref({
  id: null,
  serial_no: '',
  barcode: '',
  model_id: '',
  status_id: '',
  company_id: '',
  purchase_price: 0,
  purchase_date: '',
  lifetime_months: 60,
  notes: '',
  invoice_path: null,
  warranty_path: null,
  mac_address: '',
  ip_address: '',
  cpu_model: '',
  ram_gb: null,
  disk_gb: null,
  os_version: ''
})

// File upload references
const invoiceFile = ref(null)
const warrantyFile = ref(null)

const checkoutForm = ref({
  target_type: 'PERSONNEL',
  target_id: '',
  notes: ''
})

// Config Add states
const newCategory = ref('')
const newBrand = ref('')
const newModelData = ref({
  name: '',
  category_id: '',
  brand_id: ''
})

// Currency Formatting
const fmt = (v) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(v || 0)

// Helper Calculations
const calculateMonthlyCost = (asset) => {
  const price = asset.purchase_price || 0
  const lifetime = asset.lifetime_months || 60
  if (price <= 0 || !asset.purchase_date) return 0
  
  const pDate = new Date(asset.purchase_date)
  const now = new Date()
  const diffMonths = (now.getFullYear() - pDate.getFullYear()) * 12 + (now.getMonth() - pDate.getMonth())
  
  if (diffMonths >= lifetime || diffMonths < 0) return 0
  return price / lifetime
}

// Fetch Initial Data
onMounted(async () => {
  try {
    await assetStore.fetchAssets()
    await assetStore.fetchMetadata()
    await assetStore.fetchFinancialSummary()
    await masterData.fetchCompanies()
  } catch (err) {
    console.error('InventoryView initial load error:', err)
  }
})

// Computed List View Filterings with Smart Global Search & Multi-Select Bar
const filteredAssets = computed(() => {
  const list = assetStore.assets || []
  return list.filter(a => {
    // 1. Smart Search query matches ALL fields (brand, model, category, company, personnel, location, serial, barcode, notes)
    if (searchQuery.value) {
      const q = searchQuery.value.trim().toLowerCase()
      const inSerial = (a.serial_no || '').toLowerCase().includes(q)
      const inBarcode = (a.barcode || '').toLowerCase().includes(q)
      const inPhone = (a.phone_no || '').toLowerCase().includes(q)
      const inBrand = (a.brand_name || '').toLowerCase().includes(q)
      const inModel = (a.model_name || '').toLowerCase().includes(q)
      const inCategory = (a.category_name || '').toLowerCase().includes(q)
      const inCompany = (a.company_name || '').toLowerCase().includes(q)
      const inPersonnel = (a.personnel_name || '').toLowerCase().includes(q)
      const inLocation = (a.location_name || '').toLowerCase().includes(q)
      const inNotes = (a.notes || '').toLowerCase().includes(q)

      if (!inSerial && !inBarcode && !inPhone && !inBrand && !inModel && !inCategory && !inCompany && !inPersonnel && !inLocation && !inNotes) {
        return false
      }
    }

    // 2. Dynamic assignment filter tab (ALL, ASSIGNED, UNASSIGNED)
    if (assignmentFilter.value === 'ASSIGNED' && !a.personnel_id && !a.location_id) return false
    if (assignmentFilter.value === 'UNASSIGNED' && (a.personnel_id || a.location_id)) return false

    // 3. Dropdown field filter matches
    if (filters.value.category_id && a.category_id !== Number(filters.value.category_id)) return false
    if (filters.value.brand_id && a.brand_id !== Number(filters.value.brand_id)) return false
    if (filters.value.company_id && a.company_id !== Number(filters.value.company_id)) return false
    if (filters.value.status_id && a.status_id !== Number(filters.value.status_id)) return false

    return true
  })
})

const tableAssets = computed(() => {
  return filteredAssets.value.map(a => ({
    ...a,
    device_model: `${a.brand_name || ''} ${a.model_name || ''}`,
    owner_display: a.personnel_name || a.location_name || a.vehicle_plate_no || a.department_name || a.cost_center_name || 'Depoda',
    monthly_cost: calculateMonthlyCost(a)
  }))
})

const inUseCount = computed(() => {
  const list = assetStore.assets || []
  return list.filter(a => a.personnel_id || a.location_id).length
})

const warehouseCount = computed(() => {
  const list = assetStore.assets || []
  return list.length - inUseCount.value
})

// CSS Helpers
const getStatusClass = (statusName) => {
  if (!statusName) return 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400'
  const name = statusName.toLowerCase()
  if (name.includes('zimmet') || name.includes('kullanım')) return 'bg-emerald-100 dark:bg-green-500/10 text-emerald-700 dark:text-green-400'
  if (name.includes('depo') || name.includes('boşta')) return 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400'
  if (name.includes('hazırlık') || name.includes('image')) return 'bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400'
  if (name.includes('yedek') || name.includes('standby')) return 'bg-cyan-100 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400'
  if (name.includes('servis') || name.includes('bakım')) return 'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400'
  if (name.includes('arıza')) return 'bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400'
  if (name.includes('kayıp') || name.includes('çalındı')) return 'bg-rose-100 dark:bg-red-500/10 text-rose-700 dark:text-red-400 font-bold'
  if (name.includes('hurda') || name.includes('arşiv')) return 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400'
  return 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300'
}

// File handles
const handleFileChange = (e, type) => {
  const file = e.target.files[0]
  if (type === 'invoice') {
    invoiceFile.value = file
  } else {
    warrantyFile.value = file
  }
}

// Modals & Navigation management
const openConfigModal = () => router.push('/master-data/asset-definitions')
const closeConfigModal = () => {
  configDialog.value?.close()
  newCategory.value = ''
  newBrand.value = ''
  newModelData.value = { name: '', category_id: '', brand_id: '' }
}

// State for cascading dropdowns and dynamic specs
const expandedAssetId = ref(null)
const selectedCategoryId = ref('')
const selectedBrandId = ref('')
const customSpecsList = ref([])
const phoneSpecs = ref({ imei: '', imei2: '', storage_gb: '', color: '' })
const categoryDynamicInputs = ref({})

const toggleExpand = (id) => {
  expandedAssetId.value = expandedAssetId.value === id ? null : id
}

const removeCustomSpecRow = (idx) => {
  customSpecsList.value.splice(idx, 1)
}

const parseCustomSpecs = (jsonStr) => {
  if (!jsonStr) return []
  try {
    const parsed = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr
    const list = []
    for (const [k, v] of Object.entries(parsed)) {
      if (v !== null && v !== undefined && v !== '') {
        let label = k
        if (k === 'imei') label = 'IMEI 1'
        else if (k === 'imei2') label = 'IMEI 2'
        else if (k === 'storage_gb') label = 'Depolama'
        else if (k === 'color') label = 'Renk'
        list.push({ key: label, value: String(v) })
      }
    }
    return list
  } catch (e) {
    return []
  }
}

const availableBrandsForSelect = computed(() => {
  const brands = assetStore.metadata?.brands || []
  const models = assetStore.metadata?.models || []
  if (!selectedCategoryId.value) return brands
  const modelsInCat = models.filter(m => m.category_id === Number(selectedCategoryId.value))
  const brandIdsInCat = new Set(modelsInCat.map(m => m.brand_id))
  return brands.filter(b => brandIdsInCat.has(b.id))
})

const availableModelsForSelect = computed(() => {
  const models = assetStore.metadata?.models || []
  return models.filter(m => {
    if (selectedCategoryId.value && m.category_id !== Number(selectedCategoryId.value)) return false
    if (selectedBrandId.value && m.brand_id !== Number(selectedBrandId.value)) return false
    return true
  })
})

const selectedCategoryName = computed(() => {
  let catId = selectedCategoryId.value
  const models = assetStore.metadata?.models || []
  const categories = assetStore.metadata?.categories || []
  if (!catId && assetForm.value.model_id) {
    const m = models.find(mod => mod.id === Number(assetForm.value.model_id))
    if (m) catId = m.category_id
  }
  const cat = categories.find(c => c.id === Number(catId))
  return cat ? (cat.name || '').toLowerCase() : ''
})

const isSimCategory = computed(() => selectedCategoryName.value === 'sim kart')

// Kategoriye özel teknik alan başlıkları (Envanter Tanımlamaları → Özellik Alanları'nda
// tanımlanır); form burada dinamik olarak bu alanları render eder.
const currentCategoryFields = computed(() => {
  let catId = selectedCategoryId.value
  const models = assetStore.metadata?.models || []
  const categories = assetStore.metadata?.categories || []
  if (!catId && assetForm.value.model_id) {
    const m = models.find(mod => mod.id === Number(assetForm.value.model_id))
    if (m) catId = m.category_id
  }
  const cat = categories.find(c => c.id === Number(catId))
  return cat?.custom_fields || []
})

const openAddModal = () => {
  isEditMode.value = false
  invoiceFile.value = null
  warrantyFile.value = null
  selectedCategoryId.value = ''
  selectedBrandId.value = ''
  customSpecsList.value = []
  phoneSpecs.value = { imei: '', imei2: '', storage_gb: '', color: '' }
  categoryDynamicInputs.value = {}
  assetForm.value = {
    id: null,
    serial_no: '',
    barcode: '',
    model_id: '',
    status_id: '',
    company_id: '',
    purchase_price: 0,
    purchase_date: '',
    lifetime_months: 60,
    notes: '',
    invoice_path: null,
    warranty_path: null,
    mac_address: '',
    ip_address: '',
    cpu_model: '',
    ram_gb: null,
    disk_gb: null,
    os_version: ''
  }
  assetDialog.value.showModal()
}

const closeAssetModal = () => {
  assetDialog.value?.close()
}

const openCheckoutModal = (asset) => {
  selectedAsset.value = asset
  checkoutForm.value = {
    target_type: 'PERSONNEL',
    target_id: '',
    notes: ''
  }
  checkoutDialog.value?.showModal()
}

const closeCheckoutModal = () => {
  checkoutDialog.value?.close()
}

const showLogs = async (asset) => {
  selectedAsset.value = asset
  try {
    const res = await api.get(`/assets/${asset.id}/logs`)
    assetLogs.value = res.data
  } catch (e) {
    assetLogs.value = []
  }
  logsDialog.value?.showModal()
}

const closeLogsModal = () => {
  logsDialog.value?.close()
}

const openEditModal = (asset) => {
  isEditMode.value = true
  invoiceFile.value = null
  warrantyFile.value = null
  // SIM Kart varlıklarında "Envanter No" alanı Telefon No olarak kullanılıyor
  // (bkz. saveAsset) — düzenlerken bu alanı asset.phone_no ile dolduruyoruz.
  assetForm.value = { ...asset, barcode: asset.phone_no || asset.barcode }

  // Select matching category and brand
  const currentModel = assetStore.metadata.models.find(m => m.id === Number(asset.model_id))
  if (currentModel) {
    selectedCategoryId.value = currentModel.category_id
    selectedBrandId.value = currentModel.brand_id
  } else {
    selectedCategoryId.value = ''
    selectedBrandId.value = ''
  }

  phoneSpecs.value = { imei: '', imei2: '', storage_gb: '', color: '' }
  customSpecsList.value = []
  categoryDynamicInputs.value = {}

  if (asset.specs_json) {
    try {
      const parsed = typeof asset.specs_json === 'string' ? JSON.parse(asset.specs_json) : asset.specs_json
      if (parsed.imei) phoneSpecs.value.imei = parsed.imei
      if (parsed.imei2) phoneSpecs.value.imei2 = parsed.imei2
      if (parsed.storage_gb) phoneSpecs.value.storage_gb = parsed.storage_gb
      if (parsed.color) phoneSpecs.value.color = parsed.color

      for (const [k, v] of Object.entries(parsed)) {
        if (['imei', 'imei2', 'storage_gb', 'color'].includes(k)) continue
        if (currentCategoryFields.value.includes(k)) {
          categoryDynamicInputs.value[k] = String(v)
        } else {
          customSpecsList.value.push({ key: k, value: String(v) })
        }
      }
    } catch (e) {}
  }

  assetDialog.value.showModal()
}

const saveAsset = async () => {
  // Amortisman süresi geçmediyse alış bedeli 0 olamaz kontrolü (SIM hatları için geçerli değil)
  const pPrice = parseFloat(assetForm.value.purchase_price) || 0
  const pLifetime = parseInt(assetForm.value.lifetime_months) || 60
  if (!isSimCategory.value) {
    if (assetForm.value.purchase_date) {
      const pDate = new Date(assetForm.value.purchase_date)
      const now = new Date()
      const diffMonths = (now.getFullYear() - pDate.getFullYear()) * 12 + (now.getMonth() - pDate.getMonth())
      if (diffMonths < pLifetime && pPrice <= 0) {
        alert('Faydalı ömrü (amortisman süresi) henüz dolmamış varlıklar için alış bedeli 0 girilemez! Lütfen geçerli bir tutar yazınız.')
        return
      }
    } else if (pPrice <= 0) {
      alert('Varlık için alış/amortisman bedeli 0 girilemez! Lütfen geçerli bir bedel yazınız.')
      return
    }
  }

  try {
    const formData = new FormData()
    formData.append('serial_no', assetForm.value.serial_no)
    formData.append('barcode', assetForm.value.barcode || '')
    formData.append('model_id', assetForm.value.model_id)
    formData.append('status_id', assetForm.value.status_id)
    formData.append('company_id', assetForm.value.company_id)
    formData.append('purchase_price', pPrice)
    formData.append('purchase_date', assetForm.value.purchase_date || '')
    formData.append('lifetime_months', pLifetime)
    formData.append('notes', assetForm.value.notes || '')
    formData.append('mac_address', assetForm.value.mac_address || '')
    formData.append('ip_address', assetForm.value.ip_address || '')
    formData.append('cpu_model', assetForm.value.cpu_model || '')
    formData.append('ram_gb', assetForm.value.ram_gb || '')
    formData.append('disk_gb', assetForm.value.disk_gb || '')
    formData.append('os_version', assetForm.value.os_version || '')

    // Dynamic Specs Object
    const specsObj = { ...categoryDynamicInputs.value }
    if (phoneSpecs.value.imei) specsObj.imei = phoneSpecs.value.imei
    if (phoneSpecs.value.imei2) specsObj.imei2 = phoneSpecs.value.imei2
    if (phoneSpecs.value.storage_gb) specsObj.storage_gb = phoneSpecs.value.storage_gb
    if (phoneSpecs.value.color) specsObj.color = phoneSpecs.value.color

    customSpecsList.value.forEach(item => {
      if (item.key && item.key.trim()) {
        specsObj[item.key.trim()] = item.value || ''
      }
    })

    formData.append('specs_json', JSON.stringify(specsObj))

    if (invoiceFile.value) {
      formData.append('invoice', invoiceFile.value)
    }
    if (warrantyFile.value) {
      formData.append('warranty', warrantyFile.value)
    }

    if (isEditMode.value) {
      await assetStore.updateAsset(assetForm.value.id, formData)
    } else {
      await assetStore.addAsset(formData)
    }
    closeAssetModal()
  } catch (err) {
    alert(err.response?.data?.error || 'Kayıt işlemi başarısız.')
  }
}

const handleDelete = async (asset) => {
  if (asset.personnel_id || asset.location_id) {
    alert(`"${asset.serial_no}" varlığı şu an zimmetlidir! Silme işleminden önce zimmeti depoya iade almalısınız.`)
    return
  }
  const notes = prompt(`"${asset.serial_no}" seri numaralı varlığı silmek istediğinize emin misiniz?\nLütfen silme nedenini / açıklamasını yazınız (Zorunlu):`)
  if (notes !== null) {
    if (!notes.trim()) {
      alert('Silme açıklaması girmeden varlık silinemez.')
      return
    }
    try {
      await assetStore.deleteAsset(asset.id, notes.trim())
    } catch (err) {
      alert(err.response?.data?.error || err.toString())
    }
  }
}

const saveCheckout = async () => {
  if (!checkoutForm.value.target_id) {
    alert('Lütfen bir hedef seçin.')
    return
  }
  try {
    await assetStore.checkoutAsset(selectedAsset.value.id, checkoutForm.value)
    closeCheckoutModal()
  } catch (err) {
    alert(err.response?.data?.error || err.message || 'Zimmet ataması başarısız.')
  }
}

const handleCheckin = async (asset) => {
  const notes = prompt('Zimmet iade/depoya çekme açıklaması (Opsiyonel):')
  if (notes !== null) {
    try {
      await assetStore.checkinAsset(asset.id, { notes })
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Zimmet iadesi başarısız.')
    }
  }
}

const showVerifyModal = ref(false)
const showDiscrepancyModal = ref(false)
const lookupAsset = ref(null)
const discrepancyNote = ref('')
const isSubmittingAudit = ref(false)

const handleScanResult = async (scannedCode) => {
  if (!scannedCode) return
  try {
    const res = await api.post('/assets/audit/lookup', { code: scannedCode })
    lookupAsset.value = res.data.asset
    showVerifyModal.value = true
  } catch (err) {
    showToast(err.response?.data?.error || `"${scannedCode}" kodlu envanter veritabanında bulunamadı.`, 'error')
  }
}

const closeVerifyModal = () => {
  showVerifyModal.value = false
  lookupAsset.value = null
}

const openDiscrepancyModal = () => {
  discrepancyNote.value = ''
  showDiscrepancyModal.value = true
}

const closeDiscrepancyModal = () => {
  showDiscrepancyModal.value = false
  discrepancyNote.value = ''
}

const submitAuditItem = async (status) => {
  if (!lookupAsset.value) return

  if (status === 'DATA_ERROR' && (!discrepancyNote.value || !discrepancyNote.value.trim())) {
    alert('Cihaz bilgileri hatalı seçildiğinde açıklama / not girilmesi zorunludur! Lütfen hatayı açıklayınız.')
    return
  }

  isSubmittingAudit.value = true
  try {
    await api.post('/assets/audit/item-result', {
      asset_id: lookupAsset.value.id,
      status: status,
      discrepancy_note: discrepancyNote.value
    })

    if (status === 'COUNTED') {
      showToast(`✓ "${lookupAsset.value.serial_no}" başarıyla sayıldı!`, 'success')
    } else {
      showToast(`⚠️ "${lookupAsset.value.serial_no}" için hata/uyumsuzluk kaydı oluşturuldu.`, 'warning')
      closeDiscrepancyModal()
    }

    closeVerifyModal()
    await assetStore.fetchAssets()
  } catch (err) {
    alert(err.response?.data?.error || 'Sayım kaydı gönderilirken hata oluştu.')
  } finally {
    isSubmittingAudit.value = false
  }
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString('tr-TR')
}

const getActionLabel = (action) => {
  const map = {
    'CREATE': 'Varlık oluşturuldu.',
    'UPDATE': 'Varlık detayları güncellendi.',
    'CHECKOUT': 'Zimmet atandı',
    'CHECKIN': 'Zimmet iade edildi / Depoya çekildi.'
  }
  return map[action] || action
}

const downloadTemplate = () => {
  const ws = XLSX.utils.json_to_sheet([
    {
      'Seri No': 'S123456789',
      'Barkod': 'B987654321',
      'Kategori': 'Laptop',
      'Marka': 'Dell',
      'Model': 'Latitude 5420',
      'Şirket': 'Talay Logistics',
      'Alış Fiyatı': 15000,
      'Alış Tarihi': '2025-01-15',
      'Ömür (Ay)': 60,
      'Durum': 'Depoda (Boşta)',
      'Açıklama': 'Genel kullanım için alındı.'
    }
  ])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sablon')
  XLSX.writeFile(wb, 'Cihaz_Iceri_Aktarma_Sablonu.xlsx')
}

const handleExcelImport = async (e) => {
  const file = e.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = async (evt) => {
    try {
      assetStore.loading = true
      const data = new Uint8Array(evt.target.result)
      const workbook = XLSX.read(data, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const sheet = workbook.Sheets[sheetName]
      const rows = XLSX.utils.sheet_to_json(sheet)

      if (rows.length === 0) {
        showToast('Excel dosyasında veri bulunamadı.', 'warning')
        return
      }

      let successCount = 0
      let errorCount = 0
      let lastErrorMessage = ''

      const getVal = (row, ...keys) => {
        for (const k of keys) {
          const foundKey = Object.keys(row).find(rk => rk.trim().toLowerCase() === k.toLowerCase())
          if (foundKey) return row[foundKey]
        }
        return null
      }

      for (const row of rows) {
        try {
          const serialNo = String(getVal(row, 'Seri No', 'SerialNo', 'Serial No') || '').trim()
          if (!serialNo) {
            console.warn('Seri No bulunmayan satır atlandı:', row)
            continue
          }

          // 1. Kategori
          let categoryId = null
          const catName = String(getVal(row, 'Kategori', 'Category') || '').trim()
          if (catName) {
            let cat = assetStore.metadata.categories.find(c => c.name.toLowerCase() === catName.toLowerCase())
            if (!cat) {
              const newCat = await assetStore.addCategory(catName)
              categoryId = newCat.id
            } else {
              categoryId = cat.id
            }
          }

          // 2. Marka
          let brandId = null
          const brandName = String(getVal(row, 'Marka', 'Brand') || '').trim()
          if (brandName) {
            let brnd = assetStore.metadata.brands.find(b => b.name.toLowerCase() === brandName.toLowerCase())
            if (!brnd) {
              const newBrnd = await assetStore.addBrand(brandName)
              brandId = newBrnd.id
            } else {
              brandId = brnd.id
            }
          }

          // 3. Model
          let modelId = null
          const modelName = String(getVal(row, 'Model', 'ModelName', 'Model Name') || '').trim()
          if (modelName && categoryId && brandId) {
            let mdl = assetStore.metadata.models.find(m => 
              m.name.toLowerCase() === modelName.toLowerCase() && 
              m.category_id === categoryId && 
              m.brand_id === brandId
            )
            if (!mdl) {
              const newMdl = await assetStore.addModel({
                name: modelName,
                category_id: categoryId,
                brand_id: brandId
              })
              modelId = newMdl.id
            } else {
              modelId = mdl.id
            }
          }

          if (!modelId) {
            throw new Error(`Kategori/Marka/Model bilgileri geçersiz veya eksik: ${catName} / ${brandName} / ${modelName}`)
          }

          // 4. Şirket
          let companyId = null
          const companyName = String(getVal(row, 'Şirket', 'Company') || '').trim()
          if (companyName) {
            let comp = masterData.companies.find(c => c.name.toLowerCase() === companyName.toLowerCase())
            if (!comp) {
              const newComp = await masterData.createItem('companies', { name: companyName })
              companyId = newComp.id
              await masterData.fetchCompanies() // Yenile
            } else {
              companyId = comp.id
            }
          }

          if (!companyId) {
            if (masterData.companies.length > 0) {
              companyId = masterData.companies[0].id
            } else {
              throw new Error('Sistemde tanımlı hiçbir şirket bulunamadı.')
            }
          }

          // 5. Durum (Status)
          let statusId = null
          const statusName = String(getVal(row, 'Durum', 'Status') || '').trim()
          if (statusName) {
            let stat = assetStore.metadata.statuses.find(s => s.name.toLowerCase() === statusName.toLowerCase())
            if (stat) statusId = stat.id
          }
          if (!statusId) {
            const defaultStat = assetStore.metadata.statuses.find(s => s.name.includes('Depo') || s.name.includes('Boşta'))
            statusId = defaultStat ? defaultStat.id : (assetStore.metadata.statuses[0]?.id || 1)
          }

          // 6. Diğer alanlar
          const barcode = String(getVal(row, 'Barkod', 'Barcode') || '').trim()
          const purchasePrice = parseFloat(getVal(row, 'Alış Fiyatı', 'Purchase Price', 'Price') || 0)
          const purchaseDate = getVal(row, 'Alış Tarihi', 'Purchase Date', 'Date') || null
          const lifetimeMonths = parseInt(getVal(row, 'Ömür', 'Lifetime', 'Ömür (Ay)') || 60)
          const notes = String(getVal(row, 'Açıklama', 'Not', 'Notes', 'Notes') || '').trim()

          // Payload oluştur
          const formData = new FormData()
          formData.append('serial_no', serialNo)
          formData.append('barcode', barcode)
          formData.append('model_id', modelId)
          formData.append('status_id', statusId)
          formData.append('company_id', companyId)
          formData.append('purchase_price', purchasePrice)
          formData.append('purchase_date', purchaseDate || '')
          formData.append('lifetime_months', lifetimeMonths)
          formData.append('notes', notes)

          await assetStore.addAsset(formData)
          successCount++
        } catch (err) {
          console.error('Satır işlenirken hata:', err)
          errorCount++
          lastErrorMessage = err.message || 'Bilinmeyen hata'
        }
      }

      if (successCount > 0) {
        showToast(`${successCount} cihaz başarıyla envantere aktarıldı.`, 'success')
      }
      if (errorCount > 0) {
        showToast(`${errorCount} cihaz yüklenirken hata oluştu. Son Hata: ${lastErrorMessage}`, 'error', 5000)
      }
      
      // Veriyi yenileyelim
      await assetStore.fetchAssets()
      await assetStore.fetchFinancialSummary()
    } catch (excelErr) {
      console.error(excelErr)
      showToast('Excel dosyası okunurken hata oluştu.', 'error')
    } finally {
      assetStore.loading = false
      e.target.value = '' // Reset input
    }
  }
  reader.readAsArrayBuffer(file)
}
</script>

<style scoped>
.search-input {
  @apply h-8 px-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded text-[12px] font-medium text-gray-700 dark:text-slate-300 outline-none focus:border-blue-500;
}
.filter-select {
  @apply h-8 px-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded text-[12px] font-medium text-gray-700 dark:text-slate-300 outline-none focus:border-blue-500 cursor-pointer;
}
.btn-primary {
  @apply h-8 px-4 bg-blue-600 text-white rounded text-[11px] font-bold hover:bg-blue-700 flex items-center transition-all shadow-sm;
}
.btn-secondary {
  @apply h-8 px-4 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded text-[11px] font-bold hover:bg-gray-200 dark:hover:bg-slate-600 flex items-center transition-all;
}
.btn-primary-sm {
  @apply px-3 py-1.5 bg-blue-600 text-white rounded text-[11px] font-bold hover:bg-blue-700 transition-all shadow-sm;
}
.btn-actions {
  @apply w-7 h-7 rounded border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center justify-center transition-all shadow-sm;
}
.form-label {
  @apply block text-[11px] font-bold text-gray-500 dark:text-slate-500 uppercase tracking-wider mb-1;
}
.form-input {
  @apply w-full h-9 px-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-[13px] text-gray-800 dark:text-slate-100 outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all;
}
.form-select {
  @apply w-full h-9 px-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-[13px] text-gray-800 dark:text-slate-100 outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all cursor-pointer;
}
.form-textarea {
  @apply w-full p-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-[13px] text-gray-800 dark:text-slate-100 outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all resize-none;
}
.file-input-custom {
  @apply block w-full text-[11px] text-gray-500 dark:text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-[11px] file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer;
}
</style>
