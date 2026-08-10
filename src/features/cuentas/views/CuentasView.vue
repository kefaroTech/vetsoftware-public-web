<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Check, MapPin, Plus, Receipt, Search } from 'lucide-vue-next'
import PageHeader from '@/components/ui/PageHeader.vue'
import OpenAccountModal from '../components/OpenAccountModal.vue'
import AccountDetail from '../components/AccountDetail.vue'
import { useCuentas } from '../composables/useCuentas'
import { formatMoney } from '@/features/tienda/composables/pricing'
import {
  initials,
  formatDateShort,
} from '@/features/dashboard/views/consulta/nueva/composables/format'
import { animalApi } from '@/features/dashboard/views/consulta/nueva/api/animal.api'
import { useAuthorization } from '@/features/auth/composables/useAuthorization'
import { PERMISSIONS } from '@/constants/permissions'
import { useBranchStore } from '@/features/branches/stores/branch.store'
import {
  OPEN_ACCOUNT_STATUS_LABEL,
  type OpenAccountResponse,
  type OpenAccountStatus,
} from '../types/cuentas'

const store = useCuentas()
const branchStore = useBranchStore()
const { can } = useAuthorization()
const canCreate = can(PERMISSIONS.OPEN_ACCOUNT_CREATE)
const canVoidPayment = can(PERMISSIONS.DEBT_OPEN_ACCOUNT_VOID)
const canVoidCharge = can(PERMISSIONS.CHARGE_OPEN_ACCOUNT_VOID)

const query = ref('')
const tab = ref<'activas' | 'cerradas'>('activas')
const selected = ref<OpenAccountResponse | null>(null)
const ownerPets = ref<{ id: number; name: string }[]>([])

const openAccountOpen = ref(false)

/** Clase de tono para el pill de estado según el estado de la cuenta. */
const STATUS_TONE: Record<OpenAccountStatus, string> = {
  OPEN: 'open',
  CLOSE: 'closed',
  CANCEL: 'cancelled',
}

onMounted(() => store.reload())
watch(
  () => branchStore.selectedBranchId,
  () => {
    // Al soltar la selección se desmonta `AccountDetail`, y con él sus modales:
    // no hace falta cerrarlos uno a uno como antes.
    selected.value = null
    openAccountOpen.value = false
  },
)

// Activas = cuentas abiertas (OPEN); Cerradas = cobradas (CLOSE) o canceladas (CANCEL).
const activeAccounts = computed(() => store.accounts.value.filter((a) => a.status === 'OPEN'))
const closedAccounts = computed(() =>
  store.accounts.value
    .filter((a) => a.status !== 'OPEN')
    .slice()
    .sort((a, b) => (b.closedAt ?? b.createdDate).localeCompare(a.closedAt ?? a.createdDate)),
)
const visibleAccounts = computed(() =>
  tab.value === 'activas' ? activeAccounts.value : closedAccounts.value,
)

const isSearching = computed(() => query.value.trim().length > 0)

const filteredAccounts = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return visibleAccounts.value
  return visibleAccounts.value.filter(
    (a) =>
      a.owner.name.toLowerCase().includes(q) || (a.owner.document ?? '').toLowerCase().includes(q),
  )
})

// "Por cobrar" = saldo de cuentas OPEN únicamente. El outstandingAmount de una cuenta
// CANCEL es el monto dado de baja (pérdida), no algo cobrable; sumarlo aquí lo contaría
// mal. Cualquier total/reporte de cuentas por cobrar debe filtrar status === 'OPEN'.
const totalPending = computed(() =>
  activeAccounts.value.reduce((sum, a) => sum + a.outstandingAmount, 0),
)

/** Etiqueta del pill de estado en la tarjeta (CLOSE se muestra como "Pagada"). */
function cardStatusLabel(acc: OpenAccountResponse): string {
  return acc.status === 'CLOSE' ? 'Pagada' : OPEN_ACCOUNT_STATUS_LABEL[acc.status]
}

/** Etiqueta de la fila inferior: Saldo (abierta) / Cobrado (pagada) / Anulado (cancelada). */
function saldoLabel(acc: OpenAccountResponse): string {
  if (acc.status === 'CLOSE') return 'Cobrado'
  if (acc.status === 'CANCEL') return 'Anulado'
  return 'Saldo'
}

/** Monto de la fila inferior: total cobrado en cuentas pagadas, saldo pendiente en el resto. */
function saldoValue(acc: OpenAccountResponse): number {
  return acc.status === 'CLOSE' ? acc.totalAmount : acc.outstandingAmount
}

async function selectAccount(acc: OpenAccountResponse) {
  selected.value = acc
  ownerPets.value = []
  await store.loadDetail(acc.id)
  try {
    const animals = await animalApi.listByOwner(acc.owner.id)
    ownerPets.value = animals.map((a) => ({ id: a.id, name: a.name }))
  } catch {
    ownerPets.value = []
  }
}

function backToList() {
  selected.value = null
}

// ── Abrir cuenta ─────────────────────────────────────────────────────────────
function openCreateModal() {
  openAccountOpen.value = true
}

async function onAccountCreated(account: OpenAccountResponse) {
  openAccountOpen.value = false
  await selectAccount(account)
}
</script>

<template>
  <div class="ds-page">
    <PageHeader
      kicker="Facturación"
      title="Cuentas"
      lead="Cuentas a crédito administradas por sede. Los cargos se agrupan por mascota."
    >
      <template #action>
        <button
          v-if="canCreate && !selected && branchStore.selectedBranchId != null"
          type="button"
          class="ds-btn ds-btn--primary ds-btn--lg ds-btn--elevated ds-btn--nowrap"
          @click="openCreateModal"
        >
          <Plus :size="16" :stroke-width="1.8" /> Abrir cuenta
        </button>
      </template>
    </PageHeader>

    <div v-if="store.error.value" class="ds-banner ds-banner--error">{{ store.error.value }}</div>
    <div
      v-if="canCreate && !selected && branchStore.selectedBranchId == null"
      class="banner branch-warning"
    >
      <MapPin :size="15" :stroke-width="1.8" />
      Selecciona una sede para abrir o agregar cargos a una cuenta.
    </div>

    <!-- LISTA -->
    <template v-if="!selected">
      <div class="tabs" role="tablist">
        <button
          type="button"
          role="tab"
          :aria-selected="tab === 'activas'"
          :class="{ active: tab === 'activas' }"
          @click="tab = 'activas'"
        >
          <Receipt :size="15" :stroke-width="1.7" /> <span>Activas</span>
          <span v-if="activeAccounts.length > 0" class="tab-badge">{{
            activeAccounts.length
          }}</span>
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="tab === 'cerradas'"
          :class="{ active: tab === 'cerradas' }"
          @click="tab = 'cerradas'"
        >
          <Check :size="15" :stroke-width="1.7" /> <span>Cerradas</span>
          <span class="tab-badge muted">{{ closedAccounts.length }}</span>
        </button>
      </div>

      <div v-if="tab === 'activas' && activeAccounts.length > 0" class="alert">
        <Receipt :size="15" :stroke-width="1.8" />
        <span>
          <strong>{{ activeAccounts.length }}</strong>
          {{ activeAccounts.length === 1 ? 'cuenta abierta' : 'cuentas abiertas' }}
          · saldo acumulado pendiente <strong>{{ formatMoney(totalPending) }}</strong>
        </span>
      </div>

      <input
        v-model="query"
        type="text"
        class="search"
        placeholder="Buscar por propietario o documento…"
      />

      <div v-if="store.loading.value" class="state">Cargando…</div>
      <div
        v-else-if="filteredAccounts.length === 0 && isSearching && visibleAccounts.length > 0"
        class="empty-state"
      >
        <div class="empty-ic"><Search :size="28" :stroke-width="1.5" /></div>
        <div class="empty-title">Sin resultados</div>
        <p class="empty-desc">
          Ninguna cuenta {{ tab === 'activas' ? 'activa' : 'cerrada' }} coincide con tu búsqueda.
        </p>
      </div>
      <div v-else-if="filteredAccounts.length === 0" class="empty-state">
        <div class="empty-ic"><Receipt :size="28" :stroke-width="1.5" /></div>
        <div class="empty-title">
          {{ tab === 'activas' ? 'Sin cuentas activas' : 'Sin cuentas cerradas' }}
        </div>
        <p class="empty-desc">
          {{
            tab === 'activas'
              ? 'Abre una cuenta para acumular cargos.'
              : 'Las cuentas cobradas o canceladas aparecerán aquí.'
          }}
        </p>
      </div>
      <div v-else class="cards">
        <button
          v-for="acc in filteredAccounts"
          :key="acc.id"
          type="button"
          class="acct-card"
          @click="selectAccount(acc)"
        >
          <div class="acct-top">
            <div class="who">
              <span class="avatar">{{ initials(acc.owner.name) }}</span>
              <div class="who-text">
                <div class="name">{{ acc.owner.name }}</div>
                <div class="doc">{{ acc.owner.document }}</div>
              </div>
            </div>
            <span class="status-pill" :class="STATUS_TONE[acc.status]">{{
              cardStatusLabel(acc)
            }}</span>
          </div>
          <div class="acct-meta">
            <MapPin :size="13" :stroke-width="1.8" /> {{ acc.branch.name }}
            <span>· Cuenta desde {{ formatDateShort(acc.createdDate) }}</span>
          </div>
          <div class="acct-totals">
            <div class="row">
              <span>Acumulado</span><strong>{{ formatMoney(acc.totalAmount) }}</strong>
            </div>
            <div v-if="acc.paidAmount > 0" class="row">
              <span>Abonado</span><strong>{{ formatMoney(acc.paidAmount) }}</strong>
            </div>
            <div class="row saldo">
              <span>{{ saldoLabel(acc) }}</span>
              <strong :class="{ zero: saldoValue(acc) <= 0 }">{{
                formatMoney(saldoValue(acc))
              }}</strong>
            </div>
          </div>
        </button>
      </div>
    </template>

    <!-- DETALLE -->
    <AccountDetail
      v-else
      :account="selected"
      :can-void-charge="canVoidCharge"
      :can-void-payment="canVoidPayment"
      :owner-pets="ownerPets"
      @back="backToList"
      @updated="selected = $event"
    />

    <!-- ABRIR CUENTA -->
    <OpenAccountModal
      :open="openAccountOpen"
      @close="openAccountOpen = false"
      @created="onAccountCreated"
    />
  </div>
</template>

<style scoped>
/* El contenedor y los botones usan `.ds-page` / `.ds-btn` (primitives.css). */

/* El banner de error usa `.ds-banner--error` (primitives.css). Este otro tiene
   tonos propios (hue 70/80 distintos a los del sistema) y se deja como está. */
.banner.branch-warning {
  display: flex;
  align-items: center;
  gap: 8px;
  background: oklch(96% 0.04 80deg);
  border: 1px solid oklch(88% 0.08 80deg);
  color: oklch(42% 0.09 70deg);
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13px;
  margin-bottom: 14px;
}

/* Tabs Activas / Cerradas */
.tabs {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid var(--warm-200);
  margin-bottom: 16px;
}

.tabs button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: inherit;
  font-size: 13.5px;
  font-weight: 500;
  color: var(--warm-600);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  padding: 10px 16px;
  margin-bottom: -1px;
  cursor: pointer;
  transition:
    color 0.12s ease,
    border-color 0.12s ease;
}
.tabs button:hover {
  color: var(--warm-900);
}
.tabs button.active {
  color: var(--amatista-700);
  border-bottom-color: var(--amatista-600);
}

.tab-badge {
  min-width: 20px;
  height: 20px;
  padding: 0 7px;
  border-radius: 10px;
  background: var(--amatista-600);
  color: white;
  font-size: 11px;
  font-weight: 600;
  display: grid;
  place-items: center;
  font-variant-numeric: tabular-nums;
}
.tab-badge.muted {
  background: var(--warm-200);
  color: var(--warm-600);
}

/* Estado vacío por tab */
.empty-state {
  padding: 56px 20px;
  text-align: center;
  background: var(--warm-50);
  border: 1px dashed var(--warm-300);
  border-radius: 14px;
}
.empty-ic {
  width: 60px;
  height: 60px;
  border-radius: 16px;
  background: var(--amatista-50);
  color: var(--amatista-700);
  display: grid;
  place-items: center;
  margin: 0 auto 14px;
}
.empty-title {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 4px;
}
.empty-desc {
  font-size: 13px;
  color: var(--warm-600);
  margin: 0;
}
.alert {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 11px 14px;
  margin-bottom: 16px;
  background: var(--warning-50);
  border: 1px solid var(--warning-200);
  border-radius: 10px;
  font-size: 13px;
  color: oklch(40% 0.1 70deg);
}
.alert strong {
  color: oklch(35% 0.13 70deg);
}

.search {
  width: 100%;
  max-width: 360px;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 10px;
  padding: 10px 14px;
  font-family: inherit;
  font-size: 13.5px;
  color: var(--warm-900);
  outline: none;
  margin-bottom: 16px;
}
.search:focus {
  border-color: var(--amatista-500);
  box-shadow: var(--ring);
}
.state {
  padding: 32px 16px;
  text-align: center;
  font-size: 13px;
  color: var(--warm-500);
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 12px;
}

/* Tarjetas de lista */
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 14px;
}

.acct-card {
  text-align: left;
  font-family: inherit;
  cursor: pointer;
  padding: 16px;
  border-radius: 14px;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  display: flex;
  flex-direction: column;
  gap: 11px;
  transition:
    border-color 0.12s,
    box-shadow 0.12s;
}
.acct-card:hover {
  border-color: var(--amatista-300);
  box-shadow: 0 4px 14px -8px rgb(20 15 30 / 18%);
}
.acct-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}
.who-text {
  min-width: 0;
}
.acct-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
  font-size: 12px;
  color: var(--warm-500);
}
.acct-totals {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: 11px;
  border-top: 1px solid var(--warm-150);
}
.acct-totals .row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12.5px;
  color: var(--warm-600);
}
.acct-totals .row strong {
  color: var(--warm-900);
  font-variant-numeric: tabular-nums;
}
.acct-totals .row.saldo {
  font-size: 14px;
  padding-top: 5px;
  margin-top: 2px;
  border-top: 1px dashed var(--warm-200);
}
.acct-totals .row.saldo strong {
  color: oklch(45% 0.13 70deg);
  font-size: 15px;
}
.acct-totals .row.saldo strong.zero {
  color: var(--success-fg);
}

/* Detalle */
.back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  background: transparent;
  border: none;
  color: var(--amatista-700);
  padding: 4px 0;
  margin-bottom: 14px;
}

/* Cargo anulado: queda visible, atenuado y tachado en concepto + monto. */
.charge.voided .c-concept {
  color: var(--warm-500);
}

/* Abono anulado: queda visible, atenuado y tachado en el monto. */
.pago.voided {
  background: oklch(96% 0.02 25deg);
}
</style>
