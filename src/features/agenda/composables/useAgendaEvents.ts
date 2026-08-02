import { ref, watch, type Ref } from 'vue'
import { agendaApi } from '../api/agenda.api'
import type { AgendaEvent } from '../types/agenda'
import { EVENT_TYPES } from '@/features/historia-clinica/constants/eventTypes'
import type { ClinicalEventResponse } from '@/features/historia-clinica/types/historia'
import { addDays, isoFromDate, startOfMonth, startOfWeek } from './dateUtils'
import { getProblemDetailMessage } from '@/services/http/http.client'

/**
 * Fetch + memoize de eventos para la agenda. Calcula un rango que cubre el
 * grid mensual completo (6 semanas) y refetcha cuando el cursor cambia de mes.
 */
export function useAgendaEvents(cursor: Ref<Date>) {
  const events = ref<AgendaEvent[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  let cachedRangeKey: string | null = null

  function computeRange(d: Date): { from: string; to: string; key: string } {
    const gridStart = startOfWeek(startOfMonth(d))
    const gridEnd = addDays(gridStart, 41) // 6 semanas × 7 - 1
    const from = isoFromDate(gridStart)
    const to = isoFromDate(gridEnd)
    return { from, to, key: `${from}|${to}` }
  }

  async function fetchForCursor(d: Date): Promise<void> {
    const range = computeRange(d)
    if (range.key === cachedRangeKey) return
    cachedRangeKey = range.key
    loading.value = true
    error.value = null
    try {
      const raw = await agendaApi.listInRange({ from: range.from, to: range.to })
      events.value = raw.map(mapToAgendaEvent)
    } catch (e) {
      error.value = getProblemDetailMessage(e, 'No se pudieron cargar los eventos de la agenda')
      events.value = []
    } finally {
      loading.value = false
    }
  }

  async function refresh(): Promise<void> {
    cachedRangeKey = null
    await fetchForCursor(cursor.value)
  }

  watch(
    cursor,
    (next) => {
      void fetchForCursor(next)
    },
    { immediate: true },
  )

  return { events, loading, error, refresh }
}

function mapToAgendaEvent(r: ClinicalEventResponse): AgendaEvent {
  const meta = EVENT_TYPES[r.eventType]
  return {
    id: `${r.eventType}-${r.sourceId}`,
    type: r.eventType,
    date: r.eventDate,
    endDate: r.endDate,
    title: meta.label,
    subtitle: r.summary ?? '',
    animalId: r.animalId,
    consultationId: r.consultationId,
  }
}
