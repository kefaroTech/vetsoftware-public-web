import { computed, ref, watch } from 'vue'
import { getProblemDetailMessage } from '@/services/http/http.client'
import { locationsApi } from '../api/locations.api'
import type { City, Country, State } from '../types'
import type { RegisterFormState, RegisterOption } from '../types/register-form.types'

/**
 * La cascada geográfica del auto-registro: país → departamento → ciudad.
 *
 * Se saca de `RegisterForm.vue` porque el formulario pasó de 500 líneas y
 * `css:budget` tiene el techo de SFC grandes en cero — pero la costura no la
 * eligió el presupuesto, ya estaba ahí: son tres catálogos encadenados con sus
 * propios estados de carga, y no comparten nada con la validación ni con el
 * envío salvo tres campos del borrador.
 *
 * **Estado por instancia, no singleton de módulo**: los `ref()` viven dentro de
 * la función, así que dos formularios montados a la vez no comparten listas.
 * Eso NO es el patrón híbrido que el repo prohíbe; lo prohibido es el `ref()` a
 * nivel de módulo.
 *
 * Recibe el borrador reactivo y observa sus tres campos: escribir en el `select`
 * escribe en el borrador original, igual que antes.
 */
export function useRegistroGeo(form: RegisterFormState) {
  const countries = ref<Country[]>([])
  const states = ref<State[]>([])
  const cities = ref<City[]>([])
  const loadingStates = ref(false)
  const loadingCities = ref(false)
  /** Mensaje de fallo de carga, para el banner del formulario. */
  const error = ref<string | null>(null)

  const countryOptions = computed<RegisterOption[]>(() =>
    countries.value.map((c) => ({ value: String(c.id), label: c.name })),
  )
  const stateOptions = computed<RegisterOption[]>(() =>
    states.value.map((s) => ({ value: String(s.id), label: s.name })),
  )
  const cityOptions = computed<RegisterOption[]>(() =>
    cities.value.map((c) => ({ value: String(c.id), label: c.name })),
  )

  async function loadCountries(): Promise<void> {
    try {
      countries.value = await locationsApi.listCountries()
    } catch (e) {
      error.value = getProblemDetailMessage(e, 'No se pudieron cargar los países')
    }
  }

  watch(
    () => form.countryId,
    async (id) => {
      form.stateId = ''
      form.cityId = ''
      states.value = []
      cities.value = []
      if (!id) return
      loadingStates.value = true
      try {
        states.value = await locationsApi.listStatesByCountry(Number(id))
      } catch (e) {
        error.value = getProblemDetailMessage(e, 'No se pudieron cargar los departamentos')
      } finally {
        loadingStates.value = false
      }
    },
  )

  watch(
    () => form.stateId,
    async (id) => {
      form.cityId = ''
      cities.value = []
      if (!id) return
      loadingCities.value = true
      try {
        cities.value = await locationsApi.listCitiesByState(Number(id))
      } catch (e) {
        error.value = getProblemDetailMessage(e, 'No se pudieron cargar las ciudades')
      } finally {
        loadingCities.value = false
      }
    },
  )

  return {
    countryOptions,
    stateOptions,
    cityOptions,
    loadingStates,
    loadingCities,
    error,
    loadCountries,
  }
}
