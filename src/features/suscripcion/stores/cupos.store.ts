import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getProblemDetailMessage, getTraceId } from '@/services/http/http.client'
import { cuposApi } from '../api/cupos.api'
import { suscripcionApi } from '../api/suscripcion.api'
import { isForbidden } from '../composables/accesoBloqueado'
import type {
  CompanyAccessResponse,
  CompanyCapacityResponse,
  CompanyEntitlementResponse,
  CompanyLimitEventResponse,
  EffectiveLimitResponse,
  SubscriptionItemLimitResponse,
} from '../types/cupos.types'

/**
 * Cupos, consumo y módulos activos.
 *
 * <p>Este store es el dueño de `GET /entitlements/access`, aunque «Mi plan» también lea de él
 * la lista de módulos: el endpoint tiene un solo dueño y las dos pantallas lo consumen por el
 * mismo sitio.
 */
export const useCuposStore = defineStore('suscripcionCupos', () => {
  const access = ref<CompanyAccessResponse | null>(null)
  const limits = ref<SubscriptionItemLimitResponse[]>([])
  const events = ref<CompanyLimitEventResponse[]>([])
  /** Se piden BAJO DEMANDA, uno a uno, cuando alguien abre «¿de dónde sale este tope?». */
  const effectiveLimits = ref<Record<number, EffectiveLimitResponse>>({})

  const loading = ref(false)
  const error = ref<string | null>(null)
  const errorTraceId = ref<string | null>(null)

  /** 403 en `/subscription-item-limits`: se pierde el modo, no la pantalla. */
  const limitsForbidden = ref(false)
  /** 403 en `/company-limit-events`: el `<details>` del historial no se pinta y ya. */
  const eventsForbidden = ref(false)
  const eventsLoaded = ref(false)

  /**
   * **La rama que sostiene §2.2.** `MatchesContract` no mira dentro de `capacities[]`, así que
   * un renombrado en el backend lo dejaría `undefined` sin romper la compilación. Aquí eso se
   * distingue explícitamente de «no hay capacidades»: `?? []` habría pintado «sin cupos» en
   * verde, que es decirle a una clínica que no tiene topes cuando sí los tiene.
   */
  const capacitiesLegibles = computed(() => Array.isArray(access.value?.capacities))

  const capacities = computed<CompanyCapacityResponse[]>(() =>
    Array.isArray(access.value?.capacities) ? access.value.capacities : [],
  )

  const entitlementsLegibles = computed(() => Array.isArray(access.value?.entitlements))

  const entitlements = computed<CompanyEntitlementResponse[]>(() =>
    Array.isArray(access.value?.entitlements) ? access.value.entitlements : [],
  )

  /** El tope de una dimensión, cruzado por `limitDimensionId` **en el cliente**. */
  function limiteDe(limitDimensionId: number | undefined): SubscriptionItemLimitResponse | null {
    if (limitDimensionId == null) return null
    return limits.value.find((l) => l.limitDimensionId === limitDimensionId) ?? null
  }

  let inFlight: Promise<void> | null = null

  async function cargar(): Promise<void> {
    error.value = null
    errorTraceId.value = null
    limitsForbidden.value = false
    loading.value = true
    try {
      access.value = await suscripcionApi.findAccess()
    } catch (e: unknown) {
      access.value = null
      error.value = getProblemDetailMessage(e, 'No se pudieron cargar tus cupos')
      errorTraceId.value = getTraceId(e) ?? null
    }
    // Los topes son un bloque aparte y tienen su propio permiso: sin ellos se sigue sabiendo
    // «340 de 500», solo se pierde el modo (`WARN`/`BLOCK`/…) y el umbral pactado.
    try {
      limits.value = await cuposApi.listAll()
    } catch (e: unknown) {
      limits.value = []
      if (isForbidden(e)) limitsForbidden.value = true
    }
    loading.value = false
  }

  async function load(force = false): Promise<void> {
    if (inFlight) return inFlight
    if (!force && access.value) return
    inFlight = cargar().finally(() => {
      inFlight = null
    })
    return inFlight
  }

  /** El historial solo se pide cuando alguien despliega el `<details>`. */
  async function loadEvents(): Promise<void> {
    eventsForbidden.value = false
    try {
      events.value = await cuposApi.listEvents()
    } catch (e: unknown) {
      events.value = []
      if (isForbidden(e)) eventsForbidden.value = true
    } finally {
      eventsLoaded.value = true
    }
  }

  async function loadEffectiveLimit(limitDimensionId: number): Promise<void> {
    if (effectiveLimits.value[limitDimensionId]) return
    try {
      effectiveLimits.value = {
        ...effectiveLimits.value,
        [limitDimensionId]: await cuposApi.findEffectiveLimit(limitDimensionId),
      }
    } catch {
      // Sin permiso `companyLimitOverride.read` o sin resolución: el detalle plegado se queda
      // sin contenido y lo dice. No es motivo para tocar el resto de la pantalla.
    }
  }

  return {
    access,
    limits,
    events,
    effectiveLimits,
    loading,
    error,
    errorTraceId,
    limitsForbidden,
    eventsForbidden,
    eventsLoaded,
    capacitiesLegibles,
    capacities,
    entitlementsLegibles,
    entitlements,
    limiteDe,
    load,
    loadEvents,
    loadEffectiveLimit,
  }
})
