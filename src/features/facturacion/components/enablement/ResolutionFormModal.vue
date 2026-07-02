<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { FileText } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import BaseField from '@/features/dashboard/components/ui/BaseField.vue'
import BaseInput from '@/features/dashboard/components/ui/BaseInput.vue'
import BaseSelect from '@/features/dashboard/components/ui/BaseSelect.vue'
import DateInput from '@/features/dashboard/components/ui/DateInput.vue'
import {
  DOC_TYPE_LABEL,
  type ElectronicDocumentType,
  type NumberingResolutionResponse,
  type SaveNumberingResolutionRequest,
} from '../../types/facturacion'

const props = defineProps<{
  open: boolean
  initial: NumberingResolutionResponse | null
  presetType?: ElectronicDocumentType
}>()

const emit = defineEmits<{
  save: [payload: { id: number | null; body: SaveNumberingResolutionRequest }]
  close: []
}>()

interface Draft {
  documentType: ElectronicDocumentType
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
    rangeTo: !draft.rangeTo
      ? 'Requerido'
      : to < from
        ? 'No puede ser menor que "desde"'
        : null,
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
  return submitted.value && errors.value[field] ? errors.value[field]! : undefined
}

function submit() {
  submitted.value = true
  if (!isValid.value) return
  const body: SaveNumberingResolutionRequest = {
    documentType: draft.documentType,
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
            <DateInput
              :id="id"
              v-model="draft.validFrom"
              :invalid="!!err('validFrom')"
            />
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
      <button type="button" class="btn-ghost" @click="emit('close')">Cancelar</button>
      <button type="button" class="btn-primary" @click="submit">
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
.btn-ghost {
  padding: 9px 16px;
  border-radius: 9px;
  border: 1px solid var(--warm-200);
  background: var(--warm-50);
  color: var(--warm-700);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}
.btn-ghost:hover {
  background: var(--warm-100);
}
.btn-primary {
  padding: 9px 18px;
  border-radius: 9px;
  border: none;
  background: linear-gradient(135deg, oklch(45% 0.18 var(--hue)), oklch(38% 0.18 calc(var(--hue) - 5)));
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(50, 20, 80, 0.08), 0 6px 16px -6px oklch(40% 0.18 var(--hue) / 0.45);
}
</style>
