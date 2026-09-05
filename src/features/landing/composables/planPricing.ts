import { formatMoney } from '@/composables/money'
import type { ArticuloCatalogo, CatalogoComercial } from '@/features/asistente/types/catalogo.types'
import { cestaDeCotizacion, type SeleccionCotizador } from './cotizadorLineas'
import {
  CAPACITY_UNIT_LABEL,
  type CapacityUnit,
  type Ciclo,
  type PublicPlan,
} from '../types/plans.types'

/**
 * Cálculo ORIENTATIVO del precio de un plan. Funciones puras, sin estado y sin
 * red: son las mismas que alimentan el resumen de `/planes`, el carril del paso
 * de registro y la comparación contra el importe del servidor en el paso 6.
 *
 * No vive en `features/tienda/composables/pricing.ts` (el núcleo monetario del
 * punto de venta) ni en `composables/format.ts`: esto es vocabulario de una
 * feature —tramos de capacidad de una lista de precio comercial— y ese es el
 * criterio del repo para no volver a acumular tres módulos con la misma cuenta
 * escrita de tres maneras. Lo que sí se reutiliza es la aritmética de dinero,
 * que es común.
 *
 * **Nada de lo que sale de aquí es vinculante.** Es el precio de lista
 * transcrito en el front (ver el sello de `content/plans.content.ts`) y se
 * rotula siempre «desde» / «estimado». El importe que obliga lo calcula el
 * servidor en el paso de contratación.
 */

/**
 * La moneda en la que factura la plataforma, para rotularla **a nivel de pantalla**.
 *
 * ── Por qué esto es legítimo y una etiqueta por celda no lo era ────────────
 * `PublicPlanResponse` y `PublicPlanCapacityResponse` no declaran moneda: sus importes son
 * números pelados. Escribir «este importe es COP» junto a cada cifra sería **inferir de un dato
 * que no la lleva** — la afirmación se colgaría de la fila, y una fila que un día llegue en otra
 * moneda seguiría rotulando COP con toda la confianza del mundo. Eso ya pasó aquí: un
 * `formatCurrency` por celda afirmaba COP renglón a renglón y además imprimía otro número de
 * decimales que las pantallas vecinas. No se reintroduce; las celdas se quedan como están, con
 * `formatMoney`.
 *
 * Decir «esta plataforma factura en pesos colombianos» es otra cosa: es un hecho **estructural**
 * del producto, no una lectura de la respuesta. La geografía está sembrada solo con Colombia
 * (1 país, 33 departamentos, 1.121 municipios DIVIPOLA) y todo el modelo monetario es UVT,
 * SMMLV, retenciones DIAN y declaraciones colombianas. Por eso la afirmación vive aquí, en una
 * constante, y se pinta una vez por pantalla — donde es verdad — y no una vez por número, donde
 * no lo sería.
 *
 * <p>Y por eso tampoco se saca de `PublicPlanCatalogResponse.currency`, que sí existe: ese campo
 * es `null` cuando no hay tarifa vigente, así que como fuente de un rótulo de pantalla es un
 * hueco intermitente. Si algún día la plataforma facturara en más de una moneda, ese campo sería
 * la fuente correcta y esta constante tendría que morir; hoy afirmaría lo mismo con más partes
 * móviles.
 */
export const MONEDA_DE_FACTURACION = 'pesos colombianos (COP)'

/**
 * Redondeo a peso entero.
 *
 * **No** se usa el núcleo monetario en centavos de
 * `features/tienda/composables/money.ts`, y es deliberado: importarlo desde aquí
 * sería acoplar el escaparate al punto de venta, que es exactamente el
 * acoplamiento que el repo ya deshizo una vez subiendo `formatMoney` a
 * `composables/money.ts`. Y no hace falta: estos importes son precios de lista
 * en pesos enteros multiplicados por enteros pequeños, y la única operación con
 * decimales es el IVA, que se redondea aquí.
 *
 * La precisión al centavo importa donde el cálculo tiene que cuadrar con un
 * documento electrónico. Aquí no: esta cifra es ORIENTATIVA y se rotula como
 * tal, y la vinculante la calcula el servidor.
 */
function aPesos(valor: number): number {
  return Number.isFinite(valor) ? Math.round(valor) : 0
}

export interface SeleccionPlan {
  ciclo: Ciclo
  sedes: number
  usuarios: number
}

export interface DesgloseEstimado {
  /** Precio de entrada del plan en el ciclo elegido. */
  base: number
  /**
   * Lo que cuestan las sedes por encima de las incluidas, o `null` cuando se
   * cobran sedes de más y el catálogo NO publica su precio en el ciclo elegido.
   * Cero cuando no se cobra ninguna: ahí el precio da igual.
   */
  sedesExtra: number | null
  /** Lo que cuestan las personas por encima de las incluidas. Mismo `null` que arriba. */
  usuariosExtra: number | null
  /**
   * `base + sedesExtra + usuariosExtra`, sin impuesto, o `null` si a la suma le
   * falta un sumando. Un subtotal al que le falta un sumando no es un subtotal,
   * y rellenarlo con el que sí se conoce sería un importe más bajo que el real.
   */
  subtotal: number | null
  /** Impuesto sobre el subtotal, con la tarifa del plan. `null` si el subtotal lo es. */
  impuesto: number | null
  /** `subtotal + impuesto`. `null` si el subtotal lo es. */
  total: number | null
  /** Cuántas sedes se cobran aparte. Cero cuando todas están incluidas. */
  sedesCobradas: number
  /** Cuántas personas se cobran aparte. */
  usuariosCobrados: number
  /**
   * Los ejes que SE COBRAN aparte y no tienen precio publicado en el ciclo
   * elegido. Vacío en el caso normal. La pantalla lo usa para decir qué falta y
   * por qué no hay cifra, en vez de pintar un hueco sin explicación.
   */
  sinPrecio: CapacityUnit[]
}

function incluidas(plan: PublicPlan, unit: 'USER' | 'BRANCH'): number {
  return plan.capacities.find((c) => c.unit === unit)?.included ?? 0
}

/**
 * El precio de la unidad adicional EN EL CICLO PEDIDO, o `null` si no lo hay.
 *
 * Antes esto devolvía un único importe —mensual sin decirlo— y `calcularEstimado`
 * fabricaba el anual multiplicándolo por diez, la misma proporción que el precio
 * base. La simetría sonaba razonable y no lo era: el servidor cobra la capacidad
 * extra con la escalera `ANNUAL` del propio artículo, que no tiene ningún motivo
 * para valer diez mensualidades. Lo que se le enseñaba al cliente no era una
 * aproximación del importe anual, era un número sin relación con él.
 *
 * <p>Los dos casos que devuelven `null` —el plan no vende ese eje, o lo vende
 * pero sin precio en ese ciclo— se colapsan a propósito: para la pantalla los dos
 * significan lo mismo, «no hay precio publicado para esa unidad adicional en este
 * ciclo». El `?? 0` anterior los colapsaba también, pero en «cero pesos», que es
 * una afirmación de precio que nadie hizo.
 */
function precioExtra(plan: PublicPlan, unit: 'USER' | 'BRANCH', ciclo: Ciclo): number | null {
  const capacidad = plan.capacities.find((c) => c.unit === unit)
  if (!capacidad) return null
  return ciclo === 'ANUAL' ? capacidad.annualExtraUnitAmount : capacidad.monthlyExtraUnitAmount
}

/**
 * Lo que cuesta un eje, `0` si no se cobra ninguna unidad y `null` si se cobran
 * pero no hay precio. El orden importa: primero «no se cobra nada», que hace
 * irrelevante el precio, y solo después «no hay precio».
 */
function costeExtra(
  plan: PublicPlan,
  unit: 'USER' | 'BRANCH',
  ciclo: Ciclo,
  cobradas: number,
): number | null {
  if (cobradas <= 0) return 0
  const precio = precioExtra(plan, unit, ciclo)
  return precio === null ? null : aPesos(precio * cobradas)
}

/** El precio de entrada del plan en el ciclo pedido. */
export function precioBase(plan: PublicPlan, ciclo: Ciclo): number {
  return ciclo === 'ANUAL' ? plan.annualFromAmount : plan.monthlyFromAmount
}

/**
 * Lo que se ahorra pagando un año por adelantado, en pesos: doce mensualidades
 * menos el precio anual. Se calcula, NO se declara en el contenido: si alguien
 * cambia un precio y se olvida del otro, la cifra del ahorro se mueve sola en
 * vez de mentir.
 */
export function ahorroAnual(plan: PublicPlan): number {
  return aPesos(plan.monthlyFromAmount * 12 - plan.annualFromAmount)
}

/**
 * Una base gravable con el impuesto del plan dentro.
 *
 * <p>El redondeo es en dos pasos —primero el impuesto, después la suma— y no en
 * uno: es la misma cuenta que ya hacía {@link calcularEstimado}, y colapsarla a
 * un solo redondeo mueve algunos importes un peso.
 */
export function totalConImpuesto(plan: PublicPlan, subtotal: number): number {
  return aPesos(subtotal + impuestoDe(subtotal, plan.taxRate))
}

/** El impuesto de una base gravable a un tipo, con el redondeo al peso del módulo. */
function impuestoDe(base: number, tasa: number): number {
  return aPesos((base * tasa) / 100)
}

/**
 * Desglose orientativo de una selección.
 *
 * <p>Cada ciclo lee SU precio de unidad adicional (`monthlyExtraUnitAmount` /
 * `annualExtraUnitAmount`) y no hay ninguna conversión entre ellos. La versión
 * anterior fabricaba el anual como `mensual × 10` para que subir una sede no
 * saliera diez veces más barato al año que al mes; la incoherencia que evitaba
 * era real, pero la cifra con la que la evitaba no lo era. Hoy los dos importes
 * los publica el catálogo, así que la coherencia entre ciclos es un problema de
 * la lista de precio y no de esta función.
 *
 * <p>Cuando el ciclo elegido no tiene precio para una capacidad que SÍ se cobra,
 * el importe de ese eje y todo lo que dependa de él quedan en `null` y el eje
 * entra en `sinPrecio`. No se estima: el servidor rechazaría esa contratación,
 * así que anunciarle un número al cliente sería prometer algo que la pantalla
 * siguiente le niega.
 */
export function calcularEstimado(plan: PublicPlan, seleccion: SeleccionPlan): DesgloseEstimado {
  const sedesCobradas = Math.max(0, Math.trunc(seleccion.sedes) - incluidas(plan, 'BRANCH'))
  const usuariosCobrados = Math.max(0, Math.trunc(seleccion.usuarios) - incluidas(plan, 'USER'))

  const base = precioBase(plan, seleccion.ciclo)
  const sedesExtra = costeExtra(plan, 'BRANCH', seleccion.ciclo, sedesCobradas)
  const usuariosExtra = costeExtra(plan, 'USER', seleccion.ciclo, usuariosCobrados)

  const sinPrecio: CapacityUnit[] = []
  if (sedesExtra === null) sinPrecio.push('BRANCH')
  if (usuariosExtra === null) sinPrecio.push('USER')

  const subtotal =
    sedesExtra === null || usuariosExtra === null ? null : aPesos(base + sedesExtra + usuariosExtra)
  const impuesto = subtotal === null ? null : impuestoDe(subtotal, plan.taxRate)

  return {
    base,
    sedesExtra,
    usuariosExtra,
    subtotal,
    impuesto,
    total: subtotal === null ? null : totalConImpuesto(plan, subtotal),
    sedesCobradas,
    usuariosCobrados,
    sinPrecio,
  }
}

/**
 * El importe MENSUAL equivalente de una selección, sin impuesto.
 *
 * Es lo que se guarda en la intención (`importeVistoMensual`) y lo que se
 * compara luego contra el servidor. Se normaliza a mensual a propósito: si se
 * guardara el importe del ciclo elegido, cambiar de mensual a anual entre una
 * sesión y otra se leería como una subida de precio del 900 %.
 *
 * <p>`null` cuando el ciclo MENSUAL no publica precio de una capacidad que se
 * cobra. Se propaga en vez de aplanarse a cero porque es lo que se guarda para
 * comparar después: un cero guardado como «lo que vio el usuario» hace saltar el
 * aviso de deriva de precio contra una cifra que nadie vio nunca.
 */
export function subtotalMensualEquivalente(
  plan: PublicPlan,
  seleccion: SeleccionPlan,
): number | null {
  const mensual = calcularEstimado(plan, { ...seleccion, ciclo: 'MENSUAL' })
  return mensual.subtotal
}

/** Sufijo del rótulo del precio según el ciclo. Nunca se muestra el enum crudo. */
export function sufijoCiclo(ciclo: Ciclo): string {
  return ciclo === 'ANUAL' ? 'al año' : 'al mes'
}

/**
 * Solo puede acompañar a un `total`, nunca a un subtotal: «IVA incluido» sobre
 * una cifra es una afirmación tributaria, y el subtotal es la base gravable.
 *
 * <p>El porcentaje se escribe SOLO cuando la tarifa lo publica y es uno solo
 * para la cesta entera. Una que mezcla `TAXED` con `EXEMPT` o `EXCLUDED` no
 * tiene un tipo que describa su total —«(19 %)» al lado de la cifra afirma que
 * el total es la base por 1,19— y deducir uno dividiendo impuesto entre base
 * inventaría una escala que nadie declaró: ahí se dice «IVA» sin cifra, que es
 * el criterio que `ContratarResumenTabla` ya aplica sobre el mismo dato.
 */
export function sufijoConImpuesto(ciclo: Ciclo, tasa: number | null = null): string {
  return `${sufijoCiclo(ciclo)}, IVA incluido${tasa === null ? '' : ` (${tasa} %)`}`
}

/** Lo que costaría una selección del catálogo, con el impuesto ya dentro. */
export interface EstimacionCatalogo {
  /** Base gravable de la cesta, o `null` si a la suma le falta un precio. */
  subtotal: number | null
  impuesto: number | null
  total: number | null
  /**
   * El tipo al que tributa la cesta ENTERA, cuando es uno solo. `null` si
   * conviven varios, si algo va exento o excluido, o si nada tributa: es lo que
   * decide si el rótulo puede llevar porcentaje.
   */
  tasa: number | null
}

/** Lo único que hace falta de un artículo para sumarlo: su precio y cómo tributa. */
type Tributable = Pick<ArticuloCatalogo, 'importe' | 'taxRate' | 'taxTreatment'>

/**
 * El tipo que se le aplica a una línea: el suyo si tributa, cero si no.
 *
 * <p>El tratamiento sin declarar **con tipo publicado sí se cobra**. La tarifa
 * trae un tipo porque algo grava, y tomarlo por exento rebajaría el total — que
 * es justo el error que esta cifra existe para no cometer: un precio que se
 * queda corto se descubre al pagar, cuando ya se decidió.
 */
function tasaDe(articulo: Tributable): number {
  if (articulo.taxTreatment === 'EXEMPT' || articulo.taxTreatment === 'EXCLUDED') return 0
  return articulo.taxRate ?? 0
}

function tributableDe(catalogo: CatalogoComercial, code: string): Tributable | undefined {
  return (
    catalogo.articulos.find((a) => a.code === code) ??
    catalogo.paquetes.find((p) => p.code === code) ??
    catalogo.capacidades.find((c) => c.code === code)
  )
}

/**
 * Lo que costaría una selección arbitraria de módulos, sumado EN EL NAVEGADOR.
 *
 * <p>Existe por la portada. El importe vinculante lo calcula el servidor y el de
 * `/planes` sale de `POST /quotes/preview`, pero ese endpoint tiene cupo por IP:
 * gastarlo casilla a casilla en el primer pliegue dejaría al prospecto limitado
 * justo en la pantalla donde el precio decide. Esta suma no pide nada y no
 * publica ninguna cifra nueva: son los precios que `GET /catalog` ya trajo.
 *
 * <p>Se cotiza sobre {@link cestaDeCotizacion}, la misma cesta que viajaría al
 * servidor, y por eso hereda su regla del paquete: una selección que reproduce
 * una combinación se suma por el precio del paquete —con su descuento— y no por
 * el de sus piezas sueltas, que sería un total más caro que el que se va a
 * cobrar.
 *
 * <p>Todo queda en `null` en cuanto una línea no tiene precio en el ciclo
 * elegido. No se estima el hueco: un subtotal al que le falta un sumando no es
 * un subtotal, y el cero que lo taparía se lee como «no cuesta nada».
 */
export function estimarSeleccion(
  catalogo: CatalogoComercial,
  seleccion: SeleccionCotizador,
): EstimacionCatalogo {
  const sinCifra: EstimacionCatalogo = { subtotal: null, impuesto: null, total: null, tasa: null }
  const lineas = cestaDeCotizacion(seleccion, catalogo).lineas
  if (lineas.length === 0) return sinCifra

  const tasas = new Set<number>()
  let subtotal = 0
  let impuesto = 0

  for (const linea of lineas) {
    const articulo = tributableDe(catalogo, linea.code)
    if (!articulo || articulo.importe === null) return sinCifra
    const bruto = aPesos(articulo.importe * linea.quantity)
    const tasa = tasaDe(articulo)
    subtotal += bruto
    // El impuesto se redondea POR LÍNEA, como lo desglosa el servidor
    // (`QuotePreviewLineResponse.taxAmount`): redondear solo al final separa las
    // dos cifras algún peso y la de la portada dejaría de casar con la de después.
    impuesto += impuestoDe(bruto, tasa)
    // El cero entra en el conjunto: una cesta con un exento dentro NO tributa al
    // 19 % aunque todo lo demás lo haga, y rotularla así afirmaría que el total
    // es la base por 1,19.
    tasas.add(tasa)
  }

  const unica = tasas.size === 1 ? [...tasas][0] : undefined
  return {
    subtotal,
    impuesto,
    total: aPesos(subtotal + impuesto),
    tasa: unica !== undefined && unica > 0 ? unica : null,
  }
}

/**
 * Un importe orientativo para pantalla, con el hueco declarado.
 *
 * <p>Vive aquí y no en cada componente porque son cuatro los que pintan estas
 * cifras —el configurador, el carril del registro, el resumen del paso
 * vinculante y el aviso de deriva— y el repo ya pagó una vez el precio de tener
 * la misma cuenta escrita de tres maneras. `—` es el marcador de «sin dato» de
 * toda la aplicación (ver `composables/format.ts`), no una invención local: lo
 * que NO puede salir de aquí es un `$ 0`, que se lee como «no cuesta nada».
 */
export function importeEstimado(valor: number | null): string {
  return valor === null ? '—' : formatMoney(valor)
}

const CICLO_EN_FRASE: Readonly<Record<Ciclo, string>> = {
  MENSUAL: 'el pago mes a mes',
  ANUAL: 'el pago anual',
}

/**
 * Por qué falta una cifra, dicho entero: qué eje, en qué ciclo y qué se puede
 * hacer. `null` cuando no falta ninguna.
 *
 * <p>La frase nombra la unidad con `CAPACITY_UNIT_LABEL` —nunca el enum— y no
 * dice «no disponible», que se lee como un fallo de la aplicación: lo que ocurre
 * es que esa unidad adicional no se vende en ese ciclo, y contratarla se
 * rechazaría. La alternativa que se ofrece es la que de verdad existe (el otro
 * ciclo) más el contacto, porque nadie de este lado puede publicar un precio.
 */
export function textoSinPrecio(unidades: readonly CapacityUnit[], ciclo: Ciclo): string | null {
  if (unidades.length === 0) return null
  const ejes = unidades.map((u) => CAPACITY_UNIT_LABEL[u]).join(' y ')
  const otro: Ciclo = ciclo === 'ANUAL' ? 'MENSUAL' : 'ANUAL'
  return (
    `Con ${CICLO_EN_FRASE[ciclo]} no hay precio publicado para las ${ejes} que pasan de lo ` +
    `incluido, así que no podemos estimar ese importe y esta combinación no se puede contratar. ` +
    `Las incluidas siguen estándolo. Prueba con ${CICLO_EN_FRASE[otro]} o escríbenos a ` +
    `soporte@kefaro.tech.`
  )
}
