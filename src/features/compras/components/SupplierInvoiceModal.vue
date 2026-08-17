<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ReceiptText } from 'lucide-vue-next'
import ModalShell from '@/components/ui/ModalShell.vue'
import BaseField from '@/components/ui/BaseField.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'
import DateInput from '@/components/ui/DateInput.vue'
import { useSuppliers } from '../composables/useSuppliers'
import { useSupplierInvoices } from '../composables/useSupplierInvoices'
import { formatMoney } from '@/features/tienda/composables/pricing'
import { getProblemDetailMessage } from '@/services/http/http.client'
import type { Supplier, SupplierInvoice } from '../types/compras'

const props = defineProps<{ open: boolean; invoice: SupplierInvoice | null }>()
const emit = defineEmits<{ close: []; saved: [] }>()

const { all: suppliers, loadAll } = useSuppliers()
const { create, update } = useSupplierInvoices()

const isEdit = computed(() => props.invoice != null)

const form = reactive({
  supplierId: '' as string,
  invoiceNumber: '',
  issueDate: '',
  dueDate: '',
  subtotal: '',
  taxAmount: '',
  withholdingAmount: '',
  notes: '',
})
const submitted = ref(false)
const saving = ref(false)
const serverError = ref<string | null>(null)

const supplierOptions = computed(() =>
  suppliers.value.map((s: Supplier) => ({ value: String(s.id), label: s.name })),
)

const num = (v: string) => Number((v || '').replace(',', '.'))
const subtotalN = computed(() => num(form.subtotal))
const taxN = computed(() => num(form.taxAmount))
const withN = computed(() => num(form.withholdingAmount || '0'))
const totalN = computed(
  () =>
    (Number.isNaN(subtotalN.value) ? 0 : subtotalN.value) +
    (Number.isNaN(taxN.value) ? 0 : taxN.value),
)
const payableN = computed(() => totalN.value - (Number.isNaN(withN.value) ? 0 : withN.value))

const errors = computed(() => ({
  supplierId: form.supplierId ? null : 'Selecciona el proveedor.',
  invoiceNumber: form.invoiceNumber.trim() ? null : 'Número de factura obligatorio.',
  issueDate: form.issueDate ? null : 'Fecha de emisión obligatoria.',
  dueDate: !form.dueDate
    ? 'Fecha de vencimiento obligatoria.'
    : form.issueDate && form.dueDate < form.issueDate
      ? 'El vencimiento no puede ser anterior a la emisión.'
      : null,
  subtotal:
    form.subtotal.trim() && !Number.isNaN(subtotalN.value) && subtotalN.value >= 0
      ? null
      : 'Base inválida.',
  taxAmount:
    form.taxAmount.trim() && !Number.isNaN(taxN.value) && taxN.value >= 0
      ? null
      : 'Impuesto inválido.',
  withholdingAmount:
    form.withholdingAmount.trim() === '' ||
    (!Number.isNaN(withN.value) && withN.value >= 0 && withN.value <= totalN.value)
      ? null
      : 'Retención inválida (no puede superar el total).',
}))
const hasErrors = computed(() => Object.values(errors.value).some((e) => e !== null))
function err(k: keyof typeof errors.value) {
  return submitted.value ? (errors.value[k] ?? undefined) : undefined
}

// Prefill vencimiento = emisión + días de crédito del proveedor (si el usuario no lo fijó aún).
watch([() => form.supplierId, () => form.issueDate], () => {
  if (isEdit.value || !form.issueDate || !form.supplierId) return
  const s = suppliers.value.find((x) => String(x.id) === form.supplierId)
  if (s?.paymentTermsDays != null) {
    const d = new Date(form.issueDate + 'T00:00:00')
    d.setDate(d.getDate() + s.paymentTermsDays)
    form.dueDate = d.toISOString().slice(0, 10)
  }
})

watch(
  () => props.open,
  async (o) => {
    if (!o) return
    submitted.value = false
    serverError.value = null
    await loadAll(true)
    const inv = props.invoice
    form.supplierId = inv ? String(inv.supplier.id) : ''
    form.invoiceNumber = inv?.invoiceNumber ?? ''
    form.issueDate = inv?.issueDate ?? new Date().toISOString().slice(0, 10)
    form.dueDate = inv?.dueDate ?? ''
    form.subtotal = inv ? String(inv.subtotal) : ''
    form.taxAmount = inv ? String(inv.taxAmount) : ''
    form.withholdingAmount = inv && inv.withholdingAmount ? String(inv.withholdingAmount) : ''
    form.notes = inv?.notes ?? ''
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
      invoiceNumber: form.invoiceNumber.trim(),
      issueDate: form.issueDate,
      dueDate: form.dueDate,
      subtotal: subtotalN.value,
      taxAmount: taxN.value,
      withholdingAmount: form.withholdingAmount.trim() ? withN.value : 0,
      notes: form.notes.trim() || null,
    }
    if (isEdit.value && props.invoice) {
      await update(props.invoice.id, { ...payload, version: props.invoice.version })
    } else {
      await create(payload)
    }
    emit('saved')
    emit('close')
  } catch (e) {
    serverError.value = getProblemDetailMessage(e, 'No se pudo guardar la factura')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <ModalShell
    :open="open"
    :title="isEdit ? 'Editar factura de proveedor' : 'Nueva factura de proveedor'"
    subtitle="Registra la compra y su cuenta por pagar"
    :icon="ReceiptText"
    :width="640"
    @close="emit('close')"
  >
    <template #body>
      <p v-if="serverError" class="ds-server-error">{{ serverError }}</p>
      <div class="grid">
        <BaseField label="Proveedor" required :error="err('supplierId')">
          <BaseSelect
            v-model="form.supplierId"
            :options="supplierOptions"
            placeholder="Selecciona proveedor"
            :invalid="!!err('supplierId')"
          />
        </BaseField>
        <BaseField label="N.º de factura" required :error="err('invoiceNumber')">
          <BaseInput
            v-model="form.invoiceNumber"
            placeholder="FV-1024"
            :invalid="!!err('invoiceNumber')"
          />
        </BaseField>
        <BaseField label="Fecha de emisión" required :error="err('issueDate')">
          <DateInput v-model="form.issueDate" :invalid="!!err('issueDate')" />
        </BaseField>
        <BaseField label="Vencimiento" required :error="err('dueDate')">
          <DateInput
            v-model="form.dueDate"
            :min="form.issueDate || undefined"
            :invalid="!!err('dueDate')"
          />
        </BaseField>
        <BaseField label="Base gravable" required :error="err('subtotal')">
          <BaseInput
            v-model="form.subtotal"
            placeholder="0"
            inputmode="decimal"
            suffix="COP"
            :invalid="!!err('subtotal')"
          />
        </BaseField>
        <BaseField label="Impuesto (IVA/INC)" required :error="err('taxAmount')">
          <BaseInput
            v-model="form.taxAmount"
            placeholder="0"
            inputmode="decimal"
            suffix="COP"
            :invalid="!!err('taxAmount')"
          />
        </BaseField>
        <BaseField label="Retención practicada" hint="Opcional" :error="err('withholdingAmount')">
          <BaseInput
            v-model="form.withholdingAmount"
            placeholder="0"
            inputmode="decimal"
            suffix="COP"
            :invalid="!!err('withholdingAmount')"
          />
        </BaseField>
        <BaseField class="col-2" label="Notas" hint="Opcional">
          <BaseTextarea v-model="form.notes" placeholder="Observaciones…" :rows="2" />
        </BaseField>
      </div>
      <div class="totals-preview">
        <span
          >Total: <strong>{{ formatMoney(totalN) }}</strong></span
        >
        <span
          >Neto a pagar: <strong>{{ formatMoney(payableN) }}</strong></span
        >
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
        {{ saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Registrar factura' }}
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px 20px;
}

.col-2 {
  grid-column: 1 / -1;
}

@media (width <= 640px) {
  .grid {
    grid-template-columns: 1fr;
  }
}

.totals-preview {
  display: flex;
  gap: 24px;
  justify-content: flex-end;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--warm-200);
  font-size: 14px;
  color: var(--warm-700);
}

.totals-preview strong {
  color: var(--warm-900);
}

/* caja/compras usan un amatista un punto más claro que el resto. */
.ds-btn--solid {
  --ds-btn-solid-bg: var(--amatista-600);
}
</style>
