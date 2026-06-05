<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Image as ImageIcon, X, Pencil } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import BaseField from '@/features/dashboard/components/ui/BaseField.vue'
import BaseInput from '@/features/dashboard/components/ui/BaseInput.vue'
import BaseTextarea from '@/features/dashboard/components/ui/BaseTextarea.vue'
import SearchableSelect from '@/features/dashboard/components/ui/SearchableSelect.vue'
import type { Animal, DiagnosticImaging } from '@/types/domain'
import type { DiagnosticImagingDraftItem } from '../composables/useNuevaConsultaDraft'
import { todayISO, formatDateLong, formatDateShort } from '../composables/format'
import { useDiagnosticImagingTypes } from '../composables/useDiagnosticImagingTypes'

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

function cancelEditing() {
  editingIndex.value = null
  resetDraft()
}

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

function typeLabel(id: string): string {
  return typeOptions.value.find((o) => o.value === id)?.label ?? 'Tipo no encontrado'
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
    :width="640"
    @close="emit('close')"
  >
    <template #body>
      <div v-if="typesError" class="catalog-error">{{ typesError }}</div>

      <section v-if="props.existing.length > 0" class="existing-section">
        <h4 class="existing-title">Ya agregados ({{ props.existing.length }})</h4>
        <ul class="existing-list">
          <li
            v-for="(item, idx) in props.existing"
            :key="idx"
            class="existing-card"
          >
            <div class="existing-summary">
              <div class="existing-main">
                {{ formatDateShort(item.date) }} ·
                {{ typeLabel(item.diagnosticImagingTypeId) }}
              </div>
              <div class="existing-sub">
                {{ item.studyType || 'Sin región' }}
              </div>
            </div>
            <span v-if="item.savedId" class="saved-chip">✓ Guardado</span>
            <template v-else>
              <button
                type="button"
                class="edit-existing"
                :class="{ active: editingIndex === idx }"
                aria-label="Editar estudio"
                :disabled="editingIndex !== null && editingIndex !== idx"
                @click="
                  editingIndex === idx ? cancelEditing() : startEditing(idx)
                "
              >
                <Pencil :size="14" :stroke-width="1.7" />
              </button>
              <button
                type="button"
                class="remove-existing"
                aria-label="Eliminar estudio"
                :disabled="editingIndex !== null"
                @click="emit('remove-existing', idx)"
              >
                <X :size="14" :stroke-width="1.7" />
              </button>
            </template>
          </li>
        </ul>
      </section>

      <div v-if="editingIndex !== null" class="editing-banner">
        <Pencil :size="14" :stroke-width="1.7" />
        <span>Editando estudio #{{ editingIndex + 1 }}</span>
        <button type="button" class="editing-cancel" @click="cancelEditing">
          Cancelar
        </button>
      </div>

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
      <span v-if="editingIndex !== null">Editando estudio existente</span>
      <span v-else>1 estudio · Se vinculará a la consulta</span>
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
        {{ editingIndex !== null ? 'Guardar cambios' : 'Guardar solicitud' }}
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
.existing-section {
  margin-bottom: 22px;
  padding: 14px 16px;
  background: var(--amatista-50);
  border: 1px solid var(--amatista-200);
  border-radius: 12px;
}
.existing-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--amatista-700);
  margin: 0 0 10px;
}
.existing-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.existing-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 10px;
}
.existing-summary {
  min-width: 0;
  flex: 1;
}
.existing-main {
  font-size: 14.5px;
  font-weight: 500;
  color: var(--warm-900);
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.existing-sub {
  font-size: 13px;
  color: var(--warm-600);
  margin-top: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.saved-chip {
  font-size: 12px;
  font-weight: 500;
  padding: 5px 10px;
  border-radius: 999px;
  background: oklch(94% 0.06 150);
  color: oklch(40% 0.15 150);
  border: 1px solid oklch(85% 0.10 150);
  white-space: nowrap;
}
.remove-existing {
  background: transparent;
  border: 1px solid var(--warm-200);
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  cursor: pointer;
  color: var(--warm-600);
  flex-shrink: 0;
}
.remove-existing:hover:not(:disabled) {
  background: oklch(94% 0.06 25);
  border-color: oklch(85% 0.10 25);
  color: oklch(35% 0.15 25);
}
.remove-existing:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.edit-existing {
  background: transparent;
  border: 1px solid var(--warm-200);
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  cursor: pointer;
  color: var(--warm-600);
  flex-shrink: 0;
}
.edit-existing:hover:not(:disabled) {
  background: var(--amatista-50);
  border-color: var(--amatista-500);
  color: var(--amatista-700);
}
.edit-existing.active {
  background: var(--amatista-700);
  border-color: var(--amatista-700);
  color: white;
}
.edit-existing:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.editing-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  margin-bottom: 16px;
  background: var(--amatista-700);
  color: white;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 500;
}
.editing-banner span {
  flex: 1;
}
.editing-cancel {
  background: rgba(255, 255, 255, 0.18);
  border: none;
  padding: 5px 12px;
  border-radius: 6px;
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
  color: white;
  cursor: pointer;
}
.editing-cancel:hover {
  background: rgba(255, 255, 255, 0.28);
}
</style>
