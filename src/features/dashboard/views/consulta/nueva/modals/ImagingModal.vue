<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Image as ImageIcon } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import BaseField from '@/features/dashboard/components/ui/BaseField.vue'
import BaseInput from '@/features/dashboard/components/ui/BaseInput.vue'
import BaseTextarea from '@/features/dashboard/components/ui/BaseTextarea.vue'
import SearchableSelect from '@/features/dashboard/components/ui/SearchableSelect.vue'
import type { Animal, DiagnosticImaging } from '@/types/domain'
import { todayISO, formatDateLong } from '../composables/format'
import { useDiagnosticImagingTypes } from '../composables/useDiagnosticImagingTypes'

const props = defineProps<{
  open: boolean
  pet: Animal | null
}>()

const emit = defineEmits<{
  save: [item: DiagnosticImaging]
  close: []
}>()

const {
  options: typeOptions,
  loading: loadingTypes,
  error: typesError,
  create: createImagingType,
} = useDiagnosticImagingTypes()

const draft = reactive({
  date: todayISO(),
  diagnosticImagingTypeId: '',
  studyType: '',
  clinicalSigns: '',
  diagnosis: '',
  observations: '',
})
const submitted = ref(false)

watch(
  () => props.open,
  (open) => {
    if (open) {
      Object.assign(draft, {
        date: todayISO(),
        diagnosticImagingTypeId: '',
        studyType: '',
        clinicalSigns: '',
        diagnosis: '',
        observations: '',
      })
      submitted.value = false
    }
  },
)

const subtitle = computed(() => {
  const p = props.pet
  const head = p ? `${p.name} · ${p.specie?.name ?? ''}` : ''
  return `${head ? head + ' · ' : ''}Hoy, ${formatDateLong(draft.date)}`
})

const errors = computed(() => ({
  diagnosticImagingTypeId: !draft.diagnosticImagingTypeId
    ? 'Selecciona un tipo de estudio'
    : null,
  studyType: !draft.studyType.trim() ? 'Indica la región o protocolo' : null,
  clinicalSigns:
    draft.clinicalSigns.trim().length < 4
      ? 'Mínimo 4 caracteres'
      : null,
  diagnosis: !draft.diagnosis.trim() ? 'Indica el diagnóstico presuntivo' : null,
}))

const valid = computed<boolean>(
  () =>
    !errors.value.diagnosticImagingTypeId &&
    !errors.value.studyType &&
    !errors.value.clinicalSigns &&
    !errors.value.diagnosis,
)

function err<K extends keyof typeof errors.value>(k: K): string | undefined {
  if (!submitted.value) return undefined
  return errors.value[k] ?? undefined
}

async function onCreateImagingType(data: {
  name: string
  description: string
}) {
  const created = await createImagingType(data)
  return {
    value: String(created.id),
    label: created.name,
    hint: created.description ?? undefined,
  }
}

function save() {
  submitted.value = true
  if (!valid.value) return
  const item: DiagnosticImaging = {
    date: draft.date,
    diagnosticImagingTypeId: draft.diagnosticImagingTypeId,
    studyType: draft.studyType.trim(),
    clinicalSigns: draft.clinicalSigns.trim(),
    diagnosis: draft.diagnosis.trim(),
    observations: draft.observations.trim(),
  }
  emit('save', item)
}
</script>

<template>
  <ModalShell
    :open="open"
    :icon="ImageIcon"
    title="Imagen diagnóstica"
    :subtitle="subtitle"
    :width="1080"
    @close="emit('close')"
  >
    <template #body>
      <div v-if="typesError" class="catalog-error">{{ typesError }}</div>

      <div class="grid-2">
        <BaseField
          label="Tipo de estudio"
          required
          :error="err('diagnosticImagingTypeId')"
        >
          <template #default>
            <SearchableSelect
              v-model="draft.diagnosticImagingTypeId"
              :options="typeOptions"
              :loading="loadingTypes"
              placeholder="Selecciona el tipo"
              create-label="Crear tipo de estudio"
              :invalid="!!err('diagnosticImagingTypeId')"
              :on-create="onCreateImagingType"
            />
          </template>
        </BaseField>
        <BaseField
          label="Región / Protocolo"
          required
          hint="Ej. Tórax LL, Abdomen completo"
          :error="err('studyType')"
        >
          <template #default="{ id }">
            <BaseInput
              :id="id"
              v-model="draft.studyType"
              placeholder="Ej. Tórax LL"
              :invalid="!!err('studyType')"
            />
          </template>
        </BaseField>
      </div>

      <BaseField
        label="Signos clínicos"
        required
        :error="err('clinicalSigns')"
      >
        <template #default="{ id }">
          <BaseTextarea
            :id="id"
            v-model="draft.clinicalSigns"
            :rows="2"
            placeholder="Tos productiva 5 días, taquipnea, fiebre…"
          />
        </template>
      </BaseField>

      <BaseField
        label="Diagnóstico presuntivo"
        required
        :error="err('diagnosis')"
      >
        <template #default="{ id }">
          <BaseTextarea
            :id="id"
            v-model="draft.diagnosis"
            :rows="2"
            placeholder="Neumonía bacteriana, masa mediastínica…"
          />
        </template>
      </BaseField>

      <BaseField label="Observaciones">
        <template #default="{ id }">
          <BaseTextarea
            :id="id"
            v-model="draft.observations"
            :rows="2"
            placeholder="Indicaciones adicionales para el técnico"
          />
        </template>
      </BaseField>
    </template>

    <template #footer-left>
      <span>1 estudio · Se vinculará a la consulta</span>
    </template>
    <template #footer-actions>
      <button type="button" class="btn-ghost" @click="emit('close')">
        Cancelar
      </button>
      <button
        type="button"
        class="btn-primary"
        :disabled="submitted && !valid"
        @click="save"
      >
        Guardar solicitud
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
.catalog-error {
  background: oklch(94% 0.06 25);
  border: 1px solid oklch(85% 0.10 25);
  color: oklch(35% 0.15 25);
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 12.5px;
  margin-bottom: 14px;
}
.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-bottom: 14px;
}
@media (max-width: 720px) {
  .grid-2 {
    grid-template-columns: 1fr;
  }
}
:slotted(.field) + :slotted(.field) {
  margin-top: 14px;
}
.btn-ghost,
.btn-primary {
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  padding: 9px 16px;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid transparent;
}
.btn-ghost {
  background: transparent;
  border-color: var(--warm-200);
  color: var(--warm-900);
}
.btn-ghost:hover {
  background: var(--warm-100);
}
.btn-primary {
  background: var(--amatista-700);
  color: white;
  border: none;
  padding: 9px 18px;
}
.btn-primary:hover:not(:disabled) {
  filter: brightness(1.05);
}
.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
