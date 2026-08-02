<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ArrowLeftRight } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import BaseField from '@/features/dashboard/components/ui/BaseField.vue'
import BaseInput from '@/features/dashboard/components/ui/BaseInput.vue'
import BaseSelect from '@/features/dashboard/components/ui/BaseSelect.vue'
import BaseTextarea from '@/features/dashboard/components/ui/BaseTextarea.vue'
import type { ProductResponse } from '../types/tienda'

export interface TransferDraft {
  toBranchId: number
  quantity: number
  reason: string | null
}

const props = defineProps<{
  open: boolean
  product: ProductResponse | null
  fromBranchName?: string
  current?: number
  /** Sedes destino (todas las de la empresa menos la de origen), como opciones de BaseSelect. */
  branchOptions: { value: string; label: string }[]
}>()
const emit = defineEmits<{ close: []; confirm: [draft: TransferDraft] }>()

const form = reactive({ toBranchId: '', qty: '', reason: '' })
const submitted = ref(false)

watch(
  () => props.open,
  (open) => {
    if (open) {
      Object.assign(form, { toBranchId: '', qty: '', reason: '' })
      submitted.value = false
    }
  },
)

const qtyN = computed(() => Math.max(0, Math.floor(Number(form.qty.replace(',', '.')) || 0)))
const destError = computed(() =>
  submitted.value && !form.toBranchId ? 'Selecciona la sede destino' : undefined,
)
const qtyError = computed(() =>
  submitted.value && (qtyN.value <= 0 || (props.current != null && qtyN.value > props.current))
    ? 'Cantidad inválida o mayor al disponible'
    : undefined,
)

function submit() {
  submitted.value = true
  if (!form.toBranchId || qtyN.value <= 0 || (props.current != null && qtyN.value > props.current))
    return
  emit('confirm', {
    toBranchId: Number(form.toBranchId),
    quantity: qtyN.value,
    reason: form.reason.trim() || null,
  })
}
</script>

<template>
  <ModalShell
    :open="open"
    title="Transferir entre sedes"
    :subtitle="
      product
        ? `${product.name}${fromBranchName ? ` · desde ${fromBranchName}` : ''}${current != null ? ` · disponible ${current} u` : ''}`
        : ''
    "
    :icon="ArrowLeftRight"
    :width="480"
    @close="emit('close')"
  >
    <template #body>
      <div class="body">
        <BaseField label="Sede destino" required :error="destError">
          <template #default="{ id }">
            <BaseSelect
              :id="id"
              v-model="form.toBranchId"
              :options="branchOptions"
              :invalid="!!destError"
              placeholder="Selecciona…"
            />
          </template>
        </BaseField>
        <BaseField label="Unidades a transferir" required :error="qtyError">
          <template #default="{ id }">
            <BaseInput
              :id="id"
              v-model="form.qty"
              :invalid="!!qtyError"
              inputmode="numeric"
              placeholder="0"
            />
          </template>
        </BaseField>
        <BaseField label="Motivo">
          <template #default="{ id }">
            <BaseTextarea :id="id" v-model="form.reason" :rows="2" placeholder="Opcional" />
          </template>
        </BaseField>
      </div>
    </template>

    <template #footer-actions>
      <button type="button" class="btn-ghost" @click="emit('close')">Cancelar</button>
      <button type="button" class="btn-primary" @click="submit">Transferir</button>
    </template>
  </ModalShell>
</template>

<style scoped>
.body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.btn-primary {
  font-family: inherit;
  font-size: 13.5px;
  font-weight: 500;
  padding: 10px 18px;
  border-radius: 9px;
  cursor: pointer;
  border: none;
  color: white;
  background: linear-gradient(
    135deg,
    oklch(45% 0.18 var(--hue)),
    oklch(38% 0.18 calc(var(--hue) - 5))
  );
}

.btn-ghost {
  font-family: inherit;
  font-size: 13.5px;
  font-weight: 500;
  padding: 10px 18px;
  border-radius: 9px;
  cursor: pointer;
  background: transparent;
  border: 1px solid var(--warm-200);
  color: var(--warm-700);
}
.btn-ghost:hover {
  background: var(--warm-100);
}
</style>
