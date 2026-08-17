<script setup lang="ts">
import { Check } from 'lucide-vue-next'
import { formatMoney } from '@/features/tienda/composables/pricing'
import type { BillingDestino } from '../composables/useConsultaBilling'

/**
 * Las tres salidas de la facturación de una consulta: sumar a la cuenta abierta,
 * abrir una nueva, o no cobrar.
 *
 * Sale de `ConsultaBillingModal`. Las dos primeras son excluyentes por regla de
 * negocio (un propietario tiene como mucho una cuenta abierta por sede), así que
 * sólo se pinta la que aplica según `hasAccount`.
 */
defineProps<{
  modelValue: BillingDestino
  hasAccount: boolean
  projectedSaldo: number
}>()

const emit = defineEmits<{ 'update:modelValue': [destino: BillingDestino] }>()
</script>

<template>
  <div class="dest ds-grid-2">
    <button
      v-if="hasAccount"
      type="button"
      class="destopt"
      :class="{ active: modelValue === 'existing' }"
      @click="emit('update:modelValue', 'existing')"
    >
      <span class="do-check"
        ><Check v-if="modelValue === 'existing'" :size="13" :stroke-width="3"
      /></span>
      <span class="do-text ds-stack">
        <span class="do-title ds-strong">Agregar a la cuenta abierta</span>
        <span class="do-sub ds-hint">Saldo proyectado {{ formatMoney(projectedSaldo) }}</span>
      </span>
    </button>

    <button
      v-else
      type="button"
      class="destopt"
      :class="{ active: modelValue === 'new' }"
      @click="emit('update:modelValue', 'new')"
    >
      <span class="do-check"
        ><Check v-if="modelValue === 'new'" :size="13" :stroke-width="3"
      /></span>
      <span class="do-text ds-stack">
        <span class="do-title ds-strong">Abrir cuenta y agregar cargos</span>
        <span class="do-sub ds-hint">Registra estos cargos a crédito.</span>
      </span>
    </button>

    <button
      type="button"
      class="destopt"
      :class="{ active: modelValue === 'nada' }"
      @click="emit('update:modelValue', 'nada')"
    >
      <span class="do-check"
        ><Check v-if="modelValue === 'nada'" :size="13" :stroke-width="3"
      /></span>
      <span class="do-text ds-stack">
        <span class="do-title ds-strong">Solo guardar la consulta</span>
        <span class="do-sub ds-hint">Sin cobro ni cuenta. Podrás cobrar después.</span>
      </span>
    </button>
  </div>
</template>

<style scoped>
/* Layout via primitivas: .ds-grid-2 (dos columnas + colapso en 640px, el mismo
   breakpoint que tenía esta rejilla), .ds-stack, .ds-strong, .ds-hint. */
.dest {
  gap: 12px;
  margin-bottom: 18px;
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
  gap: 3px;
  min-width: 0;
}
.do-title {
  font-size: 13px;
  line-height: 1.25;
}
.do-sub {
  line-height: 1.35;
}
</style>
