<script setup lang="ts">
import { useUnsavedChangesGuard } from '@/composables/useUnsavedChangesGuard'
import { nextRowUid } from '@/composables/rowUid'
import { computed, reactive, ref, watch } from 'vue'
import { PackageCheck, Plus, Trash2 } from 'lucide-vue-next'
import ModalShell from '@/components/ui/ModalShell.vue'
import BaseField from '@/components/ui/BaseField.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'
import DateInput from '@/components/ui/DateInput.vue'
import { useSuppliers } from '../composables/useSuppliers'
import { useTienda } from '@/features/tienda/composables/useTienda'
import { usePurchasesStore } from '../stores/purchases.store'
import { goodsReceiptsApi } from '../api/goodsReceipts.api'
import { getProblemDetailMessage } from '@/services/http/http.client'
import type { PurchaseOrder } from '../types/compras'
import ComprasIconButton from './ComprasIconButton.vue'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: []; saved: [] }>()

const { all: suppliers, loadAll } = useSuppliers()
const tienda = useTienda()
const purchases = usePurchasesStore()

interface LineRow {
  /** Clave estable de la fila. Estas lineas nacen vacias, asi que no hay
   *  ningun dato del que derivarla. Ver `rowUid`. */
  uid: number
  productId: string
  purchaseOrderLineId: number | null
  lotNumber: string
  expireDate: string
  quantity: string
  unitCost: string
}
const form = reactive({
  supplierId: '' as string,
  purchaseOrderId: '' as string,
  receiptDate: '',
  supplierInvoiceNumber: '',
  notes: '',
})
const lines = ref<LineRow[]>([])

useUnsavedChangesGuard(
  () =>
    props.open &&
    (form.supplierId !== '' ||
      form.supplierInvoiceNumber.trim() !== '' ||
      form.notes.trim() !== '' ||
      lines.value.some((l) => l.productId !== '' || l.lotNumber !== '' || l.unitCost !== '')),
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
// Órdenes de compra abiertas del proveedor seleccionado (para prefill de líneas).
const orderOptions = computed(() => {
  const open = purchases.orders.filter(
    (o) =>
      (o.status === 'PLACED' || o.status === 'PARTIALLY_RECEIVED') &&
      (!form.supplierId || String(o.supplier.id) === form.supplierId),
  )
  return [
    { value: '', label: 'Sin orden (recepción directa)' },
    ...open.map((o) => ({ value: String(o.id), label: `OC #${o.id} · ${o.supplier.name}` })),
  ]
})

/**
 * Mismo defecto que en `PurchaseOrderModal`: los importes se teclean en es-CO
 * con COMA decimal (`1500,50`) y `Number()` a secas da `NaN`; el costo vacío
 * pasaba por `Number('') === 0` y la recepción entraba a inventario con costo
 * cero sin ningún aviso. `null` = no se pudo leer, que NO es lo mismo que cero.
 */
function parseAmount(raw: string): number | null {
  const t = raw.trim().replace(/\s/g, '').replace(',', '.')
  if (t === '') return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

const linesValid = computed(
  () =>
    lines.value.length > 0 &&
    lines.value.every((l) => {
      const qty = parseAmount(l.quantity)
      const cost = parseAmount(l.unitCost)
      return !!l.productId && qty !== null && qty > 0 && cost !== null && cost >= 0
    }),
)
const errors = computed(() => ({
  supplierId: form.supplierId ? null : 'Selecciona el proveedor.',
  receiptDate: form.receiptDate ? null : 'Fecha de recepción obligatoria.',
  lines: linesValid.value
    ? null
    : 'Cada línea necesita producto, cantidad mayor a 0 y costo unitario. Los decimales van con coma: 1500,50.',
}))
const hasErrors = computed(() => Object.values(errors.value).some((e) => e !== null))
function err(k: keyof typeof errors.value) {
  return submitted.value ? (errors.value[k] ?? undefined) : undefined
}

function addLine() {
  lines.value.push({
    uid: nextRowUid(),
    productId: '',
    purchaseOrderLineId: null,
    lotNumber: '',
    expireDate: '',
    quantity: '1',
    unitCost: '',
  })
}
function removeLine(uid: number) {
  lines.value = lines.value.filter((l) => l.uid !== uid)
}

// Al elegir una OC, prellena las líneas con lo pendiente por recibir.
watch(
  () => form.purchaseOrderId,
  (poId) => {
    if (!poId) return
    const po: PurchaseOrder | undefined = purchases.orders.find((o) => String(o.id) === poId)
    if (!po) return
    form.supplierId = String(po.supplier.id)
    lines.value = po.lines
      .filter((l) => l.pendingQuantity > 0)
      .map((l) => ({
        uid: nextRowUid(),
        productId: String(l.product.id),
        purchaseOrderLineId: l.id,
        lotNumber: '',
        expireDate: '',
        quantity: String(l.pendingQuantity),
        unitCost: String(l.unitCost),
      }))
    if (lines.value.length === 0) addLine()
  },
)

watch(
  () => props.open,
  async (o) => {
    if (!o) return
    submitted.value = false
    serverError.value = null
    await Promise.all([loadAll(true), tienda.refresh(), purchases.loadOrders()])
    form.supplierId = ''
    form.purchaseOrderId = ''
    form.receiptDate = new Date().toISOString().slice(0, 10)
    form.supplierInvoiceNumber = ''
    form.notes = ''
    lines.value = [
      {
        uid: nextRowUid(),
        productId: '',
        purchaseOrderLineId: null,
        lotNumber: '',
        expireDate: '',
        quantity: '1',
        unitCost: '',
      },
    ]
  },
)

async function submit() {
  submitted.value = true
  serverError.value = null
  if (hasErrors.value) return
  saving.value = true
  try {
    await goodsReceiptsApi.create({
      supplierId: Number(form.supplierId),
      purchaseOrderId: form.purchaseOrderId ? Number(form.purchaseOrderId) : null,
      receiptDate: form.receiptDate,
      supplierInvoiceNumber: form.supplierInvoiceNumber.trim() || null,
      notes: form.notes.trim() || null,
      lines: lines.value.map((l) => ({
        productId: Number(l.productId),
        purchaseOrderLineId: l.purchaseOrderLineId,
        lotNumber: l.lotNumber.trim() || null,
        expireDate: l.expireDate || null,
        // `linesValid` ya garantizó que ninguno de los dos es `null` aquí.
        quantityReceived: parseAmount(l.quantity) ?? 0,
        unitCost: parseAmount(l.unitCost) ?? 0,
      })),
    })
    emit('saved')
    emit('close')
  } catch (e) {
    serverError.value = getProblemDetailMessage(e, 'No se pudo registrar la recepción')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <ModalShell
    :open="open"
    title="Nueva recepción de mercancía"
    subtitle="Se guarda como borrador; al confirmar alimenta el inventario"
    :icon="PackageCheck"
    :width="760"
    @close="emit('close')"
  >
    <template #body>
      <p v-if="serverError" class="ds-server-error">{{ serverError }}</p>
      <div class="head-grid ds-grid-2">
        <BaseField label="Orden de compra" hint="Opcional · prellena líneas">
          <BaseSelect
            v-model="form.purchaseOrderId"
            :options="orderOptions"
            placeholder="Sin orden"
          />
        </BaseField>
        <BaseField label="Proveedor" required :error="err('supplierId')">
          <BaseSelect
            v-model="form.supplierId"
            :options="supplierOptions"
            placeholder="Selecciona proveedor"
            :invalid="!!err('supplierId')"
          />
        </BaseField>
        <BaseField label="Fecha de recepción" required :error="err('receiptDate')">
          <DateInput v-model="form.receiptDate" :invalid="!!err('receiptDate')" />
        </BaseField>
        <BaseField label="N.º factura proveedor" hint="Opcional">
          <BaseInput v-model="form.supplierInvoiceNumber" placeholder="FV-1024" />
        </BaseField>
      </div>

      <div class="lines">
        <div class="lines-head">
          <h3>Productos recibidos</h3>
          <button
            type="button"
            class="ds-btn ds-btn--neutral ds-btn--strong ds-btn--sm"
            @click="addLine"
          >
            <Plus :size="14" /> Agregar
          </button>
        </div>
        <p v-if="err('lines')" class="line-error">{{ err('lines') }}</p>
        <div class="line-head-row">
          <span>Producto</span><span>Lote</span><span>Vence</span><span>Cant.</span
          ><span>Costo</span><span></span>
        </div>
        <div v-for="l in lines" :key="l.uid" class="line-row">
          <BaseSelect v-model="l.productId" :options="productOptions" placeholder="Producto" />
          <BaseInput v-model="l.lotNumber" placeholder="Lote" />
          <DateInput v-model="l.expireDate" placeholder="—" />
          <BaseInput v-model="l.quantity" placeholder="0" inputmode="numeric" />
          <BaseInput v-model="l.unitCost" placeholder="0" inputmode="decimal" />
          <ComprasIconButton tone="danger" @click="removeLine(l.uid)">
            <Trash2 :size="14" />
          </ComprasIconButton>
        </div>
      </div>

      <BaseField label="Notas" hint="Opcional">
        <BaseTextarea v-model="form.notes" placeholder="Observaciones…" :rows="2" />
      </BaseField>
    </template>
    <template #footer-actions>
      <button type="button" class="ds-btn ds-btn--neutral ds-btn--strong" @click="emit('close')">
        Cancelar
      </button>
      <button
        type="button"
        class="ds-btn ds-btn--solid ds-btn--strong"
        :disabled="saving"
        @click="submit"
      >
        {{ saving ? 'Guardando…' : 'Guardar borrador' }}
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
/* Layout apoyado en `.ds-grid-2` (dos columnas, colapso en 640px). */
.head-grid {
  gap: var(--space-16) var(--space-18);
  margin-bottom: 18px;
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

.line-head-row,
.line-row {
  display: grid;
  grid-template-columns: 2.2fr 1fr 1.2fr 0.8fr 1fr auto;
  gap: 8px;
  align-items: center;
}

.line-head-row {
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--warm-400);
  margin-bottom: 6px;
  padding: 0 4px;
}

.line-row {
  margin-bottom: 8px;
}

.line-error {
  color: var(--danger-600);
  font-size: 12.5px;
  margin: 0 0 8px;
}

/* caja/compras usan un amatista un punto más claro que el resto. */
.ds-btn--solid {
  --ds-btn-solid-bg: var(--amatista-600);
}
</style>
