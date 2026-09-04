<script setup lang="ts">
import { computed } from 'vue'
import { ArrowLeftRight, LockKeyhole } from 'lucide-vue-next'
import CashMovementsTable from './CashMovementsTable.vue'
import CashStatusPill from './CashStatusPill.vue'
import CashTotalsGrid from './CashTotalsGrid.vue'
import { branchLabel, formatDateTime } from '../composables/useCaja'
import type { CashSessionView } from '../types/caja'

/**
 * Pestaña "Mi caja abierta": cabecera, totales esperados y movimientos de la
 * sesión que abrió el usuario autenticado, más sus dos acciones.
 *
 * `session` es el resumen que ya trae la lista de cajas abiertas; `detail` es la
 * sesión completa cargada aparte. Mientras `detail` no corresponda a `session`
 * se muestra el estado de carga — que es justo lo que hacía la condición
 * `isOpen && current && current.id === myOpenSession.id` en la vista.
 */
const props = defineProps<{
  session: CashSessionView
  detail: CashSessionView | null
  canOperate: boolean
  canClose: boolean
}>()

const emit = defineEmits<{ movement: []; close: [] }>()

const openedAt = computed(() => props.detail && formatDateTime(props.detail.openedAt))
</script>

<template>
  <section class="my-cash">
    <div v-if="detail && detail.id === session.id" class="my-cash-detail">
      <header class="detail-page-head">
        <div class="detail-title-wrap">
          <div>
            <span class="ds-kicker-accent ds-kicker-accent--snug">Mi caja abierta</span>
            <h1>{{ branchLabel(session.branchName, session.branchId) }}</h1>
            <p>Terminal {{ detail.terminal }}</p>
          </div>
          <CashStatusPill status="OPEN" />
        </div>
      </header>

      <div class="panel-head">
        <div>
          <span class="ds-meta ds-meta--sm"
            >Desde {{ openedAt }} · terminal {{ detail.terminal }}</span
          >
        </div>
        <div class="panel-actions">
          <button
            v-if="canOperate"
            type="button"
            class="ds-btn ds-btn--neutral ds-btn--strong"
            @click="emit('movement')"
          >
            <ArrowLeftRight :size="15" :stroke-width="1.7" /> Ingreso / Retiro / Gasto
          </button>
          <button
            v-if="canClose"
            type="button"
            class="ds-btn ds-btn--solid ds-btn--strong"
            @click="emit('close')"
          >
            <LockKeyhole :size="15" :stroke-width="1.7" /> Cerrar caja
          </button>
        </div>
      </div>

      <CashTotalsGrid
        class="my-totals"
        :opening-float="detail.openingFloat"
        :totals="detail.totals"
        expected
      />

      <h3 class="movement-title">Movimientos</h3>
      <CashMovementsTable
        :movements="detail.movements"
        empty-label="Aún no hay movimientos en esta sesión."
      />
    </div>

    <div v-else class="detail-loading">
      <p>Cargando información de la caja…</p>
    </div>
  </section>
</template>

<style scoped>
/* La pestaña no dibuja tarjeta propia: el detalle ocupa el ancho de la página. */
.my-cash {
  margin-bottom: 26px;
}

.detail-page-head {
  margin-bottom: 24px;
}

.detail-title-wrap {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}

/* El rótulo de acento de marca es `.ds-kicker-accent ds-kicker-accent--snug`
   (primitives.css): coincidía con la primitiva en sus cinco declaraciones. */

.detail-title-wrap h1 {
  margin: 4px 0 2px;
  color: var(--warm-900);
  font-family: var(--font-display);
  font-size: 28px;
  font-weight: 400;
}

.detail-title-wrap p {
  margin: 0;
  color: var(--warm-500);
  font-size: 13px;
}

.detail-loading {
  min-height: 280px;
  color: var(--warm-500);
}

.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 18px;
}

/* El dato de apoyo de la cabecera es `.ds-meta ds-meta--sm` (primitives.css):
   mismo warm-500 y mismos 12,5px. */

/* NO es `.ds-flex-row`: la primitiva añade `align-items: center`, que esta fila
   no declara. Con dos botones de la misma altura se vería igual, pero el
   contrato es sustituir cuerpos idénticos, no parecidos. */
.panel-actions {
  display: flex;
  gap: 8px;
}

.my-totals {
  margin-bottom: 22px;
}

.movement-title {
  margin: 8px 0 10px;
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 400;
  color: var(--warm-800);
}
</style>
