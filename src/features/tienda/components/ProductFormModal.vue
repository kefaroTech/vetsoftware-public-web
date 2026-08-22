<script setup lang="ts">
import { computed, nextTick, reactive, ref, useId, watch } from 'vue'
import { Package } from 'lucide-vue-next'
import ErrorSummary from '@/components/feedback/ErrorSummary.vue'
import ModalShell from '@/components/ui/ModalShell.vue'
import BaseField from '@/components/ui/BaseField.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'
import { getProblemDetailMessage, isConcurrencyConflict } from '@/services/http/http.client'
import { useServerFieldErrors } from '@/composables/useServerFieldErrors'
import { useConcurrencyConflict } from '@/composables/useConcurrencyConflict'
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
/** Orden VISUAL del formulario. El resumen de errores lo respeta (WCAG §2.4.3). */
const FIELD_ORDER = ['name', 'code', 'productCategoryId', 'salePrice', 'taxId'] as const
const FIELD_LABEL: Record<FieldKey, string> = {
  name: 'Nombre',
  code: 'Código / SKU',
  productCategoryId: 'Categoría',
  salePrice: 'Precio de venta',
  taxId: 'Tarifa de impuesto',
}
/**
 * FORM-05 — ids de los CONTROLES, conocidos ANTES de renderizar: el resumen
 * enlaza cada problema con su campo y el padre no puede adivinar el `useId()`
 * que `BaseField` genera dentro, así que se los pasa él (prop `id`). El
 * `useId()` de aquí evita que dos instancias del modal choquen entre sí.
 */
const uid = useId()
const ID = Object.fromEntries(FIELD_ORDER.map((k) => [k, `${uid}-${k}`])) as Record<
  FieldKey,
  string
>
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
/** FORM-05: recibe el foco tras un `validate()` fallido. El banner del 409 y el
 *  resumen son ramas EXCLUYENTES y comparten el `ref`; los dos exponen `focus()`. */
const summary = ref<{ focus: () => void } | null>(null)

// FORM-11 — errores por campo del servidor, junto al campo y no en un toast.
const fieldErrors = useServerFieldErrors<FieldKey>(FIELD_ORDER)
// Al editar CUALQUIER campo, lo que el servidor rechazó deja de ser cierto. Se
// limpia en bloque y no campo a campo: cinco `@update:model-value` en el marcado
// no caben en el presupuesto de líneas del SFC y no compran precisión útil.
watch(draft, () => fieldErrors.clear(), { deep: true })

// FORM-11 — el 409 no escribe en el borrador: la copia del servidor se guarda
// aparte y el usuario elige. La política vive en el composable.
const {
  serverCopy,
  message: conflictMessage,
  capture: captureConflict,
  resolveKeepMine,
  resolveUseTheirs,
  clear: clearConflict,
} = useConcurrencyConflict<ProductResponse>({
  refresh: () => store.refresh(),
  find: () => store.products.value.find((p) => p.id === props.initial?.id) ?? null,
  keepMine: (server) => (draft.version = server.version),
  useTheirs: (server) => hydrate(server),
})

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
    fieldErrors.clear()
    clearConflict()
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
  // El del servidor manda: es el único que conoce unicidad y reglas de negocio.
  const fromServer = fieldErrors.serverErrors.value[field]
  if (fromServer) return fromServer
  return touched[field] ? (errors.value[field] ?? undefined) : undefined
}

const isValid = computed(() => Object.values(errors.value).every((e) => e === null))

/**
 * FORM-05 — items del resumen, en el orden VISUAL del formulario y con el
 * mismo texto EXACTO que se pinta junto al campo (GOV.UK lo exige literal).
 * La etiqueta va DELANTE, no en vez de él: en línea los mensajes son
 * «Requerido» / «Número ≥ 0», y dos enlaces que dicen «Requerido» no se
 * distinguen uno de otro fuera de contexto (WCAG §2.4.4).
 */
const summaryItems = computed(() =>
  FIELD_ORDER.flatMap((k) => {
    const text = err(k)
    return text ? [{ id: ID[k], text: `${FIELD_LABEL[k]}: ${text}` }] : []
  }),
)

/** Valida marcando todos los campos como tocados; expuesto para el patrón `defineExpose(validate)`. */
function validate(): boolean {
  ;(Object.keys(touched) as FieldKey[]).forEach((k) => (touched[k] = true))
  return isValid.value
}
defineExpose({ validate })

/**
 * FORM-05 — el desplazamiento sin foco deja al usuario de teclado donde estaba
 * (WCAG §2.4.3): la pantalla se mueve y él no. El resumen lleva `tabindex="-1"`
 * justo para poder recibirlo.
 */
async function focusSummary() {
  await nextTick()
  summary.value?.focus()
}

async function submit() {
  // Con un conflicto abierto no se guarda: sería el tercer 409 en cadena.
  if (busy.value || serverCopy.value !== null) return
  if (!validate()) {
    void focusSummary()
    void scrollToFirstError()
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
  try {
    const saved = props.initial
      ? await store.updateProduct(props.initial.id, payload)
      : await store.createProduct(payload)
    emit('saved', saved)
    emit('close')
  } catch (e) {
    if (isConcurrencyConflict(e)) {
      // NO se llama a `hydrate()`: el borrador se queda exactamente como está.
      await captureConflict()
      saveError.value = null
      toast.warn('Conflicto de concurrencia', conflictMessage)
      void focusSummary()
    } else if (fieldErrors.capture(e)) {
      // El servidor señaló campos concretos: se pintan junto a ellos y NO se
      // saca toast, o el mismo fallo se anunciaría dos veces.
      saveError.value = 'Revisa los campos marcados.'
      void focusSummary()
      void scrollToFirstError()
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
      <!-- FORM-11 · conflicto 409. Lo tecleado NO se ha tocado; el usuario elige. -->
      <div
        v-if="serverCopy"
        ref="summary"
        class="ds-banner ds-banner--warning"
        role="alert"
        tabindex="-1"
        data-error-anchor
      >
        <p class="ds-error-summary__title">{{ conflictMessage }}</p>
        <div class="ds-flex-row">
          <button type="button" class="ds-btn ds-btn--ghost ds-btn--sm" @click="resolveKeepMine">
            Mantener lo mío
          </button>
          <button type="button" class="ds-btn ds-btn--ghost ds-btn--sm" @click="resolveUseTheirs">
            Usar la del servidor
          </button>
        </div>
      </div>
      <!-- FORM-05 · resumen de errores. `role="alert"`, `tabindex="-1"` y
           `data-error-anchor` los pone ya la primitiva; lo que aquí SÍ es nuevo
           es que cada problema enlaza con su campo, que es lo que la lista a
           mano no podía hacer sin conocer los ids de antemano. -->
      <ErrorSummary v-else-if="summaryItems.length > 0" ref="summary" :items="summaryItems" />
      <div v-else-if="saveError" class="ds-banner ds-banner--error" role="alert" data-error-anchor>
        {{ saveError }}
      </div>
      <div class="grid ds-grid-2">
        <BaseField :id="ID.name" label="Nombre" required :error="err('name')" class="ds-grid-span">
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
        <BaseField :id="ID.code" label="Código / SKU" required :error="err('code')">
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
        <BaseField
          :id="ID.productCategoryId"
          label="Categoría"
          required
          :error="err('productCategoryId')"
        >
          <template #default="{ id }">
            <BaseSelect
              :id="id"
              v-model="draft.productCategoryId"
              :options="categoryOptions"
              :invalid="!!err('productCategoryId')"
              placeholder="Selecciona categoría"
              @blur="markTouched('productCategoryId')"
            />
          </template>
        </BaseField>
        <BaseField
          :id="ID.salePrice"
          label="Precio de venta (IVA incl.)"
          required
          :error="err('salePrice')"
        >
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
            <BaseInput :id="id" v-model="draft.provider" placeholder="Ej. Distribuidora Andina" />
          </template>
        </BaseField>
        <BaseField label="Tratamiento de IVA" required>
          <template #default="{ id }">
            <BaseSelect :id="id" v-model="draft.taxTreatment" :options="TAX_TREATMENT_OPTIONS" />
          </template>
        </BaseField>
        <BaseField
          v-if="showTaxRate"
          :id="ID.taxId"
          label="Tarifa de impuesto"
          required
          :error="err('taxId')"
        >
          <template #default="{ id }">
            <BaseSelect
              :id="id"
              v-model="draft.taxId"
              :options="taxOptions"
              :invalid="!!err('taxId')"
              placeholder="Selecciona tarifa"
              @blur="markTouched('taxId')"
            />
          </template>
        </BaseField>
        <BaseField label="Notas (opcional)" class="ds-grid-span">
          <template #default="{ id }">
            <BaseTextarea
              :id="id"
              v-model="draft.notes"
              :rows="2"
              placeholder="Presentación, conservación, uso…"
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
        {{ busy ? 'Guardando…' : 'Guardar' }}
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
/* La rejilla y su `@media` de colapso son `.ds-grid-2` (primitives.css), que
   conserva las DOS columnas exactas y sólo mueve el punto de colapso (640px en
   la primitiva, 760 aquí). Sólo queda el hueco como residuo.

   NO es `.ds-grid-auto`: `ModalShell` ignora la prop `width` salvo en modo
   `compact` (ver su `cardWidth`), así que este modal no mide 680px sino ~90vw.
   Con columnas de 240px mínimo, en un cuerpo de ~1500px caben seis pistas y
   `auto-fit` sólo colapsa las VACÍAS: el formulario pasaría de 2 columnas a una
   sola fila de cinco campos. */
.grid {
  gap: 18px 20px;
}
</style>
