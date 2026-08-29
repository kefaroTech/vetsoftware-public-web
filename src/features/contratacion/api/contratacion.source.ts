import { companyApi } from '@/features/empresa/api/company.api'
import {
  calcularEstimado,
  subtotalMensualEquivalente,
} from '@/features/landing/composables/planPricing'
import type { PublicPlan } from '@/features/landing/types/plans.types'
import { parseISODate, todayISO } from '@/composables/format'
import type {
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
 * Lo que NO existe es un endpoint con el que una clínica contrate su propio
 * plan. `CreateQuoteUseCase.java:29` sigue siendo `hasRole('SYSTEM')`, y el
 * front del tenant no declara ningún permiso `quote.*`. `AcceptQuoteUseCase`
 * ya admite que acepte el empleado del tenant, así que falta la otra mitad. Ver
 * la petición al backend en `docs/ux/landing-comercial-y-contratacion.md` §12.2.
 *
 * Mientras eso no exista, **el importe no lo calcula el servidor: lo calcula
 * este módulo** con la misma lista de precio transcrita que la landing. Ese
 * hecho es la razón de que el aviso de modo demostración sea obligatorio y no
 * descartable, y de que la pantalla no prometa nada que no pueda cumplir.
 *
 * El día que llegue el endpoint, se reescriben estas dos funciones y **nada
 * más**: ni la vista del paso 6, ni la del 7, ni el store, ni los tipos.
 */

/**
 * Marca única de lo que todavía no tiene backend. Está aquí, en una constante
 * exportada, para que se pueda encontrar con una búsqueda y para que las
 * pantallas puedan decir la verdad sin repetir el matiz en cinco sitios.
 */
export const SIN_ENDPOINT_DE_CONTRATACION = true

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
  /** Ya tiene plan activo. Hoy solo lo sabe el propio front (ver el store). */
  yaTienePlanActivo: boolean
}

/**
 * El resumen del paso 6. Lee la empresa del servidor y calcula los importes con
 * la lista de precio transcrita (ver el encabezado de este fichero).
 */
export async function fetchResumenContratacion(args: ResumenArgs): Promise<ResumenContratacion> {
  const { intencion, plan, companyId, yaTienePlanActivo } = args

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
    subtotal: desglose.subtotal,
    impuesto: desglose.impuesto,
    tasaImpuesto: plan.taxRate,
    total: desglose.total,
    subtotalMensualEquivalente: subtotalMensualEquivalente(plan, seleccion),
    lineasPrueba: lineasDePrueba(plan),
    yaTienePlanActivo,
  }
}

export interface ActivarArgs {
  resumen: ResumenContratacion
  /**
   * Llave de idempotencia generada al ENTRAR en el paso 6, no al pulsar. Es lo
   * que hace que un doble clic —o una segunda pestaña— no cree dos contratos.
   * Viaja ya, aunque hoy no haya quien la lea, para que el día del endpoint no
   * haya que cambiar la firma ni el momento en que se genera.
   */
  clientRequestId: string
}

/**
 * Activa el plan.
 *
 * **Hoy no llama a ningún endpoint** porque no hay ninguno al que llamar (ver el
 * encabezado). Devuelve el resultado derivado del resumen para que el paso 7
 * exista y esté escrito, y la pantalla dice exactamente eso: no se ha cobrado
 * nada y la activación queda pendiente de la conexión con el backend. Lo que no
 * hace es fingir un cambio en la clínica que no ha ocurrido.
 */
export async function activarPlan(args: ActivarArgs): Promise<ResultadoContratacion> {
  const { resumen } = args
  await Promise.resolve()
  return {
    planNombre: resumen.planNombre,
    empresaNombre: resumen.empresaNombre,
    modulosActivados: resumen.lineasPrueba.map((l) => l.name),
    lineasPrueba: resumen.lineasPrueba,
    subtotal: resumen.subtotal,
    impuesto: resumen.impuesto,
    total: resumen.total,
    ciclo: resumen.ciclo,
  }
}
