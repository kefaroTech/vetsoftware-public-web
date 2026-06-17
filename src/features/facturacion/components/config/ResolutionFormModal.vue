<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { FileText } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import BaseField from '@/features/dashboard/components/ui/BaseField.vue'
import BaseInput from '@/features/dashboard/components/ui/BaseInput.vue'
import BaseSelect from '@/features/dashboard/components/ui/BaseSelect.vue'
import { getProblemDetailMessage } from '@/services/http/http.client'
import { useToast } from '@/composables/useToast'
import { numberingResolutionApi } from '../../api/numberingResolution.api'
import {
  DOC_TYPE_LABEL,
  type ElectronicDocumentType,
  type NumberingResolutionResponse,
} from '../../types/facturacion'

const props = defineProps<{ open: boolean; resolution: NumberingResolutionResponse | null }>()
const emit = defineEmits<{ close: []; saved: [] }>()

const toast = useToast()
const busy = ref(false)
const submitted = ref(false)

const form = reactive({
  documentType: 'FE_VENTA' as ElectronicDocumentType,
  resolutionNumber: '',
  resolutionDate: '',
  prefix: '',
  rangeFrom: '',
  rangeTo: '',
  validFrom: '',
  validTo: '',
  technicalKey: '',
})

const DOCTYPE_OPTIONS = (Object.entries(DOC_TYPE_LABEL) as [ElectronicDocumentType, string][]).map(
  ([value, label]) => ({ value, label }),
)

const isEdit = computed(() => props.resolution != null)

watch(
  () => props.open,
  (open) => {
    if (!open) return
    submitted.value = false
    busy.value = false
    const r = props.resolution
    form.documentType = r?.documentType ?? 'FE_VENTA'
    form.resolutionNumber = r?.resolutionNumber ?? ''
    form.resolutionDate = r?.resolutionDate ?? ''
    form.prefix = r?.prefix ?? ''
    form.rangeFrom = r ? String(r.rangeFrom) : ''
    form.rangeTo = r ? String(r.rangeTo) : ''
    form.validFrom = r?.validFrom ?? ''
    form.validTo = r?.validTo ?? ''
    form.technicalKey = r?.technicalKey ?? ''
  },
)

const errors = computed(() => {
  const from = Number(form.rangeFrom)
  const to = Number(form.rangeTo)
  return {
    resolutionNumber: form.resolutionNumber.trim() ? null : 'Requerido',
    resolutionDate: form.resolutionDate ? null : 'Requerido',
    rangeFrom: from >= 1 ? null : 'Debe ser ≥ 1',
    rangeTo: to >= 1 && to >= from ? null : 'Debe ser ≥ rango desde',
    validFrom: form.validFrom ? null : 'Requerido',
    validTo: form.validTo && form.validTo >= form.validFrom ? null : 'Debe ser ≥ válido desde',
  }
})
function err(k: keyof typeof errors.value): string | undefined {
  const e = errors.value[k]
  return submitted.value && e ? e : undefined
}

async function save() {
  submitted.value = true
  if (Object.values(errors.value).some(Boolean)) return
  busy.value = true
  try {
    const payload = {
      documentType: form.documentType,
      resolutionNumber: form.resolutionNumber.trim(),
      resolutionDate: form.resolutionDate,
      prefix: form.prefix.trim() || null,
      rangeFrom: Number(form.rangeFrom),
      rangeTo: Number(form.rangeTo),
      validFrom: form.validFrom,
      validTo: form.validTo,
      technicalKey: form.technicalKey.trim() || null,
    }
    if (props.resolution) await numberingResolutionApi.update(props.resolution.id, payload)
    else await numberingResolutionApi.create(payload)
    toast.success('Resolución guardada', 'La numeración se actualizó.')
    emit('saved')
    emit('close')
  } catch (e) {
    toast.error('No se pudo guardar', getProblemDetailMessage(e))
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <ModalShell
    :open="open"
    :title="isEdit ? 'Editar resolución' : 'Nueva resolución'"
    subtitle="Numeración fiscal autorizada por la DIAN"
    :icon="FileText"
    :width="600"
    @close="emit('close')"
  >
    <template #body>
      <div class="grid2">
        <BaseField label="Tipo de documento" required>
          <template #default="{ id }"><BaseSelect :id="id" v-model="form.documentType" :options="DOCTYPE_OPTIONS" /></template>
        </BaseField>
        <BaseField label="Número de resolución" required :error="err('resolutionNumber')">
          <template #default="{ id }"><BaseInput :id="id" v-model="form.resolutionNumber" :invalid="!!err('resolutionNumber')" /></template>
        </BaseField>
        <BaseField label="Fecha de resolución" required :error="err('resolutionDate')">
          <template #default="{ id }"><BaseInput :id="id" v-model="form.resolutionDate" type="date" :invalid="!!err('resolutionDate')" /></template>
        </BaseField>
        <BaseField label="Prefijo">
          <template #default="{ id }"><BaseInput :id="id" v-model="form.prefix" placeholder="FE / POS / NC" /></template>
        </BaseField>
        <BaseField label="Rango desde" required :error="err('rangeFrom')">
          <template #default="{ id }"><BaseInput :id="id" v-model="form.rangeFrom" inputmode="numeric" :invalid="!!err('rangeFrom')" /></template>
        </BaseField>
        <BaseField label="Rango hasta" required :error="err('rangeTo')">
          <template #default="{ id }"><BaseInput :id="id" v-model="form.rangeTo" inputmode="numeric" :invalid="!!err('rangeTo')" /></template>
        </BaseField>
        <BaseField label="Válido desde" required :error="err('validFrom')">
          <template #default="{ id }"><BaseInput :id="id" v-model="form.validFrom" type="date" :invalid="!!err('validFrom')" /></template>
        </BaseField>
        <BaseField label="Válido hasta" required :error="err('validTo')">
          <template #default="{ id }"><BaseInput :id="id" v-model="form.validTo" type="date" :invalid="!!err('validTo')" /></template>
        </BaseField>
        <BaseField label="Clave técnica">
          <template #default="{ id }"><BaseInput :id="id" v-model="form.technicalKey" /></template>
        </BaseField>
      </div>
    </template>

    <template #footer-actions>
      <button type="button" class="btn-ghost" @click="emit('close')">Cancelar</button>
      <button type="button" class="btn-primary" :disabled="busy" @click="save">{{ busy ? 'Guardando…' : 'Guardar' }}</button>
    </template>
  </ModalShell>
</template>

<style scoped>
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
@media (max-width: 560px) { .grid2 { grid-template-columns: 1fr; } }
.btn-primary {
  font-family: inherit; font-size: 13.5px; font-weight: 500; padding: 10px 18px; border-radius: 9px; cursor: pointer;
  border: none; color: white; background: var(--amatista-700);
}
.btn-primary:hover:not(:disabled) { filter: brightness(1.05); }
.btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }
.btn-ghost {
  font-family: inherit; font-size: 13.5px; font-weight: 500; padding: 10px 18px; border-radius: 9px; cursor: pointer;
  background: transparent; border: 1px solid var(--warm-200); color: var(--warm-700);
}
.btn-ghost:hover { background: var(--warm-100); }
</style>
