<template>
  <div class="h-full flex flex-col bg-white overflow-hidden">
    <!-- HEADER -->
    <header class="h-14 border-b border-gray-100 flex items-center px-6 justify-between bg-white shrink-0">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
          <i class="fas fa-boxes"></i>
        </div>
        <div>
          <h1 class="text-[14px] font-bold text-gray-900 leading-tight">Envanter Takibi</h1>
          <p class="text-[10.5px] text-gray-400 font-medium">Tüm donanım, zimmet ve depo varlıklarınızı akıllı filtrelerle süzün</p>
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
        <button @click="downloadTemplate" class="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-[11.5px] rounded-lg transition-colors whitespace-nowrap" v-if="authStore.hasPermission('asset:edit')" title="Excel Şablonu İndir">
          <i class="fas fa-file-download mr-1"></i>Şablon
        </button>
        <button @click="$refs.excelInput.click()" class="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-[11.5px] rounded-lg transition-colors whitespace-nowrap" v-if="authStore.hasPermission('asset:edit')" title="Excel ile Yükle">
          <i class="fas fa-file-import mr-1"></i>Excel Yükle
        </button>
        <button @click="openConfigModal" class="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-[11.5px] rounded-lg transition-colors whitespace-nowrap" title="Kategori, Marka & Model Tanımlamaları">
          <i class="fas fa-cog mr-1"></i>Tanımlamalar
        </button>
        <button @click="openAddModal" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11.5px] rounded-lg transition-colors whitespace-nowrap shadow-sm" v-if="authStore.hasPermission('asset:edit')">
          <i class="fas fa-plus mr-1"></i>Yeni Varlık
        </button>
      </div>
    </header>

    <!-- SMART FILTER BAR (AKILLI FİLTRE & ÇOKLU SÜZME ÇUBUĞU) -->
    <div class="bg-gray-50/90 border-b border-gray-200 px-6 py-2 flex items-center justify-between gap-3 shrink-0 flex-wrap">
      <div class="flex items-center gap-2 flex-1 flex-wrap min-w-0">
        <!-- 1. SMART SEARCH INPUT -->
        <div class="relative flex items-center shrink-0 w-64 xl:w-72">
          <i class="fas fa-search absolute left-3 text-gray-400 text-xs"></i>
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="Marka, Model, Personel, Seri No, Envanter No..." 
            class="h-8 pl-8 pr-8 w-full bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-800 outline-none focus:border-blue-500 shadow-sm"
          />
          <button 
            v-if="searchQuery" 
            @click="searchQuery = ''" 
            class="absolute right-7 text-gray-400 hover:text-gray-600 text-xs"
          >
            &times;
          </button>
          <button 
            @click="showScannerModal = true" 
            class="absolute right-2.5 text-gray-400 hover:text-blue-600 transition-colors"
            title="Kamera ile QR / Barkod Tara"
          >
            <i class="fas fa-camera text-xs"></i>
          </button>
        </div>

        <!-- 2. ASSIGNMENT TABS -->
        <div class="flex items-center gap-0.5 bg-gray-200/70 rounded-lg p-0.5 shrink-0">
          <button 
            @click="assignmentFilter = 'ALL'" 
            :class="['px-2.5 py-1 rounded text-[11px] font-bold transition-all', assignmentFilter === 'ALL' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900']"
          >
            Hepsi
          </button>
          <button 
            @click="assignmentFilter = 'ASSIGNED'" 
            :class="['px-2.5 py-1 rounded text-[11px] font-bold transition-all', assignmentFilter === 'ASSIGNED' ? 'bg-white text-emerald-800 shadow-sm' : 'text-gray-600 hover:text-gray-900']"
          >
            Zimmetli
          </button>
          <button 
            @click="assignmentFilter = 'UNASSIGNED'" 
            :class="['px-2.5 py-1 rounded text-[11px] font-bold transition-all', assignmentFilter === 'UNASSIGNED' ? 'bg-white text-blue-800 shadow-sm' : 'text-gray-600 hover:text-gray-900']"
          >
            Depoda
          </button>
        </div>

        <!-- 3. CATEGORY SELECT -->
        <select v-model="filters.category_id" class="h-8 px-2.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 outline-none focus:border-blue-500 shadow-sm cursor-pointer shrink-0">
          <option value="">📂 Tüm Kategoriler</option>
          <option v-for="cat in assetStore.metadata.categories" :key="cat.id" :value="cat.id">
            {{ cat.name }}
          </option>
        </select>

        <!-- 4. BRAND SELECT -->
        <select v-model="filters.brand_id" class="h-8 px-2.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 outline-none focus:border-blue-500 shadow-sm cursor-pointer shrink-0">
          <option value="">🏷️ Tüm Markalar</option>
          <option v-for="b in assetStore.metadata.brands" :key="b.id" :value="b.id">
            {{ b.name }}
          </option>
        </select>

        <!-- 5. COMPANY SELECT -->
        <select v-model="filters.company_id" class="h-8 px-2.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 outline-none focus:border-blue-500 shadow-sm cursor-pointer shrink-0">
          <option value="">🏢 Tüm Şirketler</option>
          <option v-for="comp in assetStore.metadata.companies" :key="comp.id" :value="comp.id">
            {{ comp.name }}
          </option>
        </select>

        <!-- 6. STATUS SELECT -->
        <select v-model="filters.status_id" class="h-8 px-2.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 outline-none focus:border-blue-500 shadow-sm cursor-pointer shrink-0">
          <option value="">🚩 Tüm Durumlar</option>
          <option v-for="st in assetStore.metadata.statuses" :key="st.id" :value="st.id">
            {{ st.name }}
          </option>
        </select>

        <!-- 7. CLEAR FILTERS BUTTON -->
        <button 
          v-if="hasActiveFilters" 
          @click="resetFilters" 
          class="h-8 px-3 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shrink-0"
          title="Tüm filtreleri sıfırla"
        >
          <i class="fas fa-times text-[10px]"></i> Temizle
        </button>
      </div>

      <!-- RESULTS COUNT COUNTER -->
      <div class="text-xs font-bold text-gray-500 whitespace-nowrap flex items-center gap-1.5">
        <span>Gösterilen:</span>
        <span class="text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full font-mono font-black border border-blue-100">
          {{ filteredAssets.length }} / {{ assetStore.assets.length }}
        </span>
      </div>
    </div>

    <!-- KPI / FINANCIAL SUMMARY BAR -->
    <div class="grid grid-cols-4 gap-px bg-gray-100 border-b border-gray-100 shrink-0">
      <div class="bg-white px-6 py-3 flex items-center gap-3">
        <div class="w-9 h-9 rounded-lg flex items-center justify-center bg-blue-50 text-blue-600 text-sm">
          <i class="fas fa-laptop"></i>
        </div>
        <div>
          <div class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Toplam Varlık</div>
          <div class="text-[16px] font-black text-gray-900">{{ filteredAssets.length }} / {{ assetStore.assets.length }}</div>
        </div>
      </div>
      <div class="bg-white px-6 py-3 flex items-center gap-3">
        <div class="w-9 h-9 rounded-lg flex items-center justify-center bg-emerald-50 text-emerald-600 text-sm">
          <i class="fas fa-wallet"></i>
        </div>
        <div>
          <div class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Envanter Değeri</div>
          <div class="text-[16px] font-black text-gray-900">{{ fmt(assetStore.financialSummary.totalValuation) }}</div>
        </div>
      </div>
      <div class="bg-white px-6 py-3 flex items-center gap-3">
        <div class="w-9 h-9 rounded-lg flex items-center justify-center bg-purple-50 text-purple-600 text-sm">
          <i class="fas fa-chart-line"></i>
        </div>
        <div>
          <div class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Aylık Amortisman/Maliyet</div>
          <div class="text-[16px] font-black text-gray-900">{{ fmt(assetStore.financialSummary.monthlyAmortization) }}</div>
        </div>
      </div>
      <div class="bg-white px-6 py-3 flex items-center gap-3">
        <div class="w-9 h-9 rounded-lg flex items-center justify-center bg-amber-50 text-amber-600 text-sm">
          <i class="fas fa-user-check"></i>
        </div>
        <div>
          <div class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Zimmetli / Boşta</div>
          <div class="text-[16px] font-black text-gray-900">
            {{ inUseCount }} / {{ warehouseCount }}
          </div>
        </div>
      </div>
    </div>

    <!-- MAIN TABLE AREA -->
    <main class="flex-1 overflow-y-auto bg-gray-50/40 p-6">
      <div v-if="assetStore.loading" class="flex items-center justify-center h-64 text-gray-300">
        <i class="fas fa-circle-notch fa-spin text-3xl"></i>
      </div>

      <div v-else class="bg-white border border-gray-100 rounded-lg shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-gray-50 border-b border-gray-100 text-gray-400 font-bold uppercase text-[10px] tracking-wider">
                <th class="w-10 px-3 py-3 text-center">
                  <input 
                    type="checkbox" 
                    :checked="isAllSelected" 
                    @change="toggleSelectAll" 
                    class="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th class="px-5 py-3">Seri No / Envanter No</th>
                <th class="px-5 py-3">Cihaz / Model</th>
                <th class="px-5 py-3">Durum</th>
                <th class="px-5 py-3">Şirket & Konum / Kullanıcı</th>
                <th class="px-5 py-3">Belgeler</th>
                <th class="px-5 py-3 text-right">Aylık Amortisman</th>
                <th class="px-5 py-3 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
              <tr v-if="filteredAssets.length === 0" class="text-center">
                <td colspan="8" class="py-12 text-gray-400 text-sm">Hiçbir varlık bulunamadı.</td>
              </tr>
              <template v-for="asset in filteredAssets" :key="asset.id">
                <tr :class="['hover:bg-gray-50/50 transition-colors text-[12.5px]', isSelected(asset.id) ? 'bg-blue-50/30' : '']">
                  <td class="w-10 px-3 py-3 text-center">
                    <input 
                      type="checkbox" 
                      :value="asset.id" 
                      v-model="selectedAssetIds" 
                      class="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </td>
                  <td class="px-5 py-3">
                    <div @click="toggleExpand(asset.id)" class="flex items-center gap-1.5 cursor-pointer group hover:text-blue-600">
                      <i :class="['fas fa-chevron-right text-[10px] transition-transform text-gray-400 group-hover:text-blue-500', expandedAssetId === asset.id ? 'rotate-90 text-blue-500' : '']"></i>
                      <div class="font-bold text-gray-900">{{ asset.serial_no }}</div>
                    </div>
                    <div class="text-[10.5px] text-gray-400 flex items-center gap-1.5 mt-0.5 pl-4" v-if="asset.barcode">
                      <i class="fas fa-barcode"></i> {{ asset.barcode }}
                    </div>
                  </td>
                  <td class="px-5 py-3">
                    <div class="font-semibold text-gray-700">{{ asset.brand_name }} {{ asset.model_name }}</div>
                    <div class="text-[10.5px] text-gray-400">{{ asset.category_name }}</div>
                  </td>
                  <td class="px-5 py-3">
                    <span :class="['px-2 py-0.5 rounded-full text-[10px] font-bold uppercase', getStatusClass(asset.status_name)]">
                      {{ asset.status_name }}
                    </span>
                  </td>
                  <td class="px-5 py-3">
                    <div class="font-medium text-gray-800">{{ asset.company_name }}</div>
                    <div class="text-[11.5px] text-gray-500 mt-0.5">
                      <span v-if="asset.personnel_id" class="text-blue-600 font-semibold">
                        <i class="fas fa-user mr-1 text-[10px]"></i> {{ asset.personnel_name }}
                      </span>
                      <span v-else-if="asset.location_id" class="text-purple-600 font-semibold">
                        <i class="fas fa-map-marker-alt mr-1 text-[10px]"></i> {{ asset.location_name }}
                      </span>
                      <span v-else class="text-gray-400 italic">Depoda / Atanmamış</span>
                    </div>
                  </td>
                  <td class="px-5 py-3">
                    <div class="flex items-center gap-2">
                      <a v-if="asset.invoice_path" :href="asset.invoice_path" target="_blank" class="text-blue-600 hover:text-blue-800 text-[11px] font-bold flex items-center gap-1" title="Faturayı Görüntüle">
                        <i class="fas fa-file-invoice"></i> Fatura
                      </a>
                      <a v-if="asset.warranty_path" :href="asset.warranty_path" target="_blank" class="text-purple-600 hover:text-purple-800 text-[11px] font-bold flex items-center gap-1" title="Garanti Belgesini Görüntüle">
                        <i class="fas fa-shield-alt"></i> Garanti
                      </a>
                      <span v-if="!asset.invoice_path && !asset.warranty_path" class="text-gray-300 text-[11px] italic">Dosya yok</span>
                    </div>
                  </td>
                  <td class="px-5 py-3 text-right">
                    <div class="font-semibold text-gray-900">{{ fmt(calculateMonthlyCost(asset)) }}</div>
                    <div class="text-[10px] text-gray-400">
                      Ömür: {{ asset.lifetime_months }} Ay · Bedel: {{ fmt(asset.purchase_price) }}
                    </div>
                  </td>
                  <td class="px-5 py-3 text-right">
                    <div class="flex items-center justify-end gap-1.5">
                      <button @click="openStickerModal(asset)" class="btn-actions" title="QR & Barkod Etiketi Yazdır">
                        <i class="fas fa-qrcode text-blue-600"></i>
                      </button>
                      <RouterLink v-if="asset.personnel_id" to="/inventory/personnel" class="btn-actions" title="Zimmet Formu / Tutanağı Yazdır">
                        <i class="fas fa-file-contract text-purple-600"></i>
                      </RouterLink>
                      <button @click="showLogs(asset)" class="btn-actions" title="İşlem Geçmişi">
                        <i class="fas fa-history text-gray-500"></i>
                      </button>
                      <!-- Checkout (Zimmetle) -->
                      <button 
                        v-if="!asset.personnel_id && !asset.location_id && authStore.hasPermission('asset:edit')" 
                        @click="openCheckoutModal(asset)" 
                        class="btn-actions" 
                        title="Zimmet Atama"
                      >
                        <i class="fas fa-user-plus text-emerald-600"></i>
                      </button>
                      <!-- Checkin (Zimmet İade) -->
                      <button 
                        v-if="(asset.personnel_id || asset.location_id) && authStore.hasPermission('asset:edit')" 
                        @click="handleCheckin(asset)" 
                        class="btn-actions" 
                        title="Depoya İade Et"
                      >
                        <i class="fas fa-undo text-amber-600"></i>
                      </button>
                      <!-- Edit -->
                      <button 
                        v-if="authStore.hasPermission('asset:edit')" 
                        @click="openEditModal(asset)" 
                        class="btn-actions" 
                        title="Düzenle"
                      >
                        <i class="fas fa-edit text-blue-600"></i>
                      </button>
                      <!-- Delete -->
                      <button 
                        v-if="authStore.hasPermission('asset:edit')" 
                        @click="handleDelete(asset)" 
                        class="btn-actions" 
                        title="Sil"
                      >
                        <i class="fas fa-trash text-red-500"></i>
                      </button>
                    </div>
                  </td>
                </tr>

                <!-- EXPANDED SPECIFICATIONS DRAWER ROW -->
                <tr v-if="expandedAssetId === asset.id" class="bg-blue-50/20 border-b border-blue-100 animate-fade-in">
                  <td colspan="8" class="px-8 py-4">
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-gray-700 bg-white p-4 rounded-xl border border-blue-100 shadow-sm">
                      <!-- Column 1: Hardware Specs -->
                      <div class="space-y-2 border-r border-gray-100 pr-4">
                        <div class="font-black text-gray-900 uppercase tracking-wider text-[10px] flex items-center gap-1.5 text-blue-600">
                          <i class="fas fa-microchip"></i> Donanım Özellikleri
                        </div>
                        <div class="flex justify-between py-0.5 border-b border-gray-50"><span class="text-gray-400">İşlemci (CPU):</span> <span class="font-bold text-gray-900">{{ asset.cpu_model || '—' }}</span></div>
                        <div class="flex justify-between py-0.5 border-b border-gray-50"><span class="text-gray-400">RAM:</span> <span class="font-bold text-gray-900">{{ asset.ram_gb ? asset.ram_gb + ' GB' : '—' }}</span></div>
                        <div class="flex justify-between py-0.5 border-b border-gray-50"><span class="text-gray-400">Disk Depolama:</span> <span class="font-bold text-gray-900">{{ asset.disk_gb ? asset.disk_gb + ' GB' : '—' }}</span></div>
                        <div class="flex justify-between py-0.5"><span class="text-gray-400">İşletim Sistemi:</span> <span class="font-bold text-gray-900">{{ asset.os_version || '—' }}</span></div>
                      </div>

                      <!-- Column 2: Network Specs -->
                      <div class="space-y-2 border-r border-gray-100 pr-4">
                        <div class="font-black text-gray-900 uppercase tracking-wider text-[10px] flex items-center gap-1.5 text-purple-600">
                          <i class="fas fa-network-wired"></i> Ağ & Bağlantı Bilgileri
                        </div>
                        <div class="flex justify-between py-0.5 border-b border-gray-50"><span class="text-gray-400">IP Adresi:</span> <span class="font-mono font-bold text-gray-900">{{ asset.ip_address || '—' }}</span></div>
                        <div class="flex justify-between py-0.5"><span class="text-gray-400">MAC Adresi:</span> <span class="font-mono font-bold text-gray-900">{{ asset.mac_address || '—' }}</span></div>
                      </div>

                      <!-- Column 3: Dynamic Category Specs (IMEI, Custom Attributes) -->
                      <div class="space-y-2">
                        <div class="font-black text-gray-900 uppercase tracking-wider text-[10px] flex items-center gap-1.5 text-amber-600">
                          <i class="fas fa-sliders-h"></i> Dinamik & Kategori Özellikleri
                        </div>
                        <div v-if="parseCustomSpecs(asset.specs_json).length === 0" class="text-gray-400 italic text-[11px] py-2">
                          Özel tanımlanmış detay bulunmuyor.
                        </div>
                        <div v-else class="space-y-1">
                          <div v-for="spec in parseCustomSpecs(asset.specs_json)" :key="spec.key" class="flex justify-between py-0.5 border-b border-gray-50">
                            <span class="text-gray-400">{{ spec.key }}:</span>
                            <span class="font-bold text-gray-900">{{ spec.value || '—' }}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>
    </main>

    <!-- CONFIGURATION DIALOG / MODAL -->
    <dialog ref="configDialog" class="modal">
      <div class="modal-box w-11/12 max-w-2xl bg-white p-6 rounded-2xl relative shadow-2xl">
        <h3 class="font-bold text-[16px] text-gray-900 mb-4 flex items-center gap-2">
          <i class="fas fa-cog text-brand"></i> Envanter Tanımlamaları
        </h3>
        
        <div class="grid grid-cols-2 gap-6">
          <!-- Add Category -->
          <div class="border border-gray-100 rounded-xl p-4 bg-gray-50/50">
            <h4 class="font-bold text-[13px] text-gray-700 mb-3">Kategori Ekle</h4>
            <div class="flex gap-2">
              <input v-model="newCategory" type="text" placeholder="Kategori adı..." class="form-input flex-1" />
              <button @click="submitCategory" class="btn-primary-sm">Ekle</button>
            </div>
          </div>

          <!-- Add Brand -->
          <div class="border border-gray-100 rounded-xl p-4 bg-gray-50/50">
            <h4 class="font-bold text-[13px] text-gray-700 mb-3">Marka Ekle</h4>
            <div class="flex gap-2">
              <input v-model="newBrand" type="text" placeholder="Marka adı..." class="form-input flex-1" />
              <button @click="submitBrand" class="btn-primary-sm">Ekle</button>
            </div>
          </div>
        </div>

        <!-- Add Model -->
        <div class="border border-gray-100 rounded-xl p-4 bg-gray-50/50 mt-6">
          <h4 class="font-bold text-[13px] text-gray-700 mb-3">Model Ekle</h4>
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
      <div class="modal-box w-11/12 max-w-xl bg-white p-6 rounded-2xl relative shadow-2xl">
        <h3 class="font-bold text-[16px] text-gray-900 mb-4">
          {{ isEditMode ? 'Varlık Düzenle' : 'Yeni Varlık Ekle' }}
        </h3>
        
        <form @submit.prevent="saveAsset" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="form-label">Seri Numarası *</label>
              <input v-model="assetForm.serial_no" type="text" class="form-input" required />
            </div>
            <div>
              <label class="form-label">Envanter No (Demirbaş Etiketi)</label>
              <input v-model="assetForm.barcode" type="text" class="form-input" />
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
                  {{ m.brand_name }} - {{ m.name }} ({{ m.category_name }})
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

          <div class="grid grid-cols-3 gap-4">
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
              <div v-if="assetForm.invoice_path" class="text-[10px] text-green-600 mt-1">✓ Fatura yüklü</div>
            </div>
            <div>
              <label class="form-label">Garanti Belgesi (PDF/Görsel)</label>
              <input type="file" @change="handleFileChange($event, 'warranty')" class="file-input-custom" accept=".pdf,image/*" />
              <div v-if="assetForm.warranty_path" class="text-[10px] text-green-600 mt-1">✓ Garanti Belgesi yüklü</div>
            </div>
          </div>

          <!-- Technical & Dynamic Specs Section -->
          <div class="border-t border-b border-gray-100 py-3 my-2 space-y-3">
            <h4 class="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center justify-between">
              <span class="flex items-center gap-1.5"><i class="fas fa-microchip text-blue-500"></i> Kategoriye Özel & Teknik Özellikler</span>
              <button type="button" @click="addCustomSpecRow" class="text-[10px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1">
                <i class="fas fa-plus"></i> Özel Özellik Ekle
              </button>
            </h4>

            <!-- Computer / Server Specs -->
            <div v-if="isComputerCategory" class="grid grid-cols-4 gap-3">
              <div>
                <label class="form-label">İşlemci (CPU)</label>
                <input v-model="assetForm.cpu_model" type="text" placeholder="Intel i7-12700" class="form-input" />
              </div>
              <div>
                <label class="form-label">RAM (GB)</label>
                <input v-model.number="assetForm.ram_gb" type="number" placeholder="16" class="form-input" />
              </div>
              <div>
                <label class="form-label">Disk (GB)</label>
                <input v-model.number="assetForm.disk_gb" type="number" placeholder="512" class="form-input" />
              </div>
              <div>
                <label class="form-label">İşletim Sistemi</label>
                <input v-model="assetForm.os_version" type="text" placeholder="Win 11 Pro" class="form-input" />
              </div>
            </div>

            <!-- Network Info (For PC/Server/Network) -->
            <div v-if="isComputerCategory" class="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label class="form-label">IP Adresi</label>
                <input v-model="assetForm.ip_address" type="text" placeholder="192.168.1.100" class="form-input font-mono" />
              </div>
              <div>
                <label class="form-label">MAC Adresi</label>
                <input v-model="assetForm.mac_address" type="text" placeholder="00:1A:2B:3C:4D:5E" class="form-input font-mono" />
              </div>
            </div>

            <!-- Phone / Tablet Specs -->
            <div v-if="isPhoneCategory" class="grid grid-cols-4 gap-3 bg-amber-50/50 p-3 rounded-lg border border-amber-100">
              <div>
                <label class="form-label text-amber-900">IMEI 1 *</label>
                <input v-model="phoneSpecs.imei" type="text" placeholder="358291829..." class="form-input font-mono" />
              </div>
              <div>
                <label class="form-label text-amber-900">IMEI 2 (Opsiyonel)</label>
                <input v-model="phoneSpecs.imei2" type="text" placeholder="358291829..." class="form-input font-mono" />
              </div>
              <div>
                <label class="form-label text-amber-900">Depolama (GB)</label>
                <input v-model="phoneSpecs.storage_gb" type="text" placeholder="128 GB" class="form-input" />
              </div>
              <div>
                <label class="form-label text-amber-900">Renk</label>
                <input v-model="phoneSpecs.color" type="text" placeholder="Uzay Grisi" class="form-input" />
              </div>
            </div>

            <!-- Dynamic Custom Specs Rows -->
            <div v-if="customSpecsList.length > 0" class="space-y-2 pt-2 border-t border-gray-100">
              <div class="text-[10px] font-bold text-gray-400 uppercase">Özel Özellik Listesi:</div>
              <div v-for="(spec, idx) in customSpecsList" :key="idx" class="flex items-center gap-2">
                <input v-model="spec.key" type="text" placeholder="Özellik Adı (Örn: Ekran Boyutu)" class="form-input flex-1" />
                <input v-model="spec.value" type="text" placeholder="Değer (Örn: 27 İnç)" class="form-input flex-1" />
                <button type="button" @click="removeCustomSpecRow(idx)" class="text-red-500 hover:text-red-700 text-xs px-2 font-bold" title="Sil">
                  <i class="fas fa-times"></i>
                </button>
              </div>
            </div>
          </div>

          <div>
            <label class="form-label">Genel Durum *</label>
            <select v-model="assetForm.status_id" class="form-select" required>
              <option value="">Durum Seçiniz</option>
              <option v-for="s in assetStore.metadata.statuses" :key="s.id" :value="s.id">{{ s.name }}</option>
            </select>
          </div>

          <div>
            <label class="form-label">Notlar / Açıklama</label>
            <textarea v-model="assetForm.notes" class="form-textarea" rows="3"></textarea>
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
      <div class="modal-box w-11/12 max-w-md bg-white p-6 rounded-2xl relative shadow-2xl">
        <h3 class="font-bold text-[16px] text-gray-900 mb-4">
          Varlık Zimmetle: {{ selectedAsset?.serial_no }}
        </h3>
        
        <form @submit.prevent="saveCheckout" class="space-y-4">
          <div>
            <label class="form-label">Zimmet Hedefi</label>
            <div class="flex items-center gap-4 mt-2">
              <label class="flex items-center gap-1.5 text-[12.5px] cursor-pointer">
                <input type="radio" v-model="checkoutForm.target_type" value="PERSONNEL" />
                Personel
              </label>
              <label class="flex items-center gap-1.5 text-[12.5px] cursor-pointer">
                <input type="radio" v-model="checkoutForm.target_type" value="LOCATION" />
                Lokasyon / Konum
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
      <div class="modal-box w-11/12 max-w-xl bg-white p-6 rounded-2xl relative shadow-2xl flex flex-col max-h-[500px]">
        <h3 class="font-bold text-[16px] text-gray-900 mb-4 shrink-0 flex items-center gap-2">
          <i class="fas fa-history text-gray-500"></i> Zimmet & İşlem Geçmişi: {{ selectedAsset?.serial_no }}
        </h3>
        
        <div class="flex-1 overflow-y-auto pr-1 space-y-4">
          <div v-if="assetLogs.length === 0" class="text-center py-10 text-gray-400">
            Hiçbir işlem kaydı bulunmuyor.
          </div>
          <div v-for="log in assetLogs" :key="log.id" class="border-l-2 border-gray-150 pl-4 py-1 relative">
            <div class="absolute w-2 h-2 rounded-full bg-gray-300 -left-[5px] top-2"></div>
            <div class="flex justify-between items-center text-[11px] text-gray-400">
              <span>{{ formatDate(log.created_at) }}</span>
              <span>Yapan: {{ log.user_name || 'Sistem' }}</span>
            </div>
            <div class="font-bold text-[12.5px] text-gray-800 mt-1">
              {{ getActionLabel(log.action) }}
              <span v-if="log.action === 'CHECKOUT' && log.target_type === 'PERSONNEL'" class="text-blue-600">
                👉 Personel: {{ log.personnel_target_name }}
              </span>
              <span v-else-if="log.action === 'CHECKOUT' && log.target_type === 'LOCATION'" class="text-purple-600">
                👉 Lokasyon: {{ log.location_target_name }}
              </span>
            </div>
            <div class="text-[11.5px] text-gray-500 mt-0.5" v-if="log.notes">
              Not: {{ log.notes }}
            </div>
          </div>
        </div>

        <div class="modal-action shrink-0 mt-6">
          <button @click="closeLogsModal" class="btn-secondary">Kapat</button>
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
import AssetStickerModal from '../../components/AssetStickerModal.vue'
import AssetScannerModal from '../../components/AssetScannerModal.vue'

const router = useRouter()
const assetStore = useAssetStore()
const authStore = useAuthStore()
const masterData = useMasterDataStore()
const { showToast } = useToast()

// Multi Selection States
const selectedAssetIds = ref([])
const batchStickerAssets = ref([])

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
const excelInput = ref(null)

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

const handleScanResult = (scannedCode) => {
  searchQuery.value = scannedCode
  showToast(`Taranan kod arandı: ${scannedCode}`, 'info')
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
      const inBrand = (a.brand_name || '').toLowerCase().includes(q)
      const inModel = (a.model_name || '').toLowerCase().includes(q)
      const inCategory = (a.category_name || '').toLowerCase().includes(q)
      const inCompany = (a.company_name || '').toLowerCase().includes(q)
      const inPersonnel = (a.personnel_name || '').toLowerCase().includes(q)
      const inLocation = (a.location_name || '').toLowerCase().includes(q)
      const inNotes = (a.notes || '').toLowerCase().includes(q)

      if (!inSerial && !inBarcode && !inBrand && !inModel && !inCategory && !inCompany && !inPersonnel && !inLocation && !inNotes) {
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
  if (!statusName) return 'bg-gray-100 text-gray-500'
  const name = statusName.toLowerCase()
  if (name.includes('zimmet') || name.includes('kullanım')) return 'bg-emerald-100 text-emerald-700'
  if (name.includes('depo') || name.includes('boşta')) return 'bg-blue-100 text-blue-700'
  if (name.includes('hazırlık') || name.includes('image')) return 'bg-indigo-100 text-indigo-700'
  if (name.includes('yedek') || name.includes('standby')) return 'bg-cyan-100 text-cyan-700'
  if (name.includes('servis') || name.includes('bakım')) return 'bg-amber-100 text-amber-700'
  if (name.includes('arıza')) return 'bg-orange-100 text-orange-700'
  if (name.includes('kayıp') || name.includes('çalındı')) return 'bg-rose-100 text-rose-700 font-bold'
  if (name.includes('hurda') || name.includes('arşiv')) return 'bg-red-100 text-red-700'
  return 'bg-gray-100 text-gray-700'
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

const toggleExpand = (id) => {
  expandedAssetId.value = expandedAssetId.value === id ? null : id
}

const addCustomSpecRow = () => {
  customSpecsList.value.push({ key: '', value: '' })
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

const isPhoneCategory = computed(() => {
  const name = selectedCategoryName.value
  return name.includes('telefon') || name.includes('phone') || name.includes('mobil') || name.includes('gsm') || name.includes('tablet')
})

const isComputerCategory = computed(() => {
  const name = selectedCategoryName.value
  return name.includes('bilgisayar') || name.includes('pc') || name.includes('laptop') || name.includes('notebook') || name.includes('sunucu') || name.includes('server') || !name
})

const openAddModal = () => {
  isEditMode.value = false
  invoiceFile.value = null
  warrantyFile.value = null
  selectedCategoryId.value = ''
  selectedBrandId.value = ''
  customSpecsList.value = []
  phoneSpecs.value = { imei: '', imei2: '', storage_gb: '', color: '' }
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

const openEditModal = (asset) => {
  isEditMode.value = true
  invoiceFile.value = null
  warrantyFile.value = null
  assetForm.value = { ...asset }

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

  if (asset.specs_json) {
    try {
      const parsed = typeof asset.specs_json === 'string' ? JSON.parse(asset.specs_json) : asset.specs_json
      if (parsed.imei) phoneSpecs.value.imei = parsed.imei
      if (parsed.imei2) phoneSpecs.value.imei2 = parsed.imei2
      if (parsed.storage_gb) phoneSpecs.value.storage_gb = parsed.storage_gb
      if (parsed.color) phoneSpecs.value.color = parsed.color

      for (const [k, v] of Object.entries(parsed)) {
        if (!['imei', 'imei2', 'storage_gb', 'color'].includes(k)) {
          customSpecsList.value.push({ key: k, value: String(v) })
        }
      }
    } catch (e) {}
  }

  assetDialog.value.showModal()
}

const saveAsset = async () => {
  try {
    const formData = new FormData()
    formData.append('serial_no', assetForm.value.serial_no)
    formData.append('barcode', assetForm.value.barcode || '')
    formData.append('model_id', assetForm.value.model_id)
    formData.append('status_id', assetForm.value.status_id)
    formData.append('company_id', assetForm.value.company_id)
    formData.append('purchase_price', assetForm.value.purchase_price || 0)
    formData.append('purchase_date', assetForm.value.purchase_date || '')
    formData.append('lifetime_months', assetForm.value.lifetime_months || 60)
    formData.append('notes', assetForm.value.notes || '')
    formData.append('mac_address', assetForm.value.mac_address || '')
    formData.append('ip_address', assetForm.value.ip_address || '')
    formData.append('cpu_model', assetForm.value.cpu_model || '')
    formData.append('ram_gb', assetForm.value.ram_gb || '')
    formData.append('disk_gb', assetForm.value.disk_gb || '')
    formData.append('os_version', assetForm.value.os_version || '')

    // Dynamic Specs Object
    const specsObj = {}
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
  if (confirm(`"${asset.serial_no}" seri numaralı varlığı silmek istediğinize emin misiniz?`)) {
    try {
      await assetStore.deleteAsset(asset.id)
    } catch (err) {
      alert(err)
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
    alert(err)
  }
}

const handleCheckin = async (asset) => {
  const notes = prompt('Zimmet iade/depoya çekme açıklaması (Opsiyonel):')
  if (notes !== null) {
    try {
      await assetStore.checkinAsset(asset.id, { notes })
    } catch (err) {
      alert(err)
    }
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
  @apply h-8 px-3 bg-gray-50 border border-gray-200 rounded text-[12px] font-medium text-gray-700 outline-none focus:border-blue-500;
}
.filter-select { 
  @apply h-8 px-2 bg-gray-50 border border-gray-200 rounded text-[12px] font-medium text-gray-700 outline-none focus:border-blue-500 cursor-pointer; 
}
.btn-primary { 
  @apply h-8 px-4 bg-blue-600 text-white rounded text-[11px] font-bold hover:bg-blue-700 flex items-center transition-all shadow-sm; 
}
.btn-secondary { 
  @apply h-8 px-4 bg-gray-100 text-gray-700 rounded text-[11px] font-bold hover:bg-gray-200 flex items-center transition-all; 
}
.btn-primary-sm { 
  @apply px-3 py-1.5 bg-blue-600 text-white rounded text-[11px] font-bold hover:bg-blue-700 transition-all shadow-sm; 
}
.btn-actions {
  @apply w-7 h-7 rounded border border-gray-100 bg-white hover:bg-gray-50 flex items-center justify-center transition-all shadow-sm;
}
.form-label {
  @apply block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1;
}
.form-input {
  @apply w-full h-9 px-3 bg-gray-50 border border-gray-200 rounded-lg text-[13px] text-gray-800 outline-none focus:border-blue-500 focus:bg-white transition-all;
}
.form-select {
  @apply w-full h-9 px-2 bg-gray-50 border border-gray-200 rounded-lg text-[13px] text-gray-800 outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer;
}
.form-textarea {
  @apply w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-[13px] text-gray-800 outline-none focus:border-blue-500 focus:bg-white transition-all resize-none;
}
.file-input-custom {
  @apply block w-full text-[11px] text-gray-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-[11px] file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer;
}
</style>
