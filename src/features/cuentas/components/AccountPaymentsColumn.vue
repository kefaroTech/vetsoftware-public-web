<script setup lang="ts">
import { Ban, Check, Wallet } from 'lucide-vue-next'
import { useCuentas } from '../composables/useCuentas'
import { formatMoney } from '@/features/tienda/composables/pricing'
import { PAYMENT_METHOD_LABEL, type DebtResponse } from '../types/cuentas'

/**
 * Columna de abonos del detalle de cuenta. Ver `AccountChargesColumn` para la
 * otra mitad.
 */
defineProps<{ readOnly: boolean; canVoid: boolean }>()

const emit = defineEmits<{ void: [payment: DebtResponse] }>()

const store = useCuentas()
</script>

<template>
  <section class="col">
    <div class="section-head">
      <span class="sh-title ds-text-strong"><Wallet :size="16" :stroke-width="1.7" /> Abonos</span>
    </div>
    <div v-if="store.payments.value.length === 0" class="mini-empty">Sin abonos registrados.</div>
    <ul v-else class="pago-list ds-stack ds-stack--8">
      <li v-for="p in store.payments.value" :key="p.id" class="pago" :class="{ voided: p.voided }">
        <div class="pago-info">
          <span class="pago-amt ds-strong ds-num">{{ formatMoney(p.amount) }}</span>
          <span class="pago-meta ds-hint">
            {{ p.createdDate.slice(0, 10) }} · {{ PAYMENT_METHOD_LABEL[p.paymentMethod] }}
            <template v-if="p.createdBy?.name"> · {{ p.createdBy.name }}</template>
          </span>
          <span v-if="p.voided" class="pago-void">
            Anulado{{ p.voidedBy?.name ? ` por ${p.voidedBy.name}` : ''
            }}{{ p.voidReason ? ` · ${p.voidReason}` : '' }}
          </span>
        </div>
        <button
          v-if="!p.voided && !readOnly && canVoid"
          type="button"
          class="pago-void-btn"
          title="Anular abono"
          @click="emit('void', p)"
        >
          <Ban :size="13" :stroke-width="1.9" /> Anular
        </button>
        <Ban v-else-if="p.voided" :size="15" :stroke-width="1.9" class="pago-banned" />
        <Check v-else :size="15" :stroke-width="1.9" class="pago-check" />
      </li>
    </ul>
  </section>
</template>

<style scoped>
/* Base de columna compartida con la otra mitad del detalle: el CSS scoped no
   cruza fronteras de componente, así que va en ambas.
   Layout via primitivas: .ds-stack(--8), .ds-strong, .ds-text-strong, .ds-num,
   .ds-hint. */
.col {
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 14px;
  overflow: hidden;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid var(--warm-200);
}

.sh-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.sh-title svg {
  color: var(--amatista-600);
}

.mini-empty {
  padding: 28px 18px;
  text-align: center;
  font-size: 13px;
  color: var(--warm-400);
}

.pago-check {
  color: var(--success-dot);
  flex-shrink: 0;
}

.pago-list {
  list-style: none;
  margin: 0;
  padding: 12px 18px;
}

.pago {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  background: var(--warm-100);
  border-radius: 9px;
}

.pago-info {
  min-width: 0;
}

.pago-amt {
  font-size: 14px;
}

.pago-meta {
  margin-top: 1px;
  display: block;
}

.pago.voided .pago-amt {
  text-decoration: line-through;
  color: var(--warm-500);
}

.pago-void {
  display: block;
  margin-top: 3px;
  font-size: 11.5px;
  color: oklch(48% 0.16 25deg);
}

.pago-banned {
  color: oklch(55% 0.16 25deg);
  flex-shrink: 0;
}

.pago-void-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
  background: transparent;
  border: 1px solid var(--warm-200);
  color: var(--warm-600);
  border-radius: 7px;
  padding: 5px 9px;
  cursor: pointer;
}

.pago-void-btn:hover {
  background: var(--danger-50);
  border-color: var(--danger-300);
  color: var(--danger-700);
}
</style>
