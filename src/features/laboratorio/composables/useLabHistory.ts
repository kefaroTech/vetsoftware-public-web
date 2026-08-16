import { ref } from 'vue'
import { laboratorioInternoApi } from '../api/laboratorioInterno.api'
import type { LaboratoryTestResponse } from '@/features/dashboard/views/consulta/nueva/types/laboratoryTest.types'
import type { LaboratoryTestPriority } from '@/types/domain'

const PAGE_SIZE = 12

export interface HistoryFilters {
  animalId: number | null
  testTypeId: number | null
  prioridad: LaboratoryTestPriority | null
  dateFrom: string | null
  dateTo: string | null
}

function emptyFilters(): HistoryFilters {
  return { animalId: null, testTypeId: null, prioridad: null, dateFrom: null, dateTo: null }
}

/** Histórico de validados (COMPLETED) con filtros + paginación server-side. */
export function useLabHistory() {
  const items = ref<LaboratoryTestResponse[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const filters = ref<HistoryFilters>(emptyFilters())

  const page = ref(1) // 1-based para el componente Pagination
  const totalElements = ref(0)
  const totalPages = ref(0)
  const pageSize = ref(PAGE_SIZE)

  async function fetch() {
    loading.value = true
    error.value = null
    try {
      const res = await laboratorioInternoApi.search({
        statuses: ['COMPLETED'],
        animalId: filters.value.animalId,
        testTypeId: filters.value.testTypeId,
        prioridad: filters.value.prioridad,
        dateFrom: filters.value.dateFrom,
        dateTo: filters.value.dateTo,
        page: page.value - 1, // backend es 0-based
        pageSize: pageSize.value,
      })
      items.value = res.content
      totalElements.value = res.totalElements
      totalPages.value = res.totalPages
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'No se pudo cargar el histórico'
    } finally {
      loading.value = false
    }
  }

  function setPage(p: number) {
    page.value = p
    fetch()
  }

  function applyFilters(next: HistoryFilters) {
    filters.value = { ...next }
    page.value = 1
    fetch()
  }

  function clearFilters() {
    filters.value = emptyFilters()
    page.value = 1
    fetch()
  }

  return {
    items,
    loading,
    error,
    filters,
    page,
    totalElements,
    totalPages,
    pageSize,
    fetch,
    setPage,
    applyFilters,
    clearFilters,
  }
}
