<script setup lang="ts">
import { computed } from 'vue'
import { AlertTriangle, Bell } from 'lucide-vue-next'
import { formatMoney } from '../composables/pricing'
import type { ExpiringLotView } from '../types/inventory'

/**
 * Avisos de la pestaña "Activos": sede sin seleccionar, falta de permiso, stock
 * bajo el mínimo, lotes por vencer y valor del inventario.
 *
 * Sale de `InventarioView` como bloque porque los cinco comparten la misma
 * franja visual y las mismas condiciones de sede/permiso. El único que es
 * accionable es el de stock bajo, que emite `showLowStock`.
 */
const props = defineProps<{
  hasBranch: boolean
  canReadStock: boolean
  showStock: boolean
  branchName: string
  lowCount: number
  expiringLots: ExpiringLotView[]
  totalValue: number
}>()

const emit = defineEmits<{ showLowStock: [] }>()

/**
 * El lote más próximo a vencer. Nombrarlo aquí evita repetir `expiringLots[0]`
 * tres veces en la plantilla y hace que su existencia sea la condición que
 * pinta el aviso, en vez de un `length > 0` que el tipo no relaciona con nada.
 */
const nextExpiring = computed(() => props.expiringLots[0] ?? null)
</script>

<template>
  <div v-if="!hasBranch" class="alert info">Selecciona una sede para ver y gestionar su stock.</div>

  <div v-if="hasBranch && !canReadStock" class="alert info">
    No tienes permiso para ver el inventario. Pide a un administrador el permiso
    <strong>Ver inventario</strong>.
  </div>

  <div
    v-if="showStock && lowCount > 0"
    class="alert"
    role="button"
    tabindex="0"
    @click="emit('showLowStock')"
    @keyup.enter="emit('showLowStock')"
  >
    <Bell :size="15" :stroke-width="1.8" />
    <span
      ><strong>{{ lowCount }}</strong> producto(s) bajo el mínimo en {{ branchName }} — ver por
      reponer</span
    >
  </div>

  <div v-if="showStock && nextExpiring" class="alert expire">
    <AlertTriangle :size="15" :stroke-width="1.8" />
    <span
      ><strong>{{ expiringLots.length }}</strong> lote(s) por vencer o vencidos en
      {{ branchName }} (más próximo: {{ nextExpiring.productName }},
      {{ nextExpiring.daysToExpire < 0 ? 'vencido' : `${nextExpiring.daysToExpire} día(s)` }})</span
    >
  </div>

  <div v-if="showStock" class="valuation">
    <span class="v-label">Valor del inventario en {{ branchName }}</span>
    <strong class="v-amount">{{ formatMoney(totalValue) }}</strong>
  </div>
</template>

<style scoped>
.alert {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 11px 14px;
  margin-bottom: 16px;
  background: oklch(96% 0.04 80deg);
  border: 1px solid oklch(88% 0.08 80deg);
  border-radius: 10px;
  font-size: 13px;
  color: oklch(40% 0.1 70deg);
  cursor: pointer;
}
.alert:hover {
  background: oklch(94% 0.05 80deg);
}
.alert.info {
  background: var(--amatista-50);
  border-color: var(--amatista-200);
  color: var(--amatista-700);
  cursor: default;
}
.alert.expire {
  background: var(--danger-50);
  border-color: var(--danger-400);
  color: oklch(45% 0.16 25deg);
  cursor: default;
}
.alert.expire strong {
  color: var(--danger-900);
}
.alert strong {
  color: oklch(35% 0.13 70deg);
}
.valuation {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 12px 16px;
  margin-bottom: 16px;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 10px;
}
.v-label {
  font-size: 12.5px;
  color: var(--warm-500);
}
.v-amount {
  font-size: 20px;
  font-weight: 600;
  color: var(--amatista-700);
  font-variant-numeric: tabular-nums;
}
</style>
