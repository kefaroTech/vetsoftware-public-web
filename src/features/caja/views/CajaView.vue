<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Wallet, Plus, LockKeyhole, ArrowLeftRight, FileDown, History } from 'lucide-vue-next'
import { useCaja, formatMoney, methodLabel, movementTypeLabel, isInflow } from '../composables/useCaja'
import { useAuthorization } from '@/features/auth/composables/useAuthorization'
import { useBranchStore } from '@/features/branches/stores/branch.store'
import { PERMISSIONS } from '@/constants/permissions'
import OpenCashModal from '../components/OpenCashModal.vue'
import CashMovementModal from '../components/CashMovementModal.vue'
import CloseCashModal from '../components/CloseCashModal.vue'

const { current, isOpen, loading, history, historyLoading, loadCurrent, loadHistory, exportArqueo } = useCaja()
const { can } = useAuthorization()
const branchStore = useBranchStore()

const canOperate = can(PERMISSIONS.CASHREGISTER_OPERATE)
const canClose = can(PERMISSIONS.CASHREGISTER_CLOSE)

const openModal = ref(false)
const movementModal = ref(false)
const closeModal = ref(false)

const openedAt = computed(() => current.value && formatDateTime(current.value.openedAt))

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
}

async function refreshAll() {
  await Promise.all([loadCurrent(true), loadHistory({ page: 0, pageSize: 20 })])
}

onMounted(refreshAll)
watch(() => branchStore.selectedBranchId, refreshAll)
</script>

<template>
  <div class="caja">
    <header class="page-head">
      <div class="title-wrap">
        <Wallet :size="22" :stroke-width="1.7" />
        <div>
          <h1>Caja</h1>
          <p class="sub">Control de efectivo y arqueo por sede</p>
        </div>
      </div>
      <div v-if="!isOpen && canOperate" class="head-actions">
        <button type="button" class="btn primary" @click="openModal = true">
          <Plus :size="16" :stroke-width="1.9" /> Abrir caja
        </button>
      </div>
    </header>

    <!-- Sin caja abierta -->
    <section v-if="!isOpen && !loading" class="empty-state">
      <Wallet :size="40" :stroke-width="1.3" />
      <p class="empty-title">No hay caja abierta en esta sede</p>
      <p class="empty-sub">Abre la caja con la base inicial para comenzar a cobrar y registrar movimientos.</p>
      <button v-if="canOperate" type="button" class="btn primary" @click="openModal = true">
        <Plus :size="16" :stroke-width="1.9" /> Abrir caja
      </button>
    </section>

    <!-- Panel de caja abierta -->
    <section v-else-if="isOpen && current" class="panel">
      <div class="panel-head">
        <div>
          <span class="pill open">Abierta</span>
          <span class="opened">desde {{ openedAt }} · terminal {{ current.terminal }}</span>
        </div>
        <div class="panel-actions">
          <button v-if="canOperate" type="button" class="btn ghost" @click="movementModal = true">
            <ArrowLeftRight :size="15" :stroke-width="1.7" /> Ingreso / Retiro / Gasto
          </button>
          <button v-if="canClose" type="button" class="btn primary" @click="closeModal = true">
            <LockKeyhole :size="15" :stroke-width="1.7" /> Cerrar caja
          </button>
        </div>
      </div>

      <div class="totals">
        <div class="total-card base">
          <span class="lbl">Base inicial</span>
          <span class="val">{{ formatMoney(current.openingFloat) }}</span>
        </div>
        <div v-for="t in current.totals" :key="t.method" class="total-card">
          <span class="lbl">{{ methodLabel(t.method) }} (esperado)</span>
          <span class="val">{{ formatMoney(t.expectedAmount) }}</span>
        </div>
      </div>

      <h2 class="section-title">Movimientos</h2>
      <table class="movs">
        <thead>
          <tr>
            <th>Fecha</th><th>Tipo</th><th>Medio</th><th class="num">Monto</th><th>Referencia</th><th>Nota</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="current.movements.length === 0">
            <td colspan="6" class="empty-row">Aún no hay movimientos en esta sesión.</td>
          </tr>
          <tr v-for="m in current.movements" :key="m.id ?? m.createdAt + m.type + m.method">
            <td>{{ formatDateTime(m.createdAt) }}</td>
            <td>{{ movementTypeLabel(m.type) }}</td>
            <td>{{ methodLabel(m.method) }}</td>
            <td class="num" :class="isInflow(m.type) ? 'pos' : 'neg'">
              {{ isInflow(m.type) ? '+' : '−' }}{{ formatMoney(m.amount) }}
            </td>
            <td>{{ m.referenceId ? m.referenceType + ' #' + m.referenceId : '—' }}</td>
            <td>{{ m.note ?? '—' }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- Historial de cierres -->
    <section class="history">
      <h2 class="section-title"><History :size="16" :stroke-width="1.7" /> Historial de cajas</h2>
      <table class="movs">
        <thead>
          <tr>
            <th>Apertura</th><th>Cierre</th><th>Terminal</th><th>Estado</th>
            <th class="num">Base</th><th class="num">Arqueo</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!historyLoading && history.length === 0">
            <td colspan="6" class="empty-row">Sin sesiones registradas.</td>
          </tr>
          <tr v-for="s in history" :key="s.id">
            <td>{{ formatDateTime(s.openedAt) }}</td>
            <td>{{ s.closedAt ? formatDateTime(s.closedAt) : '—' }}</td>
            <td>{{ s.terminal }}</td>
            <td><span class="pill" :class="s.status === 'OPEN' ? 'open' : 'closed'">{{ s.status === 'OPEN' ? 'Abierta' : 'Cerrada' }}</span></td>
            <td class="num">{{ formatMoney(s.openingFloat) }}</td>
            <td class="num">
              <button type="button" class="link" title="Descargar CSV" @click="exportArqueo(s.id, 'csv')">CSV</button>
              <button type="button" class="link" title="Descargar PDF" @click="exportArqueo(s.id, 'pdf')">
                <FileDown :size="13" :stroke-width="1.8" /> PDF
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <OpenCashModal :open="openModal" @close="openModal = false" @saved="refreshAll" />
    <CashMovementModal :open="movementModal" @close="movementModal = false" @saved="loadCurrent(true)" />
    <CloseCashModal :open="closeModal" @close="closeModal = false" @closed="refreshAll" />
  </div>
</template>

<style scoped>
.caja {
  max-width: 1180px;
  margin: 0 auto;
  padding: 24px 28px;
  font-family: var(--font-sans);
}
.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}
.title-wrap {
  display: flex;
  gap: 12px;
  align-items: center;
  color: var(--amatista-700, #5c2d8c);
}
.title-wrap h1 {
  margin: 0;
  font-family: var(--font-serif);
  font-size: 26px;
  font-weight: 400;
  color: var(--warm-900);
}
.sub {
  margin: 2px 0 0;
  font-size: 13px;
  color: var(--warm-500);
}
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
  padding: 60px 20px;
  color: var(--warm-500);
  background: var(--warm-50);
  border: 1px dashed var(--warm-200);
  border-radius: 16px;
}
.empty-title {
  font-size: 17px;
  color: var(--warm-800);
  margin: 8px 0 0;
}
.empty-sub {
  margin: 0 0 12px;
  max-width: 420px;
}
.panel {
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 16px;
  padding: 20px 22px;
  margin-bottom: 26px;
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
  margin-left: 10px;
}
.panel-actions {
  display: flex;
  gap: 8px;
}
.pill {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 600;
}
.pill.open {
  background: oklch(92% 0.08 150);
  color: oklch(40% 0.12 150);
}
.pill.closed {
  background: var(--warm-100);
  color: var(--warm-600);
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
.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-serif);
  font-size: 16px;
  font-weight: 400;
  color: var(--warm-800);
  margin: 8px 0 10px;
}
.movs {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.movs th {
  text-align: left;
  color: var(--warm-500);
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 6px 8px;
  border-bottom: 1px solid var(--warm-200);
}
.movs td {
  padding: 7px 8px;
  border-bottom: 1px solid var(--warm-100);
}
.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.pos {
  color: #2f7d4f;
  font-weight: 600;
}
.neg {
  color: #b4453a;
  font-weight: 600;
}
.empty-row {
  text-align: center;
  color: var(--warm-400);
  padding: 22px;
}
.history {
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 16px;
  padding: 20px 22px;
}
.link {
  background: none;
  border: none;
  color: var(--amatista-700, #5c2d8c);
  font-weight: 600;
  font-size: 12.5px;
  cursor: pointer;
  padding: 2px 6px;
  display: inline-flex;
  align-items: center;
  gap: 3px;
}
.link:hover {
  text-decoration: underline;
}
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: none;
  border-radius: 9px;
  padding: 9px 15px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.btn.ghost {
  background: var(--warm-100);
  color: var(--warm-700);
}
.btn.primary {
  background: var(--amatista-600, #5c2d8c);
  color: #fff;
}
</style>
