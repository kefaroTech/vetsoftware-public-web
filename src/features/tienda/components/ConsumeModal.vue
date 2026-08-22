<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Syringe } from 'lucide-vue-next'
import ModalShell from '@/components/ui/ModalShell.vue'
import BaseField from '@/components/ui/BaseField.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'
import type { ProductResponse } from '../types/tienda'
import { scrollToFirstError } from '@/composables/scrollToError'

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
  /**
   * FORM-10 — lo controla el padre mientras la mutación está en vuelo. Opcional:
   * sin pasarlo el modal se protege igual con su propia bandera (`emitted`).
   */
  saving?: boolean
}>()
const emit = defineEmits<{ close: []; confirm: [draft: ConsumeDraft] }>()

const form = reactive({ qty: '', reason: '' })
const submitted = ref(false)

/**
 * FORM-10 — guarda de reenvío. `submit()` es síncrono y el modal sigue clicable
 * hasta que el padre lo cierre: dos pulsaciones serían dos salidas de stock. La
 * bandera se levanta al emitir y baja al reabrir.
 */
const emitted = ref(false)
const busy = computed(() => props.saving === true || emitted.value)

watch(
  () => props.open,
  (open) => {
    if (open) {
      Object.assign(form, { qty: '', reason: '' })
      submitted.value = false
      emitted.value = false
    }
  },
)

const qtyN = computed(() => Math.max(0, Math.floor(Number(form.qty.replace(',', '.')) || 0)))
const qtyError = computed(() => (submitted.value && qtyN.value <= 0 ? 'Cantidad > 0' : undefined))

function submit() {
  if (busy.value) return
  submitted.value = true
  if (qtyN.value <= 0) {
    void scrollToFirstError()
    return
  }
  emitted.value = true
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
      <div class="ds-stack ds-stack--14">
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
        <!-- La opcionalidad va en la etiqueta, que no desaparece al escribir (R16.5). -->
        <BaseField label="Motivo / paciente (opcional)">
          <template #default="{ id }">
            <BaseTextarea
              :id="id"
              v-model="form.reason"
              :rows="2"
              placeholder="Paciente, procedimiento…"
            />
          </template>
        </BaseField>
      </div>
    </template>

    <template #footer-actions>
      <button type="button" class="ds-btn ds-btn--ghost ds-btn--lg" @click="emit('close')">
        Cancelar
      </button>
      <button
        type="button"
        class="ds-btn ds-btn--primary ds-btn--lg"
        :disabled="busy"
        @click="submit"
      >
        {{ busy ? 'Guardando…' : 'Registrar consumo' }}
      </button>
    </template>
  </ModalShell>
</template>

<!-- Sin estilos propios: el cuerpo es `.ds-stack--14` y los campos son `BaseField`. -->
