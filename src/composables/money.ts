/**
 * Dinero: aritmética y formato, en un solo sitio para toda la aplicación.
 *
 * <p><b>Aviso de reconstrucción.</b> Este fichero lo creó el frente de `landing` /
 * `contratacion` y quedó sobrescrito por error mientras se implantaba «Mi suscripción». Se ha
 * reconstruido a partir de sus consumidores reales —`planPricing.ts` usa `money.scaled`,
 * `money.multiply` y `money.sum`; siete componentes de `landing` y `contratacion` importan
 * `formatMoney`—, así que la superficie pública que necesitan está cubierta, pero **puede no
 * ser byte a byte la original**: no llegó a versionarse y no hay copia en HEAD de la que
 * partir. Si el frente de `landing` tenía aquí algo más, hay que volver a añadirlo.
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
