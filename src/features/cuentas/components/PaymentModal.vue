<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { CreditCard } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import BaseField from '@/features/dashboard/components/ui/BaseField.vue'
import BaseInput from '@/features/dashboard/components/ui/BaseInput.vue'
import BaseSelect from '@/features/dashboard/components/ui/BaseSelect.vue'
import { useCuentas } from '../composables/useCuentas'
import { formatMoney } from '@/features/tienda/composables/pricing'
import { getProblemDetailMessage } from '@/services/http/http.client'
import { useToast } from '@/composables/useToast'
import type { PaymentMethod } from '../types/cuentas'

const props = defineProps<{
  open: boolean
  accountId: number
  outstanding: number
}>()

const emit = defineEmits<{ close: []; paid: [] }>()

const cuentas = useCuentas()
const toast = useToast()

const form = reactive({ amount: '', method: 'EFECTIVO' as PaymentMethod })
const submitted = ref(false)
const busy = ref(false)

const METHOD_OPTIONS = [
  { value: 'EFECTIVO', label: 'Efectivo' },
  { value: 'TARJETA', label: 'Tarjeta' },
  { value: 'TRANSFERENCIA', label: 'Transferencia' },
]

watch(
  () => props.open,
  (open) => {
    if (!open) return
    form.amount = props.outstanding > 0 ? String(props.outstanding) : ''
    form.method = 'EFECTIVO'
    submitted.value = false
  },
)

const amountNum = computed(() => Number(form.amount.replace(',', '.')))
const amountError = computed(() =>
  !(amountNum.value > 0) ? 'Ingresa un monto válido' : amountNum.value > props.outstanding ? 'No puede superar el saldo' : null,
)

async function submit() {
  submitted.value = true
  if (amountError.value || busy.value) return
  busy.value = true
  try {
    await cuentas.addPayment(props.accountId, amountNum.value, form.method)
    toast.success('Abono registrado', `Se registró ${formatMoney(amountNum.value)}.`)
    emit('paid')
    emit('close')
  } catch (e) {
    toast.error('Ocurrió un error', getProblemDetailMessage(e, 'No se pudo registrar el abono'))
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <ModalShell
    :open="open"
    title="Registrar abono"
    :subtitle="`Saldo actual: ${formatMoney(outstanding)}`"
    :icon="CreditCard"
    :width="460"
    @close="emit('close')"
  >
    <template #body>
      <div class="form">
        <BaseField label="Monto" required :error="submitted ? amountError ?? undefined : undefined">
          <template #default="{ id }">
            <BaseInput :id="id" v-model="form.amount" :invalid="submitted && !!amountError" inputmode="decimal" placeholder="0" />
          </template>
        </BaseField>
        <BaseField label="Método de pago" required>
          <template #default="{ id }">
            <BaseSelect :id="id" v-model="form.method" :options="METHOD_OPTIONS" />
          </template>
        </BaseField>
      </div>
    </template>

    <template #footer-actions>
      <button type="button" class="btn-ghost" @click="emit('close')">Cancelar</button>
      <button type="button" class="btn-primary" :disabled="busy" @click="submit">
        {{ busy ? 'Registrando…' : 'Registrar abono' }}
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
.form { display: flex; flex-direction: column; gap: 16px; }
.btn-primary {
  font-family: inherit; font-size: 13.5px; font-weight: 500; padding: 10px 18px; border-radius: 9px; cursor: pointer;
  border: none; color: white;
  background: linear-gradient(135deg, oklch(45% 0.18 var(--hue)), oklch(38% 0.18 calc(var(--hue) - 5)));
}
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-ghost {
  font-family: inherit; font-size: 13.5px; font-weight: 500; padding: 10px 18px; border-radius: 9px; cursor: pointer;
  background: transparent; border: 1px solid var(--warm-200); color: var(--warm-700);
}
.btn-ghost:hover { background: var(--warm-100); }
</style>
