<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Plus, Receipt, Search } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import { useTienda } from '@/features/tienda/composables/useTienda'
import { formatMoney } from '@/features/tienda/composables/pricing'
import { useCuentas } from '../composables/useCuentas'
import { getProblemDetailMessage } from '@/services/http/http.client'
import { useToast } from '@/composables/useToast'
import type { OpenAccountResponse } from '../types/cuentas'

const props = withDefaults(
  defineProps<{
    open: boolean
    ownerId: number | null
    ownerName: string
    animalId: number | null
    animalName: string
    heading?: string
    subtitle?: string
    /** Precarga el servicio "consulta" al entrar a agregar cargos. */
    autoConsulta?: boolean
  }>(),
  { heading: 'Facturación', subtitle: '', autoConsulta: false },
)

const emit = defineEmits<{ close: []; finish: [] }>()

const tienda = useTienda()
const cuentas = useCuentas()
const toast = useToast()

type Step = 'choose' | 'charges'
const step = ref<Step>('choose')
const existingAccount = ref<OpenAccountResponse | null>(null)
const targetAccount = ref<OpenAccountResponse | null>(null)
const loadingAccount = ref(false)
const busy = ref(false)

const tab = ref<'service' | 'product'>('service')
const query = ref('')

watch(
  () => props.open,
  async (open) => {
    if (!open) return
    step.value = 'choose'
    existingAccount.value = null
    targetAccount.value = null
    tab.value = 'service'
    query.value = ''
    tienda.ensureLoaded()
    if (props.ownerId != null) {
      loadingAccount.value = true
      try {
        existingAccount.value = await cuentas.findOpenAccountByOwner(props.ownerId)
      } catch {
        existingAccount.value = null
      } finally {
        loadingAccount.value = false
      }
    }
  },
)

const hasAccount = computed(() => existingAccount.value !== null)

const catalog = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (tab.value === 'service') {
    return tienda.services.value
      .filter((s) => !q || s.name.toLowerCase().includes(q))
      .map((s) => ({ id: s.id, name: s.name, price: s.price }))
  }
  return tienda.products.value
    .filter((p) => !q || p.name.toLowerCase().includes(q))
    .map((p) => ({ id: p.id, name: p.name, price: p.salePrice }))
})

async function enterCharges(account: OpenAccountResponse) {
  targetAccount.value = account
  await cuentas.refreshAccount(account.id)
  targetAccount.value = cuentas.accounts.value.find((a) => a.id === account.id) ?? account
  step.value = 'charges'
  if (props.autoConsulta && props.animalId != null) {
    const consulta = tienda.services.value.find((s) => s.name.toLowerCase().includes('consulta'))
    if (consulta) await addService(consulta.id, true)
  }
}

async function chooseAddToExisting() {
  if (existingAccount.value) await enterCharges(existingAccount.value)
}

async function chooseOpenNew() {
  if (props.ownerId == null || busy.value) return
  busy.value = true
  try {
    const created = await cuentas.openAccount(props.ownerId)
    toast.success('Cuenta abierta', `Se abrió una cuenta para ${props.ownerName}.`)
    await enterCharges(created)
  } catch (e) {
    toast.error('No se pudo abrir', getProblemDetailMessage(e, 'No se pudo abrir la cuenta'))
  } finally {
    busy.value = false
  }
}

function onlySave() {
  emit('finish')
  emit('close')
}

async function addService(serviceId: number, silent = false) {
  if (!targetAccount.value || props.animalId == null) return
  busy.value = true
  try {
    await cuentas.addServiceCharge(targetAccount.value.id, props.animalId, serviceId)
    targetAccount.value = cuentas.accounts.value.find((a) => a.id === targetAccount.value!.id) ?? targetAccount.value
    if (!silent) toast.success('Cargo agregado', 'Servicio añadido a la cuenta.')
  } catch (e) {
    toast.error('Ocurrió un error', getProblemDetailMessage(e, 'No se pudo agregar el cargo'))
  } finally {
    busy.value = false
  }
}

async function addProduct(productId: number) {
  if (!targetAccount.value || props.animalId == null) return
  busy.value = true
  try {
    await cuentas.addProductCharge(targetAccount.value.id, props.animalId, productId)
    targetAccount.value = cuentas.accounts.value.find((a) => a.id === targetAccount.value!.id) ?? targetAccount.value
    toast.success('Cargo agregado', 'Producto añadido a la cuenta.')
  } catch (e) {
    toast.error('Ocurrió un error', getProblemDetailMessage(e, 'No se pudo agregar el cargo'))
  } finally {
    busy.value = false
  }
}

function addItem(id: number) {
  if (tab.value === 'service') addService(id)
  else addProduct(id)
}

function finish() {
  emit('finish')
  emit('close')
}
</script>

<template>
  <ModalShell
    :open="open"
    :title="heading"
    :subtitle="subtitle || `${ownerName}${animalName ? ' · ' + animalName : ''}`"
    :icon="Receipt"
    :width="640"
    @close="emit('close')"
  >
    <template #body>
      <div v-if="loadingAccount" class="state">Verificando cuenta…</div>

      <!-- Paso elegir destino -->
      <template v-else-if="step === 'choose'">
        <div v-if="hasAccount && existingAccount" class="acct-card green">
          <div class="ac-title">Cuenta abierta de {{ ownerName }}</div>
          <div class="ac-meta">Saldo actual: <strong>{{ formatMoney(existingAccount.outstandingAmount) }}</strong></div>
        </div>
        <div v-else class="acct-card amber">
          <div class="ac-title">{{ ownerName }} no tiene una cuenta abierta</div>
          <div class="ac-meta">Puedes abrir una cuenta para registrar estos cargos a crédito.</div>
        </div>

        <div class="options">
          <template v-if="hasAccount">
            <button type="button" class="opt primary" :disabled="busy" @click="chooseAddToExisting">Agregar a la cuenta abierta</button>
            <button type="button" class="opt" :disabled="busy" @click="chooseOpenNew">Abrir una cuenta nueva</button>
          </template>
          <template v-else>
            <button type="button" class="opt primary" :disabled="busy || ownerId == null" @click="chooseOpenNew">Abrir cuenta y agregar cargos</button>
          </template>
          <button type="button" class="opt ghost" @click="onlySave">Solo guardar</button>
        </div>
      </template>

      <!-- Paso agregar cargos -->
      <template v-else>
        <div v-if="targetAccount" class="acct-card green compact">
          <span>Saldo: <strong>{{ formatMoney(targetAccount.outstandingAmount) }}</strong></span>
        </div>

        <div v-if="cuentas.charges.value.length" class="existing">
          <div class="ex-label">Ya en la cuenta · solo lectura</div>
          <ul class="ex-list">
            <li v-for="c in cuentas.charges.value" :key="`${c.kind}-${c.id}`" class="ex-row">
              <span>{{ c.concept }}</span>
              <span class="ex-amount">{{ formatMoney(c.amount) }}</span>
            </li>
          </ul>
          <div class="divider">Nuevos cargos</div>
        </div>

        <div class="tabs">
          <button type="button" class="tab" :class="{ active: tab === 'service' }" @click="tab = 'service'">Servicios</button>
          <button type="button" class="tab" :class="{ active: tab === 'product' }" @click="tab = 'product'">Productos</button>
        </div>
        <div class="search">
          <Search :size="14" :stroke-width="1.7" class="s-icon" />
          <input v-model="query" type="text" class="s-input" placeholder="Buscar…" />
        </div>
        <ul class="catalog">
          <li v-for="it in catalog" :key="it.id" class="cat-row">
            <span class="cat-name">{{ it.name }}</span>
            <span class="cat-price">{{ formatMoney(it.price) }}</span>
            <button type="button" class="add-btn" :disabled="busy" @click="addItem(it.id)">
              <Plus :size="14" :stroke-width="1.9" /> Agregar
            </button>
          </li>
          <li v-if="catalog.length === 0" class="empty">No hay ítems en este catálogo.</li>
        </ul>
      </template>
    </template>

    <template #footer-actions>
      <button v-if="step === 'charges'" type="button" class="btn-primary" @click="finish">Finalizar</button>
      <button v-else type="button" class="btn-ghost" @click="emit('close')">Cerrar</button>
    </template>
  </ModalShell>
</template>

<style scoped>
.state { padding: 24px; text-align: center; color: var(--warm-500); font-size: 13px; }
.acct-card { border-radius: 12px; padding: 14px 16px; margin-bottom: 16px; }
.acct-card.green { background: oklch(95% 0.05 150); border: 1px solid oklch(85% 0.08 150); }
.acct-card.amber { background: oklch(95% 0.06 80); border: 1px solid oklch(85% 0.09 80); }
.acct-card.compact { padding: 10px 14px; font-size: 13px; color: var(--warm-700); }
.ac-title { font-size: 14px; font-weight: 600; color: var(--warm-900); }
.ac-meta { font-size: 12.5px; color: var(--warm-600); margin-top: 4px; }
.options { display: flex; flex-direction: column; gap: 10px; }
.opt { padding: 12px 16px; border-radius: 10px; font-family: inherit; font-size: 13.5px; font-weight: 500; cursor: pointer; border: 1px solid var(--warm-200); background: var(--warm-50); color: var(--warm-800); text-align: left; }
.opt:hover:not(:disabled) { border-color: var(--amatista-300); background: var(--amatista-50); }
.opt.primary { background: linear-gradient(135deg, oklch(45% 0.18 var(--hue)), oklch(38% 0.18 calc(var(--hue) - 5))); color: white; border: none; }
.opt.ghost { background: transparent; color: var(--warm-600); }
.opt:disabled { opacity: 0.6; cursor: not-allowed; }
.existing { margin-bottom: 14px; }
.ex-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--warm-500); font-weight: 500; margin-bottom: 8px; }
.ex-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; opacity: 0.7; }
.ex-row { display: flex; align-items: center; justify-content: space-between; font-size: 13px; color: var(--warm-700); padding: 8px 12px; background: var(--warm-100); border-radius: 8px; }
.ex-amount { font-weight: 500; }
.divider { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--warm-500); font-weight: 500; margin: 14px 0 8px; }
.tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--warm-200); margin-bottom: 12px; }
.tab { padding: 8px 14px; font-size: 13px; font-family: inherit; cursor: pointer; background: transparent; border: none; color: var(--warm-600); border-bottom: 2px solid transparent; margin-bottom: -1px; }
.tab.active { color: var(--amatista-700); border-bottom-color: var(--amatista-700); font-weight: 500; }
.search { position: relative; display: flex; align-items: center; margin-bottom: 10px; }
.s-icon { position: absolute; left: 12px; color: var(--warm-500); }
.s-input { width: 100%; background: var(--warm-50); border: 1px solid var(--warm-200); border-radius: 9px; padding: 9px 12px 9px 34px; font-family: inherit; font-size: 13px; color: var(--warm-900); outline: none; }
.s-input:focus { border-color: var(--amatista-500); box-shadow: 0 0 0 3px var(--amatista-50); }
.catalog { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; max-height: 280px; overflow: auto; }
.cat-row { display: flex; align-items: center; gap: 12px; padding: 10px 12px; background: var(--warm-50); border: 1px solid var(--warm-200); border-radius: 10px; }
.cat-name { flex: 1; font-size: 13.5px; color: var(--warm-900); }
.cat-price { font-size: 13px; color: var(--warm-600); }
.add-btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; font-size: 12.5px; font-weight: 500; border-radius: 8px; cursor: pointer; font-family: inherit; background: var(--amatista-50); color: var(--amatista-700); border: 1px solid var(--amatista-200); }
.add-btn:hover:not(:disabled) { background: var(--amatista-100); }
.add-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.empty { font-size: 13px; color: var(--warm-500); text-align: center; padding: 16px; }
.btn-primary { font-family: inherit; font-size: 13.5px; font-weight: 500; padding: 10px 18px; border-radius: 9px; cursor: pointer; border: none; color: white; background: linear-gradient(135deg, oklch(45% 0.18 var(--hue)), oklch(38% 0.18 calc(var(--hue) - 5))); }
.btn-ghost { font-family: inherit; font-size: 13.5px; font-weight: 500; padding: 10px 18px; border-radius: 9px; cursor: pointer; background: transparent; border: 1px solid var(--warm-200); color: var(--warm-700); }
.btn-ghost:hover { background: var(--warm-100); }
</style>
