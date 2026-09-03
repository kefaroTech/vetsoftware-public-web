/**
 * Los tipos de la calculadora pública (`POST /quotes/preview`).
 *
 * <p>Dos mitades, como en `catalogo.types.ts`: arriba lo que viaja por el cable
 * —atado al contrato en `api.contract.ts`— y abajo lo que ven las pantallas. La
 * frontera existe porque el vocabulario del contrato no sale del seam: ningún
 * componente conoce `MONTHLY`, y el rótulo del selector sigue siendo `Ciclo`.
 *
 * <p><b>Aquí no hay ni una cifra que este front pueda calcular.</b> El servidor
 * devuelve el desglose con el mismo código que congela una oferta real, tramos
 * por volumen incluidos, y esa es toda la razón por la que el endpoint existe: la
 * escalera de precios no se publica, así que multiplicar el tramo de entrada da
 * un número distinto del que se va a cobrar.
 */
import type { SelfServeQuoteLineRequest } from '../../suscripcion/types/cotizaciones.types'
import type { Ciclo, TaxTreatment } from './plans.types'

/**
 * `POST /quotes/preview`. No persiste nada y no crea ninguna oferta.
 *
 * <p>`lines` es `@NotEmpty` en el borde REST: una cesta vacía se rechaza con el
 * mismo 400 mudo que todo lo demás. La línea del núcleo siempre está, así que el
 * caso no puede darse desde el cotizador — pero el tipo no lo puede afirmar.
 *
 * <p>Reutiliza `SelfServeQuoteLineRequest` en vez de declarar una línea propia:
 * el esquema del contrato es literalmente el mismo (`PreviewQuoteRequest.lines`
 * apunta a `SelfServeQuoteLineRequest`), y una segunda copia sería la que se
 * quedaría atrás el día que la línea gane un campo.
 *
 * <p>Espeja `PreviewQuoteRequest`.
 */
export interface PreviewQuoteRequest {
  billingCycle: 'MONTHLY' | 'ANNUAL'
  lines: SelfServeQuoteLineRequest[]
}

/**
 * Un renglón del desglose: **un tramo**, no un artículo.
 *
 * <p>Un artículo con escalera acumulativa produce varios renglones con el mismo
 * `code` —trece usuarios extra salen como 8 a un precio y 5 a otro—, así que
 * indexar por `code` pierde líneas. Se recorre en orden.
 *
 * <p>Los cinco primeros campos son los que el contrato garantiza; los seis
 * importes son opcionales ahí y aquí se declaran nulables por eso. No se aplanan
 * a cero: un `$ 0` se lee como «no cuesta nada» y aquí significaría «el servidor
 * no lo dijo».
 *
 * <p>Espeja `QuotePreviewLineResponse`.
 */
export interface QuotePreviewLineResponse {
  code: string
  name: string
  /** Lo que se contrató de ese artículo. */
  contractedQuantity: number
  /** Lo que la tarifa ya incluye y no se cobra. */
  includedQuantity: number
  /** Las unidades que caen en ESTE tramo. */
  quantity: number
  unitAmount: number | null
  grossAmount: number | null
  taxRate: number | null
  taxTreatment: TaxTreatment | null
  taxAmount: number | null
  lineTotal: number | null
}

/**
 * El desglose y los cuatro totales de una selección, en la tarifa vigente hoy.
 *
 * <p>Espeja `QuotePreviewResponse`.
 */
export interface QuotePreviewResponse {
  /** ISO-4217 de la tarifa vigente. */
  currency: string
  billingCycle: 'MONTHLY' | 'ANNUAL'
  lines: QuotePreviewLineResponse[]
  subtotalAmount: number
  discountAmount: number
  taxAmount: number
  totalAmount: number
}

/* ────────────────────────────────────────────────────────────────────────────
 * A partir de aquí: la cotización COMO LA VE LA PANTALLA.
 * ──────────────────────────────────────────────────────────────────────────── */

/** Un renglón del desglose, con el vocabulario de la pantalla. */
export interface LineaCotizacion {
  code: string
  nombre: string
  contratadas: number
  incluidas: number
  /** Las unidades de este tramo, que son las que se cobran en él. */
  cobradas: number
  importeUnitario: number | null
  /** Lo que suma el tramo antes de impuesto. */
  importe: number | null
  taxRate: number | null
  taxTreatment: TaxTreatment | null
  impuesto: number | null
  total: number | null
}

/**
 * Lo que costaría la selección. **Es la única fuente del importe publicado.**
 *
 * <p>`subtotal` es lo que la portada enseña como cifra grande («desde X + IVA»),
 * y `total` lo que se pagaría con impuesto. Los dos vienen del servidor.
 */
export interface CotizacionPreview {
  moneda: string
  ciclo: Ciclo
  lineas: LineaCotizacion[]
  subtotal: number
  descuento: number
  impuesto: number
  total: number
}
