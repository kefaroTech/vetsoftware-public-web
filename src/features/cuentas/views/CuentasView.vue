<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  ArrowLeft,
  Check,
  CreditCard,
  FileText,
  Package,
  Plus,
  Receipt,
  Stethoscope,
  Wallet,
  X,
} from 'lucide-vue-next'
import PageHeader from '@/components/ui/PageHeader.vue'
import OpenAccountModal from '../components/OpenAccountModal.vue'
import AddChargeModal from '../components/AddChargeModal.vue'
import PaymentModal from '../components/PaymentModal.vue'
import { useCuentas } from '../composables/useCuentas'
import { formatMoney } from '@/features/tienda/composables/pricing'
import {
  initials,
  formatDateShort,
} from '@/features/dashboard/views/consulta/nueva/composables/format'
import { animalApi } from '@/features/dashboard/views/consulta/nueva/api/animal.api'
import { useToast } from '@/composables/useToast'
import { useAuthorization } from '@/features/auth/composables/useAuthorization'
import { PERMISSIONS } from '@/constants/permissions'
import { getProblemDetailMessage } from '@/services/http/http.client'
import {
  PAYMENT_METHOD_LABEL,
  type ChargeKind,
  type OpenAccountResponse,
  type UnifiedCharge,
} from '../types/cuentas'

const store = useCuentas()
const toast = useToast()
const { can } = useAuthorization()
const canCreate = can(PERMISSIONS.OPEN_ACCOUNT_CREATE)

const query = ref('')
const selected = ref<OpenAccountResponse | null>(null)
const ownerPets = ref<{ id: number; name: string }[]>([])

const openAccountOpen = ref(false)
const addChargeOpen = ref(false)
const paymentOpen = ref(false)

onMounted(() => store.ensureLoaded())

const filteredAccounts = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return store.accounts.value
  return store.accounts.value.filter(
    (a) => a.owner.name.toLowerCase().includes(q) || (a.owner.document ?? '').toLowerCase().includes(q),
  )
})

const totalPending = computed(() =>
  store.accounts.value.reduce((sum, a) => sum + a.outstandingAmount, 0),
)

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

// ── Eliminar cargo ───────────────────────────────────────────────────────────
async function onDeleteCharge(c: UnifiedCharge) {
  if (!selected.value) return
  try {
    await store.removeCharge(selected.value.id, c)
    selected.value = store.accounts.value.find((a) => a.id === selected.value!.id) ?? selected.value
    toast.info('Cargo eliminado', `${c.concept} fue removido de la cuenta.`)
  } catch (e) {
    toast.error('No se pudo eliminar', getProblemDetailMessage(e, 'No se pudo eliminar el cargo'))
  }
}
</script>

<template>
  <div class="page">
    <PageHeader
      kicker="Facturación"
      title="Cuentas abiertas"
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
      <div v-if="filteredAccounts.length > 0" class="alert">
        <Receipt :size="15" :stroke-width="1.8" />
        <span>
          <strong>{{ filteredAccounts.length }}</strong>
          {{ filteredAccounts.length === 1 ? 'cuenta abierta' : 'cuentas abiertas' }}
          · saldo acumulado pendiente <strong>{{ formatMoney(totalPending) }}</strong>
        </span>
      </div>

      <input v-model="query" type="text" class="search" placeholder="Buscar por propietario o documento…" />

      <div v-if="store.loading.value" class="state">Cargando…</div>
      <div v-else-if="filteredAccounts.length === 0" class="state empty">No hay cuentas abiertas.</div>
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
            <span class="status-pill abierta">Abierta</span>
          </div>
          <div class="acct-meta">Cuenta desde {{ formatDateShort(acc.createdDate) }}</div>
          <div class="acct-totals">
            <div class="row"><span>Acumulado</span><strong>{{ formatMoney(acc.totalAmount) }}</strong></div>
            <div class="row"><span>Abonado</span><strong>{{ formatMoney(acc.paidAmount) }}</strong></div>
            <div class="row saldo">
              <span>Saldo</span>
              <strong :class="{ zero: acc.outstandingAmount <= 0 }">{{ formatMoney(acc.outstandingAmount) }}</strong>
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
              <span class="status-pill abierta">Abierta</span>
            </div>
            <div class="detail-meta">
              {{ selected.owner.document }} · cuenta abierta {{ formatDateShort(selected.createdDate) }}
            </div>
          </div>
        </div>
        <div class="detail-actions">
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
        </div>
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
              <li v-for="c in group.charges" :key="`${c.kind}-${c.id}`" class="charge">
                <component :is="CHARGE_ICON[c.kind]" :size="14" :stroke-width="1.7" class="c-icon" :class="c.kind" />
                <span class="c-concept">{{ c.concept }}</span>
                <span class="c-date">{{ c.date.slice(5, 10) }}</span>
                <span class="c-amount">{{ formatMoney(c.amount) }}</span>
                <button type="button" class="c-del" title="Eliminar cargo" @click="onDeleteCharge(c)">
                  <X :size="13" :stroke-width="1.9" />
                </button>
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
            <li v-for="p in store.payments.value" :key="p.id" class="pago">
              <div class="pago-info">
                <span class="pago-amt">{{ formatMoney(p.amount) }}</span>
                <span class="pago-meta">{{ p.createdDate.slice(0, 10) }} · {{ PAYMENT_METHOD_LABEL[p.paymentMethod] }}</span>
              </div>
              <Check :size="15" :stroke-width="1.9" class="pago-check" />
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
      />
      <PaymentModal
        :open="paymentOpen"
        :account-id="selected.id"
        :outstanding="selected.outstandingAmount"
        @close="paymentOpen = false"
        @paid="refreshSelected"
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
.alert { display: flex; align-items: center; gap: 9px; padding: 11px 14px; margin-bottom: 16px; background: oklch(95% 0.06 80); border: 1px solid oklch(88% 0.09 80); border-radius: 10px; font-size: 13px; color: oklch(40% 0.10 70); }
.alert strong { color: oklch(35% 0.13 70); }
.search {
  width: 100%; max-width: 360px; background: var(--warm-50); border: 1px solid var(--warm-200); border-radius: 10px;
  padding: 10px 14px; font-family: inherit; font-size: 13.5px; color: var(--warm-900); outline: none; margin-bottom: 16px;
}
.search:focus { border-color: var(--amatista-500); box-shadow: 0 0 0 3px var(--amatista-50); }
.state { padding: 32px 16px; text-align: center; font-size: 13px; color: var(--warm-500); background: var(--warm-50); border: 1px solid var(--warm-200); border-radius: 12px; }

.status-pill { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 999px; font-size: 11.5px; font-weight: 500; white-space: nowrap; }
.status-pill.abierta { background: var(--success-bg); color: var(--success-fg); }

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
.detail-actions { display: flex; gap: 10px; }

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
.c-date { font-size: 11px; color: var(--warm-400); font-variant-numeric: tabular-nums; white-space: nowrap; }
.c-amount { font-size: 13px; font-weight: 500; color: var(--warm-900); font-variant-numeric: tabular-nums; white-space: nowrap; }
.c-del { width: 22px; height: 22px; border: none; background: transparent; color: var(--warm-400); cursor: pointer; border-radius: 5px; display: grid; place-items: center; flex-shrink: 0; }
.c-del:hover { background: oklch(94% 0.05 25); color: oklch(48% 0.18 25); }

.pago-list { list-style: none; margin: 0; padding: 12px 18px; display: flex; flex-direction: column; gap: 8px; }
.pago { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: var(--warm-100); border-radius: 9px; }
.pago-amt { font-size: 14px; font-weight: 600; color: var(--warm-900); font-variant-numeric: tabular-nums; }
.pago-meta { font-size: 11.5px; color: var(--warm-500); margin-top: 1px; display: block; }
.pago-check { color: var(--success-dot); flex-shrink: 0; }
</style>
