<script setup lang="ts">
import { computed, nextTick, reactive, ref, useId, watch } from 'vue'
import { FileText } from 'lucide-vue-next'
import ErrorSummary from '@/components/feedback/ErrorSummary.vue'
import ModalShell from '@/components/ui/ModalShell.vue'
import BaseField from '@/components/ui/BaseField.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import DateInput from '@/components/ui/DateInput.vue'
import {
  DOC_TYPE_LABEL,
  type ElectronicDocumentType,
  type NumberingResolutionResponse,
  type SaveNumberingResolutionRequest,
} from '../../types/facturacion'
import { useBranches, ALL_BRANCHES } from '@/features/branches/composables/useBranches'
import { scrollToFirstError } from '@/composables/scrollToError'

const props = defineProps<{
  open: boolean
  initial: NumberingResolutionResponse | null
  presetType?: ElectronicDocumentType
  /**
   * FORM-10 — lo controla el padre mientras el guardado está en vuelo. Opcional:
   * sin pasarlo el modal se protege igual con su propia bandera (`emitted`).
   */
  saving?: boolean
}>()

const emit = defineEmits<{
  save: [payload: { id: number | null; body: SaveNumberingResolutionRequest }]
  close: []
}>()

// Multi-sucursal (B-6): prefijo por sede. "Todas las sedes" (ALL_BRANCHES = '') = resolución de empresa.
// El selector solo aparece en empresas multi-sede; en empresas de 1 sede la resolución queda company-wide.
const { options: branchOptions, hasMultipleBranches } = useBranches()

interface Draft {
  documentType: ElectronicDocumentType
  branchId: string
  resolutionNumber: string
  resolutionDate: string
  prefix: string
  rangeFrom: string
  rangeTo: string
  validFrom: string
  validTo: string
  technicalKey: string
}

function emptyDraft(): Draft {
  const today = new Date()
  const iso = today.toISOString().slice(0, 10)
  const nextYear = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate())
    .toISOString()
    .slice(0, 10)
  return {
    documentType: props.presetType ?? 'FE_VENTA',
    branchId: ALL_BRANCHES,
    resolutionNumber: '',
    resolutionDate: iso,
    prefix: '',
    rangeFrom: '',
    rangeTo: '',
    validFrom: iso,
    validTo: nextYear,
    technicalKey: '',
  }
}

const draft = reactive<Draft>(emptyDraft())
const submitted = ref(false)

/**
 * FORM-10 — guarda de reenvío. `submit()` emite y devuelve el control; hasta que
 * el padre cierre el modal el botón sigue activo, y dos pulsaciones son dos
 * resoluciones DIAN con el mismo rango de numeración. La bandera baja al reabrir.
 */
const emitted = ref(false)
const busy = computed(() => props.saving === true || emitted.value)

/** FORM-05 — el resumen recibe el foco tras una validación fallida (WCAG §2.4.3). */
const summary = ref<{ focus: () => void } | null>(null)

const docTypeOptions = (Object.keys(DOC_TYPE_LABEL) as ElectronicDocumentType[]).map((k) => ({
  value: k,
  label: DOC_TYPE_LABEL[k],
}))

const isInvoice = computed(() => draft.documentType === 'FE_VENTA')

/** Tipo fijado por el contexto de apertura: solo lectura, no deshabilitado. */
const typeReadonly = computed(() => !!props.presetType && !props.initial)

watch(
  () => props.open,
  (open) => {
    if (!open) return
    submitted.value = false
    emitted.value = false
    const init = props.initial
    if (init) {
      Object.assign(draft, {
        documentType: init.documentType,
        branchId: init.branchId == null ? ALL_BRANCHES : String(init.branchId),
        resolutionNumber: init.resolutionNumber,
        resolutionDate: init.resolutionDate,
        prefix: init.prefix ?? '',
        rangeFrom: String(init.rangeFrom),
        rangeTo: String(init.rangeTo),
        validFrom: init.validFrom,
        validTo: init.validTo,
        technicalKey: init.technicalKey ?? '',
      } satisfies Draft)
    } else {
      Object.assign(draft, emptyDraft())
    }
  },
)

const errors = computed(() => {
  const from = Number(draft.rangeFrom)
  const to = Number(draft.rangeTo)
  return {
    resolutionNumber: draft.resolutionNumber.trim() ? null : 'Requerido',
    // Backend (Create/UpdateNumberingResolutionRequest): prefix es @Size(max=10) sin @NotBlank y la columna
    // es nullable (el dominio solo valida longitud) → opcional (p.ej. documento POS sin prefijo).
    prefix: null,
    rangeFrom: !draft.rangeFrom || from < 1 ? 'Debe ser ≥ 1' : null,
    rangeTo: !draft.rangeTo ? 'Requerido' : to < from ? 'No puede ser menor que "desde"' : null,
    validFrom: draft.validFrom ? null : 'Requerido',
    validTo: !draft.validTo
      ? 'Requerido'
      : draft.validTo < draft.validFrom
        ? 'No puede ser anterior a "desde"'
        : null,
  }
})

const isValid = computed(() => Object.values(errors.value).every((e) => !e))

type ErrorKey = 'resolutionNumber' | 'prefix' | 'rangeFrom' | 'rangeTo' | 'validFrom' | 'validTo'
function err(field: ErrorKey): string | undefined {
  return submitted.value ? (errors.value[field] ?? undefined) : undefined
}

/** FORM-05 — items del resumen, en el orden VISUAL del formulario (WCAG §2.4.3). */
const FIELD_LABEL = {
  resolutionNumber: 'Número de resolución',
  rangeFrom: 'Rango desde',
  rangeTo: 'Rango hasta',
  validFrom: 'Vigente desde',
  validTo: 'Vigente hasta',
} as const
/**
 * ids de los CONTROLES a los que enlaza el resumen: el padre no puede adivinar
 * el `useId()` que `BaseField` genera dentro, así que se los pasa él (prop
 * `id`). `useId()` aquí evita que dos instancias del modal choquen.
 */
const uid = useId()
const ID = Object.fromEntries(
  (Object.keys(FIELD_LABEL) as (keyof typeof FIELD_LABEL)[]).map((k) => [k, `${uid}-${k}`]),
) as Record<keyof typeof FIELD_LABEL, string>
const summaryItems = computed(() =>
  (Object.keys(FIELD_LABEL) as (keyof typeof FIELD_LABEL)[]).flatMap((k) => {
    const text = err(k)
    // La etiqueta va DELANTE del texto literal del error. Aquí es lo que
    // sostiene el enlace: en línea los mensajes son «Requerido» y «Debe ser
    // ≥ 1», y cuatro enlaces que dicen «Requerido» no se distinguen entre sí
    // fuera de su campo (WCAG §2.4.4).
    return text ? [{ id: ID[k], text: `${FIELD_LABEL[k]}: ${text}` }] : []
  }),
)

function submit() {
  if (busy.value) return
  submitted.value = true
  if (!isValid.value) {
    void nextTick().then(() => summary.value?.focus())
    void scrollToFirstError()
    return
  }
  emitted.value = true
  const body: SaveNumberingResolutionRequest = {
    documentType: draft.documentType,
    branchId: draft.branchId === ALL_BRANCHES ? null : Number(draft.branchId),
    resolutionNumber: draft.resolutionNumber.trim(),
    resolutionDate: draft.resolutionDate,
    prefix: draft.prefix.trim() || null,
    rangeFrom: Number(draft.rangeFrom),
    rangeTo: Number(draft.rangeTo),
    validFrom: draft.validFrom,
    validTo: draft.validTo,
    technicalKey: draft.technicalKey.trim() || null,
  }
  emit('save', { id: props.initial?.id ?? null, body })
}
</script>

<template>
  <ModalShell
    :open="open"
    :title="initial ? 'Editar resolución' : 'Agregar resolución'"
    :subtitle="DOC_TYPE_LABEL[draft.documentType]"
    :icon="FileText"
    accent="amatista"
    :width="560"
    @close="emit('close')"
  >
    <template #body>
      <!-- FORM-05 · `role="alert"`, `tabindex="-1"` y `data-error-anchor` los
           pone ya la primitiva; lo nuevo es que cada problema ENLAZA con su
           campo, imposible con la lista a mano sin conocer los ids de antemano.
           El encabezado pasa al de la primitiva («…en este formulario»): es su
           dueña y ese matiz de copia no vale una prop. -->
      <ErrorSummary ref="summary" :items="summaryItems" />
      <div class="grid ds-grid-2">
        <div v-if="hasMultipleBranches" class="ds-grid-span">
          <BaseField
            label="Sede"
            hint="El prefijo se emite desde esta sede. «Todas las sedes» = resolución de empresa."
          >
            <template #default="{ id }">
              <BaseSelect :id="id" v-model="draft.branchId" :options="branchOptions" />
            </template>
          </BaseField>
        </div>
        <!-- SOLO LECTURA, no deshabilitado: el tipo lo fija quien abre el modal y
             VIAJA en el envío (`draft.documentType` es parte del payload). No es
             «no disponible», es «ya decidido», y el usuario tiene que poder
             enfocarlo y leerlo para saber qué está creando. -->
        <BaseField
          label="Tipo de documento"
          :required="!typeReadonly"
          :readonly="typeReadonly"
          :hint="typeReadonly ? 'El tipo lo fija el documento desde el que se abrió.' : undefined"
        >
          <template #default="{ id }">
            <BaseSelect
              :id="id"
              v-model="draft.documentType"
              :options="docTypeOptions"
              :readonly="typeReadonly"
            />
          </template>
        </BaseField>
        <BaseField label="Prefijo" :error="err('prefix')">
          <template #default="{ id }">
            <BaseInput
              :id="id"
              v-model="draft.prefix"
              placeholder="FE"
              :invalid="!!err('prefix')"
              @update:model-value="draft.prefix = String($event).toUpperCase()"
            />
          </template>
        </BaseField>
        <div class="ds-grid-span">
          <BaseField
            :id="ID.resolutionNumber"
            label="Número de resolución"
            required
            :error="err('resolutionNumber')"
          >
            <template #default="{ id }">
              <BaseInput
                :id="id"
                v-model="draft.resolutionNumber"
                placeholder="18764003912345"
                :invalid="!!err('resolutionNumber')"
              />
            </template>
          </BaseField>
        </div>
        <BaseField label="Fecha de resolución" required>
          <template #default="{ id }">
            <DateInput :id="id" v-model="draft.resolutionDate" />
          </template>
        </BaseField>
        <div />
        <BaseField :id="ID.rangeFrom" label="Rango desde" required :error="err('rangeFrom')">
          <template #default="{ id }">
            <BaseInput
              :id="id"
              v-model="draft.rangeFrom"
              type="number"
              inputmode="numeric"
              :invalid="!!err('rangeFrom')"
            />
          </template>
        </BaseField>
        <BaseField :id="ID.rangeTo" label="Rango hasta" required :error="err('rangeTo')">
          <template #default="{ id }">
            <BaseInput
              :id="id"
              v-model="draft.rangeTo"
              type="number"
              inputmode="numeric"
              :invalid="!!err('rangeTo')"
            />
          </template>
        </BaseField>
        <BaseField :id="ID.validFrom" label="Vigente desde" required :error="err('validFrom')">
          <template #default="{ id }">
            <DateInput :id="id" v-model="draft.validFrom" :invalid="!!err('validFrom')" />
          </template>
        </BaseField>
        <BaseField :id="ID.validTo" label="Vigente hasta" required :error="err('validTo')">
          <template #default="{ id }">
            <DateInput :id="id" v-model="draft.validTo" :invalid="!!err('validTo')" />
          </template>
        </BaseField>
        <div v-if="isInvoice" class="ds-grid-span">
          <BaseField
            label="Clave técnica (DIAN)"
            hint="Solo para DIAN directa/producción. Con el proveedor MATIAS (sandbox) déjala vacía."
          >
            <template #default="{ id }">
              <BaseInput :id="id" v-model="draft.technicalKey" />
            </template>
          </BaseField>
        </div>
      </div>
      <p class="help">
        La <strong>clave técnica</strong> la entrega la DIAN para la factura electrónica directa.
        Con el proveedor MATIAS no es necesaria: déjala vacía.
      </p>
    </template>

    <template #footer-actions>
      <button type="button" class="ds-btn ds-btn--ghost" @click="emit('close')">Cancelar</button>
      <button
        type="button"
        class="ds-btn ds-btn--primary ds-btn--strong"
        :disabled="busy"
        @click="submit"
      >
        {{ busy ? 'Guardando…' : initial ? 'Guardar' : 'Crear' }}
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
/* Layout: `.ds-grid-2` (dos columnas, colapso en 640px) + `.ds-grid-span`.
   Aquí sólo el gap propio. */
.grid {
  gap: var(--space-18) var(--space-22);
}

.help {
  margin: 14px 0 0;
  font-size: 12px;
  color: var(--warm-600);
  border-left: 3px solid var(--amatista-300);
  padding-left: 10px;
  line-height: 1.5;
}
</style>
