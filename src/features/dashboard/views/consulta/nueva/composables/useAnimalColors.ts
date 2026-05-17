import { computed, onMounted, ref } from 'vue'
import { animalColorApi, type AnimalColorResponse } from '../api/animalColor.api'

export interface AnimalColorOption {
  value: string
  label: string
}

let inFlight: Promise<AnimalColorResponse[]> | null = null

async function load(): Promise<AnimalColorResponse[]> {
  if (inFlight) return inFlight
  inFlight = animalColorApi
    .listAll()
    .then((list) => {
      inFlight = null
      return list
    })
    .catch((e) => {
      inFlight = null
      throw e
    })
  return inFlight
}

export function useAnimalColors() {
  const list = ref<AnimalColorResponse[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const options = computed<AnimalColorOption[]>(() =>
    list.value.map((c) => ({ value: String(c.id), label: c.name })),
  )

  async function refresh() {
    loading.value = true
    error.value = null
    try {
      list.value = await load()
    } catch {
      error.value = 'No se pudo cargar la lista de colores.'
    } finally {
      loading.value = false
    }
  }

  function findById(id: string): AnimalColorResponse | undefined {
    return list.value.find((c) => String(c.id) === id)
  }

  onMounted(() => {
    refresh()
  })

  return { list, options, loading, error, findById, refresh }
}
