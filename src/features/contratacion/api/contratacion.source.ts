import {
  conocePropuesta,
  esPropuestaNoEncontrada,
  releerPropuesta,
} from '@/features/asistente/api/asistente.source'
import type { Propuesta } from '@/features/asistente/types/asistente.types'
import type { CatalogoComercial } from '@/features/asistente/types/catalogo.types'
import { companyApi } from '@/features/empresa/api/company.api'
import { previsualizarCotizacion } from '@/features/landing/api/cotizacion.source'
import { cestaDeCotizacion } from '@/features/landing/composables/cotizadorLineas'
import {
  calcularEstimado,
  subtotalMensualEquivalente,
} from '@/features/landing/composables/planPricing'
import type { CapacityUnit, Ciclo, PublicPlan } from '@/features/landing/types/plans.types'
import { cotizacionesApi } from '@/features/suscripcion/api/cotizaciones.api'
import type { SelfServeQuoteLineRequest } from '@/features/suscripcion/types/cotizaciones.types'
import { parseISODate, todayISO } from '@/composables/format'
import type {
  EstadoPlanActual,
  IntencionPlan,
  IntencionPropuesta,
  LineaContratada,
  LineaPrueba,
  ResultadoContratacion,
  ResumenContratacion,
  ResumenPlan,
  ResumenPropuesta,
} from '../types/contratacion.types'

/**
 * EL SEAM del paso vinculante.
 *
 * ── Lo que hoy existe y lo que no, sin adornos ─────────────────────────────
 * `GET /companies/{id}` existe y está scopeado a la propia empresa: el nombre y
 * el NIT que se pintan en «Estás contratando para…» **vienen de verdad del
 * servidor**.
 *
 * ── La autocontratación SÍ viaja al servidor ───────────────────────────────
 * `POST /quotes/self-serve` (`QuoteController.java:138`) es alcanzable por un
 * empleado del tenant y `activarPlan` lo llama de verdad. El gate está en el
 * puerto, no en el controlador (`SelfServeQuoteUseCase.java`):
 *
 * ```
 * hasRole('SYSTEM') or (hasAuthority('quote.request') and @authz.isMyCompany(#command.companyId))
 * ```
 *
 * La rama de tenant se cumple sola por construcción: la empresa **no viaja en el
 * cuerpo**, la pone el controlador desde el principal con `authz.currentCompanyId()`,
 * así que `isMyCompany` compara la empresa consigo misma. Lo único que hay que
 * tener a este lado es el permiso `quote.request` — sembrado por el changeset
 * 378, y solo en nivel `FULL`: una empresa en mora (`READ_ONLY`) no lo tiene, y
 * por eso el paso 6 esconde el botón en vez de dejar que falle con un 403.
 *
 * ── El artículo se nombra por `code`, y eso es lo que desbloqueó el camino ──
 * `SelfServeQuoteLineRequest` pedía un `catalogItemId` que ninguna respuesta
 * alcanzable por el tenant publicaba, así que el endpoint tenía ruta, permiso y
 * cero llamadores posibles. Hoy la línea es `{ code, quantity }` y el servidor
 * traduce el rótulo contra el MISMO conjunto que publica `GET /plans`
 * (`PublishedCatalogItemQueryPort`), sin distinguir un código inexistente de uno
 * interno. Traducción para este fichero: **todos los `code` que mandamos tienen
 * que salir del catálogo público**, y un rechazo significa «el catálogo se
 * movió, vuelve a leer los planes», no «te equivocaste de campo».
 *
 * ── Qué es real y qué sigue siendo simulado ────────────────────────────────
 * Real: la oferta. El servidor resuelve tarifa vigente, tramos, IVA y vigencia,
 * la deja `SENT` y devuelve sus importes — que son los que se pintan en el paso
 * 7, no los de la lista transcrita.
 *
 * Simulado: **el cobro**. No hay pasarela conectada y no se pide ninguna tarjeta.
 *
 * Y hay un tercer estado que no es ni una cosa ni la otra: **aceptar una oferta
 * no enciende los módulos**. `SelfServeQuoteService` lo dice sin rodeos —nadie
 * reacciona hoy a `QuoteStatus.ACCEPTED`—, así que el eslabón «oferta aceptada →
 * suscripción con sus concesiones» no existe. Aquí NO se inventa: `activarPlan`
 * pide la oferta y para. Que aceptarla deba activar el servicio es una decisión
 * de producto abierta, y cablearla a ciegas sería exactamente el tipo de promesa
 * que esta pantalla existe para no hacer.
 *
 * El importe orientativo de `calcularEstimado` sigue vivo, pero solo hasta el
 * paso 6: es lo que se compara contra lo que el usuario vio al elegir (deriva de
 * precio). A partir del envío manda el servidor.
 */

/** Suma días a una fecha ISO y devuelve ISO. Sin corrimiento de zona: usa `parseISODate`. */
export function sumarDias(iso: string, dias: number): string {
  const d = parseISODate(iso)
  if (!d) return iso
  d.setDate(d.getDate() + dias)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Las líneas de prueba del plan, **ordenadas por fecha de fin ascendente**.
 *
 * El orden no es alfabético a propósito: lo primero que hay que ver es lo
 * primero que se acaba. La prueba vence POR LÍNEA y no por contrato
 * (`ModuleGrantLine.java:45` lleva el `trialEndDate` en la línea, y
 * `default_trial_days` es por artículo), así que Caja puede terminar el día 14 y
 * Agenda el 30 dentro del mismo plan.
 *
 * `precioDespues` es `null` en todas las líneas y NO es un descuido: hoy no
 * existe ningún precio por módulo en ninguna fuente —ni en el contenido de la
 * landing ni en el API, donde `CatalogItemResponse` ni siquiera expone
 * `default_trial_days`—. Inventarlo sería poner una cifra falsa en la pantalla
 * que decide una compra.
 */
export function lineasDePrueba(plan: PublicPlan, desdeISO: string = todayISO()): LineaPrueba[] {
  return plan.includes
    .map<LineaPrueba>((inc) => ({
      code: inc.code,
      name: inc.name,
      // `trialDays` es nulable en el contrato: un artículo sin
      // `default_trial_days` no tiene prueba. Cero días deja `trialEndDate` en
      // la fecha de inicio, que es exactamente «no hay prueba» y no inventa una.
      // Pero la FECHA sola no lo dice: viaja también el dato, para que la tabla
      // pueda escribir «sin prueba» en vez de «gratis hasta hoy».
      trialEndDate: sumarDias(desdeISO, inc.trialDays ?? 0),
      trialDays: inc.trialDays,
      precioDespues: null,
    }))
    .sort((a, b) => a.trialEndDate.localeCompare(b.trialEndDate))
}

/**
 * Las líneas de prueba de una selección de módulos, con el mismo orden y la
 * misma regla que las de un paquete.
 *
 * <p>El núcleo entra siempre porque es el mínimo estructural (`is_core`), no
 * porque nadie lo marque. `precioDespues` queda en `null` aunque el catálogo
 * publique un importe por artículo: la columna que lo pinta rotula «al mes», y
 * en el ciclo anual esa frase sería falsa.
 */
export function lineasDePruebaDeSeleccion(
  modulos: readonly string[],
  catalogo: CatalogoComercial,
  desdeISO: string = todayISO(),
): LineaPrueba[] {
  const marcados = new Set(modulos)
  return catalogo.articulos
    .filter((a) => a.obligatorio || marcados.has(a.code))
    .map<LineaPrueba>((a) => ({
      code: a.code,
      name: a.nombre,
      trialEndDate: sumarDias(desdeISO, a.trialDays ?? 0),
      trialDays: a.trialDays,
      precioDespues: null,
    }))
    .sort((a, b) => a.trialEndDate.localeCompare(b.trialEndDate))
}

/** `true` cuando todas las líneas terminan el mismo día: el caso simple no paga el precio del complejo. */
export function pruebaUniforme(lineas: readonly LineaPrueba[]): boolean {
  const primera = lineas[0]?.trialEndDate
  if (!primera) return true
  return lineas.every((l) => l.trialEndDate === primera)
}

export interface ResumenArgs {
  intencion: IntencionPlan
  plan: PublicPlan
  companyId: number | null
  /**
   * Si la clínica ya tiene plan, **preguntado al servidor** por
   * `GET /subscriptions/current` a través del store de suscripción. Antes era una bandera de
   * memoria que se perdía en cada recarga.
   */
  estadoPlanActual: EstadoPlanActual
}

/**
 * El resumen del paso 6. Lee la empresa del servidor y calcula los importes con
 * la lista de precio transcrita (ver el encabezado de este fichero).
 */
export async function fetchResumenContratacion(args: ResumenArgs): Promise<ResumenPlan> {
  const { intencion, plan, companyId, estadoPlanActual } = args

  const empresa = companyId != null ? await companyApi.findById(companyId) : null

  const seleccion = {
    ciclo: intencion.ciclo,
    sedes: intencion.sedes,
    usuarios: intencion.usuarios,
  }
  const desglose = calcularEstimado(plan, seleccion)

  return {
    origen: 'PLAN',
    modulos: intencion.modulos,
    // El paquete es UNA línea con su precio de entrada; sus componentes no
    // tienen importe propio que desglosar. Ver `ResumenPlan.lineas`.
    lineas: [],
    // `findById` devuelve null sin permiso `company.read` o con 404, y la vista
    // degrada con gracia: se sigue pudiendo contratar sin ver el NIT, pero no se
    // inventa un nombre de clínica.
    empresaNombre: empresa?.name ?? 'tu clínica',
    empresaIdentificador: empresa?.identifier ?? '',
    planCode: plan.code,
    titulo: plan.name,
    ciclo: intencion.ciclo,
    sedes: intencion.sedes,
    usuarios: intencion.usuarios,
    // Los importes viajan tal cual, `null` incluido. `calcularEstimado` deja en
    // `null` lo que no puede calcular —una capacidad que se cobra y que la lista
    // no publica en el ciclo elegido—, y aplanarlo aquí a cero sería reintroducir
    // en el paso VINCULANTE justo la cifra inventada que se acaba de quitar.
    subtotal: desglose.subtotal,
    impuesto: desglose.impuesto,
    tasaImpuesto: plan.taxRate,
    total: desglose.total,
    subtotalMensualEquivalente: subtotalMensualEquivalente(plan, seleccion),
    sinPrecio: desglose.sinPrecio,
    lineasPrueba: lineasDePrueba(plan),
    estadoPlanActual,
  }
}

/** Qué se está contratando cuando la selección no reproduce ningún paquete. */
export const TITULO_SELECCION = 'Tu selección de módulos'

export interface ResumenSeleccionArgs {
  intencion: IntencionPlan
  catalogo: CatalogoComercial
  companyId: number | null
  estadoPlanActual: EstadoPlanActual
}

/**
 * El resumen del paso 6 cuando lo que se contrata son módulos sueltos.
 *
 * <p>**Aquí no se suma ni un peso.** La cesta la compone `cestaDeCotizacion` —la
 * misma que `/planes` acaba de cotizar, no una copia— y los importes los pone
 * `POST /quotes/preview`, que resuelve tarifa vigente, tramos por volumen e
 * impuesto con el mismo código que congela la oferta. Recalcularlos con la lista
 * transcrita, como hace la rama del paquete, daría una segunda cifra: la
 * escalera de descuentos por volumen no se publica, así que multiplicar el tramo
 * de entrada se separa de lo que se cobra en cuanto hay unidades de más.
 *
 * <p>`tasaImpuesto` se queda en `null` a propósito. La respuesta trae el importe
 * del impuesto y un `taxRate` POR LÍNEA sin escala declarada; deducir de ahí un
 * «IVA 19 %» para la pantalla que decide una compra es equivocarse por un factor
 * de cien. El importe sí se pinta, porque ese sí lo dijo el servidor.
 */
export async function fetchResumenSeleccion(args: ResumenSeleccionArgs): Promise<ResumenPlan> {
  const { intencion, catalogo, companyId, estadoPlanActual } = args

  const cesta = cestaDeCotizacion(
    { modulos: intencion.modulos, sedes: intencion.sedes, usuarios: intencion.usuarios },
    catalogo,
  )

  const [empresa, cotizacion] = await Promise.all([
    companyId != null ? companyApi.findById(companyId) : Promise.resolve(null),
    previsualizarCotizacion({ ciclo: intencion.ciclo, lineas: cesta.lineas }),
  ])

  const lineas: LineaContratada[] = cotizacion.lineas.map((l) => ({
    code: l.code,
    nombre: l.nombre,
    tipo: null,
    cantidad: l.cobradas,
    importe: l.importe,
  }))

  return {
    origen: 'PLAN',
    empresaNombre: empresa?.name ?? 'tu clínica',
    empresaIdentificador: empresa?.identifier ?? '',
    // Nulo porque no hay paquete: es lo que hace que `lineasDeContratacion`
    // arme la cesta con el catálogo en vez de con una línea de paquete.
    planCode: null,
    modulos: intencion.modulos,
    titulo: TITULO_SELECCION,
    ciclo: intencion.ciclo,
    sedes: intencion.sedes,
    usuarios: intencion.usuarios,
    lineas,
    subtotal: cotizacion.subtotal,
    impuesto: cotizacion.impuesto,
    tasaImpuesto: null,
    total: cotizacion.total,
    // El equivalente mensual solo se puede afirmar cuando el ciclo YA es
    // mensual: dividir un importe anual entre doce es aritmética de dinero en el
    // cliente sobre la cifra que además dispara el aviso de deriva.
    subtotalMensualEquivalente: intencion.ciclo === 'MENSUAL' ? cotizacion.subtotal : null,
    // La cotización respondió, así que hay precio para todo lo que lleva la
    // cesta. Lo que no tiene precio en el ciclo pedido lo rechaza el servidor.
    sinPrecio: [],
    lineasPrueba: lineasDePruebaDeSeleccion(intencion.modulos, catalogo),
    estadoPlanActual,
  }
}

/**
 * ── LA PROPUESTA A MEDIDA EN EL PASO VINCULANTE ─────────────────────────────
 *
 * Lo que sigue es la segunda forma de entrada del embudo, y su regla es la
 * inversa de la del plan: **aquí no se calcula ni un peso**. En la rama del plan
 * este fichero usa `calcularEstimado` sobre la lista transcrita porque el
 * catálogo público no cotiza; en la rama de la propuesta el servidor ya cotizó,
 * y volver a sumar las líneas produciría una segunda cifra que compite con la
 * suya. No hay un solo `reduce` sobre importes en este bloque, y si alguien
 * escribe uno ha reintroducido el defecto que el asistente ya publicó dos veces.
 */

/** Qué se está contratando cuando no es un paquete. Va en el resumen y en el éxito. */
export const TITULO_PROPUESTA = 'Tu propuesta a medida'

/**
 * Cómo terminó el intento de armar el resumen del paso 6.
 *
 * <p>Los dos fracasos son **distintos para el usuario** y por eso son dos y no
 * uno. `PROPUESTA_PERDIDA` se arregla volviendo a `/planes` en este mismo
 * dispositivo —la propuesta sigue viva en el servidor, lo que falta es la
 * credencial local—; `PROPUESTA_NO_DISPONIBLE` no se arregla así, porque el
 * servidor ya no la devuelve. Colapsarlos en «no pudimos cargar tu propuesta»
 * mandaría a la mitad de los casos a repetir un camino que no lleva a ningún
 * sitio.
 */
export type ResultadoResumen =
  | { clase: 'RESUMEN'; resumen: ResumenContratacion }
  | { clase: 'PROPUESTA_PERDIDA' }
  | { clase: 'PROPUESTA_NO_DISPONIBLE' }

/**
 * Las líneas de prueba de una propuesta.
 *
 * <p>`precioDespues` sale del importe UNITARIO del servidor, y solo cuando la
 * línea es de una unidad: con dos o más habría que multiplicar, y multiplicar
 * dinero en el cliente es exactamente lo que este embudo no hace. En ese caso
 * queda `null`, que la tabla pinta como «—» y no como un cero.
 */
function lineasDePruebaDePropuesta(
  propuesta: Propuesta,
  desdeISO: string = todayISO(),
): LineaPrueba[] {
  return propuesta.lineas
    .map<LineaPrueba>((l) => ({
      code: l.code,
      name: l.nombre,
      trialEndDate: sumarDias(desdeISO, l.trialDays ?? 0),
      trialDays: l.trialDays,
      precioDespues: l.cantidad === 1 ? l.importe : null,
    }))
    .sort((a, b) => a.trialEndDate.localeCompare(b.trialEndDate))
}

export interface ResumenPropuestaArgs {
  intencion: IntencionPropuesta
  companyId: number | null
  estadoPlanActual: EstadoPlanActual
}

/**
 * El resumen del paso 6 cuando lo que se contrata es una propuesta.
 *
 * <p>**Vuelve a pedirle la propuesta al servidor**, siempre, en cada apertura de
 * la pantalla —la regla de recarga del repositorio, aquí con una consecuencia de
 * dinero—. Lo que llega es la versión de AHORA: si el prospecto editó líneas en
 * otra pestaña, o refinó, o cambió al paquete, lo que se pinta y lo que se
 * cotiza es el resultado de esa edición y no lo que había al pulsar «continuar».
 * La deriva contra lo que vio entonces la detecta la vista comparando
 * `subtotalMensualEquivalente` con `intencion.importeVistoMensual`, igual que en
 * la rama del plan.
 */
export async function fetchResumenPropuesta(args: ResumenPropuestaArgs): Promise<ResultadoResumen> {
  const { intencion, companyId, estadoPlanActual } = args

  // Pregunta LOCAL y antes del viaje: sin token no hay petición que hacer, y el
  // motivo que hay que contarle al usuario es otro.
  if (!conocePropuesta(intencion.propuestaId)) return { clase: 'PROPUESTA_PERDIDA' }

  const [empresa, resultado] = await Promise.all([
    companyId != null ? companyApi.findById(companyId) : Promise.resolve(null),
    // ⚠️ El 404 se atrapa AQUÍ y no se deja subir. Desde que la lectura por
    // token tiene caducidad real, este 404 es un desenlace normal —el prospecto
    // vuelve al paso 6 después de que su propuesta expirase— y no una avería.
    // Sin este `catch` la excepción atraviesa `usePasoContratar.cargar()`, que
    // no tiene ninguno: `cargando` se queda en `true` para siempre y la pantalla
    // que decide la compra se queda girando sin decir nada.
    releerPropuesta(intencion.propuestaId).catch((e: unknown) => {
      if (esPropuestaNoEncontrada(e)) return null
      throw e
    }),
  ])

  // El servidor ya no la devuelve: no se arregla volviendo a `/planes` en este
  // dispositivo, así que es `NO_DISPONIBLE` y no `PERDIDA`.
  if (resultado === null) return { clase: 'PROPUESTA_NO_DISPONIBLE' }

  // `NO_ENTENDIDO` trae un carrito determinista que es una propuesta correcta,
  // así que también sirve; `FUERA_DE_DOMINIO` y `NO_DISPONIBLE` no traen ninguno.
  const propuesta =
    resultado.clase === 'PROPUESTA'
      ? resultado.propuesta
      : resultado.clase === 'NO_ENTENDIDO'
        ? resultado.propuestaBase
        : null
  if (!propuesta) return { clase: 'PROPUESTA_NO_DISPONIBLE' }

  const totales = propuesta.totales
  const lineas: LineaContratada[] = propuesta.lineas.map((l) => ({
    code: l.code,
    nombre: l.nombre,
    tipo: l.tipo,
    cantidad: l.cantidad,
    importe: l.importe,
  }))

  const resumen: ResumenPropuesta = {
    origen: 'PROPUESTA',
    empresaNombre: empresa?.name ?? 'tu clínica',
    empresaIdentificador: empresa?.identifier ?? '',
    titulo: TITULO_PROPUESTA,
    propuestaId: propuesta.id,
    version: propuesta.version,
    lineas,
    // ⚠️ EL CICLO ES EL DEL SERVIDOR, no el que el usuario tenga elegido en el
    // conmutador. El asistente cotiza en mensual y lo dice en `totales.ciclo`;
    // rotular «Total por año» sobre unos importes mensuales es la mentira
    // concreta que el store del asistente existe para no contar, y el paso
    // vinculante es el peor sitio posible para contarla. Cuando el contrato del
    // asistente publique el ciclo, este campo empieza a valer `ANUAL` solo y
    // todo lo de abajo le sigue: no hay ningún `'MENSUAL'` escrito a mano aquí.
    ciclo: totales.ciclo,
    // Sin `sedes` ni `usuarios`: `ResumenPropuesta` ya no los declara. Los que
    // trae la intención son los del control del asistente, que no sale a la red,
    // y la oferta de esta rama son `lineasDePropuesta` — la capacidad que se
    // cobra viene ya como línea del servidor, con su cantidad. Ver `ResumenPlan`.
    subtotal: totales.subtotal,
    impuesto: totales.impuesto,
    tasaImpuesto: totales.tasaImpuesto,
    total: totales.total,
    // El asistente cotiza por ciclo y lo declara; el equivalente mensual solo se
    // puede afirmar cuando el ciclo YA es mensual. Dividir un importe anual
    // entre doce aquí sería aritmética de dinero en el cliente sobre la cifra
    // que además dispara el aviso de deriva.
    subtotalMensualEquivalente: totales.ciclo === 'MENSUAL' ? totales.subtotal : null,
    // Los ejes de capacidad no existen en el contrato del asistente, así que no
    // hay ninguno «sin precio publicado». Vacío es el dato, no un hueco.
    sinPrecio: [],
    lineasPrueba: lineasDePruebaDePropuesta(propuesta),
    estadoPlanActual,
  }

  return { clase: 'RESUMEN', resumen }
}

/**
 * El único punto donde el vocabulario de pantalla se traduce al del contrato.
 *
 * `plans.types.ts` lo dejó escrito por adelantado: `MENSUAL`/`ANUAL` son el
 * rótulo de un selector y no viajan por el cable; el día que un campo de ciclo
 * entrara en una petición llevaría el vocabulario del contrato y la traducción
 * se haría en el seam. Este es el campo y este es el seam.
 */
const CICLO_DEL_CONTRATO: Readonly<Record<Ciclo, 'MONTHLY' | 'ANNUAL'>> = {
  MENSUAL: 'MONTHLY',
  ANUAL: 'ANNUAL',
}

/**
 * Cuántas unidades de esa capacidad se contratan, o `null` si la pantalla no
 * pregunta por ese eje.
 *
 * <p>El paso 2 solo pregunta dos cosas —sedes y personas—, así que `TERMINAL` y
 * `STORAGE_GB` no tienen ninguna cantidad que mandar. **No se rellenan con lo
 * incluido**: una línea es una afirmación sobre lo que la clínica contrata, y
 * afirmar «tres terminales» porque el paquete trae tres es inventarse una
 * respuesta que nadie dio. Lo que el paquete incluya ya viene dentro del
 * paquete.
 */
function cantidadContratada(unit: CapacityUnit, sedes: number, usuarios: number): number | null {
  if (unit === 'BRANCH') return sedes
  if (unit === 'USER') return usuarios
  return null
}

/**
 * De dónde salen las líneas, que es lo único que separa las dos ramas.
 *
 * <p>Unión y no dos argumentos nulables: con `plan` y `catalogo` opcionales las
 * dos ramas compilarían con el argumento equivocado, que es el mismo motivo por
 * el que {@link ActivarArgs} está escrito así.
 */
export type FuenteDeLineas =
  { clase: 'PAQUETE'; plan: PublicPlan } | { clase: 'MODULOS'; catalogo: CatalogoComercial }

/**
 * Las líneas de la oferta, en las dos formas que la autocontratación acepta.
 *
 * ── Cuál de las dos, y por qué nunca las dos a la vez ──────────────────────
 * Manda `planCode`: si la selección reproducía un paquete publicado, la
 * intención lo guardó y aquí viaja **una línea de paquete**; si no, viaja
 * `CORE` + cada módulo marcado. Un paquete junto a un componente suyo son dos
 * cobros por lo mismo y el servidor los rechaza con un 400 que no dice cuál
 * línea sobró, así que el conflicto se evita aquí y no se descubre allí.
 *
 * <p>Quien decidió que había paquete es `paqueteQueCoincide`, **la misma función
 * que compuso la cesta que se cotizó**. Es la condición de la que depende que la
 * pantalla y la factura digan lo mismo: dos criterios distintos —uno para
 * cotizar y otro para contratar— enseñarían un precio y cobrarían otro.
 *
 * ── RAMA `PAQUETE` — el paquete, y una capacidad solo si se pasa ────────────
 * Tres decisiones, las tres con una cifra detrás:
 *
 *  1. **Los `includes` NO son líneas.** Son componentes del paquete
 *     (`bundle_components`) y su precio ya está dentro del precio de entrada del
 *     paquete. Mandarlos como línea propia los cobraría otra vez — el servidor
 *     los resolvería sin rechistar, porque `findPublishedIdByCode` acepta un
 *     `MODULE` que cuelgue de un paquete publicado. Es la única forma de que el
 *     total del servidor se separe del estimado que el usuario acaba de aceptar.
 *  2. **La cantidad es la CONTRATADA, no la extra.** `TieredPrice.of` resta lo
 *     incluido (`billableQuantity`) y reparte el resto por tramos acumulativos:
 *     mandar «2 usuarios extra» en vez de «5 usuarios» haría que el servidor
 *     restara lo incluido por segunda vez.
 *  3. **Y aun así, la capacidad que no se pasa de lo incluido NO se manda.** El
 *     servidor no emitiría renglón por ella —`billableQuantity` da 0 y
 *     `TieredPrice` devuelve el reparto vacío—, así que la línea no aporta nada;
 *     lo que sí puede hacer es tumbar la petición entera. `GET /plans` lee el
 *     precio de cada capacidad con un `LEFT JOIN` fijado a `billing_cycle =
 *     'MONTHLY'` (`JpaPublicPlanQueryPort.SQL_COMPONENTS`), mientras que el
 *     traductor de la autocontratación exige un `INNER JOIN` con precio **en el
 *     ciclo pedido**. Una capacidad publicada en la portada pero sin fila de
 *     precio `ANNUAL` se resuelve a `Optional.empty()` y el `IllegalArgument`
 *     hunde la oferta completa — con un mensaje indistinguible a propósito, así
 *     que desde aquí no hay forma de saber cuál de las líneas falló. Mandar solo
 *     lo que de verdad se cobra reduce esa superficie al caso en el que la
 *     capacidad extra es justamente lo que se está comprando, donde el fallo sí
 *     es el resultado correcto: sin precio anual no hay nada que cobrar.
 *
 * ── RAMA `MODULOS` — aquí los módulos SÍ son líneas ─────────────────────────
 * Y tienen que serlo: sin paquete que los contenga, no mandarlos sería contratar
 * un núcleo pelado cobrando lo que el prospecto vio por trece módulos. La cesta
 * la compone `cestaDeCotizacion`, **la misma llamada que `/quotes/preview`**, no
 * una reimplementación con las mismas reglas: la cesta que se cotiza y la que se
 * contrata son el mismo objeto o acaban divergiendo.
 *
 * <p>La capacidad de esta rama sí viaja con las unidades que PASAN de lo
 * incluido, y no es una contradicción con la decisión 2: son dos artículos
 * distintos. Bajo un paquete la cantidad se cobra contra el tramo del propio
 * paquete, que ya trae lo incluido; suelta se cobra contra el `EXTRA_*`, que
 * tiene `included_quantity = 0` porque lo incluido vive en el `CAPACITY_*` del
 * mismo eje. Quien lo resuelve es `unidadesExtra`, y su cabecera lo explica.
 */
export function lineasDeContratacion(
  resumen: Pick<ResumenPlan, 'modulos' | 'sedes' | 'usuarios'>,
  fuente: FuenteDeLineas,
): SelfServeQuoteLineRequest[] {
  if (fuente.clase === 'MODULOS') {
    return cestaDeCotizacion(
      { modulos: resumen.modulos, sedes: resumen.sedes, usuarios: resumen.usuarios },
      fuente.catalogo,
    ).lineas
  }

  const { plan } = fuente
  const lineas: SelfServeQuoteLineRequest[] = [{ code: plan.code, quantity: 1 }]
  for (const capacidad of plan.capacities) {
    const cantidad = cantidadContratada(capacidad.unit, resumen.sedes, resumen.usuarios)
    if (cantidad !== null && cantidad > capacidad.included) {
      lineas.push({ code: capacidad.code, quantity: cantidad })
    }
  }
  return lineas
}

/**
 * Las líneas de la oferta cuando lo que se contrata es una propuesta.
 *
 * <p>Es la traducción entera: `PropuestaLinea` ya es `{ code, cantidad }` y
 * `SelfServeQuoteLineRequest` es `{ code, quantity }`. Los códigos salen del
 * mismo catálogo publicado que el servidor usa para traducir —el asistente los
 * resolvió contra él para poder cotizarlos—, así que la restricción que este
 * fichero declara en su cabecera («todos los `code` que mandamos tienen que
 * salir del catálogo público») se cumple por construcción.
 *
 * <p>Y **no se filtra ni se completa nada**: mandar menos líneas de las que el
 * usuario acaba de ver aceptaría una compra distinta de la que confirmó.
 */
export function lineasDePropuesta(resumen: ResumenPropuesta): SelfServeQuoteLineRequest[] {
  return resumen.lineas.map((l) => ({ code: l.code, quantity: l.cantidad }))
}

/**
 * Llave de idempotencia generada al ENTRAR en el paso 6, no al pulsar. Es lo
 * que hace que un doble clic —o una segunda pestaña— no cree dos ofertas. El
 * servidor la lee: un reintento con la misma llave devuelve la misma oferta y
 * el mismo 201.
 */
interface ConLlave {
  clientRequestId: string
}

/**
 * Las dos formas de contratar, como unión y no como un `plan` opcional.
 *
 * <p>La rama del PLAN necesita la fuente de los códigos —el plan entero, o el
 * catálogo comercial— y no solo el resumen: los rótulos que el servidor traduce
 * (`capacities[].code`, los códigos de módulo) están ahí y no en el resumen, que
 * es lo que se PINTA y no lo que se envía. La rama de la PROPUESTA no necesita
 * ninguna: sus líneas ya vienen con el código que el servidor entiende. Con un
 * campo opcional las dos ramas compilarían con el argumento equivocado.
 */
export type ActivarArgs =
  | (ConLlave & { resumen: ResumenPlan; fuente: FuenteDeLineas })
  | (ConLlave & { resumen: ResumenPropuesta })

/**
 * Pide la oferta de autoservicio y devuelve lo que el paso 7 tiene que contar.
 *
 * **Los importes que salen de aquí son los del servidor.** Esa es la diferencia
 * entera con la versión anterior: el subtotal, el IVA y el total dejan de ser el
 * cálculo orientativo de la lista transcrita y pasan a ser los que la oferta
 * congeló contra la tarifa vigente. El `??` sobre el resumen es el suelo de
 * tipos —springdoc no marca requerido ningún campo de un `record`, así que el
 * contrato los declara opcionales—, no una alternativa de negocio: si el
 * servidor manda el importe, gana el servidor.
 *
 * Lo que NO hace, y es deliberado: no acepta la oferta y no activa nada. Ver el
 * encabezado del fichero.
 */
export async function activarPlan(args: ActivarArgs): Promise<ResultadoContratacion> {
  const { resumen, clientRequestId } = args

  // `'fuente' in args` y NO `resumen.origen === 'PLAN'`: estrechar por una
  // propiedad del miembro no estrecha la unión de fuera, así que el segundo
  // compila la rama del plan sin `args.fuente` a la vista. Es el mismo hecho
  // escrito donde TypeScript puede comprobarlo.
  const lines =
    'fuente' in args
      ? lineasDeContratacion(args.resumen, args.fuente)
      : lineasDePropuesta(args.resumen)

  const cotizacion = await cotizacionesApi.selfServe({
    clientRequestId,
    // El ciclo del RESUMEN, que en la rama de la propuesta es el que declaró el
    // servidor al cotizar. Mandar el del conmutador pediría una oferta anual
    // sobre unos importes mensuales que el usuario acaba de aceptar.
    billingCycle: CICLO_DEL_CONTRATO[resumen.ciclo],
    lines,
  })

  return {
    origen: resumen.origen,
    titulo: resumen.titulo,
    empresaNombre: resumen.empresaNombre,
    modulosActivados: resumen.lineasPrueba.map((l) => l.name),
    lineasPrueba: resumen.lineasPrueba,
    subtotal: cotizacion.subtotalAmount ?? resumen.subtotal,
    impuesto: cotizacion.taxAmount ?? resumen.impuesto,
    total: cotizacion.totalAmount ?? resumen.total,
    ciclo: resumen.ciclo,
    cotizacionId: cotizacion.id,
    cotizacionNumero: cotizacion.quoteNumber ?? null,
    validaHasta: cotizacion.validUntil ?? null,
  }
}
