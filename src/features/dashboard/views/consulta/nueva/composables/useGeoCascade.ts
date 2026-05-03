import { onMounted, ref, watch, type Ref } from 'vue'
import { countryApi, stateApi, cityApi } from '../api/geo.api'

export interface GeoOption {
  value: string
  label: string
}

const countriesCache = ref<GeoOption[] | null>(null)
let countriesPromise: Promise<GeoOption[]> | null = null
const statesCache = new Map<string, GeoOption[]>()
const citiesCache = new Map<string, GeoOption[]>()

async function loadCountries(): Promise<GeoOption[]> {
  if (countriesCache.value) return countriesCache.value
  if (!countriesPromise) {
    countriesPromise = countryApi
      .listAll()
      .then((list) =>
        list.map((c) => ({ value: String(c.id), label: c.name })),
      )
      .then((opts) => {
        countriesCache.value = opts
        return opts
      })
      .catch((e) => {
        countriesPromise = null
        throw e
      })
  }
  return countriesPromise
}

async function loadStates(countryId: string): Promise<GeoOption[]> {
  const cached = statesCache.get(countryId)
  if (cached) return cached
  const id = Number(countryId)
  if (!Number.isFinite(id)) return []
  const list = await stateApi.listByCountry(id)
  const opts = list.map((s) => ({ value: String(s.id), label: s.name }))
  statesCache.set(countryId, opts)
  return opts
}

async function loadCities(stateId: string): Promise<GeoOption[]> {
  const cached = citiesCache.get(stateId)
  if (cached) return cached
  const id = Number(stateId)
  if (!Number.isFinite(id)) return []
  const list = await cityApi.listByState(id)
  const opts = list.map((c) => ({ value: String(c.id), label: c.name }))
  citiesCache.set(stateId, opts)
  return opts
}

export function useGeoCascade(
  countryId: Ref<string>,
  stateId: Ref<string>,
) {
  const countryOptions = ref<GeoOption[]>(countriesCache.value ?? [])
  const stateOptions = ref<GeoOption[]>([])
  const cityOptions = ref<GeoOption[]>([])
  const loadingCountries = ref(false)
  const loadingStates = ref(false)
  const loadingCities = ref(false)
  const error = ref<string | null>(null)

  onMounted(async () => {
    if (countryOptions.value.length === 0) {
      loadingCountries.value = true
      try {
        countryOptions.value = await loadCountries()
      } catch {
        error.value = 'No se pudo cargar la lista de países'
      } finally {
        loadingCountries.value = false
      }
    }
    if (countryId.value) {
      await refreshStates(countryId.value)
      if (stateId.value) await refreshCities(stateId.value)
    }
  })

  async function refreshStates(id: string) {
    if (!id) {
      stateOptions.value = []
      return
    }
    loadingStates.value = true
    try {
      stateOptions.value = await loadStates(id)
    } catch {
      stateOptions.value = []
      error.value = 'No se pudo cargar la lista de estados'
    } finally {
      loadingStates.value = false
    }
  }

  async function refreshCities(id: string) {
    if (!id) {
      cityOptions.value = []
      return
    }
    loadingCities.value = true
    try {
      cityOptions.value = await loadCities(id)
    } catch {
      cityOptions.value = []
      error.value = 'No se pudo cargar la lista de ciudades'
    } finally {
      loadingCities.value = false
    }
  }

  watch(countryId, async (id) => {
    cityOptions.value = []
    await refreshStates(id)
  })

  watch(stateId, async (id) => {
    await refreshCities(id)
  })

  return {
    countryOptions,
    stateOptions,
    cityOptions,
    loadingCountries,
    loadingStates,
    loadingCities,
    error,
  }
}
