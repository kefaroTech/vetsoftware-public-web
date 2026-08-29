import { companyApi } from '@/features/empresa/api/company.api'
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
  IntencionContratacion,
  LineaPrueba,
  ResultadoContratacion,
  ResumenContratacion,
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
      trialEndDate: sumarDias(desdeISO, inc.trialDays ?? 0),
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
  intencion: IntencionContratacion
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
export async function fetchResumenContratacion(args: ResumenArgs): Promise<ResumenContratacion> {
  const { intencion, plan, companyId, estadoPlanActual } = args

  const empresa = companyId != null ? await companyApi.findById(companyId) : null

  const seleccion = {
    ciclo: intencion.ciclo,
    sedes: intencion.sedes,
    usuarios: intencion.usuarios,
  }
  const desglose = calcularEstimado(plan, seleccion)

  return {
    // `findById` devuelve null sin permiso `company.read` o con 404, y la vista
    // degrada con gracia: se sigue pudiendo contratar sin ver el NIT, pero no se
    // inventa un nombre de clínica.
    empresaNombre: empresa?.name ?? 'tu clínica',
    empresaIdentificador: empresa?.identifier ?? '',
    planCode: plan.code,
    planNombre: plan.name,
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
 * Las líneas de la oferta: **el paquete, y una capacidad solo cuando se pasa de
 * lo incluido**. Nunca los módulos.
 *
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
 */
export function lineasDeContratacion(
  plan: PublicPlan,
  resumen: Pick<ResumenContratacion, 'sedes' | 'usuarios'>,
): SelfServeQuoteLineRequest[] {
  const lineas: SelfServeQuoteLineRequest[] = [{ code: plan.code, quantity: 1 }]
  for (const capacidad of plan.capacities) {
    const cantidad = cantidadContratada(capacidad.unit, resumen.sedes, resumen.usuarios)
    if (cantidad !== null && cantidad > capacidad.included) {
      lineas.push({ code: capacidad.code, quantity: cantidad })
    }
  }
  return lineas
}

export interface ActivarArgs {
  resumen: ResumenContratacion
  /**
   * El plan del catálogo público. Hace falta entero —y no solo su `code`— porque
   * los rótulos de las capacidades (`capacities[].code`) son lo que el servidor
   * traduce, y el resumen no los lleva: el resumen es lo que se PINTA, no lo que
   * se envía.
   */
  plan: PublicPlan
  /**
   * Llave de idempotencia generada al ENTRAR en el paso 6, no al pulsar. Es lo
   * que hace que un doble clic —o una segunda pestaña— no cree dos ofertas. El
   * servidor la lee: un reintento con la misma llave devuelve la misma oferta y
   * el mismo 201.
   */
  clientRequestId: string
}

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
  const { resumen, plan, clientRequestId } = args

  const cotizacion = await cotizacionesApi.selfServe({
    clientRequestId,
    billingCycle: CICLO_DEL_CONTRATO[resumen.ciclo],
    lines: lineasDeContratacion(plan, resumen),
  })

  return {
    planNombre: resumen.planNombre,
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
