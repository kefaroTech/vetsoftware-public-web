<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Package } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import BaseField from '@/features/dashboard/components/ui/BaseField.vue'
import BaseInput from '@/features/dashboard/components/ui/BaseInput.vue'
import BaseSelect from '@/features/dashboard/components/ui/BaseSelect.vue'
import BaseTextarea from '@/features/dashboard/components/ui/BaseTextarea.vue'
import { getProblemDetailMessage, isConcurrencyConflict } from '@/services/http/http.client'
import { useToast } from '@/composables/useToast'
import { useTienda } from '../composables/useTienda'
import { useSuppliers } from '@/features/compras/composables/useSuppliers'
import type { ProductPayload, ProductResponse, TaxScheme, TaxTreatment } from '../types/tienda'
import { scrollToFirstError } from '@/composables/scrollToError'

const props = defineProps<{
  open: boolean
  initial: ProductResponse | null
}>()

const emit = defineEmits<{
  close: []
  saved: [item: ProductResponse]
}>()

const CONFLICT_MESSAGE =
  'El registro fue modificado por otra operación; se recargó la información. Revisa y reintenta.'

const TAX_TREATMENT_OPTIONS: { value: TaxTreatment; label: string }[] = [
  { value: 'GRAVADO', label: 'Gravado' },
  { value: 'EXENTO', label: 'Exento (0%)' },
  { value: 'EXCLUIDO', label: 'Excluido' },
  { value: 'INC', label: 'INC' },
]
/** El selector de tarifa (taxId) solo aplica cuando hay IVA/INC que liquidar. */
function requiresTaxRate(t: TaxTreatment): boolean {
  return t === 'GRAVADO' || t === 'INC'
}
/** Tributo DIAN exigido por el tratamiento: GRAVADO liquida IVA, INC liquida INC. */
function schemeForTreatment(t: TaxTreatment): TaxScheme | null {
  if (t === 'GRAVADO') return 'IVA'
  if (t === 'INC') return 'INC'
  return null
}

const store = useTienda()
const toast = useToast()
const { all: suppliers, loadAll: loadSuppliers } = useSuppliers()

// Proveedor del catálogo (feature supplier). Opción vacía = sin proveedor asociado.
const supplierOptions = computed(() => [
  { value: '', label: 'Sin proveedor' },
  ...suppliers.value.map((s) => ({ value: String(s.id), label: s.name })),
])

interface Draft {
  name: string
  code: string
  salePrice: string
  provider: string
  supplierId: string
  notes: string
  productCategoryId: string
  taxTreatment: TaxTreatment
  taxId: string
  /** Versión (@Version) del item en edición; null en creación. Se reenvía en el PUT. */
  version: number | null
}

function emptyDraft(): Draft {
  return {
    name: '',
    code: '',
    salePrice: '',
    provider: '',
    supplierId: '',
    notes: '',
    productCategoryId: '',
    taxTreatment: 'GRAVADO',
    taxId: '',
    version: null,
  }
}

/** Carga el draft desde un producto existente (apertura en modo edición o re-hidratación tras 409). */
function hydrate(it: ProductResponse) {
  Object.assign(draft, {
    name: it.name,
    code: it.code,
    salePrice: String(it.salePrice),
    provider: it.provider ?? '',
    supplierId: it.supplier ? String(it.supplier.id) : '',
    notes: it.notes ?? '',
    productCategoryId: String(it.productCategory.id),
    taxTreatment: it.taxTreatment,
    taxId: it.tax ? String(it.tax.id) : '',
    version: it.version,
  } satisfies Draft)
}

const draft = reactive<Draft>(emptyDraft())

type FieldKey = 'name' | 'code' | 'salePrice' | 'productCategoryId' | 'taxId'
const touched = reactive<Record<FieldKey, boolean>>({
  name: false,
  code: false,
  salePrice: false,
  productCategoryId: false,
  taxId: false,
})
function resetTouched() {
  ;(Object.keys(touched) as FieldKey[]).forEach((k) => (touched[k] = false))
}
function markTouched(field: FieldKey) {
  touched[field] = true
}

const busy = ref(false)
const saveError = ref<string | null>(null)

const categoryOptions = computed(() =>
  store.productCategories.value.map((c) => ({ value: String(c.id), label: c.name })),
)
/** Tarifas filtradas por el tributo que exige el tratamiento seleccionado. */
const taxOptions = computed(() => {
  const scheme = schemeForTreatment(draft.taxTreatment)
  return store.taxes.value
    .filter((t) => scheme === null || t.taxScheme === scheme)
    .map((t) => ({ value: String(t.id), label: `${t.name} (${t.percentage}%)` }))
})

const showTaxRate = computed(() => requiresTaxRate(draft.taxTreatment))

const isEdit = computed(() => props.initial !== null)

// Para EXENTO/EXCLUIDO no hay tarifa: forzamos taxId vacío.
// Al cambiar de tratamiento, si la tarifa elegida ya no pertenece al tributo
// correspondiente (IVA↔INC), la limpiamos.
watch(
  () => draft.taxTreatment,
  (t) => {
    if (!requiresTaxRate(t)) {
      draft.taxId = ''
      return
    }
    const scheme = schemeForTreatment(t)
    const selected = store.taxes.value.find((x) => String(x.id) === draft.taxId)
    if (selected && scheme !== null && selected.taxScheme !== scheme) draft.taxId = ''
  },
)

watch(
  () => props.open,
  (open) => {
    if (!open) return
    resetTouched()
    saveError.value = null
    void loadSuppliers(true)
    if (props.initial) hydrate(props.initial)
    else Object.assign(draft, emptyDraft())
  },
)

function num(v: string): number {
  // Pesos COP y stock son enteros: se descartan no-dígitos (incl. separador de miles) para
  // evitar que `Number("50.000") === 50` trunque el valor. Alineado con formatMoney/AddChargeModal.
  return Number(String(v).replace(/\D/g, ''))
}

const errors = computed(() => ({
  name: draft.name.trim().length < 2 ? 'Mínimo 2 caracteres' : null,
  code: draft.code.trim().length < 1 ? 'Requerido' : null,
  salePrice: !(num(draft.salePrice) >= 0) ? 'Número ≥ 0' : null,
  productCategoryId: !draft.productCategoryId ? 'Selecciona una categoría' : null,
  taxId: requiresTaxRate(draft.taxTreatment) && !draft.taxId ? 'Selecciona la tarifa' : null,
}))

function err(field: FieldKey): string | undefined {
  return touched[field] ? (errors.value[field] ?? undefined) : undefined
}

const isValid = computed(() => Object.values(errors.value).every((e) => e === null))

/** Valida marcando todos los campos como tocados; expuesto para el patrón `defineExpose(validate)`. */
function validate(): boolean {
  ;(Object.keys(touched) as FieldKey[]).forEach((k) => (touched[k] = true))
  return isValid.value
}
defineExpose({ validate })

async function submit() {
  if (busy.value) return
  if (!validate()) {
    scrollToFirstError()
    return
  }
  busy.value = true
  saveError.value = null
  const payload: ProductPayload = {
    name: draft.name.trim(),
    code: draft.code.trim(),
    salePrice: num(draft.salePrice),
    provider: draft.provider.trim() || null,
    supplierId: draft.supplierId ? Number(draft.supplierId) : null,
    taxTreatment: draft.taxTreatment,
    notes: draft.notes.trim() || null,
    productCategoryId: Number(draft.productCategoryId),
    taxId: requiresTaxRate(draft.taxTreatment) && draft.taxId ? Number(draft.taxId) : null,
  }
  // En edición reenviamos la versión leída (@Version) para que el backend detecte conflictos.
  if (props.initial && draft.version != null) payload.version = draft.version
  const initialId = props.initial?.id
  try {
    const saved = props.initial
      ? await store.updateProduct(props.initial.id, payload)
      : await store.createProduct(payload)
    emit('saved', saved)
    emit('close')
  } catch (e) {
    if (isConcurrencyConflict(e)) {
      // Recargamos el catálogo para obtener la versión fresca y re-hidratamos el form para reintentar.
      await store.refresh()
      const fresh =
        initialId == null ? null : store.products.value.find((product) => product.id === initialId)
      if (fresh) hydrate(fresh)
      saveError.value = CONFLICT_MESSAGE
      toast.warn('Conflicto de concurrencia', CONFLICT_MESSAGE)
    } else {
      saveError.value = getProblemDetailMessage(e, 'No se pudo guardar el producto')
    }
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <ModalShell
    :open="open"
    :title="isEdit ? 'Editar producto' : 'Nuevo producto'"
    subtitle="Ficha de catálogo · el stock se gestiona en Inventario"
    :icon="Package"
    :width="680"
    @close="emit('close')"
  >
    <template #body>
      <div v-if="saveError" class="ds-banner ds-banner--error">{{ saveError }}</div>
      <div class="grid">
        <BaseField label="Nombre" required :error="err('name')" class="col-2">
          <template #default="{ id }">
            <BaseInput
              :id="id"
              v-model="draft.name"
              :invalid="!!err('name')"
              placeholder="Alimento premium 2kg"
              @blur="markTouched('name')"
            />
          </template>
        </BaseField>
        <BaseField label="Código / SKU" required :error="err('code')">
          <template #default="{ id }">
            <BaseInput
              :id="id"
              v-model="draft.code"
              :invalid="!!err('code')"
              placeholder="SKU-001"
              @blur="markTouched('code')"
            />
          </template>
        </BaseField>
        <BaseField label="Categoría" required :error="err('productCategoryId')">
          <template #default="{ id }">
            <BaseSelect
              :id="id"
              v-model="draft.productCategoryId"
              :options="categoryOptions"
              :invalid="!!err('productCategoryId')"
              placeholder="Selecciona…"
              @blur="markTouched('productCategoryId')"
            />
          </template>
        </BaseField>
        <BaseField label="Precio de venta (IVA incl.)" required :error="err('salePrice')">
          <template #default="{ id }">
            <BaseInput
              :id="id"
              v-model="draft.salePrice"
              :invalid="!!err('salePrice')"
              inputmode="decimal"
              placeholder="0"
              @blur="markTouched('salePrice')"
            />
          </template>
        </BaseField>
        <BaseField label="Proveedor" hint="Del catálogo de proveedores">
          <template #default="{ id }">
            <BaseSelect
              :id="id"
              v-model="draft.supplierId"
              :options="supplierOptions"
              placeholder="Sin proveedor"
            />
          </template>
        </BaseField>
        <BaseField label="Proveedor (texto libre)" hint="Opcional · referencia rápida">
          <template #default="{ id }">
            <BaseInput :id="id" v-model="draft.provider" placeholder="Opcional" />
          </template>
        </BaseField>
        <BaseField label="Tratamiento de IVA" required>
          <template #default="{ id }">
            <BaseSelect :id="id" v-model="draft.taxTreatment" :options="TAX_TREATMENT_OPTIONS" />
          </template>
        </BaseField>
        <BaseField v-if="showTaxRate" label="Tarifa de impuesto" required :error="err('taxId')">
          <template #default="{ id }">
            <BaseSelect
              :id="id"
              v-model="draft.taxId"
              :options="taxOptions"
              :invalid="!!err('taxId')"
              placeholder="Selecciona tarifa…"
              @blur="markTouched('taxId')"
            />
          </template>
        </BaseField>
        <BaseField label="Notas" class="col-2">
          <template #default="{ id }">
            <BaseTextarea :id="id" v-model="draft.notes" :rows="2" placeholder="Opcional" />
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
        {{ busy ? 'Guardando…' : 'Guardar' }}
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px 20px;
}
.col-2 {
  grid-column: 1 / -1;
}

@media (width <= 760px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
.margin-hint {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--amatista-700);
  background: var(--amatista-50);
  border: 1px solid var(--amatista-200);
  border-radius: 8px;
  padding: 8px 12px;
  margin-top: -4px;
}
.margin-hint.below {
  color: oklch(45% 0.18 25deg);
  background: oklch(96% 0.04 25deg);
  border-color: var(--danger-400);
}
.checks {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}
.check {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--warm-800);
  cursor: pointer;
}
.check input {
  width: 16px;
  height: 16px;
  accent-color: var(--amatista-600);
}
</style>
