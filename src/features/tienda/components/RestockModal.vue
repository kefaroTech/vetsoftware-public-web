<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Package } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import BaseField from '@/features/dashboard/components/ui/BaseField.vue'
import BaseInput from '@/features/dashboard/components/ui/BaseInput.vue'
import type { ProductResponse } from '../types/tienda'

const props = defineProps<{ open: boolean; product: ProductResponse | null }>()
const emit = defineEmits<{ close: []; confirm: [qty: number] }>()

const qty = ref('')

watch(
  () => props.open,
  (open) => {
    if (open) qty.value = ''
  },
)

const n = computed(() => Math.max(0, Math.floor(Number(qty.value.replace(',', '.')) || 0)))
</script>

<template>
  <ModalShell
    :open="open"
    title="Reabastecer"
    :subtitle="product ? `${product.name} · stock actual ${product.currentStock} u` : ''"
    :icon="Package"
    :width="420"
    @close="emit('close')"
  >
    <template #body>
      <div class="body">
        <BaseField label="Unidades a agregar" required>
          <template #default="{ id }">
            <BaseInput :id="id" v-model="qty" inputmode="numeric" placeholder="12" />
          </template>
        </BaseField>
        <div v-if="product && n > 0" class="change">
          <span>Nuevo stock</span>
          <strong>{{ product.currentStock + n }} u</strong>
        </div>
      </div>
    </template>

    <template #footer-actions>
      <button type="button" class="btn-ghost" @click="emit('close')">Cancelar</button>
      <button type="button" class="btn-primary" :disabled="n <= 0" @click="emit('confirm', n)">
        Sumar {{ n > 0 ? `${n} u` : '' }}
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
.body { display: flex; flex-direction: column; gap: 14px; }
.change { display: flex; align-items: center; justify-content: space-between; padding: 11px 14px; background: var(--amatista-50); border-radius: 9px; font-size: 13px; color: var(--warm-700); }
.change strong { font-size: 16px; color: var(--amatista-700); }
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
