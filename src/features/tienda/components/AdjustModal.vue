<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { SlidersHorizontal } from 'lucide-vue-next'
import ModalShell from '@/components/ui/ModalShell.vue'
import BaseField from '@/components/ui/BaseField.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'
import SegTabs from './SegTabs.vue'
import type { ProductResponse } from '../types/tienda'

/** Ajuste de conteo físico: entrada (+) o salida (−) con motivo obligatorio. */
export interface AdjustDraft {
  delta: number
  reason: string
  unitCost: number | null
}

const props = defineProps<{
  open: boolean
  product: ProductResponse | null
  branchName?: string
  current?: number
}>()
const emit = defineEmits<{ close: []; confirm: [draft: AdjustDraft] }>()

const dir = ref<'in' | 'out'>('in')
const form = reactive({ qty: '', reason: '', unitCost: '' })
const submitted = ref(false)

watch(
  () => props.open,
  (open) => {
    if (open) {
      dir.value = 'in'
      Object.assign(form, { qty: '', reason: '', unitCost: '' })
      submitted.value = false
    }
  },
)

const qtyN = computed(() => Math.max(0, Math.floor(Number(form.qty.replace(',', '.')) || 0)))
const costN = computed(() => Math.max(0, Number(form.unitCost.replace(/\D/g, '')) || 0))
const delta = computed(() => (dir.value === 'in' ? qtyN.value : -qtyN.value))
const reasonError = computed(() =>
  submitted.value && !form.reason.trim() ? 'El motivo es obligatorio' : undefined,
)
const qtyError = computed(() => (submitted.value && qtyN.value <= 0 ? 'Cantidad > 0' : undefined))

function submit() {
  submitted.value = true
  if (qtyN.value <= 0 || !form.reason.trim()) return
  emit('confirm', {
    delta: delta.value,
    reason: form.reason.trim(),
    unitCost: dir.value === 'in' ? costN.value : null,
  })
}
</script>

<template>
  <ModalShell
    :open="open"
    title="Ajustar inventario"
    :subtitle="
      product
        ? `${product.name}${branchName ? ` · ${branchName}` : ''}${current != null ? ` · actual ${current} u` : ''}`
        : ''
    "
    :icon="SlidersHorizontal"
    :width="480"
    @close="emit('close')"
  >
    <template #body>
      <div class="ds-stack ds-stack--14">
        <SegTabs
          v-model="dir"
          size="md"
          :options="[
            { value: 'in', label: 'Entrada (+)' },
            { value: 'out', label: 'Salida (−)' },
          ]"
        />
        <div class="grid">
          <BaseField label="Cantidad" required :error="qtyError">
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
          <BaseField v-if="dir === 'in'" label="Costo unitario">
            <template #default="{ id }">
              <BaseInput :id="id" v-model="form.unitCost" inputmode="numeric" placeholder="0" />
            </template>
          </BaseField>
        </div>
        <BaseField label="Motivo" required :error="reasonError">
          <template #default="{ id }">
            <BaseTextarea
              :id="id"
              v-model="form.reason"
              :rows="2"
              placeholder="Conteo físico, merma, corrección…"
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
        Aplicar ajuste
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
/* El cuerpo es `.ds-stack--14` y el conmutador `SegTabs`; queda su colocación,
   que sí es de este modal. */
.seg {
  align-self: flex-start;
}
.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px 16px;
}

@media (width <= 560px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
