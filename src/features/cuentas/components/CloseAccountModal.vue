<script setup lang="ts">
import { toRef, watch } from 'vue'
import { Check, Printer, Receipt } from 'lucide-vue-next'
import ModalShell from '@/components/ui/ModalShell.vue'
import BaseField from '@/components/ui/BaseField.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import FeCustomerFiscalModal from '@/features/facturacion/components/FeCustomerFiscalModal.vue'
import CloseAccountFeBlock from './CloseAccountFeBlock.vue'
import CloseAccountReceipt from './CloseAccountReceipt.vue'
import { CLOSE_METHOD_OPTIONS, useCloseAccount } from '../composables/useCloseAccount'
import { formatMoney } from '@/features/tienda/composables/pricing'
import type { OpenAccountResponse } from '../types/cuentas'

const props = defineProps<{
  open: boolean
  account: OpenAccountResponse | null
}>()

const emit = defineEmits<{ close: []; closed: [account: OpenAccountResponse]; refresh: [] }>()

const {
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
} = useCloseAccount(toRef(props, 'account'), { refresh: () => emit('refresh') })

watch(
  () => props.open,
  (open) => {
    if (open) reset()
  },
)

function finish() {
  if (result.value) emit('closed', result.value.account)
  emit('close')
}

// Cerrar con la X / Escape debe comportarse según el paso, igual que un botón:
// - paso 'recibo' (la cuenta YA se cerró) → propagar 'closed' para que la lista se
//   refresque (como "Listo").
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
    :subtitle="`${account?.owner.name ?? ''} · saldo ${formatMoney(outstanding)}`"
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
            <span class="do-check"
              ><Check v-if="motivo === 'COBRADA'" :size="13" :stroke-width="3"
            /></span>
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
            <span class="do-check"
              ><Check v-if="motivo === 'CANCELADA'" :size="13" :stroke-width="3"
            /></span>
            <span class="do-text">
              <span class="do-title">Cancelar cuenta</span>
              <span class="do-sub">Cierra sin cobro; el saldo queda anulado.</span>
            </span>
          </button>
        </div>

        <!-- Desglose fiscal de la cuenta -->
        <div class="desglose">
          <div class="dg-row">
            <span>Base gravable + exenta</span><span>{{ formatMoney(breakdown.base) }}</span>
          </div>
          <div v-for="r in breakdown.taxRows" :key="r.name" class="dg-row dg-tax">
            <span>{{ r.name }}</span
            ><span>{{ formatMoney(r.tax) }}</span>
          </div>
          <div v-if="breakdown.taxRows.length === 0" class="dg-row dg-tax">
            <span>Impuestos</span><span>Sin impuestos</span>
          </div>
          <div class="dg-row dg-total">
            <span>Total cuenta</span><span>{{ formatMoney(breakdown.total) }}</span>
          </div>
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
            <BaseSelect :id="id" v-model="method" :options="CLOSE_METHOD_OPTIONS" />
          </template>
        </BaseField>

        <!-- Facturación electrónica: solo si el usuario puede emitir (módulo premium). -->
        <CloseAccountFeBlock
          v-if="motivo === 'COBRADA' && canEmit"
          v-model:doc-type="docType"
          v-model:final-consumer="finalConsumer"
          :over-uvt="overUvt"
          :total-amount="account?.totalAmount ?? 0"
          :customer="fiscal.customer.value"
          :loading="fiscal.loading.value"
          :load-error="fiscal.loadError.value"
          @complete-customer="fiscal.modalOpen.value = true"
          @retry-load="fiscal.load()"
        />

        <BaseField
          v-if="motivo === 'CANCELADA'"
          label="Motivo de la cancelación"
          required
          :error="submitted ? (reasonError ?? undefined) : undefined"
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
      <CloseAccountReceipt
        v-else-if="step === 'recibo' && result"
        :account="result.account"
        :charged="result.charged"
        :cancelled="receiptCancel"
        :title="receiptTitle"
      />
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
        <button type="button" class="ds-btn ds-btn--ghost ds-btn--lg" @click="emit('close')">
          Cancelar
        </button>
        <button
          type="button"
          class="ds-btn ds-btn--solid ds-btn--lg"
          :disabled="!canConfirm"
          @click="confirm"
        >
          {{ busy ? 'Procesando…' : primaryLabel }}
        </button>
      </template>
      <template v-else-if="step === 'recibo'">
        <button type="button" class="ds-btn ds-btn--ghost ds-btn--lg" @click="onPrint">
          <Printer :size="15" :stroke-width="2" /> Imprimir
        </button>
        <button type="button" class="ds-btn ds-btn--solid ds-btn--lg" @click="finish">
          <Check :size="15" :stroke-width="2" /> Listo
        </button>
      </template>
    </template>
  </ModalShell>

  <FeCustomerFiscalModal
    :open="fiscal.modalOpen.value"
    :customer="fiscal.customer.value"
    @save="fiscal.save"
    @close="fiscal.modalOpen.value = false"
  />
</template>

<style scoped>
.w-seg {
  display: inline-flex;
  border: 1px solid var(--warm-300);
  border-radius: 8px;
  padding: 2px;
  gap: 2px;
}
.w-seg button {
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
  padding: 5px 10px;
  border-radius: 6px;
  cursor: pointer;
  border: none;
  background: transparent;
  color: var(--warm-600);
}
.w-seg button.on {
  background: var(--warm-100);
  color: var(--warm-900);
}
.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.field-lab {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--warm-700);
  margin-bottom: -6px;
}

/* Tarjetas-radio de motivo */
.mode {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

@media (width <= 520px) {
  .mode {
    grid-template-columns: 1fr;
  }
}

.destopt {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  text-align: left;
  font-family: inherit;
  cursor: pointer;
  padding: 13px;
  border-radius: 12px;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  transition:
    border-color 0.12s,
    background 0.12s;
}
.destopt:hover {
  border-color: var(--amatista-300);
}
.destopt.active {
  border-color: var(--amatista-500);
  background: var(--amatista-50);
}
.do-check {
  width: 18px;
  height: 18px;
  border-radius: 6px;
  flex-shrink: 0;
  margin-top: 1px;
  display: grid;
  place-items: center;
  border: 1px solid var(--warm-300);
  background: var(--warm-50);
  color: white;
}
.destopt.active .do-check {
  background: var(--amatista-600);
  border-color: var(--amatista-600);
}
.do-text {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.do-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--warm-900);
  line-height: 1.25;
}
.do-sub {
  font-size: 11.5px;
  color: var(--warm-500);
  line-height: 1.35;
}

.note {
  margin: 0;
  font-size: 12.5px;
  color: var(--warm-600);
  line-height: 1.4;
}

.desglose {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 13px 15px;
  border-radius: 12px;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
}
.dg-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  color: var(--warm-600);
}
.dg-row span:last-child {
  color: var(--warm-800);
  font-variant-numeric: tabular-nums;
}
.dg-tax {
  font-size: 12.5px;
  color: var(--warm-500);
  padding-left: 10px;
}
.dg-total {
  padding-top: 8px;
  margin-top: 2px;
  border-top: 1px solid var(--warm-200);
}
.dg-total span {
  color: var(--warm-900);
  font-weight: 600;
}
.dg-saldo span {
  color: var(--warm-900);
  font-weight: 700;
}
.dg-saldo span:last-child {
  color: var(--amatista-700);
}

.retry-hint {
  margin: 0;
  padding: 11px 14px;
  border-radius: 10px;
  font-size: 12.5px;
  line-height: 1.4;
  background: var(--warning-50);
  border: 1px solid var(--warning-200);
  color: oklch(40% 0.1 70deg);
}
.retry-hint strong {
  font-weight: 600;
}

/* Footer */
.foottotal {
  font-size: 13px;
  color: var(--warm-600);
}
.foottotal strong {
  font-size: 15px;
  color: var(--amatista-700);
  font-variant-numeric: tabular-nums;
  margin-left: 4px;
}
</style>
