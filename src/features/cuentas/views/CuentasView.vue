<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ArrowLeft, CreditCard, Plus, User, Wallet } from 'lucide-vue-next'
import PageHeader from '@/components/ui/PageHeader.vue'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import OwnerPicker from '../components/OwnerPicker.vue'
import AddChargeModal from '../components/AddChargeModal.vue'
import PaymentModal from '../components/PaymentModal.vue'
import { useCuentas } from '../composables/useCuentas'
import { formatMoney } from '@/features/tienda/composables/pricing'
import { animalApi } from '@/features/dashboard/views/consulta/nueva/api/animal.api'
import { useToast } from '@/composables/useToast'
import { useAuthorization } from '@/features/auth/composables/useAuthorization'
import { PERMISSIONS } from '@/constants/permissions'
import { getProblemDetailMessage } from '@/services/http/http.client'
import type { OpenAccountResponse } from '../types/cuentas'
import type { OwnerResponse } from '@/features/dashboard/views/consulta/nueva/api/owner.api'

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
const openingBusy = ref(false)

onMounted(() => store.ensureLoaded())

const filteredAccounts = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return store.accounts.value
  return store.accounts.value.filter(
    (a) => a.owner.name.toLowerCase().includes(q) || (a.owner.document ?? '').toLowerCase().includes(q),
  )
})

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

async function onOwnerSelected(owner: OwnerResponse) {
  openingBusy.value = true
  try {
    const created = await store.openAccount(owner.id)
    toast.success('Cuenta abierta', `Se abrió una cuenta para ${owner.name}.`)
    openAccountOpen.value = false
    await selectAccount(created)
  } catch (e) {
    toast.error('No se pudo abrir', getProblemDetailMessage(e, 'No se pudo abrir la cuenta'))
  } finally {
    openingBusy.value = false
  }
}

async function refreshSelected() {
  if (selected.value) {
    await store.refreshAccount(selected.value.id)
    selected.value = store.accounts.value.find((a) => a.id === selected.value!.id) ?? selected.value
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
        <button v-if="canCreate && !selected" type="button" class="cta" @click="openAccountOpen = true">
          <Plus :size="16" :stroke-width="1.8" /> Abrir cuenta
        </button>
      </template>
    </PageHeader>

    <div v-if="store.error.value" class="banner error">{{ store.error.value }}</div>

    <!-- LISTA -->
    <template v-if="!selected">
      <input v-model="query" type="text" class="search" placeholder="Buscar por propietario o documento…" />
      <div v-if="store.loading.value" class="state">Cargando…</div>
      <div v-else-if="filteredAccounts.length === 0" class="state empty">No hay cuentas abiertas.</div>
      <div v-else class="cards">
        <button
          v-for="acc in filteredAccounts"
          :key="acc.id"
          type="button"
          class="card"
          @click="selectAccount(acc)"
        >
          <div class="card-head">
            <span class="avatar"><User :size="16" :stroke-width="1.7" /></span>
            <div class="who">
              <div class="name">{{ acc.owner.name }}</div>
              <div class="doc">{{ acc.owner.document }}</div>
            </div>
          </div>
          <div class="card-foot">
            <span class="muted">Saldo</span>
            <span class="balance" :class="{ zero: acc.outstandingAmount <= 0 }">{{ formatMoney(acc.outstandingAmount) }}</span>
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
          <span class="avatar lg"><User :size="20" :stroke-width="1.7" /></span>
          <div>
            <div class="name lg">{{ selected.owner.name }}</div>
            <div class="doc">{{ selected.owner.document }}</div>
          </div>
        </div>
        <div class="totals">
          <div class="total-box">
            <span class="muted">Total</span>
            <span class="t-val">{{ formatMoney(selected.totalAmount) }}</span>
          </div>
          <div class="total-box">
            <span class="muted">Abonado</span>
            <span class="t-val">{{ formatMoney(selected.paidAmount) }}</span>
          </div>
          <div class="total-box highlight">
            <span class="muted">Saldo</span>
            <span class="t-val">{{ formatMoney(selected.outstandingAmount) }}</span>
          </div>
        </div>
      </div>

      <div class="detail-actions">
        <button type="button" class="cta" @click="addChargeOpen = true">
          <Plus :size="15" :stroke-width="1.8" /> Agregar cargo
        </button>
        <button type="button" class="ghost-cta" :disabled="selected.outstandingAmount <= 0" @click="paymentOpen = true">
          <CreditCard :size="15" :stroke-width="1.8" /> Registrar abono
        </button>
      </div>

      <div v-if="store.detailLoading.value" class="state">Cargando cargos…</div>
      <template v-else>
        <div v-for="group in store.chargesByPet.value" :key="group.key" class="group">
          <div class="group-head">
            <span class="group-name">{{ group.name }}</span>
            <span class="group-sub">{{ formatMoney(group.subtotal) }}</span>
          </div>
          <ul class="charge-list">
            <li v-for="c in group.charges" :key="`${c.kind}-${c.id}`" class="charge">
              <span class="c-concept">{{ c.concept }}</span>
              <span class="c-kind">{{ c.kind === 'product' ? 'Producto' : c.kind === 'service' ? 'Servicio' : 'General' }}</span>
              <span class="c-amount">{{ formatMoney(c.amount) }}</span>
            </li>
          </ul>
        </div>
        <div v-if="store.charges.value.length === 0" class="state empty">Esta cuenta aún no tiene cargos.</div>

        <div v-if="store.payments.value.length" class="payments">
          <div class="group-head"><span class="group-name"><Wallet :size="14" :stroke-width="1.7" /> Abonos</span></div>
          <ul class="charge-list">
            <li v-for="p in store.payments.value" :key="p.id" class="charge">
              <span class="c-concept">{{ p.paymentMethod }}</span>
              <span class="c-kind">{{ p.createdDate.slice(0, 10) }}</span>
              <span class="c-amount paid">− {{ formatMoney(p.amount) }}</span>
            </li>
          </ul>
        </div>
      </template>

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
    <ModalShell
      :open="openAccountOpen"
      title="Abrir cuenta"
      subtitle="Selecciona el propietario. Un propietario solo puede tener una cuenta abierta."
      :icon="Wallet"
      :width="520"
      @close="openAccountOpen = false"
    >
      <template #body>
        <OwnerPicker @select="onOwnerSelected" />
        <p v-if="openingBusy" class="muted center">Abriendo cuenta…</p>
      </template>
    </ModalShell>
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
.search {
  width: 100%; max-width: 360px; background: var(--warm-50); border: 1px solid var(--warm-200); border-radius: 9px;
  padding: 9px 12px; font-family: inherit; font-size: 13px; color: var(--warm-900); outline: none; margin-bottom: 16px;
}
.search:focus { border-color: var(--amatista-500); box-shadow: 0 0 0 3px var(--amatista-50); }
.state { padding: 32px 16px; text-align: center; font-size: 13px; color: var(--warm-500); background: var(--warm-50); border: 1px solid var(--warm-200); border-radius: 12px; }
.cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; }
.card {
  text-align: left; font-family: inherit; cursor: pointer; padding: 16px; border-radius: 12px;
  background: var(--warm-50); border: 1px solid var(--warm-200); display: flex; flex-direction: column; gap: 14px;
  transition: border-color 0.12s, box-shadow 0.12s;
}
.card:hover { border-color: var(--amatista-300); box-shadow: 0 4px 14px -8px oklch(40% 0.18 var(--hue) / 0.3); }
.card-head { display: flex; align-items: center; gap: 10px; }
.avatar { width: 34px; height: 34px; border-radius: 9px; background: var(--amatista-100); color: var(--amatista-700); display: grid; place-items: center; flex-shrink: 0; }
.avatar.lg { width: 48px; height: 48px; border-radius: 12px; }
.name { font-size: 14px; font-weight: 500; color: var(--warm-900); }
.name.lg { font-size: 20px; font-family: var(--font-serif); font-weight: 400; }
.doc { font-size: 12px; color: var(--warm-500); }
.card-foot { display: flex; align-items: center; justify-content: space-between; }
.muted { font-size: 11.5px; color: var(--warm-500); text-transform: uppercase; letter-spacing: 0.05em; }
.balance { font-size: 16px; font-weight: 600; color: oklch(48% 0.18 25); }
.balance.zero { color: oklch(45% 0.13 150); }
.back {
  display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-family: inherit; cursor: pointer;
  background: transparent; border: none; color: var(--amatista-700); padding: 4px 0; margin-bottom: 14px;
}
.detail-head { display: flex; align-items: center; justify-content: space-between; gap: 24px; flex-wrap: wrap; margin-bottom: 16px; }
.detail-head .who { display: flex; align-items: center; gap: 14px; }
.totals { display: flex; gap: 12px; }
.total-box { display: flex; flex-direction: column; gap: 4px; padding: 10px 16px; border-radius: 10px; background: var(--warm-100); }
.total-box.highlight { background: var(--amatista-50); border: 1px solid var(--amatista-200); }
.t-val { font-size: 17px; font-weight: 600; color: var(--warm-900); }
.detail-actions { display: flex; gap: 10px; margin-bottom: 18px; }
.group { margin-bottom: 16px; }
.group-head { display: flex; align-items: center; justify-content: space-between; padding: 8px 4px; border-bottom: 1px solid var(--warm-200); margin-bottom: 8px; }
.group-name { font-size: 13px; font-weight: 600; color: var(--warm-800); display: inline-flex; align-items: center; gap: 6px; }
.group-sub { font-size: 13px; font-weight: 500; color: var(--warm-600); }
.charge-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
.charge {
  display: grid; grid-template-columns: 1fr auto auto; align-items: center; gap: 16px;
  padding: 10px 12px; background: var(--warm-50); border: 1px solid var(--warm-200); border-radius: 9px;
}
.c-concept { font-size: 13.5px; color: var(--warm-900); }
.c-kind { font-size: 11.5px; color: var(--warm-500); }
.c-amount { font-size: 13.5px; font-weight: 500; color: var(--warm-900); }
.c-amount.paid { color: oklch(45% 0.13 150); }
.payments { margin-top: 8px; }
.center { text-align: center; margin-top: 12px; }
</style>
