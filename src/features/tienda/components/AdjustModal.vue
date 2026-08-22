<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { SlidersHorizontal } from 'lucide-vue-next'
import ModalShell from '@/components/ui/ModalShell.vue'
import BaseField from '@/components/ui/BaseField.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'
import SegmentedRadio from '@/components/ui/SegmentedRadio.vue'
import { scrollToFirstError } from '@/composables/scrollToError'
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
  /**
   * FORM-10 — lo controla el padre mientras la mutación está en vuelo. Opcional:
   * sin pasarlo el modal se protege igual con su propia bandera (`emitted`).
   */
  saving?: boolean
}>()
const emit = defineEmits<{ close: []; confirm: [draft: AdjustDraft] }>()

const dir = ref<'in' | 'out'>('in')

/**
 * El sentido del movimiento es un VALOR del formulario, no un conmutador de
 * vista: elige el SIGNO del delta que se persiste en el ledger de inventario, y
 * su opción por defecto («Entrada») viaja en el envío tanto si el usuario la
 * toca como si no. Por eso es un grupo de radios (`SegmentedRadio`,
 * `role="radiogroup"`) y ya no `SegTabs`, que es `role="group"` +
 * `aria-pressed`: eso anuncia «botón de dos estados, pulsado», que es lo que
 * dicen los filtros Activos/Pausados de las vistas, no un campo obligatorio.
 */
const DIR_OPTIONS = [
  { value: 'in', label: 'Entrada (+)' },
  { value: 'out', label: 'Salida (−)' },
]

const form = reactive({ qty: '', reason: '', unitCost: '' })
const submitted = ref(false)

/**
 * FORM-10 — guarda de reenvío. `submit()` era SÍNCRONO: emitía `confirm` y el
 * modal se quedaba abierto y clicable hasta que el padre lo cerrara, así que
 * dos pulsaciones eran DOS movimientos de inventario. El modal no puede saber
 * cuándo termina la mutación (`emit` es síncrono), pero sí sabe que ya emitió:
 * la bandera se levanta al emitir y baja al reabrir, que es cuando el ajuste
 * anterior ya se resolvió de una forma o de otra.
 */
const emitted = ref(false)
const busy = computed(() => props.saving === true || emitted.value)

watch(
  () => props.open,
  (open) => {
    if (open) {
      dir.value = 'in'
      Object.assign(form, { qty: '', reason: '', unitCost: '' })
      submitted.value = false
      emitted.value = false
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
  if (busy.value) return
  submitted.value = true
  if (qtyN.value <= 0 || !form.reason.trim()) {
    void scrollToFirstError()
    return
  }
  emitted.value = true
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
        <BaseField label="Tipo de movimiento" required>
          <SegmentedRadio v-model="dir" :options="DIR_OPTIONS" />
        </BaseField>
        <div class="ds-grid-2">
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
      <button
        type="button"
        class="ds-btn ds-btn--primary ds-btn--lg"
        :disabled="busy"
        @click="submit"
      >
        {{ busy ? 'Guardando…' : 'Aplicar ajuste' }}
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
/* El cuerpo es `.ds-stack--14`. La colocación del conmutador se va con él: el
   grupo de radios vive dentro de un `BaseField` y se alinea con los demás
   campos, así que el `align-self` que compensaba al `SegTabs` suelto sobra. */

/* La rejilla es `.ds-grid-2` (primitives.css): coincidía con ella en las tres
   declaraciones, incluido el hueco 14/16, así que no queda residuo. Sólo se
   mueve el punto de colapso a móvil (640px en la primitiva, 560 aquí).

   NO es `.ds-grid-auto`: `ModalShell` ignora la prop `width` fuera del modo
   `compact`, así que el cuerpo no mide 480px sino ~90vw. Con el mínimo de 240px
   de la primitiva se abrirían seis pistas y `auto-fit` sólo colapsa las vacías:
   los dos campos quedarían en una fila de columnas estrechas. */
</style>
