import { computed } from 'vue'
import { feMoney } from './feFormat'
import { useSystemConfigStore } from '../stores/systemConfig.store'

/**
 * Umbral DIAN de obligatoriedad de factura electrónica.
 *
 * Regla DIAN: el Documento equivalente POS solo puede emitirse para ventas cuyo total ≤ 5 UVT. Por
 * encima de 5 UVT hay que emitir Factura electrónica con el cliente identificado.
 *
 * El valor del UVT (dinámico, lo fija la DIAN cada año) viene del backend
 * (`GET /system-configurations`), cacheado en `useSystemConfigStore`. La cantidad 5 es la regla DIAN.
 */
const UVT_THRESHOLD_QTY = 5

export function useFeUvt() {
  const store = useSystemConfigStore()
  // Dispara la carga (deduplicada) la primera vez que algún consumidor usa el umbral.
  void store.ensureLoaded()

  const uvtValue = computed(() => store.uvtValue)
  const uvtThresholdQty = UVT_THRESHOLD_QTY
  const threshold = computed(() => uvtValue.value * uvtThresholdQty)

  /** true si el total obliga a Factura electrónica (supera 5 UVT). */
  function isOverThreshold(total: number | null | undefined): boolean {
    return (total ?? 0) > threshold.value
  }

  /** Texto del detalle: "5 UVT = 5 × $49.799". */
  function thresholdBreakdown(): string {
    return `${uvtThresholdQty} UVT = ${uvtThresholdQty} × ${feMoney(uvtValue.value)}`
  }

  return {
    uvtValue,
    uvtThresholdQty,
    threshold,
    isOverThreshold,
    thresholdBreakdown,
  }
}
