<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Ban } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import BaseField from '@/features/dashboard/components/ui/BaseField.vue'
import BaseTextarea from '@/features/dashboard/components/ui/BaseTextarea.vue'
import { useCuentas } from '../composables/useCuentas'
import { formatMoney } from '@/features/tienda/composables/pricing'
import { getProblemDetailMessage, isConcurrencyConflict } from '@/services/http/http.client'
import { useToast } from '@/composables/useToast'
import { PAYMENT_METHOD_LABEL, type DebtResponse } from '../types/cuentas'
import { scrollToFirstError } from '@/composables/scrollToError'

const props = defineProps<{
  open: boolean
  accountId: number
  payment: DebtResponse | null
}>()

const emit = defineEmits<{ close: []; voided: []; refresh: [] }>()

const cuentas = useCuentas()
const toast = useToast()

const reason = ref('')
const submitted = ref(false)
const busy = ref(false)

watch(
  () => props.open,
  (open) => {
    if (!open) return
    reason.value = ''
    submitted.value = false
  },
)

const reasonError = computed(() => (reason.value.trim().length < 3 ? 'Indica el motivo de la anulación' : null))

const subtitle = computed(() => {
  const p = props.payment
  if (!p) return ''
  return `${formatMoney(p.amount)} · ${PAYMENT_METHOD_LABEL[p.paymentMethod]}${p.createdBy?.name ? ` · ${p.createdBy.name}` : ''}`
})

async function submit() {
  submitted.value = true
  if (reasonError.value || busy.value || !props.payment) {
    scrollToFirstError()
    return
  }
  busy.value = true
  try {
    await cuentas.voidPayment(props.accountId, props.payment.id, reason.value.trim())
    toast.success('Abono anulado', 'El abono dejó de contar en el saldo de la cuenta.')
    emit('voided')
    emit('close')
  } catch (e) {
    if (isConcurrencyConflict(e)) {
      toast.warn('Conflicto de concurrencia', getProblemDetailMessage(e))
      emit('refresh')
    } else {
      toast.error('No se pudo anular', getProblemDetailMessage(e, 'No se pudo anular el abono'))
    }
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <ModalShell
    :open="open"
    title="Anular abono"
    :subtitle="subtitle"
    :icon="Ban"
    accent="danger"
    :width="460"
    @close="emit('close')"
  >
    <template #body>
      <div class="form">
        <p class="warn">
          El abono quedará registrado como <strong>anulado</strong> (visible, tachado) y dejará de
          contar en el saldo. Esta acción registra tu autoría y el motivo.
        </p>
        <BaseField label="Motivo de la anulación" required :error="submitted ? reasonError ?? undefined : undefined">
          <template #default="{ id }">
            <BaseTextarea
              :id="id"
              v-model="reason"
              :rows="3"
              placeholder="Ej. monto erróneo, método equivocado, abono duplicado…"
            />
          </template>
        </BaseField>
      </div>
    </template>

    <template #footer-actions>
      <button type="button" class="btn-ghost" @click="emit('close')">Cancelar</button>
      <button type="button" class="btn-danger" :disabled="busy" @click="submit">
        {{ busy ? 'Anulando…' : 'Anular abono' }}
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
.form { display: flex; flex-direction: column; gap: 16px; }
.warn { margin: 0; font-size: 13px; line-height: 1.5; color: var(--warm-600); }
.warn strong { color: oklch(48% 0.18 25); }
.btn-danger {
  font-family: inherit; font-size: 13.5px; font-weight: 500; padding: 10px 18px; border-radius: 9px; cursor: pointer;
  border: none; color: white;
  background: linear-gradient(135deg, oklch(52% 0.18 25), oklch(45% 0.18 22));
}
.btn-danger:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-ghost {
  font-family: inherit; font-size: 13.5px; font-weight: 500; padding: 10px 18px; border-radius: 9px; cursor: pointer;
  background: transparent; border: 1px solid var(--warm-200); color: var(--warm-700);
}
.btn-ghost:hover { background: var(--warm-100); }
</style>
