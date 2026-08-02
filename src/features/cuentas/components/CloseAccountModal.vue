<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Check, Printer, Receipt, X, FileText, ShieldCheck, User } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import BaseField from '@/features/dashboard/components/ui/BaseField.vue'
import BaseInput from '@/features/dashboard/components/ui/BaseInput.vue'
import BaseSelect from '@/features/dashboard/components/ui/BaseSelect.vue'
import { useFeUvt } from '@/features/facturacion/composables/useFeUvt'
import {
  feFiscalChecklist,
  type FiscalCustomer,
} from '@/features/facturacion/composables/feFiscalChecklist'
import FeThresholdBanner from '@/features/facturacion/components/FeThresholdBanner.vue'
import FeFiscalCustomerCard from '@/features/facturacion/components/FeFiscalCustomerCard.vue'
import FeCustomerFiscalModal from '@/features/facturacion/components/FeCustomerFiscalModal.vue'
import {
  ownerApi,
  type OwnerResponse,
  type UpdateOwnerRequest,
} from '@/features/dashboard/views/consulta/nueva/api/owner.api'
import { useCuentas } from '../composables/useCuentas'
import { formatMoney } from '@/features/tienda/composables/pricing'
import { getProblemDetailMessage, isConcurrencyConflict } from '@/services/http/http.client'
import { useToast } from '@/composables/useToast'
import { useFacturacionAccess } from '@/features/facturacion/composables/useFacturacionAccess'
import { useReceiptPrint } from '@/composables/useReceiptPrint'
import { useReceiptSettings } from '@/composables/useReceiptSettings'
import { buildDocumentReceiptTicket } from '@/composables/buildDocumentReceipt'
import { electronicDocumentApi } from '@/features/facturacion/api/electronicDocument.api'
import type { ElectronicDocumentResponse } from '@/features/facturacion/types/facturacion'
import {
  PAYMENT_METHOD_LABEL,
  type OpenAccountResponse,
  type OwnerSummary,
  type PaymentMethod,
} from '../types/cuentas'
import { scrollToFirstError } from '@/composables/scrollToError'

const props = defineProps<{
  open: boolean
  account: OpenAccountResponse | null
}>()

const emit = defineEmits<{ close: []; closed: [account: OpenAccountResponse]; refresh: [] }>()

const store = useCuentas()
const toast = useToast()
// Desglose fiscal de la cuenta (base gravable+exenta, IVA por tarifa, total) para el paso de cobro.
const breakdown = store.taxBreakdown
// Facturación electrónica: solo si el usuario puede emitir (módulo premium). Reactivo.
const { canEmit } = useFacturacionAccess()

type Motivo = 'COBRADA' | 'CANCELADA'
type FeDocType = 'DOC_EQUIV_POS' | 'FE_VENTA'

const step = ref<'cobro' | 'recibo'>('cobro')
const motivo = ref<Motivo>('COBRADA')
const method = ref<PaymentMethod>('CASH')
const reason = ref('')
// Feedback a nivel de campo del motivo de cancelación (espejo de VoidChargeModal): el error
// solo se muestra tras intentar guardar. El botón sigue gateado por `canConfirm`.
const submitted = ref(false)
const busy = ref(false)
// Documento DIAN a auto-emitir al cerrar (solo COBRADA). Default: documento POS.
const docType = ref<FeDocType>('DOC_EQUIV_POS')
const finalConsumer = ref(false)

// ── FE obligatoria por superar 5 UVT ──────────────────────────────────────────
// El umbral se evalúa sobre el TOTAL de la cuenta (valor del documento), no el saldo.
const { isOverThreshold } = useFeUvt()
const overUvt = computed(
  () => canEmit.value && isOverThreshold(props.account?.totalAmount ?? 0),
)
const ownerFull = ref<OwnerResponse | null>(null)
const feCustomer = ref<FiscalCustomer | null>(null)
const fiscalModalOpen = ref(false)
const loadingOwner = ref(false)
const loadError = ref(false)

// Precarga inmediata (sin esperar al fetch) desde el resumen del titular de la cuenta: garantiza que la
// tarjeta fiscal nunca aparezca vacía pidiendo "Seleccionar cliente". loadOwnerFiscal() la enriquece luego.
function fromOwnerSummary(o: OwnerSummary): FiscalCustomer {
  return {
    name: o.name,
    documentType: null,
    documentId: o.document ?? '',
    verificationDigit: null,
    personType: null,
    legalName: null,
    email: null,
    cityId: null,
    cityName: null,
    taxRegime: null,
    withholdingAgent: false,
  }
}
const feComplete = computed(() =>
  overUvt.value && motivo.value === 'COBRADA'
    ? feFiscalChecklist(feCustomer.value).complete
    : true,
)

function toFiscalCustomer(o: OwnerResponse): FiscalCustomer {
  return {
    name: o.name,
    documentType: o.documentType ?? null,
    documentId: o.document,
    verificationDigit: o.verificationDigit ?? null,
    personType: o.personType ?? null,
    legalName: o.legalName ?? null,
    email: o.email ?? null,
    cityId: o.city?.id ?? null,
    cityName: o.city?.name ?? null,
    taxRegime: o.taxRegime ?? null,
    withholdingAgent: o.withholdingAgent ?? false,
  }
}

async function loadOwnerFiscal() {
  const ownerId = props.account?.owner.id
  if (!ownerId) return
  loadingOwner.value = true
  loadError.value = false
  try {
    const o = await ownerApi.findById(ownerId)
    ownerFull.value = o
    feCustomer.value = toFiscalCustomer(o)
  } catch {
    // Si falla, se conserva la precarga desde el resumen del titular, pero sin sus datos fiscales completos
    // (tipo de documento, ciudad, régimen…): el checklist quedaría incompleto. Señalamos el error para que el
    // usuario reintente en vez de creer que "faltan" datos que en realidad no se cargaron.
    loadError.value = true
  } finally {
    loadingOwner.value = false
  }
}

async function onSaveFiscal(data: Partial<FiscalCustomer>) {
  const ownerId = props.account?.owner.id
  if (!ownerId) return
  // Si el fetch inicial de los datos del titular falló, ownerFull quedó null. Antes esto hacía que el
  // guardado retornara en silencio ("no hace nada"): recargamos el titular aquí para poder construir el PUT.
  let o = ownerFull.value
  if (!o) {
    try {
      o = await ownerApi.findById(ownerId)
      ownerFull.value = o
    } catch (e) {
      toast.error('No se pudo guardar', getProblemDetailMessage(e, 'No se pudo cargar el cliente.'))
      return
    }
  }
  const payload: UpdateOwnerRequest = {
    name: o.name,
    email: data.email ?? o.email,
    document: data.documentId ?? o.document,
    address: o.address,
    phone: o.phone,
    cityId: o.city.id,
    documentType: data.documentType ?? o.documentType ?? undefined,
    personType: data.personType ?? o.personType ?? undefined,
    verificationDigit: data.verificationDigit ?? null,
    legalName: data.legalName ?? null,
    withholdingAgent: data.withholdingAgent ?? false,
    taxRegime: data.taxRegime ?? null,
  }
  try {
    const updated = await ownerApi.update(o.id, payload)
    ownerFull.value = updated
    feCustomer.value = toFiscalCustomer(updated)
    fiscalModalOpen.value = false
    toast.success('Datos fiscales guardados', 'El cliente quedó listo para facturar.')
  } catch (e) {
    toast.error('No se pudieron guardar', getProblemDetailMessage(e))
  }
}

const DOC_TYPE_OPTIONS: { value: FeDocType; label: string }[] = [
  { value: 'DOC_EQUIV_POS', label: 'Documento POS' },
  { value: 'FE_VENTA', label: 'Factura electrónica' },
]
const result = ref<{ account: OpenAccountResponse; charged: number } | null>(null)
// Documento fiscal emitido al cerrar (si lo hubo): permite imprimir el MISMO recibo que el POS.
const feDocument = ref<ElectronicDocumentResponse | null>(null)

// ── Idempotencia del cierre cobrado ──────────────────────────────────────────
// El cierre son 2 requests (abono del saldo + cambio de estado). Si el abono pasa
// pero el cambio de estado falla, estos marcadores evitan que el reintento vuelva a
// cobrar: el abono se registra una sola vez y `charged` queda congelado para el recibo.
const paymentDone = ref(false)
const charged = ref(0)
// Idempotency key del abono del cierre (servidor): el reintento reusa la misma → no cobra dos veces aunque
// se pierda la respuesta. Complementa los marcadores de cliente de arriba.
const paymentRequestId = ref('')

const outstanding = computed(() => props.account?.outstandingAmount ?? 0)

const METHOD_OPTIONS = (Object.entries(PAYMENT_METHOD_LABEL) as [PaymentMethod, string][]).map(
  ([value, label]) => ({ value, label }),
)

const ownerName = computed(() => props.account?.owner.name ?? '')

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

// El motivo es obligatorio al cancelar; si supera 5 UVT, el cliente debe tener datos fiscales completos.
const canConfirm = computed(
  () =>
    !busy.value &&
    !(motivo.value === 'CANCELADA' && reason.value.trim() === '') &&
    feComplete.value,
)

// El abono ya se registró pero el cierre falló: el reintento solo cambia el estado.
const retryHint = computed(() => !busy.value && paymentDone.value && step.value === 'cobro')

const receiptCancel = computed(() => result.value?.charged === 0 && motivo.value === 'CANCELADA')
const receiptTitle = computed(() =>
  receiptCancel.value ? 'Cuenta cancelada sin cobro' : 'Cuenta cerrada y cobrada',
)

// Comprobante interno de cierre/cobro (no es la representación fiscal DIAN).
const { printReceipt } = useReceiptPrint()
const { width, setWidth } = useReceiptSettings()

function onPrint() {
  const r = result.value
  if (!r) return
  // Si el cierre emitió documento fiscal, imprime el MISMO recibo que el POS (builder compartido).
  if (feDocument.value) {
    printReceipt(buildDocumentReceiptTicket(feDocument.value, { width: width.value }))
    return
  }
  // Fallback (cuenta cancelada o cobrada sin módulo de facturación): mismo layout, datos de la cuenta.
  const dateTime = new Date().toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
  const note = receiptCancel.value
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
      r.charged > 0 ? `${PAYMENT_METHOD_LABEL[method.value] ?? method.value} · Contado` : undefined,
    footer: { lines: [note] },
  })
}

watch(
  () => props.open,
  (open) => {
    if (!open) return
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
    ownerFull.value = null
    feCustomer.value = null
    fiscalModalOpen.value = false
    loadError.value = false
    if (props.account && canEmit.value && isOverThreshold(props.account.totalAmount)) {
      // Precarga sincrónica con el titular + enriquecido asíncrono con sus datos fiscales completos.
      feCustomer.value = fromOwnerSummary(props.account.owner)
      void loadOwnerFiscal()
    }
  },
)

async function confirm() {
  submitted.value = true
  if (!props.account || busy.value || !canConfirm.value) {
    scrollToFirstError()
    return
  }
  const accountId = props.account.id
  busy.value = true
  try {
    // 1. Cobrada con saldo: registrar el abono UNA sola vez (idempotente en reintento).
    //    El backend exige saldo cero para CLOSE, así que el abono va antes del cambio de estado.
    if (motivo.value === 'COBRADA' && outstanding.value > 0 && !paymentDone.value) {
      await store.addPaymentNoRefresh(accountId, outstanding.value, method.value, paymentRequestId.value)
      charged.value = outstanding.value
      paymentDone.value = true
    }
    // 2. Cambiar el estado (CLOSE/CANCEL). Si esto falla, el marcador evita recobrar.
    //    Al CERRAR, el backend auto-emite el documento DIAN (best-effort) según docType/finalConsumer.
    //    La factura va SIEMPRE al titular de la cuenta (el endpoint de cierre no acepta otro adquiriente).
    const emitting = motivo.value === 'COBRADA' && canEmit.value
    const updated = await store.changeAccountStatus(
      accountId,
      motivo.value === 'CANCELADA' ? 'CANCEL' : 'CLOSE',
      motivo.value === 'CANCELADA' ? reason.value.trim() : undefined,
      emitting ? (overUvt.value ? 'FE_VENTA' : docType.value) : undefined,
      emitting ? (overUvt.value ? false : finalConsumer.value) : undefined,
      // Si se acaba de registrar el abono del saldo (sin refrescar), la versión cacheada quedó vieja:
      // omitir el chequeo temprano para no provocar un 409 falso (el optimistic lock al flush protege).
      !paymentDone.value,
    )
    result.value = {
      account: updated,
      charged: motivo.value === 'COBRADA' ? charged.value : 0,
    }
    // Trae el documento fiscal emitido al cerrar (si lo hubo) para imprimir el recibo igual que el POS.
    // Best-effort: si falla o no hay documento, el recibo cae al fallback con datos de la cuenta.
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
      emit('refresh')
    } else {
      toast.error('Ocurrió un error', getProblemDetailMessage(e, 'No se pudo cerrar la cuenta'))
    }
  } finally {
    busy.value = false
  }
}

function finish() {
  if (result.value) emit('closed', result.value.account)
  emit('close')
}

// Cerrar con la X / Escape debe comportarse según el paso, igual que un botón:
// - paso 'recibo' (la cuenta YA se cerró) → propagar 'closed' para que la lista se refresque (como "Listo").
// - paso 'cobro' (aún no se cerró) → solo cerrar el modal.
function onShellClose() {
  if (result.value) finish()
  else emit('close')
}
</script>

<template>
  <ModalShell
    :open="open"
    title="Cerrar cuenta"
    :subtitle="`${ownerName} · saldo ${formatMoney(outstanding)}`"
    :icon="Receipt"
    :width="520"
    @close="onShellClose"
  >
    <template #body>
      <!-- PASO COBRO -->
      <div v-if="step === 'cobro'" class="form">
        <div class="field-lab">Motivo del cierre</div>
        <div class="mode">
          <button
            type="button"
            class="destopt"
            :class="{ active: motivo === 'COBRADA' }"
            @click="motivo = 'COBRADA'"
          >
            <span class="do-check"><Check v-if="motivo === 'COBRADA'" :size="13" :stroke-width="3" /></span>
            <span class="do-text">
              <span class="do-title">Cobrar y cerrar</span>
              <span class="do-sub">Registra el pago del saldo y cierra la cuenta.</span>
            </span>
          </button>
          <button
            type="button"
            class="destopt"
            :class="{ active: motivo === 'CANCELADA' }"
            @click="motivo = 'CANCELADA'"
          >
            <span class="do-check"><Check v-if="motivo === 'CANCELADA'" :size="13" :stroke-width="3" /></span>
            <span class="do-text">
              <span class="do-title">Cancelar cuenta</span>
              <span class="do-sub">Cierra sin cobro; el saldo queda anulado.</span>
            </span>
          </button>
        </div>

        <!-- Desglose fiscal de la cuenta -->
        <div class="desglose">
          <div class="dg-row"><span>Base gravable + exenta</span><span>{{ formatMoney(breakdown.base) }}</span></div>
          <div v-for="r in breakdown.taxRows" :key="r.name" class="dg-row dg-tax">
            <span>{{ r.name }}</span><span>{{ formatMoney(r.tax) }}</span>
          </div>
          <div v-if="breakdown.taxRows.length === 0" class="dg-row dg-tax">
            <span>Impuestos</span><span>Sin impuestos</span>
          </div>
          <div class="dg-row dg-total"><span>Total cuenta</span><span>{{ formatMoney(breakdown.total) }}</span></div>
          <div v-if="(account?.paidAmount ?? 0) > 0" class="dg-row">
            <span>Ya abonado</span><span>− {{ formatMoney(account?.paidAmount ?? 0) }}</span>
          </div>
          <div class="dg-row dg-saldo">
            <span>{{ motivo === 'CANCELADA' ? 'Saldo a anular' : 'Saldo a cobrar' }}</span>
            <span>{{ formatMoney(outstanding) }}</span>
          </div>
        </div>

        <BaseField v-if="motivo === 'COBRADA' && outstanding > 0" label="Método de pago" required>
          <template #default="{ id }">
            <BaseSelect :id="id" v-model="method" :options="METHOD_OPTIONS" />
          </template>
        </BaseField>

        <!-- Facturación electrónica: solo si el usuario puede emitir (módulo premium). -->
        <template v-if="motivo === 'COBRADA' && canEmit">
          <!-- FE OBLIGATORIA por superar 5 UVT -->
          <div v-if="overUvt" class="fe-block uvt">
            <FeThresholdBanner :total="account?.totalAmount ?? 0" />
            <div class="doctypesel">
              <div class="doctype on">
                <FileText :size="15" :stroke-width="1.8" /> Factura electrónica
              </div>
              <div class="doctype off" title="No disponible por encima de 5 UVT">
                <ShieldCheck :size="14" :stroke-width="1.8" style="opacity: 0.5" /> Documento POS
                <span class="lock"><X :size="11" :stroke-width="2.4" /></span>
              </div>
            </div>
            <FeFiscalCustomerCard :customer="feCustomer" @complete="fiscalModalOpen = true" />
            <p v-if="loadingOwner" class="fe-loading">Cargando datos fiscales del cliente…</p>
            <div v-else-if="loadError" class="fe-loaderr">
              <span>No se pudieron cargar los datos fiscales del titular.</span>
              <button type="button" @click="loadOwnerFiscal">Reintentar</button>
            </div>
            <p v-else class="fe-preloadhint">
              <User :size="12" :stroke-width="1.9" />
              La factura electrónica se emite a nombre del titular de la cuenta.
            </p>
          </div>
          <!-- Caso normal (≤ 5 UVT): tipo de documento + consumidor final -->
          <div v-else class="fe-block">
            <div class="field-lab">Facturación electrónica</div>
            <BaseField label="Tipo de documento">
              <template #default="{ id }">
                <BaseSelect :id="id" v-model="docType" :options="DOC_TYPE_OPTIONS" />
              </template>
            </BaseField>
            <button
              type="button"
              class="fc-toggle"
              :class="{ on: finalConsumer }"
              @click="finalConsumer = !finalConsumer"
            >
              <span class="fc-box"><Check v-if="finalConsumer" :size="12" :stroke-width="2.6" /></span>
              Consumidor final
            </button>
            <p class="fe-hint">Se emite a la DIAN al cerrar la venta. La validación es asíncrona.</p>
          </div>
        </template>

        <BaseField
          v-if="motivo === 'CANCELADA'"
          label="Motivo de la cancelación"
          required
          :error="submitted ? reasonError ?? undefined : undefined"
        >
          <template #default="{ id }">
            <BaseInput
              :id="id"
              v-model="reason"
              :invalid="submitted && !!reasonError"
              placeholder="Ej. cortesía, garantía, error de facturación…"
            />
          </template>
        </BaseField>

        <p class="note">{{ note }}</p>

        <p v-if="retryHint" class="retry-hint">
          El cobro ya se registró; reintenta <strong>Cobrar y cerrar</strong> para terminar de
          cerrar la cuenta.
        </p>
      </div>

      <!-- PASO RECIBO -->
      <div v-else-if="step === 'recibo' && result" class="receipt">
        <div class="badge" :class="{ cancel: receiptCancel }">
          <X v-if="receiptCancel" :size="26" :stroke-width="2.4" />
          <Check v-else :size="26" :stroke-width="2.4" />
        </div>
        <div class="rec-title">{{ receiptTitle }}</div>
        <div class="rec-amt">{{ formatMoney(result.charged) }}</div>
        <div class="rec-rows">
          <div class="rec-row"><span>Acumulado</span><span>{{ formatMoney(result.account.totalAmount) }}</span></div>
          <div class="rec-row"><span>Abonado</span><span>{{ formatMoney(result.account.paidAmount) }}</span></div>
          <div class="rec-row total"><span>Cobrado ahora</span><span>{{ formatMoney(result.charged) }}</span></div>
        </div>
        <div v-if="receiptCancel && result.account.closeReason" class="rec-reason">
          <span class="rec-reason-lab">Motivo</span>
          <span>{{ result.account.closeReason }}</span>
        </div>
      </div>
    </template>

    <template #footer-left>
      <span v-if="step === 'cobro'" class="foottotal">
        Saldo <strong>{{ formatMoney(outstanding) }}</strong>
      </span>
      <div v-else-if="step === 'recibo'" class="w-seg" role="group" aria-label="Ancho del tiquete">
        <button type="button" :class="{ on: width === '80' }" @click="setWidth('80')">80mm</button>
        <button type="button" :class="{ on: width === '58' }" @click="setWidth('58')">58mm</button>
      </div>
    </template>
    <template #footer-actions>
      <template v-if="step === 'cobro'">
        <button type="button" class="btn-ghost" @click="emit('close')">Cancelar</button>
        <button type="button" class="btn-primary" :disabled="!canConfirm" @click="confirm">
          {{ busy ? 'Procesando…' : primaryLabel }}
        </button>
      </template>
      <template v-else-if="step === 'recibo'">
        <button type="button" class="btn-ghost" @click="onPrint">
          <Printer :size="15" :stroke-width="2" /> Imprimir
        </button>
        <button type="button" class="btn-primary" @click="finish">
          <Check :size="15" :stroke-width="2" /> Listo
        </button>
      </template>
    </template>
  </ModalShell>

  <FeCustomerFiscalModal
    :open="fiscalModalOpen"
    :customer="feCustomer"
    @save="onSaveFiscal"
    @close="fiscalModalOpen = false"
  />
</template>

<style scoped>
.w-seg { display: inline-flex; border: 1px solid var(--warm-300); border-radius: 8px; padding: 2px; gap: 2px; }
.w-seg button {
  font-family: inherit; font-size: 12px; font-weight: 500; padding: 5px 10px; border-radius: 6px; cursor: pointer;
  border: none; background: transparent; color: var(--warm-600);
}
.w-seg button.on { background: var(--warm-100); color: var(--warm-900); }
.form { display: flex; flex-direction: column; gap: 16px; }
.field-lab { font-size: 12.5px; font-weight: 600; color: var(--warm-700); margin-bottom: -6px; }

/* Tarjetas-radio de motivo */
.mode { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
@media (max-width: 520px) { .mode { grid-template-columns: 1fr; } }
.destopt {
  display: flex; align-items: flex-start; gap: 10px; text-align: left; font-family: inherit; cursor: pointer;
  padding: 13px; border-radius: 12px; background: var(--warm-50); border: 1px solid var(--warm-200);
  transition: border-color 0.12s, background 0.12s;
}
.destopt:hover { border-color: var(--amatista-300); }
.destopt.active { border-color: var(--amatista-500); background: var(--amatista-50); }
.do-check { width: 18px; height: 18px; border-radius: 6px; flex-shrink: 0; margin-top: 1px; display: grid; place-items: center; border: 1px solid var(--warm-300); background: var(--warm-50); color: white; }
.destopt.active .do-check { background: var(--amatista-600); border-color: var(--amatista-600); }
.do-text { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.do-title { font-size: 13px; font-weight: 600; color: var(--warm-900); line-height: 1.25; }
.do-sub { font-size: 11.5px; color: var(--warm-500); line-height: 1.35; }

.note { margin: 0; font-size: 12.5px; color: var(--warm-600); line-height: 1.4; }

/* Bloque de facturación electrónica */
.fe-block { display: flex; flex-direction: column; gap: 10px; padding: 14px; border-radius: 12px; background: var(--amatista-50); border: 1px solid var(--amatista-100); }
.fc-toggle {
  display: inline-flex; align-items: center; gap: 9px; align-self: flex-start; font-family: inherit; font-size: 13px;
  cursor: pointer; padding: 8px 12px; border-radius: 9px; background: white; border: 1px solid var(--warm-200); color: var(--warm-800);
}
.fc-toggle.on { border-color: var(--amatista-500); color: var(--amatista-700); }
.fc-box { width: 18px; height: 18px; border-radius: 5px; display: grid; place-items: center; border: 1px solid var(--warm-300); background: white; color: white; }
.fc-toggle.on .fc-box { background: var(--amatista-600); border-color: var(--amatista-600); }
.fe-hint { margin: 0; font-size: 11.5px; color: var(--warm-500); }
.fe-block.uvt { background: transparent; border: none; padding: 0; gap: 12px; }
.doctypesel { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.doctype { display: flex; align-items: center; gap: 7px; padding: 11px 13px; border-radius: 10px; font-size: 13px; font-weight: 600; position: relative; }
.doctype.on { background: var(--amatista-50); border: 1.5px solid var(--amatista-400); color: var(--amatista-700); }
.doctype.off { background: var(--warm-100); border: 1.5px solid var(--warm-200); color: var(--warm-400); cursor: not-allowed; }
.lock { margin-left: auto; width: 18px; height: 18px; border-radius: 50%; background: var(--warm-200); color: var(--warm-500); display: grid; place-items: center; }
.fe-loading { font-size: 12.5px; color: var(--warm-500); padding: 12px 14px; border-radius: 11px; background: var(--warm-50); border: 1px solid var(--warm-200); }
.desglose { display: flex; flex-direction: column; gap: 6px; padding: 13px 15px; border-radius: 12px; background: var(--warm-50); border: 1px solid var(--warm-200); }
.dg-row { display: flex; align-items: center; justify-content: space-between; font-size: 13px; color: var(--warm-600); }
.dg-row span:last-child { color: var(--warm-800); font-variant-numeric: tabular-nums; }
.dg-tax { font-size: 12.5px; color: var(--warm-500); padding-left: 10px; }
.dg-total { padding-top: 8px; margin-top: 2px; border-top: 1px solid var(--warm-200); }
.dg-total span { color: var(--warm-900); font-weight: 600; }
.dg-saldo span { color: var(--warm-900); font-weight: 700; }
.dg-saldo span:last-child { color: var(--amatista-700); }
.fe-preloadhint { margin: 0; display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--warm-500); }
.fe-preloadhint svg { flex-shrink: 0; color: var(--warm-400); }
.fe-loaderr { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 9px 12px; border-radius: 10px; font-size: 12px; background: oklch(96% 0.05 25); border: 1px solid oklch(89% 0.07 25); color: oklch(46% 0.16 25); }
.fe-loaderr button { font-family: inherit; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 7px; border: 1px solid currentColor; background: transparent; color: inherit; cursor: pointer; flex-shrink: 0; }
.retry-hint {
  margin: 0; padding: 11px 14px; border-radius: 10px; font-size: 12.5px; line-height: 1.4;
  background: oklch(95% 0.06 80); border: 1px solid oklch(88% 0.09 80); color: oklch(40% 0.10 70);
}
.retry-hint strong { font-weight: 600; }

/* Recibo */
.receipt { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 10px; padding: 6px 0; }
.badge {
  width: 56px; height: 56px; border-radius: 16px; display: grid; place-items: center;
  background: var(--success-bg); color: var(--success-fg);
}
.badge.cancel { background: oklch(92% 0.06 60); color: oklch(50% 0.10 60); }
.rec-title { font-size: 15px; font-weight: 600; color: var(--warm-900); }
.rec-amt { font-family: var(--font-serif); font-size: 34px; color: var(--warm-900); letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
.rec-rows { width: 100%; margin-top: 8px; display: flex; flex-direction: column; gap: 2px; }
.rec-row { display: flex; align-items: center; justify-content: space-between; font-size: 13px; color: var(--warm-600); padding: 7px 4px; border-bottom: 1px solid var(--warm-100); }
.rec-row span:last-child { font-variant-numeric: tabular-nums; color: var(--warm-900); }
.rec-row.total { border-bottom: none; border-top: 1.5px solid var(--warm-200); margin-top: 4px; font-weight: 600; }
.rec-row.total span:last-child { color: var(--success-fg); }
.rec-reason { width: 100%; margin-top: 10px; padding: 10px 12px; background: var(--warm-100); border-radius: 9px; text-align: left; font-size: 12.5px; color: var(--warm-700); }
.rec-reason-lab { display: block; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--warm-500); margin-bottom: 2px; }

/* Footer */
.foottotal { font-size: 13px; color: var(--warm-600); }
.foottotal strong { font-size: 15px; color: var(--amatista-700); font-variant-numeric: tabular-nums; margin-left: 4px; }
.btn-primary {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: inherit; font-size: 13.5px; font-weight: 500; padding: 10px 18px; border-radius: 9px; cursor: pointer;
  border: none; color: white; background: var(--amatista-700);
}
.btn-primary:hover:not(:disabled) { filter: brightness(1.05); }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-ghost {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: inherit; font-size: 13.5px; font-weight: 500; padding: 10px 18px; border-radius: 9px; cursor: pointer;
  background: transparent; border: 1px solid var(--warm-200); color: var(--warm-700);
}
.btn-ghost:hover { background: var(--warm-100); }
</style>
