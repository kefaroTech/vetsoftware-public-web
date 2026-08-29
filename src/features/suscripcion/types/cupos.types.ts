/**
 * Cupos y consumo — espejo de los DTO del backend (`companyentitlement`,
 * `subscriptionitemlimit`, `companylimitoverride`, `companylimitevent`).
 *
 * <p><b>Por qué cada tipo anidado se declara aparte.</b> `MatchesContract` solo compara campos
 * `string | number | boolean`: un array o un objeto anidado le resulta invisible
 * (`api.contract.ts`, `Comparable`). En este bloque eso deja suelto exactamente el dato que
 * importa — `CompanyAccessResponse.capacities[]` es literalmente todo «340 de 500». La defensa
 * es declarar cada nivel como interfaz propia y atarlo por separado en `api.contract.ts`: el
 * comparador no baja, pero cada nivel tiene su propia línea.
 */

/** Cómo se mide una dimensión. En `CompanyCapacityResponse` el contrato lo declara `string`. */
export type MeasureKind = 'STOCK' | 'CUMULATIVE' | 'FLOW'

/**
 * Qué pasa cuando el cupo se agota. **Los cuatro valores son distintos y se dicen distinto**:
 * `WARN` avisa sin impedir nada, y hoy la clínica no lo distingue de un fallo porque ninguna
 * pantalla se lo explica. Ver `cuposText.ts`.
 */
export type LimitEnforcement = 'WARN' | 'BLOCK' | 'READ_ONLY' | 'OVERAGE'

export type LimitResetPeriod = 'MONTH' | 'QUARTER' | 'SEMESTER'

export type LimitSource = 'COMPANY_OVERRIDE' | 'SUBSCRIPTION' | 'CATALOG_DEFAULT' | 'NONE'

export type CompanyLimitEventType =
  | 'THRESHOLD_WARNED'
  | 'LIMIT_BLOCKED'
  | 'LIMIT_RAISED'
  | 'USAGE_RECONCILED'
  | 'USAGE_ADJUSTED'
  | 'OVER_LIMIT_ON_DOWNGRADE'

export interface SubModuleSummary {
  id: number
  name: string
  code: string
}

/**
 * Un contador vivo: cuánto lleva usado la clínica de un tope suyo.
 *
 * <p>`limitQuantity` ausente **no es un tope de cero**: es «sin techo declarado». Pintar la barra
 * al 100 % en ese caso inventaría un límite que no existe (R14), así que la barra no se pinta y
 * el texto dice «sin límite».
 */
export interface CompanyCapacityResponse {
  id?: number
  companyId?: number
  limitDimensionId?: number
  /** **Es un dato, no un enum**: el backend puede sembrar una dimensión nueva sin desplegar. */
  dimensionCode?: string
  measureKind?: MeasureKind
  periodKey?: string
  limitQuantity?: number
  usedQuantity?: number
  exhausted?: boolean
  subscriptionId?: number
  /** Si se queda vieja hay un proceso caído y la clínica decide sobre una foto antigua. */
  limitRecalculatedAt?: string
  usageReconciledAt?: string
}

/** Un módulo al que la empresa tiene acceso, con su procedencia. */
export interface CompanyEntitlementResponse {
  id?: number
  companyId?: number
  subModule?: SubModuleSummary
  accessLevel?: string
  source?: string
  subscriptionId?: number
  subscriptionItemId?: number
  validFrom?: string
  validUntil?: string
  recalculatedAt?: string
}

/**
 * `GET /entitlements/access`. Sin permiso propio (solo `isMyCompany`), así que es lo único de
 * esta feature que ninguna empresa puede tener cerrado.
 *
 * <p>`entitlements` y `capacities` son **opcionales a propósito**, y no `[]` por omisión: es lo
 * que obliga al código a distinguir «tu plan no lleva contadores» de «no pudimos leer tus
 * cupos». Degradar lo segundo a lo primero le diría a una clínica que no tiene topes cuando sí
 * los tiene, que es el peor fallo que esta pantalla puede producir.
 */
export interface CompanyAccessResponse {
  companyId?: number
  entitlements?: CompanyEntitlementResponse[]
  capacities?: CompanyCapacityResponse[]
  recalculatedAt?: string
}

/**
 * El tope pactado de una línea del plan. Aporta lo que la capacidad no dice: **cómo se aplica**
 * (`enforcement`), a partir de qué porcentaje avisa (`warnThreshold`) y a cuánto sale el
 * excedente. Se cruza con `CompanyCapacityResponse` por `limitDimensionId`, **en el cliente**.
 */
export interface SubscriptionItemLimitResponse {
  id: number
  companyId: number
  subscriptionItemId: number
  limitDimensionId: number
  measureKind: MeasureKind
  mode: 'FULL' | 'LIMITED'
  limitQuantity?: number
  resetPeriod?: LimitResetPeriod
  enforcement: LimitEnforcement
  overageUnitAmount?: number
  /** Porcentaje (0–100) pactado para el aviso. Ver `cuposText.umbralAlcanzado`. */
  warnThreshold: number
  createdDate: string
}

/** «¿De dónde sale este tope?». Se pide **bajo demanda**, nunca en bucle al montar. */
export interface EffectiveLimitResponse {
  companyId: number
  limitDimensionId: number
  limitQuantity?: number
  source: LimitSource
  overrideId?: number
  unlimited: boolean
}

/** Historial de lo que ha pasado con un cupo. Bloque secundario: un 403 aquí no rompe nada. */
export interface CompanyLimitEventResponse {
  id: number
  companyId: number
  limitDimensionId: number
  eventType: CompanyLimitEventType
  limitQuantity: number
  usedQuantity: number
  requestedDelta: number
  limitSource: LimitSource
  overrideId?: number
  actorEmployeeId?: number
  actorSystemUserId?: number
  actorIsProcess: boolean
  reasonCode?: string
  reason?: string
  occurredAt: string
}
