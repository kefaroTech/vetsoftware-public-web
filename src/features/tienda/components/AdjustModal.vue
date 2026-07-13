<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { SlidersHorizontal } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import BaseField from '@/features/dashboard/components/ui/BaseField.vue'
import BaseInput from '@/features/dashboard/components/ui/BaseInput.vue'
import BaseTextarea from '@/features/dashboard/components/ui/BaseTextarea.vue'
import type { ProductResponse } from '../types/tienda'

/** Ajuste de conteo físico: entrada (+) o salida (−) con motivo obligatorio. */
export interface AdjustDraft {
  delta: number
  reason: string
  unitCost: number | null
}

const props = defineProps<{ open: boolean; product: ProductResponse | null; branchName?: string; current?: number }>()
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
const reasonError = computed(() => (submitted.value && !form.reason.trim() ? 'El motivo es obligatorio' : undefined))
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
    :subtitle="product ? `${product.name}${branchName ? ` · ${branchName}` : ''}${current != null ? ` · actual ${current} u` : ''}` : ''"
    :icon="SlidersHorizontal"
    :width="480"
    @close="emit('close')"
  >
    <template #body>
      <div class="body">
        <div class="seg" role="tablist">
          <button type="button" :class="{ on: dir === 'in' }" @click="dir = 'in'">Entrada (+)</button>
          <button type="button" :class="{ on: dir === 'out' }" @click="dir = 'out'">Salida (−)</button>
        </div>
        <div class="grid">
          <BaseField label="Cantidad" required :error="qtyError">
            <template #default="{ id }">
              <BaseInput :id="id" v-model="form.qty" :invalid="!!qtyError" inputmode="numeric" placeholder="0" />
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
            <BaseTextarea :id="id" v-model="form.reason" :rows="2" placeholder="Conteo físico, merma, corrección…" />
          </template>
        </BaseField>
      </div>
    </template>

    <template #footer-actions>
      <button type="button" class="btn-ghost" @click="emit('close')">Cancelar</button>
      <button type="button" class="btn-primary" @click="submit">Aplicar ajuste</button>
    </template>
  </ModalShell>
</template>

<style scoped>
.body { display: flex; flex-direction: column; gap: 14px; }
.seg { display: inline-flex; background: var(--warm-100); border: 1px solid var(--warm-200); border-radius: 9px; padding: 2px; align-self: flex-start; }
.seg button { border: none; background: transparent; font-family: inherit; font-size: 12.5px; font-weight: 500; color: var(--warm-600); padding: 6px 14px; border-radius: 7px; cursor: pointer; }
.seg button.on { background: var(--warm-50); color: var(--amatista-700); box-shadow: 0 1px 2px rgba(50, 20, 80, 0.08); }
.grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px 16px; }
@media (max-width: 560px) { .grid { grid-template-columns: 1fr; } }
.btn-primary {
  font-family: inherit; font-size: 13.5px; font-weight: 500; padding: 10px 18px; border-radius: 9px; cursor: pointer;
  border: none; color: white;
  background: linear-gradient(135deg, oklch(45% 0.18 var(--hue)), oklch(38% 0.18 calc(var(--hue) - 5)));
}
.btn-ghost {
  font-family: inherit; font-size: 13.5px; font-weight: 500; padding: 10px 18px; border-radius: 9px; cursor: pointer;
  background: transparent; border: 1px solid var(--warm-200); color: var(--warm-700);
}
.btn-ghost:hover { background: var(--warm-100); }
</style>
