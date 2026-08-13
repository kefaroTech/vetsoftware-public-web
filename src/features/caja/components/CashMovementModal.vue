<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ArrowLeftRight } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import BaseField from '@/features/dashboard/components/ui/BaseField.vue'
import BaseInput from '@/features/dashboard/components/ui/BaseInput.vue'
import BaseSelect from '@/features/dashboard/components/ui/BaseSelect.vue'
import BaseTextarea from '@/features/dashboard/components/ui/BaseTextarea.vue'
import { useCaja } from '../composables/useCaja'
import { getProblemDetailMessage } from '@/services/http/http.client'
import type { CashPaymentMethod, ManualMovementType } from '../types/caja'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: []; saved: [] }>()

const { addMovement } = useCaja()

const TYPE_OPTIONS = [
  { value: 'MANUAL_IN', label: 'Ingreso' },
  { value: 'WITHDRAWAL', label: 'Retiro' },
  { value: 'EXPENSE', label: 'Gasto' },
]
const METHOD_OPTIONS = [
  { value: 'CASH', label: 'Efectivo' },
  { value: 'CARD', label: 'Tarjeta' },
  { value: 'TRANSFER', label: 'Transferencia' },
]

const type = ref<string>('MANUAL_IN')
const method = ref<string>('CASH')
const amount = ref('')
const note = ref('')
const submitted = ref(false)
const saving = ref(false)
const serverError = ref<string | null>(null)

const amountValue = computed(() => Number(amount.value.replace(',', '.')))
const amountError = computed(() =>
  amount.value.trim() === '' || Number.isNaN(amountValue.value) || amountValue.value <= 0
    ? 'Ingresa un monto mayor que cero.'
    : null,
)

watch(
  () => props.open,
  (o) => {
    if (o) {
      type.value = 'MANUAL_IN'
      method.value = 'CASH'
      amount.value = ''
      note.value = ''
      submitted.value = false
      serverError.value = null
    }
  },
)

async function submit() {
  submitted.value = true
  serverError.value = null
  if (amountError.value) return
  saving.value = true
  try {
    await addMovement({
      type: type.value as ManualMovementType,
      method: method.value as CashPaymentMethod,
      amount: amountValue.value,
      note: note.value.trim() || null,
    })
    emit('saved')
    emit('close')
  } catch (e) {
    serverError.value = getProblemDetailMessage(e, 'No se pudo registrar el movimiento')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <ModalShell
    :open="open"
    title="Movimiento de caja"
    subtitle="Ingreso, retiro o gasto manual"
    :icon="ArrowLeftRight"
    :width="520"
    compact
    @close="emit('close')"
  >
    <template #body>
      <p v-if="serverError" class="ds-server-error">{{ serverError }}</p>
      <div class="grid">
        <BaseField label="Tipo" required>
          <BaseSelect v-model="type" :options="TYPE_OPTIONS" />
        </BaseField>
        <BaseField label="Medio de pago" required>
          <BaseSelect v-model="method" :options="METHOD_OPTIONS" />
        </BaseField>
        <BaseField
          label="Monto"
          required
          :error="submitted ? (amountError ?? undefined) : undefined"
        >
          <BaseInput
            v-model="amount"
            placeholder="0"
            inputmode="decimal"
            suffix="COP"
            :invalid="submitted && !!amountError"
          />
        </BaseField>
        <BaseField label="Nota" hint="Opcional (concepto del ingreso/retiro/gasto)">
          <BaseTextarea v-model="note" placeholder="Concepto…" />
        </BaseField>
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
        {{ saving ? 'Guardando…' : 'Registrar' }}
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
.grid {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

/* caja/compras usan un amatista un punto más claro que el resto. */
.ds-btn--solid {
  --ds-btn-solid-bg: var(--amatista-600);
}
</style>
