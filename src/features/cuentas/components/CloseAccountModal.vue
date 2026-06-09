<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Check, Receipt, X } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import BaseField from '@/features/dashboard/components/ui/BaseField.vue'
import BaseInput from '@/features/dashboard/components/ui/BaseInput.vue'
import BaseSelect from '@/features/dashboard/components/ui/BaseSelect.vue'
import { useCuentas } from '../composables/useCuentas'
import { formatMoney } from '@/features/tienda/composables/pricing'
import { getProblemDetailMessage, isConcurrencyConflict } from '@/services/http/http.client'
import { useToast } from '@/composables/useToast'
import {
  PAYMENT_METHOD_LABEL,
  type OpenAccountResponse,
  type PaymentMethod,
} from '../types/cuentas'

const props = defineProps<{
  open: boolean
  account: OpenAccountResponse | null
}>()

const emit = defineEmits<{ close: []; closed: [account: OpenAccountResponse]; refresh: [] }>()

const store = useCuentas()
const toast = useToast()

type Motivo = 'COBRADA' | 'CANCELADA'

const step = ref<'cobro' | 'recibo'>('cobro')
const motivo = ref<Motivo>('COBRADA')
const method = ref<PaymentMethod>('CASH')
const reason = ref('')
const busy = ref(false)
const result = ref<{ account: OpenAccountResponse; charged: number } | null>(null)

// ── Idempotencia del cierre cobrado ──────────────────────────────────────────
// El cierre son 2 requests (abono del saldo + cambio de estado). Si el abono pasa
// pero el cambio de estado falla, estos marcadores evitan que el reintento vuelva a
// cobrar: el abono se registra una sola vez y `charged` queda congelado para el recibo.
const paymentDone = ref(false)
const charged = ref(0)

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
  motivo.value === 'COBRADA' ? 'Cobrar y cerrar' : 'Cancelar cuenta',
)

// El motivo es obligatorio al cancelar (lo exige también el backend).
const canConfirm = computed(
  () => !busy.value && !(motivo.value === 'CANCELADA' && reason.value.trim() === ''),
)

// El abono ya se registró pero el cierre falló: el reintento solo cambia el estado.
const retryHint = computed(() => !busy.value && paymentDone.value && step.value === 'cobro')

const receiptCancel = computed(() => result.value?.charged === 0 && motivo.value === 'CANCELADA')
const receiptTitle = computed(() =>
  receiptCancel.value ? 'Cuenta cancelada sin cobro' : 'Cuenta cerrada y cobrada',
)

watch(
  () => props.open,
  (open) => {
    if (!open) return
    step.value = 'cobro'
    motivo.value = 'COBRADA'
    method.value = 'CASH'
    reason.value = ''
    busy.value = false
    result.value = null
    paymentDone.value = false
    charged.value = 0
  },
)

async function confirm() {
  if (!props.account || busy.value) return
  const accountId = props.account.id
  busy.value = true
  try {
    // 1. Cobrada con saldo: registrar el abono UNA sola vez (idempotente en reintento).
    //    El backend exige saldo cero para CLOSE, así que el abono va antes del cambio de estado.
    if (motivo.value === 'COBRADA' && outstanding.value > 0 && !paymentDone.value) {
      await store.addPaymentNoRefresh(accountId, outstanding.value, method.value)
      charged.value = outstanding.value
      paymentDone.value = true
    }
    // 2. Cambiar el estado (CLOSE/CANCEL). Si esto falla, el marcador evita recobrar.
    const updated = await store.changeAccountStatus(
      accountId,
      motivo.value === 'CANCELADA' ? 'CANCEL' : 'CLOSE',
      motivo.value === 'CANCELADA' ? reason.value.trim() : undefined,
    )
    result.value = {
      account: updated,
      charged: motivo.value === 'COBRADA' ? charged.value : 0,
    }
    if (motivo.value === 'COBRADA') {
      toast.success('Cuenta cerrada', `La cuenta de ${ownerName.value} se cerró.`)
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
</script>

<template>
  <ModalShell
    :open="open"
    title="Cerrar cuenta"
    :subtitle="`${ownerName} · saldo ${formatMoney(outstanding)}`"
    :icon="Receipt"
    :width="520"
    @close="emit('close')"
  >
    <!-- PASO COBRO -->
    <template v-if="step === 'cobro'" #body>
      <div class="form">
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

        <BaseField v-if="motivo === 'COBRADA' && outstanding > 0" label="Método de pago" required>
          <template #default="{ id }">
            <BaseSelect :id="id" v-model="method" :options="METHOD_OPTIONS" />
          </template>
        </BaseField>

        <BaseField v-if="motivo === 'CANCELADA'" label="Motivo de la cancelación" required>
          <template #default="{ id }">
            <BaseInput
              :id="id"
              v-model="reason"
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
    </template>

    <template v-if="step === 'cobro'" #footer-left>
      <span class="foottotal">Saldo <strong>{{ formatMoney(outstanding) }}</strong></span>
    </template>
    <template v-if="step === 'cobro'" #footer-actions>
      <button type="button" class="btn-ghost" @click="emit('close')">Cancelar</button>
      <button type="button" class="btn-primary" :disabled="!canConfirm" @click="confirm">
        {{ busy ? 'Procesando…' : primaryLabel }}
      </button>
    </template>

    <!-- PASO RECIBO -->
    <template v-if="step === 'recibo' && result" #body>
      <div class="receipt">
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

    <template v-if="step === 'recibo'" #footer-actions>
      <button type="button" class="btn-primary" @click="finish">
        <Check :size="15" :stroke-width="2" /> Listo
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
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
  font-family: inherit; font-size: 13.5px; font-weight: 500; padding: 10px 18px; border-radius: 9px; cursor: pointer;
  background: transparent; border: 1px solid var(--warm-200); color: var(--warm-700);
}
.btn-ghost:hover { background: var(--warm-100); }
</style>
