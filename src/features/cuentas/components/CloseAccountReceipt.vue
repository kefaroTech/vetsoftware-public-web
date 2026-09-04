<script setup lang="ts">
import { Check, X } from 'lucide-vue-next'
import { formatMoney } from '@/features/tienda/composables/pricing'
import type { OpenAccountResponse } from '../types/cuentas'

/**
 * Paso 2 de `CloseAccountModal`: el comprobante en pantalla tras cerrar o
 * cancelar la cuenta. Solo presentación — imprimir vive en el modal, que es
 * quien tiene el builder del tiquete.
 */
defineProps<{
  account: OpenAccountResponse
  charged: number
  cancelled: boolean
  title: string
}>()
</script>

<template>
  <div class="receipt ds-stack">
    <div class="badge" :class="cancelled ? 'ds-tone--warning' : 'ds-tone--success'">
      <X v-if="cancelled" :size="26" :stroke-width="2.4" />
      <Check v-else :size="26" :stroke-width="2.4" />
    </div>
    <div class="rec-title ds-strong">{{ title }}</div>
    <div class="rec-amt">{{ formatMoney(charged) }}</div>
    <div class="rec-rows ds-stack">
      <div class="rec-row">
        <span>Acumulado</span><span>{{ formatMoney(account.totalAmount) }}</span>
      </div>
      <div class="rec-row">
        <span>Abonado</span><span>{{ formatMoney(account.paidAmount) }}</span>
      </div>
      <div class="rec-row total">
        <span>Cobrado ahora</span><span>{{ formatMoney(charged) }}</span>
      </div>
    </div>
    <div v-if="cancelled && account.closeReason" class="rec-reason">
      <span class="rec-reason-lab">Motivo</span>
      <span>{{ account.closeReason }}</span>
    </div>
  </div>
</template>

<style scoped>
.receipt {
  align-items: center;
  text-align: center;
  gap: 10px;
  padding: 6px 0;
}
.badge {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: grid;
  place-items: center;
}
.rec-title {
  font-size: 15px;
}
.rec-amt {
  font-family: var(--font-display);
  font-size: 34px;
  color: var(--warm-900);
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}
.rec-rows {
  width: 100%;
  margin-top: 8px;
  gap: 2px;
}
.rec-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  color: var(--warm-600);
  padding: 7px 4px;
  border-bottom: 1px solid var(--warm-100);
}
.rec-row span:last-child {
  font-variant-numeric: tabular-nums;
  color: var(--warm-900);
}
.rec-row.total {
  border-bottom: none;
  border-top: 1.5px solid var(--warm-200);
  margin-top: 4px;
  font-weight: 600;
}
.rec-row.total span:last-child {
  color: var(--success-fg);
}
.rec-reason {
  width: 100%;
  margin-top: 10px;
  padding: 10px 12px;
  background: var(--warm-100);
  border-radius: 9px;
  text-align: left;
  font-size: 12.5px;
  color: var(--warm-700);
}
.rec-reason-lab {
  display: block;
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--warm-500);
  margin-bottom: 2px;
}
</style>
