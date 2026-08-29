/**
 * Dinero: aritmética y formato, en un solo sitio para toda la aplicación.
 *
 * <p><b>Es la única fuente del formato.</b> `features/tienda/composables/pricing.ts` tenía una
 * segunda implementación completa de `formatMoney` y `formatMoneyExact` —secuela de que este
 * fichero se sobrescribiera por error mientras se implantaba «Mi suscripción» y se
 * reconstruyera a partir de sus consumidores—. Hoy `pricing.ts` **reexporta estas dos**, así que
 * medio repositorio puede seguir importándolas de allí sin que existan dos verdades sobre
 * cuántos decimales lleva un importe.
 *
 * <p>La aritmética no se reimplementa: se reexporta de `features/tienda/composables/money`, que
 * es el puerto de `com.vetsoftware.app.shared.domain.Money` en `bigint` y la autoridad fiscal
 * del front. Duplicarla aquí sería crear una segunda verdad sobre el redondeo, que es
 * exactamente lo que ese módulo existe para impedir.
 */
export {
  discountedUnitPrice,
  extractBase,
  extractTax,
  fromCents,
  multiply,
  roundToUnit,
  scaled,
  sum,
  toCents,
} from '@/features/tienda/composables/money'

const moneyFmt = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

/**
 * Importe a pesos enteros. Es lo correcto para el ticket, para el carrito y para las cuentas de
 * cobro: en Colombia no circulan centavos y un recibo con decimales confunde al cliente.
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
 * Importe con centavos, para desgloses fiscales: base gravable e IVA por tarifa, que es lo que
 * tiene que cuadrar con el documento electrónico. Aquí esconder los centavos sería esconder
 * precisamente lo que se está comprobando.
 */
export function formatMoneyExact(n: number): string {
  return moneyExactFmt.format(Number.isFinite(n) ? n : 0)
}
