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

/**
 * Separa un monto BRUTO (IVA incluido) en base gravable + impuesto contenido.
 * base = gross / (1 + tasa/100); tax = gross − base. Si no aplica impuesto, tax = 0.
 */
export function splitGross(
  gross: number,
  hasTax: boolean,
  taxPercentage: number | null | undefined,
): { base: number; tax: number } {
  const rate = effectiveTaxRate(hasTax, taxPercentage)
  if (rate <= 0) return { base: gross, tax: 0 }
  // Redondeo por línea a 2 decimales (HALF_UP), igual que el backend, para que la preview coincida.
  const base = Math.round((gross / (1 + rate / 100)) * 100) / 100
  return { base, tax: gross - base }
}

export interface TotalsBreakdown {
  /** Base gravable (extraída del bruto, sin IVA). */
  net: number
  /** Impuesto contenido en el bruto. */
  tax: number
  /** Total bruto que paga el cliente (= base + IVA). */
  total: number
  /** Ahorro total por promociones aplicadas en las líneas. */
  promoSavings: number
}

/**
 * Totales del ticket. Cada línea ya trae su `unitPrice` con la promo aplicada;
 * `originalUnitPrice` permite calcular el ahorro. El precio se asume BRUTO (IVA
 * INCLUIDO), igual que el modelo de cargos del backend: el total es la suma de los
 * precios y el IVA se EXTRAE (no se suma encima).
 */
export function computeTotals(lines: SaleLine[], manualDiscount = 0): TotalsBreakdown {
  let gross = 0
  let promoSavings = 0
  for (const l of lines) {
    gross += l.unitPrice * l.qty
    if (l.originalUnitPrice != null && l.originalUnitPrice > l.unitPrice) {
      promoSavings += (l.originalUnitPrice - l.unitPrice) * l.qty
    }
  }
  const discountedGross = Math.max(0, gross - manualDiscount)
  // El descuento manual reduce el bruto proporcionalmente antes de extraer el IVA.
  const factor = gross > 0 ? discountedGross / gross : 0
  let tax = 0
  for (const l of lines) {
    const lineGross = l.unitPrice * l.qty * factor
    tax += splitGross(lineGross, l.hasTax, l.taxPercentage).tax
  }
  return {
    net: discountedGross - tax,
    tax,
    total: discountedGross,
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
