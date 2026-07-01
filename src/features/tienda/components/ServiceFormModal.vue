<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Stethoscope } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import BaseField from '@/features/dashboard/components/ui/BaseField.vue'
import BaseInput from '@/features/dashboard/components/ui/BaseInput.vue'
import BaseSelect from '@/features/dashboard/components/ui/BaseSelect.vue'
import BaseTextarea from '@/features/dashboard/components/ui/BaseTextarea.vue'
import { getProblemDetailMessage, isConcurrencyConflict } from '@/services/http/http.client'
import { useToast } from '@/composables/useToast'
import { useTienda } from '../composables/useTienda'
import type { ServicePayload, ServiceResponse, TaxScheme, TaxTreatment } from '../types/tienda'

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
  initial: ServiceResponse | null
}>()

const emit = defineEmits<{
  close: []
  saved: [item: ServiceResponse]
}>()

const store = useTienda()
const toast = useToast()

interface Draft {
  name: string
  price: string
  notes: string
  serviceCategoryId: string
  taxTreatment: TaxTreatment
  taxId: string
  /** Versión (@Version) del item en edición; null en creación. Se reenvía en el PUT. */
  version: number | null
}

function emptyDraft(): Draft {
  return { name: '', price: '', notes: '', serviceCategoryId: '', taxTreatment: 'GRAVADO', taxId: '', version: null }
}

/** Carga el draft desde un servicio existente (apertura en modo edición o re-hidratación tras 409). */
function hydrate(it: ServiceResponse) {
  Object.assign(draft, {
    name: it.name,
    price: String(it.price),
    notes: it.notes ?? '',
    serviceCategoryId: String(it.serviceCategory.id),
    taxTreatment: it.taxTreatment,
    taxId: it.tax ? String(it.tax.id) : '',
    version: it.version,
  } satisfies Draft)
}

const draft = reactive<Draft>(emptyDraft())
const submitted = ref(false)
const busy = ref(false)
const saveError = ref<string | null>(null)

const categoryOptions = computed(() =>
  store.serviceCategories.value.map((c) => ({ value: String(c.id), label: c.name })),
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
    submitted.value = false
    saveError.value = null
    if (props.initial) hydrate(props.initial)
    else Object.assign(draft, emptyDraft())
  },
)

function num(v: string): number {
  return Number(String(v).replace(',', '.'))
}

const errors = computed(() => ({
  name: draft.name.trim().length < 2 ? 'Mínimo 2 caracteres' : null,
  price: !(num(draft.price) >= 0) ? 'Número ≥ 0' : null,
  serviceCategoryId: !draft.serviceCategoryId ? 'Selecciona una categoría' : null,
  taxId: requiresTaxRate(draft.taxTreatment) && !draft.taxId ? 'Selecciona la tarifa' : null,
}))

function err(field: string): string | undefined {
  return submitted.value ? (errors.value as Record<string, string | null>)[field] ?? undefined : undefined
}

const isValid = computed(() => Object.values(errors.value).every((e) => e === null))

async function submit() {
  submitted.value = true
  if (!isValid.value || busy.value) return
  busy.value = true
  saveError.value = null
  const payload: ServicePayload = {
    name: draft.name.trim(),
    price: num(draft.price),
    taxTreatment: draft.taxTreatment,
    notes: draft.notes.trim() || null,
    serviceCategoryId: Number(draft.serviceCategoryId),
    taxId: requiresTaxRate(draft.taxTreatment) && draft.taxId ? Number(draft.taxId) : null,
  }
  // En edición reenviamos la versión leída (@Version) para que el backend detecte conflictos.
  if (props.initial && draft.version != null) payload.version = draft.version
  try {
    const saved = props.initial
      ? await store.updateService(props.initial.id, payload)
      : await store.createService(payload)
    emit('saved', saved)
    emit('close')
  } catch (e) {
    if (isConcurrencyConflict(e)) {
      // Recargamos el catálogo para obtener la versión fresca y re-hidratamos el form para reintentar.
      await store.refresh()
      const fresh = props.initial ? store.services.value.find((s) => s.id === props.initial!.id) : null
      if (fresh) hydrate(fresh)
      saveError.value = CONFLICT_MESSAGE
      toast.warn('Conflicto de concurrencia', CONFLICT_MESSAGE)
    } else {
      saveError.value = getProblemDetailMessage(e, 'No se pudo guardar el servicio')
    }
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <ModalShell
    :open="open"
    :title="isEdit ? 'Editar servicio' : 'Nuevo servicio'"
    subtitle="Servicio facturable de la clínica"
    :icon="Stethoscope"
    :width="600"
    @close="emit('close')"
  >
    <template #body>
      <div v-if="saveError" class="banner error">{{ saveError }}</div>
      <div class="grid">
        <BaseField label="Nombre" required :error="err('name')" class="col-2">
          <template #default="{ id }">
            <BaseInput :id="id" v-model="draft.name" :invalid="!!err('name')" placeholder="Consulta general" />
          </template>
        </BaseField>
        <BaseField label="Categoría" required :error="err('serviceCategoryId')">
          <template #default="{ id }">
            <BaseSelect :id="id" v-model="draft.serviceCategoryId" :options="categoryOptions" :invalid="!!err('serviceCategoryId')" placeholder="Selecciona…" />
          </template>
        </BaseField>
        <BaseField label="Precio (IVA incl.)" required :error="err('price')">
          <template #default="{ id }">
            <BaseInput :id="id" v-model="draft.price" :invalid="!!err('price')" inputmode="decimal" placeholder="0" />
          </template>
        </BaseField>
        <BaseField label="Tratamiento de IVA" required>
          <template #default="{ id }">
            <BaseSelect :id="id" v-model="draft.taxTreatment" :options="TAX_TREATMENT_OPTIONS" />
          </template>
        </BaseField>
        <BaseField v-if="showTaxRate" label="Tarifa de impuesto" required :error="err('taxId')">
          <template #default="{ id }">
            <BaseSelect :id="id" v-model="draft.taxId" :options="taxOptions" :invalid="!!err('taxId')" placeholder="Selecciona tarifa…" />
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
.grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px 20px; align-items: end; }
.col-2 { grid-column: 1 / -1; }
.check { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--warm-800); cursor: pointer; padding-bottom: 10px; }
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
