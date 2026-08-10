<script setup lang="ts">
import { computed } from 'vue'
import { ArrowLeftRight, LockKeyhole } from 'lucide-vue-next'
import CashMovementsTable from './CashMovementsTable.vue'
import { branchLabel, formatDateTime, formatMoney, methodLabel } from '../composables/useCaja'
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
            <span class="detail-eyebrow">Mi caja abierta</span>
            <h1>{{ branchLabel(session.branchName, session.branchId) }}</h1>
            <p>Terminal {{ detail.terminal }}</p>
          </div>
          <span class="pill open">Abierta</span>
        </div>
      </header>

      <div class="panel-head">
        <div>
          <span class="opened">Desde {{ openedAt }} · terminal {{ detail.terminal }}</span>
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

      <div class="totals">
        <div class="total-card base">
          <span class="lbl">Base inicial</span>
          <span class="val">{{ formatMoney(detail.openingFloat) }}</span>
        </div>
        <div v-for="t in detail.totals" :key="t.method" class="total-card">
          <span class="lbl">{{ methodLabel(t.method) }} (esperado)</span>
          <span class="val">{{ formatMoney(t.expectedAmount) }}</span>
        </div>
      </div>

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

.detail-eyebrow {
  color: var(--amatista-700);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.detail-title-wrap h1 {
  margin: 4px 0 2px;
  color: var(--warm-900);
  font-family: var(--font-serif);
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

.opened {
  font-size: 12.5px;
  color: var(--warm-500);
}

.panel-actions {
  display: flex;
  gap: 8px;
}

.pill {
  display: inline-block;
  padding: 2px 10px;
  border-radius: var(--radius-pill);
  font-size: 11.5px;
  font-weight: 600;
}

.pill.open {
  background: oklch(92% 0.08 150deg);
  color: oklch(40% 0.12 150deg);
}

.totals {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
  margin-bottom: 22px;
}

.total-card {
  background: var(--warm-100);
  border-radius: 10px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.total-card.base {
  background: var(--amatista-100, #efe6f7);
}

.total-card .lbl {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--warm-500);
}

.total-card .val {
  font-size: 18px;
  font-weight: 700;
  color: var(--warm-900);
}

.movement-title {
  margin: 8px 0 10px;
  font-family: var(--font-serif);
  font-size: 15px;
  font-weight: 400;
  color: var(--warm-800);
}
</style>
