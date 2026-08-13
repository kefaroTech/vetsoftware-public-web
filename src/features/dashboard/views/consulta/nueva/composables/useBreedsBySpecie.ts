import { computed, onMounted, ref, watch, type Ref } from 'vue'
import { useLatestOnly } from '@/composables/useLatestOnly'
import { breedApi, type BreedResponse } from '../api/breed.api'

export interface BreedOption {
  value: string
  label: string
}

const inFlight = new Map<string, Promise<BreedResponse[]>>()

async function load(specieId: string): Promise<BreedResponse[]> {
  const pending = inFlight.get(specieId)
  if (pending) return pending
  const id = Number(specieId)
  if (!Number.isFinite(id)) return []
  const promise = breedApi
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

export function useBreedsBySpecie(specieId: Ref<string>) {
  const list = ref<BreedResponse[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const options = computed<BreedOption[]>(() =>
    list.value.map((b) => ({ value: String(b.id), label: b.name })),
  )

  // Cambiar de especie rápido deja dos cargas en vuelo: sin esto, la lista de
  // razas de la especie anterior puede pisar a la nueva.
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
      error.value = 'No se pudo cargar la lista de razas.'
    } finally {
      if (vigente()) loading.value = false
    }
  }

  function findById(id: string): BreedResponse | undefined {
    return list.value.find((b) => String(b.id) === id)
  }

  onMounted(() => {
    if (specieId.value) refresh(specieId.value)
  })

  watch(specieId, (id) => {
    refresh(id)
  })

  return { list, options, loading, error, findById, refresh }
}
