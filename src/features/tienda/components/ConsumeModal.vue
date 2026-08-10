<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Syringe } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import BaseField from '@/features/dashboard/components/ui/BaseField.vue'
import BaseInput from '@/features/dashboard/components/ui/BaseInput.vue'
import BaseTextarea from '@/features/dashboard/components/ui/BaseTextarea.vue'
import type { ProductResponse } from '../types/tienda'

/** Consumo clínico manual: salida de una cantidad para aplicar a un paciente. */
export interface ConsumeDraft {
  quantity: number
  reason: string | null
}

const props = defineProps<{
  open: boolean
  product: ProductResponse | null
  branchName?: string
  current?: number
}>()
const emit = defineEmits<{ close: []; confirm: [draft: ConsumeDraft] }>()

const form = reactive({ qty: '', reason: '' })
const submitted = ref(false)

watch(
  () => props.open,
  (open) => {
    if (open) {
      Object.assign(form, { qty: '', reason: '' })
      submitted.value = false
    }
  },
)

const qtyN = computed(() => Math.max(0, Math.floor(Number(form.qty.replace(',', '.')) || 0)))
const qtyError = computed(() => (submitted.value && qtyN.value <= 0 ? 'Cantidad > 0' : undefined))

function submit() {
  submitted.value = true
  if (qtyN.value <= 0) return
  emit('confirm', { quantity: qtyN.value, reason: form.reason.trim() || null })
}
</script>

<template>
  <ModalShell
    :open="open"
    title="Consumo clínico"
    :subtitle="
      product
        ? `${product.name}${branchName ? ` · ${branchName}` : ''}${current != null ? ` · disponible ${current} u` : ''}`
        : ''
    "
    :icon="Syringe"
    :width="460"
    @close="emit('close')"
  >
    <template #body>
      <div class="body">
        <BaseField label="Unidades consumidas" required :error="qtyError">
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
        <BaseField label="Motivo / paciente">
          <template #default="{ id }">
            <BaseTextarea
              :id="id"
              v-model="form.reason"
              :rows="2"
              placeholder="Opcional (paciente, procedimiento…)"
            />
          </template>
        </BaseField>
      </div>
    </template>

    <template #footer-actions>
      <button type="button" class="ds-btn ds-btn--ghost ds-btn--lg" @click="emit('close')">
        Cancelar
      </button>
      <button type="button" class="ds-btn ds-btn--primary ds-btn--lg" @click="submit">
        Registrar consumo
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
.body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
</style>
