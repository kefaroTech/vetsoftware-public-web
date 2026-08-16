<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Ban } from 'lucide-vue-next'
import ModalShell from '@/components/ui/ModalShell.vue'
import BaseField from '@/components/ui/BaseField.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'
import { useCuentas } from '../composables/useCuentas'
import { formatMoney } from '@/features/tienda/composables/pricing'
import { getProblemDetailMessage, isConcurrencyConflict } from '@/services/http/http.client'
import { useToast } from '@/composables/useToast'
import type { UnifiedCharge } from '../types/cuentas'
import { scrollToFirstError } from '@/composables/scrollToError'

const props = defineProps<{
  open: boolean
  accountId: number
  charge: UnifiedCharge | null
  /** Saldo pendiente actual de la cuenta; anular no debe dejarlo en negativo. */
  outstanding: number
}>()

const emit = defineEmits<{ close: []; voided: []; refresh: [] }>()

const cuentas = useCuentas()
const toast = useToast()

const reason = ref('')
const submitted = ref(false)
const busy = ref(false)

// Anular este cargo dejaría el saldo pendiente negativo (hay abonos que lo cubren).
// El back lo rechaza igual; aquí se bloquea antes para dar feedback inmediato.
const wouldGoNegative = computed(() => !!props.charge && props.charge.amount > props.outstanding)

watch(
  () => props.open,
  (open) => {
    if (!open) return
    reason.value = ''
    submitted.value = false
  },
)

const reasonError = computed(() =>
  reason.value.trim().length < 3 ? 'Indica el motivo de la anulación' : null,
)

const subtitle = computed(() => {
  const c = props.charge
  if (!c) return ''
  return `${c.concept} · ${formatMoney(c.amount)}${c.createdByName ? ` · ${c.createdByName}` : ''}`
})

async function submit() {
  submitted.value = true
  if (wouldGoNegative.value || reasonError.value || busy.value || !props.charge) {
    scrollToFirstError()
    return
  }
  busy.value = true
  try {
    await cuentas.voidCharge(props.accountId, props.charge, reason.value.trim())
    toast.success('Cargo anulado', 'El cargo dejó de contar en el total de la cuenta.')
    emit('voided')
    emit('close')
  } catch (e) {
    if (isConcurrencyConflict(e)) {
      toast.warn('Conflicto de concurrencia', getProblemDetailMessage(e))
      emit('refresh')
    } else {
      toast.errorFrom('No se pudo anular', e, 'No se pudo anular el cargo')
    }
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <ModalShell
    :open="open"
    title="Anular cargo"
    :subtitle="subtitle"
    :icon="Ban"
    accent="danger"
    :width="460"
    @close="emit('close')"
  >
    <template #body>
      <!-- Bloqueado: anular dejaría el saldo en negativo -->
      <div v-if="wouldGoNegative" class="blocked">
        <p class="blocked-title">No se puede anular este cargo</p>
        <p class="blocked-desc">
          El saldo pendiente quedaría en negativo: este cargo ({{
            formatMoney(charge?.amount ?? 0)
          }}) es mayor que el saldo actual ({{ formatMoney(outstanding) }}) porque ya hay abonos que
          lo cubren. <strong>Anula primero los abonos necesarios</strong> y vuelve a intentarlo.
        </p>
      </div>

      <div v-else class="form">
        <p class="warn">
          El cargo quedará registrado como <strong>anulado</strong> (visible, tachado) y dejará de
          contar en el total. Esta acción registra tu autoría y el motivo.
        </p>
        <BaseField
          label="Motivo de la anulación"
          required
          :error="submitted ? (reasonError ?? undefined) : undefined"
        >
          <template #default="{ id }">
            <BaseTextarea
              :id="id"
              v-model="reason"
              :rows="3"
              placeholder="Ej. cargo erróneo, mascota equivocada, duplicado…"
            />
          </template>
        </BaseField>
      </div>
    </template>

    <template #footer-actions>
      <button type="button" class="ds-btn ds-btn--ghost ds-btn--lg" @click="emit('close')">
        {{ wouldGoNegative ? 'Entendido' : 'Cancelar' }}
      </button>
      <button
        v-if="!wouldGoNegative"
        type="button"
        class="ds-btn ds-btn--danger-solid ds-btn--lg"
        :disabled="busy"
        @click="submit"
      >
        {{ busy ? 'Anulando…' : 'Anular cargo' }}
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.warn {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--warm-600);
}
.warn strong {
  color: var(--danger-700);
}
.blocked {
  padding: 14px 16px;
  background: oklch(96% 0.04 25deg);
  border: 1px solid oklch(88% 0.09 25deg);
  border-radius: 11px;
}
.blocked-title {
  margin: 0 0 6px;
  font-size: 14px;
  font-weight: 600;
  color: oklch(45% 0.18 25deg);
}
.blocked-desc {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--warm-700);
}
.blocked-desc strong {
  color: oklch(45% 0.18 25deg);
}
</style>
