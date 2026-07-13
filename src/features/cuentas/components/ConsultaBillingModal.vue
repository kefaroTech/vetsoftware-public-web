<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Check, Minus, Plus, Receipt, X } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import { useTienda } from '@/features/tienda/composables/useTienda'
import { formatMoney } from '@/features/tienda/composables/pricing'
import { useCuentas } from '../composables/useCuentas'
import { getProblemDetailMessage } from '@/services/http/http.client'
import { useToast } from '@/composables/useToast'
import type { OpenAccountResponse, UnifiedCharge } from '../types/cuentas'

const props = withDefaults(
  defineProps<{
    open: boolean
    ownerId: number | null
    ownerName: string
    animalId: number | null
    animalName: string
    heading?: string
    subtitle?: string
    /** `false` → modal no descartable: sin X, sin Cancelar, sin backdrop/Escape. */
    dismissible?: boolean
  }>(),
  { heading: 'Facturación', subtitle: '', dismissible: true },
)

const emit = defineEmits<{ close: []; finish: [] }>()

const tienda = useTienda()
const cuentas = useCuentas()
const toast = useToast()

type Destino = 'existing' | 'new' | 'nada'
type CartKind = 'service' | 'product'
interface CartLine {
  kind: CartKind
  id: number
  name: string
  unitPrice: number
  qty: number
}

const destino = ref<Destino>('new')
const existingAccount = ref<OpenAccountResponse | null>(null)
const existingCharges = ref<UnifiedCharge[]>([])
const loadingAccount = ref(false)
const busy = ref(false)

const tab = ref<CartKind>('service')
const query = ref('')
const items = ref<CartLine[]>([])

// ── Marcadores de idempotencia para el reintento de guardado ─────────────────
// La cuenta (destino 'new') se crea una sola vez y cada cargo (un POST por unidad)
// se marca al persistirse; tras un fallo parcial, reintentar continúa sin duplicar.
interface ChargeOp {
  kind: CartKind
  animalId: number
  refId: number
  done: boolean
  // Idempotency key estable por unidad: se reusa en cada reintento para que el backend no duplique el cargo
  // aunque la respuesta del POST se pierda en transporte (op.done queda false y se reintenta con la misma key).
  requestId: string
}
const createdAccount = ref<OpenAccountResponse | null>(null)
const pendingOps = ref<ChargeOp[]>([])

const firstName = computed(() => props.ownerName.trim().split(/\s+/)[0] || props.ownerName)
const hasAccount = computed(() => existingAccount.value !== null)

watch(
  () => props.open,
  async (open) => {
    if (!open) return
    existingAccount.value = null
    existingCharges.value = []
    items.value = []
    createdAccount.value = null
    pendingOps.value = []
    tab.value = 'service'
    query.value = ''
    destino.value = 'new'
    tienda.ensureLoaded()
    if (props.ownerId != null) {
      loadingAccount.value = true
      try {
        const acc = await cuentas.findOpenAccountByOwner(props.ownerId)
        existingAccount.value = acc
        if (acc) {
          destino.value = 'existing'
          await cuentas.loadDetail(acc.id)
          existingCharges.value = [...cuentas.charges.value]
        }
      } catch {
        existingAccount.value = null
      } finally {
        loadingAccount.value = false
      }
    }
  },
)

const catalog = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (tab.value === 'service') {
    return tienda.services.value
      .filter((s) => !q || s.name.toLowerCase().includes(q) || s.serviceCategory?.name.toLowerCase().includes(q))
      .map((s) => ({ id: s.id, name: s.name, price: s.price, soldOut: false, category: s.serviceCategory?.name ?? '' }))
  }
  return tienda.products.value
    .filter((p) => !q || p.name.toLowerCase().includes(q) || p.productCategory?.name.toLowerCase().includes(q))
    // Stock por sede (F4): agotado según el saldo de la sede activa si está cargado; si no, no se marca (el backend valida).
    .map((p) => ({ id: p.id, name: p.name, price: p.salePrice, soldOut: (tienda.stockByProduct.value[p.id]?.quantity ?? 1) <= 0, category: p.productCategory?.name ?? '' }))
})

const total = computed(() => items.value.reduce((sum, l) => sum + l.unitPrice * l.qty, 0))
const projectedSaldo = computed(() => (existingAccount.value?.outstandingAmount ?? 0) + total.value)

function addItem(kind: CartKind, id: number, name: string, unitPrice: number, soldOut = false) {
  if (soldOut || busy.value) return
  const line = items.value.find((l) => l.kind === kind && l.id === id)
  if (line) line.qty += 1
  else items.value.push({ kind, id, name, unitPrice, qty: 1 })
}
function setQty(line: CartLine, n: number) {
  const q = Math.max(0, Math.floor(n) || 0)
  if (q <= 0) items.value = items.value.filter((l) => l !== line)
  else line.qty = q
}
function removeLine(line: CartLine) {
  items.value = items.value.filter((l) => l !== line)
}

const selectedHeading = computed(() => (destino.value === 'existing' ? 'Cargos de la cuenta' : 'Cargos de esta consulta'))
const primaryLabel = computed(() => {
  // La consulta/procedimiento YA se guardó antes de abrir este modal: en 'nada' el
  // primario solo cierra → "Salir".
  if (destino.value === 'nada') return 'Salir'
  if (destino.value === 'existing') return 'Guardar y agregar a cuenta'
  return 'Guardar y abrir cuenta'
})
const showCharges = computed(() => destino.value === 'existing' || destino.value === 'new')
const canConfirm = computed(() => {
  if (busy.value) return false
  if (destino.value === 'nada') return true
  // Regla: no se abre una cuenta sin cargos → 'new' exige al menos 1 ítem.
  if (destino.value === 'new') return props.ownerId != null && items.value.length > 0
  return props.ownerId != null
})

// Hubo un guardado parcial: la cuenta destino ya existe pero faltan cargos por persistir.
const retryHint = computed(
  () =>
    !busy.value &&
    pendingOps.value.some((o) => !o.done) &&
    (!!createdAccount.value || pendingOps.value.some((o) => o.done)),
)

/** Aplana el carrito a POSTs individuales (1 cargo por unidad); base de la idempotencia. */
function buildOps(): ChargeOp[] {
  const ops: ChargeOp[] = []
  if (props.animalId == null) return ops
  for (const l of items.value) {
    for (let i = 0; i < l.qty; i++) {
      ops.push({ kind: l.kind, animalId: props.animalId, refId: l.id, done: false, requestId: crypto.randomUUID() })
    }
  }
  return ops
}

async function confirm() {
  if (!canConfirm.value) return
  if (destino.value === 'nada') {
    emit('finish')
    emit('close')
    return
  }
  busy.value = true
  try {
    // 1. Cuenta destino: 'existing' la reutiliza; 'new' la crea una sola vez (idempotente).
    let accountId: number
    if (destino.value === 'existing' && existingAccount.value) {
      accountId = existingAccount.value.id
    } else {
      if (!createdAccount.value) {
        createdAccount.value = await cuentas.openAccount(props.ownerId as number)
      }
      accountId = createdAccount.value.id
    }

    // 2. Aplanar el carrito una sola vez; cada op se marca al persistirse.
    if (pendingOps.value.length === 0) pendingOps.value = buildOps()
    for (const op of pendingOps.value) {
      if (op.done) continue
      await cuentas.addChargeUnit(accountId, op.animalId, op.kind, op.refId, op.requestId)
      op.done = true
    }
    if (pendingOps.value.length > 0) await cuentas.refreshAccount(accountId)

    const units = pendingOps.value.length
    if (destino.value === 'existing') {
      toast.success('Cargos agregados', `${units} ítem(s) sumados a la cuenta de ${firstName.value}.`)
    } else {
      toast.success('Cuenta abierta', `Se creó una cuenta para ${props.ownerName} con ${units} cargo(s).`)
    }
    emit('finish')
    emit('close')
  } catch (e) {
    // Los marcadores (createdAccount + ops.done) persisten → el reintento salta lo ya guardado.
    toast.error('Ocurrió un error', getProblemDetailMessage(e, 'No se pudo completar la facturación'))
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <ModalShell
    :open="open"
    :title="heading"
    :subtitle="subtitle || (animalName ? `${animalName} · ${ownerName}` : ownerName)"
    :icon="Receipt"
    :width="700"
    :closable="dismissible"
    @close="emit('close')"
  >
    <template #body>
      <div v-if="loadingAccount" class="state">Verificando cuenta…</div>

      <template v-else>
        <!-- 2. Banda de estado de cuenta -->
        <div v-if="hasAccount && existingAccount" class="acctcard">
          <div class="ac-ic"><Receipt :size="17" :stroke-width="1.7" /></div>
          <div class="ac-text">
            <div class="ac-title">{{ firstName }} ya tiene una cuenta abierta</div>
            <div class="ac-sub">
              {{ existingCharges.length }} cargo(s) · desde {{ existingAccount.createdDate.slice(5, 10) }}
            </div>
          </div>
          <div class="ac-saldo">
            <span class="ac-saldo-lab">Saldo actual</span>
            <span class="ac-saldo-val">{{ formatMoney(existingAccount.outstandingAmount) }}</span>
          </div>
        </div>
        <div v-else class="acct-none">
          <Receipt :size="15" :stroke-width="1.8" />
          <span>
            <strong>{{ firstName }}</strong> no tiene cuenta abierta. Puedes abrir una con los cargos de
            esta consulta.
          </span>
        </div>

        <!-- 3. Selector de destino (regla: 1 cuenta abierta por propietario) -->
        <div class="dest">
          <button
            v-if="hasAccount"
            type="button"
            class="destopt"
            :class="{ active: destino === 'existing' }"
            @click="destino = 'existing'"
          >
            <span class="do-check"><Check v-if="destino === 'existing'" :size="13" :stroke-width="3" /></span>
            <span class="do-text">
              <span class="do-title">Agregar a la cuenta abierta</span>
              <span class="do-sub">Saldo proyectado {{ formatMoney(projectedSaldo) }}</span>
            </span>
          </button>

          <button v-else type="button" class="destopt" :class="{ active: destino === 'new' }" @click="destino = 'new'">
            <span class="do-check"><Check v-if="destino === 'new'" :size="13" :stroke-width="3" /></span>
            <span class="do-text">
              <span class="do-title">Abrir cuenta y agregar cargos</span>
              <span class="do-sub">Registra estos cargos a crédito.</span>
            </span>
          </button>

          <button type="button" class="destopt" :class="{ active: destino === 'nada' }" @click="destino = 'nada'">
            <span class="do-check"><Check v-if="destino === 'nada'" :size="13" :stroke-width="3" /></span>
            <span class="do-text">
              <span class="do-title">Solo guardar la consulta</span>
              <span class="do-sub">Sin cobro ni cuenta. Podrás cobrar después.</span>
            </span>
          </button>
        </div>

        <!-- 4. Selector de cargos -->
        <div v-if="showCharges" class="cols">
          <!-- Izquierda — catálogo -->
          <div class="catalog">
            <div class="srcseg">
              <button type="button" class="srcbtn" :class="{ active: tab === 'service' }" @click="tab = 'service'; query = ''">Servicios</button>
              <button type="button" class="srcbtn" :class="{ active: tab === 'product' }" @click="tab = 'product'; query = ''">Productos</button>
            </div>
            <input v-model="query" type="text" class="search" placeholder="Buscar por nombre o categoría…" />
            <ul class="catlist">
              <li v-for="it in catalog" :key="it.id" class="catrow" :class="{ disabled: it.soldOut }">
                <span class="cr-name">{{ it.name }}</span>
                <span v-if="it.soldOut" class="badge-out">Agotado</span>
                <span v-else class="cr-price">{{ formatMoney(it.price) }}</span>
                <button type="button" class="cr-add" :disabled="it.soldOut || busy" @click="addItem(tab, it.id, it.name, it.price, it.soldOut)">
                  <Plus :size="14" :stroke-width="2" />
                </button>
              </li>
              <li v-if="catalog.length === 0" class="empty">No hay ítems en este catálogo.</li>
            </ul>
          </div>

          <!-- Derecha — cargos seleccionados -->
          <div class="selected">
            <div class="selhead">{{ selectedHeading }}</div>

            <!-- Cargos previos (solo lectura) -->
            <template v-if="destino === 'existing' && existingCharges.length">
              <div class="existing-lab">Ya en la cuenta · solo lectura</div>
              <ul class="existing-list">
                <li v-for="c in existingCharges" :key="`${c.kind}-${c.id}`" class="existing-row">
                  <Check :size="13" :stroke-width="2" class="ex-check" />
                  <span class="ex-concept">{{ c.concept }}</span>
                  <span class="ex-date">{{ c.date.slice(5, 10) }}</span>
                  <span class="ex-amount">{{ formatMoney(c.amount) }}</span>
                </li>
              </ul>
              <div class="divider">Nuevos cargos</div>
            </template>

            <!-- Cargos nuevos editables -->
            <ul v-if="items.length" class="sel-list">
              <li v-for="line in items" :key="`${line.kind}-${line.id}`" class="selrow">
                <span class="sel-info">
                  <span class="sel-name">{{ line.name }}</span>
                  <span class="sel-kind">{{ line.kind === 'service' ? 'Servicio' : 'Producto' }} · {{ formatMoney(line.unitPrice) }}</span>
                </span>
                <span class="stepper">
                  <button type="button" class="st-btn" @click="setQty(line, line.qty - 1)"><Minus :size="12" :stroke-width="2.2" /></button>
                  <input
                    class="st-input"
                    type="text"
                    inputmode="numeric"
                    :value="line.qty"
                    @input="setQty(line, Number(($event.target as HTMLInputElement).value))"
                  />
                  <button type="button" class="st-btn" @click="setQty(line, line.qty + 1)"><Plus :size="12" :stroke-width="2.2" /></button>
                </span>
                <span class="sel-total">{{ formatMoney(line.unitPrice * line.qty) }}</span>
                <button type="button" class="sel-remove" title="Quitar" @click="removeLine(line)"><X :size="13" :stroke-width="1.9" /></button>
              </li>
            </ul>
            <div v-else class="sel-empty">
              <span>Aún no has agregado cargos.</span>
              <span class="hint">Elige del catálogo a la izquierda.</span>
            </div>
          </div>
        </div>

        <div v-if="retryHint" class="acct-none" style="margin-top: 14px">
          <Receipt :size="15" :stroke-width="1.8" />
          <span>
            Guardado parcial: reintenta <strong>{{ primaryLabel }}</strong> para registrar los
            cargos restantes.
          </span>
        </div>
      </template>
    </template>

    <template #footer-left>
      <span v-if="showCharges && items.length" class="foottotal">Total cargos <strong>{{ formatMoney(total) }}</strong></span>
    </template>
    <template #footer-actions>
      <button v-if="dismissible" type="button" class="btn-ghost" @click="emit('close')">Cancelar</button>
      <button type="button" class="btn-primary" :disabled="!canConfirm" @click="confirm">
        {{ busy ? 'Guardando…' : primaryLabel }}
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
.state { padding: 24px; text-align: center; color: var(--warm-500); font-size: 13px; }

/* 2. Banda de estado */
.acctcard {
  display: flex; align-items: center; gap: 12px; padding: 14px 16px; margin-bottom: 16px;
  background: var(--success-bg); border: 1px solid var(--success-dot); border-radius: 12px;
}
.ac-ic { width: 34px; height: 34px; border-radius: 9px; display: grid; place-items: center; flex-shrink: 0; background: color-mix(in oklch, var(--success-bg), white 35%); color: var(--success-fg); }
.ac-text { flex: 1; min-width: 0; }
.ac-title { font-size: 14px; font-weight: 600; color: var(--success-fg); }
.ac-sub { font-size: 12px; color: var(--warm-600); margin-top: 2px; }
.ac-saldo { text-align: right; flex-shrink: 0; }
.ac-saldo-lab { display: block; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--warm-500); }
.ac-saldo-val { font-family: var(--font-serif); font-size: 22px; color: var(--success-fg); letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
.acct-none {
  display: flex; align-items: center; gap: 9px; padding: 11px 14px; margin-bottom: 16px; font-size: 13px;
  background: oklch(95% 0.06 80); border: 1px solid oklch(88% 0.09 80); color: oklch(40% 0.10 70); border-radius: 10px;
}
.acct-none strong { font-weight: 600; }

/* 3. Selector de destino */
.dest { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 18px; }
@media (max-width: 640px) { .dest { grid-template-columns: 1fr; } }
.destopt {
  display: flex; align-items: flex-start; gap: 10px; text-align: left; font-family: inherit; cursor: pointer;
  padding: 13px; border-radius: 12px; background: var(--warm-50); border: 1px solid var(--warm-200);
  transition: border-color 0.12s, background 0.12s;
}
.destopt:hover { border-color: var(--amatista-300); }
.destopt.active { border-color: var(--amatista-500); background: var(--amatista-50); }
.do-check { width: 18px; height: 18px; border-radius: 6px; flex-shrink: 0; margin-top: 1px; display: grid; place-items: center; border: 1px solid var(--warm-300); background: var(--warm-50); color: white; }
.destopt.active .do-check { background: var(--amatista-600); border-color: var(--amatista-600); }
.do-text { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.do-title { font-size: 13px; font-weight: 600; color: var(--warm-900); line-height: 1.25; }
.do-sub { font-size: 11.5px; color: var(--warm-500); line-height: 1.35; }

/* 4. Dos columnas */
.cols { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: start; }
@media (max-width: 640px) { .cols { grid-template-columns: 1fr; } }

/* Catálogo */
.srcseg { display: inline-flex; background: var(--warm-150); border-radius: 9px; padding: 3px; gap: 3px; margin-bottom: 10px; }
.srcbtn { padding: 6px 14px; font-size: 12.5px; font-family: inherit; cursor: pointer; background: transparent; border: none; border-radius: 7px; color: var(--warm-600); font-weight: 500; }
.srcbtn.active { background: var(--warm-50); color: var(--amatista-700); box-shadow: 0 1px 2px rgba(20, 15, 30, 0.08); }
.search {
  width: 100%; background: var(--warm-50); border: 1px solid var(--warm-200); border-radius: 10px;
  padding: 10px 14px; font-family: inherit; font-size: 13.5px; color: var(--warm-900); outline: none; margin-bottom: 10px;
}
.search:focus { border-color: var(--amatista-500); box-shadow: 0 0 0 3px var(--amatista-50); }
.catlist { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; max-height: 280px; overflow: auto; }
.catrow {
  display: flex; align-items: center; gap: 12px; padding: 11px 14px;
  background: var(--warm-50); border: 1px solid var(--warm-200); border-radius: 10px;
  transition: border-color 0.12s, background 0.12s;
}
.catrow:hover:not(.disabled) { border-color: var(--amatista-300); background: var(--amatista-50); }
.catrow.disabled { opacity: 0.6; }
.cr-name { flex: 1; font-size: 13.5px; color: var(--warm-900); }
.cr-price { font-size: 13px; color: var(--warm-600); font-variant-numeric: tabular-nums; }
.badge-out { font-size: 10.5px; font-weight: 600; color: oklch(48% 0.18 25); background: oklch(95% 0.06 25); border-radius: 999px; padding: 2px 8px; }
.cr-add { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; flex-shrink: 0; border-radius: 8px; cursor: pointer; font-family: inherit; background: var(--amatista-50); color: var(--amatista-700); border: 1px solid var(--amatista-200); }
.cr-add:hover:not(:disabled) { background: var(--amatista-100); }
.cr-add:disabled { opacity: 0.4; cursor: not-allowed; }
.empty { font-size: 13px; color: var(--warm-500); text-align: center; padding: 16px; }

/* Cargos seleccionados */
.selected { border: 1px solid var(--warm-200); border-radius: 12px; background: var(--warm-50); overflow: hidden; display: flex; flex-direction: column; min-height: 240px; }
.selhead { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--warm-500); font-weight: 600; padding: 14px 16px; border-bottom: 1px solid var(--warm-200); }
.existing-lab { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--warm-400); font-weight: 600; padding: 10px 16px 6px; }
.existing-list { list-style: none; margin: 0; padding: 0 12px; display: flex; flex-direction: column; gap: 3px; opacity: 0.75; }
.existing-row { display: flex; align-items: center; gap: 8px; padding: 7px 6px; font-size: 12.5px; color: var(--warm-600); }
.ex-check { color: var(--warm-400); flex-shrink: 0; }
.ex-concept { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ex-date { font-size: 11px; color: var(--warm-400); font-variant-numeric: tabular-nums; }
.ex-amount { font-variant-numeric: tabular-nums; }
.divider { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--warm-500); font-weight: 600; padding: 8px 16px 6px; border-top: 1px solid var(--warm-150); margin-top: 6px; }
.sel-list { list-style: none; margin: 0; padding: 8px 12px 12px; display: flex; flex-direction: column; gap: 6px; }
.selrow { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 9px; background: var(--warm-100); }
.sel-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.sel-name { font-size: 13px; color: var(--warm-900); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sel-kind { font-size: 11px; color: var(--warm-500); }
.stepper { display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0; }
.st-btn { width: 20px; height: 20px; display: grid; place-items: center; border-radius: 6px; cursor: pointer; border: 1px solid var(--warm-200); background: var(--warm-50); color: var(--warm-700); }
.st-btn:hover { border-color: var(--amatista-300); color: var(--amatista-700); }
.st-input { width: 30px; text-align: center; font-family: inherit; font-size: 12.5px; font-weight: 600; color: var(--warm-800); border: 1px solid var(--warm-200); border-radius: 6px; padding: 3px 0; outline: none; background: var(--warm-50); font-variant-numeric: tabular-nums; }
.st-input:focus { border-color: var(--amatista-500); box-shadow: 0 0 0 2px var(--amatista-50); }
.sel-total { font-size: 13px; font-weight: 500; color: var(--warm-900); font-variant-numeric: tabular-nums; white-space: nowrap; min-width: 64px; text-align: right; }
.sel-remove { width: 22px; height: 22px; flex-shrink: 0; border: none; background: transparent; color: var(--warm-400); cursor: pointer; border-radius: 5px; display: grid; place-items: center; }
.sel-remove:hover { background: oklch(94% 0.05 25); color: oklch(48% 0.18 25); }
.sel-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; padding: 24px; text-align: center; font-size: 13px; color: var(--warm-400); }
.sel-empty .hint { font-size: 12px; color: var(--warm-400); }

/* Footer */
.foottotal { font-size: 13px; color: var(--warm-600); }
.foottotal strong { font-size: 15px; color: var(--amatista-700); font-variant-numeric: tabular-nums; margin-left: 4px; }
.btn-primary { font-family: inherit; font-size: 13.5px; font-weight: 500; padding: 10px 18px; border-radius: 9px; cursor: pointer; border: none; color: white; background: var(--amatista-700); }
.btn-primary:hover:not(:disabled) { filter: brightness(1.05); }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-ghost { font-family: inherit; font-size: 13.5px; font-weight: 500; padding: 10px 18px; border-radius: 9px; cursor: pointer; background: transparent; border: 1px solid var(--warm-200); color: var(--warm-700); }
.btn-ghost:hover { background: var(--warm-100); }
</style>
