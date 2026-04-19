import { ref, computed, watch, toValue } from 'vue'

export const EMPTY = '—'

export function normalize(v) {
  return (v === null || v === undefined || v === '' || v === '—')
    ? EMPTY
    : String(v)
}

/**
 * @param {import('vue').Ref<object[]> | import('vue').ComputedRef<object[]>} rawRowsRef
 * @param {{ perPage?: number }} options
 */
export function useTableFilter(rawRowsRef, { perPage: defaultPerPage = 25 } = {}) {
  const globalSearch = ref('')
  const colFilters   = ref({})  // { [key]: Set<string> }
  const quickValues  = ref({})  // { [key]: string }
  const sortKey      = ref(null)
  const sortDir      = ref('asc')
  const currentPage  = ref(1)
  const perPage      = ref(defaultPerPage)

  // Tüm unique değerler — boş değerler her zaman en üstte
  function uniqueVals(key) {
    const rows = toValue(rawRowsRef)
    const all  = [...new Set(rows.map(r => normalize(r[key])))]
    const hasEmpty = all.includes(EMPTY)
    const rest = all.filter(v => v !== EMPTY).sort((a, b) => a.localeCompare(b, 'tr'))
    return hasEmpty ? [EMPTY, ...rest] : rest
  }

  const filteredSorted = computed(() => {
    const q    = globalSearch.value.toLowerCase().trim()
    const rows = toValue(rawRowsRef)

    let data = rows.filter(r => {
      // Global arama
      if (q) {
        const hay = Object.values(r).map(v => String(v ?? '')).join(' ').toLowerCase()
        if (!hay.includes(q)) return false
      }
      // Hızlı filtreler
      for (const [key, val] of Object.entries(quickValues.value)) {
        if (val && normalize(r[key]) !== val) return false
      }
      // Kolon filtreleri
      for (const [key, allowed] of Object.entries(colFilters.value)) {
        if (!allowed.has(normalize(r[key]))) return false
      }
      return true
    })

    // Sıralama
    if (sortKey.value) {
      const key = sortKey.value
      data = [...data].sort((a, b) => {
        const va = a[key], vb = b[key]
        if (typeof va === 'number' && typeof vb === 'number')
          return sortDir.value === 'asc' ? va - vb : vb - va
        return sortDir.value === 'asc'
          ? normalize(va).localeCompare(normalize(vb), 'tr')
          : normalize(vb).localeCompare(normalize(va), 'tr')
      })
    }
    return data
  })

  const totalCount = computed(() => filteredSorted.value.length)
  const totalPages = computed(() => Math.max(1, Math.ceil(totalCount.value / perPage.value)))

  watch(totalPages, p => { if (currentPage.value > p) currentPage.value = p })

  const pageRows = computed(() => {
    const start = (currentPage.value - 1) * perPage.value
    return filteredSorted.value.slice(start, start + perPage.value)
  })

  function setSort(key) {
    if (sortKey.value === key) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
    else { sortKey.value = key; sortDir.value = 'asc' }
    currentPage.value = 1
  }

  function setColFilter(key, set) {
    const f = { ...colFilters.value }
    const all = uniqueVals(key)
    if (!set || set.size === 0 || set.size >= all.length) delete f[key]
    else f[key] = new Set(set)
    colFilters.value = f
    currentPage.value = 1
  }

  function removeColFilter(key) {
    const f = { ...colFilters.value }
    delete f[key]
    colFilters.value = f
    currentPage.value = 1
  }

  function clearAll() {
    globalSearch.value = ''
    quickValues.value  = {}
    colFilters.value   = {}
    currentPage.value  = 1
  }

  const hasAnyFilter = computed(() =>
    !!globalSearch.value ||
    Object.keys(colFilters.value).length > 0 ||
    Object.values(quickValues.value).some(Boolean)
  )

  return {
    EMPTY,
    normalize,
    globalSearch,
    colFilters,
    quickValues,
    sortKey,
    sortDir,
    currentPage,
    perPage,
    totalCount,
    totalPages,
    filteredSorted,
    pageRows,
    hasAnyFilter,
    uniqueVals,
    setSort,
    setColFilter,
    removeColFilter,
    clearAll,
  }
}
