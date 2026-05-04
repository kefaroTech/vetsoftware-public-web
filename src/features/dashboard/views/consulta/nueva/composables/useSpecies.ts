import { computed, onMounted, ref } from 'vue'
import { speciesApi, type SpecieResponse } from '../api/species.api'

export interface SpecieOption {
  value: string
  label: string
}

const cache = ref<SpecieResponse[] | null>(null)
let inFlight: Promise<SpecieResponse[]> | null = null

async function load(): Promise<SpecieResponse[]> {
  if (cache.value) return cache.value
  if (!inFlight) {
    inFlight = speciesApi
      .listAll()
      .then((list) => {
        cache.value = list
        return list
      })
      .catch((e) => {
        inFlight = null
        throw e
      })
  }
  return inFlight
}

export function useSpecies() {
  const list = ref<SpecieResponse[]>(cache.value ?? [])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const options = computed<SpecieOption[]>(() =>
    list.value.map((s) => ({ value: String(s.id), label: s.name })),
  )

  async function refresh() {
    loading.value = true
    error.value = null
    try {
      list.value = await load()
    } catch {
      error.value = 'No se pudo cargar la lista de especies.'
    } finally {
      loading.value = false
    }
  }

  function findById(id: string): SpecieResponse | undefined {
    return list.value.find((s) => String(s.id) === id)
  }

  onMounted(() => {
    if (list.value.length === 0) refresh()
  })

  return { list, options, loading, error, findById, refresh }
}
