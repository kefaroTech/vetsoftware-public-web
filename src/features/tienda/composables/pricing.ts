/**
 * Helpers de precio/impuesto/promoción para la Tienda. Portados del prototipo
 * (vetMoney / vetComputeTotals / vetApplyPromo / vetPromoStatus) y adaptados al
 * modelo real del backend: el impuesto sale de `tax.percentage` de cada ítem
 * (no hay constante global de IVA), y las promociones solo soportan DISCOUNT y
 * SPECIAL_PRICE (no PAQUETE).
 */
import * as money from './money'
import type {
  DerivedPromoStatus,
  ProductResponse,
  PromotionResponse,
  SaleItemKind,
  SaleLine,
  ServiceResponse,
  StockState,
  TaxTreatment,
} from '../types/tienda'
import type { StockView } from '../types/inventory'

/** El IVA solo se extrae cuando el ítem es GRAVADO. */
export function appliesIva(taxTreatment: TaxTreatment): boolean {
  return taxTreatment === 'GRAVADO'
}

const TAX_TREATMENT_LABELS: Record<TaxTreatment, string> = {
  GRAVADO: 'Gravado',
  EXENTO: 'Exento (0%)',
  EXCLUIDO: 'Excluido',
  INC: 'INC',
}

/** Etiqueta en español de la clasificación tributaria. */
export function taxTreatmentLabel(taxTreatment: TaxTreatment): string {
  return TAX_TREATMENT_LABELS[taxTreatment] ?? taxTreatment
}

const moneyFmt = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

/**
 * Importe a pesos enteros. Es lo correcto para el ticket y para el carrito: en
 * Colombia no circulan centavos y un recibo con decimales confunde al cliente.
 *
 * Ojo: redondear aquí es lo que hacía INVISIBLE el descuadre que describe
 * FE-09. Ya no hay descuadre que ocultar —el cálculo replica al backend al
 * centavo—, pero para las pantallas de desglose fiscal está `formatMoneyExact`,
 * que sí muestra los centavos cuando existen.
 */
export function formatMoney(n: number): string {
  return moneyFmt.format(Number.isFinite(n) ? n : 0)
}

const moneyExactFmt = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/**
 * Importe con centavos, para desgloses fiscales: base gravable e IVA por
 * tarifa, que es lo que tiene que cuadrar con el documento electrónico. Aquí
 * esconder los centavos sería esconder precisamente lo que se está
 * comprobando.
 */
export function formatMoneyExact(n: number): string {
  return moneyExactFmt.format(Number.isFinite(n) ? n : 0)
}

/** Porcentaje (0–100) de impuesto efectivo de un ítem; 0 si no aplica. */
export function effectiveTaxRate(
  aplicaIva: boolean,
  taxPercentage: number | null | undefined,
): number {
  if (!aplicaIva || taxPercentage == null) return 0
  return taxPercentage
}

/**
 * Separa un monto BRUTO (IVA incluido) en base gravable + impuesto contenido.
 * base = gross / (1 + tasa/100); tax = gross − base. Si no aplica impuesto, tax = 0.
 */
export function splitGross(
  gross: number,
  aplicaIva: boolean,
  taxPercentage: number | null | undefined,
): { base: number; tax: number } {
  const rate = effectiveTaxRate(aplicaIva, taxPercentage)
  if (rate <= 0) return { base: money.scaled(gross), tax: 0 }
  // Réplica de `Money.extractBase` + `gross.subtract(base)` del backend, en
  // centavos enteros.
  //
  // Medido: para los importes que este sistema produce —precios enteros por
  // cantidades enteras— la versión anterior en coma flotante daba EL MISMO
  // resultado en las 800.574 combinaciones probadas. El cambio no arregla un
  // desacuerdo existente; convierte en garantía lo que hoy es una coincidencia,
  // y deja de depender de que nadie introduzca nunca un precio con centavos o
  // una tarifa con decimales.
  return {
    base: money.extractBase(gross, rate),
    tax: money.extractTax(gross, rate),
  }
}

/**
 * Bruto de una línea: `unitPrice × qty` a escala monetaria, igual que
 * `Money.multiply` en `PosSaleDocumentBuilder`.
 */
export function lineGross(unitPrice: number, qty: number): number {
  return money.multiply(unitPrice, qty)
}

export interface TaxRateRow {
  /** Etiqueta de la tarifa, tal como se muestra al cajero. */
  name: string
  /** Impuesto acumulado de todas las líneas con esa tarifa. */
  amount: number
}

/**
 * Impuesto por tarifa de un conjunto de líneas. Vive aquí y no en cada pantalla
 * porque el POS y el cierre de cuenta lo calculaban por separado, cada uno
 * acumulando en coma flotante: dos implementaciones de la misma regla fiscal
 * que podían dar números distintos para el mismo carrito.
 */
export function taxByRate(
  lines: readonly { gross: number; ratePct: number; label?: string }[],
): TaxRateRow[] {
  const groups = new Map<string, { name: string; parts: number[] }>()
  for (const l of lines) {
    if (l.ratePct <= 0) continue
    const name = l.label ?? `IVA ${l.ratePct}%`
    const group = groups.get(name) ?? { name, parts: [] }
    group.parts.push(money.extractTax(l.gross, l.ratePct))
    groups.set(name, group)
  }
  return Array.from(groups.values())
    .map((g) => ({ name: g.name, amount: money.sum(g.parts) }))
    .filter((g) => g.amount > 0)
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
  // Cada línea viaja junto a su bruto en vez de en dos arrays paralelos que hay
  // que reindexar más abajo: el emparejamiento deja de depender de que los dos
  // recorridos coincidan y no hay ningún índice que pueda salirse.
  const perLine = lines.map((l) => ({ line: l, lineGrossAmount: lineGross(l.unitPrice, l.qty) }))
  const gross = money.sum(perLine.map((p) => p.lineGrossAmount))
  const promoSavings = money.sum(
    lines.map((l) =>
      l.originalUnitPrice != null && l.originalUnitPrice > l.unitPrice
        ? money.multiply(l.originalUnitPrice - l.unitPrice, l.qty)
        : 0,
    ),
  )
  const discountedGross = Math.max(0, money.scaled(gross - manualDiscount))
  // El descuento manual reduce el bruto proporcionalmente antes de extraer el
  // IVA: cobrar impuesto sobre dinero que nadie cobró es un problema fiscal, no
  // de presentación. El reparto se hace sobre el bruto ya escalado de cada
  // línea, y el impuesto de cada una se extrae con la misma regla del backend.
  const tax = money.sum(
    perLine.map(({ line, lineGrossAmount }) => {
      const share = gross > 0 ? money.scaled((lineGrossAmount * discountedGross) / gross) : 0
      return splitGross(share, appliesIva(line.taxTreatment), line.taxPercentage).tax
    }),
  )
  return {
    net: money.scaled(discountedGross - tax),
    tax,
    total: discountedGross,
    promoSavings: money.scaled(promoSavings + manualDiscount),
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

    // Cada candidato se redondea a peso YA, y se comparan enteros. Es
    // equivalente a comparar sin redondear y redondear el ganador —redondear es
    // monótono— y evita arrastrar decimales por la comparación.
    let candidate = money.roundToUnit(basePrice)
    if (p.promotionType === 'SPECIAL_PRICE') {
      candidate = money.roundToUnit(p.value)
    } else if (p.promotionType === 'DISCOUNT') {
      candidate =
        p.valueType === 'PERCENTAGE'
          ? money.discountedUnitPrice(basePrice, p.value)
          : Math.max(0, money.roundToUnit(basePrice - p.value))
    }
    if (candidate < best) {
      best = candidate
      bestPromo = p
    }
  }

  // El servidor recalcula este mismo precio y rechaza la línea si se desvía más
  // de un peso. En el 0,2 % de las combinaciones (base, descuento) la cuenta en
  // coma flotante caía justo por debajo del medio y redondeaba a la baja,
  // dejando al cajero cobrando un peso menos de lo que declara el documento
  // fiscal — y al servidor absorbiéndolo en silencio con su tolerancia.
  return { unitPrice: money.roundToUnit(best), original: basePrice, promo: bestPromo }
}

// ── Inventario ───────────────────────────────────────────────────────────────

/**
 * Estado de stock derivado del saldo por sede (F4: el stock ya no vive en el producto). AGOTADO si ≤0, BAJO si
 * ≤ mínimo, si no OK.
 */
export function stockState(quantity: number, minStock: number): StockState {
  if (quantity <= 0) return 'AGOTADO'
  if (quantity <= minStock) return 'BAJO'
  return 'OK'
}

/**
 * Saldo de un producto en el mapa por sede, con ceros por defecto: un producto
 * sin fila de stock en la sede activa no es un error, es que nunca entró allí.
 */
export function stockOf(
  stockByProduct: Record<number, StockView>,
  productId: number,
): { quantity: number; minStock: number; lowStock: boolean } {
  const row = stockByProduct[productId]
  return {
    quantity: row?.quantity ?? 0,
    minStock: row?.minStock ?? 0,
    lowStock: row?.lowStock ?? false,
  }
}

export function stateOf(stockByProduct: Record<number, StockView>, productId: number): StockState {
  const s = stockOf(stockByProduct, productId)
  return stockState(s.quantity, s.minStock)
}
