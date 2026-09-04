<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { useScrollableRegion } from '@/composables/useScrollableRegion'
import { feMoney } from '../composables/feFormat'
import type { DocumentLine } from '../types/facturacion'

defineProps<{ lines: DocumentLine[] }>()

const tabla = useTemplateRef<HTMLElement>('tabla')
const desborda = useScrollableRegion(tabla)
</script>

<template>
  <div
    ref="tabla"
    class="ds-table-scroll ds-focus-ring"
    role="region"
    aria-label="Líneas del documento electrónico"
    :tabindex="desborda ? 0 : undefined"
  >
    <table class="lines">
      <thead>
        <tr>
          <th>Descripción</th>
          <th>Cant.</th>
          <th class="ds-num">V. unit.</th>
          <th>Imp.</th>
          <th class="ds-num">Total</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="l in lines" :key="l.lineNumber">
          <td>{{ l.description }}</td>
          <td>{{ l.quantity }}</td>
          <td class="ds-num">{{ feMoney(l.unitPrice) }}</td>
          <td>
            <span v-if="l.taxScheme" class="taxchip ds-tone--accent-soft"
              >{{ l.taxScheme }} {{ l.taxRate }}%</span
            >
            <span v-else class="taxchip muted">{{ l.taxCategory }}</span>
          </td>
          <td class="ds-num ds-strong">{{ feMoney(l.totalAmount) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.lines {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
}

.lines th {
  text-align: left;
  font-weight: 500;
  color: var(--warm-500);
  padding: 6px 8px;
  border-bottom: 1px solid var(--warm-200);
}

/* `.lines th` (0,2,1) le gana a `.ds-num` (0,1,0): la excepción nombra la clase
   para pesar (0,2,2) y que la cabecera caiga sobre sus cifras. */
.lines th.ds-num {
  text-align: right;
}

.lines td {
  padding: 8px;
  border-bottom: 1px solid var(--warm-100);
  color: var(--warm-800);
}

.taxchip {
  font-size: 11px;
  padding: 2px 7px;
  border-radius: 6px;
  font-weight: 600;
}

.taxchip.muted {
  background: var(--warm-150, var(--warm-100));
  color: var(--warm-600);
}
</style>
