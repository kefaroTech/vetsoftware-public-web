import { http } from '@/services/http/http.client'
import { OVERLAY_EDITORIAL } from '../content/plans.content'
import type {
  PublicCatalog,
  PublicPlan,
  PublicPlanCatalogWire,
  PublicPlanContract,
} from '../types/plans.types'

/**
 * EL SEAM del catálogo público, ya cortado a la red.
 *
 * Es la única función de todo el front que sabe de dónde salen los planes.
 *
 * ── El defecto que cierra ───────────────────────────────────────────────────
 * Hasta aquí esta función devolvía `PLANS_CONTENT`, contenido local con tres
 * importes escritos a mano, y no consultaba ningún endpoint. Comprobado contra
 * dev: sin lista de precio publicada el servidor responde **200 con la lista
 * vacía** —un estado normal del negocio, no una avería—, y la landing seguía
 * enseñando precios y dejando avanzar a contratar. Es la clase de mentira que se
 * descubre cuando alguien intenta pagar.
 *
 * ── Qué pone el servidor y qué pone el front ────────────────────────────────
 * El dinero es del servidor, sin excepción: `monthlyFromAmount`,
 * `annualFromAmount`, `setupAmount`, `taxRate`, `taxTreatment`, la moneda, la
 * fecha de vigencia y los importes por unidad adicional de cada capacidad.
 * También lo son el `name`, los `includes` con sus días de prueba y las
 * `capacities`, que salen de `bundle_components` y de la tarifa: eso hace que lo
 * que la tarjeta enumera y lo que la factura cobra dejen de poder divergir.
 *
 * <p>Del front queda solo el mensaje, en {@link OVERLAY_EDITORIAL}: qué paquete
 * se destaca (`recommended` no existe en el contrato, y no debe) y la corrección
 * de un `tagline` que en la semilla es una nota de modelado. El orden NO se
 * decide aquí: llega en el `sort_order` del servidor y se respeta.
 *
 * ── ⚠️ POR QUÉ SE DESCARTAN PLANES, Y QUÉ CUESTA ────────────────────────────
 * `SQL_PLANS` resuelve cada ciclo con su propio `LEFT JOIN` y solo exige que
 * exista **alguno** de los dos, así que un paquete tarifado solo al año llega con
 * `monthlyFromAmount: null`. El javadoc de `PublicPlanResponse` lo dice: «
 * cualquiera de los dos puede ser nulo si el paquete solo esta tarifado en un
 * ciclo».
 *
 * <p>Esta pantalla ofrece los dos ciclos en un selector, calcula el ahorro anual
 * restando uno del otro y no tiene forma de bloquear «continuar» para un ciclo
 * concreto. Un plan a medias se pintaría con `—` en el ciclo que le falta y
 * dejaría contratar igual, y `findPublishedIdByCode` lo rechazaría después con
 * un error que no explica nada — exactamente la mentira que este cambio quita,
 * mudada de sitio. Así que {@link publicable} lo descarta entero.
 *
 * <p><b>Lo que eso cuesta, dicho claro:</b> un paquete que solo se venda en un
 * ciclo desaparecería de la portada en vez de ofrecerse en el ciclo que sí
 * tiene. Hoy no descarta a nadie —los tres `PACK_*` están tarifados en los dos
 * ciclos, changeset 310, 64 precios = 32 tramos × 2— así que es un guardarraíl,
 * no un filtro activo. Ofrecer el plan solo en su ciclo bueno es la alternativa
 * correcta, y **es más trabajo del que cabe aquí**: obliga a meter el precio base
 * en `DesgloseEstimado.sinPrecio` (hoy tipado `CapacityUnit[]`, que no sabe
 * nombrar «el plan»), a extender `textoSinPrecio` y a bloquear el botón por
 * ciclo. Queda dicho a propósito para que sea una decisión y no un descubrimiento.
 *
 * <p>`taxRate` entra en el mismo filtro porque `calcularEstimado` lo multiplica
 * para sacar el impuesto: un `null` ahí da `NaN` y un `?? 0` afirmaría «no lleva
 * IVA», que es una afirmación sobre dinero que nadie ha hecho. `setupAmount` y
 * `taxTreatment` NO entran: no los pinta ni los calcula nadie, y descartar un
 * plan vendible por un dato que esta pantalla no usa sería el error del revés.
 */

/**
 * Una cifra del cable, o `null`.
 *
 * <p>No basta con `=== null`: springdoc declara estos campos opcionales, así que
 * la respuesta puede **omitirlos** y llegar como `undefined`. Y `Number.isFinite`
 * descarta además el `NaN` que produciría un `BigDecimal` serializado como texto
 * — un importe que no es un número es un importe que no hay, no un cero.
 */
function cifra(valor: number | null | undefined): number | null {
  return typeof valor === 'number' && Number.isFinite(valor) ? valor : null
}

/**
 * El plan del cable convertido en plan de pantalla, o `null` si no se puede
 * publicar honestamente. Ver la nota de descarte del encabezado.
 */
function publicable(plan: PublicPlanContract): PublicPlan | null {
  const mensual = cifra(plan.monthlyFromAmount)
  const anual = cifra(plan.annualFromAmount)
  const impuesto = cifra(plan.taxRate)
  if (mensual === null || anual === null || impuesto === null) return null

  const editorial = OVERLAY_EDITORIAL[plan.code]
  return {
    ...plan,
    monthlyFromAmount: mensual,
    annualFromAmount: anual,
    taxRate: impuesto,
    // La cadena vacía es el último recurso y NO un relleno: `tagline` es
    // decorativo —el nombre del plan va en su propio elemento— así que un
    // paquete sin descripción se pinta sin ella en vez de desaparecer.
    tagline: editorial?.tagline ?? plan.tagline ?? '',
    recommended: editorial?.recommended ?? false,
  }
}

/**
 * La traducción, expuesta aparte de la petición para poder probarla sin red.
 *
 * <p>`plans` se defiende con `?? []` aunque el contrato lo declare requerido: es
 * lo único que separa un cuerpo inesperado de un `TypeError` en la portada.
 */
export function componer(respuesta: PublicPlanCatalogWire): PublicCatalog {
  return {
    currency: respuesta.currency ?? null,
    priceValidFrom: respuesta.priceValidFrom ?? null,
    plans: (respuesta.plans ?? []).map(publicable).filter((p): p is PublicPlan => p !== null),
  }
}

/**
 * El catálogo público de planes.
 *
 * <p>`GET /plans` es público y sin token (`PublicRoutes.BUSINESS`, patrón
 * literal), y devuelve 200 con la lista vacía cuando no hay tarifa vigente
 * — nunca 404, para que la portada siga cargando. Ese vacío NO es un error y no
 * se convierte en uno: viaja como catálogo cargado y sin planes, y la pantalla
 * tiene su propio estado para decirlo.
 *
 * <p>El velo global no se levanta aquí, por el mismo motivo que en
 * `catalogo.source.ts`: esto se carga al montar la portada y `/planes`, que es lo
 * primero que ve un visitante anónimo, y un overlay `inset: 0` con
 * `cursor: wait` encima es la peor primera impresión posible. La sección ya tiene
 * sus tres estados escritos para no necesitarlo.
 */
export async function fetchPlans(signal?: AbortSignal): Promise<PublicCatalog> {
  if (signal?.aborted) throw signal.reason instanceof Error ? signal.reason : new Error('cancelado')

  const { data } = await http.get<PublicPlanCatalogWire>('/plans', {
    signal,
    skipGlobalLoader: true,
  })

  return componer(data)
}
