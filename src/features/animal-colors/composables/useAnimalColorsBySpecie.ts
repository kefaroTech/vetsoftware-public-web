import { computed, onMounted, ref, watch, type Ref } from 'vue'
import { useLatestOnly } from '@/composables/useLatestOnly'
import { animalColorApi } from '../api/animal-colors.api'
import type { AnimalColorResponse } from '../types/animal-colors.types'

export interface AnimalColorOption {
  value: string
  label: string
}

const inFlight = new Map<string, Promise<AnimalColorResponse[]>>()

async function load(specieId: string): Promise<AnimalColorResponse[]> {
  const pending = inFlight.get(specieId)
  if (pending) return pending
  const id = Number(specieId)
  if (!Number.isFinite(id)) return []
  const promise = animalColorApi
    .listBySpecie(id)
    .then((list) => {
      inFlight.delete(specieId)
      return list
    })
    .catch((e) => {
      inFlight.delete(specieId)
      throw e
    })
  inFlight.set(specieId, promise)
  return promise
}

export function useAnimalColorsBySpecie(specieId: Ref<string>) {
  const list = ref<AnimalColorResponse[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const options = computed<AnimalColorOption[]>(() =>
    list.value.map((c) => ({ value: String(c.id), label: c.name })),
  )

  // Cambiar de especie rápido deja dos cargas en vuelo: sin esto, los colores de
  // la especie anterior pueden pisar a los nuevos.
  const { begin } = useLatestOnly()

  async function refresh(id: string) {
    const vigente = begin()
    if (!id) {
      list.value = []
      error.value = null
      loading.value = false
      return
    }
    loading.value = true
    error.value = null
    try {
      const rows = await load(id)
      if (!vigente()) return
      list.value = rows
    } catch {
      if (!vigente()) return
      list.value = []
      error.value = 'No se pudo cargar la lista de colores.'
    } finally {
      if (vigente()) loading.value = false
    }
  }

  function findById(id: string): AnimalColorResponse | undefined {
    return list.value.find((c) => String(c.id) === id)
  }

  onMounted(() => {
    if (specieId.value) refresh(specieId.value)
  })

  watch(specieId, (id) => {
    refresh(id)
  })

  return { list, options, loading, error, findById, refresh }
}
