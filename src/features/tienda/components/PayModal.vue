<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { CreditCard } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import BaseField from '@/features/dashboard/components/ui/BaseField.vue'
import BaseInput from '@/features/dashboard/components/ui/BaseInput.vue'
import BaseSelect from '@/features/dashboard/components/ui/BaseSelect.vue'
import { formatMoney } from '../composables/pricing'

const props = defineProps<{ open: boolean; total: number }>()
const emit = defineEmits<{ close: []; confirm: [method: string, received: number | null] }>()

const form = reactive({ method: 'EFECTIVO', received: '' })

const METHOD_OPTIONS = [
  { value: 'EFECTIVO', label: 'Efectivo' },
  { value: 'TARJETA', label: 'Tarjeta' },
  { value: 'TRANSFERENCIA', label: 'Transferencia' },
]

watch(
  () => props.open,
  (open) => {
    if (open) {
      form.method = 'EFECTIVO'
      form.received = ''
    }
  },
)

const isCash = computed(() => form.method === 'EFECTIVO')
const receivedNum = computed(() => Number(form.received.replace(',', '.')) || 0)
const change = computed(() => Math.max(0, receivedNum.value - props.total))
const canConfirm = computed(() => !isCash.value || receivedNum.value >= props.total)

function confirm() {
  if (!canConfirm.value) return
  emit('confirm', form.method, isCash.value ? receivedNum.value : null)
}
</script>

<template>
  <ModalShell :open="open" title="Cobrar" :subtitle="`Total: ${formatMoney(total)}`" :icon="CreditCard" :width="440" @close="emit('close')">
    <template #body>
      <div class="form">
        <BaseField label="Método de pago" required>
          <template #default="{ id }">
            <BaseSelect :id="id" v-model="form.method" :options="METHOD_OPTIONS" />
          </template>
        </BaseField>
        <BaseField v-if="isCash" label="Efectivo recibido" required>
          <template #default="{ id }">
            <BaseInput :id="id" v-model="form.received" inputmode="decimal" placeholder="0" />
          </template>
        </BaseField>
        <div v-if="isCash && receivedNum > 0" class="change">
          <span>Cambio</span>
          <strong>{{ formatMoney(change) }}</strong>
        </div>
      </div>
    </template>
    <template #footer-actions>
      <button type="button" class="btn-ghost" @click="emit('close')">Cancelar</button>
      <button type="button" class="btn-primary" :disabled="!canConfirm" @click="confirm">Confirmar cobro</button>
    </template>
  </ModalShell>
</template>

<style scoped>
.form { display: flex; flex-direction: column; gap: 16px; }
.change { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; background: var(--amatista-50); border-radius: 10px; font-size: 14px; color: var(--warm-800); }
.change strong { font-size: 17px; color: var(--amatista-700); }
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
