import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useCuposStore } from '../stores/cupos.store'
import { avisoCupo, datosConRetraso, type AvisoCupo } from './cuposText'
import type { CompanyCapacityResponse, LimitEnforcement } from '../types/cupos.types'

/** Una capacidad ya cruzada con su tope: es lo que consume `CupoCard`. */
export interface CupoResuelto {
  capacidad: CompanyCapacityResponse
  /** `undefined` cuando la dimensión no tiene tope cargado: **no se adivina el modo**. */
  enforcement: LimitEnforcement | undefined
  warnThreshold: number | undefined
  overageUnitAmount: number | undefined
  aviso: AvisoCupo | null
  conRetraso: boolean
}

/**
 * Fachada de lectura de los cupos.
 *
 * <p>El cruce entre consumo (`CompanyCapacityResponse`) y tope
 * (`SubscriptionItemLimitResponse`) se hace **aquí, en el cliente**, por `limitDimensionId`.
 * Cuando una dimensión tiene capacidad y no tiene tope —o al revés— el modo queda `undefined` y
 * el texto degrada a su forma genérica: decirle a alguien «puedes seguir registrando» cuando en
 * realidad va a chocar es peor que no decir nada.
 */
export function useCupos() {
  const store = useCuposStore()
  const {
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
  } = storeToRefs(store)

  const cupos = computed<CupoResuelto[]>(() =>
    capacities.value.map((capacidad) => {
      const limite = store.limiteDe(capacidad.limitDimensionId)
      return {
        capacidad,
        enforcement: limite?.enforcement,
        warnThreshold: limite?.warnThreshold,
        overageUnitAmount: limite?.overageUnitAmount,
        aviso: avisoCupo(capacidad, limite?.enforcement, limite?.warnThreshold),
        conRetraso: datosConRetraso(capacidad.limitRecalculatedAt),
      }
    }),
  )

  /** Un plan sin contadores **no es un error** y no se pinta como tal. */
  const sinCupos = computed(() => capacitiesLegibles.value && capacities.value.length === 0)

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
    entitlementsLegibles,
    entitlements,
    cupos,
    sinCupos,
    load: store.load,
    loadEvents: store.loadEvents,
    loadEffectiveLimit: store.loadEffectiveLimit,
  }
}
