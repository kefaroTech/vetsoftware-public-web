import { computed, ref, watch, type Ref } from 'vue'
import { useInfiniteList } from '@/composables/useInfiniteList'
import { emptyPage } from '@/types/pagination'
import { clinicalHistoryApi } from '../api/clinicalHistory.api'
import type { ClinicalEventTypeCount } from '../types/clinicalHistory.types'
import type { ClinicalEvent, ClinicalEventResponse, ClinicalEventType } from '../types/historia'

function toEvent(r: ClinicalEventResponse): ClinicalEvent {
  return {
    sourceId: r.sourceId,
    animalId: r.animalId,
    eventType: r.eventType,
    eventDate: r.eventDate,
    endDate: r.endDate,
    consultationId: r.consultationId,
    summary: r.summary ?? '',
  }
}

/**
 * Historia clínica de una mascota con scroll infinito (BE-06).
 *
 * <p>Antes se traía la historia entera y se cacheaba por animal; el chip de tipo y el buscador
 * filtraban ese array. Ahora los tres criterios —tipo, texto y página— los resuelve el servidor:
 * filtrar en cliente sobre una lista paginada solo vería lo ya scrolleado, que en una historia
 * clínica significa esconder eventos sin decirlo.
 *
 * <p>Los contadores de los chips llegan aparte (`/summary`) porque cuentan sobre TODA la
 * historia, no sobre la página cargada.
 */
export function useClinicalHistory(
  petId: Ref<string | null>,
  filters: { type: Ref<ClinicalEventType | 'ALL'>; search: Ref<string> },
) {
  const animalId = computed(() => {
    const n = petId.value ? Number(petId.value) : NaN
    return Number.isFinite(n) ? n : null
  })

  const list = useInfiniteList<ClinicalEvent>(async (page, pageSize, signal) => {
    const id = animalId.value
    if (id == null) return emptyPage<ClinicalEvent>(pageSize)
    const result = await clinicalHistoryApi.findByAnimal(
      id,
      {
        types: filters.type.value !== 'ALL' ? [filters.type.value] : undefined,
        q: filters.search.value,
      },
      page,
      pageSize,
      signal,
    )
    return { ...result, content: result.content.map(toEvent) }
  })

  const typeCounts = ref<ClinicalEventTypeCount[]>([])
  const totalEvents = computed(() => typeCounts.value.reduce((sum, r) => sum + r.count, 0))

  async function loadCounts() {
    const id = animalId.value
    if (id == null) {
      typeCounts.value = []
      return
    }
    try {
      typeCounts.value = await clinicalHistoryApi.summary(id)
    } catch {
      // Los chips se quedan sin contador; la lista sigue siendo utilizable.
      typeCounts.value = []
    }
  }

  // Cambiar de mascota es otra historia: se descarta lo acumulado y se recuentan los chips.
  watch(
    animalId,
    () => {
      void list.reload()
      void loadCounts()
    },
    { immediate: true },
  )

  // El chip de tipo es un filtro del servidor. El buscador se debouncea: sin ello iría una
  // consulta por tecla.
  watch(filters.type, () => void list.reload())
  let timer: ReturnType<typeof setTimeout> | null = null
  watch(filters.search, () => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => void list.reload(), 300)
  })

  /** Recarga la página actual desde cero (tras registrar un evento nuevo, por ejemplo). */
  async function refresh() {
    await Promise.all([list.reload(), loadCounts()])
  }

  return {
    events: list.items,
    loading: list.loading,
    error: list.error,
    isEmpty: list.isEmpty,
    observe: list.observe,
    typeCounts,
    totalEvents,
    refresh,
  }
}

/**
 * Procedimientos derivados de una consulta. Se piden al servidor y no se buscan en la lista
 * cargada: con paginación, los hijos de una consulta antigua pueden estar en otra página.
 */
export async function fetchConsultationChildren(
  animalId: number,
  consultationId: number,
): Promise<ClinicalEvent[]> {
  const { content } = await clinicalHistoryApi.findByAnimal(
    animalId,
    { consultationId },
    0,
    // Los procedimientos de una sola consulta son pocos; una página basta.
    100,
  )
  return content.map(toEvent).filter((e) => e.eventType !== 'CONSULTATION')
}
