<script setup lang="ts">
import type { CashSessionStatus } from '../types/caja'

/**
 * Distintivo de estado de una sesión de caja.
 *
 * El trío `.pill` / `.pill.open` / `.pill.closed` estaba copiado en el panel de
 * historial, el de mi caja y el modal de detalle, siempre con el mismo marcado y
 * la misma pareja de etiquetas: es una pieza, no tres.
 */
defineProps<{ status: CashSessionStatus }>()
</script>

<template>
  <span class="cash-pill" :class="status === 'OPEN' ? 'open' : 'closed'">
    {{ status === 'OPEN' ? 'Abierta' : 'Cerrada' }}
  </span>
</template>

<style scoped>
.cash-pill {
  display: inline-block;
  padding: var(--space-2) var(--space-10);
  border-radius: var(--radius-pill);
  font-size: var(--text-label);
  font-weight: var(--weight-semibold);
}

.cash-pill.open {
  background: oklch(92% 0.08 150deg);
  color: oklch(40% 0.12 150deg);
}

.cash-pill.closed {
  background: var(--warm-100);
  color: var(--warm-600);
}
</style>
