<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { Package } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import BaseField from '@/features/dashboard/components/ui/BaseField.vue'
import BaseInput from '@/features/dashboard/components/ui/BaseInput.vue'
import DateInput from '@/features/dashboard/components/ui/DateInput.vue'
import type { ProductResponse } from '../types/tienda'

/** Entrada de mercancía (recepción). La sede la decide la vista (sede activa); aquí solo cantidad, costo y lote. */
export interface ReceiveDraft {
  quantity: number
  unitCost: number
  lotNumber: string | null
  expireDate: string | null
}

const props = defineProps<{ open: boolean; product: ProductResponse | null; branchName?: string }>()
const emit = defineEmits<{ close: []; confirm: [draft: ReceiveDraft] }>()

interface Form {
  qty: string
  unitCost: string
  lotNumber: string
  expireDate: string
}
const form = reactive<Form>({ qty: '', unitCost: '', lotNumber: '', expireDate: '' })

watch(
  () => props.open,
  (open) => {
    if (open) Object.assign(form, { qty: '', unitCost: '', lotNumber: '', expireDate: '' })
  },
)

const qtyN = computed(() => Math.max(0, Math.floor(Number(form.qty.replace(',', '.')) || 0)))
const costN = computed(() => Math.max(0, Number(form.unitCost.replace(/\D/g, '')) || 0))
const valid = computed(() => qtyN.value > 0)

function submit() {
  if (!valid.value) return
  emit('confirm', {
    quantity: qtyN.value,
    unitCost: costN.value,
    lotNumber: form.lotNumber.trim() || null,
    expireDate: form.expireDate || null,
  })
}
</script>

<template>
  <ModalShell
    :open="open"
    title="Entrada de mercancía"
    :subtitle="product ? `${product.name}${branchName ? ` · ${branchName}` : ''}` : ''"
    :icon="Package"
    :width="480"
    @close="emit('close')"
  >
    <template #body>
      <div class="grid">
        <BaseField label="Unidades a ingresar" required>
          <template #default="{ id }">
            <BaseInput :id="id" v-model="form.qty" inputmode="numeric" placeholder="12" />
          </template>
        </BaseField>
        <BaseField label="Costo unitario">
          <template #default="{ id }">
            <BaseInput :id="id" v-model="form.unitCost" inputmode="numeric" placeholder="0" />
          </template>
        </BaseField>
        <BaseField label="Lote">
          <template #default="{ id }">
            <BaseInput :id="id" v-model="form.lotNumber" placeholder="Opcional" />
          </template>
        </BaseField>
        <BaseField label="Vencimiento">
          <template #default="{ id }">
            <DateInput :id="id" v-model="form.expireDate" placeholder="Opcional" />
          </template>
        </BaseField>
      </div>
    </template>

    <template #footer-actions>
      <button type="button" class="btn-ghost" @click="emit('close')">Cancelar</button>
      <button type="button" class="btn-primary" :disabled="!valid" @click="submit">
        Ingresar {{ qtyN > 0 ? `${qtyN} u` : '' }}
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
.grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px 16px; }
@media (max-width: 560px) { .grid { grid-template-columns: 1fr; } }
.btn-primary {
  font-family: inherit; font-size: 13.5px; font-weight: 500; padding: 10px 18px; border-radius: 9px; cursor: pointer;
  border: none; color: white;
  background: linear-gradient(135deg, oklch(45% 0.18 var(--hue)), oklch(38% 0.18 calc(var(--hue) - 5)));
}
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-ghost {
  font-family: inherit; font-size: 13.5px; font-weight: 500; padding: 10px 18px; border-radius: 9px; cursor: pointer;
  background: transparent; border: 1px solid var(--warm-200); color: var(--warm-700);
}
.btn-ghost:hover { background: var(--warm-100); }
</style>
