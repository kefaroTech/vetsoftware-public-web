<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Wallet, Plus } from 'lucide-vue-next'
import { useCaja } from '../composables/useCaja'
import { useAuthorization } from '@/features/auth/composables/useAuthorization'
import { useAuth } from '@/features/auth/composables/useAuth'
import { useBranchStore } from '@/features/branches/stores/branch.store'
import { PERMISSIONS } from '@/constants/permissions'
import OpenCashModal from '../components/OpenCashModal.vue'
import CashMovementModal from '../components/CashMovementModal.vue'
import CloseCashModal from '../components/CloseCashModal.vue'
import CajaHistoryPanel from '../components/CajaHistoryPanel.vue'
import CajaOpenSessionsPanel from '../components/CajaOpenSessionsPanel.vue'
import MyCashPanel from '../components/MyCashPanel.vue'
import CashSessionDetailModal from '../components/CashSessionDetailModal.vue'
import { cashSessionApi } from '../api/cashSession.api'
import { employeeApi } from '@/features/employees/api/employee.api'
import type { EmployeeResponse } from '@/features/employees/types/employee.types'
import { getProblemDetailMessage } from '@/services/http/http.client'
import type { CashSessionView } from '../types/caja'

const {
  current,
  isOpen,
  history,
  historyTotal,
  historyPage,
  historyPageSize,
  historyTotalPages,
  historyLoading,
  openSessions,
  openSessionsLoading,
  openSessionsLoaded,
  loadCurrent,
  loadHistory,
  loadOpenSessions,
  setHistoryPage,
  exportArqueo,
} = useCaja()
const { can } = useAuthorization()
const { subjectId } = useAuth()
const branchStore = useBranchStore()
const route = useRoute()
const router = useRouter()

const canOperate = can(PERMISSIONS.CASHREGISTER_OPERATE)
const canClose = can(PERMISSIONS.CASHREGISTER_CLOSE)
const canReadHistory = can(PERMISSIONS.CASHREGISTER_HISTORY_READ)
const myOpenSession = computed(() =>
  subjectId.value == null
    ? null
    : (openSessions.value.find((session) => session.openedByEmployeeId === subjectId.value) ??
      null),
)
const canOpenCash = computed(
  () => canOperate.value && openSessionsLoaded.value && myOpenSession.value == null,
)
const canCloseCurrentSession = computed(
  () =>
    canClose.value &&
    subjectId.value != null &&
    current.value?.openedByEmployeeId === subjectId.value,
)

/** Detalle que `MyCashPanel` debe pintar: sólo si la sesión cargada es la mía. */
const myCashDetail = computed(() => (isOpen.value ? current.value : null))

const openModal = ref(false)
const movementModal = ref(false)
const closeModal = ref(false)
const viewedCashOpen = ref(false)
const viewedCashLoading = ref(false)
const viewedCashError = ref<string | null>(null)
const viewedCash = ref<CashSessionView | null>(null)
const viewedCashSummary = ref<CashSessionView | null>(null)
let returningToPos = false
type CashTab = 'open' | 'mine' | 'history'
const activeTab = ref<CashTab>('open')
const historyBranchId = ref<number | null>(branchStore.selectedBranchId)
const historyEmployeeId = ref<number | null>(null)
const historyFrom = ref('')
const historyTo = ref('')
const historyEmployees = ref<EmployeeResponse[]>([])
const historyEmployeesLoading = ref(false)

const historyBranchOptions = computed(() =>
  [...branchStore.branches].sort((a, b) => a.name.localeCompare(b.name, 'es')),
)
const historyEmployeeOptions = computed(() =>
  [...historyEmployees.value].sort((a, b) => a.name.localeCompare(b.name, 'es')),
)

function showMyCash(): void {
  const session = myOpenSession.value
  if (!session) return

  activeTab.value = 'mine'
  if (branchStore.selectedBranchId !== session.branchId) {
    branchStore.setSelectedBranch(session.branchId)
  } else if (current.value?.id !== session.id) {
    void loadCurrent(true)
  }
}

function openCashSession(session: CashSessionView): void {
  if (session.id === myOpenSession.value?.id) {
    showMyCash()
    return
  }
  void viewCash(session)
}

async function viewCash(session: CashSessionView): Promise<void> {
  viewedCashOpen.value = true
  viewedCashLoading.value = true
  viewedCashError.value = null
  viewedCash.value = null
  viewedCashSummary.value = session

  try {
    viewedCash.value = await cashSessionApi.getById(session.id)
  } catch (error) {
    viewedCashError.value = getProblemDetailMessage(
      error,
      'No se pudo cargar el detalle de la caja.',
    )
  } finally {
    viewedCashLoading.value = false
  }
}

function closeViewedCash(): void {
  viewedCashOpen.value = false
  viewedCashError.value = null
  viewedCash.value = null
  viewedCashSummary.value = null
}

function closeOpenModal(): void {
  openModal.value = false
  if (returningToPos) return
  if (route.query.openCash !== '1') return

  const query = { ...route.query }
  delete query.openCash
  delete query.returnTo
  void router.replace({ query })
}

function handleOpenCashSaved(session: CashSessionView): void {
  const returnToPos = route.query.returnTo === 'tienda-pos'
  if (branchStore.selectedBranchId !== session.branchId) {
    branchStore.setSelectedBranch(session.branchId)
  }

  if (returnToPos) {
    returningToPos = true
    openModal.value = false
    void router.replace({ name: 'tienda-pos' })
    return
  }

  activeTab.value = 'mine'
  void refreshAll()
}

function historyFilterParams() {
  return {
    branchId: historyBranchId.value,
    employeeId: historyEmployeeId.value ?? undefined,
    from: historyFrom.value || undefined,
    to: historyTo.value || undefined,
  }
}

function applyHistoryFilters(): void {
  void loadHistory({ ...historyFilterParams(), page: 0 })
}

function clearHistoryFilters(): void {
  historyBranchId.value = null
  historyEmployeeId.value = null
  historyFrom.value = ''
  historyTo.value = ''
  applyHistoryFilters()
}

async function loadHistoryEmployees(): Promise<void> {
  historyEmployeesLoading.value = true
  try {
    historyEmployees.value = await employeeApi.listByCompany()
  } catch {
    historyEmployees.value = []
  } finally {
    historyEmployeesLoading.value = false
  }
}

async function refreshAll() {
  const requests = [loadCurrent(true), loadOpenSessions()]
  if (canReadHistory.value) {
    requests.push(loadHistory({ ...historyFilterParams(), page: 0, pageSize: 20 }))
  }
  await Promise.all(requests)
}

onMounted(() => {
  const requests = [refreshAll(), branchStore.fetchAll()]
  if (canReadHistory.value) requests.push(loadHistoryEmployees())
  void Promise.all(requests)
})
watch(
  () => branchStore.selectedBranchId,
  (branchId) => {
    historyBranchId.value = branchId
    void refreshAll()
  },
)
let initialTabResolved = false
watch([openSessionsLoaded, myOpenSession], ([loaded, session], previous) => {
  if (!loaded) return
  const previousSession = previous?.[1]
  if (!initialTabResolved || (session && !previousSession)) {
    if (session) showMyCash()
    else activeTab.value = 'open'
    initialTabResolved = true
  } else if (!session && activeTab.value === 'mine') {
    activeTab.value = 'open'
  }
})
watch(
  [() => route.query.openCash, openSessionsLoaded, myOpenSession, canOpenCash],
  ([requested, loaded, session, allowed]) => {
    if (requested !== '1' || !loaded) return
    if (session) {
      if (branchStore.selectedBranchId !== session.branchId) {
        branchStore.setSelectedBranch(session.branchId)
      }
      if (route.query.returnTo === 'tienda-pos') {
        void router.replace({ name: 'tienda-pos' })
      }
      return
    }
    if (allowed) openModal.value = true
  },
  { immediate: true },
)
</script>

<template>
  <div class="ds-page ds-page--contained caja">
    <header class="page-head">
      <div class="ds-flex-row ds-flex-row--12 ds-flex-row--accent">
        <Wallet :size="22" :stroke-width="1.7" />
        <div>
          <h1 class="ds-display ds-display--xs">Caja</h1>
          <p class="sub">Control de efectivo y arqueo por sede</p>
        </div>
      </div>
      <div v-if="!isOpen && canOpenCash" class="head-actions">
        <button type="button" class="ds-btn ds-btn--solid ds-btn--strong" @click="openModal = true">
          <Plus :size="16" :stroke-width="1.9" /> Abrir caja
        </button>
      </div>
    </header>

    <nav class="cash-tabs" role="tablist" aria-label="Secciones de caja">
      <button
        v-if="myOpenSession"
        type="button"
        role="tab"
        class="cash-tab"
        :class="{ active: activeTab === 'mine' }"
        :aria-selected="activeTab === 'mine'"
        @click="showMyCash"
      >
        Mi caja abierta
        <span class="tab-status" aria-hidden="true"></span>
      </button>
      <button
        type="button"
        role="tab"
        class="cash-tab"
        :class="{ active: activeTab === 'open' }"
        :aria-selected="activeTab === 'open'"
        @click="activeTab = 'open'"
      >
        Cajas abiertas
        <span class="tab-count">{{ openSessions.length }}</span>
      </button>
      <button
        v-if="canReadHistory"
        type="button"
        role="tab"
        class="cash-tab"
        :class="{ active: activeTab === 'history' }"
        :aria-selected="activeTab === 'history'"
        @click="activeTab = 'history'"
      >
        Historial
        <span class="tab-count">{{ historyTotal }}</span>
      </button>
    </nav>

    <CajaOpenSessionsPanel
      v-if="activeTab === 'open'"
      :sessions="openSessions"
      :loading="openSessionsLoading"
      :my-open-session-id="myOpenSession?.id ?? null"
      @open="openCashSession"
    />

    <!-- Solo existe cuando el usuario autenticado tiene una caja OPEN. -->
    <MyCashPanel
      v-if="myOpenSession && activeTab === 'mine'"
      :session="myOpenSession"
      :detail="myCashDetail"
      :can-operate="canOperate"
      :can-close="canCloseCurrentSession"
      @movement="movementModal = true"
      @close="closeModal = true"
    />

    <CajaHistoryPanel
      v-if="canReadHistory && activeTab === 'history'"
      v-model:branch-id="historyBranchId"
      v-model:employee-id="historyEmployeeId"
      v-model:from="historyFrom"
      v-model:to="historyTo"
      :rows="history"
      :total="historyTotal"
      :page="historyPage"
      :page-count="historyTotalPages"
      :page-size="historyPageSize"
      :loading="historyLoading"
      :employees-loading="historyEmployeesLoading"
      :branch-options="historyBranchOptions"
      :employee-options="historyEmployeeOptions"
      @apply="applyHistoryFilters"
      @clear="clearHistoryFilters"
      @export="exportArqueo"
      @update:page="setHistoryPage"
    />

    <OpenCashModal :open="openModal" @close="closeOpenModal" @saved="handleOpenCashSaved" />
    <CashMovementModal
      :open="movementModal"
      @close="movementModal = false"
      @saved="loadCurrent(true)"
    />
    <CloseCashModal :open="closeModal" @close="closeModal = false" @closed="refreshAll" />

    <CashSessionDetailModal
      :open="viewedCashOpen"
      :loading="viewedCashLoading"
      :error="viewedCashError"
      :summary="viewedCashSummary"
      :detail="viewedCash"
      @close="closeViewedCash"
      @retry="viewCash"
    />
  </div>
</template>

<style scoped>
/* El ancho, el centrado y el padding de la página son `.ds-page--contained`
   (primitives.css); aquí sólo queda el tono de los botones de caja, que NO es
   el de la primitiva: `.ds-btn--solid` cae por defecto en `--amatista-700` y
   caja usa el escalón de encima. Sin esta línea los botones se oscurecen. */
.caja {
  --ds-btn-solid-bg: var(--amatista-600);
}

/* NO es `.ds-head`: la primitiva alinea al pie (`flex-end`), añade `gap: 16px`
   y deja 16px por debajo; esta cabecera alinea al centro y deja 20. */
.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

/* `.title-wrap` y su `h1` desaparecieron enteros: son `.ds-flex-row --12
   --accent` y `.ds-display --xs`. El titular gana además el `line-height` 1.05
   y el tracking de la familia display, que las 5 vistas de caja/compras no
   declaraban — es la normalización que buscaba la primitiva. */
.sub {
  margin: 2px 0 0;
  font-size: 13px;
  color: var(--warm-500);
}

.cash-tabs {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  margin-bottom: 20px;
  border-bottom: 1px solid var(--warm-200);
  overflow-x: auto;
  scrollbar-width: none;
}

.cash-tabs::-webkit-scrollbar {
  display: none;
}

.cash-tab {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
  margin: 0;
  padding: 11px 16px 12px;
  border: 0;
  background: transparent;
  color: var(--warm-500);
  font-family: var(--font-sans);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.cash-tab::after {
  position: absolute;
  right: 10px;
  bottom: -1px;
  left: 10px;
  height: 2px;
  border-radius: var(--radius-pill) 999px 0 0;
  background: transparent;
  content: '';
}

.cash-tab:hover {
  color: var(--warm-800);
}

.cash-tab.active {
  color: var(--amatista-700);
}

.cash-tab.active::after {
  background: var(--amatista-600);
}

.tab-count {
  min-width: 20px;
  padding: 1px 6px;
  border-radius: var(--radius-pill);
  background: var(--warm-100);
  color: var(--warm-600);
  font-size: 10.5px;
  line-height: 18px;
  text-align: center;
}

.cash-tab.active .tab-count {
  background: var(--amatista-100, #efe6f7);
  color: var(--amatista-700);
}

.tab-status {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #2f9d62;
  box-shadow: 0 0 0 3px rgb(47 157 98 / 12%);
}

@media (width <= 720px) {
  .caja {
    padding: 18px 14px;
  }
}
</style>
