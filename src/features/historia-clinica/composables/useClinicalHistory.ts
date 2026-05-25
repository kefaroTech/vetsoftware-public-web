import { ref, watch, type Ref } from 'vue'
import { clinicalHistoryApi } from '../api/clinicalHistory.api'
import type { ClinicalEvent } from '../types/historia'

const cache = new Map<number, ClinicalEvent[]>()
const inFlight = new Map<number, Promise<ClinicalEvent[]>>()

async function load(animalId: number): Promise<ClinicalEvent[]> {
  const cached = cache.get(animalId)
  if (cached) return cached
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

  async function refresh(id: string | null) {
    const numId = id ? Number(id) : NaN
    if (!Number.isFinite(numId)) {
      events.value = []
      error.value = null
      return
    }
    loading.value = true
    error.value = null
    try {
      events.value = await load(numId)
    } catch {
      events.value = []
      error.value = 'No se pudo cargar la historia clínica.'
    } finally {
      loading.value = false
    }
  }

  function invalidate(id: string | null = petId.value) {
    const numId = id ? Number(id) : NaN
    if (Number.isFinite(numId)) cache.delete(numId)
  }

  watch(
    petId,
    (id) => {
      refresh(id)
    },
    { immediate: true },
  )

  return { events, loading, error, refresh, invalidate }
}
