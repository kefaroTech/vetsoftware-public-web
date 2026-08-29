import { formatDateShort, parseISODate, todayISO } from '@/composables/format'
import { formatMoney } from '@/composables/money'
import type {
  BillingDocumentKind,
  BillingDocumentResponse,
  BillingIssueStatus,
  BillingReason,
  DunningEventType,
  SubscriptionChargeType,
  SubscriptionPaymentStatus,
} from '../types/cobros.types'
import type { TaxTreatment } from '../types/suscripcion.types'

/**
 * El vocabulario de las cuentas de cobro. **Puro**: funciones y datos, sin estado.
 *
 * <p>Aquí se traduce todo lo que el backend nombra para un operador. El nombre de un enum no se
 * enseña nunca: un `AWAITING_EXTERNAL` visible en crudo hace que la clínica llame preguntando
 * por un estado que no le concierne.
 */

/**
 * Cabecera de la pantalla. **Sin `role` ni `aria-live`**: está en el DOM desde el primer
 * render, y una región viva sobre contenido inicial o se anuncia dos veces o no se anuncia
 * ninguna, según el lector.
 */
/*
 * Decía «Aquí las consultas **y las descargas**», y no hay ninguna descarga: cero ocurrencias de
 * `descarg`, `download` o `.pdf` en toda la feature. Prometer un botón que no existe es
 * exactamente el fallo que esta frase existía para evitar, con otro verbo — y quien viene a
 * buscar su factura en PDF se va sin ella y sin saber dónde está. Implementarla necesita backend
 * (el documento fiscal lo emite el proveedor DIAN); quitar la promesa, no.
 */
export const CABECERA_SOLO_LECTURA =
  'Las cuentas de cobro las emite VetSoftware. Aquí las consultas; no se registran pagos desde esta pantalla.'

export const SIN_DOCUMENTOS =
  'Todavía no tienes cuentas de cobro. Aparecerán aquí en cuanto se emita la primera.'

/**
 * La separación devengado / facturado / cobrado de la consola, renombrada entera. La palabra
 * «devengado» no aparece en ninguna pantalla del tenant.
 */
/*
 * `acumulado: 'Lo que se está acumulando este mes'` vivía aquí sin un solo consumidor. Se borra
 * en vez de conectarse, y el motivo es que no hay dónde: rotula el bloque de lo DEVENGADO, y el
 * tenant no tiene ningún listado de cargos aún no facturados —los cargos se leen por documento
 * (`GET /subscription-billing/charges?billingDocumentId=…`), no por periodo abierto—. Un rótulo
 * esperando a una pantalla que nadie ha pedido es deuda, no previsión.
 */
export const MONEY_LABELS = {
  facturado: 'Tus cuentas de cobro',
  cobrado: 'Tus pagos',
} as const

const KIND_LABELS: Record<BillingDocumentKind, string> = {
  INVOICE: 'Factura',
  CREDIT_NOTE: 'Nota de crédito',
  DEBIT_NOTE: 'Nota de débito',
}

export function documentKindLabel(kind: BillingDocumentKind | undefined): string {
  if (!kind) return '—'
  return KIND_LABELS[kind] ?? kind.toUpperCase()
}

/**
 * `issueStatus` colapsado a **una sola frase** para el cliente, o `null` cuando lo que procede
 * es enseñar el número fiscal.
 */
export function estadoEmision(status: BillingIssueStatus | undefined): string | null {
  switch (status) {
    case 'DRAFT':
    case 'AWAITING_EXTERNAL':
      return 'En preparación'
    case 'VOIDED':
      return 'Anulada'
    default:
      return null
  }
}

/**
 * Cómo se identifica una cuenta de cobro **para el cliente**.
 *
 * <p>Es `externalInvoiceNumber` —su factura fiscal— y **nunca** `documentNumber`, que es el
 * documento de cobro interno `DC-…`. Mientras no esté emitida, se dice que está en preparación
 * en vez de enseñar una referencia que no le sirve a nadie.
 */
export function referenciaDocumento(doc: BillingDocumentResponse): string {
  if (doc.externalInvoiceNumber) return doc.externalInvoiceNumber
  return estadoEmision(doc.issueStatus) ?? 'En preparación'
}

export type TonoDocumento = 'none' | 'info' | 'warning' | 'error'

export interface EstadoDocumento {
  tono: TonoDocumento
  texto: string
}

/**
 * El estado de una cuenta de cobro, en texto y no solo por color de fila.
 *
 * <p>Un pago parcial se dice entero: `settledAmount > 0` **y** `balanceAmount > 0` a la vez es
 * «Pagado X de Y». Pintarlo como «pendiente» a secas hace que la clínica pague dos veces.
 */
export function estadoDocumento(
  doc: BillingDocumentResponse,
  today: string = todayISO(),
): EstadoDocumento {
  if (doc.issueStatus === 'VOIDED') return { tono: 'none', texto: 'Anulada' }

  const saldo = doc.balanceAmount ?? 0
  const pagado = doc.settledAmount ?? 0
  const total = doc.totalAmount ?? 0

  if (saldo <= 0) return { tono: 'none', texto: 'Pagada' }

  if (pagado > 0) {
    return {
      tono: 'warning',
      texto: `Pagado ${formatMoney(pagado)} de ${formatMoney(total)} · ${formatMoney(saldo)} pendientes`,
    }
  }

  const vence = parseISODate(doc.dueDate)
  const hoy = parseISODate(today)
  if (vence && hoy && vence.getTime() < hoy.getTime()) {
    return {
      tono: 'error',
      texto: `Vencida el ${formatDateShort(doc.dueDate)} · ${formatMoney(saldo)} pendientes`,
    }
  }
  return { tono: 'warning', texto: `Pendiente de pago · ${formatMoney(saldo)}` }
}

/** `true` si la cuenta está vencida: va la primera de la tabla. */
export function estaVencida(doc: BillingDocumentResponse, today: string = todayISO()): boolean {
  return estadoDocumento(doc, today).tono === 'error'
}

/** El saldo a favor, con su caducidad cuando la tiene. */
export function saldoAFavorTexto(balanceAmount: number, nextExpiryOn?: string): EstadoDocumento {
  if (nextExpiryOn) {
    return {
      tono: 'warning',
      texto: `Tienes ${formatMoney(balanceAmount)} a favor. La parte más próxima caduca el ${formatDateShort(nextExpiryOn)}.`,
    }
  }
  return {
    tono: 'info',
    texto: `Tienes ${formatMoney(balanceAmount)} a favor. Se descuentan solos de tu próxima cuenta de cobro.`,
  }
}

const DUNNING_LABELS: Record<DunningEventType, string> = {
  REMINDER_SENT: 'Te enviamos un recordatorio',
  GRACE_STARTED: 'Empezaron tus días de cortesía',
  READ_ONLY_APPLIED: 'Tu plan pasó a solo consulta',
  REACTIVATED: 'Tu plan volvió a la normalidad',
  WRITTEN_OFF: 'Se dio de baja el saldo',
}

/** El nombre del enum no se enseña nunca. */
export function dunningLabel(tipo: DunningEventType | undefined): string {
  if (!tipo) return '—'
  return DUNNING_LABELS[tipo] ?? tipo.toUpperCase()
}

/**
 * Agrupación de los cargos de una cuenta, que es lo que responde a «¿de dónde salen estos
 * 18.500?».
 *
 * <p>Ojo con los dos enums, que se parecen y no son el mismo: `chargeType` (`RECURRING`,
 * `PRORATION`, `ONE_TIME`, `CREDIT`, `DISCOUNT`, `OVERAGE`) vive en el cargo, y `billingReason`
 * (`RECURRING_CYCLE`, `PRORATION`, `ONE_TIME`, `ADJUSTMENT`) vive en el documento. `ADJUSTMENT`
 * es solo del segundo.
 */
const CHARGE_LABELS: Record<SubscriptionChargeType, string> = {
  RECURRING: 'Tu plan del mes',
  PRORATION: 'Ajuste por días',
  ONE_TIME: 'Cargo puntual',
  OVERAGE: 'Excedente',
  CREDIT: 'Abono',
  DISCOUNT: 'Descuento',
}

export function chargeGroupLabel(tipo: SubscriptionChargeType | undefined): string {
  if (!tipo) return 'Otros cargos'
  return CHARGE_LABELS[tipo] ?? tipo.toUpperCase()
}

const REASON_LABELS: Record<BillingReason, string> = {
  RECURRING_CYCLE: 'Tu plan del mes',
  PRORATION: 'Ajuste por días',
  ONE_TIME: 'Cargo puntual',
  ADJUSTMENT: 'Ajuste',
}

export function billingReasonLabel(reason: BillingReason | undefined): string {
  if (!reason) return '—'
  return REASON_LABELS[reason] ?? reason.toUpperCase()
}

const TAX_LABELS: Record<TaxTreatment, string> = {
  TAXED: 'Con IVA',
  EXCLUDED: 'Excluido de IVA',
  EXEMPT: 'Exento',
}

export function taxTreatmentLabel(t: TaxTreatment | undefined): string {
  if (!t) return '—'
  return TAX_LABELS[t] ?? t.toUpperCase()
}

/** El desglose de impuesto se pinta como frase, no como una columna de `taxRate`. */
export function impuestoTexto(
  taxRate: number | undefined,
  taxableBase: number | undefined,
  taxAmount: number | undefined,
): string {
  const tasa = taxRate ?? 0
  return `IVA ${tasa} % sobre ${formatMoney(taxableBase ?? 0)}: ${formatMoney(taxAmount ?? 0)}`
}

/** «¿De dónde salen estos 18.500?», dicho en una línea. */
export function excedenteTexto(
  nombre: string,
  cantidad: number,
  limite: number,
  unitario: number,
): string {
  return `Excedente de ${nombre}: ${cantidad} sobre tu cupo de ${limite}, a ${formatMoney(unitario)} cada uno.`
}

const PAYMENT_STATUS_LABELS: Record<SubscriptionPaymentStatus, string> = {
  PENDING: 'En proceso',
  CONFIRMED: 'Confirmado',
  FAILED: 'No se pudo aplicar',
  REFUNDED: 'Devuelto',
}

export function paymentStatusLabel(status: SubscriptionPaymentStatus | undefined): string {
  if (!status) return '—'
  return PAYMENT_STATUS_LABELS[status] ?? status.toUpperCase()
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  TRANSFER: 'Transferencia',
  CARD: 'Tarjeta',
  PSE: 'PSE',
  CASH: 'Efectivo',
  OTHER: 'Otro',
}

export function paymentMethodLabel(kind: string | undefined): string {
  if (!kind) return '—'
  return PAYMENT_METHOD_LABELS[kind] ?? kind.toUpperCase()
}
