<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { FileText } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import BaseField from '@/features/dashboard/components/ui/BaseField.vue'
import BaseSelect from '@/features/dashboard/components/ui/BaseSelect.vue'
import { CREDIT_REASON_LABEL, DEBIT_REASON_LABEL } from '../types/facturacion'

const props = defineProps<{ open: boolean; kind: 'credit' | 'debit' | null }>()
const emit = defineEmits<{ issue: [reason: string]; close: [] }>()

const reason = ref('')
const submitting = ref(false)

watch(
  () => props.open,
  (open) => {
    if (open) {
      reason.value = ''
      submitting.value = false
    }
  },
)

const isCredit = computed(() => props.kind === 'credit')
const options = computed(() => {
  const map = isCredit.value ? CREDIT_REASON_LABEL : DEBIT_REASON_LABEL
  return Object.entries(map).map(([value, label]) => ({ value, label }))
})

function submit() {
  if (!reason.value || submitting.value) return
  submitting.value = true
  emit('issue', reason.value)
}
</script>

<template>
  <ModalShell
    :open="open"
    :title="isCredit ? 'Emitir nota crédito' : 'Emitir nota débito'"
    :subtitle="
      isCredit ? 'Anulación, devolución o rebaja sobre la factura' : 'Aumento sobre la factura'
    "
    :icon="FileText"
    :accent="isCredit ? 'danger' : 'amatista'"
    :width="460"
    @close="emit('close')"
  >
    <template #body>
      <BaseField label="Motivo" required>
        <template #default="{ id }">
          <BaseSelect
            :id="id"
            v-model="reason"
            placeholder="Selecciona un motivo"
            :options="options"
          />
        </template>
      </BaseField>
      <p class="help">
        {{
          isCredit
            ? 'La nota crédito anula/corrige la factura validada y reversa la cartera. Sigue su propio ciclo de validación DIAN.'
            : 'La nota débito aumenta el valor de la factura. No reversa cartera.'
        }}
      </p>
    </template>

    <template #footer-actions>
      <button type="button" class="btn-ghost" @click="emit('close')">Cancelar</button>
      <button type="button" class="btn-primary" :disabled="!reason || submitting" @click="submit">
        {{ submitting ? 'Emitiendo…' : 'Emitir nota' }}
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
.help {
  margin: 14px 0 0;
  font-size: 12px;
  color: var(--warm-600);
  border-left: 3px solid var(--amatista-300);
  padding-left: 10px;
  line-height: 1.5;
}

.btn-ghost {
  padding: 9px 16px;
  border-radius: 9px;
  border: 1px solid var(--warm-200);
  background: var(--warm-50);
  color: var(--warm-700);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

.btn-primary {
  padding: 9px 18px;
  border-radius: 9px;
  border: none;
  background: linear-gradient(
    135deg,
    oklch(45% 0.18 var(--hue)),
    oklch(38% 0.18 calc(var(--hue) - 5))
  );
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
