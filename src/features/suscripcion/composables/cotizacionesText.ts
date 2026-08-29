import { formatDateShort, parseISODate, todayISO } from '@/composables/format'
import { formatMoney } from '@/composables/money'
import type { QuoteStatus } from '../types/cotizaciones.types'
import type { MandateStatus, PaymentMethodKind } from '../types/medios-pago.types'

/**
 * El vocabulario de las propuestas y de los medios de pago. **Puro**: funciones y datos.
 *
 * <p>Va aparte de `estadoSuscripcion.ts` porque habla de otra cosa —lo que la plataforma
 * propone y lo que la clínica tiene registrado para pagar—, y aparte de `cobrosText.ts` porque
 * una propuesta no es una cuenta de cobro. Los tres son barribles por una prueba unitaria, que
 * es la razón de que sean puros.
 */

export const SIN_COTIZACIONES =
  'No tienes ninguna propuesta pendiente. Cuando VetSoftware te prepare una, aparecerá aquí.'

/**
 * A dónde lleva «Pedir más cupo». **El tenant no puede añadir líneas** —`POST
 * /subscriptions/{id}/items` es de sistema—, así que el botón no abre un formulario de alta:
 * lleva aquí con una explicación honesta. Es preferible a un control apagado con un `title`.
 */
export const PEDIR_MAS_CUPO = {
  fuerte: 'Para ampliar tus cupos necesitas una propuesta nueva.',
  resto:
    'Escríbenos y te la preparamos; cuando esté, aparecerá aquí y podrás aceptarla desde esta pantalla.',
} as const

const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  DRAFT: 'Borrador',
  SENT: 'Pendiente de tu respuesta',
  ACCEPTED: 'Aceptada',
  REJECTED: 'Rechazada',
  EXPIRED: 'Vencida',
}

/** El nombre del enum no se enseña. `DRAFT` además no se lista: es borrador de plataforma. */
export function quoteStatusLabel(status: string | undefined): string {
  if (!status) return '—'
  return QUOTE_STATUS_LABELS[status as QuoteStatus] ?? status.toUpperCase()
}

/** Un borrador de plataforma no le concierne a la clínica y no aparece en su listado. */
export function esListable(status: string | undefined): boolean {
  return status !== 'DRAFT'
}

export interface Vigencia {
  texto: string
  /** `true` mientras la propuesta se puede aceptar. */
  vigente: boolean
}

const MS_PER_DAY = 86_400_000

/** Vigencia en texto: nunca solo por color. */
export function vigencia(validUntil: string | undefined, today: string = todayISO()): Vigencia {
  const hasta = parseISODate(validUntil)
  const hoy = parseISODate(today)
  if (!hasta || !hoy) return { texto: 'Sin fecha de vencimiento', vigente: true }
  const dias = Math.floor((hasta.getTime() - hoy.getTime()) / MS_PER_DAY)
  if (dias > 0) return { texto: `Vigente hasta el ${formatDateShort(validUntil)}`, vigente: true }
  if (dias === 0) return { texto: 'Vence hoy', vigente: true }
  const n = Math.abs(dias)
  return { texto: `Venció hace ${n === 1 ? '1 día' : `${n} días`}`, vigente: false }
}

/**
 * El texto de confirmación de aceptar.
 *
 * <p>Cita **el importe que se mostró en pantalla**, no uno recalculado: es lo que la clínica
 * está aceptando y es lo que se le va a cobrar.
 */
export function confirmarAceptacion(quoteNumber: string | undefined, totalMostrado: number) {
  return {
    antes: `Vas a aceptar la propuesta ${quoteNumber ?? '—'} por`,
    importe: formatMoney(totalMostrado),
    despues:
      '. Al aceptar, tu plan cambia con las líneas de esta propuesta y este es el importe que se te cobrará.',
  }
}

/**
 * El aviso de que el importe cambió mientras se confirmaba. **Nunca se sobrescribe en
 * silencio**: se enseñan los dos números y se deja la decisión en manos de quien acepta.
 */
export function importeCambiado(mostrado: number, devuelto: number): string {
  return `El importe cambió mientras confirmabas: te mostramos ${formatMoney(mostrado)} y quedó en ${formatMoney(devuelto)}. Revísalo antes de seguir; si no cuadra, escríbenos.`
}

export function confirmarRechazo(quoteNumber: string | undefined): string {
  return `Vas a rechazar la propuesta ${quoteNumber ?? '—'}. Puedes pedir otra cuando quieras; esta quedará marcada como rechazada.`
}

export function confirmarBaja(cancelEffectiveDate: string | undefined): string {
  return `Vas a pedir la baja de tu plan. Seguirás trabajando con normalidad hasta el ${formatDateShort(cancelEffectiveDate)}, que es el final del periodo que ya pagaste. Tus datos no se borran.`
}

/** No se impide la acción: **el backend decide, no la pantalla**. Solo se advierte. */
export function avisoPermanencia(commitmentEndDate: string | undefined): string {
  return `Tu plan tiene permanencia hasta el ${formatDateShort(commitmentEndDate)}. Pedir la baja ahora puede tener consecuencias sobre lo pactado; te contactaremos.`
}

/**
 * La frase «los datos que ya tienes no se borran» **no es opcional**: es la duda que frena a
 * cualquiera, y responderla es la diferencia entre una acción que se toma y una llamada a
 * soporte.
 */
export function confirmarQuitarLinea(itemName: string | undefined): string {
  return `Vas a quitar «${itemName ?? 'esta línea'}» de tu plan. Los datos que ya tienes en ese módulo no se borran: dejas de poder crear y modificar en él.`
}

export function avisoBajarCantidad(usado: number, nuevo: number, nombre: string): string {
  return `Ahora usas ${usado} ${nombre} y quieres bajar a ${nuevo}. Lo que ya tienes registrado no se borra, pero no podrás crear más hasta volver por debajo del nuevo cupo.`
}

// ── Medios de pago ───────────────────────────────────────────────────────────

export const SIN_MEDIOS_PAGO = 'No tienes ningún medio de pago registrado.'

/**
 * El hueco honesto del alta. Ver `RegisterSubscriptionPaymentMethodRequest`: el endpoint exige
 * un token de pasarela y este front no tiene widget de tokenización.
 */
export const ALTA_MEDIO_PAGO =
  'Para registrar un medio de pago nuevo, escríbenos y lo dejamos listo.'

const METHOD_KIND_LABELS: Record<PaymentMethodKind, string> = { CARD: 'Tarjeta', PSE: 'PSE' }

export function methodKindLabel(kind: PaymentMethodKind | undefined): string {
  if (!kind) return '—'
  return METHOD_KIND_LABELS[kind] ?? kind.toUpperCase()
}

const MANDATE_LABELS: Record<MandateStatus, string> = {
  ACTIVE: 'Activo',
  REVOKED: 'Revocado',
  EXPIRED: 'Vencido',
}

export function mandateStatusLabel(status: MandateStatus | undefined): string {
  if (!status) return '—'
  return MANDATE_LABELS[status] ?? status.toUpperCase()
}

/** Cómo se nombra un medio de pago en una frase: `tu Visa terminada en 4242`. */
export function medioTexto(brand: string | undefined, lastFour: string | undefined): string {
  const marca = brand ?? 'tarjeta'
  return lastFour ? `${marca} terminada en ${lastFour}` : marca
}

export interface AvisoMedioPago {
  tono: 'warning' | 'error'
  fuerte: string
  resto: string
}

/** Días de antelación con los que se avisa de un vencimiento. */
const DIAS_AVISO_VENCIMIENTO = 60

/**
 * El aviso de una tarjeta que vence.
 *
 * <p>Se calcula contra `nextBillingDate`, **no contra hoy sin más**: el caso que evita el cobro
 * rechazado es «vence antes del próximo cobro», y es el que manda.
 */
export function avisoVencimiento(
  brand: string | undefined,
  lastFour: string | undefined,
  expiresOn: string | undefined,
  nextBillingDate: string | undefined,
  today: string = todayISO(),
): AvisoMedioPago | null {
  const vence = parseISODate(expiresOn)
  const hoy = parseISODate(today)
  if (!vence || !hoy) return null
  const medio = medioTexto(brand, lastFour)

  if (vence.getTime() < hoy.getTime()) {
    return {
      tono: 'error',
      fuerte: `Tu ${medio} venció el ${formatDateShort(expiresOn)}.`,
      resto: 'Registra otro medio de pago para el próximo cobro.',
    }
  }

  const cobro = parseISODate(nextBillingDate)
  if (cobro && vence.getTime() < cobro.getTime()) {
    return {
      tono: 'warning',
      fuerte: `Tu ${medio} vence el ${formatDateShort(expiresOn)}.`,
      resto: `Si vence antes del próximo cobro (${formatDateShort(nextBillingDate)}), el cobro será rechazado. Actualízala antes.`,
    }
  }

  const dias = Math.floor((vence.getTime() - hoy.getTime()) / MS_PER_DAY)
  if (dias <= DIAS_AVISO_VENCIMIENTO) {
    return {
      tono: 'warning',
      fuerte: `Tu ${medio} vence el ${formatDateShort(expiresOn)}.`,
      resto: 'Conviene actualizarla antes de que llegue la fecha.',
    }
  }
  return null
}

/** La consecuencia va escrita ANTES del botón, y el caso de único medio activo tiene la suya. */
export function confirmarRevocacion(
  brand: string | undefined,
  lastFour: string | undefined,
  esUnicoActivo: boolean,
  nextBillingDate: string | undefined,
): string {
  const medio = medioTexto(brand, lastFour)
  if (esUnicoActivo) {
    return `Es tu único medio de pago activo. Si lo revocas, el cobro del ${formatDateShort(nextBillingDate)} no se podrá hacer y tu plan pasará a pago pendiente.`
  }
  return `Vas a revocar tu ${medio}. Dejará de usarse para cobrar tu suscripción. Si es el único medio activo, el próximo cobro no se podrá hacer.`
}
