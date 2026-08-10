<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ClipboardList, History, Search } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import type { ProductResponse, CategoryResponse } from '../types/tienda'
import type { StockView } from '../types/inventory'

/** Una hoja de conteo lista para confirmar. Solo las líneas realmente contadas. */
export interface CountDraft {
  note: string | null
  lines: { productId: number; countedQuantity: number }[]
}

const props = defineProps<{
  open: boolean
  branchName?: string
  products: ProductResponse[]
  categories: CategoryResponse[]
  stockByProduct: Record<number, StockView>
}>()
const emit = defineEmits<{ close: []; confirm: [draft: CountDraft]; history: [] }>()

/** Valor contado por productId (string del input; vacío = no contado → no se incluye). */
const counted = reactive<Record<number, string>>({})
const note = ref('')
const search = ref('')
const catFilter = ref('')
const submitted = ref(false)

watch(
  () => props.open,
  (open) => {
    if (open) {
      for (const k of Object.keys(counted)) Reflect.deleteProperty(counted, Number(k))
      note.value = ''
      search.value = ''
      catFilter.value = ''
      submitted.value = false
    }
  },
)

/** Sanitiza a enteros ≥ 0 (solo dígitos). */
function onInput(productId: number, ev: Event) {
  counted[productId] = (ev.target as HTMLInputElement).value.replace(/\D/g, '')
}

function systemOf(id: number): number {
  return props.stockByProduct[id]?.quantity ?? 0
}
/** Diferencia contada − sistema, o null si aún no se contó esa fila. */
function diffOf(id: number): number | null {
  const raw = counted[id]
  if (raw == null || raw === '') return null
  return Number(raw) - systemOf(id)
}

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return props.products.filter((p) => {
    if (catFilter.value && String(p.productCategory.id) !== catFilter.value) return false
    if (q && !(p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q))) return false
    return true
  })
})

/** Líneas efectivamente contadas (input no vacío). */
const countedLines = computed(() =>
  props.products
    .filter((p) => counted[p.id] != null && counted[p.id] !== '')
    .map((p) => ({ productId: p.id, countedQuantity: Number(counted[p.id]) })),
)
const countedCount = computed(() => countedLines.value.length)
const diffCount = computed(
  () => countedLines.value.filter((l) => l.countedQuantity !== systemOf(l.productId)).length,
)
const canConfirm = computed(() => countedCount.value > 0)

function submit() {
  submitted.value = true
  if (!canConfirm.value) return
  emit('confirm', { note: note.value.trim() || null, lines: countedLines.value })
}
</script>

<template>
  <ModalShell
    :open="open"
    title="Conteo físico"
    :subtitle="branchName ? `Hoja de conteo · ${branchName}` : 'Hoja de conteo'"
    :icon="ClipboardList"
    :width="820"
    @close="emit('close')"
  >
    <template #body>
      <p class="hint">
        Escribe lo que contaste físicamente en <strong>Contado</strong>. Solo se ajustan las filas
        que llenes (puedes contar por categoría para hacer conteos cíclicos). La diferencia se
        aplica como ajuste automático.
      </p>

      <div class="filters">
        <div class="search">
          <Search :size="15" :stroke-width="1.7" class="s-icon" />
          <input v-model="search" type="search" placeholder="Buscar nombre o SKU…" />
        </div>
        <select v-model="catFilter" class="fsel">
          <option value="">Todas las categorías</option>
          <option v-for="c in categories" :key="c.id" :value="String(c.id)">{{ c.name }}</option>
        </select>
      </div>

      <div v-if="submitted && !canConfirm" class="ds-banner ds-banner--error">
        Cuenta al menos un producto antes de confirmar.
      </div>

      <div class="scroll">
        <table class="table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Categoría</th>
              <th class="num">Sistema</th>
              <th class="num">Contado</th>
              <th class="num">Diferencia</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="filtered.length === 0">
              <td colspan="5" class="ds-empty">Sin productos para el filtro.</td>
            </tr>
            <tr v-for="p in filtered" v-else :key="p.id">
              <td class="tname">
                {{ p.name }} <span class="sku">{{ p.code }}</span>
              </td>
              <td class="tcat">{{ p.productCategory.name }}</td>
              <td class="num sys">{{ systemOf(p.id) }}</td>
              <td class="num">
                <input
                  class="count-input"
                  type="text"
                  inputmode="numeric"
                  placeholder="—"
                  :value="counted[p.id] ?? ''"
                  @input="onInput(p.id, $event)"
                />
              </td>
              <td class="num">
                <span
                  v-if="diffOf(p.id) !== null"
                  class="diff"
                  :class="{
                    zero: diffOf(p.id) === 0,
                    neg: (diffOf(p.id) ?? 0) < 0,
                    pos: (diffOf(p.id) ?? 0) > 0,
                  }"
                  >{{ (diffOf(p.id) ?? 0) > 0 ? '+' : '' }}{{ diffOf(p.id) }}</span
                >
                <span v-else class="muted">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <label class="note">
        <span>Nota (opcional)</span>
        <input
          v-model="note"
          type="text"
          placeholder="Conteo semanal, cierre de mes…"
          maxlength="255"
        />
      </label>
    </template>

    <template #footer-left>
      <button type="button" class="link" @click="emit('history')">
        <History :size="14" :stroke-width="1.8" /> Historial
      </button>
      <span class="counter">{{ countedCount }} contado(s) · {{ diffCount }} con diferencia</span>
    </template>
    <template #footer-actions>
      <button type="button" class="ds-btn ds-btn--ghost ds-btn--lg" @click="emit('close')">
        Cancelar
      </button>
      <button
        type="button"
        class="ds-btn ds-btn--primary ds-btn--lg"
        :disabled="!canConfirm"
        @click="submit"
      >
        Confirmar conteo
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
.hint {
  margin: 0 0 12px;
  font-size: 12.5px;
  color: var(--warm-600);
  line-height: 1.5;
}
.filters {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.search {
  display: flex;
  align-items: center;
  gap: 9px;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 9px;
  padding: 9px 12px;
  max-width: 320px;
  flex: 1;
}
.search:focus-within {
  border-color: var(--amatista-500);
  box-shadow: var(--ring);
}
.s-icon {
  color: var(--warm-500);
  flex-shrink: 0;
}
.search input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-family: inherit;
  font-size: 13px;
  color: var(--warm-900);
  min-width: 0;
}

.fsel {
  appearance: none;
  border: 1px solid var(--warm-200);
  background: var(--warm-50);
  border-radius: 9px;
  padding: 9px 30px 9px 13px;
  font-family: inherit;
  font-size: 13px;
  color: var(--warm-800);
  cursor: pointer;
  background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='%23999' stroke-width='1.5' viewBox='0 0 24 24'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 11px center;
}
.fsel:focus {
  outline: none;
  border-color: var(--amatista-500);
  box-shadow: var(--ring);
}
.scroll {
  max-height: 46vh;
  overflow-y: auto;
  border: 1px solid var(--warm-200);
  border-radius: 10px;
}
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
  background: var(--warm-50);
}
.table th {
  position: sticky;
  top: 0;
  text-align: left;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--warm-500);
  font-weight: 600;
  padding: 9px 12px;
  background: var(--warm-100);
  border-bottom: 1px solid var(--warm-200);
  z-index: 1;
}
.table td {
  padding: 7px 12px;
  border-bottom: 1px solid var(--warm-150);
  color: var(--warm-800);
}
.table tbody tr:last-child td {
  border-bottom: none;
}
.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.tname {
  font-weight: 500;
  color: var(--warm-900);
}
.tcat {
  color: var(--warm-600);
}
.sku {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--warm-500);
}
.sys {
  color: var(--warm-600);
}
.count-input {
  width: 76px;
  text-align: right;
  border: 1px solid var(--warm-200);
  background: var(--warm-50);
  border-radius: 7px;
  padding: 5px 8px;
  font-family: inherit;
  font-size: 12.5px;
  color: var(--warm-900);
  font-variant-numeric: tabular-nums;
}
.count-input:focus {
  outline: none;
  border-color: var(--amatista-500);
  box-shadow: var(--ring);
}
.diff {
  font-weight: 600;
}
.diff.zero {
  color: oklch(55% 0.12 150deg);
}
.diff.neg {
  color: oklch(52% 0.18 25deg);
}
.diff.pos {
  color: oklch(52% 0.12 70deg);
}
.muted {
  color: var(--warm-400);
}
.note {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 14px;
  font-size: 12px;
  color: var(--warm-600);
}
.note input {
  border: 1px solid var(--warm-200);
  background: var(--warm-50);
  border-radius: 9px;
  padding: 9px 12px;
  font-family: inherit;
  font-size: 13px;
  color: var(--warm-900);
}
.note input:focus {
  outline: none;
  border-color: var(--amatista-500);
  box-shadow: var(--ring);
}
.link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: none;
  color: var(--amatista-700);
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  padding: 0;
}
.link:hover {
  text-decoration: underline;
}
.counter {
  font-size: 12px;
  color: var(--warm-500);
  margin-left: 12px;
}
</style>
