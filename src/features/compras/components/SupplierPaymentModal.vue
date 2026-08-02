<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Banknote } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import BaseField from '@/features/dashboard/components/ui/BaseField.vue'
import BaseInput from '@/features/dashboard/components/ui/BaseInput.vue'
import BaseSelect from '@/features/dashboard/components/ui/BaseSelect.vue'
import BaseTextarea from '@/features/dashboard/components/ui/BaseTextarea.vue'
import DateInput from '@/features/dashboard/components/ui/DateInput.vue'
import { useSupplierInvoices } from '../composables/useSupplierInvoices'
import { formatMoney, PAYMENT_METHOD_OPTIONS } from '../composables/format'
import { getProblemDetailMessage } from '@/services/http/http.client'
import type { SupplierInvoice, SupplierPaymentMethod } from '../types/compras'

const props = defineProps<{ open: boolean; invoice: SupplierInvoice | null }>()
const emit = defineEmits<{ close: []; saved: [] }>()

const { registerPayment } = useSupplierInvoices()

const form = reactive({
  amount: '',
  paymentDate: '',
  method: 'CASH' as SupplierPaymentMethod,
  reference: '',
  note: '',
})
const submitted = ref(false)
const saving = ref(false)
const serverError = ref<string | null>(null)

const balance = computed(() => props.invoice?.balance ?? 0)
const amountN = computed(() => Number((form.amount || '').replace(',', '.')))
const amountError = computed(() => {
  if (form.amount.trim() === '' || Number.isNaN(amountN.value) || amountN.value <= 0)
    return 'Ingresa un monto válido.'
  if (amountN.value > balance.value)
    return `No puede superar el saldo (${formatMoney(balance.value)}).`
  return null
})

watch(
  () => props.open,
  (o) => {
    if (!o) return
    submitted.value = false
    serverError.value = null
    form.amount = props.invoice ? String(props.invoice.balance) : ''
    form.paymentDate = new Date().toISOString().slice(0, 10)
    form.method = 'CASH'
    form.reference = ''
    form.note = ''
  },
)

async function submit() {
  submitted.value = true
  serverError.value = null
  if (amountError.value || !props.invoice) return
  saving.value = true
  try {
    await registerPayment(props.invoice.id, {
      amount: amountN.value,
      paymentDate: form.paymentDate,
      method: form.method,
      reference: form.reference.trim() || null,
      note: form.note.trim() || null,
      version: props.invoice.version,
    })
    emit('saved')
    emit('close')
  } catch (e) {
    serverError.value = getProblemDetailMessage(e, 'No se pudo registrar el abono')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <ModalShell
    :open="open"
    title="Registrar abono"
    :subtitle="invoice ? `Factura ${invoice.invoiceNumber} · ${invoice.supplier.name}` : ''"
    :icon="Banknote"
    :width="520"
    compact
    @close="emit('close')"
  >
    <template #body>
      <p v-if="serverError" class="server-error">{{ serverError }}</p>
      <div class="balance-row">
        <span>Saldo pendiente</span>
        <strong>{{ formatMoney(balance) }}</strong>
      </div>
      <div class="grid">
        <BaseField
          label="Monto del abono"
          required
          :error="submitted ? (amountError ?? undefined) : undefined"
        >
          <BaseInput
            v-model="form.amount"
            placeholder="0"
            inputmode="decimal"
            suffix="COP"
            :invalid="submitted && !!amountError"
          />
        </BaseField>
        <BaseField label="Fecha de pago" required>
          <DateInput v-model="form.paymentDate" />
        </BaseField>
        <BaseField label="Medio de pago" required>
          <BaseSelect v-model="form.method" :options="PAYMENT_METHOD_OPTIONS" />
        </BaseField>
        <BaseField label="Referencia" hint="Opcional">
          <BaseInput v-model="form.reference" placeholder="N.º comprobante" />
        </BaseField>
        <BaseField label="Nota" hint="Opcional">
          <BaseTextarea v-model="form.note" placeholder="Observaciones…" :rows="2" />
        </BaseField>
      </div>
    </template>
    <template #footer-actions>
      <button type="button" class="btn ghost" @click="emit('close')">Cancelar</button>
      <button type="button" class="btn primary" :disabled="saving" @click="submit">
        {{ saving ? 'Registrando…' : 'Registrar abono' }}
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
.grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.balance-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 10px 14px;
  border-radius: 10px;
  background: var(--amatista-50, #f3edfa);
  font-size: 14px;
  color: var(--warm-700);
}

.balance-row strong {
  font-size: 17px;
  color: var(--amatista-700, #5c2d8c);
}

.server-error {
  margin: 0 0 14px;
  padding: 10px 12px;
  border-radius: 8px;
  background: oklch(94% 0.06 25deg);
  color: oklch(45% 0.18 25deg);
  font-size: 13px;
}

.btn {
  border: none;
  border-radius: 9px;
  padding: 9px 16px;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
}

.btn.ghost {
  background: var(--warm-100);
  color: var(--warm-700);
}

.btn.primary {
  background: var(--amatista-600, #5c2d8c);
  color: #fff;
}

.btn.primary:disabled {
  opacity: 0.6;
  cursor: default;
}
</style>
