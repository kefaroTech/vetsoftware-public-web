<script setup lang="ts">
import { Wallet } from 'lucide-vue-next'
import ModalShell from '@/components/ui/ModalShell.vue'
import CashMovementsTable from './CashMovementsTable.vue'
import CashStatusPill from './CashStatusPill.vue'
import CashTotalsGrid from './CashTotalsGrid.vue'
import { branchLabel, employeeLabel, formatDateTime, formatDuration } from '../composables/useCaja'
import type { CashSessionView } from '../types/caja'

/**
 * Modal de sólo lectura con el detalle de una caja ajena (o propia ya cerrada).
 *
 * `summary` es la fila de la que se partió — trae los nombres de sede y empleado
 * que el detalle no siempre incluye; `detail` es la respuesta completa. Por eso
 * la cabecera y un par de campos leen de `summary` y el resto de `detail`, tal
 * como hacía el bloque original dentro de `CajaView`.
 */
defineProps<{
  open: boolean
  loading: boolean
  error: string | null
  summary: CashSessionView | null
  detail: CashSessionView | null
}>()

const emit = defineEmits<{ close: []; retry: [session: CashSessionView] }>()
</script>

<template>
  <ModalShell
    :open="open"
    title="Detalle de caja"
    :subtitle="
      summary
        ? branchLabel(summary.branchName, summary.branchId) + ' · Terminal ' + summary.terminal
        : undefined
    "
    :icon="Wallet"
    :width-vw="86"
    :height-vh="88"
    @close="emit('close')"
  >
    <template #body>
      <div v-if="loading" class="cash-detail-state">Cargando detalle de la caja…</div>

      <div v-else-if="error" class="cash-detail-state error">
        <p>{{ error }}</p>
        <button
          v-if="summary"
          type="button"
          class="ds-btn ds-btn--neutral ds-btn--strong"
          @click="emit('retry', summary)"
        >
          Reintentar
        </button>
      </div>

      <div v-else-if="detail && summary" class="ds-stack ds-stack--18">
        <div class="cash-detail-grid">
          <div class="cash-detail-field ds-stack">
            <span class="cash-detail-label">Sede</span>
            <strong>{{ branchLabel(summary.branchName, detail.branchId) }}</strong>
          </div>
          <div class="cash-detail-field ds-stack">
            <span class="cash-detail-label">Terminal</span>
            <strong>{{ detail.terminal }}</strong>
          </div>
          <div class="cash-detail-field ds-stack">
            <span class="cash-detail-label">Estado</span>
            <CashStatusPill :status="detail.status" />
          </div>
          <div class="cash-detail-field ds-stack">
            <span class="cash-detail-label">Responsable</span>
            <strong>
              {{ employeeLabel(summary.openedByEmployeeName, detail.openedByEmployeeId) }}
            </strong>
          </div>
          <div class="cash-detail-field ds-stack">
            <span class="cash-detail-label">Apertura</span>
            <strong>{{ formatDateTime(detail.openedAt) }}</strong>
          </div>
          <div class="cash-detail-field ds-stack">
            <span class="cash-detail-label">Tiempo abierta</span>
            <strong>{{ formatDuration(detail.openedAt, detail.closedAt) }}</strong>
          </div>
        </div>

        <h3 class="cash-detail-section-title">Dinero esperado</h3>
        <CashTotalsGrid :opening-float="detail.openingFloat" :totals="detail.totals" />

        <h3 class="cash-detail-section-title">Movimientos</h3>
        <CashMovementsTable
          :movements="detail.movements"
          empty-label="Esta caja aún no tiene movimientos."
        />
      </div>
    </template>

    <template #footer-actions>
      <button type="button" class="ds-btn ds-btn--neutral ds-btn--strong" @click="emit('close')">
        Cerrar
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
/* Sin override de `--ds-btn-solid-bg`: los dos botones de este modal son
   `--neutral`, así que el tono de caja no aplica aquí. */
.cash-detail-state {
  min-height: 220px;
  display: grid;
  place-content: center;
  gap: 12px;
  color: var(--warm-500);
  text-align: center;
}

.cash-detail-state.error {
  color: var(--danger-fg);
}

.cash-detail-state p {
  margin: 0;
}

/* NO es `.ds-grid-auto` ni `.ds-grid-2`: son TRES columnas, y las dos primitivas
   de rejilla del sistema son de dos. Además `ModalShell` ignora la prop `width`
   fuera de `compact`, así que este cuerpo mide ~90vw: con el mínimo de 240px de
   `auto-fit` el detalle de caja se abriría a seis columnas. La `@media` de
   colapso se queda aquí con ella. */
.cash-detail-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.cash-detail-field {
  min-height: 66px;
  padding: 12px 14px;
  border: 1px solid var(--warm-200);
  border-radius: 10px;
  background: var(--warm-50);
  align-items: flex-start;
  justify-content: center;
  gap: 5px;
  color: var(--warm-800);
  font-size: 13px;
}

/* NO es `.ds-label ds-label--xs`, aunque se le parezca: el tracking aquí es
   .05em y el de la primitiva .04em. Es la misma familia con otro valor, no una
   copia con deriva — el rótulo de `CajaHistoryPanel`, que sí es .04em, sí
   migró. */
.cash-detail-label {
  color: var(--warm-500);
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.cash-detail-section-title {
  margin: 0 0 -8px;
  color: var(--warm-800);
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 400;
}

@media (width <= 720px) {
  .cash-detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>
