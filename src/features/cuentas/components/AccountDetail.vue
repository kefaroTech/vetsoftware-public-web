<script setup lang="ts">
import { computed, ref } from 'vue'
import { ArrowLeft, CreditCard, Lock, Plus } from 'lucide-vue-next'
import AccountChargesColumn from './AccountChargesColumn.vue'
import AccountPaymentsColumn from './AccountPaymentsColumn.vue'
import AddChargeModal from './AddChargeModal.vue'
import PaymentModal from './PaymentModal.vue'
import CloseAccountModal from './CloseAccountModal.vue'
import VoidPaymentModal from './VoidPaymentModal.vue'
import VoidChargeModal from './VoidChargeModal.vue'
import { useCuentas } from '../composables/useCuentas'
import { formatMoney } from '@/features/tienda/composables/pricing'
import { initials, formatDateShort } from '@/composables/format'
import { useBranchStore } from '@/features/branches/stores/branch.store'
import {
  OPEN_ACCOUNT_STATUS_LABEL,
  type DebtResponse,
  type OpenAccountResponse,
  type OpenAccountStatus,
  type UnifiedCharge,
} from '../types/cuentas'

/**
 * Detalle de una cuenta abierta: cabecera, totales, cargos, abonos y los cinco
 * modales que operan sobre ella.
 *
 * Sale de `CuentasView`, que era mitad lista y mitad detalle sin más nexo que la
 * cuenta seleccionada. Los modales viajan con el detalle porque sólo tienen
 * sentido con una cuenta delante.
 */
const props = defineProps<{
  account: OpenAccountResponse
  canVoidCharge: boolean
  canVoidPayment: boolean
  ownerPets: { id: number; name: string }[]
}>()

// `refresh` no viaja al padre: recargar la cuenta es asunto interno del detalle
// (`refresh()` de abajo) y lo único que la lista necesita saber es el resultado,
// que llega por `updated`.
const emit = defineEmits<{
  back: []
  updated: [account: OpenAccountResponse]
}>()

const store = useCuentas()
const branchStore = useBranchStore()

const addChargeOpen = ref(false)
const paymentOpen = ref(false)
const closeOpen = ref(false)
const voidOpen = ref(false)
const paymentToVoid = ref<DebtResponse | null>(null)
const voidChargeOpen = ref(false)
const chargeToVoid = ref<UnifiedCharge | null>(null)

/** Solo se administra una cuenta OPEN desde la sede a la que pertenece. */
const isReadOnly = computed(
  () => props.account.status !== 'OPEN' || branchStore.selectedBranchId !== props.account.branch.id,
)

/** Meta del detalle: "cuenta abierta {fecha}" o "cerrada/cancelada el X por Y · motivo". */
const detailMeta = computed(() => {
  const a = props.account
  if (a.status === 'OPEN') return `cuenta abierta ${formatDateShort(a.createdDate)}`
  const verbo = a.status === 'CANCEL' ? 'cancelada' : 'cerrada'
  const fecha = formatDateShort((a.closedAt ?? a.createdDate).slice(0, 10))
  const quien = a.closedBy?.name ? ` por ${a.closedBy.name}` : ''
  const motivo = a.closeReason ? ` · ${a.closeReason}` : ''
  return `${verbo} el ${fecha}${quien}${motivo}`
})

const STATUS_TONE: Record<OpenAccountStatus, string> = {
  OPEN: 'open',
  CLOSE: 'closed',
  CANCEL: 'cancelled',
}

async function refresh() {
  await store.refreshAccount(props.account.id)
  const fresh = store.accounts.value.find((a) => a.id === props.account.id)
  if (fresh) emit('updated', fresh)
}

async function onClosed(account: OpenAccountResponse) {
  closeOpen.value = false
  // Reflejar el nuevo estado en el detalle y la lista (pill + acciones read-only).
  emit('updated', account)
  await store.loadDetail(account.id)
}

function onVoidPayment(p: DebtResponse) {
  if (isReadOnly.value || !props.canVoidPayment) return
  paymentToVoid.value = p
  voidOpen.value = true
}

async function onPaymentVoided() {
  voidOpen.value = false
  paymentToVoid.value = null
  await refresh()
}

function onVoidCharge(c: UnifiedCharge) {
  if (isReadOnly.value || !props.canVoidCharge || c.voided) return
  chargeToVoid.value = c
  voidChargeOpen.value = true
}

async function onChargeVoided() {
  voidChargeOpen.value = false
  chargeToVoid.value = null
  await refresh()
}
</script>

<template>
  <button type="button" class="back" @click="emit('back')">
    <ArrowLeft :size="14" :stroke-width="1.8" /> Volver a cuentas
  </button>

  <div class="detail-head">
    <div class="who">
      <span class="avatar lg">{{ initials(account.owner.name) }}</span>
      <div>
        <div class="name-row">
          <h1 class="name lg">{{ account.owner.name }}</h1>
          <span class="status-pill" :class="STATUS_TONE[account.status]">{{
            OPEN_ACCOUNT_STATUS_LABEL[account.status]
          }}</span>
        </div>
        <div class="detail-meta">
          {{ account.owner.document }} · {{ account.branch.name }} · {{ detailMeta }}
        </div>
      </div>
    </div>
    <div v-if="!isReadOnly" class="detail-actions">
      <button
        type="button"
        class="ds-btn ds-btn--primary ds-btn--lg ds-btn--elevated ds-btn--nowrap"
        @click="addChargeOpen = true"
      >
        <Plus :size="15" :stroke-width="1.8" /> Agregar cargo
      </button>
      <button
        type="button"
        class="ds-btn ds-btn--ghost ds-btn--lg ds-btn--nowrap"
        :disabled="account.outstandingAmount <= 0"
        @click="paymentOpen = true"
      >
        <CreditCard :size="15" :stroke-width="1.8" /> Registrar abono
      </button>
      <button
        type="button"
        class="ds-btn ds-btn--ghost ds-btn--lg ds-btn--nowrap"
        @click="closeOpen = true"
      >
        <Lock :size="15" :stroke-width="1.8" /> Cerrar cuenta
      </button>
    </div>
  </div>

  <div v-if="isReadOnly" class="readonly-note">
    <Lock :size="15" :stroke-width="1.8" />
    <span v-if="account.status === 'OPEN'">
      Esta cuenta pertenece a {{ account.branch.name }}. Selecciona esa sede para administrarla.
    </span>
    <span v-else>
      Cuenta {{ account.status === 'CANCEL' ? 'cancelada' : 'cerrada' }} · solo lectura. No admite
      nuevos cargos ni abonos.
    </span>
  </div>

  <div class="summary">
    <div class="sum-box">
      <span class="sum-lab">Acumulado</span>
      <span class="sum-val">{{ formatMoney(account.totalAmount) }}</span>
    </div>
    <div class="sum-box">
      <span class="sum-lab">Abonado</span>
      <span class="sum-val">{{ formatMoney(account.paidAmount) }}</span>
    </div>
    <div class="sum-box alert">
      <span class="sum-lab">Saldo pendiente</span>
      <span class="sum-val">{{ formatMoney(account.outstandingAmount) }}</span>
    </div>
  </div>

  <div v-if="store.detailLoading.value" class="state">Cargando cargos…</div>
  <div v-else class="cols">
    <!-- Cargos por mascota -->
    <AccountChargesColumn :read-only="isReadOnly" :can-void="canVoidCharge" @void="onVoidCharge" />

    <!-- Abonos -->
    <AccountPaymentsColumn
      :read-only="isReadOnly"
      :can-void="canVoidPayment"
      @void="onVoidPayment"
    />
  </div>

  <AddChargeModal
    :open="addChargeOpen"
    :account-id="account.id"
    :pets="ownerPets"
    @close="addChargeOpen = false"
    @added="refresh"
    @refresh="refresh"
  />
  <PaymentModal
    :open="paymentOpen"
    :account-id="account.id"
    :outstanding="account.outstandingAmount"
    @close="paymentOpen = false"
    @paid="refresh"
    @refresh="refresh"
  />
  <CloseAccountModal
    :open="closeOpen"
    :account="account"
    @close="closeOpen = false"
    @closed="onClosed"
    @refresh="refresh"
  />
  <VoidPaymentModal
    :open="voidOpen"
    :account-id="account.id"
    :payment="paymentToVoid"
    @close="voidOpen = false"
    @voided="onPaymentVoided"
    @refresh="refresh"
  />
  <VoidChargeModal
    :open="voidChargeOpen"
    :account-id="account.id"
    :charge="chargeToVoid"
    :outstanding="account.outstandingAmount"
    @close="voidChargeOpen = false"
    @voided="onChargeVoided"
    @refresh="refresh"
  />
</template>

<style scoped>
.readonly-note {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 11px 14px;
  margin-bottom: 18px;
  background: var(--warm-100);
  border: 1px solid var(--warm-200);
  border-radius: 10px;
  font-size: 13px;
  color: var(--warm-600);
}

.readonly-note svg {
  color: var(--warm-500);
  flex-shrink: 0;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: var(--radius-pill);
  font-size: 11.5px;
  font-weight: 500;
  white-space: nowrap;
}

.status-pill.open {
  background: var(--success-bg);
  color: var(--success-fg);
}

.status-pill.closed {
  background: var(--warm-150);
  color: var(--warm-600);
}

.status-pill.cancelled {
  background: var(--danger-100);
  color: var(--danger-700);
}

.who {
  display: flex;
  align-items: center;
  gap: 11px;
  min-width: 0;
}

.avatar {
  width: 42px;
  height: 42px;
  border-radius: 11px;
  background: var(--amatista-100);
  color: var(--amatista-700);
  display: grid;
  place-items: center;
  font-family: var(--font-serif);
  font-size: 16px;
  font-weight: 500;
  flex-shrink: 0;
}

.avatar.lg {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  font-size: 18px;
}

.name {
  font-size: 15px;
  font-weight: 500;
  color: var(--warm-900);
}

.name.lg {
  margin: 0;
  font-size: 22px;
  font-family: var(--font-serif);
  font-weight: 400;
  letter-spacing: -0.015em;
  line-height: 1.05;
}

.doc {
  font-size: 12px;
  color: var(--warm-500);
  margin-top: 1px;
}

.detail-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
  margin-bottom: 18px;
}

.detail-head .who {
  align-items: center;
  gap: 14px;
}

.name-row {
  display: flex;
  align-items: center;
  gap: 11px;
}

.detail-meta {
  font-size: 13.5px;
  color: var(--warm-600);
  margin-top: 3px;
}

.detail-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 18px;
}

.sum-box {
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 12px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.sum-box.alert {
  background: var(--warning-50);
  border-color: var(--warning-200);
}

.sum-lab {
  font-size: 11.5px;
  color: var(--warm-500);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.sum-val {
  font-family: var(--font-serif);
  font-size: 24px;
  color: var(--warm-900);
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}

.sum-box.alert .sum-val {
  color: oklch(45% 0.13 70deg);
}

.cols {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 16px;
  align-items: start;
}

@media (width <= 1000px) {
  .cols {
    grid-template-columns: 1fr;
  }

  .summary {
    grid-template-columns: 1fr;
  }
}
</style>
