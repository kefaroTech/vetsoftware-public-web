import { feMoney } from './feFormat'

/**
 * Umbral DIAN de obligatoriedad de factura electrónica.
 *
 * Regla DIAN: el Documento equivalente POS solo puede emitirse para ventas
 * cuyo total ≤ 5 UVT. Por encima de 5 UVT hay que emitir Factura electrónica con
 * el cliente identificado (datos fiscales completos).
 *
 * ⚠️ HUECO DE BACKEND (G1): el valor del UVT es dinámico (lo fija la DIAN cada año)
 * y debería venir del backend. Hoy NO hay endpoint que lo exponga, así que se define
 * aquí como constante configurable. Para activarlo de verdad, exponer el UVT vigente
 * (p. ej. GET /fiscal-config → { uvtValue }) y leerlo en lugar de la constante.
 */

// UVT vigente 2025 (COP). Cámbialo cada año o, mejor, cablea el backend.
const UVT_VALUE_COP = 49_799
// Tope normativo del documento POS (DIAN): 5 UVT.
const UVT_THRESHOLD_QTY = 5

export function useFeUvt() {
  const uvtValue = UVT_VALUE_COP
  const uvtThresholdQty = UVT_THRESHOLD_QTY
  const threshold = uvtValue * uvtThresholdQty

  /** true si el total obliga a Factura electrónica (supera 5 UVT). */
  function isOverThreshold(total: number | null | undefined): boolean {
    return (total ?? 0) > threshold
  }

  /** Texto del detalle: "5 UVT = 5 × $49.799". */
  function thresholdBreakdown(): string {
    return `${uvtThresholdQty} UVT = ${uvtThresholdQty} × ${feMoney(uvtValue)}`
  }

  return {
    uvtValue,
    uvtThresholdQty,
    threshold,
    isOverThreshold,
    thresholdBreakdown,
  }
}
