<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Wallet,
  Plus,
  LockKeyhole,
  ArrowLeftRight,
  FileDown,
  History,
  Filter,
  RotateCcw,
} from 'lucide-vue-next'
import {
  useCaja,
  formatMoney,
  methodLabel,
  movementTypeLabel,
  isInflow,
} from '../composables/useCaja'
import { useAuthorization } from '@/features/auth/composables/useAuthorization'
import { useAuth } from '@/features/auth/composables/useAuth'
import { useBranchStore } from '@/features/branches/stores/branch.store'
import { PERMISSIONS } from '@/constants/permissions'
import OpenCashModal from '../components/OpenCashModal.vue'
import CashMovementModal from '../components/CashMovementModal.vue'
import CloseCashModal from '../components/CloseCashModal.vue'
import Pagination from '@/features/acciones/components/Pagination.vue'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import { cashSessionApi } from '../api/cashSession.api'
import { employeeApi, type EmployeeResponse } from '@/features/employees/api/employee.api'
import { getProblemDetailMessage } from '@/services/http/http.client'
import type { CashSessionView } from '../types/caja'
import DateInput from '@/features/dashboard/components/ui/DateInput.vue'

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

const openedAt = computed(() => current.value && formatDateTime(current.value.openedAt))

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
}

function formatDuration(openedAt: string, closedAt: string | null): string {
  const start = new Date(openedAt).getTime()
  const end = closedAt ? new Date(closedAt).getTime() : Date.now()
  const minutes = Math.max(0, Math.floor((end - start) / 60_000))

  if (minutes < 60) return minutes + ' min'

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (hours < 24) return hours + ' h' + (remainingMinutes ? ' ' + remainingMinutes + ' min' : '')

  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  return days + ' d' + (remainingHours ? ' ' + remainingHours + ' h' : '')
}

function employeeLabel(employeeName: string | null, employeeId: number | null): string {
  if (employeeName?.trim()) return employeeName
  return employeeId == null ? '—' : 'Empleado #' + employeeId
}

function branchLabel(branchName: string | null, branchId: number): string {
  return branchName?.trim() || 'Sede #' + branchId
}

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
  <div class="caja">
    <header class="page-head">
      <div class="title-wrap">
        <Wallet :size="22" :stroke-width="1.7" />
        <div>
          <h1>Caja</h1>
          <p class="sub">Control de efectivo y arqueo por sede</p>
        </div>
      </div>
      <div v-if="!isOpen && canOpenCash" class="head-actions">
        <button type="button" class="btn primary" @click="openModal = true">
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

    <section v-if="activeTab === 'open'" class="open-overview">
      <div class="history-head">
        <h2 class="section-title">Cajas abiertas visibles</h2>
        <span class="history-count">
          {{ openSessions.length }}
          {{ openSessions.length === 1 ? 'caja abierta' : 'cajas abiertas' }}
        </span>
      </div>
      <div class="table-scroll">
        <table class="movs open-table">
          <thead>
            <tr>
              <th>Sede</th>
              <th>Terminal</th>
              <th>Apertura</th>
              <th>Duración</th>
              <th>Abrió</th>
              <th class="num">Base</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="openSessionsLoading">
              <td colspan="7" class="empty-row">Cargando cajas abiertas…</td>
            </tr>
            <tr v-else-if="openSessions.length === 0">
              <td colspan="7" class="empty-row">No hay cajas abiertas en las sedes visibles.</td>
            </tr>
            <tr v-for="session in openSessions" v-else :key="session.id">
              <td class="branch-name">{{ branchLabel(session.branchName, session.branchId) }}</td>
              <td>{{ session.terminal }}</td>
              <td>{{ formatDateTime(session.openedAt) }}</td>
              <td class="duration">{{ formatDuration(session.openedAt, null) }}</td>
              <td class="employee">
                {{ employeeLabel(session.openedByEmployeeName, session.openedByEmployeeId) }}
              </td>
              <td class="num">{{ formatMoney(session.openingFloat) }}</td>
              <td>
                <button type="button" class="link" @click="openCashSession(session)">
                  {{ session.id === myOpenSession?.id ? 'Ver mi caja' : 'Ver caja' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Solo existe cuando el usuario autenticado tiene una caja OPEN. -->
    <section v-if="myOpenSession && activeTab === 'mine'" class="my-cash my-cash--detail">
      <!-- Detalle y acciones de la caja abierta del usuario autenticado. -->
      <div v-if="isOpen && current && current.id === myOpenSession.id" class="my-cash-detail">
        <header class="detail-page-head">
          <div class="detail-title-wrap">
            <div>
              <span class="detail-eyebrow">Mi caja abierta</span>
              <h1>{{ branchLabel(myOpenSession.branchName, myOpenSession.branchId) }}</h1>
              <p>Terminal {{ current.terminal }}</p>
            </div>
            <span class="pill open">Abierta</span>
          </div>
        </header>

        <div class="panel-head">
          <div>
            <span class="opened">Desde {{ openedAt }} · terminal {{ current.terminal }}</span>
          </div>
          <div class="panel-actions">
            <button v-if="canOperate" type="button" class="btn ghost" @click="movementModal = true">
              <ArrowLeftRight :size="15" :stroke-width="1.7" /> Ingreso / Retiro / Gasto
            </button>
            <button
              v-if="canCloseCurrentSession"
              type="button"
              class="btn primary"
              @click="closeModal = true"
            >
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

        <h3 class="movement-title">Movimientos</h3>
        <div class="table-scroll">
          <table class="movs movements-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Medio</th>
                <th class="num">Monto</th>
                <th>Referencia</th>
                <th>Nota</th>
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
        </div>
      </div>

      <div v-else class="detail-loading">
        <p>Cargando información de la caja…</p>
      </div>
    </section>

    <!-- Historial de cierres -->
    <section v-if="canReadHistory && activeTab === 'history'" class="history">
      <div class="history-head">
        <h2 class="section-title"><History :size="16" :stroke-width="1.7" /> Historial de cajas</h2>
        <span class="history-count"
          >{{ historyTotal }} {{ historyTotal === 1 ? 'sesión' : 'sesiones' }}</span
        >
      </div>
      <form class="history-filters" @submit.prevent="applyHistoryFilters">
        <label class="filter-field">
          <span>Sede</span>
          <select v-model="historyBranchId" :disabled="historyLoading">
            <option :value="null">Todas las sedes asignadas</option>
            <option v-for="branch in historyBranchOptions" :key="branch.id" :value="branch.id">
              {{ branch.name }}{{ branch.active ? '' : ' (inactiva)' }}
            </option>
          </select>
        </label>
        <label class="filter-field">
          <span>Empleado que abrió</span>
          <select v-model="historyEmployeeId" :disabled="historyLoading || historyEmployeesLoading">
            <option :value="null">
              {{ historyEmployeesLoading ? 'Cargando empleados…' : 'Todos los empleados' }}
            </option>
            <option
              v-for="employee in historyEmployeeOptions"
              :key="employee.id"
              :value="employee.id"
            >
              {{ employee.name }}{{ employee.enabled ? '' : ' (inactivo)' }}
            </option>
          </select>
        </label>
        <label class="filter-field date-field">
          <span>Desde</span>
          <DateInput
            id="cash-history-from"
            v-model="historyFrom"
            placeholder="Fecha inicial"
            :max="historyTo || undefined"
            :disabled="historyLoading"
          />
        </label>
        <label class="filter-field date-field">
          <span>Hasta</span>
          <DateInput
            id="cash-history-to"
            v-model="historyTo"
            placeholder="Fecha final"
            :min="historyFrom || undefined"
            :disabled="historyLoading"
          />
        </label>
        <div class="filter-actions">
          <button type="submit" class="btn primary" :disabled="historyLoading">
            <Filter :size="14" :stroke-width="1.8" /> Filtrar
          </button>
          <button
            type="button"
            class="btn ghost"
            :disabled="historyLoading"
            @click="clearHistoryFilters"
          >
            <RotateCcw :size="14" :stroke-width="1.8" /> Limpiar
          </button>
        </div>
      </form>
      <div class="table-scroll">
        <table class="movs history-table">
          <thead>
            <tr>
              <th>Sede</th>
              <th>Apertura</th>
              <th>Cierre</th>
              <th>Duración</th>
              <th>Terminal</th>
              <th>Abrió</th>
              <th>Cerró</th>
              <th>Estado</th>
              <th class="num">Base</th>
              <th class="num">Total cierre</th>
              <th class="num">Arqueo</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="historyLoading">
              <td colspan="11" class="empty-row">Cargando historial…</td>
            </tr>
            <tr v-else-if="history.length === 0">
              <td colspan="11" class="empty-row">Sin sesiones registradas.</td>
            </tr>
            <tr v-for="s in history" v-else :key="s.id">
              <td class="branch-name">{{ branchLabel(s.branchName, s.branchId) }}</td>
              <td>{{ formatDateTime(s.openedAt) }}</td>
              <td>{{ s.closedAt ? formatDateTime(s.closedAt) : '—' }}</td>
              <td class="duration">{{ formatDuration(s.openedAt, s.closedAt) }}</td>
              <td>{{ s.terminal }}</td>
              <td class="employee">
                {{ employeeLabel(s.openedByEmployeeName, s.openedByEmployeeId) }}
              </td>
              <td class="employee">
                {{ employeeLabel(s.closedByEmployeeName, s.closedByEmployeeId) }}
              </td>
              <td>
                <span class="pill" :class="s.status === 'OPEN' ? 'open' : 'closed'">
                  {{ s.status === 'OPEN' ? 'Abierta' : 'Cerrada' }}
                </span>
              </td>
              <td class="num">{{ formatMoney(s.openingFloat) }}</td>
              <td class="num">
                {{ s.closingTotal == null ? '—' : formatMoney(s.closingTotal) }}
              </td>
              <td class="num actions-cell">
                <button
                  type="button"
                  class="link"
                  :aria-label="'Descargar arqueo CSV de la sesión ' + s.id"
                  title="Descargar CSV"
                  @click="exportArqueo(s.id, 'csv')"
                >
                  CSV
                </button>
                <button
                  type="button"
                  class="link"
                  :aria-label="'Descargar arqueo PDF de la sesión ' + s.id"
                  title="Descargar PDF"
                  @click="exportArqueo(s.id, 'pdf')"
                >
                  <FileDown :size="13" :stroke-width="1.8" /> PDF
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <Pagination
        :page="historyPage"
        :page-count="historyTotalPages"
        :total="historyTotal"
        :page-size="historyPageSize"
        @update:page="setHistoryPage"
      />
    </section>

    <OpenCashModal :open="openModal" @close="closeOpenModal" @saved="handleOpenCashSaved" />
    <CashMovementModal
      :open="movementModal"
      @close="movementModal = false"
      @saved="loadCurrent(true)"
    />
    <CloseCashModal :open="closeModal" @close="closeModal = false" @closed="refreshAll" />

    <ModalShell
      :open="viewedCashOpen"
      title="Detalle de caja"
      :subtitle="
        viewedCashSummary
          ? branchLabel(viewedCashSummary.branchName, viewedCashSummary.branchId) +
            ' · Terminal ' +
            viewedCashSummary.terminal
          : undefined
      "
      :icon="Wallet"
      :width-vw="86"
      :height-vh="88"
      @close="closeViewedCash"
    >
      <template #body>
        <div v-if="viewedCashLoading" class="cash-detail-state">Cargando detalle de la caja…</div>

        <div v-else-if="viewedCashError" class="cash-detail-state error">
          <p>{{ viewedCashError }}</p>
          <button
            v-if="viewedCashSummary"
            type="button"
            class="btn ghost"
            @click="viewCash(viewedCashSummary)"
          >
            Reintentar
          </button>
        </div>

        <div v-else-if="viewedCash && viewedCashSummary" class="cash-detail">
          <div class="cash-detail-grid">
            <div class="cash-detail-field">
              <span class="cash-detail-label">Sede</span>
              <strong>{{ branchLabel(viewedCashSummary.branchName, viewedCash.branchId) }}</strong>
            </div>
            <div class="cash-detail-field">
              <span class="cash-detail-label">Terminal</span>
              <strong>{{ viewedCash.terminal }}</strong>
            </div>
            <div class="cash-detail-field">
              <span class="cash-detail-label">Estado</span>
              <span class="pill" :class="viewedCash.status === 'OPEN' ? 'open' : 'closed'">
                {{ viewedCash.status === 'OPEN' ? 'Abierta' : 'Cerrada' }}
              </span>
            </div>
            <div class="cash-detail-field">
              <span class="cash-detail-label">Responsable</span>
              <strong>
                {{
                  employeeLabel(
                    viewedCashSummary.openedByEmployeeName,
                    viewedCash.openedByEmployeeId,
                  )
                }}
              </strong>
            </div>
            <div class="cash-detail-field">
              <span class="cash-detail-label">Apertura</span>
              <strong>{{ formatDateTime(viewedCash.openedAt) }}</strong>
            </div>
            <div class="cash-detail-field">
              <span class="cash-detail-label">Tiempo abierta</span>
              <strong>{{ formatDuration(viewedCash.openedAt, viewedCash.closedAt) }}</strong>
            </div>
          </div>

          <h3 class="cash-detail-section-title">Dinero esperado</h3>
          <div class="totals cash-detail-totals">
            <div class="total-card base">
              <span class="lbl">Base inicial</span>
              <span class="val">{{ formatMoney(viewedCash.openingFloat) }}</span>
            </div>
            <div v-for="total in viewedCash.totals" :key="total.method" class="total-card">
              <span class="lbl">{{ methodLabel(total.method) }}</span>
              <span class="val">{{ formatMoney(total.expectedAmount) }}</span>
            </div>
          </div>

          <h3 class="cash-detail-section-title">Movimientos</h3>
          <div class="table-scroll">
            <table class="movs movements-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Medio</th>
                  <th class="num">Monto</th>
                  <th>Referencia</th>
                  <th>Nota</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="viewedCash.movements.length === 0">
                  <td colspan="6" class="empty-row">Esta caja aún no tiene movimientos.</td>
                </tr>
                <tr
                  v-for="movement in viewedCash.movements"
                  :key="movement.id ?? movement.createdAt + movement.type + movement.method"
                >
                  <td>{{ formatDateTime(movement.createdAt) }}</td>
                  <td>{{ movementTypeLabel(movement.type) }}</td>
                  <td>{{ methodLabel(movement.method) }}</td>
                  <td class="num" :class="isInflow(movement.type) ? 'pos' : 'neg'">
                    {{ isInflow(movement.type) ? '+' : '−' }}{{ formatMoney(movement.amount) }}
                  </td>
                  <td>
                    {{
                      movement.referenceId
                        ? movement.referenceType + ' #' + movement.referenceId
                        : '—'
                    }}
                  </td>
                  <td>{{ movement.note ?? '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>

      <template #footer-actions>
        <button type="button" class="btn ghost" @click="closeViewedCash">Cerrar</button>
      </template>
    </ModalShell>
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
  border-radius: 999px 999px 0 0;
  background: transparent;
  content: '';
}

.cash-tab:hover {
  color: var(--warm-800);
}

.cash-tab.active {
  color: var(--amatista-700, #5c2d8c);
}

.cash-tab.active::after {
  background: var(--amatista-600, #5c2d8c);
}

.tab-count {
  min-width: 20px;
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--warm-100);
  color: var(--warm-600);
  font-size: 10.5px;
  line-height: 18px;
  text-align: center;
}

.cash-tab.active .tab-count {
  background: var(--amatista-100, #efe6f7);
  color: var(--amatista-700, #5c2d8c);
}

.tab-status {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #2f9d62;
  box-shadow: 0 0 0 3px rgb(47 157 98 / 12%);
}

.open-overview,
.my-cash {
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 16px;
  padding: 18px 22px;
}

.open-overview {
  margin-bottom: 20px;
}

.my-cash {
  margin-bottom: 26px;
}

.my-cash--detail {
  margin: 0;
  padding: 0;
  background: transparent;
  border: 0;
  border-radius: 0;
}

.open-table {
  min-width: 850px;
}

.branch-name {
  color: var(--warm-800);
  font-weight: 600;
  white-space: nowrap;
}

.my-cash-detail {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--warm-200);
}

.my-cash--detail .my-cash-detail {
  margin: 0;
  padding: 0;
  border: 0;
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
  color: var(--amatista-700, #5c2d8c);
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

.cash-detail-state {
  min-height: 220px;
  display: grid;
  place-content: center;
  gap: 12px;
  color: var(--warm-500);
  text-align: center;
}

.cash-detail-state.error {
  color: #b4453a;
}

.cash-detail-state p {
  margin: 0;
}

.cash-detail {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

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
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 5px;
  color: var(--warm-800);
  font-size: 13px;
}

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
  font-family: var(--font-serif);
  font-size: 16px;
  font-weight: 400;
}

.cash-detail-totals {
  margin-bottom: 0;
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
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 600;
}

.pill.open {
  background: oklch(92% 0.08 150deg);
  color: oklch(40% 0.12 150deg);
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

.movement-title {
  margin: 8px 0 10px;
  font-family: var(--font-serif);
  font-size: 15px;
  font-weight: 400;
  color: var(--warm-800);
}

.movements-table {
  min-width: 760px;
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

.history-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.history-count {
  color: var(--warm-500);
  font-size: 12px;
}

.history-filters {
  display: grid;
  grid-template-columns: minmax(160px, 1fr) minmax(190px, 1.2fr) 170px 170px auto;
  align-items: end;
  gap: 10px;
  margin: 12px 0 16px;
  padding: 14px;
  border: 1px solid var(--warm-200);
  border-radius: 12px;
  background: var(--warm-100);
}

.filter-field {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 6px;
}

.filter-field > span {
  color: var(--warm-500);
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.filter-field select {
  width: 100%;
  height: 38px;
  padding: 0 32px 0 11px;
  border: 1px solid var(--warm-200);
  border-radius: 8px;
  outline: none;
  background: var(--warm-50);
  color: var(--warm-800);
  font: inherit;
  font-size: 12.5px;
}

.filter-field select:focus {
  border-color: var(--amatista-500, #76519d);
  box-shadow: 0 0 0 3px rgb(92 45 140 / 10%);
}

.filter-field select:disabled {
  cursor: wait;
  opacity: 0.65;
}

.date-field :deep(.date-wrap) {
  min-width: 0;
}

.filter-actions {
  display: flex;
  gap: 7px;
}

.table-scroll {
  width: 100%;
  overflow-x: auto;
  scrollbar-width: thin;
}

.history-table {
  min-width: 1180px;
}

.duration,
.employee {
  white-space: nowrap;
}

.duration {
  color: var(--warm-600);
  font-variant-numeric: tabular-nums;
}

.employee {
  color: var(--warm-600);
  font-size: 12px;
}

.actions-cell {
  white-space: nowrap;
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

.btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

@media (width <= 1100px) {
  .history-filters {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .filter-actions {
    grid-column: 1 / -1;
  }
}

@media (width <= 720px) {
  .caja {
    padding: 18px 14px;
  }

  .history,
  .my-cash,
  .open-overview {
    padding: 16px;
  }

  .cash-detail-grid {
    grid-template-columns: 1fr;
  }

  .history-filters {
    grid-template-columns: 1fr;
  }

  .filter-actions {
    grid-column: auto;
    flex-wrap: wrap;
  }
}
</style>
