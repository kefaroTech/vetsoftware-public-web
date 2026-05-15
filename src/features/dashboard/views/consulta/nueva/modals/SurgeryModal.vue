<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Scissors, X, Pencil } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import BaseField from '@/features/dashboard/components/ui/BaseField.vue'
import BaseInput from '@/features/dashboard/components/ui/BaseInput.vue'
import BaseTextarea from '@/features/dashboard/components/ui/BaseTextarea.vue'
import DateInput from '@/features/dashboard/components/ui/DateInput.vue'
import SearchableSelect from '@/features/dashboard/components/ui/SearchableSelect.vue'
import type { Animal, Surgery } from '@/types/domain'
import type { SurgeryDraftItem } from '../composables/useNuevaConsultaDraft'
import { todayISO, formatDateLong, formatDateShort } from '../composables/format'
import { useSurgeryTypes } from '../composables/useSurgeryTypes'

const props = defineProps<{
  open: boolean
  pet: Animal | null
  existing: SurgeryDraftItem[]
}>()

const emit = defineEmits<{
  save: [item: Surgery]
  close: []
  'remove-existing': [index: number]
  'update-existing': [index: number, item: Surgery]
}>()

const {
  options: typeOptions,
  loading: loadingTypes,
  error: typesError,
  create: createSurgeryType,
} = useSurgeryTypes()

const draft = reactive({
  date: todayISO(),
  surgeryTypeId: '',
  description: '',
  medicament: '',
  observations: '',
  complications: '',
})
const submitted = ref(false)
const editingIndex = ref<number | null>(null)

function resetDraft() {
  Object.assign(draft, {
    date: todayISO(),
    surgeryTypeId: '',
    description: '',
    medicament: '',
    observations: '',
    complications: '',
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
    surgeryTypeId: item.surgeryTypeId,
    description: item.description,
    medicament: item.medicament,
    observations: item.observations,
    complications: item.complications,
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
  surgeryTypeId: !draft.surgeryTypeId ? 'Selecciona un tipo' : null,
  description:
    draft.description.trim().length < 4
      ? 'Mínimo 4 caracteres'
      : null,
}))

const valid = computed<boolean>(
  () => !errors.value.surgeryTypeId && !errors.value.description,
)

function err<K extends keyof typeof errors.value>(k: K): string | undefined {
  if (!submitted.value) return undefined
  return errors.value[k] ?? undefined
}

function typeLabel(id: string): string {
  return typeOptions.value.find((o) => o.value === id)?.label ?? 'Tipo no encontrado'
}

function truncate(s: string, max = 60): string {
  if (!s) return ''
  return s.length > max ? s.slice(0, max - 1) + '…' : s
}

async function onCreateSurgeryType(data: {
  name: string
  description: string
}) {
  const created = await createSurgeryType(data)
  return {
    value: String(created.id),
    label: created.name,
    hint: created.description ?? undefined,
  }
}

function save() {
  submitted.value = true
  if (!valid.value) return
  const item: Surgery = {
    date: draft.date,
    surgeryTypeId: draft.surgeryTypeId,
    description: draft.description.trim(),
    medicament: draft.medicament.trim(),
    observations: draft.observations.trim(),
    complications: draft.complications.trim(),
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
    :icon="Scissors"
    title="Cirugía"
    :subtitle="subtitle"
    :width="1080"
    @close="emit('close')"
  >
    <template #body>
      <div v-if="typesError" class="catalog-error">{{ typesError }}</div>

      <section v-if="props.existing.length > 0" class="existing-section">
        <h4 class="existing-title">Ya agregadas ({{ props.existing.length }})</h4>
        <ul class="existing-list">
          <li
            v-for="(item, idx) in props.existing"
            :key="idx"
            class="existing-card"
          >
            <div class="existing-summary">
              <div class="existing-main">
                {{ formatDateShort(item.date) }} ·
                {{ typeLabel(item.surgeryTypeId) }}
              </div>
              <div class="existing-sub">{{ truncate(item.description) }}</div>
            </div>
            <span v-if="item.savedId" class="saved-chip">✓ Guardado</span>
            <template v-else>
              <button
                type="button"
                class="edit-existing"
                :class="{ active: editingIndex === idx }"
                aria-label="Editar cirugía"
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
                aria-label="Eliminar cirugía"
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
        <span>Editando cirugía #{{ editingIndex + 1 }}</span>
        <button type="button" class="editing-cancel" @click="cancelEditing">
          Cancelar
        </button>
      </div>

      <div class="grid-2">
        <BaseField label="Fecha programada" required>
          <template #default>
            <DateInput v-model="draft.date" />
          </template>
        </BaseField>
        <BaseField
          label="Tipo de cirugía"
          required
          :error="err('surgeryTypeId')"
        >
          <template #default>
            <SearchableSelect
              v-model="draft.surgeryTypeId"
              :options="typeOptions"
              :loading="loadingTypes"
              placeholder="Selecciona el tipo"
              create-label="Crear tipo de cirugía"
              :invalid="!!err('surgeryTypeId')"
              :on-create="onCreateSurgeryType"
            />
          </template>
        </BaseField>
      </div>

      <BaseField
        label="Descripción del procedimiento"
        required
        :error="err('description')"
      >
        <template #default="{ id }">
          <BaseTextarea
            :id="id"
            v-model="draft.description"
            :rows="3"
            placeholder="Detalle del procedimiento, técnica, abordaje…"
          />
        </template>
      </BaseField>

      <BaseField
        label="Anestesia / Premedicación"
        hint="Protocolo y dosis"
      >
        <template #default="{ id }">
          <BaseInput
            :id="id"
            v-model="draft.medicament"
            placeholder="Ej. Acepromacina 0.05 mg/kg + Propofol"
          />
        </template>
      </BaseField>

      <div class="grid-2">
        <BaseField label="Observaciones">
          <template #default="{ id }">
            <BaseTextarea
              :id="id"
              v-model="draft.observations"
              :rows="3"
              placeholder="Cuidados pre/postoperatorios, antibiótico…"
            />
          </template>
        </BaseField>
        <BaseField label="Complicaciones">
          <template #default="{ id }">
            <BaseTextarea
              :id="id"
              v-model="draft.complications"
              :rows="3"
              placeholder="Si hubo complicaciones intra o post-operatorias"
            />
          </template>
        </BaseField>
      </div>
    </template>

    <template #footer-left>
      <span v-if="editingIndex !== null">Editando cirugía existente</span>
      <span v-else>1 cirugía · Se vinculará a la consulta</span>
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
        {{ editingIndex !== null ? 'Guardar cambios' : 'Guardar' }}
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
