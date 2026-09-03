import { http } from '@/services/http/http.client'
import type { SelfServeQuoteLineRequest } from '@/features/suscripcion/types/cotizaciones.types'
import type {
  CotizacionPreview,
  LineaCotizacion,
  PreviewQuoteRequest,
  QuotePreviewLineResponse,
  QuotePreviewResponse,
} from '../types/cotizacion.types'
import type { Ciclo } from '../types/plans.types'

/**
 * EL SEAM DE LA CALCULADORA PÚBLICA.
 *
 * Es la única función de todo el front que sabe de dónde sale el importe que la
 * portada publica, y sale de `POST /quotes/preview`: público, anónimo, sin
 * persistir nada.
 *
 * ── Por qué el importe no se suma aquí ──────────────────────────────────────
 * La escalera de tramos **no se publica** —es la política de descuento por
 * volumen— y `GET /catalog` solo trae el tramo de entrada. Con eso un cliente no
 * puede hacer más que extrapolar: quince usuarios le salen 156.000 y la
 * cotización cobra 141.000. Este endpoint responde con el mismo código que
 * congela una oferta real, así que la cifra de la portada y la del contrato son
 * la misma por construcción y no por coincidencia.
 *
 * ── Lo que el front NO puede averiguar del rechazo ──────────────────────────
 * Todos los 400 llegan con el mismo cuerpo (`INVALID_INPUT`, «Los datos enviados
 * no son válidos.»): rótulo desconocido, paquete junto a una pieza suya, cesta
 * sin lo que un `REQUIRES` exige, cantidad fuera de rango. Es deliberado —el
 * mensaje no puede convertirse en un oráculo del catálogo— y tiene una
 * consecuencia de diseño para quien llame: **las cestas incoherentes se evitan
 * antes de pedir**, con `componentCodes` y con los arcos del catálogo, porque
 * después ya no hay nada que diagnosticar.
 */

/**
 * El vocabulario del contrato, que no sale de los seams.
 *
 * <p>Su gemelo vive en `contratacion.source.ts` por el mismo motivo. Son dos
 * mapas de dos entradas y el tipo impide que diverjan: un ciclo nuevo en `Ciclo`
 * no compila hasta que los dos lo traducen.
 */
const CICLO_DEL_CONTRATO: Readonly<Record<Ciclo, 'MONTHLY' | 'ANNUAL'>> = {
  MENSUAL: 'MONTHLY',
  ANUAL: 'ANNUAL',
}

const CICLO_DE_PANTALLA: Readonly<Record<'MONTHLY' | 'ANNUAL', Ciclo>> = {
  MONTHLY: 'MENSUAL',
  ANNUAL: 'ANUAL',
}

function comoLinea(l: QuotePreviewLineResponse): LineaCotizacion {
  return {
    code: l.code,
    nombre: l.name,
    contratadas: l.contractedQuantity,
    incluidas: l.includedQuantity,
    cobradas: l.quantity,
    importeUnitario: l.unitAmount,
    importe: l.grossAmount,
    taxRate: l.taxRate,
    taxTreatment: l.taxTreatment,
    impuesto: l.taxAmount,
    total: l.lineTotal,
  }
}

/**
 * Traduce la respuesta del contrato a la cotización que ven las pantallas.
 *
 * <p>Exportada a propósito, como `componer` en el catálogo: es la mitad del seam
 * que se prueba sin fingir una red.
 */
export function componerCotizacion(respuesta: QuotePreviewResponse): CotizacionPreview {
  return {
    moneda: respuesta.currency,
    ciclo: CICLO_DE_PANTALLA[respuesta.billingCycle],
    lineas: respuesta.lines.map(comoLinea),
    subtotal: respuesta.subtotalAmount,
    descuento: respuesta.discountAmount,
    impuesto: respuesta.taxAmount,
    total: respuesta.totalAmount,
  }
}

export interface CotizacionArgs {
  ciclo: Ciclo
  lineas: SelfServeQuoteLineRequest[]
}

/**
 * Cuánto costaría esta selección.
 *
 * @param signal
 *            corta la petición anterior cuando el usuario sigue marcando
 *            casillas. Aquí la petición tiene un único dueño —el cotizador de la
 *            pantalla— así que abortar además de descartar ahorra el viaje, y
 *            ese viaje cuenta contra el límite por IP.
 */
export async function previsualizarCotizacion(
  args: CotizacionArgs,
  signal?: AbortSignal,
): Promise<CotizacionPreview> {
  const cuerpo: PreviewQuoteRequest = {
    billingCycle: CICLO_DEL_CONTRATO[args.ciclo],
    lines: args.lineas,
  }

  // Sin velo global: esto se dispara con cada casilla de la portada, y un
  // overlay `inset: 0` sobre el primer pliegue por cada clic es la peor primera
  // impresión posible. El bloque de precio tiene sus propios estados.
  const { data } = await http.post<QuotePreviewResponse>('/quotes/preview', cuerpo, {
    signal,
    skipGlobalLoader: true,
  })

  return componerCotizacion(data)
}

/**
 * ¿El servidor dijo que se agotó el cupo de cotizaciones?
 *
 * <p>**Se trata aparte de cualquier otro fallo, y no es cosmética.** Un error de
 * red se reintenta solo con el siguiente cambio de casilla; un 429 no: reintentar
 * dentro de la ventana falla de forma determinista y además la alarga. El
 * cotizador tiene que dejar de pedir durante {@link segundosDeEspera} y decirlo,
 * en vez de enseñar «no pudimos calcular» y seguir gastando cupo.
 *
 * <p>Por el `status` **y** el código de negocio, nunca por el mensaje: el `detail`
 * es copy del servidor y compararlo apagaría esta rama el día que alguien lo
 * reescriba.
 */
export function esLimiteDeCotizaciones(error: unknown): boolean {
  const respuesta = (error as { response?: { status?: number; data?: { code?: string } } })
    ?.response
  return respuesta?.status === 429 && respuesta.data?.code === 'QUOTE_PREVIEW_RATE_LIMITED'
}

/**
 * Cuántos segundos pide esperar el servidor, leídos de `Retry-After`.
 *
 * <p>`null` cuando la cabecera no llega o no es un entero de segundos. El
 * llamador decide entonces cuánto espera; lo que no puede es adivinar a la baja,
 * porque un plazo optimista invita a un reintento que va a fallar seguro.
 */
export function segundosDeEspera(error: unknown): number | null {
  const cabeceras = (error as { response?: { headers?: Record<string, string | undefined> } })
    ?.response?.headers
  const crudo = cabeceras?.['retry-after']
  if (!crudo) return null
  const segundos = Number.parseInt(crudo, 10)
  return Number.isFinite(segundos) && segundos > 0 ? segundos : null
}
