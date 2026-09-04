<script setup lang="ts">
import { computed, reactive } from 'vue'
import { Plus } from 'lucide-vue-next'
import BaseField from '@/components/ui/BaseField.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import { useTienda } from '@/features/tienda/composables/useTienda'
import { formatMoney } from '@/features/tienda/composables/pricing'

/**
 * Mini-formulario de cargo libre (sin catálogo) de `OpenAccountModal`: concepto,
 * valor unitario, cantidad e impuesto.
 *
 * Sale con sus 5 reglas de CSS y su saneado de entrada. Emite el cargo ya
 * normalizado; el carrito lo añade el padre con `addGeneral`.
 */
const emit = defineEmits<{
  add: [
    charge: { name: string; unitPrice: number; qty: number; taxId: number | null; hasTax: boolean },
  ]
}>()

const tienda = useTienda()

const general = reactive({ name: '', unitAmount: '', quantity: '1', taxId: '' })

// COP en enteros: se descartan no-dígitos (incl. separador de miles) en el valor unitario y se fuerza la
// cantidad a un entero. Evita `Number("50.000") === 50` y fracciones/cantidades inválidas que antes pasaban
// vía `Number(x.replace(',', '.'))`.
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

const taxOptions = computed(() => [
  { value: '', label: 'Sin impuesto' },
  ...tienda.taxes.value.map((t) => ({
    value: String(t.id),
    label: `${t.name} (${t.percentage}%)`,
  })),
])

// Monto libre por diseño (sin catálogo): se permite 0, pero exige un valor
// explícito; la cantidad debe ser entera >= 1.
const canAdd = computed(
  () => general.name.trim().length >= 2 && unitAmountDigits.value !== '' && quantityNum.value >= 1,
)

function submit() {
  if (!canAdd.value) return
  emit('add', {
    name: general.name.trim(),
    unitPrice: unitAmountNum.value,
    qty: quantityNum.value || 1,
    taxId: general.taxId ? Number(general.taxId) : null,
    hasTax: general.taxId !== '',
  })
  Object.assign(general, { name: '', unitAmount: '', quantity: '1', taxId: '' })
}
</script>

<template>
  <div class="general-form ds-stack ds-stack--14">
    <BaseField label="Concepto" required>
      <template #default="{ id }">
        <BaseInput :id="id" v-model="general.name" placeholder="Ej. Insumo, recargo…" />
      </template>
    </BaseField>
    <div class="grid">
      <BaseField label="Valor unitario" required>
        <template #default="{ id }">
          <BaseInput :id="id" v-model="unitAmountDisplay" inputmode="numeric" placeholder="0" />
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
      class="add-btn solid ds-tone--accent-soft"
      :class="{ 'ds-is-disabled': !canAdd }"
      :disabled="!canAdd"
      @click="submit"
    >
      <Plus :size="14" :stroke-width="1.9" /> Agregar al carrito
    </button>
  </div>
</template>

<style scoped>
/* Layout via primitivas: `.ds-stack--14`, `.ds-tone--accent-soft` y
   `.ds-is-disabled` (enganchada con `:class`; no sustituye al atributo nativo). */
.general-form {
  margin-bottom: 16px;
}

/* `.grid` sigue local: rejilla intrínseca de mínimo 220px, que ninguna
   primitiva replica. */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
}

/* El mismo botón que usa AccountCatalogPanel; aquí lo lleva el cargo general
   con el modificador `.solid`. Se duplica porque el CSS scoped no cruza
   fronteras de componente. */
.add-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: 12.5px;
  font-weight: 500;
  border-radius: 8px;
  cursor: pointer;
  font-family: inherit;
  border: 1px solid var(--amatista-450);
}

.add-btn:hover:not(:disabled) {
  background: var(--amatista-100);
}

.add-btn.solid {
  background: var(--gradient-primary);
  color: var(--warm-50);
  border: none;
  padding: 9px 16px;
  font-size: 13px;
  align-self: flex-start;
}
</style>
