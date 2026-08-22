<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ArrowLeftRight } from 'lucide-vue-next'
import ModalShell from '@/components/ui/ModalShell.vue'
import BaseField from '@/components/ui/BaseField.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'
import type { ProductResponse } from '../types/tienda'
import { scrollToFirstError } from '@/composables/scrollToError'

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
  /**
   * FORM-10 — lo controla el padre mientras la mutación está en vuelo. Opcional:
   * sin pasarlo el modal se protege igual con su propia bandera (`emitted`).
   */
  saving?: boolean
}>()
const emit = defineEmits<{ close: []; confirm: [draft: TransferDraft] }>()

const form = reactive({ toBranchId: '', qty: '', reason: '' })
const submitted = ref(false)

/**
 * FORM-10 — guarda de reenvío. `submit()` es síncrono y el modal sigue clicable
 * hasta que el padre lo cierre: dos pulsaciones serían dos transferencias entre
 * sedes. La bandera se levanta al emitir y baja al reabrir.
 */
const emitted = ref(false)
const busy = computed(() => props.saving === true || emitted.value)

watch(
  () => props.open,
  (open) => {
    if (open) {
      Object.assign(form, { toBranchId: '', qty: '', reason: '' })
      submitted.value = false
      emitted.value = false
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
  if (busy.value) return
  submitted.value = true
  if (
    !form.toBranchId ||
    qtyN.value <= 0 ||
    (props.current != null && qtyN.value > props.current)
  ) {
    void scrollToFirstError()
    return
  }
  emitted.value = true
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
      <div class="ds-stack ds-stack--14">
        <BaseField label="Sede destino" required :error="destError">
          <template #default="{ id }">
            <BaseSelect
              :id="id"
              v-model="form.toBranchId"
              :options="branchOptions"
              :invalid="!!destError"
              placeholder="Selecciona sede destino"
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
        <!-- La opcionalidad va en la etiqueta, que no desaparece al escribir (R16.5). -->
        <BaseField label="Motivo (opcional)">
          <template #default="{ id }">
            <BaseTextarea
              :id="id"
              v-model="form.reason"
              :rows="2"
              placeholder="Reposición, préstamo entre sedes…"
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
        {{ busy ? 'Guardando…' : 'Transferir' }}
      </button>
    </template>
  </ModalShell>
</template>

<!-- Sin estilos propios: el cuerpo es `.ds-stack--14` y los campos son `BaseField`. -->
