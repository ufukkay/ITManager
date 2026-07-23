<template>
  <div class="h-full flex flex-col bg-white overflow-hidden">
    <!-- HEADER -->
    <header class="h-14 border-b border-gray-100 flex items-center px-6 gap-4 bg-white shrink-0">
      <div class="flex items-center gap-2 shrink-0">
        <i class="fas fa-user-tag text-gray-400"></i>
        <h1 class="text-[15px] font-bold text-gray-900">Personel Zimmet Özeti</h1>
      </div>

      <!-- Search & Filter Controls -->
      <div class="flex items-center gap-2 ml-4 flex-1">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Personel adı veya şirkete göre ara..."
          class="h-8 px-3 bg-gray-50 border border-gray-200 rounded text-[12px] font-medium text-gray-700 outline-none focus:border-blue-500 w-64"
        />
        <select v-model="selectedCompanyId" class="h-8 px-2 bg-gray-50 border border-gray-200 rounded text-[12px] font-medium text-gray-700 outline-none focus:border-blue-500 cursor-pointer">
          <option value="">Tüm Şirketler</option>
          <option v-for="c in companies" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>

        <!-- Toggle Filter (Only Assigned vs All) -->
        <div class="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg ml-2">
          <button 
            @click="onlyAssignedFilter = true"
            :class="['px-2.5 py-1 rounded text-[11px] font-bold transition-all', onlyAssignedFilter ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700']"
          >
            Sadece Zimmetliler ({{ personnelWithAssetsCount }})
          </button>
          <button 
            @click="onlyAssignedFilter = false"
            :class="['px-2.5 py-1 rounded text-[11px] font-bold transition-all', !onlyAssignedFilter ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700']"
          >
            Tüm Personel
          </button>
        </div>
      </div>

      <!-- Stats & Batch Actions -->
      <div class="ml-auto flex items-center gap-2 text-[12px]">
        <RouterLink 
          to="/master-data/form-designer" 
          class="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11.5px] rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
          title="A4 Zimmet Formunu Görsel Tasarla"
        >
          <i class="fas fa-file-signature"></i> A4 Form Studio
        </RouterLink>
        <button 
          v-if="personnelWithAssetsCount > 0"
          @click="openBatchPrintModal"
          class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11.5px] rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
          title="Aktif zimmeti olan tüm personellerin formunu sırayla görüntüle/yazdır"
        >
          <i class="fas fa-print"></i> Toplu Zimmet Formları
        </button>
        <span class="text-gray-400">
          <span class="font-bold text-gray-700">{{ filteredPersonnel.length }}</span> personel
        </span>
        <span class="text-gray-400">
          <span class="font-bold text-emerald-600">{{ totalAssignedCount }}</span> toplam zimmet
        </span>
      </div>
    </header>

    <!-- MAIN CONTENT -->
    <main class="flex-1 overflow-y-auto bg-gray-50/40 p-6">
      <div v-if="loading" class="flex items-center justify-center h-64 text-gray-300">
        <i class="fas fa-circle-notch fa-spin text-3xl"></i>
      </div>

      <div v-else-if="filteredPersonnel.length === 0" class="flex flex-col items-center justify-center h-64 text-gray-300 gap-3">
        <i class="fas fa-user-slash text-4xl"></i>
        <p class="text-sm font-medium">Zimmetli personel bulunamadı.</p>
      </div>

      <div v-else class="grid grid-cols-1 gap-4">
        <div
          v-for="person in filteredPersonnel"
          :key="person.id"
          class="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden"
        >
          <!-- Personnel Header -->
          <div
            class="flex items-center gap-4 px-5 py-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50/50 transition-colors"
            @click="toggleExpand(person.id)"
          >
            <!-- Avatar -->
            <div class="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-[12px] border border-blue-100 shrink-0">
              {{ person.first_name?.[0] }}{{ person.last_name?.[0] }}
            </div>
            <!-- Info -->
            <div class="flex-1 min-w-0">
              <div class="font-bold text-gray-900 text-[13.5px]">{{ person.first_name }} {{ person.last_name }}</div>
              <div class="text-[11px] text-gray-400 flex items-center gap-2 mt-0.5">
                <span v-if="person.title">{{ person.title }}</span>
                <span v-if="person.title && person.company_name" class="text-gray-200">·</span>
                <span v-if="person.company_name" class="text-blue-500 font-medium">{{ person.company_name }}</span>
                <span v-if="person.department_name" class="text-gray-300">·</span>
                <span v-if="person.department_name" class="text-gray-400">{{ person.department_name }}</span>
              </div>
            </div>

              <!-- Asset Count Badge & Actions -->
              <div class="flex items-center gap-3 shrink-0">
                <div
                  v-if="personnelAssets[person.id]"
                  class="flex items-center gap-2"
                >
                  <span class="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[11px] font-bold rounded-full">
                    <i class="fas fa-desktop mr-1"></i>
                    {{ personnelAssets[person.id].active?.length || 0 }} Aktif Zimmet
                  </span>
                  <span
                    v-if="personnelAssets[person.id].totalValue > 0"
                    class="px-2.5 py-1 bg-blue-50 text-blue-700 text-[11px] font-bold rounded-full"
                  >
                    {{ fmt(personnelAssets[person.id].totalValue) }}
                  </span>
                  <button
                    v-if="personnelAssets[person.id].active?.length > 0"
                    @click.stop="openPrintModal(person)"
                    class="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-bold rounded-lg flex items-center gap-1.5 transition-colors print:hidden"
                    title="Zimmet Formu Yazdır"
                  >
                    <i class="fas fa-print text-gray-500"></i>
                    <span>Zimmet Formu</span>
                  </button>
                  <button
                    @click.stop="openQuickAssignModal(person)"
                    class="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-lg flex items-center gap-1.5 transition-colors print:hidden shadow-sm"
                    title="Bu personele yeni cihaz zimmetle"
                  >
                    <i class="fas fa-plus"></i>
                    <span>Zimmetle</span>
                  </button>
                </div>
                <div v-else class="text-gray-300 text-[11px] italic">Yükleniyor...</div>

                <i :class="['fas', expandedIds.has(person.id) ? 'fa-chevron-up' : 'fa-chevron-down', 'text-gray-400 text-[11px] transition-transform']"></i>
              </div>
          </div>

          <!-- Expanded Assets Table -->
          <div v-if="expandedIds.has(person.id) && personnelAssets[person.id]">
            <div v-if="personnelAssets[person.id].active?.length === 0" class="px-5 py-4 text-[12px] text-gray-400 italic">
              Bu personelde aktif zimmetli cihaz bulunmuyor.
            </div>
            <table v-else class="w-full text-left text-[12px]">
              <thead class="bg-gray-50 text-gray-400 uppercase text-[9.5px] font-bold border-b border-gray-100">
                <tr>
                  <th class="px-5 py-2.5">Seri No / Envanter No</th>
                  <th class="px-5 py-2.5">Cihaz Bilgisi</th>
                  <th class="px-5 py-2.5">Kategori</th>
                  <th class="px-5 py-2.5">Alış Bedeli</th>
                  <th class="px-5 py-2.5">Alış Tarihi</th>
                  <th class="px-5 py-2.5 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-50">
                <tr
                  v-for="asset in personnelAssets[person.id].active"
                  :key="asset.id"
                  class="hover:bg-gray-50/50 transition-colors"
                >
                  <td class="px-5 py-3">
                    <div class="font-bold text-gray-900">{{ asset.serial_no }}</div>
                    <div v-if="asset.barcode" class="text-[10px] text-gray-400 mt-0.5">
                      <i class="fas fa-barcode mr-1"></i>{{ asset.barcode }}
                    </div>
                  </td>
                  <td class="px-5 py-3 font-semibold text-gray-700">
                    {{ asset.brand_name }} {{ asset.model_name }}
                  </td>
                  <td class="px-5 py-3 text-gray-500">{{ asset.category_name }}</td>
                  <td class="px-5 py-3 font-semibold text-gray-900">{{ fmt(asset.purchase_price) }}</td>
                  <td class="px-5 py-3 text-gray-500">{{ fmtDate(asset.purchase_date) }}</td>
                  <td class="px-5 py-3 text-right">
                    <div class="flex items-center justify-end gap-2">
                      <button
                        @click="handleQuickReturn(asset)"
                        class="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 text-[11px] font-bold rounded flex items-center gap-1 transition-colors border border-amber-200"
                        title="Bu cihazı depoya iade et"
                      >
                        <i class="fas fa-undo"></i> İade Et
                      </button>
                      <RouterLink
                        to="/inventory/assets"
                        class="text-blue-600 hover:text-blue-800 text-[11px] font-bold transition-colors p-1"
                        title="Envanterde Görüntüle"
                      >
                        <i class="fas fa-external-link-alt"></i>
                      </RouterLink>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            <!-- History Section -->
            <div v-if="personnelAssets[person.id].history?.length > 0" class="border-t border-gray-50 px-5 py-3">
              <div class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                <i class="fas fa-history"></i> Zimmet Geçmişi ({{ personnelAssets[person.id].history.length }})
              </div>
              <div class="flex flex-wrap gap-2">
                <div
                  v-for="h in personnelAssets[person.id].history.slice(0, 5)"
                  :key="h.id"
                  class="text-[11px] px-2.5 py-1 rounded-full bg-gray-100 text-gray-500"
                >
                  <i :class="h.action === 'CHECKOUT' ? 'fas fa-arrow-right text-blue-400' : 'fas fa-arrow-left text-amber-400'" class="mr-1"></i>
                  {{ h.brand_name }} {{ h.model_name }} · {{ fmtDate(h.created_at) }}
                </div>
                <div v-if="personnelAssets[person.id].history.length > 5" class="text-[11px] px-2.5 py-1 text-gray-400">
                  +{{ personnelAssets[person.id].history.length - 5 }} daha...
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- PRINT ZİMMET MODAL -->
    <div v-if="showPrintModal && selectedPrintPerson" class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 print:p-0 print:static print:bg-transparent">
      <div class="bg-white rounded-2xl max-w-4xl w-full p-8 shadow-2xl relative max-h-[95vh] overflow-y-auto print:max-h-none print:shadow-none print:w-full print:p-0">
        <!-- Close & Print Action Buttons (Hidden on Print) -->
        <div class="flex items-center justify-between border-b pb-4 mb-6 print:hidden">
          <div class="flex items-center gap-2">
            <i class="fas fa-file-contract text-blue-600 text-xl"></i>
            <h2 class="text-lg font-bold text-gray-800">Zimmet Teslim ve Tesellüm Tutanağı Önizleme</h2>
          </div>
          <div class="flex items-center gap-3">
            <button @click="triggerPrint" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg flex items-center gap-2 transition-colors">
              <i class="fas fa-print"></i> Yazdır / PDF İndir
            </button>
            <button @click="showPrintModal = false" class="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-xs rounded-lg">
              Kapat
            </button>
          </div>
        </div>

        <!-- PRINTABLE DOCUMENT AREA (A4 Containers) -->
        <div id="zimmet-print-area" class="w-full flex flex-col gap-4 items-center print:gap-0 print:block">
          <!-- SAYFA 1 -->
          <div class="a4-paper bg-white relative border border-gray-300 mx-auto" style="width: 700px; height: 990px; font-family: sans-serif; box-sizing: border-box; overflow: hidden; background: #ffffff; color: #111827;">
            <div 
              v-for="el in page1Elements" 
              :key="el.id"
              class="absolute"
              :style="{
                left: `${el.x}%`,
                top: `${el.y}%`,
                width: el.w ? `${el.w}%` : 'auto',
                fontSize: el.fontSize ? `${el.fontSize}px` : '12px',
                fontWeight: el.fontWeight || 'normal',
                color: el.color || '#111827',
                backgroundColor: el.bg || 'transparent'
              }"
            >
              <!-- Company Logo -->
              <div v-if="el.type === 'company_logo'" class="flex items-center gap-2">
                <img v-if="el.logo_url" :src="el.logo_url" class="h-8 object-contain shrink-0" style="max-width: 120px;" />
                <div v-else class="w-8 h-8 rounded bg-blue-600 text-white flex items-center justify-center font-extrabold text-sm uppercase">
                  {{ (el.company_name || selectedPrintPerson.company_name || 'T')[0] }}
                </div>
                <div>
                  <div class="font-extrabold tracking-wider uppercase text-[12px] text-gray-900">
                    {{ el.company_name || selectedPrintPerson.company_name || 'TALAY LOJİSTİK A.Ş.' }}
                  </div>
                  <div class="text-[9px] font-bold text-gray-400">
                    {{ el.sub_title || 'IT BİLİŞİM YÖNETİMİ' }}
                  </div>
                </div>
              </div>

              <!-- Header Title -->
              <div v-else-if="el.type === 'header_title'" class="text-center py-1 border-b-2 border-gray-900 w-full">
                <h1 class="text-base font-black tracking-wider uppercase">ZİMMET TESLİM VE TESELLÜM TUTANAĞI</h1>
                <p class="text-[9px] font-semibold text-gray-500 mt-0.5">
                  {{ el.company_name || selectedPrintPerson.company_name || 'KURUM İÇİ IT BİLİŞİM ENVALERİ' }}
                </p>
              </div>

              <!-- Personnel Info Table -->
              <div v-else-if="el.type === 'personnel_info'" class="border border-gray-300 rounded-lg p-3 bg-gray-50/80 w-full" style="box-sizing: border-box;">
                <table class="w-full text-left text-[11px] border-none" style="margin: 0; border: none;">
                  <tr class="border-none" style="border: none;">
                    <td class="py-1 border-none" style="width: 50%; border: none;">
                      <span class="text-gray-400 font-bold block text-[9px] uppercase">PERSONEL ADI SOYADI:</span>
                      <span class="font-black text-gray-900 text-xs">{{ selectedPrintPerson.first_name }} {{ selectedPrintPerson.last_name }}</span>
                    </td>
                    <td class="py-1 border-none" style="width: 50%; border: none;">
                      <span class="text-gray-400 font-bold block text-[9px] uppercase">UNVAN:</span>
                      <span class="font-bold text-gray-800 text-xs">{{ selectedPrintPerson.title || '—' }}</span>
                    </td>
                  </tr>
                  <tr class="border-none" style="border: none;">
                    <td class="py-1 border-none" style="border: none;">
                      <span class="text-gray-400 font-bold block text-[9px] uppercase">ŞİRKET / DEPARTMAN:</span>
                      <span class="font-bold text-gray-800 text-xs">{{ selectedPrintPerson.company_name }} / {{ selectedPrintPerson.department_name || '—' }}</span>
                    </td>
                    <td class="py-1 border-none" style="border: none;">
                      <span class="text-gray-400 font-bold block text-[9px] uppercase">DÜZENLEME TARİHİ:</span>
                      <span class="font-black text-gray-900 text-xs">{{ new Date().toLocaleDateString('tr-TR') }}</span>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Assets Table -->
              <div v-else-if="el.type === 'assets_table'" class="w-full">
                <div class="text-[10px] font-black uppercase text-gray-700 mb-1 tracking-wider">Teslim Edilen Donanım ve Cihaz Listesi:</div>
                <table class="w-full border-collapse border border-gray-400 text-[11px]" style="margin: 0;">
                  <thead>
                    <tr class="bg-gray-100 border-b border-gray-400 text-[9px] uppercase font-bold text-gray-700">
                      <th class="border border-gray-400 px-2 py-1.5 text-center" style="width: 8%;">S.No</th>
                      <th class="border border-gray-400 px-2 py-1.5" style="width: 20%;">Kategori</th>
                      <th class="border border-gray-400 px-2 py-1.5" style="width: 32%;">Marka & Model</th>
                      <th class="border border-gray-400 px-2 py-1.5 font-mono" style="width: 22%;">Seri Numarası</th>
                      <th class="border border-gray-400 px-2 py-1.5 font-mono" style="width: 18%;">Envanter No</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(asset, idx) in (personnelAssets[selectedPrintPerson.id]?.active || [])" :key="asset.id" class="border-b border-gray-300">
                      <td class="border border-gray-300 px-2 py-1.5 text-center font-bold">{{ idx + 1 }}</td>
                      <td class="border border-gray-300 px-2 py-1.5">{{ asset.category_name }}</td>
                      <td class="border border-gray-300 px-2 py-1.5 font-bold">{{ asset.brand_name }} {{ asset.model_name }}</td>
                      <td class="border border-gray-300 px-2 py-1.5 font-mono font-bold">{{ asset.serial_no }}</td>
                      <td class="border border-gray-300 px-2 py-1.5 font-mono">{{ asset.barcode || '—' }}</td>
                    </tr>
                    <tr v-if="(personnelAssets[selectedPrintPerson.id]?.active || []).length === 0">
                      <td colspan="5" class="border border-gray-300 px-2 py-3 text-center text-gray-400 italic">Aktif zimmetli cihaz bulunmuyor.</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Commitment Text -->
              <div v-else-if="el.type === 'commitment_text'" class="border border-gray-300 rounded-lg p-3 bg-gray-50/60 text-[10.5px] leading-relaxed text-gray-700 w-full" style="box-sizing: border-box;">
                <div class="font-bold uppercase text-gray-900 mb-0.5">Taahhütname & Yasal Şartlar:</div>
                <p>{{ el.text || defaultCommitmentText }}</p>
              </div>

              <!-- QR Code Doküman Doğrulama -->
              <div v-else-if="el.type === 'qr_verify'" class="flex items-center gap-3 border border-gray-200 p-2 rounded-lg bg-white w-full" style="box-sizing: border-box;">
                <img :src="'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' + encodeURIComponent(getAuditLink(selectedPrintPerson))" class="w-12 h-12 shrink-0" />
                <div>
                  <div class="font-bold text-[11px] text-gray-900">Mobil Saha Doğrulama</div>
                  <div class="text-[9.5px] text-gray-400">QR kod kamerasından zimmeti onaylamak için taratın</div>
                </div>
              </div>

              <!-- Signatures -->
              <div v-else-if="el.type === 'signatures'" class="grid grid-cols-2 gap-8 text-center pt-2 w-full">
                <div class="border-t-2 border-gray-800 pt-2">
                  <div class="font-bold uppercase text-[10px] text-gray-900">TESLİM EDEN (IT DEPARTMANI)</div>
                  <div class="text-[9px] text-gray-400 mt-0.5">İmza & Tarih</div>
                  <div class="h-12"></div>
                </div>
                <div class="border-t-2 border-gray-800 pt-2">
                  <div class="font-bold uppercase text-[10px] text-gray-900">TESLİM ALAN (PERSONEL)</div>
                  <div class="font-bold text-[11px] text-gray-800 mt-0.5">{{ selectedPrintPerson.first_name }} {{ selectedPrintPerson.last_name }}</div>
                  <div class="text-[9px] text-gray-400">İmza & Tarih</div>
                  <div class="h-12"></div>
                </div>
              </div>

              <!-- Custom Text -->
              <div v-else-if="el.type === 'custom_text'" class="font-medium w-full">
                {{ el.text }}
              </div>

              <!-- Divider -->
              <div v-else-if="el.type === 'divider'" class="w-full border-b border-gray-300 my-1"></div>
            </div>
          </div>

          <!-- SAYFA 2 (Sadece pageCount === 2 ise) -->
          <div v-if="printElements.pageCount === 2" class="a4-paper bg-white relative border border-gray-300 mx-auto mt-4 print:mt-0 print:border-none animate-fade-in" style="width: 700px; height: 990px; font-family: sans-serif; box-sizing: border-box; overflow: hidden; background: #ffffff; color: #111827;">
            <div 
              v-for="el in page2Elements" 
              :key="el.id"
              class="absolute"
              :style="{
                left: `${el.x}%`,
                top: `${el.y - 100}%`,
                width: el.w ? `${el.w}%` : 'auto',
                fontSize: el.fontSize ? `${el.fontSize}px` : '12px',
                fontWeight: el.fontWeight || 'normal',
                color: el.color || '#111827',
                backgroundColor: el.bg || 'transparent'
              }"
            >
              <!-- Company Logo -->
              <div v-if="el.type === 'company_logo'" class="flex items-center gap-2">
                <img v-if="el.logo_url" :src="el.logo_url" class="h-8 object-contain shrink-0" style="max-width: 120px;" />
                <div v-else class="w-8 h-8 rounded bg-blue-600 text-white flex items-center justify-center font-extrabold text-sm uppercase">
                  {{ (el.company_name || selectedPrintPerson.company_name || 'T')[0] }}
                </div>
                <div>
                  <div class="font-extrabold tracking-wider uppercase text-[12px] text-gray-900">
                    {{ el.company_name || selectedPrintPerson.company_name || 'TALAY LOJİSTİK A.Ş.' }}
                  </div>
                  <div class="text-[9px] font-bold text-gray-400">
                    {{ el.sub_title || 'IT BİLİŞİM YÖNETİMİ' }}
                  </div>
                </div>
              </div>

              <!-- Header Title -->
              <div v-else-if="el.type === 'header_title'" class="text-center py-1 border-b-2 border-gray-900 w-full">
                <h1 class="text-base font-black tracking-wider uppercase">ZİMMET TESLİM VE TESELLÜM TUTANAĞI</h1>
                <p class="text-[9px] font-semibold text-gray-500 mt-0.5">
                  {{ el.company_name || selectedPrintPerson.company_name || 'KURUM İÇİ IT BİLİŞİM ENVALERİ' }}
                </p>
              </div>

              <!-- Personnel Info Table -->
              <div v-else-if="el.type === 'personnel_info'" class="border border-gray-300 rounded-lg p-3 bg-gray-50/80 w-full" style="box-sizing: border-box;">
                <table class="w-full text-left text-[11px] border-none" style="margin: 0; border: none;">
                  <tr class="border-none" style="border: none;">
                    <td class="py-1 border-none" style="width: 50%; border: none;">
                      <span class="text-gray-400 font-bold block text-[9px] uppercase">PERSONEL ADI SOYADI:</span>
                      <span class="font-black text-gray-900 text-xs">{{ selectedPrintPerson.first_name }} {{ selectedPrintPerson.last_name }}</span>
                    </td>
                    <td class="py-1 border-none" style="width: 50%; border: none;">
                      <span class="text-gray-400 font-bold block text-[9px] uppercase">UNVAN:</span>
                      <span class="font-bold text-gray-800 text-xs">{{ selectedPrintPerson.title || '—' }}</span>
                    </td>
                  </tr>
                  <tr class="border-none" style="border: none;">
                    <td class="py-1 border-none" style="border: none;">
                      <span class="text-gray-400 font-bold block text-[9px] uppercase">ŞİRKET / DEPARTMAN:</span>
                      <span class="font-bold text-gray-800 text-xs">{{ selectedPrintPerson.company_name }} / {{ selectedPrintPerson.department_name || '—' }}</span>
                    </td>
                    <td class="py-1 border-none" style="border: none;">
                      <span class="text-gray-400 font-bold block text-[9px] uppercase">DÜZENLEME TARİHİ:</span>
                      <span class="font-black text-gray-900 text-xs">{{ new Date().toLocaleDateString('tr-TR') }}</span>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Assets Table -->
              <div v-else-if="el.type === 'assets_table'" class="w-full">
                <div class="text-[10px] font-black uppercase text-gray-700 mb-1 tracking-wider">Teslim Edilen Donanım ve Cihaz Listesi:</div>
                <table class="w-full border-collapse border border-gray-400 text-[11px]" style="margin: 0;">
                  <thead>
                    <tr class="bg-gray-100 border-b border-gray-400 text-[9px] uppercase font-bold text-gray-700">
                      <th class="border border-gray-400 px-2 py-1.5 text-center" style="width: 8%;">S.No</th>
                      <th class="border border-gray-400 px-2 py-1.5" style="width: 20%;">Kategori</th>
                      <th class="border border-gray-400 px-2 py-1.5" style="width: 32%;">Marka & Model</th>
                      <th class="border border-gray-400 px-2 py-1.5 font-mono" style="width: 22%;">Seri Numarası</th>
                      <th class="border border-gray-400 px-2 py-1.5 font-mono" style="width: 18%;">Envanter No</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(asset, idx) in (personnelAssets[selectedPrintPerson.id]?.active || [])" :key="asset.id" class="border-b border-gray-300">
                      <td class="border border-gray-300 px-2 py-1.5 text-center font-bold">{{ idx + 1 }}</td>
                      <td class="border border-gray-300 px-2 py-1.5">{{ asset.category_name }}</td>
                      <td class="border border-gray-300 px-2 py-1.5 font-bold">{{ asset.brand_name }} {{ asset.model_name }}</td>
                      <td class="border border-gray-300 px-2 py-1.5 font-mono font-bold">{{ asset.serial_no }}</td>
                      <td class="border border-gray-300 px-2 py-1.5 font-mono">{{ asset.barcode || '—' }}</td>
                    </tr>
                    <tr v-if="(personnelAssets[selectedPrintPerson.id]?.active || []).length === 0">
                      <td colspan="5" class="border border-gray-300 px-2 py-3 text-center text-gray-400 italic">Aktif zimmetli cihaz bulunmuyor.</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Commitment Text -->
              <div v-else-if="el.type === 'commitment_text'" class="border border-gray-300 rounded-lg p-3 bg-gray-50/60 text-[10.5px] leading-relaxed text-gray-700 w-full" style="box-sizing: border-box;">
                <div class="font-bold uppercase text-gray-900 mb-0.5">Taahhütname & Yasal Şartlar:</div>
                <p>{{ el.text || defaultCommitmentText }}</p>
              </div>

              <!-- QR Code Doküman Doğrulama -->
              <div v-else-if="el.type === 'qr_verify'" class="flex items-center gap-3 border border-gray-200 p-2 rounded-lg bg-white w-full" style="box-sizing: border-box;">
                <img :src="'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' + encodeURIComponent(getAuditLink(selectedPrintPerson))" class="w-12 h-12 shrink-0" />
                <div>
                  <div class="font-bold text-[11px] text-gray-900">Mobil Saha Doğrulama</div>
                  <div class="text-[9.5px] text-gray-400">QR kod kamerasından zimmeti onaylamak için taratın</div>
                </div>
              </div>

              <!-- Signatures -->
              <div v-else-if="el.type === 'signatures'" class="grid grid-cols-2 gap-8 text-center pt-2 w-full">
                <div class="border-t-2 border-gray-800 pt-2">
                  <div class="font-bold uppercase text-[10px] text-gray-900">TESLİM EDEN (IT DEPARTMANI)</div>
                  <div class="text-[9px] text-gray-400 mt-0.5">İmza & Tarih</div>
                  <div class="h-12"></div>
                </div>
                <div class="border-t-2 border-gray-800 pt-2">
                  <div class="font-bold uppercase text-[10px] text-gray-900">TESLİM ALAN (PERSONEL)</div>
                  <div class="font-bold text-[11px] text-gray-800 mt-0.5">{{ selectedPrintPerson.first_name }} {{ selectedPrintPerson.last_name }}</div>
                  <div class="text-[9px] text-gray-400">İmza & Tarih</div>
                  <div class="h-12"></div>
                </div>
              </div>

              <!-- Custom Text -->
              <div v-else-if="el.type === 'custom_text'" class="font-medium w-full">
                {{ el.text }}
              </div>

              <!-- Divider -->
              <div v-else-if="el.type === 'divider'" class="w-full border-b border-gray-300 my-1"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- QUICK ASSIGNMENT DIALOG -->
    <dialog ref="quickAssignDialog" class="modal">
      <div class="modal-box w-11/12 max-w-md bg-white p-6 rounded-2xl relative shadow-2xl">
        <h3 class="font-bold text-[16px] text-gray-900 mb-1 flex items-center gap-2">
          <i class="fas fa-user-plus text-blue-600"></i> Hızlı Zimmet Atama
        </h3>
        <p class="text-xs text-gray-400 mb-4">
          <strong>{{ selectedPersonForAssign?.first_name }} {{ selectedPersonForAssign?.last_name }}</strong> personeline depodan cihaz zimmetleyin.
        </p>

        <form @submit.prevent="submitQuickAssign" class="space-y-4">
          <div>
            <label class="form-label font-bold text-gray-700 block mb-1">Depodaki / Boştaki Cihaz Seçin *</label>
            <select v-model="selectedUnassignedAssetId" class="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold" required>
              <option value="">-- Cihaz Seçiniz --</option>
              <option v-for="a in unassignedAssetsList" :key="a.id" :value="a.id">
                [{{ a.category_name }}] {{ a.brand_name }} {{ a.model_name }} (SN: {{ a.serial_no }})
              </option>
            </select>
            <div v-if="unassignedAssetsList.length === 0" class="text-[11px] text-amber-600 font-bold mt-1">
              ⚠️ Depoda boşta zimmetlenebilir cihaz bulunmuyor.
            </div>
          </div>

          <div>
            <label class="form-label font-bold text-gray-700 block mb-1">Zimmet Açıklaması / Not</label>
            <textarea v-model="assignNotes" class="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs" rows="2" placeholder="Örn: Yeni başlangıç bilgisayarı teslimi"></textarea>
          </div>

          <div class="modal-action mt-6 flex justify-end gap-2">
            <button type="button" @click="quickAssignDialog?.close()" class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-lg">İptal</button>
            <button type="submit" :disabled="!selectedUnassignedAssetId" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm disabled:opacity-50">Zimmeti Tamamla</button>
          </div>
        </form>
      </div>
    </dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import axios from 'axios'
import { useAssetStore } from '../../stores/assetStore'
import { useMasterDataStore } from '../../stores/masterData'

const assetStore = useAssetStore()
const masterData = useMasterDataStore()

const loading = ref(false)
const searchQuery = ref('')
const selectedCompanyId = ref('')
const onlyAssignedFilter = ref(true)
const expandedIds = ref(new Set())
const personnelAssets = ref({})
const showPrintModal = ref(false)
const selectedPrintPerson = ref(null)
const formTemplates = ref([])
const activeFormTemplate = ref(null)

const quickAssignDialog = ref(null)
const selectedPersonForAssign = ref(null)
const selectedUnassignedAssetId = ref('')
const assignNotes = ref('')

const unassignedAssetsList = computed(() => {
  return assetStore.assets.filter(a => !a.personnel_id && !a.location_id)
})

const openQuickAssignModal = (person) => {
  selectedPersonForAssign.value = person
  selectedUnassignedAssetId.value = ''
  assignNotes.value = ''
  quickAssignDialog.value?.showModal()
}

const submitQuickAssign = async () => {
  if (!selectedUnassignedAssetId.value || !selectedPersonForAssign.value) return
  try {
    await assetStore.checkoutAsset(selectedUnassignedAssetId.value, {
      target_type: 'PERSONNEL',
      target_id: selectedPersonForAssign.value.id,
      notes: assignNotes.value
    })
    quickAssignDialog.value?.close()
    await loadData()
  } catch (err) {
    alert(err)
  }
}

const handleQuickReturn = async (asset) => {
  const notes = prompt(`"${asset.brand_name} ${asset.model_name}" cihazını depoya iade etmek istediğinize emin misiniz?\nİade Notu (Opsiyonel):`)
  if (notes !== null) {
    try {
      await assetStore.checkinAsset(asset.id, { notes })
      await loadData()
    } catch (err) {
      alert(err)
    }
  }
}

const defaultCommitmentText = `Yukarıda detayları ve seri numaraları belirtilen şirket malı cihaz ve teçhizatı eksiksiz, sağlam ve çalışır vaziyette teslim aldım. Bu cihazları şirket iş süreçleri haricinde kullanmayacağımı, özenle koruyacağımı, işten ayrılma veya zimmet iptali durumunda IT departmanına eksiksiz iade edeceğimi beyan ve taahhüt ederim.`

const printElements = computed(() => {
  if (activeFormTemplate.value && activeFormTemplate.value.elements) {
    const raw = activeFormTemplate.value.elements
    if (Array.isArray(raw)) {
      return {
        pageCount: raw.some(e => e.y >= 100) ? 2 : 1,
        elements: raw
      }
    } else {
      return {
        pageCount: raw.pageCount || 1,
        elements: raw.elements || []
      }
    }
  }
  return {
    pageCount: 1,
    elements: [
      { id: 'el_logo', type: 'company_logo', name: 'Şirket Logosu', x: 5, y: 3, w: 90, fontSize: 12, company_name: 'TALAY LOJİSTİK A.Ş.', sub_title: 'IT BİLİŞİM YÖNETİMİ', logo_url: '' },
      { id: 'el_title', type: 'header_title', name: 'Tutanak Başlığı', x: 5, y: 8, w: 90, fontSize: 16, fontWeight: 'black' },
      { id: 'el_pinfo', type: 'personnel_info', name: 'Personel Bilgileri', x: 5, y: 17, w: 90, fontSize: 11 },
      { id: 'el_assets', type: 'assets_table', name: 'Donanım Listesi Tablosu', x: 5, y: 30, w: 90, fontSize: 11 },
      { id: 'el_commit', type: 'commitment_text', name: 'Yasal Taahhüt Metni', x: 5, y: 58, w: 90, text: defaultCommitmentText, fontSize: 10.5 },
      { id: 'el_qr', type: 'qr_verify', name: 'QR Doküman Doğrulama', x: 5, y: 72, w: 90, fontSize: 11 },
      { id: 'el_sigs', type: 'signatures', name: 'İmza & Tarih Bloğu', x: 5, y: 82, w: 90, fontSize: 11 }
    ]
  }
})

const page1Elements = computed(() => {
  return (printElements.value.elements || []).filter(e => e.y < 100)
})

const page2Elements = computed(() => {
  return (printElements.value.elements || []).filter(e => e.y >= 100)
})

const getAuditLink = (person) => {
  if (!person) return ''
  const assets = personnelAssets.value[person.id]?.active || []
  if (assets.length > 0) {
    return `${window.location.origin}/scan/asset/${assets[0].id}`
  }
  return `${window.location.origin}/scan/asset/0`
}

const fetchFormTemplates = async () => {
  try {
    const res = await axios.get('/api/assets/form-templates')
    formTemplates.value = res.data
    const def = res.data.find(t => t.is_default) || res.data[0]
    if (def) activeFormTemplate.value = def
  } catch (err) {
    console.error('fetchFormTemplates error:', err)
  }
}

const companies = computed(() => masterData.companies)

const fmt = (v) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(v || 0)
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('tr-TR') : '—'

const openPrintModal = (person) => {
  selectedPrintPerson.value = person
  showPrintModal.value = true
}

const openBatchPrintModal = () => {
  const firstPersonWithAssets = filteredPersonnel.value.find(p => personnelAssets.value[p.id]?.active?.length > 0)
  if (firstPersonWithAssets) {
    selectedPrintPerson.value = firstPersonWithAssets
    showPrintModal.value = true
  }
}

const triggerPrint = () => {
  const printArea = document.getElementById('zimmet-print-area')
  if (!printArea) return

  const printWin = window.open('', '_blank', 'width=950,height=800')
  if (!printWin) {
    alert('Popup penceresi açılamadı. Lütfen tarayıcı popup iznini kontrol edin.')
    return
  }

  printWin.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8"/>
      <title>Zimmet Teslim ve Tesellüm Tutanağı - ${selectedPrintPerson.value?.first_name || ''} ${selectedPrintPerson.value?.last_name || ''}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 12px; color: #111827; background: #ffffff; padding: 0; }
        @page { size: A4 portrait; margin: 0; }
        .a4-paper {
          width: 210mm !important;
          height: 297mm !important;
          position: relative !important;
          background: #ffffff !important;
          border: none !important;
          margin: 0 !important;
          padding: 0 !important;
          box-shadow: none !important;
          overflow: hidden !important;
          page-break-after: always !important;
        }
        .absolute { position: absolute; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-bold { font-weight: 700; }
        .font-semibold { font-weight: 600; }
        .font-extrabold { font-weight: 800; }
        .font-black { font-weight: 900; }
        .font-mono { font-family: monospace; }
        .uppercase { text-transform: uppercase; }
        .tracking-wider { letter-spacing: 0.05em; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .bg-gray-50\\/80 { background-color: rgba(249, 250, 251, 0.8) !important; }
        .bg-gray-50\\/60 { background-color: rgba(249, 250, 251, 0.6) !important; }
        .bg-gray-100 { background-color: #f3f4f6 !important; }
        .bg-white { background-color: #ffffff !important; }
        .bg-blue-600 { background-color: #2563eb !important; }
        .text-white { color: #ffffff !important; }
        .text-gray-400 { color: #9ca3af !important; }
        .text-gray-500 { color: #6b7280 !important; }
        .text-gray-700 { color: #374151 !important; }
        .text-gray-900 { color: #111827 !important; }
        .p-3 { padding: 12px !important; }
        .p-2 { padding: 8px !important; }
        .rounded-lg { border-radius: 8px !important; }
        .border { border: 1px solid #e5e7eb !important; }
        .border-gray-200 { border-color: #e5e7eb !important; }
        .border-gray-300 { border-color: #d1d5db !important; }
        .border-gray-400 { border-color: #9ca3af !important; }
        .border-b-2 { border-bottom: 2px solid #111827 !important; }
        .border-b-300 { border-bottom: 1px solid #d1d5db !important; }
        .border-t-2 { border-top: 2px solid #111827 !important; }
        .border-none { border: none !important; }
        .py-1 { padding-top: 4px !important; padding-bottom: 4px !important; }
        .py-1\\.5 { padding-top: 6px !important; padding-bottom: 6px !important; }
        .px-2 { padding-left: 8px !important; padding-right: 8px !important; }
        .px-3 { padding-left: 12px !important; padding-right: 12px !important; }
        .mt-0\\.5 { margin-top: 2px !important; }
        .mb-1 { margin-bottom: 4px !important; }
        .flex { display: flex !important; }
        .items-center { align-items: center !important; }
        .gap-2 { gap: 8px !important; }
        .gap-3 { gap: 12px !important; }
        .shrink-0 { flex-shrink: 0 !important; }
        .w-8 { width: 32px !important; }
        .h-8 { height: 32px !important; }
        .w-12 { width: 48px !important; }
        .h-12 { height: 48px !important; }
        .rounded { border-radius: 4px !important; }
        .rounded-full { border-radius: 9999px !important; }
        .grid { display: grid !important; }
        .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
        .gap-8 { gap: 32px !important; }
        .text-xs { font-size: 12px !important; }
        .text-sm { font-size: 14px !important; }
        .text-base { font-size: 16px !important; }
        .w-full { width: 100% !important; }
        .border-collapse { border-collapse: collapse !important; }
        .leading-relaxed { line-height: 1.625 !important; }
        .my-1 { margin-top: 4px !important; margin-bottom: 4px !important; }
      </style>
    </head>
    <body>
      <div class="a4-paper">${printArea.innerHTML}</div>
    </body>
    </html>
  `)

  printWin.document.close()
  printWin.focus()

  setTimeout(() => {
    printWin.print()
    printWin.close()
  }, 400)
}

const personnelWithAssetsCount = computed(() => {
  return masterData.personnel.filter(p => personnelAssets.value[p.id]?.active?.length > 0).length
})

const filteredPersonnel = computed(() => {
  return masterData.personnel
    .map(p => ({
      ...p,
      company_name: masterData.companies.find(c => c.id === p.company_id)?.name || '',
      department_name: masterData.departments?.find(d => d.id === p.department_id)?.name || ''
    }))
    .filter(p => {
      if (onlyAssignedFilter.value) {
        const pa = personnelAssets.value[p.id]
        if (!pa || !pa.active || pa.active.length === 0) return false
      }
      if (selectedCompanyId.value && p.company_id !== Number(selectedCompanyId.value)) return false
      if (searchQuery.value) {
        const q = searchQuery.value.toLowerCase()
        const name = `${p.first_name} ${p.last_name}`.toLowerCase()
        if (!name.includes(q) && !(p.company_name || '').toLowerCase().includes(q)) return false
      }
      return true
    })
})

const totalAssignedCount = computed(() => {
  return Object.values(personnelAssets.value).reduce((sum, pa) => sum + (pa.active?.length || 0), 0)
})

const toggleExpand = async (personnelId) => {
  if (expandedIds.value.has(personnelId)) {
    expandedIds.value = new Set([...expandedIds.value].filter(id => id !== personnelId))
  } else {
    expandedIds.value = new Set([...expandedIds.value, personnelId])
    if (!personnelAssets.value[personnelId]) {
      await loadPersonnelAssets(personnelId)
    }
  }
}

const loadPersonnelAssets = async (personnelId) => {
  try {
    const data = await assetStore.fetchPersonnelAssets(personnelId)
    const totalValue = (data.active || []).reduce((sum, a) => sum + (a.purchase_price || 0), 0)
    personnelAssets.value = {
      ...personnelAssets.value,
      [personnelId]: { ...data, totalValue }
    }
  } catch (err) {
    console.error('Personnel assets load error:', err)
  }
}

// Ultra-fast in-memory preloading for all personnel (0ms latency!)
const preloadBadges = async () => {
  if (assetStore.assets.length === 0) {
    await assetStore.fetchAssets()
  }

  const map = {}
  assetStore.assets.forEach(a => {
    if (a.personnel_id) {
      if (!map[a.personnel_id]) {
        map[a.personnel_id] = { active: [], history: [], totalValue: 0 }
      }
      map[a.personnel_id].active.push(a)
      map[a.personnel_id].totalValue += (a.purchase_price || 0)
    }
  })

  personnelAssets.value = map
}

onMounted(async () => {
  loading.value = true
  try {
    await Promise.all([
      masterData.fetchPersonnel(),
      masterData.fetchCompanies(),
      masterData.fetchDepartments(),
      assetStore.fetchAssets(),
      fetchFormTemplates()
    ])
    await preloadBadges()
  } finally {
    loading.value = false
  }
})
</script>

