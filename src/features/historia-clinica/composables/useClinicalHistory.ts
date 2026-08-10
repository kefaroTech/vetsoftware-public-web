import { ref, watch, type Ref } from 'vue'
import { useLatestOnly } from '@/composables/useLatestOnly'
import { clinicalHistoryApi } from '../api/clinicalHistory.api'
import type { ClinicalEvent } from '../types/historia'

const cache = new Map<number, ClinicalEvent[]>()
const inFlight = new Map<number, Promise<ClinicalEvent[]>>()

async function load(animalId: number, force = false): Promise<ClinicalEvent[]> {
  const cached = cache.get(animalId)
  if (cached && !force) return cached
  const pending = inFlight.get(animalId)
  if (pending) return pending
  const promise = clinicalHistoryApi
    .findByAnimal(animalId)
    .then((rows) =>
      rows.map<ClinicalEvent>((r) => ({
        sourceId: r.sourceId,
        animalId: r.animalId,
        eventType: r.eventType,
        eventDate: r.eventDate,
        endDate: r.endDate,
        consultationId: r.consultationId,
        summary: r.summary ?? '',
      })),
    )
    .then((events) => {
      cache.set(animalId, events)
      inFlight.delete(animalId)
      return events
    })
    .catch((e) => {
      inFlight.delete(animalId)
      throw e
    })
  inFlight.set(animalId, promise)
  return promise
}

export function useClinicalHistory(petId: Ref<string | null>) {
  const events = ref<ClinicalEvent[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  // Al saltar de una mascota a otra hay dos cargas en vuelo y no hay orden
  // garantizado de llegada: sin esto, la respuesta de la anterior pisa la
  // historia clínica de la que el usuario está viendo.
  const { begin } = useLatestOnly()

  async function refresh(id: string | null, force = false) {
    const vigente = begin()
    const numId = id ? Number(id) : NaN
    if (!Number.isFinite(numId)) {
      events.value = []
      error.value = null
      loading.value = false
      return
    }
    loading.value = true
    error.value = null
    try {
      const rows = await load(numId, force)
      if (!vigente()) return
      events.value = rows
    } catch {
      if (!vigente()) return
      events.value = []
      error.value = 'No se pudo cargar la historia clínica.'
    } finally {
      if (vigente()) loading.value = false
    }
  }

  function invalidate(id: string | null = petId.value) {
    const numId = id ? Number(id) : NaN
    if (Number.isFinite(numId)) cache.delete(numId)
  }

  // Al abrir la pantalla (immediate) o al cambiar de mascota se recarga desde el
  // backend (force) para no mostrar eventos cacheados de una visita previa.
  watch(
    petId,
    (id) => {
      refresh(id, true)
    },
    { immediate: true },
  )

  return { events, loading, error, refresh, invalidate }
}
