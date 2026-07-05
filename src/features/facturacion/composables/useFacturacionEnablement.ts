import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useFacturacionEnablementStore } from '../stores/facturacionEnablement.store'
import type { ElectronicDocumentType, NumberingResolutionResponse } from '../types/facturacion'

export type ResolutionAlertKind = 'agotar' | 'vencida' | 'porvencer'

export interface ResolutionAlert {
  kind: ResolutionAlertKind
  resolution: NumberingResolutionResponse
}

const DAY_MS = 86_400_000
const EXPIRING_DAYS = 45
const LOW_RANGE_PCT = 0.1

/**
 * Wrapper estable del store de habilitación (ver CLAUDE.md: store + composable).
 * Expone el estado de prerrequisitos derivado y las alertas de resoluciones.
 */
export function useFacturacionEnablement() {
  const store = useFacturacionEnablementStore()
  const { profile, resolutions, withholding, loading, error, loaded } = storeToRefs(store)

  const enabledResolutions = computed(() => resolutions.value.filter((r) => r.enabled))

  /** Resolución activa por tipo de documento (la última gana si hubiera varias). */
  const resolutionByType = computed(() => {
    const map = {} as Record<ElectronicDocumentType, NumberingResolutionResponse | undefined>
    for (const r of enabledResolutions.value) map[r.documentType] = r
    return map
  })

  const profileOk = computed(() => !!profile.value)
  // La factura electrónica de venta (FE_VENTA) es el mínimo para poder facturar.
  const invoiceResolutionOk = computed(() => !!resolutionByType.value.FE_VENTA)
  const resolutionsOk = computed(() => enabledResolutions.value.length > 0)

  /**
   * "Lista para facturar": el back gatea por permisos; esto deriva la completitud de la
   * config visible para el cliente (perfil + resolución FE). El proveedor DIAN se gestiona
   * aparte (panel admin) y no es prerrequisito en esta UI.
   */
  const ready = computed(() => profileOk.value && invoiceResolutionOk.value)

  const resolutionAlerts = computed<ResolutionAlert[]>(() => {
    const today = new Date()
    const alerts: ResolutionAlert[] = []
    for (const r of enabledResolutions.value) {
      const total = r.rangeTo - r.rangeFrom + 1
      const left = r.rangeTo - r.currentNumber
      if (total > 0 && left / total < LOW_RANGE_PCT) alerts.push({ kind: 'agotar', resolution: r })
      const validTo = new Date(r.validTo)
      const daysLeft = (validTo.getTime() - today.getTime()) / DAY_MS
      if (daysLeft < 0) alerts.push({ kind: 'vencida', resolution: r })
      else if (daysLeft < EXPIRING_DAYS) alerts.push({ kind: 'porvencer', resolution: r })
    }
    return alerts
  })

  const needsAttention = computed(() => resolutionAlerts.value.length > 0)

  return {
    // estado
    profile,
    resolutions,
    withholding,
    loading,
    error,
    loaded,
    enabledResolutions,
    resolutionByType,
    // prerrequisitos derivados
    profileOk,
    invoiceResolutionOk,
    resolutionsOk,
    ready,
    resolutionAlerts,
    needsAttention,
    // acciones
    ensureLoaded: store.ensureLoaded,
    reload: store.reload,
    loadAll: store.loadAll,
    saveProfile: store.saveProfile,
    upsertResolution: store.upsertResolution,
    saveWithholding: store.saveWithholding,
  }
}
