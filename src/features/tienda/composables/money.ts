/**
 * Aritmética monetaria del frontend. Puerto directo de
 * `com.vetsoftware.app.shared.domain.Money` del backend, que es la autoridad
 * fiscal: escala 2 con HALF_UP, y escala intermedia de 6 decimales para el
 * factor `(1 + pct/100)` antes de dividir.
 *
 * ── Por qué no basta con `number` ──────────────────────────────────────────
 *
 * El backend usa `BigDecimal`. Hacer lo mismo con coma flotante IEEE-754
 * produce resultados que NO coinciden, y el desacuerdo no es teórico:
 *
 *   · `1 + 19/100` no es 1,19 sino 1,1899999999999999. Dividir por un factor
 *     más pequeño da una base más grande, y el IVA sale corto.
 *   · `Math.round(x * 100) / 100` falla cuando `x * 100` cae justo por debajo
 *     del medio en binario: el caso de libro es 1,005 · 100 = 100,49999999999999,
 *     que redondea a 1,00 donde el backend da 1,01.
 *
 * Aquí todo el cálculo ocurre en CENTAVOS ENTEROS con `bigint`, así que no hay
 * error de representación en ningún paso intermedio. La frontera pública sigue
 * hablando en pesos (`number`) para no obligar al resto de la aplicación a
 * cambiar de tipo; la conversión de entrada redondea HALF_UP sobre la
 * representación decimal, no sobre el binario.
 *
 * Los importes que maneja el POS son enteros —`applyPromo` redondea el precio
 * unitario y el catálogo guarda enteros—, así que en la práctica la conversión
 * de entrada es exacta. El cuidado está por si deja de serlo.
 */

/** Escala monetaria: 2 decimales (centavos). Espejo de `Money.SCALE`. */
const CENTS = 100n

/** Escala intermedia del factor antes de dividir. Espejo de `Money.RATE_SCALE`. */
const RATE_SCALE = 1_000_000n

/**
 * División con redondeo HALF_UP, es decir alejándose del cero, que es el
 * `RoundingMode.HALF_UP` de Java —y NO lo que hace `Math.round`, que redondea
 * hacia +∞ y por tanto difiere en los negativos.
 *
 * El divisor es siempre una potencia de diez o un factor construido aquí, así
 * que se asume positivo; el signo lo pone el numerador.
 */
function divideHalfUp(numerator: bigint, denominator: bigint): bigint {
  const negative = numerator < 0n
  const a = negative ? -numerator : numerator
  const quotient = a / denominator
  const rounded = (a % denominator) * 2n >= denominator ? quotient + 1n : quotient
  return negative ? -rounded : rounded
}

/** Precisión de trabajo para los operandos antes de escalar el resultado. */
const WORK_SCALE = 6
const WORK_UNIT = 10n ** BigInt(WORK_SCALE)

/**
 * Número → entero a la escala pedida, redondeando HALF_UP.
 *
 * Se pasa por la representación decimal (`toFixed`) en vez de multiplicar por
 * una potencia de diez: `valor * 100` arrastra el error binario justo en el
 * punto donde se decide el redondeo, que es lo que hace divergir al front del
 * backend.
 */
function toScaled(value: number, decimals: number): bigint {
  if (!Number.isFinite(value)) return 0n
  const negative = value < 0
  const [whole, fraction = ''] = Math.abs(value)
    .toFixed(decimals + 1)
    .split('.')
  // `toFixed(decimals + 1)` garantiza que hay exactamente ese número de
  // decimales, así que el dígito de decisión siempre existe.
  const truncated = BigInt(whole) * 10n ** BigInt(decimals) + BigInt(fraction.slice(0, decimals))
  const carry = Number(fraction[decimals]) >= 5 ? 1n : 0n
  const scaled = truncated + carry
  return negative ? -scaled : scaled
}

/** Pesos → centavos, redondeando HALF_UP a 2 decimales. */
export function toCents(pesos: number): bigint {
  return toScaled(pesos, 2)
}

/** Centavos → pesos. */
export function fromCents(cents: bigint): number {
  return Number(cents) / 100
}

/** Redondea a escala monetaria (2 decimales, HALF_UP). Espejo de `Money.scaled`. */
export function scaled(value: number): number {
  return fromCents(toCents(value))
}

/**
 * Producto a escala monetaria. Espejo de `Money.multiply`.
 *
 * Los operandos NO se redondean a centavos antes de multiplicar: el backend
 * multiplica con la precisión que traen y escala el RESULTADO. Redondear antes
 * da otro número —`3 × 0,335` sería 3 × 0,34 = 1,02 en vez de 1,01—, que es
 * justo el tipo de desacuerdo que este módulo existe para eliminar.
 */
export function multiply(a: number, b: number): number {
  const product = toScaled(a, WORK_SCALE) * toScaled(b, WORK_SCALE)
  return fromCents(divideHalfUp(product, (WORK_UNIT * WORK_UNIT) / CENTS))
}

/**
 * Suma a escala monetaria. No es `reduce((a, b) => a + b)`: sumar en coma
 * flotante importes con decimales acumula error línea a línea, y un ticket de
 * veinte líneas es exactamente donde se nota.
 */
export function sum(values: readonly number[]): number {
  return fromCents(values.reduce<bigint>((acc, value) => acc + toCents(value), 0n))
}

/**
 * Extrae la base gravable de un total CON impuesto incluido:
 * `base = total / (1 + pct/100)`. Espejo exacto de `Money.extractBase`,
 * incluida la escala intermedia de 6 decimales del factor.
 *
 * `pct` nulo, cero o negativo → el total ya es la base.
 */
export function extractBase(total: number, percentage: number | null | undefined): number {
  // El backend NO cortocircuita ante una tarifa negativa: produce una base
  // MAYOR que el total (está documentado en su propio MoneyTest). Aquí sí se
  // corta, a propósito: una tarifa negativa es un dato imposible, y mostrarle
  // al cajero una base gravable por encima de lo que cobra sería peor que
  // ignorarla. Es la única divergencia deliberada con `Money.java`.
  if (percentage == null || percentage <= 0) return scaled(total)
  // factor = (1 + pct/100) a 6 decimales, HALF_UP — igual que
  // `BigDecimal.ONE.add(percentage.divide(HUNDRED, RATE_SCALE, ROUND))`.
  const factor = RATE_SCALE + divideHalfUp(toScaled(percentage, WORK_SCALE), 100n)
  return fromCents(divideHalfUp(toCents(total) * RATE_SCALE, factor))
}

/**
 * Impuesto contenido en un total que ya lo incluye: `total − base`. Es la misma
 * resta que hace el backend (`gross.subtract(base)`), y por eso base e impuesto
 * reconstruyen el total exactamente, sin centavo suelto.
 */
export function extractTax(total: number, percentage: number | null | undefined): number {
  return fromCents(toCents(total) - toCents(extractBase(total, percentage)))
}

/** Escala interna del porcentaje de descuento, igual que `PromotionPriceCalculator`. */
const DISCOUNT_SCALE = 10n
const DISCOUNT_UNIT = 10n ** DISCOUNT_SCALE

/**
 * Precio con descuento porcentual, ya redondeado a peso entero:
 * `round(basePrice × (1 − pct/100))`.
 *
 * Espejo de la rama PERCENTAGE de `PromotionPriceCalculator.candidate` seguida
 * de su `setScale(0, HALF_UP)`. Se hace en UNA sola pasada a propósito: separar
 * el cálculo del redondeo obliga a fijar una escala intermedia, y redondear dos
 * veces desvía el resultado —97 con 66,5 % da 32,495, que a pesos es 32, pero
 * pasando por centavos son 32,50 y de ahí 33—.
 *
 * En coma flotante el resultado se desvía un peso en el 0,2 % de las
 * combinaciones: `1 − 33/100` vale 0,6699999999999999, así que 150 × eso da
 * 100,49999999999999 y `Math.round` baja a 100 donde el valor exacto es 100,5.
 * Esa desviación es justo la que venía absorbiendo el `PRICE_TOLERANCE` de un
 * peso del servidor.
 */
export function discountedUnitPrice(basePrice: number, percentage: number): number {
  const rate = divideHalfUp(toScaled(percentage, WORK_SCALE) * DISCOUNT_UNIT, 100n * WORK_UNIT)
  const remaining = DISCOUNT_UNIT - rate
  return Number(divideHalfUp(toCents(basePrice) * remaining, CENTS * DISCOUNT_UNIT))
}

/**
 * Redondea a peso entero con HALF_UP, para importes que ya vienen a escala
 * monetaria. Es lo que hace el servidor al fijar el precio canónico
 * (`setScale(0, HALF_UP)`).
 */
export function roundToUnit(value: number): number {
  return Number(divideHalfUp(toCents(value), CENTS))
}
