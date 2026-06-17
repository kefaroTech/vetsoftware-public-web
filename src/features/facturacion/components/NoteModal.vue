<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { FileMinus, FilePlus } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import BaseField from '@/features/dashboard/components/ui/BaseField.vue'
import BaseSelect from '@/features/dashboard/components/ui/BaseSelect.vue'
import { getProblemDetailMessage } from '@/services/http/http.client'
import { useToast } from '@/composables/useToast'
import { useFacturacionDocs } from '../composables/useFacturacionDocs'
import {
  CREDIT_REASON_LABEL,
  DEBIT_REASON_LABEL,
  type CreditNoteReason,
  type DebitNoteReason,
} from '../types/facturacion'

const props = defineProps<{ open: boolean; kind: 'credit' | 'debit'; documentId: number | null }>()
const emit = defineEmits<{ close: []; done: [id: number] }>()

const docs = useFacturacionDocs()
const toast = useToast()

const isCredit = computed(() => props.kind === 'credit')
const reasonOptions = computed(() =>
  Object.entries(isCredit.value ? CREDIT_REASON_LABEL : DEBIT_REASON_LABEL).map(
    ([value, label]) => ({ value, label }),
  ),
)

const reason = ref<string>('')
const busy = ref(false)

watch(
  () => props.open,
  (open) => {
    if (!open) return
    reason.value = isCredit.value ? 'ANULACION' : 'INTERESES'
    busy.value = false
  },
)

async function confirm(): Promise<void> {
  if (props.documentId == null || busy.value || !reason.value) return
  busy.value = true
  try {
    const note = isCredit.value
      ? await docs.creditNote(props.documentId, reason.value as CreditNoteReason)
      : await docs.debitNote(props.documentId, reason.value as DebitNoteReason)
    toast.success(
      isCredit.value ? 'Nota crédito emitida' : 'Nota débito emitida',
      'Enviada a la DIAN · validando…',
    )
    emit('done', note.id)
    emit('close')
  } catch (e) {
    toast.error('No se pudo emitir la nota', getProblemDetailMessage(e))
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <ModalShell
    :open="open"
    :title="isCredit ? 'Emitir nota crédito' : 'Emitir nota débito'"
    :subtitle="isCredit ? 'Corrige (anula/rebaja) una factura validada' : 'Aumenta el valor de una factura validada'"
    :icon="isCredit ? FileMinus : FilePlus"
    :width="480"
    @close="emit('close')"
  >
    <template #body>
      <div class="body">
        <BaseField label="Motivo" required>
          <template #default="{ id }">
            <BaseSelect :id="id" v-model="reason" :options="reasonOptions" />
          </template>
        </BaseField>
        <p class="note">
          La nota se emite y transmite a la DIAN; la validación es asíncrona.
          <template v-if="isCredit"> Al validarse, la factura original queda anulada y se reversa su cartera.</template>
        </p>
      </div>
    </template>

    <template #footer-actions>
      <button type="button" class="btn-ghost" @click="emit('close')">Cancelar</button>
      <button type="button" class="btn-primary" :disabled="busy || !reason" @click="confirm">
        {{ busy ? 'Emitiendo…' : 'Emitir nota' }}
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
.body { display: flex; flex-direction: column; gap: 14px; }
.note { margin: 0; font-size: 12.5px; color: var(--warm-600); line-height: 1.45; }
.btn-primary {
  font-family: inherit; font-size: 13.5px; font-weight: 500; padding: 10px 18px; border-radius: 9px; cursor: pointer;
  border: none; color: white; background: var(--amatista-700);
}
.btn-primary:hover:not(:disabled) { filter: brightness(1.05); }
.btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }
.btn-ghost {
  font-family: inherit; font-size: 13.5px; font-weight: 500; padding: 10px 18px; border-radius: 9px; cursor: pointer;
  background: transparent; border: 1px solid var(--warm-200); color: var(--warm-700);
}
.btn-ghost:hover { background: var(--warm-100); }
</style>
