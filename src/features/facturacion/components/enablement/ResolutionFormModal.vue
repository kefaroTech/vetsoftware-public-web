<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { FileText } from 'lucide-vue-next'
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

const docTypeOptions = (Object.keys(DOC_TYPE_LABEL) as ElectronicDocumentType[]).map((k) => ({
  value: k,
  label: DOC_TYPE_LABEL[k],
}))

const isInvoice = computed(() => draft.documentType === 'FE_VENTA')

watch(
  () => props.open,
  (open) => {
    if (!open) return
    submitted.value = false
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

function submit() {
  submitted.value = true
  if (!isValid.value) {
    scrollToFirstError()
    return
  }
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
      <div class="grid">
        <div v-if="hasMultipleBranches" class="span-2">
          <BaseField
            label="Sede"
            hint="El prefijo se emite desde esta sede. «Todas las sedes» = resolución de empresa."
          >
            <template #default="{ id }">
              <BaseSelect :id="id" v-model="draft.branchId" :options="branchOptions" />
            </template>
          </BaseField>
        </div>
        <BaseField label="Tipo de documento" required>
          <template #default="{ id }">
            <BaseSelect
              :id="id"
              v-model="draft.documentType"
              :options="docTypeOptions"
              :disabled="!!presetType && !initial"
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
        <div class="span-2">
          <BaseField label="Número de resolución" required :error="err('resolutionNumber')">
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
        <BaseField label="Rango desde" required :error="err('rangeFrom')">
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
        <BaseField label="Rango hasta" required :error="err('rangeTo')">
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
        <BaseField label="Vigente desde" required :error="err('validFrom')">
          <template #default="{ id }">
            <DateInput :id="id" v-model="draft.validFrom" :invalid="!!err('validFrom')" />
          </template>
        </BaseField>
        <BaseField label="Vigente hasta" required :error="err('validTo')">
          <template #default="{ id }">
            <DateInput :id="id" v-model="draft.validTo" :invalid="!!err('validTo')" />
          </template>
        </BaseField>
        <div v-if="isInvoice" class="span-2">
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
      <button type="button" class="ds-btn ds-btn--primary ds-btn--strong" @click="submit">
        {{ initial ? 'Guardar' : 'Crear' }}
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px 22px;
}

@media (width <= 760px) {
  .grid {
    grid-template-columns: 1fr;
  }
}

.span-2 {
  grid-column: 1 / -1;
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
