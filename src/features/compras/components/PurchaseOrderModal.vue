<script setup lang="ts">
import { useUnsavedChangesGuard } from '@/composables/useUnsavedChangesGuard'
import { nextRowUid } from '@/composables/rowUid'
import { computed, nextTick, reactive, ref, useId, watch } from 'vue'
import { ClipboardList, Plus, Trash2 } from 'lucide-vue-next'
import ErrorSummary from '@/components/feedback/ErrorSummary.vue'
import ModalShell from '@/components/ui/ModalShell.vue'
import BaseField from '@/components/ui/BaseField.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'
import DateInput from '@/components/ui/DateInput.vue'
import { useSuppliers } from '../composables/useSuppliers'
import { useTienda } from '@/features/tienda/composables/useTienda'
import { purchaseOrdersApi } from '../api/purchaseOrders.api'
import { formatMoney } from '@/features/tienda/composables/pricing'
import { getProblemDetailMessage } from '@/services/http/http.client'
import { scrollToFirstError } from '@/composables/scrollToError'
import type { PurchaseOrder } from '../types/compras'
import ComprasIconButton from './ComprasIconButton.vue'

const props = defineProps<{ open: boolean; order: PurchaseOrder | null }>()
const emit = defineEmits<{ close: []; saved: [] }>()

const { all: suppliers, loadAll } = useSuppliers()
const tienda = useTienda()

const isEdit = computed(() => props.order != null)

interface LineRow {
  /** Clave estable de la fila. Estas lineas nacen vacias, asi que no hay
   *  ningun dato del que derivarla. Ver `rowUid`. */
  uid: number
  productId: string
  quantity: string
  unitCost: string
}
const form = reactive({
  supplierId: '' as string,
  orderDate: '',
  expectedDate: '',
  notes: '',
})
const lines = ref<LineRow[]>([])

// Sucia solo si el modal esta abierto Y hay algo que perder de verdad: una
// linea recien anadida esta vacia y no cuenta, o el aviso saltaria siempre.
useUnsavedChangesGuard(
  () =>
    props.open &&
    (form.supplierId !== '' ||
      form.notes.trim() !== '' ||
      lines.value.some((l) => l.productId !== '' || l.unitCost !== '')),
)
const submitted = ref(false)
const saving = ref(false)
const serverError = ref<string | null>(null)

const supplierOptions = computed(() =>
  suppliers.value.map((s) => ({ value: String(s.id), label: s.name })),
)
const productOptions = computed(() =>
  tienda.products.value.map((p) => ({ value: String(p.id), label: `${p.name} (${p.code})` })),
)

/**
 * Los importes y las cantidades se teclean en es-CO, con COMA decimal
 * (`1500,50`). `Number()` a secas devuelve `NaN` sobre eso, y el `|| 0` que
 * había detrás lo convertía en **cero**: una orden de compra se guardaba con
 * costo cero sin un solo aviso, porque `unitCost` era el ÚNICO de los diez
 * campos de importe del tenant al que le faltaba el `.replace(',', '.')`.
 *
 * Devuelve `null` —y no 0— cuando el texto no es un número: cero es un importe
 * legítimo y confundirlo con «no se pudo leer» es justo el defecto que esto
 * cierra. Quien necesite pintar usa `?? 0`; quien valide comprueba el `null`.
 */
function parseAmount(raw: string): number | null {
  const t = raw.trim().replace(/\s/g, '').replace(',', '.')
  if (t === '') return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

/** Subtotal de una línea, ya con la coma decimal resuelta. */
function lineTotal(l: LineRow): number {
  return (parseAmount(l.quantity) ?? 0) * (parseAmount(l.unitCost) ?? 0)
}

const total = computed(() => lines.value.reduce((acc, l) => acc + lineTotal(l), 0))

const linesValid = computed(
  () =>
    lines.value.length > 0 &&
    lines.value.every((l) => {
      const qty = parseAmount(l.quantity)
      const cost = parseAmount(l.unitCost)
      // El costo tiene que estar ESCRITO: dejarlo vacío pasaba por `Number('') === 0`
      // y la orden se guardaba a cero. Ahora hay que teclearlo, aunque sea `0`.
      return !!l.productId && qty !== null && qty > 0 && cost !== null && cost >= 0
    }),
)
const errors = computed(() => ({
  supplierId: form.supplierId ? null : 'Selecciona el proveedor.',
  orderDate: form.orderDate ? null : 'Fecha de orden obligatoria.',
  lines: linesValid.value
    ? null
    : 'Cada línea necesita producto, cantidad mayor a 0 y costo unitario. Los decimales van con coma: 1500,50.',
}))
const hasErrors = computed(() => Object.values(errors.value).some((e) => e !== null))
function err(k: keyof typeof errors.value) {
  return submitted.value ? (errors.value[k] ?? undefined) : undefined
}

/** FORM-05 — resumen de errores, en el orden VISUAL del formulario (WCAG §2.4.3). */
const FIELD_LABEL = {
  supplierId: 'Proveedor',
  orderDate: 'Fecha de orden',
  lines: 'Líneas',
} as const
/**
 * ids de los CONTROLES a los que enlaza el resumen. El padre no puede adivinar
 * el `useId()` que `BaseField` genera dentro, así que se los pasa él (prop
 * `id`); `useId()` aquí evita choques entre instancias. `lines` NO es un
 * control: es el grupo de filas, y su ancla es el mensaje de error del grupo,
 * que sí es un elemento único y enfocable (`tabindex="-1"`).
 */
const uid = useId()
const ID = Object.fromEntries(
  (Object.keys(FIELD_LABEL) as (keyof typeof FIELD_LABEL)[]).map((k) => [k, `${uid}-${k}`]),
) as Record<keyof typeof FIELD_LABEL, string>
const summaryItems = computed(() =>
  (Object.keys(FIELD_LABEL) as (keyof typeof FIELD_LABEL)[]).flatMap((k) => {
    const text = err(k)
    // La etiqueta va DELANTE del texto literal: «Fecha de orden obligatoria.»
    // se lee solo, pero el resto no, y un enlace tiene que decir a dónde lleva.
    return text ? [{ id: ID[k], text: `${FIELD_LABEL[k]}: ${text}` }] : []
  }),
)
const summary = ref<{ focus: () => void } | null>(null)

/**
 * El desplazamiento sin foco deja al usuario de teclado donde estaba (WCAG
 * §2.4.3): la pantalla se mueve y él no. El resumen lleva `tabindex="-1"` justo
 * para poder recibirlo.
 */
async function focusSummary() {
  await nextTick()
  summary.value?.focus()
}

function addLine() {
  lines.value.push({ uid: nextRowUid(), productId: '', quantity: '1', unitCost: '' })
}
function removeLine(uid: number) {
  lines.value = lines.value.filter((l) => l.uid !== uid)
}

watch(
  () => props.open,
  async (o) => {
    if (!o) return
    submitted.value = false
    serverError.value = null
    await Promise.all([loadAll(true), tienda.refresh()])
    const po = props.order
    form.supplierId = po ? String(po.supplier.id) : ''
    form.orderDate = po?.orderDate ?? new Date().toISOString().slice(0, 10)
    form.expectedDate = po?.expectedDate ?? ''
    form.notes = po?.notes ?? ''
    lines.value = po
      ? po.lines.map((l) => ({
          uid: nextRowUid(),
          productId: String(l.product.id),
          quantity: String(l.quantityOrdered),
          unitCost: String(l.unitCost),
        }))
      : [{ uid: nextRowUid(), productId: '', quantity: '1', unitCost: '' }]
  },
)

async function submit() {
  if (saving.value) return
  submitted.value = true
  serverError.value = null
  if (hasErrors.value) {
    void focusSummary()
    void scrollToFirstError()
    return
  }
  saving.value = true
  try {
    const payload = {
      supplierId: Number(form.supplierId),
      orderDate: form.orderDate,
      expectedDate: form.expectedDate || null,
      notes: form.notes.trim() || null,
      lines: lines.value.map((l) => ({
        productId: Number(l.productId),
        // `linesValid` ya garantizó que ninguno de los dos es `null` aquí.
        quantityOrdered: parseAmount(l.quantity) ?? 0,
        unitCost: parseAmount(l.unitCost) ?? 0,
      })),
    }
    if (isEdit.value && props.order) {
      await purchaseOrdersApi.update(props.order.id, { ...payload, version: props.order.version })
    } else {
      await purchaseOrdersApi.create(payload)
    }
    emit('saved')
    emit('close')
  } catch (e) {
    serverError.value = getProblemDetailMessage(e, 'No se pudo guardar la orden de compra')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <ModalShell
    :open="open"
    :title="isEdit ? 'Editar orden de compra' : 'Nueva orden de compra'"
    subtitle="Pedido de productos a un proveedor"
    :icon="ClipboardList"
    :width="720"
    @close="emit('close')"
  >
    <template #body>
      <!-- FORM-05 · resumen de errores. `role="alert"`, `tabindex="-1"` y
           `data-error-anchor` los pone ya la primitiva; lo nuevo es que cada
           problema ENLAZA con su campo, que es lo que la lista a mano no podía
           hacer sin conocer los ids de antemano. El encabezado por defecto
           («…en este formulario») sustituye al «…en esta orden» que decía aquí:
           la primitiva es la dueña del texto, y ese matiz no vale una prop. -->
      <ErrorSummary ref="summary" :items="summaryItems" />
      <p v-if="serverError" class="ds-server-error" role="alert" data-error-anchor>
        {{ serverError }}
      </p>
      <div class="head-grid">
        <BaseField :id="ID.supplierId" label="Proveedor" required :error="err('supplierId')">
          <BaseSelect
            v-model="form.supplierId"
            :options="supplierOptions"
            placeholder="Selecciona proveedor"
            :invalid="!!err('supplierId')"
          />
        </BaseField>
        <BaseField :id="ID.orderDate" label="Fecha de orden" required :error="err('orderDate')">
          <DateInput v-model="form.orderDate" :invalid="!!err('orderDate')" />
        </BaseField>
        <BaseField label="Fecha esperada" hint="Opcional">
          <DateInput v-model="form.expectedDate" :min="form.orderDate || undefined" />
        </BaseField>
      </div>

      <div class="lines">
        <div class="lines-head">
          <h3>Líneas</h3>
          <button
            type="button"
            class="ds-btn ds-btn--neutral ds-btn--strong ds-btn--sm"
            @click="addLine"
          >
            <Plus :size="14" /> Agregar
          </button>
        </div>
        <!-- Ancla del ítem «Líneas» del resumen: el error es del GRUPO de filas,
             no de un control, así que el enlace trae aquí el foco y no a una
             celda cualquiera de la rejilla. -->
        <p v-if="err('lines')" :id="ID.lines" class="line-error" tabindex="-1">
          {{ err('lines') }}
        </p>
        <!-- Esta rejilla NO tiene fila de encabezados: el placeholder es hoy el
             ÚNICO nombre de cada columna, así que NO se toca su texto todavía
             (cubo B de la spec de placeholders). Primero hace falta el nombre
             accesible, y no se puede poner desde aquí: un `aria-label` suelto cae
             por fallthrough en la raíz de las primitivas —`<label>` en BaseInput,
             `<div>` en BaseSelect—, no en el control real. Ver issue de nombres
             accesibles en las rejillas de compras. -->
        <div v-for="l in lines" :key="l.uid" class="line-row">
          <BaseSelect v-model="l.productId" :options="productOptions" placeholder="Producto" />
          <BaseInput v-model="l.quantity" placeholder="Cant." inputmode="numeric" />
          <BaseInput v-model="l.unitCost" placeholder="Costo unit." inputmode="decimal" />
          <span class="ds-num ds-meta-dark ds-meta-dark--sm">{{ formatMoney(lineTotal(l)) }}</span>
          <ComprasIconButton tone="danger" @click="removeLine(l.uid)">
            <Trash2 :size="14" />
          </ComprasIconButton>
        </div>
      </div>

      <BaseField label="Notas" hint="Opcional">
        <BaseTextarea v-model="form.notes" placeholder="Observaciones…" :rows="2" />
      </BaseField>

      <div class="total-row">
        Total estimado: <strong>{{ formatMoney(total) }}</strong>
      </div>
    </template>
    <template #footer-actions>
      <button
        type="button"
        class="ds-btn ds-btn--neutral ds-btn--strong"
        :disabled="saving"
        @click="emit('close')"
      >
        Cancelar
      </button>
      <button
        type="button"
        class="ds-btn ds-btn--solid ds-btn--strong"
        :disabled="saving"
        @click="submit"
      >
        {{ saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear orden' }}
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
/* `.ds-num` + `.ds-meta-dark --sm` dan el subtotal de línea; `.head-grid` sigue
   local (son 3 columnas y ninguna primitiva las replica). */
.head-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px 18px;
  margin-bottom: 18px;
}

@media (width <= 640px) {
  .head-grid {
    grid-template-columns: 1fr;
  }
}

.lines {
  margin-bottom: 16px;
}

.lines-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.lines-head h3 {
  margin: 0;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--warm-500);
}

.line-row {
  display: grid;
  grid-template-columns: 2.4fr 0.8fr 1fr 1.1fr auto;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}

.line-error {
  color: var(--danger-600);
  font-size: 12.5px;
  margin: 0 0 8px;
}

.total-row {
  text-align: right;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--warm-200);
  font-size: 14px;
  color: var(--warm-700);
}

.total-row strong {
  color: var(--warm-900);
}

/* caja/compras usan un amatista un punto más claro que el resto. */
.ds-btn--solid {
  --ds-btn-solid-bg: var(--amatista-600);
}
</style>
