<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  ArrowLeft,
  Ban,
  Check,
  CreditCard,
  FileText,
  Lock,
  Package,
  Plus,
  Receipt,
  Search,
  Stethoscope,
  Wallet,
} from 'lucide-vue-next'
import PageHeader from '@/components/ui/PageHeader.vue'
import OpenAccountModal from '../components/OpenAccountModal.vue'
import AddChargeModal from '../components/AddChargeModal.vue'
import PaymentModal from '../components/PaymentModal.vue'
import CloseAccountModal from '../components/CloseAccountModal.vue'
import VoidPaymentModal from '../components/VoidPaymentModal.vue'
import VoidChargeModal from '../components/VoidChargeModal.vue'
import { useCuentas } from '../composables/useCuentas'
import { formatMoney } from '@/features/tienda/composables/pricing'
import {
  initials,
  formatDateShort,
} from '@/features/dashboard/views/consulta/nueva/composables/format'
import { animalApi } from '@/features/dashboard/views/consulta/nueva/api/animal.api'
import { useAuthorization } from '@/features/auth/composables/useAuthorization'
import { PERMISSIONS } from '@/constants/permissions'
import {
  OPEN_ACCOUNT_STATUS_LABEL,
  PAYMENT_METHOD_LABEL,
  type ChargeKind,
  type DebtResponse,
  type OpenAccountResponse,
  type OpenAccountStatus,
  type UnifiedCharge,
} from '../types/cuentas'

const store = useCuentas()
const { can } = useAuthorization()
const canCreate = can(PERMISSIONS.OPEN_ACCOUNT_CREATE)
const canVoidPayment = can(PERMISSIONS.DEBT_OPEN_ACCOUNT_VOID)
const canVoidCharge = can(PERMISSIONS.CHARGE_OPEN_ACCOUNT_VOID)

const query = ref('')
const tab = ref<'activas' | 'cerradas'>('activas')
const selected = ref<OpenAccountResponse | null>(null)
const ownerPets = ref<{ id: number; name: string }[]>([])

const openAccountOpen = ref(false)
const addChargeOpen = ref(false)
const paymentOpen = ref(false)
const closeOpen = ref(false)
const voidOpen = ref(false)
const paymentToVoid = ref<DebtResponse | null>(null)
const voidChargeOpen = ref(false)
const chargeToVoid = ref<UnifiedCharge | null>(null)

/** Clase de tono para el pill de estado según el estado de la cuenta. */
const STATUS_TONE: Record<OpenAccountStatus, string> = {
  OPEN: 'open',
  CLOSE: 'closed',
  CANCEL: 'cancelled',
}

onMounted(() => store.reload())

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
    (a) => a.owner.name.toLowerCase().includes(q) || (a.owner.document ?? '').toLowerCase().includes(q),
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

/** Una cuenta cerrada o cancelada es de solo lectura: no admite cambios. */
const isReadOnly = computed(() => !!selected.value && selected.value.status !== 'OPEN')

/** Línea de meta del detalle: "cuenta abierta {fecha}" o "cerrada/cancelada el X por Y · motivo". */
const detailMeta = computed(() => {
  const a = selected.value
  if (!a) return ''
  if (a.status === 'OPEN') return `cuenta abierta ${formatDateShort(a.createdDate)}`
  const verbo = a.status === 'CANCEL' ? 'cancelada' : 'cerrada'
  const fecha = formatDateShort((a.closedAt ?? a.createdDate).slice(0, 10))
  const quien = a.closedBy?.name ? ` por ${a.closedBy.name}` : ''
  const motivo = a.closeReason ? ` · ${a.closeReason}` : ''
  return `${verbo} el ${fecha}${quien}${motivo}`
})

const CHARGE_ICON: Record<ChargeKind, typeof Package> = {
  product: Package,
  service: Stethoscope,
  general: Receipt,
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

async function refreshSelected() {
  if (!selected.value) return
  await store.refreshAccount(selected.value.id)
  selected.value = store.accounts.value.find((a) => a.id === selected.value!.id) ?? selected.value
}

// ── Abrir cuenta ─────────────────────────────────────────────────────────────
function openCreateModal() {
  openAccountOpen.value = true
}

async function onAccountCreated(account: OpenAccountResponse) {
  openAccountOpen.value = false
  await selectAccount(account)
}

// ── Cerrar cuenta ────────────────────────────────────────────────────────────
async function onAccountClosed(account: OpenAccountResponse) {
  closeOpen.value = false
  // Reflejar el nuevo estado en el detalle y la lista (pill + acciones read-only).
  selected.value = account
  await store.loadDetail(account.id)
}

// ── Anular abono ─────────────────────────────────────────────────────────────
function onVoidPayment(p: DebtResponse) {
  if (isReadOnly.value || !canVoidPayment) return
  paymentToVoid.value = p
  voidOpen.value = true
}

async function onPaymentVoided() {
  voidOpen.value = false
  paymentToVoid.value = null
  await refreshSelected()
}

// ── Anular cargo ─────────────────────────────────────────────────────────────
function onVoidCharge(c: UnifiedCharge) {
  if (isReadOnly.value || !canVoidCharge || c.voided) return
  chargeToVoid.value = c
  voidChargeOpen.value = true
}

async function onChargeVoided() {
  voidChargeOpen.value = false
  chargeToVoid.value = null
  await refreshSelected()
}
</script>

<template>
  <div class="page">
    <PageHeader
      kicker="Facturación"
      title="Cuentas"
      lead="Cuentas a crédito por propietario. Los cargos se agrupan por mascota."
    >
      <template #action>
        <button v-if="canCreate && !selected" type="button" class="cta" @click="openCreateModal">
          <Plus :size="16" :stroke-width="1.8" /> Abrir cuenta
        </button>
      </template>
    </PageHeader>

    <div v-if="store.error.value" class="banner error">{{ store.error.value }}</div>

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
          <span v-if="activeAccounts.length > 0" class="tab-badge">{{ activeAccounts.length }}</span>
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

      <input v-model="query" type="text" class="search" placeholder="Buscar por propietario o documento…" />

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
            <span class="status-pill" :class="STATUS_TONE[acc.status]">{{ cardStatusLabel(acc) }}</span>
          </div>
          <div class="acct-meta">Cuenta desde {{ formatDateShort(acc.createdDate) }}</div>
          <div class="acct-totals">
            <div class="row"><span>Acumulado</span><strong>{{ formatMoney(acc.totalAmount) }}</strong></div>
            <div v-if="acc.paidAmount > 0" class="row"><span>Abonado</span><strong>{{ formatMoney(acc.paidAmount) }}</strong></div>
            <div class="row saldo">
              <span>{{ saldoLabel(acc) }}</span>
              <strong :class="{ zero: saldoValue(acc) <= 0 }">{{ formatMoney(saldoValue(acc)) }}</strong>
            </div>
          </div>
        </button>
      </div>
    </template>

    <!-- DETALLE -->
    <template v-else>
      <button type="button" class="back" @click="backToList">
        <ArrowLeft :size="14" :stroke-width="1.8" /> Volver a cuentas
      </button>

      <div class="detail-head">
        <div class="who">
          <span class="avatar lg">{{ initials(selected.owner.name) }}</span>
          <div>
            <div class="name-row">
              <h1 class="name lg">{{ selected.owner.name }}</h1>
              <span class="status-pill" :class="STATUS_TONE[selected.status]">{{ OPEN_ACCOUNT_STATUS_LABEL[selected.status] }}</span>
            </div>
            <div class="detail-meta">
              {{ selected.owner.document }} · {{ detailMeta }}
            </div>
          </div>
        </div>
        <div v-if="selected.status === 'OPEN'" class="detail-actions">
          <button type="button" class="cta" @click="addChargeOpen = true">
            <Plus :size="15" :stroke-width="1.8" /> Agregar cargo
          </button>
          <button
            type="button"
            class="ghost-cta"
            :disabled="selected.outstandingAmount <= 0"
            @click="paymentOpen = true"
          >
            <CreditCard :size="15" :stroke-width="1.8" /> Registrar abono
          </button>
          <button type="button" class="ghost-cta" @click="closeOpen = true">
            <Lock :size="15" :stroke-width="1.8" /> Cerrar cuenta
          </button>
        </div>
      </div>

      <div v-if="isReadOnly" class="readonly-note">
        <Lock :size="15" :stroke-width="1.8" />
        <span>
          Cuenta {{ selected.status === 'CANCEL' ? 'cancelada' : 'cerrada' }} · solo lectura.
          No admite nuevos cargos ni abonos.
        </span>
      </div>

      <div class="summary">
        <div class="sum-box">
          <span class="sum-lab">Acumulado</span>
          <span class="sum-val">{{ formatMoney(selected.totalAmount) }}</span>
        </div>
        <div class="sum-box">
          <span class="sum-lab">Abonado</span>
          <span class="sum-val">{{ formatMoney(selected.paidAmount) }}</span>
        </div>
        <div class="sum-box alert">
          <span class="sum-lab">Saldo pendiente</span>
          <span class="sum-val">{{ formatMoney(selected.outstandingAmount) }}</span>
        </div>
      </div>

      <div v-if="store.detailLoading.value" class="state">Cargando cargos…</div>
      <div v-else class="cols">
        <!-- Cargos por mascota -->
        <section class="col">
          <div class="section-head">
            <span class="sh-title"><FileText :size="16" :stroke-width="1.7" /> Cargos por mascota</span>
          </div>

          <div v-if="store.charges.value.length === 0" class="mini-empty">Sin cargos todavía.</div>
          <div v-for="group in store.chargesByPet.value" v-else :key="group.key" class="group">
            <div class="group-head">
              <span class="group-id">
                <span class="pet-avatar" :class="{ general: group.key === 'general' }">
                  <Package v-if="group.key === 'general'" :size="13" :stroke-width="1.8" />
                  <template v-else>{{ group.name.slice(0, 2).toUpperCase() }}</template>
                </span>
                <span class="group-name">{{ group.name }}</span>
              </span>
              <span class="group-sub">{{ formatMoney(group.subtotal) }}</span>
            </div>
            <ul class="charge-list">
              <li
                v-for="c in group.charges"
                :key="`${c.kind}-${c.id}`"
                class="charge"
                :class="{ voided: c.voided }"
              >
                <component :is="CHARGE_ICON[c.kind]" :size="14" :stroke-width="1.7" class="c-icon" :class="c.kind" />
                <span class="c-concept">
                  {{ c.concept }}<span v-if="c.quantity > 1" class="c-qty">x{{ c.quantity }}</span>
                  <span v-if="c.voided" class="c-void" :title="c.voidReason ? `Motivo: ${c.voidReason}` : ''">
                    Anulado{{ c.voidedByName ? ` por ${c.voidedByName}` : '' }}
                  </span>
                </span>
                <span v-if="c.createdByName" class="c-by" :title="`Registrado por ${c.createdByName}`">{{ c.createdByName }}</span>
                <span class="c-date">{{ c.date.slice(5, 10) }}</span>
                <span class="c-amount">{{ formatMoney(c.amount) }}</span>
                <button
                  v-if="!isReadOnly && !c.voided && canVoidCharge"
                  type="button"
                  class="c-void-btn"
                  title="Anular cargo"
                  @click="onVoidCharge(c)"
                >
                  <Ban :size="13" :stroke-width="1.9" />
                </button>
                <Ban v-else-if="c.voided" :size="14" :stroke-width="1.9" class="c-banned" />
              </li>
            </ul>
          </div>
        </section>

        <!-- Abonos -->
        <section class="col">
          <div class="section-head">
            <span class="sh-title"><Wallet :size="16" :stroke-width="1.7" /> Abonos</span>
          </div>
          <div v-if="store.payments.value.length === 0" class="mini-empty">Sin abonos registrados.</div>
          <ul v-else class="pago-list">
            <li v-for="p in store.payments.value" :key="p.id" class="pago" :class="{ voided: p.voided }">
              <div class="pago-info">
                <span class="pago-amt">{{ formatMoney(p.amount) }}</span>
                <span class="pago-meta">
                  {{ p.createdDate.slice(0, 10) }} · {{ PAYMENT_METHOD_LABEL[p.paymentMethod] }}
                  <template v-if="p.createdBy?.name"> · {{ p.createdBy.name }}</template>
                </span>
                <span v-if="p.voided" class="pago-void">
                  Anulado{{ p.voidedBy?.name ? ` por ${p.voidedBy.name}` : '' }}{{ p.voidReason ? ` · ${p.voidReason}` : '' }}
                </span>
              </div>
              <button
                v-if="!p.voided && !isReadOnly && canVoidPayment"
                type="button"
                class="pago-void-btn"
                title="Anular abono"
                @click="onVoidPayment(p)"
              >
                <Ban :size="13" :stroke-width="1.9" /> Anular
              </button>
              <Ban v-else-if="p.voided" :size="15" :stroke-width="1.9" class="pago-banned" />
              <Check v-else :size="15" :stroke-width="1.9" class="pago-check" />
            </li>
          </ul>
        </section>
      </div>

      <AddChargeModal
        :open="addChargeOpen"
        :account-id="selected.id"
        :pets="ownerPets"
        @close="addChargeOpen = false"
        @added="refreshSelected"
        @refresh="refreshSelected"
      />
      <PaymentModal
        :open="paymentOpen"
        :account-id="selected.id"
        :outstanding="selected.outstandingAmount"
        @close="paymentOpen = false"
        @paid="refreshSelected"
        @refresh="refreshSelected"
      />
      <CloseAccountModal
        :open="closeOpen"
        :account="selected"
        @close="closeOpen = false"
        @closed="onAccountClosed"
        @refresh="refreshSelected"
      />
      <VoidPaymentModal
        :open="voidOpen"
        :account-id="selected.id"
        :payment="paymentToVoid"
        @close="voidOpen = false"
        @voided="onPaymentVoided"
        @refresh="refreshSelected"
      />
      <VoidChargeModal
        :open="voidChargeOpen"
        :account-id="selected.id"
        :charge="chargeToVoid"
        :outstanding="selected.outstandingAmount"
        @close="voidChargeOpen = false"
        @voided="onChargeVoided"
        @refresh="refreshSelected"
      />
    </template>

    <!-- ABRIR CUENTA -->
    <OpenAccountModal
      :open="openAccountOpen"
      @close="openAccountOpen = false"
      @created="onAccountCreated"
    />
  </div>
</template>

<style scoped>
.page { font-family: var(--font-sans); color: var(--warm-900); }
.cta {
  display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px; font-size: 13.5px; font-weight: 500;
  background: linear-gradient(135deg, oklch(45% 0.18 var(--hue)), oklch(38% 0.18 calc(var(--hue) - 5)));
  color: white; border: none; border-radius: 9px; cursor: pointer; font-family: inherit; white-space: nowrap;
  box-shadow: 0 1px 2px rgba(50, 20, 80, 0.08), 0 6px 16px -6px oklch(40% 0.18 var(--hue) / 0.5);
}
.ghost-cta {
  display: inline-flex; align-items: center; gap: 8px; padding: 10px 14px; font-size: 13.5px; font-weight: 500;
  background: transparent; border: 1px solid var(--warm-200); color: var(--warm-700); border-radius: 9px; cursor: pointer; font-family: inherit; white-space: nowrap;
}
.ghost-cta:hover:not(:disabled) { background: var(--warm-100); }
.ghost-cta:disabled { opacity: 0.5; cursor: not-allowed; }
.banner.error { background: oklch(95% 0.06 25); border: 1px solid oklch(85% 0.12 25); color: oklch(40% 0.18 25); border-radius: 8px; padding: 10px 14px; font-size: 13px; margin-bottom: 14px; }

/* Tabs Activas / Cerradas */
.tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--warm-200); margin-bottom: 16px; }
.tabs button {
  display: inline-flex; align-items: center; gap: 8px; font-family: inherit; font-size: 13.5px; font-weight: 500;
  color: var(--warm-600); background: transparent; border: none; border-bottom: 2px solid transparent;
  padding: 10px 16px; margin-bottom: -1px; cursor: pointer; transition: color 0.12s ease, border-color 0.12s ease;
}
.tabs button:hover { color: var(--warm-900); }
.tabs button.active { color: var(--amatista-700); border-bottom-color: var(--amatista-600); }
.tab-badge {
  min-width: 20px; height: 20px; padding: 0 7px; border-radius: 10px; background: var(--amatista-600);
  color: white; font-size: 11px; font-weight: 600; display: grid; place-items: center; font-variant-numeric: tabular-nums;
}
.tab-badge.muted { background: var(--warm-200); color: var(--warm-600); }

/* Estado vacío por tab */
.empty-state { padding: 56px 20px; text-align: center; background: var(--warm-50); border: 1px dashed var(--warm-300); border-radius: 14px; }
.empty-ic { width: 60px; height: 60px; border-radius: 16px; background: var(--amatista-50); color: var(--amatista-700); display: grid; place-items: center; margin: 0 auto 14px; }
.empty-title { font-size: 16px; font-weight: 500; margin-bottom: 4px; }
.empty-desc { font-size: 13px; color: var(--warm-600); margin: 0; }
.alert { display: flex; align-items: center; gap: 9px; padding: 11px 14px; margin-bottom: 16px; background: oklch(95% 0.06 80); border: 1px solid oklch(88% 0.09 80); border-radius: 10px; font-size: 13px; color: oklch(40% 0.10 70); }
.alert strong { color: oklch(35% 0.13 70); }
.readonly-note { display: flex; align-items: center; gap: 9px; padding: 11px 14px; margin-bottom: 18px; background: var(--warm-100); border: 1px solid var(--warm-200); border-radius: 10px; font-size: 13px; color: var(--warm-600); }
.readonly-note svg { color: var(--warm-500); flex-shrink: 0; }
.search {
  width: 100%; max-width: 360px; background: var(--warm-50); border: 1px solid var(--warm-200); border-radius: 10px;
  padding: 10px 14px; font-family: inherit; font-size: 13.5px; color: var(--warm-900); outline: none; margin-bottom: 16px;
}
.search:focus { border-color: var(--amatista-500); box-shadow: 0 0 0 3px var(--amatista-50); }
.state { padding: 32px 16px; text-align: center; font-size: 13px; color: var(--warm-500); background: var(--warm-50); border: 1px solid var(--warm-200); border-radius: 12px; }

.status-pill { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 999px; font-size: 11.5px; font-weight: 500; white-space: nowrap; }
.status-pill.open { background: var(--success-bg); color: var(--success-fg); }
.status-pill.closed { background: var(--warm-150); color: var(--warm-600); }
.status-pill.cancelled { background: oklch(95% 0.06 25); color: oklch(48% 0.18 25); }

/* Tarjetas de lista */
.cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; }
.acct-card {
  text-align: left; font-family: inherit; cursor: pointer; padding: 16px; border-radius: 14px;
  background: var(--warm-50); border: 1px solid var(--warm-200); display: flex; flex-direction: column; gap: 11px;
  transition: border-color 0.12s, box-shadow 0.12s;
}
.acct-card:hover { border-color: var(--amatista-300); box-shadow: 0 4px 14px -8px rgba(20, 15, 30, 0.18); }
.acct-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.who { display: flex; align-items: center; gap: 11px; min-width: 0; }
.avatar {
  width: 42px; height: 42px; border-radius: 11px; background: var(--amatista-100); color: var(--amatista-700);
  display: grid; place-items: center; font-family: var(--font-serif); font-size: 16px; font-weight: 500; flex-shrink: 0;
}
.avatar.lg { width: 48px; height: 48px; border-radius: 12px; font-size: 18px; }
.who-text { min-width: 0; }
.name { font-size: 15px; font-weight: 500; color: var(--warm-900); }
.name.lg { margin: 0; font-size: 22px; font-family: var(--font-serif); font-weight: 400; letter-spacing: -0.015em; line-height: 1.05; }
.doc { font-size: 12px; color: var(--warm-500); margin-top: 1px; }
.acct-meta { font-size: 12px; color: var(--warm-500); }
.acct-totals { display: flex; flex-direction: column; gap: 4px; padding-top: 11px; border-top: 1px solid var(--warm-150); }
.acct-totals .row { display: flex; align-items: center; justify-content: space-between; font-size: 12.5px; color: var(--warm-600); }
.acct-totals .row strong { color: var(--warm-900); font-variant-numeric: tabular-nums; }
.acct-totals .row.saldo { font-size: 14px; padding-top: 5px; margin-top: 2px; border-top: 1px dashed var(--warm-200); }
.acct-totals .row.saldo strong { color: oklch(45% 0.13 70); font-size: 15px; }
.acct-totals .row.saldo strong.zero { color: var(--success-fg); }

/* Detalle */
.back {
  display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-family: inherit; cursor: pointer;
  background: transparent; border: none; color: var(--amatista-700); padding: 4px 0; margin-bottom: 14px;
}
.detail-head { display: flex; align-items: center; justify-content: space-between; gap: 24px; flex-wrap: wrap; margin-bottom: 18px; }
.detail-head .who { align-items: center; gap: 14px; }
.name-row { display: flex; align-items: center; gap: 11px; }
.detail-meta { font-size: 13.5px; color: var(--warm-600); margin-top: 3px; }
.detail-actions { display: flex; flex-wrap: wrap; gap: 10px; }

.summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 18px; }
.sum-box { background: var(--warm-50); border: 1px solid var(--warm-200); border-radius: 12px; padding: 14px 16px; display: flex; flex-direction: column; gap: 5px; }
.sum-box.alert { background: oklch(95% 0.06 80); border-color: oklch(88% 0.09 80); }
.sum-lab { font-size: 11.5px; color: var(--warm-500); text-transform: uppercase; letter-spacing: 0.04em; }
.sum-val { font-family: var(--font-serif); font-size: 24px; color: var(--warm-900); letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
.sum-box.alert .sum-val { color: oklch(45% 0.13 70); }

.cols { display: grid; grid-template-columns: 1.5fr 1fr; gap: 16px; align-items: start; }
@media (max-width: 1000px) { .cols { grid-template-columns: 1fr; } .summary { grid-template-columns: 1fr; } }
.col { background: var(--warm-50); border: 1px solid var(--warm-200); border-radius: 14px; overflow: hidden; }
.section-head { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-bottom: 1px solid var(--warm-200); }
.sh-title { display: inline-flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 500; color: var(--warm-900); }
.sh-title svg { color: var(--amatista-600); }
.mini-empty { padding: 28px 18px; text-align: center; font-size: 13px; color: var(--warm-400); }

.group { padding: 8px 18px; }
.group:not(:last-child) { border-bottom: 1px solid var(--warm-100); }
.group-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 7px 0 8px; border-bottom: 1.5px solid var(--warm-200); margin-bottom: 4px; }
.group-id { display: inline-flex; align-items: center; gap: 8px; min-width: 0; }
.pet-avatar { width: 26px; height: 26px; border-radius: 8px; display: grid; place-items: center; flex-shrink: 0; background: var(--amatista-100); color: var(--amatista-700); font-size: 10.5px; font-weight: 700; }
.pet-avatar.general { background: var(--warm-200); color: var(--warm-600); }
.group-name { font-size: 13.5px; font-weight: 600; color: var(--warm-900); }
.group-sub { font-size: 13px; font-weight: 700; color: var(--amatista-700); font-variant-numeric: tabular-nums; white-space: nowrap; }
.charge-list { list-style: none; margin: 0; padding: 0; }
.charge { display: flex; align-items: center; gap: 10px; padding: 9px 0; border-bottom: 1px solid var(--warm-100); }
.charge:last-child { border-bottom: none; }
.c-icon.product { color: var(--warm-500); }
.c-icon.service { color: oklch(45% 0.15 240); }
.c-icon.general { color: var(--amatista-600); }
.c-concept { flex: 1; min-width: 0; font-size: 13px; color: var(--warm-800); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.c-by { font-size: 11px; color: var(--warm-400); white-space: nowrap; max-width: 90px; overflow: hidden; text-overflow: ellipsis; flex-shrink: 0; }
.c-date { font-size: 11px; color: var(--warm-400); font-variant-numeric: tabular-nums; white-space: nowrap; }
.c-amount { font-size: 13px; font-weight: 500; color: var(--warm-900); font-variant-numeric: tabular-nums; white-space: nowrap; }
/* Cargo anulado: queda visible, atenuado y tachado en concepto + monto. */
.charge.voided .c-concept { color: var(--warm-500); }
.charge.voided .c-amount { text-decoration: line-through; color: var(--warm-500); }
.c-qty { display: inline-block; margin-left: 6px; font-size: 11px; font-weight: 600; color: var(--amatista-700); font-variant-numeric: tabular-nums; }
.c-void { display: inline-block; margin-left: 6px; font-size: 11px; font-weight: 500; color: oklch(48% 0.16 25); }
.c-banned { color: oklch(55% 0.16 25); flex-shrink: 0; }
.c-void-btn { width: 24px; height: 24px; border: 1px solid var(--warm-200); background: transparent; color: var(--warm-500); cursor: pointer; border-radius: 6px; display: grid; place-items: center; flex-shrink: 0; }
.c-void-btn:hover { background: oklch(95% 0.05 25); border-color: oklch(85% 0.10 25); color: oklch(48% 0.18 25); }

.pago-list { list-style: none; margin: 0; padding: 12px 18px; display: flex; flex-direction: column; gap: 8px; }
.pago { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 12px; background: var(--warm-100); border-radius: 9px; }
.pago-info { min-width: 0; }
.pago-amt { font-size: 14px; font-weight: 600; color: var(--warm-900); font-variant-numeric: tabular-nums; }
.pago-meta { font-size: 11.5px; color: var(--warm-500); margin-top: 1px; display: block; }
.pago-check { color: var(--success-dot); flex-shrink: 0; }
/* Abono anulado: queda visible, atenuado y tachado en el monto. */
.pago.voided { background: oklch(96% 0.02 25); }
.pago.voided .pago-amt { text-decoration: line-through; color: var(--warm-500); }
.pago-void { display: block; margin-top: 3px; font-size: 11.5px; color: oklch(48% 0.16 25); }
.pago-banned { color: oklch(55% 0.16 25); flex-shrink: 0; }
.pago-void-btn {
  display: inline-flex; align-items: center; gap: 5px; flex-shrink: 0; font-family: inherit; font-size: 12px; font-weight: 500;
  background: transparent; border: 1px solid var(--warm-200); color: var(--warm-600); border-radius: 7px; padding: 5px 9px; cursor: pointer;
}
.pago-void-btn:hover { background: oklch(95% 0.05 25); border-color: oklch(85% 0.10 25); color: oklch(48% 0.18 25); }
</style>
