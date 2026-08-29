import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { fetchPlans } from '../api/plans.source'
import type { PublicCatalog, PublicPlan } from '../types/plans.types'

/**
 * Catálogo público de planes.
 *
 * Es un catálogo del repo como cualquier otro (`useSpecies`, `useGeoCascade`):
 * store de Pinia con la lista y la promesa en vuelo, expuesto por un composable.
 * Está en un store y no en un `ref()` a nivel de módulo porque lo consumen tres
 * pantallas —la landing, `/planes` y el paso de contratación— y ese es
 * exactamente el estado compartido que la regla dura del repo manda a Pinia.
 *
 * `load(force)` deduplica las llamadas concurrentes pero vuelve a pedir cuando
 * se fuerza: la landing y `/planes` fuerzan en su `onMounted`, alineadas con
 * «recargar siempre al abrir pantalla». Hoy detrás no hay red, pero el día que
 * la haya el comportamiento ya es el correcto.
 */
export const usePlansStore = defineStore('landingPlans', () => {
  const catalog = ref<PublicCatalog | null>(null)
  const loading = ref(false)
  const error = ref<unknown>(null)

  let inFlight: Promise<void> | null = null

  const plans = computed<PublicPlan[]>(() => catalog.value?.plans ?? [])
  const currency = computed(() => catalog.value?.currency ?? 'COP')
  const priceValidFrom = computed(() => catalog.value?.priceValidFrom ?? null)
  const loaded = computed(() => catalog.value !== null)

  function findByCode(code: string | null | undefined): PublicPlan | null {
    if (!code) return null
    return plans.value.find((p) => p.code === code) ?? null
  }

  /** El plan que la landing marca como recomendado; el primero si ninguno lo es. */
  const recommended = computed<PublicPlan | null>(
    () => plans.value.find((p) => p.recommended) ?? plans.value[0] ?? null,
  )

  async function load(force = false): Promise<void> {
    if (!force && catalog.value) return
    if (inFlight) return inFlight

    loading.value = true
    error.value = null
    inFlight = (async () => {
      try {
        catalog.value = await fetchPlans()
      } catch (e) {
        // El catálogo NO se vacía al fallar: si ya había uno cargado, una
        // recarga fallida no debe dejar la sección de planes en blanco. Una
        // landing sin precios convierte peor; una landing rota no convierte.
        error.value = e
      } finally {
        loading.value = false
        inFlight = null
      }
    })()
    return inFlight
  }

  return {
    catalog,
    plans,
    currency,
    priceValidFrom,
    loading,
    error,
    loaded,
    recommended,
    findByCode,
    load,
  }
})
