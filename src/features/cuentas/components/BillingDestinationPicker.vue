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
      :class="modelValue === 'existing' ? 'ds-tone--accent-outline' : 'destopt-off ds-field-rest'"
      @click="emit('update:modelValue', 'existing')"
    >
      <span
        class="do-check"
        :class="modelValue === 'existing' ? 'ds-tone--accent-solid' : 'do-check-off'"
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
      :class="modelValue === 'new' ? 'ds-tone--accent-outline' : 'destopt-off ds-field-rest'"
      @click="emit('update:modelValue', 'new')"
    >
      <span
        class="do-check"
        :class="modelValue === 'new' ? 'ds-tone--accent-solid' : 'do-check-off'"
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
      :class="modelValue === 'nada' ? 'ds-tone--accent-outline' : 'destopt-off ds-field-rest'"
      @click="emit('update:modelValue', 'nada')"
    >
      <span
        class="do-check"
        :class="modelValue === 'nada' ? 'ds-tone--accent-solid' : 'do-check-off'"
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
   breakpoint que tenía esta rejilla), .ds-stack, .ds-strong, .ds-hint.

   El TONO (fondo + color de borde) de la opción y de su casilla NO vive aquí:
   lo ponen `.ds-tone--accent-outline` / `.ds-tone--accent-solid` desde el
   template, y el estado de reposo lo pone su pareja `-off`. La regla base sólo
   deja la geometría: si declarara `background`/`border-color` pesaría (0,2,0)
   con el `[data-v-…]` del scope y le ganaría siempre a la primitiva (0,1,0). */
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
  border-width: 1px;
  border-style: solid;
  transition:
    border-color 0.12s,
    background 0.12s;
}

/* El `:hover` se acota al estado de reposo: la opción activa ya no tiene regla
   de hover con la que competir, así que conserva su borde amatista-500 como
   antes (cuando ganaba por orden de aparición).

   A11Y-09: `--amatista-300` daba 1,99:1, por debajo del `--warm-450` en reposo
   (3,54:1) que aporta `.ds-field-rest` — el hover apagaba el borde.
   `--amatista-450` da 3,69:1 y sigue por debajo del `--amatista-500` activo. */
.destopt-off:hover {
  border-color: var(--amatista-450);
}
.do-check {
  width: 18px;
  height: 18px;
  border-radius: 6px;
  flex-shrink: 0;
  margin-top: 1px;
  display: grid;
  place-items: center;
  border-width: 1px;
  border-style: solid;
  color: var(--warm-50);
}
.do-check-off {
  background: var(--warm-50);
  border-color: var(--warm-300);
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
