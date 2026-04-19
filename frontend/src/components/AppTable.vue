<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useTableFilter, EMPTY, normalize } from '../composables/useTableFilter'

// ── Props ─────────────────────────────────────────────────────────────────────
const props = defineProps({
  /**
   * Kolon tanımları:
   * { key, label, sortable?, filterable?, width?, align?, nowrap? }
   */
  columns: { type: Array, required: true },

  /** Ham satır verisi */
  rows: { type: Array, default: () => [] },

  /** Yüklenme göstergesi */
  loading: { type: Boolean, default: false },

  /** Checkbox sütunu */
  selectable: { type: Boolean, default: false },

  /** Geçmiş/Düzenle/Sil butonları */
  actions: { type: Boolean, default: true },

  /**
   * Üst bar hızlı filtreler:
   * [{ key, label, options: string[] | { value, label }[] }]
   * options boş bırakılırsa veriden otomatik türetilir.
   */
  quickFilters: { type: Array, default: () => [] },

  /** Sayfa başına satır sayısı */
  perPage: { type: Number, default: 25 },

  /** Boş durum metni */
  emptyText: { type: String, default: 'Sonuç bulunamadı' },
})

const emit = defineEmits(['row-history', 'row-edit', 'row-delete', 'selection-change', 'bulk-export'])

// ── Filter / Sort / Pagination ────────────────────────────────────────────────
const rawRows = computed(() => props.rows)

const {
  globalSearch,
  colFilters,
  quickValues,
  sortKey,
  sortDir,
  currentPage,
  perPage: itemsPerPage,
  totalCount,
  totalPages,
  pageRows,
  hasAnyFilter,
  uniqueVals,
  setSort,
  setColFilter,
  removeColFilter,
  clearAll,
} = useTableFilter(rawRows, { perPage: props.perPage })
 
 // ── Hızlı filtreleri başlat ────────────
 watch(() => props.quickFilters, (filters) => {
   filters.forEach(f => {
     if (quickValues.value[f.key] === undefined) {
       quickValues.value[f.key] = ''
     }
   })
 }, { immediate: true })

// ── Aktif kolon filtre etiketleri ────────────────────────────────────────────
const activeColFilters = computed(() =>
  Object.entries(colFilters.value).map(([key, set]) => {
    const col  = props.columns.find(c => c.key === key)
    const vals = [...set]
    return { key, label: col?.label || key, vals }
  })
)

// ── Sayfalama bilgisi ─────────────────────────────────────────────────────────
const pageFrom = computed(() =>
  totalCount.value === 0 ? 0 : (currentPage.value - 1) * props.perPage + 1
)
const pageTo = computed(() =>
  Math.min(currentPage.value * props.perPage, totalCount.value)
)

// ── Seçim ─────────────────────────────────────────────────────────────────────
const selectedKeys = ref(new Set())

function rowKey(r) {
  return r.id ?? r._id ?? JSON.stringify(r)
}

const allSelected = computed(() =>
  pageRows.value.length > 0 &&
  pageRows.value.every(r => selectedKeys.value.has(rowKey(r)))
)
const someSelected = computed(() =>
  pageRows.value.some(r => selectedKeys.value.has(rowKey(r))) && !allSelected.value
)

const selectAllEl = ref(null)
watch(someSelected, v => { if (selectAllEl.value) selectAllEl.value.indeterminate = v }, { immediate: true })

function toggleAll(checked) {
  pageRows.value.forEach(r =>
    checked ? selectedKeys.value.add(rowKey(r)) : selectedKeys.value.delete(rowKey(r))
  )
  emitSelection()
}

function toggleRow(r, checked) {
  checked ? selectedKeys.value.add(rowKey(r)) : selectedKeys.value.delete(rowKey(r))
  emitSelection()
}

function emitSelection() {
  emit('selection-change', props.rows.filter(r => selectedKeys.value.has(rowKey(r))))
}

function bulkExport() {
  const selectedRows = props.rows.filter(r => selectedKeys.value.has(rowKey(r)))
  emit('bulk-export', selectedRows)
}

// ── colspan ───────────────────────────────────────────────────────────────────
const colSpan = computed(() => {
  let n = props.columns.length
  if (props.selectable) n++
  if (props.actions) n++
  return n
})

// ── Hızlı filtre yardımcıları ────────────────────────────────────────────────
function qfOptions(qf) {
  if (!qf.options?.length)
    return [...new Set(props.rows.map(r => r[qf.key]).filter(v => v != null && v !== ''))].sort()
  return qf.options
}
function qfVal(opt)   { return typeof opt === 'object' ? opt.value : opt }
function qfLabel(opt) { return typeof opt === 'object' ? opt.label : opt }

// ── Filtre paneli ─────────────────────────────────────────────────────────────
const openPanelKey     = ref(null)
const panelPos         = ref({ top: 0, left: 0 })
const panelSearch      = ref('')
const pendingSet       = ref(new Set())
const panelAllVals     = ref([])
const panelListVals    = ref([])
const panelHasEmpty    = ref(false)
const panelEmptyChk    = ref(false)

const filteredPanelVals = computed(() => {
  const q = panelSearch.value.toLowerCase()
  return q
    ? panelListVals.value.filter(v => v.toLowerCase().includes(q))
    : panelListVals.value
})

const panelCheckedAll   = computed(() => pendingSet.value.size === panelAllVals.value.length)
const panelIndeterminate = computed(() =>
  pendingSet.value.size > 0 && pendingSet.value.size < panelAllVals.value.length
)

const panelAllEl = ref(null)
watch(panelIndeterminate, v => {
  if (panelAllEl.value) panelAllEl.value.indeterminate = v
}, { immediate: true })

function openPanel(key, triggerEl) {
  openPanelKey.value = key
  panelSearch.value  = ''

  const all   = uniqueVals(key)
  const empty = all.filter(v => v === EMPTY)
  const list  = all.filter(v => v !== EMPTY)

  panelAllVals.value  = all
  panelListVals.value = list
  panelHasEmpty.value = empty.length > 0

  const cur = colFilters.value[key] || new Set(all)
  pendingSet.value  = new Set(cur)
  panelEmptyChk.value = empty.length > 0 && empty.every(v => cur.has(v))

  nextTick(() => {
    const rect = triggerEl.getBoundingClientRect()
    let left = rect.left + window.scrollX
    if (left + 240 > window.innerWidth) left = window.innerWidth - 248
    panelPos.value = { top: rect.bottom + window.scrollY + 4, left: Math.max(4, left) }
  })
}

function closePanel() { openPanelKey.value = null }

function toggleFilterBtn(key, el) {
  openPanelKey.value === key ? closePanel() : openPanel(key, el)
}

function outsideClick(e) {
  if (!openPanelKey.value) return
  const panel = document.getElementById('at-filter-panel')
  if (panel?.contains(e.target)) return
  if (e.target.closest('.at-fil-btn')) return
  closePanel()
}

onMounted(()  => document.addEventListener('click', outsideClick, true))
onUnmounted(() => document.removeEventListener('click', outsideClick, true))

function togglePanelVal(v, checked) {
  const s = new Set(pendingSet.value)
  checked ? s.add(v) : s.delete(v)
  pendingSet.value = s
  if (v === EMPTY) panelEmptyChk.value = checked
}

function togglePanelEmpty(checked) {
  const s = new Set(pendingSet.value)
  checked ? s.add(EMPTY) : s.delete(EMPTY)
  pendingSet.value    = s
  panelEmptyChk.value = checked
}

function togglePanelAll(checked) {
  pendingSet.value = checked ? new Set(panelAllVals.value) : new Set()
  panelEmptyChk.value = checked && panelHasEmpty.value
}

function applyPanel() {
  setColFilter(openPanelKey.value, pendingSet.value)
  closePanel()
}

function resetPanel() {
  removeColFilter(openPanelKey.value)
  closePanel()
}
</script>

<template>
  <div class="at-root">

    <!-- ── Tablo kartı (toolbar içeride) ─────────────────────────────────── -->
    <div class="at-card">

      <!-- Toolbar (kart başlığı) -->
      <div class="at-toolbar">
        <!-- Global arama -->
        <div class="at-search-wrap">
          <i class="fas fa-search at-search-icon"></i>
          <input
            v-model="globalSearch"
            type="text"
            placeholder="Tüm sütunlarda ara…"
            class="at-search-input"
          >
        </div>

        <!-- Hızlı filtreler -->
        <select
          v-for="qf in quickFilters"
          :key="qf.key"
          v-model="quickValues[qf.key]"
          :title="qf.label"
          class="at-qs"
          @change="currentPage = 1"
        >
          <option value="" selected>{{ qf.label }}</option>
          <option
            v-for="opt in qfOptions(qf)"
            :key="qfVal(opt)"
            :value="qfVal(opt)"
          >{{ qfLabel(opt) }}</option>
        </select>

        <!-- Temizle -->
        <button
          v-if="hasAnyFilter"
          type="button"
          class="at-clear-btn"
          @click="clearAll"
        >
          <i class="fas fa-times mr-1"></i>Temizle
        </button>

        <!-- Ekstra toolbar içeriği (slot) -->
        <slot name="toolbar" />

        <!-- Aktif kolon filtre etiketleri -->
        <div v-if="activeColFilters.length" class="at-active-tags">
          <span
            v-for="f in activeColFilters"
            :key="f.key"
            class="at-tag"
          >
            {{ f.label }}:
            {{ f.vals.slice(0, 2).join(', ') }}{{ f.vals.length > 2 ? ` +${f.vals.length - 2}` : '' }}
            <button
              type="button"
              class="at-tag-rm"
              :title="`${f.label} filtresini kaldır`"
              @click="removeColFilter(f.key)"
            ><i class="fas fa-times" style="font-size:8px"></i></button>
          </span>
        </div>

      </div>


      <div class="at-table-wrap">
        <table class="at-table">

          <!-- Başlık satırı -->
          <thead>
            <tr class="at-thead-row">
              <!-- Checkbox -->
              <th v-if="selectable" class="at-th at-th-check" scope="col" aria-label="Tümünü seç">
                <input
                  ref="selectAllEl"
                  type="checkbox"
                  class="accent-blue-600"
                  :checked="allSelected"
                  title="Tümünü seç"
                  @change="e => toggleAll(e.target.checked)"
                >
              </th>

              <!-- Veri sütunları -->
              <th
                v-for="col in columns"
                :key="col.key"
                class="at-th"
                :class="{
                  'at-th-sortable': col.sortable !== false,
                  'asc':  sortKey === col.key && sortDir === 'asc',
                  'desc': sortKey === col.key && sortDir === 'desc',
                }"
                :style="col.width ? `width:${col.width}` : ''"
                scope="col"
              >
                <div class="at-th-inner" :class="col.align === 'right' ? 'justify-end' : ''">
                  <!-- Filtre butonu — SOLDA -->
                  <span
                    v-if="col.filterable !== false"
                    class="at-fil-btn"
                    :class="{ active: !!colFilters[col.key] }"
                    :title="`${col.label} filtrele`"
                    @click.stop="toggleFilterBtn(col.key, $event.currentTarget)"
                  ><i class="fas fa-filter" style="font-size:9px"></i></span>

                  <!-- Etiket + sıralama oku -->
                  <span
                    class="at-sort-trigger"
                    :class="{ 'cursor-pointer': col.sortable !== false }"
                    @click="col.sortable !== false && setSort(col.key)"
                  >
                    {{ col.label }}
                    <span v-if="col.sortable !== false" class="at-sort-icon">
                      <i class="fas fa-caret-up ic-asc"></i>
                      <i class="fas fa-caret-down ic-desc"></i>
                    </span>
                  </span>
                </div>
              </th>

              <!-- Aksiyon sütunu -->
              <th
                v-if="actions"
                class="at-th"
                style="width:90px"
                scope="col"
                aria-label="İşlemler"
              ></th>
            </tr>
          </thead>

          <!-- Gövde -->
          <tbody class="at-tbody">
            <!-- Yükleniyor -->
            <tr v-if="loading">
              <td :colspan="colSpan" class="at-empty-cell">
                <i class="fas fa-spinner fa-spin mr-2"></i>Yükleniyor…
              </td>
            </tr>

            <!-- Boş -->
            <tr v-else-if="pageRows.length === 0">
              <td :colspan="colSpan" class="at-empty-cell">
                <i class="fas fa-inbox mr-2"></i>{{ emptyText }}
              </td>
            </tr>

            <!-- Satırlar -->
            <tr
              v-else
              v-for="row in pageRows"
              :key="rowKey(row)"
              class="at-row"
            >
              <td v-if="selectable" class="at-td at-td-check">
                <input
                  type="checkbox"
                  class="accent-blue-600"
                  :checked="selectedKeys.has(rowKey(row))"
                  @change="e => toggleRow(row, e.target.checked)"
                >
              </td>

              <td
                v-for="col in columns"
                :key="col.key"
                class="at-td"
                :class="{
                  'whitespace-nowrap': col.nowrap !== false,
                  'text-right': col.align === 'right',
                }"
              >
                <!-- Özel hücre slot'u: #cell-{key}="{ row, value }" -->
                <slot :name="`cell-${col.key}`" :row="row" :value="row[col.key]">
                  {{ row[col.key] ?? '—' }}
                </slot>
              </td>

              <!-- Aksiyon butonları -->
              <td v-if="actions" class="at-td at-td-actions">
                <slot name="actions" :row="row">
                  <div class="at-row-actions">
                    <button
                      type="button"
                      class="at-row-btn"
                      title="Geçmişi Göster"
                      @click="emit('row-history', row)"
                    ><i class="fas fa-clock-rotate-left"></i></button>
                    <button
                      type="button"
                      class="at-row-btn"
                      title="Düzenle"
                      @click="emit('row-edit', row)"
                    ><i class="fas fa-pen"></i></button>
                    <button
                      type="button"
                      class="at-row-btn at-row-btn-del"
                      title="Sil"
                      @click="emit('row-delete', row)"
                    ><i class="fas fa-trash"></i></button>
                  </div>
                </slot>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- ── Sayfalama ──────────────────────────────────────────────────────── -->
      <div class="at-pagination">
        <div class="at-page-info flex items-center gap-4">
          <div class="flex items-center gap-2 border-r border-gray-200 pr-4 mr-2">
            <span class="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Göster:</span>
            <select v-model="itemsPerPage" class="bg-transparent text-[12px] font-bold text-gray-700 outline-none cursor-pointer">
              <option :value="10">10</option>
              <option :value="25">25</option>
              <option :value="50">50</option>
              <option :value="100">100</option>
              <option :value="200">200</option>
              <option :value="500">500</option>
              <option :value="999999">Tümü</option>
            </select>
          </div>
          Sayfa {{ pageFrom }}–{{ pageTo }} / {{ totalCount }} sonuç
        </div>
        <div class="at-page-btns">
          <button
            type="button"
            class="at-page-btn"
            title="Önceki sayfa"
            :disabled="currentPage <= 1"
            @click="currentPage--"
          ><i class="fas fa-angle-left"></i></button>
          <span class="at-page-display">{{ currentPage }} / {{ totalPages }}</span>
          <button
            type="button"
            class="at-page-btn"
            title="Sonraki sayfa"
            :disabled="currentPage >= totalPages"
            @click="currentPage++"
          ><i class="fas fa-angle-right"></i></button>
        </div>
      </div>
    </div>

    <!-- ── Filtre paneli (body'e teleport) ────────────────────────────────── -->
    <Teleport to="body">
      <div
        v-if="openPanelKey"
        id="at-filter-panel"
        :style="{ top: panelPos.top + 'px', left: panelPos.left + 'px' }"
      >
        <!-- Arama -->
        <input
          v-model="panelSearch"
          type="text"
          class="at-panel-search"
          placeholder="Değer ara…"
        >

        <!-- Tümünü Seç -->
        <div class="at-panel-all-row">
          <label>
            <input
              ref="panelAllEl"
              type="checkbox"
              class="accent-blue-600"
              :checked="panelCheckedAll"
              @change="e => togglePanelAll(e.target.checked)"
            >
            Tümünü Seç
          </label>
        </div>

        <!-- (Boş) satırı — sadece boş değer varsa görünür -->
        <div v-if="panelHasEmpty" class="at-panel-empty-row">
          <label>
            <input
              type="checkbox"
              class="accent-blue-600"
              :checked="panelEmptyChk"
              @change="e => togglePanelEmpty(e.target.checked)"
            >
            <span><i class="fas fa-minus-circle at-panel-empty-icon"></i>(Boş)</span>
          </label>
        </div>

        <!-- Değer listesi -->
        <div class="at-panel-list">
          <label v-for="v in filteredPanelVals" :key="v">
            <input
              type="checkbox"
              class="accent-blue-600"
              :checked="pendingSet.has(v)"
              @change="e => togglePanelVal(v, e.target.checked)"
            >
            <span class="truncate">{{ v }}</span>
          </label>
          <div v-if="filteredPanelVals.length === 0" class="at-panel-no-result">
            Sonuç yok
          </div>
        </div>

        <!-- Footer -->
        <div class="at-panel-footer">
          <button type="button" class="at-panel-reset" @click="resetPanel">Sıfırla</button>
          <button type="button" class="at-panel-apply" @click="applyPanel">Uygula</button>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<style>
/* ── Filtre paneli (teleport → body, scoped değil) ─────────────────────────── */
#at-filter-panel {
  position: fixed;
  z-index: 9999;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,.13);
  min-width: 210px;
  max-width: 260px;
  font-family: 'Inter', sans-serif;
}
.at-panel-search {
  width: 100%; border: none; border-bottom: 1px solid #f0f0f0;
  padding: 8px 12px; font-size: 12px; outline: none;
  border-radius: 8px 8px 0 0; color: #1f2328; font-family: inherit;
}
.at-panel-search:focus { border-bottom-color: #3b82f6; }
.at-panel-all-row { padding: 6px 12px; border-bottom: 1px solid #f0f0f0; }
.at-panel-all-row label {
  display: flex; align-items: center; gap: 8px;
  font-size: 12px; font-weight: 600; color: #374151; cursor: pointer;
}
.at-panel-empty-row {
  padding: 5px 12px; border-bottom: 1px solid #f0f0f0; background: #fafafa;
}
.at-panel-empty-row label {
  display: flex; align-items: center; gap: 8px;
  font-size: 12px; color: #6b7280; cursor: pointer; font-style: italic;
}
.at-panel-empty-icon { font-size: 9px; margin-right: 4px; opacity: .4; }
.at-panel-list { max-height: 210px; overflow-y: auto; padding: 4px 0; }
.at-panel-list label {
  display: flex; align-items: center; gap: 8px;
  padding: 5px 12px; font-size: 12.5px; color: #374151; cursor: pointer;
}
.at-panel-list label:hover { background: #f9fafb; }
.at-panel-no-result { padding: 8px 12px; font-size: 12px; color: #9ca3af; text-align: center; }
.at-panel-footer {
  display: flex; justify-content: flex-end; gap: 6px;
  padding: 8px 12px; border-top: 1px solid #f0f0f0;
}
.at-panel-footer button {
  font-size: 12px; padding: 4px 14px; border-radius: 6px;
  border: 1px solid #e5e7eb; cursor: pointer; font-family: inherit;
}
.at-panel-reset { background: #fff; color: #6b7280; }
.at-panel-reset:hover { background: #f3f4f6; }
.at-panel-apply { background: #2563eb; color: #fff; border-color: #2563eb; }
.at-panel-apply:hover { background: #1d4ed8; }
</style>

<style scoped>
/* ── Root ────────────────────────────────────────────────────────────────────── */
.at-root { display: flex; flex-direction: column; gap: 0; width: 100%; height: 100%; }

/* ── Toolbar ─────────────────────────────────────────────────────────────────── */
.at-toolbar {
  display: flex; flex-wrap: wrap; align-items: center; gap: 8px;
  padding: 10px 16px; border-bottom: 1px solid #f3f4f6; background: #fff;
}
.at-search-wrap { position: relative; }
.at-search-icon {
  position: absolute; left: 10px; top: 50%; transform: translateY(-50%);
  color: #9ca3af; font-size: 11px; pointer-events: none;
}
.at-search-input {
  padding: 6px 10px 6px 30px; font-size: 12.5px;
  border: 1px solid #e5e7eb; border-radius: 0; background: #fff;
  outline: none; width: 220px; color: #1f2328; font-family: inherit;
}
.at-search-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,.15); }

.at-qs {
  font-size: 12.5px; border: 1px solid #e5e7eb; border-radius: 0;
  background: #fff; padding: 5px 10px; color: #374151;
  outline: none; cursor: pointer; font-family: inherit;
  min-width: 140px;
}
.at-qs:focus { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,.15); }

.at-clear-btn {
  font-size: 12px; color: #6b7280; padding: 5px 12px;
  border: 1px solid #e5e7eb; border-radius: 8px; background: #fff;
  cursor: pointer; font-family: inherit;
}
.at-clear-btn:hover { background: #f3f4f6; color: #374151; }

.at-active-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.at-tag {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600;
  background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe;
}
.at-tag-rm {
  background: none; border: none; cursor: pointer;
  color: #93c5fd; padding: 0; line-height: 1;
}
.at-tag-rm:hover { color: #1d4ed8; }

.at-count { margin-left: auto; font-size: 12px; color: #9ca3af; font-weight: 500; white-space: nowrap; }

/* ── Kart & tablo ────────────────────────────────────────────────────────────── */
.at-card {
  background: #fff; border: 1px solid #e5e7eb;
  border-radius: 0; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.06);
  display: flex; flex-direction: column; flex: 1; min-height: 0;
}
.at-table-wrap { overflow-x: auto; overflow-y: auto; flex: 1; }
.at-table { width: 100%; text-align: left; border-collapse: collapse; min-width: 600px; }

/* Başlık */
.at-thead-row {
  font-size: 11px; color: #6b7280; text-transform: uppercase;
  letter-spacing: .05em; border-bottom: 1px solid #f3f4f6;
  background: rgba(249,250,251,.6); font-weight: 600;
}
.at-th {
  padding: 10px 12px; white-space: nowrap;
  -webkit-user-select: none; user-select: none;
}
.at-th-check { width: 40px; text-align: center; }
.at-th-sortable:hover { background: #f1f5f9; }
.at-th-inner { display: flex; align-items: center; gap: 4px; }

/* Filtre butonu */
.at-fil-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 18px; height: 18px; border-radius: 4px; cursor: pointer;
  color: #9ca3af; flex-shrink: 0; transition: background .12s, color .12s;
}
.at-fil-btn:hover { background: #e5e7eb; color: #374151; }
.at-fil-btn.active { color: #2563eb; background: #dbeafe; }

/* Sıralama oku */
.at-sort-trigger { display: inline-flex; align-items: center; gap: 3px; }
.at-sort-icon {
  display: inline-flex; flex-direction: column;
  line-height: 1; font-size: 8px; opacity: .3; transition: opacity .15s;
}
.at-th-sortable:hover .at-sort-icon { opacity: 1; }
.at-th.asc .at-sort-icon, .at-th.desc .at-sort-icon { opacity: 1; }
.at-th.asc  .ic-asc  { color: #3b82f6; }
.at-th.desc .ic-desc { color: #3b82f6; }

/* Gövde */
.at-tbody { font-size: 12.5px; }
.at-tbody > tr + tr { border-top: 1px solid #f3f4f6; }
.at-row:hover { background: #f9fafb; }
.at-td { padding: 8px 12px; }
.at-td-check { width: 40px; text-align: center; }
.at-td-actions { width: 90px; }
.at-empty-cell {
  padding: 40px 16px; text-align: center;
  color: #9ca3af; font-size: 13px;
}

/* Aksiyon butonları */
.at-row-actions { display: flex; align-items: center; justify-content: flex-end; gap: 2px; }
.at-row-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 22px; height: 22px; border-radius: 5px; border: none;
  cursor: pointer; font-size: 10px; color: #9ca3af;
  background: transparent; transition: background .12s, color .12s;
}
.at-row-btn:hover { background: #e5e7eb; color: #374151; }
.at-row-btn-del:hover { background: #fee2e2; color: #b91c1c; }

/* Sayfalama */
.at-pagination {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 16px; border-top: 1px solid #f3f4f6;
  background: rgba(249,250,251,.4);
}
.at-page-info { font-size: 12px; color: #6b7280; font-weight: 500; }
.at-page-btns { display: flex; align-items: center; gap: 8px; }
.at-page-btn {
  width: 32px; height: 32px; border-radius: 6px;
  border: 1px solid #e5e7eb; background: #fff;
  color: #6b7280; cursor: pointer; font-size: 13px;
  display: inline-flex; align-items: center; justify-content: center;
}
.at-page-btn:hover:not(:disabled) { background: #f9fafb; }
.at-page-btn:disabled { opacity: .35; cursor: not-allowed; }
.at-page-display { font-size: 12px; font-weight: 700; color: #111827; padding: 0 4px; }
</style>
