import { formatDateShort, parseISODate, todayISO } from '@/composables/format'
import type { SubscriptionResponse, SubscriptionStatus } from '../types/suscripcion.types'

/**
 * El vocabulario del estado del plan. **Puro**: funciones y datos, sin estado ni peticiones.
 *
 * <p>Es puro a propósito, y aquí importa más que en la consola: estos textos son la única
 * explicación que la clínica recibe de por qué se le apagó un botón, y una palabra mal puesta se
 * acaba repitiendo por teléfono. Al ser puro, una prueba unitaria lo barre entero.
 *
 * <p><b>Vocabulario prohibido, y es riesgo legal, no preferencia:</b> «bloquear», «suspender»,
 * «cortar», «desactivar», «inhabilitar». **No existe ni existirá un corte total de acceso**: el
 * grado máximo de restricción es solo consulta, y una clínica en mora nunca pierde la consulta
 * de su propia historia clínica. `tests/unit/suscripcion-estado.spec.ts` barre lo que este
 * módulo exporta buscando esas cinco palabras.
 */

/** Días de prueba a partir de los cuales todavía no se avisa de nada. */
const TRIAL_WARN_DAYS = 7

const MS_PER_DAY = 86_400_000

export type EstadoTono = 'none' | 'warning' | 'error'

export interface EstadoAccion {
  label: string
  routeName: string
}

export interface EstadoPlan {
  /** Rótulo corto para la píldora. Siempre acompañado de `frase`: nunca va solo. */
  rotulo: string
  /**
   * La frase de apoyo, **obligatoria**. Un fondo ámbar no se puede leer por teléfono, que es
   * exactamente lo que hace la auxiliar cuando llama a soporte.
   */
  frase: string
  tono: EstadoTono
  /** `null` cuando no hay salida: **no se pinta un botón muerto**. */
  accion: EstadoAccion | null
}

const ROTULOS: Record<SubscriptionStatus, string> = {
  TRIALING: 'En prueba',
  ACTIVE: 'Al día',
  PAST_DUE: 'Pago pendiente',
  READ_ONLY: 'Solo consulta',
  CANCELLED: 'Cancelado',
  EXPIRED: 'Terminado',
}

/**
 * Rótulo del estado. Ante un valor que este front no conoce devuelve el código en mayúsculas
 * —feo a propósito, se lee como «falta traducir»— en vez de `undefined`.
 */
export function estadoRotulo(status: string | undefined): string {
  if (!status) return '—'
  return ROTULOS[status as SubscriptionStatus] ?? status.toUpperCase()
}

/** Días entre dos fechas ISO, en días completos. `null` si alguna no es una fecha válida. */
function diasEntre(desdeIso: string | undefined, hastaIso: string): number | null {
  const desde = parseISODate(desdeIso)
  const hasta = parseISODate(hastaIso)
  if (!desde || !hasta) return null
  return Math.floor((hasta.getTime() - desde.getTime()) / MS_PER_DAY)
}

/**
 * Días de cortesía que le quedan a una clínica en mora.
 *
 * <p>Devuelve **`null`, no `0`**, cuando falta `pastDueSince` o `graceDays`: son cosas
 * distintas. `0` es «se agotaron» y tiene su propia frase; `null` es «no lo sabemos», y
 * entonces la frase se queda en su forma genérica y **no se inventa un número**. Nunca
 * devuelve un negativo.
 */
export function graceDaysLeft(
  sub: Pick<SubscriptionResponse, 'pastDueSince' | 'graceDays'> | null | undefined,
  today: string = todayISO(),
): number | null {
  if (!sub || sub.graceDays == null || !sub.pastDueSince) return null
  const transcurridos = diasEntre(sub.pastDueSince, today)
  if (transcurridos == null) return null
  return Math.max(0, sub.graceDays - transcurridos)
}

/** Días que faltan para que termine la prueba. `null` si no hay fecha de fin. */
export function trialDaysLeft(
  sub: Pick<SubscriptionResponse, 'trialEndDate'> | null | undefined,
  today: string = todayISO(),
): number | null {
  if (!sub?.trialEndDate) return null
  const restantes = diasEntre(today, sub.trialEndDate)
  if (restantes == null) return null
  return Math.max(0, restantes)
}

/** `1 día` / `{n} días`, que es lo que exige la concordancia en número. */
function dias(n: number): string {
  return n === 1 ? '1 día' : `${n} días`
}

const VER_COBROS: EstadoAccion = {
  label: 'Ver mis cuentas de cobro',
  routeName: 'suscripcion-cobros',
}

const VER_PLAN: EstadoAccion = { label: 'Ver mi plan', routeName: 'suscripcion-plan' }

function enPrueba(sub: SubscriptionResponse, today: string): EstadoPlan {
  const restantes = trialDaysLeft(sub, today)
  const fin = formatDateShort(sub.trialEndDate)
  if (restantes != null && restantes <= TRIAL_WARN_DAYS) {
    return {
      rotulo: ROTULOS.TRIALING,
      frase: `Tu prueba termina el ${fin}. Después, el servicio pasa a cobrarse; no se corta nada por sí solo.`,
      tono: 'warning',
      accion: VER_PLAN,
    }
  }
  return {
    rotulo: ROTULOS.TRIALING,
    frase: `Estás probando el servicio hasta el ${fin}.`,
    tono: 'none',
    accion: null,
  }
}

function enMora(sub: SubscriptionResponse, today: string): EstadoPlan {
  const restantes = graceDaysLeft(sub, today)
  const desde = formatDateShort(sub.pastDueSince)
  // El orden de las frases NO es cosmético: «sigues trabajando» va PRIMERO porque es lo que
  // quita el pánico, y el pánico es lo que hace que alguien deje de atender para llamar.
  if (restantes == null) {
    return {
      rotulo: ROTULOS.PAST_DUE,
      frase: sub.pastDueSince
        ? `Tienes un saldo pendiente desde el ${desde}. Sigues trabajando con normalidad.`
        : 'Tienes un saldo pendiente. Sigues trabajando con normalidad.',
      tono: 'warning',
      accion: VER_COBROS,
    }
  }
  if (restantes === 0) {
    return {
      rotulo: ROTULOS.PAST_DUE,
      frase: `Tienes un saldo pendiente desde el ${desde} y se agotaron los días de cortesía. Sigues trabajando, pero conviene ponerse al día ya.`,
      tono: 'error',
      accion: VER_COBROS,
    }
  }
  return {
    rotulo: ROTULOS.PAST_DUE,
    frase: `Tienes un saldo pendiente desde el ${desde}. Sigues trabajando con normalidad. Te quedan ${dias(restantes)} de cortesía.`,
    tono: 'warning',
    accion: VER_COBROS,
  }
}

/**
 * Estado del plan tal como se le cuenta a la clínica: rótulo, frase de apoyo, tono y salida.
 *
 * <p>Sin plan (`null`) devuelve tono neutro y frase vacía: quien decide qué pintar en ese caso
 * es la pantalla, con su hueco honesto. Aquí no se inventa un plan a cero.
 */
export function estadoPlan(
  sub: SubscriptionResponse | null | undefined,
  today: string = todayISO(),
): EstadoPlan | null {
  if (!sub) return null
  switch (sub.status) {
    case 'TRIALING':
      return enPrueba(sub, today)
    case 'ACTIVE':
      return {
        rotulo: ROTULOS.ACTIVE,
        frase: `Todo en orden. El próximo cobro es el ${formatDateShort(sub.nextBillingDate)}.`,
        tono: 'none',
        accion: null,
      }
    case 'PAST_DUE':
      return enMora(sub, today)
    case 'READ_ONLY':
      return {
        rotulo: ROTULOS.READ_ONLY,
        // Las tres partes son obligatorias: qué conserva (consulta e impresión, INCLUIDA la
        // historia clínica), qué pierde, y cómo vuelve. Recortar cualquiera deja a alguien
        // contándolo por teléfono como si fuera otra cosa.
        frase:
          'Puedes consultar e imprimir todo lo tuyo, incluida la historia clínica. Por ahora no puedes crear ni modificar. Se reactiva en cuanto se regularice el pago.',
        tono: 'error',
        accion: VER_COBROS,
      }
    case 'CANCELLED':
      return {
        rotulo: ROTULOS.CANCELLED,
        frase: `Tu plan quedó cancelado el ${formatDateShort(sub.cancelEffectiveDate)}.`,
        tono: 'error',
        accion: null,
      }
    case 'EXPIRED':
      return {
        rotulo: ROTULOS.EXPIRED,
        frase: `Tu plan terminó el ${formatDateShort(sub.currentPeriodEnd)} y no se renovó.`,
        tono: 'error',
        accion: null,
      }
    default:
      return null
  }
}

/**
 * La baja pedida y todavía no efectiva.
 *
 * <p>**No es un aviso, es un hecho del plan**, así que no lleva tono ni banner: se cuenta en la
 * ficha «Baja registrada» de Mi plan. Que el plan siga vigente hasta la fecha efectiva es la
 * duda que frena a cualquiera, y responderla es la diferencia entre una acción que se toma y una
 * llamada a soporte.
 */
export function bajaRegistrada(sub: SubscriptionResponse | null | undefined): string | null {
  if (!sub?.cancelRequestedAt && !sub?.cancelEffectiveDate) return null
  if (!sub.cancelRequestedAt || !sub.cancelEffectiveDate) {
    return 'Pediste la baja de tu plan. Sigues trabajando con normalidad hasta el final del periodo que ya está pagado.'
  }
  return `Pediste la baja el ${formatDateShort(sub.cancelRequestedAt)}. Sigues trabajando con normalidad hasta el ${formatDateShort(sub.cancelEffectiveDate)}: es el periodo que ya está pagado.`
}

/** Ciclo de cobro en español. */
export function cicloLabel(ciclo: string | undefined): string {
  if (ciclo === 'MONTHLY') return 'Mensual'
  if (ciclo === 'ANNUAL') return 'Anual'
  return ciclo ? ciclo.toUpperCase() : '—'
}
