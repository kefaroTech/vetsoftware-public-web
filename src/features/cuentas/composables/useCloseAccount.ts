import { computed, ref, type Ref } from 'vue'
import { useCuentas } from './useCuentas'
import { useAccountFiscalCustomer } from './useAccountFiscalCustomer'
import { useToast } from '@/composables/useToast'
import { useFeUvt } from '@/features/facturacion/composables/useFeUvt'
import { feFiscalChecklist } from '@/features/facturacion/composables/feFiscalChecklist'
import { useFacturacionAccess } from '@/features/facturacion/composables/useFacturacionAccess'
import { useReceiptPrint } from '@/composables/useReceiptPrint'
import { useReceiptSettings } from '@/composables/useReceiptSettings'
import { buildDocumentReceiptTicket } from '@/composables/buildDocumentReceipt'
import { electronicDocumentApi } from '@/features/facturacion/api/electronicDocument.api'
import { formatMoney } from '@/features/tienda/composables/pricing'
import { getProblemDetailMessage, isConcurrencyConflict } from '@/services/http/http.client'
import { scrollToFirstError } from '@/composables/scrollToError'
import type { ElectronicDocumentResponse } from '@/features/facturacion/types/facturacion'
import {
  PAYMENT_METHOD_LABEL,
  type OpenAccountResponse,
  type PaymentMethod,
} from '../types/cuentas'

export type CloseMotivo = 'COBRADA' | 'CANCELADA'
export type FeDocType = 'DOC_EQUIV_POS' | 'FE_VENTA'

export const CLOSE_DOC_TYPE_OPTIONS: { value: FeDocType; label: string }[] = [
  { value: 'DOC_EQUIV_POS', label: 'Documento POS' },
  { value: 'FE_VENTA', label: 'Factura electrónica' },
]

export const CLOSE_METHOD_OPTIONS = (
  Object.entries(PAYMENT_METHOD_LABEL) as [PaymentMethod, string][]
).map(([value, label]) => ({ value, label }))

/**
 * Reglas del cierre de una cuenta: motivo, cobro del saldo, emisión DIAN y el
 * recibo posterior.
 *
 * Sale entero de `CloseAccountModal`. Lo delicado que vive aquí es la
 * idempotencia: el cierre son dos requests (abono del saldo + cambio de estado)
 * y si el primero pasa y el segundo falla, los marcadores impiden que el
 * reintento vuelva a cobrar.
 */
export function useCloseAccount(
  account: Ref<OpenAccountResponse | null>,
  emit: { refresh: () => void },
) {
  const store = useCuentas()
  const toast = useToast()
  /** Desglose fiscal de la cuenta (base gravable+exenta, IVA por tarifa, total). */
  const breakdown = store.taxBreakdown
  /** Facturación electrónica: solo si el usuario puede emitir (módulo premium). */
  const { canEmit } = useFacturacionAccess()

  const step = ref<'cobro' | 'recibo'>('cobro')
  const motivo = ref<CloseMotivo>('COBRADA')
  const method = ref<PaymentMethod>('CASH')
  const reason = ref('')
  // Feedback a nivel de campo del motivo de cancelación (espejo de VoidChargeModal):
  // el error solo se muestra tras intentar guardar. El botón sigue gateado por `canConfirm`.
  const submitted = ref(false)
  const busy = ref(false)
  /** Documento DIAN a auto-emitir al cerrar (solo COBRADA). Default: documento POS. */
  const docType = ref<FeDocType>('DOC_EQUIV_POS')
  const finalConsumer = ref(false)

  // El umbral se evalúa sobre el TOTAL de la cuenta (valor del documento), no el saldo.
  const { isOverThreshold } = useFeUvt()
  const overUvt = computed(() => canEmit.value && isOverThreshold(account.value?.totalAmount ?? 0))
  const fiscal = useAccountFiscalCustomer(computed(() => account.value?.owner.id))

  const feComplete = computed(() =>
    overUvt.value && motivo.value === 'COBRADA'
      ? feFiscalChecklist(fiscal.customer.value).complete
      : true,
  )

  const result = ref<{ account: OpenAccountResponse; charged: number } | null>(null)
  /** Documento fiscal emitido al cerrar: permite imprimir el MISMO recibo que el POS. */
  const feDocument = ref<ElectronicDocumentResponse | null>(null)

  const paymentDone = ref(false)
  const charged = ref(0)
  /**
   * Idempotency key del abono del cierre (servidor): el reintento reusa la misma
   * → no cobra dos veces aunque se pierda la respuesta. Complementa los
   * marcadores de cliente de arriba.
   */
  const paymentRequestId = ref('')

  const outstanding = computed(() => account.value?.outstandingAmount ?? 0)
  const ownerName = computed(() => account.value?.owner.name ?? '')

  const note = computed(() => {
    if (motivo.value === 'CANCELADA') return 'La cuenta pasa a Cancelada y el saldo se anula.'
    return outstanding.value > 0
      ? `Se cobra ${formatMoney(outstanding.value)} y la cuenta pasa a Cerrada.`
      : 'El saldo está en cero; la cuenta se cierra sin cobro.'
  })

  const primaryLabel = computed(() =>
    motivo.value === 'CANCELADA'
      ? 'Cancelar cuenta'
      : overUvt.value
        ? 'Emitir factura electrónica'
        : 'Cobrar y cerrar',
  )

  const reasonError = computed(() =>
    motivo.value === 'CANCELADA' && reason.value.trim() === ''
      ? 'Indica el motivo de la cancelación'
      : null,
  )

  // El motivo es obligatorio al cancelar; si supera 5 UVT, el cliente debe tener
  // datos fiscales completos.
  const canConfirm = computed(
    () =>
      !busy.value &&
      !(motivo.value === 'CANCELADA' && reason.value.trim() === '') &&
      feComplete.value,
  )

  /** El abono ya se registró pero el cierre falló: el reintento solo cambia el estado. */
  const retryHint = computed(() => !busy.value && paymentDone.value && step.value === 'cobro')

  const receiptCancel = computed(() => result.value?.charged === 0 && motivo.value === 'CANCELADA')
  const receiptTitle = computed(() =>
    receiptCancel.value ? 'Cuenta cancelada sin cobro' : 'Cuenta cerrada y cobrada',
  )

  /** Comprobante interno de cierre/cobro (no es la representación fiscal DIAN). */
  const { printReceipt } = useReceiptPrint()
  const { width, setWidth } = useReceiptSettings()

  function onPrint() {
    const r = result.value
    if (!r) return
    // Si el cierre emitió documento fiscal, imprime el MISMO recibo que el POS.
    if (feDocument.value) {
      printReceipt(buildDocumentReceiptTicket(feDocument.value, { width: width.value }))
      return
    }
    // Fallback (cuenta cancelada o cobrada sin módulo de facturación).
    const dateTime = new Date().toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
    const footerNote = receiptCancel.value
      ? r.account.closeReason
        ? `Motivo: ${r.account.closeReason} · no válido como factura`
        : 'Cuenta cancelada · no válido como factura'
      : 'Comprobante de cobro · no válido como factura'
    printReceipt({
      width: width.value,
      brand: { name: r.account.company.name },
      fiscal: r.account.company.identifier ? [`NIT ${r.account.company.identifier}`] : undefined,
      docType: receiptTitle.value,
      docNumber: `Cuenta #${r.account.id}`,
      meta: [{ label: 'Fecha', value: dateTime }],
      lines: [],
      totals: [
        { label: 'Acumulado', value: formatMoney(r.account.totalAmount), kind: 'muted' },
        { label: 'Abonado', value: formatMoney(r.account.paidAmount), kind: 'muted' },
        { label: 'Cobrado ahora', value: formatMoney(r.charged), kind: 'grand' },
      ],
      payPill:
        r.charged > 0
          ? `${PAYMENT_METHOD_LABEL[method.value] ?? method.value} · Contado`
          : undefined,
      footer: { lines: [footerNote] },
    })
  }

  /** Arranque del modal: vuelve al paso de cobro y limpia todos los marcadores. */
  function reset() {
    step.value = 'cobro'
    motivo.value = 'COBRADA'
    method.value = 'CASH'
    reason.value = ''
    submitted.value = false
    busy.value = false
    result.value = null
    feDocument.value = null
    paymentDone.value = false
    charged.value = 0
    paymentRequestId.value = crypto.randomUUID()
    docType.value = 'DOC_EQUIV_POS'
    finalConsumer.value = false
    fiscal.reset()
    if (account.value && canEmit.value && isOverThreshold(account.value.totalAmount)) {
      // Precarga sincrónica con el titular + enriquecido asíncrono con sus datos
      // fiscales completos.
      fiscal.preload(account.value.owner)
      void fiscal.load()
    }
  }

  async function confirm() {
    submitted.value = true
    if (!account.value || busy.value || !canConfirm.value) {
      scrollToFirstError()
      return
    }
    const accountId = account.value.id
    busy.value = true
    try {
      // 1. Cobrada con saldo: registrar el abono UNA sola vez (idempotente en
      //    reintento). El backend exige saldo cero para CLOSE, así que el abono va
      //    antes del cambio de estado.
      if (motivo.value === 'COBRADA' && outstanding.value > 0 && !paymentDone.value) {
        await store.addPaymentNoRefresh(
          accountId,
          outstanding.value,
          method.value,
          paymentRequestId.value,
        )
        charged.value = outstanding.value
        paymentDone.value = true
      }
      // 2. Cambiar el estado (CLOSE/CANCEL). Si esto falla, el marcador evita
      //    recobrar. Al CERRAR, el backend auto-emite el documento DIAN
      //    (best-effort) según docType/finalConsumer. La factura va SIEMPRE al
      //    titular de la cuenta (el endpoint de cierre no acepta otro adquiriente).
      const emitting = motivo.value === 'COBRADA' && canEmit.value
      const updated = await store.changeAccountStatus(
        accountId,
        motivo.value === 'CANCELADA' ? 'CANCEL' : 'CLOSE',
        motivo.value === 'CANCELADA' ? reason.value.trim() : undefined,
        emitting ? (overUvt.value ? 'FE_VENTA' : docType.value) : undefined,
        emitting ? (overUvt.value ? false : finalConsumer.value) : undefined,
        // Si se acaba de registrar el abono del saldo (sin refrescar), la versión
        // cacheada quedó vieja: omitir el chequeo temprano para no provocar un 409
        // falso (el optimistic lock al flush protege).
        !paymentDone.value,
      )
      result.value = {
        account: updated,
        charged: motivo.value === 'COBRADA' ? charged.value : 0,
      }
      // Trae el documento fiscal emitido al cerrar (si lo hubo) para imprimir el
      // recibo igual que el POS. Best-effort: si falla o no hay documento, el
      // recibo cae al fallback con datos de la cuenta.
      if (motivo.value === 'COBRADA') {
        try {
          feDocument.value = await electronicDocumentApi.findByAccount(accountId)
        } catch {
          feDocument.value = null
        }
      }
      if (motivo.value === 'COBRADA') {
        toast.success(
          'Cuenta cerrada',
          emitting
            ? `Venta de ${ownerName.value} cerrada · factura en proceso.`
            : `La cuenta de ${ownerName.value} se cerró.`,
        )
      } else {
        toast.success('Cuenta cancelada', `La cuenta de ${ownerName.value} se canceló.`)
      }
      step.value = 'recibo'
    } catch (e) {
      if (isConcurrencyConflict(e)) {
        toast.warn('Conflicto de concurrencia', getProblemDetailMessage(e))
        emit.refresh()
      } else {
        toast.error('Ocurrió un error', getProblemDetailMessage(e, 'No se pudo cerrar la cuenta'))
      }
    } finally {
      busy.value = false
    }
  }

  return {
    breakdown,
    canEmit,
    step,
    motivo,
    method,
    reason,
    submitted,
    busy,
    docType,
    finalConsumer,
    overUvt,
    fiscal,
    result,
    outstanding,
    ownerName,
    note,
    primaryLabel,
    reasonError,
    canConfirm,
    retryHint,
    receiptCancel,
    receiptTitle,
    width,
    setWidth,
    onPrint,
    reset,
    confirm,
  }
}
