<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Image as ImageIcon } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import ExistingItemsSection from '../components/ExistingItemsSection.vue'
import BaseField from '@/features/dashboard/components/ui/BaseField.vue'
import BaseInput from '@/features/dashboard/components/ui/BaseInput.vue'
import BaseTextarea from '@/features/dashboard/components/ui/BaseTextarea.vue'
import SearchableSelect from '@/features/dashboard/components/ui/SearchableSelect.vue'
import type { Animal, DiagnosticImaging } from '@/types/domain'
import type { DiagnosticImagingDraftItem } from '../composables/useNuevaConsultaDraft'
import { todayISO, formatDateLong, formatDateShort } from '../composables/format'
import { useDiagnosticImagingTypes } from '../composables/useDiagnosticImagingTypes'
import { scrollToFirstError } from '@/composables/scrollToError'

const props = defineProps<{
  open: boolean
  pet: Animal | null
  existing: DiagnosticImagingDraftItem[]
}>()

const emit = defineEmits<{
  save: [item: DiagnosticImaging]
  close: []
  'remove-existing': [index: number]
  'update-existing': [index: number, item: DiagnosticImaging]
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
const editingIndex = ref<number | null>(null)

function resetDraft() {
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

watch(
  () => props.open,
  (open) => {
    if (open) {
      resetDraft()
      editingIndex.value = null
    }
  },
)

function startEditing(idx: number) {
  const item = props.existing[idx]
  if (!item) return
  Object.assign(draft, {
    date: item.date,
    diagnosticImagingTypeId: item.diagnosticImagingTypeId,
    studyType: item.studyType,
    clinicalSigns: item.clinicalSigns,
    diagnosis: item.diagnosis,
    observations: item.observations,
  })
  editingIndex.value = idx
  submitted.value = false
}

const subtitle = computed(() => {
  const p = props.pet
  const head = p ? `${p.name} · ${p.specie?.name ?? ''}` : ''
  return `${head ? head + ' · ' : ''}Hoy, ${formatDateLong(draft.date)}`
})

const errors = computed(() => ({
  diagnosticImagingTypeId: !draft.diagnosticImagingTypeId ? 'Selecciona un tipo de estudio' : null,
  studyType: !draft.studyType.trim() ? 'Indica la región o protocolo' : null,
  clinicalSigns: !draft.clinicalSigns.trim()
    ? 'Indica los signos clínicos'
    : draft.clinicalSigns.trim().length < 4
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

function typeLabel(id: string): string {
  return typeOptions.value.find((o) => o.value === id)?.label ?? 'Tipo no encontrado'
}

async function onCreateImagingType(data: { name: string; description: string }) {
  const created = await createImagingType(data)
  return {
    value: String(created.id),
    label: created.name,
    hint: created.description ?? undefined,
  }
}

// Un formulario nuevo "vacío" (nada escrito) no cuenta como ítem a agregar.
function isNewDraftEmpty(): boolean {
  return (
    !draft.diagnosticImagingTypeId &&
    !draft.studyType.trim() &&
    !draft.clinicalSigns.trim() &&
    !draft.diagnosis.trim() &&
    !draft.observations.trim()
  )
}

function save() {
  // Si ya hay ítems agregados y el formulario nuevo está vacío, no se valida ni se crea
  // vacío: solo se cierra. La obligatoriedad solo aplica cuando aún no hay ítems.
  if (editingIndex.value === null && props.existing.length > 0 && isNewDraftEmpty()) {
    emit('close')
    return
  }
  submitted.value = true
  if (!valid.value) {
    scrollToFirstError()
    return
  }
  const item: DiagnosticImaging = {
    date: draft.date,
    diagnosticImagingTypeId: draft.diagnosticImagingTypeId,
    studyType: draft.studyType.trim(),
    clinicalSigns: draft.clinicalSigns.trim(),
    diagnosis: draft.diagnosis.trim(),
    observations: draft.observations.trim(),
  }
  if (editingIndex.value !== null) {
    emit('update-existing', editingIndex.value, item)
    editingIndex.value = null
    resetDraft()
  } else {
    emit('save', item)
  }
}
</script>

<template>
  <ModalShell
    :open="open"
    :icon="ImageIcon"
    title="Solicitar imagen diagnóstica"
    :subtitle="subtitle"
    :width-vw="90"
    :height-vh="90"
    @close="emit('close')"
  >
    <template #body>
      <div v-if="typesError" class="catalog-error">{{ typesError }}</div>

      <ExistingItemsSection
        :items="props.existing"
        title="Ya agregados"
        noun="estudio"
        :editing-index="editingIndex"
        @edit="startEditing"
        @remove="emit('remove-existing', $event)"
      >
        <template #main="{ item }">
          {{ formatDateShort(item.date) }} ·
          {{ typeLabel(item.diagnosticImagingTypeId) }}
        </template>
        <template #sub="{ item }">{{ item.studyType || 'Sin región' }}</template>
      </ExistingItemsSection>

      <div class="grid-2">
        <BaseField label="Tipo de estudio" required :error="err('diagnosticImagingTypeId')">
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

      <BaseField label="Signos clínicos" required :error="err('clinicalSigns')">
        <template #default="{ id }">
          <BaseTextarea
            :id="id"
            v-model="draft.clinicalSigns"
            :rows="2"
            placeholder="Tos productiva 5 días, taquipnea, fiebre…"
          />
        </template>
      </BaseField>

      <BaseField label="Diagnóstico presuntivo" required :error="err('diagnosis')">
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
      <span v-if="editingIndex !== null">Editando estudio existente</span>
      <span v-else>1 estudio · Se vinculará a la consulta</span>
    </template>
    <template #footer-actions>
      <button type="button" class="ds-btn ds-btn--ghost" @click="emit('close')">Cancelar</button>
      <button type="button" class="ds-btn ds-btn--solid" @click="save">
        {{ editingIndex !== null ? 'Guardar cambios' : 'Guardar solicitud' }}
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
.catalog-error {
  background: var(--danger-150);
  border: 1px solid var(--danger-300);
  color: oklch(35% 0.15 25deg);
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

@media (width <= 720px) {
  .grid-2 {
    grid-template-columns: 1fr;
  }
}

.field + .field {
  margin-top: 14px;
}
</style>
