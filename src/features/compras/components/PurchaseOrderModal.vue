<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ClipboardList, Plus, Trash2 } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import BaseField from '@/features/dashboard/components/ui/BaseField.vue'
import BaseInput from '@/features/dashboard/components/ui/BaseInput.vue'
import BaseSelect from '@/features/dashboard/components/ui/BaseSelect.vue'
import BaseTextarea from '@/features/dashboard/components/ui/BaseTextarea.vue'
import DateInput from '@/features/dashboard/components/ui/DateInput.vue'
import { useSuppliers } from '../composables/useSuppliers'
import { useTienda } from '@/features/tienda/composables/useTienda'
import { purchaseOrdersApi } from '../api/purchaseOrders.api'
import { formatMoney } from '../composables/format'
import { getProblemDetailMessage } from '@/services/http/http.client'
import type { PurchaseOrder } from '../types/compras'

const props = defineProps<{ open: boolean; order: PurchaseOrder | null }>()
const emit = defineEmits<{ close: []; saved: [] }>()

const { all: suppliers, loadAll } = useSuppliers()
const tienda = useTienda()

const isEdit = computed(() => props.order != null)

interface LineRow {
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
const submitted = ref(false)
const saving = ref(false)
const serverError = ref<string | null>(null)

const supplierOptions = computed(() =>
  suppliers.value.map((s) => ({ value: String(s.id), label: s.name })),
)
const productOptions = computed(() =>
  tienda.products.value.map((p) => ({ value: String(p.id), label: `${p.name} (${p.code})` })),
)

const total = computed(() =>
  lines.value.reduce((acc, l) => acc + (Number(l.quantity) || 0) * (Number(l.unitCost) || 0), 0),
)

const linesValid = computed(
  () =>
    lines.value.length > 0 &&
    lines.value.every((l) => l.productId && Number(l.quantity) > 0 && Number(l.unitCost) >= 0),
)
const errors = computed(() => ({
  supplierId: form.supplierId ? null : 'Selecciona el proveedor.',
  orderDate: form.orderDate ? null : 'Fecha de orden obligatoria.',
  lines: linesValid.value ? null : 'Agrega al menos una línea válida (producto, cantidad y costo).',
}))
const hasErrors = computed(() => Object.values(errors.value).some((e) => e !== null))
function err(k: keyof typeof errors.value) {
  return submitted.value ? (errors.value[k] ?? undefined) : undefined
}

function addLine() {
  lines.value.push({ productId: '', quantity: '1', unitCost: '' })
}
function removeLine(i: number) {
  lines.value.splice(i, 1)
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
          productId: String(l.product.id),
          quantity: String(l.quantityOrdered),
          unitCost: String(l.unitCost),
        }))
      : [{ productId: '', quantity: '1', unitCost: '' }]
  },
)

async function submit() {
  submitted.value = true
  serverError.value = null
  if (hasErrors.value) return
  saving.value = true
  try {
    const payload = {
      supplierId: Number(form.supplierId),
      orderDate: form.orderDate,
      expectedDate: form.expectedDate || null,
      notes: form.notes.trim() || null,
      lines: lines.value.map((l) => ({
        productId: Number(l.productId),
        quantityOrdered: Number(l.quantity),
        unitCost: Number(l.unitCost),
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
      <p v-if="serverError" class="server-error">{{ serverError }}</p>
      <div class="head-grid">
        <BaseField label="Proveedor" required :error="err('supplierId')">
          <BaseSelect
            v-model="form.supplierId"
            :options="supplierOptions"
            placeholder="Selecciona proveedor"
            :invalid="!!err('supplierId')"
          />
        </BaseField>
        <BaseField label="Fecha de orden" required :error="err('orderDate')">
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
        <p v-if="err('lines')" class="line-error">{{ err('lines') }}</p>
        <div v-for="(l, i) in lines" :key="i" class="line-row">
          <BaseSelect v-model="l.productId" :options="productOptions" placeholder="Producto" />
          <BaseInput v-model="l.quantity" placeholder="Cant." inputmode="numeric" />
          <BaseInput v-model="l.unitCost" placeholder="Costo unit." inputmode="decimal" />
          <span class="line-sub">{{
            formatMoney((Number(l.quantity) || 0) * (Number(l.unitCost) || 0))
          }}</span>
          <button type="button" class="icon-btn danger" @click="removeLine(i)">
            <Trash2 :size="14" />
          </button>
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
      <button type="button" class="ds-btn ds-btn--neutral ds-btn--strong" @click="emit('close')">
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

.line-sub {
  font-size: 12.5px;
  text-align: right;
  font-variant-numeric: tabular-nums;
  color: var(--warm-600);
}

.line-error {
  color: oklch(50% 0.2 25deg);
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

.server-error {
  margin: 0 0 14px;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--danger-150);
  color: oklch(45% 0.18 25deg);
  font-size: 13px;
}

/* caja/compras usan un amatista un punto más claro que el resto. */
.ds-btn--solid {
  --ds-btn-solid-bg: var(--amatista-600);
}
</style>
