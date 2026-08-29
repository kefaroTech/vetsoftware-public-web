import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useCobrosStore } from '../stores/cobros.store'
import { chargeGroupLabel } from './cobrosText'
import type { SubscriptionChargeResponse } from '../types/cobros.types'

/** Cargos agrupados por su tipo, que es como se responde a «¿de dónde sale este importe?». */
export interface GrupoCargos {
  titulo: string
  cargos: SubscriptionChargeResponse[]
  total: number
}

export function useCobros() {
  const store = useCobrosStore()
  const {
    creditBalance,
    creditForbidden,
    dunningEvents,
    dunningForbidden,
    dunningLoaded,
    document,
    charges,
    chargesTruncated,
    detailLoading,
    detailError,
    detailErrorTraceId,
    detailForbidden,
  } = storeToRefs(store)

  const tieneSaldoAFavor = computed(() => (creditBalance.value?.balanceAmount ?? 0) > 0)

  const grupos = computed<GrupoCargos[]>(() => {
    const porTipo = new Map<string, GrupoCargos>()
    for (const cargo of charges.value) {
      const titulo = chargeGroupLabel(cargo.chargeType)
      const grupo = porTipo.get(titulo) ?? { titulo, cargos: [], total: 0 }
      grupo.cargos.push(cargo)
      grupo.total += cargo.subtotalAmount ?? 0
      porTipo.set(titulo, grupo)
    }
    return [...porTipo.values()]
  })

  /** El desglose de impuestos, leído con `Array.isArray`: `taxes[]` va suelto en el contrato. */
  const impuestos = computed(() =>
    Array.isArray(document.value?.taxes) ? document.value.taxes : [],
  )

  return {
    creditBalance,
    creditForbidden,
    tieneSaldoAFavor,
    dunningEvents,
    dunningForbidden,
    dunningLoaded,
    document,
    charges,
    chargesTruncated,
    grupos,
    impuestos,
    detailLoading,
    detailError,
    detailErrorTraceId,
    detailForbidden,
    loadCreditBalance: store.loadCreditBalance,
    loadDunning: store.loadDunning,
    loadDocument: store.loadDocument,
  }
}
