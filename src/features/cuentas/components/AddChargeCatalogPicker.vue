<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { Plus, Search } from 'lucide-vue-next'
import { useTienda } from '@/features/tienda/composables/useTienda'
import { formatMoney } from '@/features/tienda/composables/pricing'

/** Lo que hay que cobrar: de qué pestaña sale, qué ítem y cuántas unidades. */
export interface CatalogChargeRequest {
  kind: 'service' | 'product'
  itemId: number
  qty: number
}

/**
 * Pestañas, buscador y lista de ítems del modal «Agregar cargo».
 *
 * Sale de `AddChargeModal` con sus reglas de CSS y con el estado que solo le
 * incumbe a él: pestaña activa, texto buscado y cantidad por producto. Se dibuja
 * dentro del cuerpo de `ModalShell`, que lo monta bajo `v-if="open"`: cada
 * apertura del modal trae una instancia nueva, así que la pestaña vuelve a
 * «Servicios», el buscador se vacía y las cantidades arrancan en 1 sin una sola
 * línea de reinicio.
 *
 * No llama a la API ni sabe de idempotencia: emite `add` y decide el padre, que
 * es quien tiene la clave del intento.
 */
const props = defineProps<{
  /** Hay un envío en curso en el padre: apaga los botones de todas las filas. */
  busy: boolean
}>()

const emit = defineEmits<{ add: [charge: CatalogChargeRequest] }>()

const tienda = useTienda()

const tab = ref<'service' | 'product'>('service')
const query = ref('')

// Cantidad por producto del catálogo (entero >= 1). Mismo saneo por dígitos que el cargo general.
// Solo aplica a la pestaña "Productos": el POST product-charge-open-accounts acepta `quantity`.
const qtyById = reactive<Record<number, string>>({})
function qtyStr(id: number): string {
  return qtyById[id] ?? '1'
}
function setQty(id: number, v: string): void {
  qtyById[id] = v.replace(/\D/g, '')
}
function qtyNum(id: number): number {
  return Number(qtyStr(id).replace(/\D/g, '')) || 0
}

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

function requestAdd(itemId: number): void {
  // Producto: la cantidad va en el POST (>= 1). Servicio: siempre 1 unidad.
  const qty = tab.value === 'product' ? qtyNum(itemId) : 1
  if (props.busy || (tab.value === 'product' && qty < 1)) return
  emit('add', { kind: tab.value, itemId, qty })
}

/**
 * El padre la llama tras un cargo de producto completado: esa fila vuelve a 1
 * unidad. Se limpia solo con éxito — si el POST falla, la cantidad escrita
 * sigue ahí para que el reintento sea el mismo cargo y no otro.
 */
function clearQty(id: number): void {
  Reflect.deleteProperty(qtyById, id)
}

defineExpose({ clearQty })
</script>

<template>
  <div class="tabs">
    <button
      type="button"
      class="tab"
      :class="{ active: tab === 'service' }"
      @click="tab = 'service'"
    >
      Servicios
    </button>
    <button
      type="button"
      class="tab"
      :class="{ active: tab === 'product' }"
      @click="tab = 'product'"
    >
      Productos
    </button>
  </div>
  <div class="search">
    <Search :size="14" :stroke-width="1.7" class="s-icon" />
    <input v-model="query" type="text" class="s-input ds-focus-ring" placeholder="Buscar…" />
  </div>
  <ul class="catalog ds-list-reset ds-stack">
    <li
      v-for="it in catalog"
      :key="it.id"
      class="cat-row ds-flex-row ds-flex-row--12 ds-hover-accent"
    >
      <span class="cat-name">{{ it.name }}</span>
      <span class="ds-num ds-meta-dark">
        {{ formatMoney(it.price) }}
        <span v-if="tab === 'product' && qtyNum(it.id) > 1" class="cat-sub">
          · {{ formatMoney(it.price * qtyNum(it.id)) }}
        </span>
      </span>
      <input
        v-if="tab === 'product'"
        class="qty-input ds-focus-ring"
        :class="{ invalid: qtyNum(it.id) < 1 }"
        type="text"
        inputmode="numeric"
        aria-label="Cantidad"
        :value="qtyStr(it.id)"
        @input="setQty(it.id, ($event.target as HTMLInputElement).value)"
      />
      <button
        type="button"
        class="add-btn ds-tone--accent-soft"
        :class="{ 'ds-is-disabled': busy || (tab === 'product' && qtyNum(it.id) < 1) }"
        :disabled="busy || (tab === 'product' && qtyNum(it.id) < 1)"
        @click="requestAdd(it.id)"
      >
        <Plus :size="14" :stroke-width="1.9" /> Agregar
      </button>
    </li>
    <li v-if="catalog.length === 0" class="ds-empty ds-empty--tight">
      No hay ítems en este catálogo.
    </li>
  </ul>
</template>

<style scoped>
/* Layout via primitivas: .ds-stack, .ds-flex-row(--12), .ds-list-reset,
   .ds-focus-ring, .ds-num, .ds-meta-dark, .ds-tone--accent-soft,
   .ds-is-disabled. */
.tabs {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid var(--warm-200);
  margin-bottom: 12px;
}

.tab {
  padding: 8px 14px;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  background: transparent;
  border: none;
  color: var(--warm-600);
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}
.tab.active {
  color: var(--amatista-700);
  border-bottom-color: var(--amatista-700);
  font-weight: 500;
}
.search {
  position: relative;
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}
.s-icon {
  position: absolute;
  left: 13px;
  color: var(--warm-500);
}

.s-input {
  width: 100%;
  background: var(--warm-50);
  border: 1px solid var(--warm-450);
  border-radius: 10px;
  padding: 10px 14px 10px 38px;
  font-family: inherit;
  font-size: 13.5px;
  color: var(--warm-900);
  outline: none;
}
.catalog {
  gap: 6px;
  max-height: 320px;
  overflow: auto;
}

.cat-row {
  padding: 11px 14px;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 10px;
  transition:
    border-color 0.12s,
    background 0.12s;
}

/* El hover de la fila es `.ds-hover-accent` (primitives.css). Pesa (0,3,0) y
   gana al `.cat-row[data-v-…]` de (0,2,0) sin tocar la regla base, así que el
   `:hover` local se borra en vez de dejarlo compitiendo. Su tercera declaración
   (`color: amatista-700`) no se ve: `.cat-name`, `.ds-meta-dark`, `.cat-sub`,
   `.qty-input` y `.add-btn` fijan su propio color y la fila no tiene texto
   directo. */

/* `flex: 1` a secas, sin el `min-width: 0` de `.ds-flex-fill`: el nombre del
   ítem no lleva elipsis y no debe encoger por debajo de su contenido. */
.cat-name {
  flex: 1;
  font-size: 13.5px;
  color: var(--warm-900);
}
.cat-sub {
  color: var(--amatista-700);
  font-weight: 500;
}

.qty-input {
  width: 46px;
  text-align: center;
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  color: var(--warm-800);
  border: 1px solid var(--warm-450);
  border-radius: 8px;
  padding: 6px 0;
  outline: none;
  background: var(--warm-50);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}
.qty-input.invalid {
  border-color: oklch(60% 0.18 25deg);
  box-shadow: 0 0 0 3px var(--danger-100);
}

/* El estado apagado lo pone `.ds-is-disabled` (primitives.css), enganchado
   con `:class` en el template — la primitiva no sustituye al atributo nativo. */
.add-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: 12.5px;
  font-weight: 500;
  border-radius: 8px;
  cursor: pointer;
  font-family: inherit;
  border: 1px solid var(--amatista-200);
}
.add-btn:hover:not(:disabled) {
  background: var(--amatista-100);
}
</style>
