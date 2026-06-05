/**
 * Helpers de precio/impuesto/promoción para la Tienda. Portados del prototipo
 * (vetMoney / vetComputeTotals / vetApplyPromo / vetPromoStatus) y adaptados al
 * modelo real del backend: el impuesto sale de `tax.percentage` de cada ítem
 * (no hay constante global de IVA), y las promociones solo soportan DISCOUNT y
 * SPECIAL_PRICE (no PAQUETE).
 */
import type {
  DerivedPromoStatus,
  ProductResponse,
  PromotionResponse,
  SaleItemKind,
  SaleLine,
  ServiceResponse,
  StockState,
} from '../types/tienda'

const moneyFmt = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

export function formatMoney(n: number): string {
  return moneyFmt.format(Number.isFinite(n) ? n : 0)
}

/** Porcentaje (0–100) de impuesto efectivo de un ítem; 0 si no aplica. */
export function effectiveTaxRate(hasTax: boolean, taxPercentage: number | null | undefined): number {
  if (!hasTax || taxPercentage == null) return 0
  return taxPercentage
}

export interface TotalsBreakdown {
  /** Suma de subtotales de línea (precio × cantidad, sin impuesto). */
  net: number
  /** Suma de impuestos por línea. */
  tax: number
  /** net + tax. */
  total: number
  /** Ahorro total por promociones aplicadas en las líneas. */
  promoSavings: number
}

/**
 * Totales del ticket. Cada línea ya trae su `unitPrice` con la promo aplicada;
 * `originalUnitPrice` permite calcular el ahorro. El impuesto se asume NO incluido
 * en el precio (se suma encima), igual que el modelo de cargos del backend.
 */
export function computeTotals(lines: SaleLine[], manualDiscount = 0): TotalsBreakdown {
  let net = 0
  let tax = 0
  let promoSavings = 0
  for (const l of lines) {
    const lineNet = l.unitPrice * l.qty
    net += lineNet
    tax += lineNet * (effectiveTaxRate(l.hasTax, l.taxPercentage) / 100)
    if (l.originalUnitPrice != null && l.originalUnitPrice > l.unitPrice) {
      promoSavings += (l.originalUnitPrice - l.unitPrice) * l.qty
    }
  }
  const discounted = Math.max(0, net - manualDiscount)
  // Recalcular impuesto proporcional si hubo descuento manual sobre el neto.
  const taxAfter = net > 0 ? tax * (discounted / net) : 0
  return {
    net: discounted,
    tax: taxAfter,
    total: discounted + taxAfter,
    promoSavings: promoSavings + manualDiscount,
  }
}

// ── Promociones ──────────────────────────────────────────────────────────────

/** Estado derivado por fecha para los badges (no persistido). `today` en ISO yyyy-MM-dd. */
export function promoStatus(promo: PromotionResponse, today: string): DerivedPromoStatus {
  if (promo.promotionStatus === 'INACTIVE') return 'INACTIVA'
  const from = promo.startDate?.slice(0, 10) ?? ''
  const to = promo.endDate?.slice(0, 10) ?? ''
  if (from && today < from) return 'PROGRAMADA'
  if (to && today > to) return 'VENCIDA'
  return 'ACTIVA'
}

export interface AppliedPromo {
  unitPrice: number
  original: number
  promo: PromotionResponse | null
}

/**
 * Calcula el mejor precio de un producto/servicio aplicando las promociones
 * activas que le apliquen (por id directo o por categoría). Devuelve el precio
 * más bajo. `today` en ISO yyyy-MM-dd.
 */
export function applyPromo(
  item: ProductResponse | ServiceResponse,
  kind: SaleItemKind,
  basePrice: number,
  categoryId: number,
  promos: PromotionResponse[],
  today: string,
): AppliedPromo {
  let best = basePrice
  let bestPromo: PromotionResponse | null = null

  for (const p of promos) {
    if (promoStatus(p, today) !== 'ACTIVA') continue
    const matchesTarget =
      (p.applicationType === 'PRODUCT' && kind === 'product' && p.applicationItem === item.id) ||
      (p.applicationType === 'SERVICE' && kind === 'service' && p.applicationItem === item.id) ||
      (p.applicationType === 'CATEGORY' && p.applicationItem === categoryId)
    if (!matchesTarget) continue

    let candidate = basePrice
    if (p.promotionType === 'SPECIAL_PRICE') {
      candidate = p.value
    } else if (p.promotionType === 'DISCOUNT') {
      candidate =
        p.valueType === 'PERCENTAGE'
          ? basePrice * (1 - p.value / 100)
          : Math.max(0, basePrice - p.value)
    }
    if (candidate < best) {
      best = candidate
      bestPromo = p
    }
  }

  return { unitPrice: Math.round(best), original: basePrice, promo: bestPromo }
}

// ── Inventario ───────────────────────────────────────────────────────────────

export function stockState(product: ProductResponse): StockState {
  if (product.currentStock <= 0) return 'AGOTADO'
  if (product.currentStock <= product.minStock) return 'BAJO'
  return 'OK'
}
