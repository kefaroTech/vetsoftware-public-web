/**
 * Espejo de `ModuleShowcaseResponse` (`GET /subscriptions/modules`). Cruza catálogo, entitlement,
 * consumo y comprabilidad por módulo en una sola llamada: cada pantalla clínica sabe su estado
 * sin pedir nada más.
 */

export type ModuleShowcaseState =
  'TRIAL' | 'FREE_LIMITED' | 'EXPIRED_READ_ONLY' | 'PAID' | 'NOT_INCLUDED' | 'NEVER_FREE'

/** Un tope del módulo, ya cruzado con su consumo. Puede haber más de uno por módulo. */
export interface ModuleCeilingResponse {
  dimensionCode?: string
  measureKind?: string
  used?: number
  limit?: number
  warnThreshold?: number
  enforcement?: string
}

export interface ModuleShowcaseResponse {
  code?: string
  name?: string
  shortDescription?: string
  state?: ModuleShowcaseState
  trialEndDate?: string
  ceilings?: ModuleCeilingResponse[]
  monthlyPrice?: number
  annualPrice?: number
  purchasable?: boolean
  canPurchase?: boolean
}
