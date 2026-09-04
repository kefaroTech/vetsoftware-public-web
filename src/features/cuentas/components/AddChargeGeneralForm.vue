<script setup lang="ts">
import { computed, reactive } from 'vue'
import { Plus } from 'lucide-vue-next'
import BaseField from '@/components/ui/BaseField.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import { useTienda } from '@/features/tienda/composables/useTienda'
import { formatMoney } from '@/features/tienda/composables/pricing'

/** Cargo libre ya normalizado: importes enteros y el impuesto resuelto a id. */
export interface GeneralChargeDraft {
  name: string
  unitAmount: number
  quantity: number
  taxId: number | null
  hasTax: boolean
}

/**
 * Cargo libre (sin catálogo) del modal «Agregar cargo»: concepto, valor
 * unitario, cantidad e impuesto, con su saneado de entrada y su validación.
 *
 * Sale de `AddChargeModal` con las tres reglas de CSS que solo usaba este
 * bloque. Como se dibuja dentro del cuerpo de `ModalShell` (`v-if="open"`),
 * cada apertura del modal lo monta vacío sin código de reinicio.
 *
 * Hermano de `GeneralChargeForm.vue`, que hace lo propio para el carrito de
 * `OpenAccountModal`. No se unifican: aquel vacía el formulario en cuanto emite
 * porque el carrito es local y no puede fallar; este NO puede hacerlo, porque
 * detrás hay un POST que sí falla y el reintento tiene que reenviar exactamente
 * lo mismo (ver `reset`).
 */
const props = defineProps<{
  /** Hay un envío en curso en el padre: apaga el botón. */
  busy: boolean
}>()

const emit = defineEmits<{ add: [charge: GeneralChargeDraft] }>()

const tienda = useTienda()

const general = reactive({ name: '', unitAmount: '', quantity: '1', taxId: '' })

const taxOptions = computed(() => [
  { value: '', label: 'Sin impuesto' },
  ...tienda.taxes.value.map((t) => ({
    value: String(t.id),
    label: `${t.name} (${t.percentage}%)`,
  })),
])

// COP en enteros: se descartan no-dígitos (incl. separador de miles) en el valor unitario y se fuerza la
// cantidad a un entero. Evita `Number("1.500") === 1.5`, cantidades negativas/cero (crédito encubierto) y
// fracciones que antes pasaban vía `Number("2.5")`.
const unitAmountDigits = computed(() => general.unitAmount.replace(/\D/g, ''))
const unitAmountNum = computed(() => Number(unitAmountDigits.value) || 0)
const unitAmountDisplay = computed({
  get: () => (general.unitAmount === '' ? '' : formatMoney(unitAmountNum.value)),
  set: (v: string) => {
    general.unitAmount = v.replace(/\D/g, '')
  },
})
const quantityNum = computed(() => Number(general.quantity.replace(/\D/g, '')) || 0)
const quantityDisplay = computed({
  get: () => general.quantity,
  set: (v: string) => {
    general.quantity = v.replace(/\D/g, '')
  },
})
const canAdd = computed(
  // Monto libre por diseño (sin catálogo): se permite 0, pero exige un valor explícito; la cantidad debe ser entera >= 1.
  () => general.name.trim().length >= 2 && unitAmountDigits.value !== '' && quantityNum.value >= 1,
)

function submit(): void {
  if (!canAdd.value || props.busy) return
  emit('add', {
    name: general.name.trim(),
    unitAmount: unitAmountNum.value,
    quantity: quantityNum.value,
    taxId: general.taxId ? Number(general.taxId) : null,
    hasTax: general.taxId !== '',
  })
}

/**
 * Vacía el formulario. **Solo el padre la llama, y solo con el cargo ya
 * creado.** Si el POST falla, lo escrito se queda donde está: el reintento
 * emite los mismos valores, el padre reconstruye el mismo `op` y viaja la misma
 * clave de idempotencia. Vaciar en `submit` —como hace el hermano del carrito—
 * haría imposible reintentar el mismo cargo y devolvería el cobro doble.
 */
function reset(): void {
  Object.assign(general, { name: '', unitAmount: '', quantity: '1', taxId: '' })
}

defineExpose({ reset })
</script>

<template>
  <div class="ds-stack ds-stack--14">
    <BaseField label="Concepto" required>
      <template #default="{ id }">
        <BaseInput :id="id" v-model="general.name" placeholder="Ej. Insumo, recargo…" />
      </template>
    </BaseField>
    <div class="grid">
      <BaseField label="Valor unitario (IVA incl.)" required>
        <template #default="{ id }">
          <BaseInput :id="id" v-model="unitAmountDisplay" inputmode="numeric" placeholder="$0" />
        </template>
      </BaseField>
      <BaseField label="Cantidad" required>
        <template #default="{ id }">
          <BaseInput :id="id" v-model="quantityDisplay" inputmode="numeric" placeholder="1" />
        </template>
      </BaseField>
      <BaseField label="Impuesto">
        <template #default="{ id }">
          <BaseSelect
            :id="id"
            v-model="general.taxId"
            :options="taxOptions"
            placeholder="Sin impuesto"
          />
        </template>
      </BaseField>
    </div>
    <button
      type="button"
      class="add-btn"
      :class="{ 'ds-is-disabled': !canAdd || busy }"
      :disabled="!canAdd || busy"
      @click="submit"
    >
      <Plus :size="14" :stroke-width="1.9" /> Agregar cargo general
    </button>
  </div>
</template>

<style scoped>
/* Layout via primitivas: .ds-stack(--14) y .ds-is-disabled (enganchada con
   `:class`; no sustituye al atributo nativo).

   `.grid` sigue local: es una rejilla intrínseca de mínimo 220px, no el par
   `repeat(2,…)` + media query que replican las primitivas de rejilla. */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
}

/* Un único cuerpo, no el par `.add-btn` + `.add-btn.solid` que había: aquí el
   botón sólido es el único que existe, así que se escribe con sus valores
   finales ya resueltos. El `.add-btn` base sin resolver vive en los otros tres
   componentes de cargos y el presupuesto de CSS solo tolera tres copias: una
   cuarta idéntica rompería `css:budget`. El `:hover` sí gana al degradado
   —(0,3,0) contra (0,2,0)—, que es lo que hacía antes y se conserva. */
.add-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 16px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 8px;
  cursor: pointer;
  font-family: inherit;
  border: none;
  background: var(--gradient-primary);
  color: var(--warm-50);
  align-self: flex-start;
}
.add-btn:hover:not(:disabled) {
  background: var(--amatista-100);
}
</style>
