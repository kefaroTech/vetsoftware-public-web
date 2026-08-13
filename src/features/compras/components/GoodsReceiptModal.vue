<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { PackageCheck, Plus, Trash2 } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import BaseField from '@/features/dashboard/components/ui/BaseField.vue'
import BaseInput from '@/features/dashboard/components/ui/BaseInput.vue'
import BaseSelect from '@/features/dashboard/components/ui/BaseSelect.vue'
import BaseTextarea from '@/features/dashboard/components/ui/BaseTextarea.vue'
import DateInput from '@/features/dashboard/components/ui/DateInput.vue'
import { useSuppliers } from '../composables/useSuppliers'
import { useTienda } from '@/features/tienda/composables/useTienda'
import { usePurchasesStore } from '../stores/purchases.store'
import { goodsReceiptsApi } from '../api/goodsReceipts.api'
import { getProblemDetailMessage } from '@/services/http/http.client'
import type { PurchaseOrder } from '../types/compras'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: []; saved: [] }>()

const { all: suppliers, loadAll } = useSuppliers()
const tienda = useTienda()
const purchases = usePurchasesStore()

interface LineRow {
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

const linesValid = computed(
  () =>
    lines.value.length > 0 &&
    lines.value.every((l) => l.productId && Number(l.quantity) > 0 && Number(l.unitCost) >= 0),
)
const errors = computed(() => ({
  supplierId: form.supplierId ? null : 'Selecciona el proveedor.',
  receiptDate: form.receiptDate ? null : 'Fecha de recepción obligatoria.',
  lines: linesValid.value ? null : 'Agrega al menos una línea válida (producto, cantidad y costo).',
}))
const hasErrors = computed(() => Object.values(errors.value).some((e) => e !== null))
function err(k: keyof typeof errors.value) {
  return submitted.value ? (errors.value[k] ?? undefined) : undefined
}

function addLine() {
  lines.value.push({
    productId: '',
    purchaseOrderLineId: null,
    lotNumber: '',
    expireDate: '',
    quantity: '1',
    unitCost: '',
  })
}
function removeLine(i: number) {
  lines.value.splice(i, 1)
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
        quantityReceived: Number(l.quantity),
        unitCost: Number(l.unitCost),
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
      <div class="head-grid">
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
        <div v-for="(l, i) in lines" :key="i" class="line-row">
          <BaseSelect v-model="l.productId" :options="productOptions" placeholder="Producto" />
          <BaseInput v-model="l.lotNumber" placeholder="Lote" />
          <DateInput v-model="l.expireDate" placeholder="—" />
          <BaseInput v-model="l.quantity" placeholder="0" inputmode="numeric" />
          <BaseInput v-model="l.unitCost" placeholder="0" inputmode="decimal" />
          <button type="button" class="icon-btn danger" @click="removeLine(i)">
            <Trash2 :size="14" />
          </button>
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
.head-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
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
  color: oklch(50% 0.2 25deg);
  font-size: 12.5px;
  margin: 0 0 8px;
}

.icon-btn {
  border: none;
  background: var(--warm-100);
  color: var(--warm-600);
  border-radius: 7px;
  padding: 8px;
  cursor: pointer;
}

.icon-btn.danger:hover {
  background: var(--danger-200);
  color: oklch(50% 0.2 25deg);
}

/* caja/compras usan un amatista un punto más claro que el resto. */
.ds-btn--solid {
  --ds-btn-solid-bg: var(--amatista-600);
}
</style>
