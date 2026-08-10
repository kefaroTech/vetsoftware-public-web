import { onMounted, ref, watch, type Ref } from 'vue'
import { useLatestOnly } from '@/composables/useLatestOnly'
import { countryApi, stateApi, cityApi } from '../api/geo.api'

export interface GeoOption {
  value: string
  label: string
}

let countriesPromise: Promise<GeoOption[]> | null = null
const statesInFlight = new Map<string, Promise<GeoOption[]>>()
const citiesInFlight = new Map<string, Promise<GeoOption[]>>()

async function loadCountries(): Promise<GeoOption[]> {
  if (countriesPromise) return countriesPromise
  countriesPromise = countryApi
    .listAll()
    .then((list) => list.map((c) => ({ value: String(c.id), label: c.name })))
    .then((opts) => {
      countriesPromise = null
      return opts
    })
    .catch((e) => {
      countriesPromise = null
      throw e
    })
  return countriesPromise
}

async function loadStates(countryId: string): Promise<GeoOption[]> {
  const pending = statesInFlight.get(countryId)
  if (pending) return pending
  const id = Number(countryId)
  if (!Number.isFinite(id)) return []
  const promise = stateApi
    .listByCountry(id)
    .then((list) => {
      statesInFlight.delete(countryId)
      return list.map((s) => ({ value: String(s.id), label: s.name }))
    })
    .catch((e) => {
      statesInFlight.delete(countryId)
      throw e
    })
  statesInFlight.set(countryId, promise)
  return promise
}

async function loadCities(stateId: string): Promise<GeoOption[]> {
  const pending = citiesInFlight.get(stateId)
  if (pending) return pending
  const id = Number(stateId)
  if (!Number.isFinite(id)) return []
  const promise = cityApi
    .listByState(id)
    .then((list) => {
      citiesInFlight.delete(stateId)
      return list.map((c) => ({ value: String(c.id), label: c.name }))
    })
    .catch((e) => {
      citiesInFlight.delete(stateId)
      throw e
    })
  citiesInFlight.set(stateId, promise)
  return promise
}

export function useGeoCascade(countryId: Ref<string>, stateId: Ref<string>) {
  const countryOptions = ref<GeoOption[]>([])
  const stateOptions = ref<GeoOption[]>([])
  const cityOptions = ref<GeoOption[]>([])
  const loadingCountries = ref(false)
  const loadingStates = ref(false)
  const loadingCities = ref(false)
  const error = ref<string | null>(null)

  onMounted(async () => {
    loadingCountries.value = true
    try {
      countryOptions.value = await loadCountries()
    } catch {
      error.value = 'No se pudo cargar la lista de países'
    } finally {
      loadingCountries.value = false
    }
    if (countryId.value) {
      await refreshStates(countryId.value)
      if (stateId.value) await refreshCities(stateId.value)
    }
  })

  // Dos secuencias distintas: cambiar de país no compite con cambiar de
  // departamento, así que cada nivel de la cascada lleva su propio guardián.
  const estados = useLatestOnly()
  const municipios = useLatestOnly()

  async function refreshStates(id: string) {
    const vigente = estados.begin()
    if (!id) {
      stateOptions.value = []
      loadingStates.value = false
      return
    }
    loadingStates.value = true
    try {
      const rows = await loadStates(id)
      if (!vigente()) return
      stateOptions.value = rows
    } catch {
      if (!vigente()) return
      stateOptions.value = []
      error.value = 'No se pudo cargar la lista de estados'
    } finally {
      if (vigente()) loadingStates.value = false
    }
  }

  async function refreshCities(id: string) {
    const vigente = municipios.begin()
    if (!id) {
      cityOptions.value = []
      loadingCities.value = false
      return
    }
    loadingCities.value = true
    try {
      const rows = await loadCities(id)
      if (!vigente()) return
      cityOptions.value = rows
    } catch {
      if (!vigente()) return
      cityOptions.value = []
      error.value = 'No se pudo cargar la lista de ciudades'
    } finally {
      if (vigente()) loadingCities.value = false
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
