<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Check, CreditCard } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import BaseField from '@/features/dashboard/components/ui/BaseField.vue'
import BaseInput from '@/features/dashboard/components/ui/BaseInput.vue'
import BaseSelect from '@/features/dashboard/components/ui/BaseSelect.vue'
import { useCuentas } from '../composables/useCuentas'
import { formatMoney } from '@/features/tienda/composables/pricing'
import { getProblemDetailMessage, isConcurrencyConflict } from '@/services/http/http.client'
import { useToast } from '@/composables/useToast'
import type { PaymentMethod } from '../types/cuentas'
import { scrollToFirstError } from '@/composables/scrollToError'

const props = defineProps<{
  open: boolean
  accountId: number
  outstanding: number
}>()

const emit = defineEmits<{ close: []; paid: []; refresh: [] }>()

const cuentas = useCuentas()
const toast = useToast()

const form = reactive({ amount: '', method: 'CASH' as PaymentMethod })
const submitted = ref(false)
const busy = ref(false)
// Idempotency key del abono: una por apertura del modal; los reintentos la reusan para no cobrar dos veces.
const requestId = ref('')

// Paso de confirmación tras registrar el abono (snapshot del resultado).
type Done = { amount: number; method: PaymentMethod; prevOutstanding: number; newOutstanding: number }
const done = ref<Done | null>(null)

const METHOD_OPTIONS = [
  { value: 'CASH', label: 'Efectivo' },
  { value: 'CARD', label: 'Tarjeta' },
  { value: 'BANK_TRANSFER', label: 'Transferencia' },
]
const methodLabel = (m: PaymentMethod) => METHOD_OPTIONS.find((o) => o.value === m)?.label ?? m

watch(
  () => props.open,
  (open) => {
    if (!open) return
    form.amount = props.outstanding > 0 ? String(Math.round(props.outstanding)) : ''
    form.method = 'CASH'
    submitted.value = false
    done.value = null
    requestId.value = crypto.randomUUID()
  },
)

// COP no tiene centavos: el monto se maneja en enteros y se descartan TODOS los no-dígitos (incluido el
// separador de miles). Evita el bug `Number("50.000") === 50` que registraba $50 en vez de $50.000. Mismo
// patrón que PayModal (POS).
const amountNum = computed(() => Number(form.amount.replace(/\D/g, '')) || 0)
const amountDisplay = computed({
  get: () => (form.amount === '' ? '' : formatMoney(amountNum.value)),
  set: (v: string) => {
    form.amount = v.replace(/\D/g, '')
  },
})
const amountError = computed(() =>
  !(amountNum.value > 0) ? 'Ingresa un monto válido' : amountNum.value > props.outstanding ? 'No puede superar el saldo' : null,
)
const newOutstanding = computed(() => Math.max(0, props.outstanding - (amountNum.value || 0)))

async function submit() {
  submitted.value = true
  if (amountError.value || busy.value) {
    scrollToFirstError()
    return
  }
  // Capturamos antes del await: addPayment puede refrescar el saldo y cambiar props.outstanding.
  const amount = amountNum.value
  const prev = props.outstanding
  const method = form.method
  busy.value = true
  try {
    await cuentas.addPayment(props.accountId, amount, method, requestId.value)
    // Éxito → paso de confirmación (el 'paid' se emite al pulsar "Listo", tras mostrar el recibo).
    done.value = {
      amount,
      method,
      prevOutstanding: prev,
      newOutstanding: Math.max(0, prev - amount),
    }
  } catch (e) {
    if (isConcurrencyConflict(e)) {
      toast.warn('Conflicto de concurrencia', getProblemDetailMessage(e))
      emit('refresh')
    } else {
      toast.error('Ocurrió un error', getProblemDetailMessage(e, 'No se pudo registrar el abono'))
    }
  } finally {
    busy.value = false
  }
}

function finish() {
  emit('paid')
  emit('close')
}
</script>

<template>
  <ModalShell
    :open="open"
    :title="done ? 'Abono registrado' : 'Registrar abono'"
    :subtitle="done ? formatMoney(done.amount) : `Saldo actual: ${formatMoney(outstanding)}`"
    :icon="done ? Check : CreditCard"
    :width="460"
    @close="done ? finish() : emit('close')"
  >
    <template #body>
      <!-- Paso 1 · formulario -->
      <div v-if="!done" class="form">
        <BaseField label="Monto" required :error="submitted ? amountError ?? undefined : undefined">
          <template #default="{ id }">
            <BaseInput :id="id" v-model="amountDisplay" :invalid="submitted && !!amountError" inputmode="numeric" placeholder="$0" />
          </template>
        </BaseField>
        <BaseField label="Método de pago" required>
          <template #default="{ id }">
            <BaseSelect :id="id" v-model="form.method" :options="METHOD_OPTIONS" />
          </template>
        </BaseField>
        <div v-if="amountNum > 0 && !amountError" class="breakdown">
          <div class="brow"><span>Saldo actual</span><span>{{ formatMoney(outstanding) }}</span></div>
          <div class="brow"><span>Abono</span><span>− {{ formatMoney(amountNum) }}</span></div>
          <div class="brow saldo"><span>Saldo restante</span><span>{{ formatMoney(newOutstanding) }}</span></div>
        </div>
      </div>

      <!-- Paso 2 · confirmación -->
      <div v-else class="receipt">
        <div class="badge"><Check :size="26" :stroke-width="2.4" /></div>
        <div class="rec-title">Abono registrado</div>
        <div class="rec-amt">{{ formatMoney(done.amount) }}</div>
        <div class="rec-rows">
          <div class="brow"><span>Método</span><span>{{ methodLabel(done.method) }}</span></div>
          <div class="brow"><span>Saldo anterior</span><span>{{ formatMoney(done.prevOutstanding) }}</span></div>
          <div class="brow saldo"><span>Saldo restante</span><span>{{ formatMoney(done.newOutstanding) }}</span></div>
        </div>
        <p v-if="done.newOutstanding <= 0" class="rec-note">
          Con este abono el saldo queda en cero. Puedes cerrar la cuenta.
        </p>
      </div>
    </template>

    <template #footer-actions>
      <template v-if="!done">
        <button type="button" class="btn-ghost" @click="emit('close')">Cancelar</button>
        <button type="button" class="btn-primary" :disabled="busy" @click="submit">
          {{ busy ? 'Registrando…' : 'Registrar abono' }}
        </button>
      </template>
      <button v-else type="button" class="btn-primary" @click="finish">
        <Check :size="15" :stroke-width="2" /> Listo
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
.form { display: flex; flex-direction: column; gap: 16px; }
.breakdown { display: flex; flex-direction: column; gap: 6px; padding: 12px 14px; border-radius: 11px; background: var(--warm-50); border: 1px solid var(--warm-200); }
.brow { display: flex; align-items: center; justify-content: space-between; font-size: 13px; color: var(--warm-600); }
.brow span:last-child { color: var(--warm-800); font-variant-numeric: tabular-nums; }
.brow.saldo { padding-top: 8px; margin-top: 2px; border-top: 1px solid var(--warm-200); font-size: 14px; }
.brow.saldo span { color: var(--warm-900); font-weight: 600; }
.brow.saldo span:last-child { color: var(--amatista-700); }
/* Recibo de confirmación */
.receipt { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 4px; }
.badge { width: 56px; height: 56px; border-radius: 16px; display: grid; place-items: center; background: var(--amatista-100); color: var(--amatista-700); margin-bottom: 6px; }
.rec-title { font-size: 15px; font-weight: 600; color: var(--warm-900); }
.rec-amt { font-size: 28px; font-weight: 700; color: var(--amatista-700); font-variant-numeric: tabular-nums; margin-bottom: 12px; }
.rec-rows { width: 100%; display: flex; flex-direction: column; gap: 6px; padding: 12px 14px; border-radius: 11px; background: var(--warm-50); border: 1px solid var(--warm-200); text-align: left; }
.rec-note { font-size: 12.5px; color: var(--amatista-700); margin: 12px 0 0; }
.btn-primary {
  display: inline-flex; align-items: center; gap: 6px;
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
