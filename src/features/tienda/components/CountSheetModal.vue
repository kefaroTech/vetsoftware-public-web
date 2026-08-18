<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ClipboardList, History } from 'lucide-vue-next'
import ModalShell from '@/components/ui/ModalShell.vue'
import DiffCell from './DiffCell.vue'
import FilterSelect from './FilterSelect.vue'
import LinkButton from './LinkButton.vue'
import SearchField from './SearchField.vue'
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
        <SearchField v-model="search" fill size="sm" placeholder="Buscar nombre o SKU…" />
        <FilterSelect v-model="catFilter" size="sm">
          <option value="">Todas las categorías</option>
          <option v-for="c in categories" :key="c.id" :value="String(c.id)">{{ c.name }}</option>
        </FilterSelect>
      </div>

      <div v-if="submitted && !canConfirm" class="ds-banner ds-banner--error">
        Cuenta al menos un producto antes de confirmar.
      </div>

      <div class="scroll">
        <table class="ds-table ds-table--dense">
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
              <td class="tname ds-text-strong">
                {{ p.name }}
                <span class="sku ds-meta ds-meta--caption">{{ p.code }}</span>
              </td>
              <td class="tcat">{{ p.productCategory.name }}</td>
              <td class="num sys">{{ systemOf(p.id) }}</td>
              <td class="num">
                <input
                  class="count-input ds-focus-ring ds-focus-ring--no-outline"
                  type="text"
                  inputmode="numeric"
                  placeholder="—"
                  :value="counted[p.id] ?? ''"
                  @input="onInput(p.id, $event)"
                />
              </td>
              <td class="num">
                <DiffCell v-if="diffOf(p.id) !== null" :value="diffOf(p.id) ?? 0" />
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
          class="ds-focus-ring ds-focus-ring--no-outline"
          type="text"
          placeholder="Conteo semanal, cierre de mes…"
          maxlength="255"
        />
      </label>
    </template>

    <template #footer-left>
      <LinkButton @click="emit('history')">
        <History :size="14" :stroke-width="1.8" /> Historial
      </LinkButton>
      <span class="counter ds-meta"
        >{{ countedCount }} contado(s) · {{ diffCount }} con diferencia</span
      >
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
.scroll {
  max-height: 46vh;
  overflow-y: auto;
  border: 1px solid var(--warm-200);
  border-radius: 10px;
}

/* La tabla es `.ds-table ds-table--dense` (primitives.css) y la regla `.table`
   local se borró entera porque la primitiva la REEMPLAZA, no convive con ella.
   El `.ds-empty` del `<td colspan>` vacío lo resuelve la excepción
   `.ds-table td.ds-empty` de `primitives.css` (0,2,1), que le gana a
   `.ds-table--dense td` (0,1,1). Aquí sólo hay que no estorbarla — ver el
   punto 3.

   Quedan tres cosas que la primitiva no puede saber y que sí son de este
   modal: */

/* 1. La caja (borde, radio y recorte) la pone `.scroll`, no la tabla. Si la
      tabla trajera la suya se vería una segunda línea justo dentro del marco
      del contenedor, y peor: el `overflow: hidden` de `.ds-table` convertiría a
      la propia tabla en el contenedor de scroll más cercano y el encabezado
      sticky dejaría de pegarse. */
.ds-table {
  overflow: visible;
  border: none;
  border-radius: 0;
}

/* 2. El encabezado se queda fijo mientras se recorre la hoja dentro del alto de
      46vh de `.scroll`. Es comportamiento del modal, no de la primitiva. */
.ds-table th {
  position: sticky;
  top: 0;
  z-index: 1;
}

/* 3. Densidad propia: 7px de alto de celda frente a los 9px del resto de la
      familia densa. Es intencionado, no deriva — esta hoja lista el catálogo
      entero para teclear cantidad por fila, así que caben ~2 filas más por
      pantalla sin tocar el tamaño de letra. Sólo se sobrescribe `padding`.

      El `:not(.ds-empty)` acota esa desviación a las filas de datos, que son a
      las que va dirigida. Sin él el selector pesa (0,2,1) con su `data-v` —
      exactamente lo mismo que la excepción `.ds-table td.ds-empty` de
      `primitives.css` —, y al empatar desempata el orden de inserción, que
      favorece a la hoja scoped: la celda vacía se quedaba en 7×12 en lugar de
      recibir el estado vacío. Excluyéndola, esta regla sube a (0,3,1) para las
      filas de datos y deja de cubrir la celda vacía, que cae limpiamente en la
      excepción. Es el contrato que quedó escrito en `primitives.css`: quien se
      desvía acota su desviación, en vez de pedirle más peso a la primitiva. */
.ds-table td:not(.ds-empty) {
  padding: var(--space-7) var(--space-12);
}

/* La cifra: `text-align` se separa a `td.num` porque `.ds-table th` alinea a la
   izquierda con menos peso que `.num`, y estos encabezados iban a la izquierda
   antes de migrar (se lo ganaba `.table th`). */
.num {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
td.num {
  text-align: right;
}

/* El `font-weight` Y el `color` los pone `.ds-text-strong` (primitives.css)
   desde el marcado —sobre el `<td>`, no sobre un `<span>` alrededor del
   nombre: el `.sku` que va dentro hereda hoy ese peso 500 y envolver sólo el
   nombre se lo quitaría—. El `color` le llega vía la excepción
   `.ds-table td.ds-text-strong` (auditoría FE-08 fase final), que le gana a
   `.ds-table td` (0,1,1) por nombre; ya no queda CSS local para esta celda. */
.tcat {
  color: var(--warm-600);
}

/* El par color+tamaño es `.ds-meta ds-meta--caption` (primitives.css:
   warm-500 + 11px). Va sobre el `<span>`, no sobre el `<td>`, así que
   `.ds-table td` (0,1,1) no compite y la primitiva gana con su peso natural.
   Sólo queda la fuente mono. */
.sku {
  font-family: var(--font-mono);
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

/* Los dos campos de este modal llevan `.ds-focus-ring ds-focus-ring--no-outline`
   (primitives.css): la primitiva pone el `box-shadow` y el `outline: none`, y
   esas dos declaraciones locales se borraron. Sólo se conserva el
   `border-color`, porque la primitiva pesa (0,2,0) y no gana de forma estable
   contra las bases que declaran el atajo `border` —`.count-input[data-v]`
   (0,2,0), empate que resolvería el orden del bundle, y `.note input[data-v]`
   (0,2,1), que directamente le gana—. */
.count-input:focus {
  border-color: var(--amatista-500);
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
  border-color: var(--amatista-500);
}
.counter {
  margin-left: 12px;
}
</style>
