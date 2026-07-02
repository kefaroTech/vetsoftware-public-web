<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Package } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import BaseField from '@/features/dashboard/components/ui/BaseField.vue'
import BaseInput from '@/features/dashboard/components/ui/BaseInput.vue'
import BaseSelect from '@/features/dashboard/components/ui/BaseSelect.vue'
import BaseTextarea from '@/features/dashboard/components/ui/BaseTextarea.vue'
import DateInput from '@/features/dashboard/components/ui/DateInput.vue'
import { getProblemDetailMessage, isConcurrencyConflict } from '@/services/http/http.client'
import { useToast } from '@/composables/useToast'
import { formatMoney } from '../composables/pricing'
import { useTienda } from '../composables/useTienda'
import type { ProductPayload, ProductResponse, TaxScheme, TaxTreatment } from '../types/tienda'

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

const props = defineProps<{
  open: boolean
  initial: ProductResponse | null
}>()

const emit = defineEmits<{
  close: []
  saved: [item: ProductResponse]
}>()

const store = useTienda()
const toast = useToast()

interface Draft {
  name: string
  code: string
  purchasePrice: string
  salePrice: string
  currentStock: string
  minStock: string
  provider: string
  /** Fecha de vencimiento ISO `yyyy-MM-dd`; '' = sin fecha. Opcional. */
  expireDate: string
  /** Número de lote; opcional. */
  lotNumber: string
  notes: string
  productCategoryId: string
  taxTreatment: TaxTreatment
  taxId: string
  /** Versión (@Version) del item en edición; null en creación. Se reenvía en el PUT. */
  version: number | null
}

function emptyDraft(): Draft {
  return {
    name: '', code: '', purchasePrice: '', salePrice: '', currentStock: '0', minStock: '0',
    provider: '', expireDate: '', lotNumber: '', notes: '', productCategoryId: '',
    taxTreatment: 'GRAVADO', taxId: '',
    version: null,
  }
}

/** Carga el draft desde un producto existente (apertura en modo edición o re-hidratación tras 409). */
function hydrate(it: ProductResponse) {
  Object.assign(draft, {
    name: it.name,
    code: it.code,
    purchasePrice: String(it.purchasePrice),
    salePrice: String(it.salePrice),
    currentStock: String(it.currentStock),
    minStock: String(it.minStock),
    provider: it.provider ?? '',
    expireDate: it.expireDate ?? '',
    lotNumber: it.lotNumber ?? '',
    notes: it.notes ?? '',
    productCategoryId: String(it.productCategory.id),
    taxTreatment: it.taxTreatment,
    taxId: it.tax ? String(it.tax.id) : '',
    version: it.version,
  } satisfies Draft)
}

const draft = reactive<Draft>(emptyDraft())

type FieldKey = 'name' | 'code' | 'purchasePrice' | 'salePrice' | 'currentStock' | 'minStock' | 'productCategoryId' | 'taxId'
const touched = reactive<Record<FieldKey, boolean>>({
  name: false, code: false, purchasePrice: false, salePrice: false,
  currentStock: false, minStock: false, productCategoryId: false, taxId: false,
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
  purchasePrice: !(num(draft.purchasePrice) >= 0) ? 'Número ≥ 0' : null,
  salePrice: !(num(draft.salePrice) >= 0) ? 'Número ≥ 0' : null,
  currentStock: !(Number.isInteger(num(draft.currentStock)) && num(draft.currentStock) >= 0) ? 'Entero ≥ 0' : null,
  minStock: !(Number.isInteger(num(draft.minStock)) && num(draft.minStock) >= 0) ? 'Entero ≥ 0' : null,
  productCategoryId: !draft.productCategoryId ? 'Selecciona una categoría' : null,
  taxId: requiresTaxRate(draft.taxTreatment) && !draft.taxId ? 'Selecciona la tarifa' : null,
}))

function err(field: FieldKey): string | undefined {
  return touched[field] ? errors.value[field] ?? undefined : undefined
}

const isValid = computed(() => Object.values(errors.value).every((e) => e === null))

/** Valida marcando todos los campos como tocados; expuesto para el patrón `defineExpose(validate)`. */
function validate(): boolean {
  ;(Object.keys(touched) as FieldKey[]).forEach((k) => (touched[k] = true))
  return isValid.value
}
defineExpose({ validate })

/** Margen/utilidad en vivo a partir de precio de compra y venta (ambos con IVA incluido). */
const marginInfo = computed(() => {
  const purchase = num(draft.purchasePrice)
  const sale = num(draft.salePrice)
  if (!(sale > 0) || !(purchase >= 0)) return null
  return {
    pct: Math.round(((sale - purchase) / sale) * 100),
    utility: sale - purchase,
    below: sale < purchase,
  }
})

async function submit() {
  if (busy.value) return
  if (!validate()) return
  busy.value = true
  saveError.value = null
  const payload: ProductPayload = {
    name: draft.name.trim(),
    code: draft.code.trim(),
    purchasePrice: num(draft.purchasePrice),
    salePrice: num(draft.salePrice),
    currentStock: num(draft.currentStock),
    minStock: num(draft.minStock),
    provider: draft.provider.trim() || null,
    taxTreatment: draft.taxTreatment,
    expireDate: draft.expireDate || null,
    lotNumber: draft.lotNumber.trim() || null,
    notes: draft.notes.trim() || null,
    productCategoryId: Number(draft.productCategoryId),
    taxId: requiresTaxRate(draft.taxTreatment) && draft.taxId ? Number(draft.taxId) : null,
  }
  // En edición reenviamos la versión leída (@Version) para que el backend detecte conflictos.
  if (props.initial && draft.version != null) payload.version = draft.version
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
      const fresh = props.initial ? store.products.value.find((p) => p.id === props.initial!.id) : null
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
    subtitle="Datos de inventario y precio"
    :icon="Package"
    :width="680"
    @close="emit('close')"
  >
    <template #body>
      <div v-if="saveError" class="banner error">{{ saveError }}</div>
      <div class="grid">
        <BaseField label="Nombre" required :error="err('name')" class="col-2">
          <template #default="{ id }">
            <BaseInput :id="id" v-model="draft.name" :invalid="!!err('name')" placeholder="Alimento premium 2kg" @blur="markTouched('name')" />
          </template>
        </BaseField>
        <BaseField label="Código / SKU" required :error="err('code')">
          <template #default="{ id }">
            <BaseInput :id="id" v-model="draft.code" :invalid="!!err('code')" placeholder="SKU-001" @blur="markTouched('code')" />
          </template>
        </BaseField>
        <BaseField label="Categoría" required :error="err('productCategoryId')">
          <template #default="{ id }">
            <BaseSelect :id="id" v-model="draft.productCategoryId" :options="categoryOptions" :invalid="!!err('productCategoryId')" placeholder="Selecciona…" @blur="markTouched('productCategoryId')" />
          </template>
        </BaseField>
        <BaseField label="Precio de compra" required :error="err('purchasePrice')">
          <template #default="{ id }">
            <BaseInput :id="id" v-model="draft.purchasePrice" :invalid="!!err('purchasePrice')" inputmode="decimal" placeholder="0" @blur="markTouched('purchasePrice')" />
          </template>
        </BaseField>
        <BaseField label="Precio de venta (IVA incl.)" required :error="err('salePrice')">
          <template #default="{ id }">
            <BaseInput :id="id" v-model="draft.salePrice" :invalid="!!err('salePrice')" inputmode="decimal" placeholder="0" @blur="markTouched('salePrice')" />
          </template>
        </BaseField>
        <div v-if="marginInfo" class="margin-hint col-2" :class="{ below: marginInfo.below }">
          <template v-if="marginInfo.below">⚠ Se vende bajo costo — utilidad {{ formatMoney(marginInfo.utility) }}</template>
          <template v-else>Margen {{ marginInfo.pct }}% · utilidad {{ formatMoney(marginInfo.utility) }} por unidad</template>
        </div>
        <BaseField label="Stock actual" required :error="err('currentStock')">
          <template #default="{ id }">
            <BaseInput :id="id" v-model="draft.currentStock" :invalid="!!err('currentStock')" inputmode="numeric" placeholder="0" @blur="markTouched('currentStock')" />
          </template>
        </BaseField>
        <BaseField label="Stock mínimo" required :error="err('minStock')">
          <template #default="{ id }">
            <BaseInput :id="id" v-model="draft.minStock" :invalid="!!err('minStock')" inputmode="numeric" placeholder="0" @blur="markTouched('minStock')" />
          </template>
        </BaseField>
        <BaseField label="Proveedor">
          <template #default="{ id }">
            <BaseInput :id="id" v-model="draft.provider" placeholder="Opcional" />
          </template>
        </BaseField>
        <BaseField label="Fecha de vencimiento">
          <template #default="{ id }">
            <DateInput :id="id" v-model="draft.expireDate" placeholder="Opcional" />
          </template>
        </BaseField>
        <BaseField label="Lote">
          <template #default="{ id }">
            <BaseInput :id="id" v-model="draft.lotNumber" placeholder="Opcional" />
          </template>
        </BaseField>
        <BaseField label="Tratamiento de IVA" required>
          <template #default="{ id }">
            <BaseSelect :id="id" v-model="draft.taxTreatment" :options="TAX_TREATMENT_OPTIONS" />
          </template>
        </BaseField>
        <BaseField v-if="showTaxRate" label="Tarifa de impuesto" required :error="err('taxId')">
          <template #default="{ id }">
            <BaseSelect :id="id" v-model="draft.taxId" :options="taxOptions" :invalid="!!err('taxId')" placeholder="Selecciona tarifa…" @blur="markTouched('taxId')" />
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
      <button type="button" class="btn-ghost" @click="emit('close')">Cancelar</button>
      <button type="button" class="btn-primary" :disabled="busy" @click="submit">
        {{ busy ? 'Guardando…' : 'Guardar' }}
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
.grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px 20px; }
.col-2 { grid-column: 1 / -1; }
.margin-hint { font-size: 12.5px; font-weight: 500; color: var(--amatista-700); background: var(--amatista-50); border: 1px solid var(--amatista-200); border-radius: 8px; padding: 8px 12px; margin-top: -4px; }
.margin-hint.below { color: oklch(45% 0.18 25); background: oklch(96% 0.04 25); border-color: oklch(85% 0.12 25); }
.checks { display: flex; gap: 24px; flex-wrap: wrap; }
.check { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--warm-800); cursor: pointer; }
.check input { width: 16px; height: 16px; accent-color: var(--amatista-600); }
.banner.error { background: oklch(95% 0.06 25); border: 1px solid oklch(85% 0.12 25); color: oklch(40% 0.18 25); border-radius: 8px; padding: 10px 14px; font-size: 13px; margin-bottom: 14px; }
.btn-primary {
  font-family: inherit; font-size: 13.5px; font-weight: 500; padding: 10px 18px; border-radius: 9px; cursor: pointer;
  border: none; color: white;
  background: linear-gradient(135deg, oklch(45% 0.18 var(--hue)), oklch(38% 0.18 calc(var(--hue) - 5)));
}
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-ghost {
  font-family: inherit; font-size: 13.5px; font-weight: 500; padding: 10px 18px; border-radius: 9px; cursor: pointer;
  background: transparent; border: 1px solid var(--warm-200); color: var(--warm-700);
}
.btn-ghost:hover { background: var(--warm-100); }
</style>
