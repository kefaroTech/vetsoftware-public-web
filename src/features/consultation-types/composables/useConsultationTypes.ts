import { computed, onMounted, ref } from 'vue'
import { consultationTypeApi, type ConsultationTypeResponse } from '../api/consultation-types.api'

export interface ConsultationTypeOption {
  value: string
  label: string
}

let inFlight: Promise<ConsultationTypeResponse[]> | null = null

async function load(): Promise<ConsultationTypeResponse[]> {
  if (inFlight) return inFlight
  inFlight = consultationTypeApi
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

export function useConsultationTypes() {
  const list = ref<ConsultationTypeResponse[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const options = computed<ConsultationTypeOption[]>(() =>
    list.value.map((t) => ({ value: String(t.id), label: t.name })),
  )

  async function refresh() {
    loading.value = true
    error.value = null
    try {
      list.value = await load()
    } catch {
      error.value = 'No se pudo cargar la lista de tipos de consulta.'
    } finally {
      loading.value = false
    }
  }

  function findById(id: string): ConsultationTypeResponse | undefined {
    return list.value.find((t) => String(t.id) === id)
  }

  onMounted(() => {
    refresh()
  })

  return { list, options, loading, error, findById, refresh }
}
