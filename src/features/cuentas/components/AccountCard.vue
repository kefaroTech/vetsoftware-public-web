<script setup lang="ts">
import { MapPin } from 'lucide-vue-next'
import { formatMoney } from '@/features/tienda/composables/pricing'
import { initials, formatDateShort } from '@/composables/format'
import {
  OPEN_ACCOUNT_STATUS_LABEL,
  type OpenAccountResponse,
  type OpenAccountStatus,
} from '../types/cuentas'

/**
 * Tarjeta de una cuenta en el listado: titular, sede, fecha de apertura y el
 * desglose acumulado / abonado / saldo.
 *
 * Sale de `CuentasView` con sus 11 reglas de CSS y las tres funciones de
 * etiqueta que sólo usaba la tarjeta.
 */
defineProps<{ account: OpenAccountResponse }>()

/** Clase de tono para el pill de estado según el estado de la cuenta. */
const STATUS_TONE: Record<OpenAccountStatus, string> = {
  OPEN: 'open',
  CLOSE: 'closed',
  CANCEL: 'cancelled',
}

/** Etiqueta del pill de estado en la tarjeta (CLOSE se muestra como "Pagada"). */
function cardStatusLabel(acc: OpenAccountResponse): string {
  return acc.status === 'CLOSE' ? 'Pagada' : OPEN_ACCOUNT_STATUS_LABEL[acc.status]
}

/** Etiqueta de la fila inferior: Saldo (abierta) / Cobrado (pagada) / Anulado (cancelada). */
function saldoLabel(acc: OpenAccountResponse): string {
  if (acc.status === 'CLOSE') return 'Cobrado'
  if (acc.status === 'CANCEL') return 'Anulado'
  return 'Saldo'
}

/** Monto de la fila inferior: total cobrado en cuentas pagadas, saldo pendiente en el resto. */
function saldoValue(acc: OpenAccountResponse): number {
  return acc.status === 'CLOSE' ? acc.totalAmount : acc.outstandingAmount
}
</script>

<template>
  <button type="button" class="acct-card ds-stack">
    <div class="acct-top">
      <div class="who">
        <span class="avatar">{{ initials(account.owner.name) }}</span>
        <div class="who-text">
          <div class="name">{{ account.owner.name }}</div>
          <div class="doc">{{ account.owner.document }}</div>
        </div>
      </div>
      <span class="status-pill" :class="STATUS_TONE[account.status]">{{
        cardStatusLabel(account)
      }}</span>
    </div>
    <div class="acct-meta">
      <MapPin :size="13" :stroke-width="1.8" /> {{ account.branch.name }}
      <span>· Cuenta desde {{ formatDateShort(account.createdDate) }}</span>
    </div>
    <div class="acct-totals ds-stack">
      <div class="row ds-meta-dark ds-meta-dark--sm">
        <span>Acumulado</span><strong>{{ formatMoney(account.totalAmount) }}</strong>
      </div>
      <div v-if="account.paidAmount > 0" class="row ds-meta-dark ds-meta-dark--sm">
        <span>Abonado</span><strong>{{ formatMoney(account.paidAmount) }}</strong>
      </div>
      <div class="row saldo ds-meta-dark ds-meta-dark--sm">
        <span>{{ saldoLabel(account) }}</span>
        <strong :class="{ zero: saldoValue(account) <= 0 }">{{
          formatMoney(saldoValue(account))
        }}</strong>
      </div>
    </div>
  </button>
</template>

<style scoped>
/* Layout via primitivas: `.ds-stack` (columna de la tarjeta y de los totales) y
   `.ds-meta-dark(--sm)` en las filas. */
.acct-card {
  text-align: left;
  font-family: inherit;
  cursor: pointer;
  padding: 16px;
  border-radius: 14px;
  background: var(--warm-50);
  border: 1px solid var(--warm-450);
  gap: 11px;
  transition:
    border-color 0.12s,
    box-shadow 0.12s;
}

/* A11Y-09 · la tarjeta es un `<button>`: su borde es frontera de control.
   `--amatista-300` daba 2,02:1, por debajo del reposo `--warm-450` (3,55:1) —
   el hover lo apagaba. `--amatista-450` da 3,77:1. */
.acct-card:hover {
  border-color: var(--amatista-450);
  box-shadow: 0 4px 14px -8px rgb(20 15 30 / 18%);
}
.acct-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}
.who-text {
  min-width: 0;
}
.acct-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
  font-size: 12px;
  color: var(--warm-500);
}
.acct-totals {
  gap: 4px;
  padding-top: 11px;
  border-top: 1px solid var(--warm-150);
}
.acct-totals .row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.acct-totals .row strong {
  color: var(--warm-900);
  font-variant-numeric: tabular-nums;
}
.acct-totals .row.saldo {
  font-size: 14px;
  padding-top: 5px;
  margin-top: 2px;
  border-top: 1px dashed var(--warm-200);
}
.acct-totals .row.saldo strong {
  color: oklch(45% 0.13 70deg);
  font-size: 15px;
}
.acct-totals .row.saldo strong.zero {
  color: var(--success-fg);
}
</style>
