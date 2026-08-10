<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Pill, Plus, Trash2, X, Pencil } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import BaseField from '@/features/dashboard/components/ui/BaseField.vue'
import BaseInput from '@/features/dashboard/components/ui/BaseInput.vue'
import BaseTextarea from '@/features/dashboard/components/ui/BaseTextarea.vue'
import SearchableSelect from '@/features/dashboard/components/ui/SearchableSelect.vue'
import type { Animal, Prescription, MedicamentPrescription } from '@/types/domain'
import type { PrescriptionDraftItem } from '../composables/useNuevaConsultaDraft'
import { todayISO, formatDateLong, formatDateShort } from '../composables/format'
import { useMedicaments } from '../composables/useMedicaments'
import { scrollToFirstError } from '@/composables/scrollToError'

const props = defineProps<{
  open: boolean
  pet: Animal | null
  existing: PrescriptionDraftItem[]
}>()

const emit = defineEmits<{
  save: [prescription: Prescription]
  close: []
  'remove-existing': [index: number]
  'update-existing': [index: number, prescription: Prescription]
}>()

interface MedDraft {
  // Id del medicamento en el catálogo (valor del SearchableSelect).
  medicamentId: string
  presentation: string
  quantity: string
  posology: string
  observation: string
}

const {
  options: medOptions,
  loading: loadingMeds,
  error: medsError,
  create: createMedicament,
} = useMedicaments()

function medLabel(id: string): string {
  return medOptions.value.find((o) => o.value === id)?.label ?? ''
}

async function onCreateMedicament(data: { name: string; description: string }) {
  const created = await createMedicament(data)
  return {
    value: String(created.id),
    label: created.name,
    hint: created.description ?? undefined,
  }
}

function emptyMed(): MedDraft {
  return { medicamentId: '', presentation: '', quantity: '', posology: '', observation: '' }
}

const draft = reactive({
  date: todayISO(),
  observations: '',
  medicaments: [emptyMed()] as MedDraft[],
})

const submitted = ref(false)
const editingIndex = ref<number | null>(null)

function resetDraft() {
  Object.assign(draft, {
    date: todayISO(),
    observations: '',
    medicaments: [emptyMed()],
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
    observations: item.observations,
    medicaments: item.medicaments.map<MedDraft>((m) => ({
      medicamentId: String(m.medicamentId),
      presentation: m.presentation,
      quantity: String(m.quantity),
      posology: m.posology,
      observation: m.observation ?? '',
    })),
  })
  if (draft.medicaments.length === 0) draft.medicaments.push(emptyMed())
  editingIndex.value = idx
  submitted.value = false
}

function cancelEditing() {
  editingIndex.value = null
  resetDraft()
}

const subtitle = computed(() => {
  const p = props.pet
  if (!p) return `Hoy, ${formatDateLong(draft.date)}`
  const parts = [p.name, p.specie?.name, p.weight ? `${p.weight}` : null].filter(
    Boolean,
  ) as string[]
  return `${parts.join(' · ')} · Hoy, ${formatDateLong(draft.date)}`
})

const errors = computed(() => {
  const e = {
    medicaments: draft.medicaments.map((m) => ({
      medicamentId: !m.medicamentId ? 'Selecciona un medicamento' : null,
      presentation: !m.presentation.trim() ? 'Indica la presentación' : null,
      quantity: !m.quantity.trim()
        ? 'Indica la cantidad'
        : !Number.isFinite(Number(m.quantity.replace(',', '.'))) ||
            Number(m.quantity.replace(',', '.')) <= 0
          ? 'Cantidad inválida'
          : null,
      posology: !m.posology.trim() ? 'Indica la posología' : null,
    })),
  }
  return e
})

const valid = computed<boolean>(() => {
  return errors.value.medicaments.every(
    (m) => !m.medicamentId && !m.presentation && !m.quantity && !m.posology,
  )
})

function addMed() {
  draft.medicaments.push(emptyMed())
}
function removeMed(i: number) {
  if (draft.medicaments.length === 1) return
  draft.medicaments.splice(i, 1)
}

// Un formulario nuevo "vacío" (nada escrito) no cuenta como ítem a agregar.
function isNewDraftEmpty(): boolean {
  return (
    !draft.observations.trim() &&
    draft.medicaments.every(
      (m) =>
        !m.medicamentId &&
        !m.presentation.trim() &&
        !m.quantity.trim() &&
        !m.posology.trim() &&
        !m.observation.trim(),
    )
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
  const prescription: Prescription = {
    date: draft.date,
    observations: draft.observations.trim(),
    medicaments: draft.medicaments.map<MedicamentPrescription>((m) => ({
      medicamentId: Number(m.medicamentId),
      name: medLabel(m.medicamentId),
      presentation: m.presentation.trim(),
      quantity: Number(m.quantity.replace(',', '.')),
      posology: m.posology.trim(),
      observation: m.observation.trim() || undefined,
    })),
  }
  if (editingIndex.value !== null) {
    emit('update-existing', editingIndex.value, prescription)
    editingIndex.value = null
    resetDraft()
  } else {
    emit('save', prescription)
  }
}

// observation es opcional (sin validación) → medErr solo cubre los campos requeridos.
function medErr(
  i: number,
  k: 'medicamentId' | 'presentation' | 'quantity' | 'posology',
): string | undefined {
  if (!submitted.value) return undefined
  return errors.value.medicaments[i]?.[k] ?? undefined
}
</script>

<template>
  <ModalShell
    :open="open"
    :icon="Pill"
    title="Nuevo plan terapéutico"
    :subtitle="subtitle"
    :width-vw="90"
    :height-vh="90"
    @close="emit('close')"
  >
    <template #body>
      <div v-if="medsError" class="catalog-error">{{ medsError }}</div>

      <section v-if="props.existing.length > 0 && editingIndex === null" class="existing-section">
        <h4 class="existing-title">Ya agregados ({{ props.existing.length }})</h4>
        <ul class="existing-list">
          <li v-for="(item, idx) in props.existing" :key="idx" class="existing-card">
            <div class="existing-summary">
              <div class="existing-main">
                {{ formatDateShort(item.date) }} ·
                {{ item.medicaments[0]?.name || 'Plan terapéutico' }}
              </div>
              <div class="existing-sub">
                {{ item.medicaments.length }} medicamento{{
                  item.medicaments.length === 1 ? '' : 's'
                }}
              </div>
            </div>
            <span v-if="item.savedId" class="saved-chip">✓ Guardado</span>
            <template v-else>
              <button
                type="button"
                class="edit-existing"
                :class="{ active: editingIndex === idx }"
                aria-label="Editar plan terapéutico"
                :disabled="editingIndex !== null && editingIndex !== idx"
                @click="editingIndex === idx ? cancelEditing() : startEditing(idx)"
              >
                <Pencil :size="14" :stroke-width="1.7" />
              </button>
              <button
                type="button"
                class="remove-existing"
                aria-label="Eliminar plan terapéutico"
                :disabled="editingIndex !== null"
                @click="emit('remove-existing', idx)"
              >
                <X :size="14" :stroke-width="1.7" />
              </button>
            </template>
          </li>
        </ul>
      </section>

      <div class="grid-1">
        <BaseField label="Observaciones" hint="Indicaciones adicionales para el propietario">
          <template #default="{ id }">
            <BaseTextarea
              :id="id"
              v-model="draft.observations"
              :rows="2"
              placeholder="Ej. Dieta blanda 48h. Volver si persisten síntomas."
            />
          </template>
        </BaseField>
      </div>

      <div class="meds-head">
        <div class="meds-title">Medicamentos prescritos</div>
        <div class="meds-count">{{ draft.medicaments.length }} en el plan</div>
      </div>

      <div class="meds-list">
        <div v-for="(m, i) in draft.medicaments" :key="i" class="med-card">
          <div class="med-head">
            <div class="med-num">{{ i + 1 }}</div>
            <div class="med-name-preview">
              {{ medLabel(m.medicamentId) || 'Nuevo medicamento' }}
            </div>
            <button
              v-if="draft.medicaments.length > 1"
              type="button"
              class="med-remove"
              aria-label="Quitar medicamento"
              @click="removeMed(i)"
            >
              <Trash2 :size="14" :stroke-width="1.7" />
            </button>
          </div>

          <div class="med-grid">
            <BaseField label="Nombre del medicamento" required :error="medErr(i, 'medicamentId')">
              <template #default>
                <SearchableSelect
                  v-model="m.medicamentId"
                  :options="medOptions"
                  :loading="loadingMeds"
                  placeholder="Busca o crea un medicamento"
                  create-label="Crear medicamento"
                  :invalid="!!medErr(i, 'medicamentId')"
                  :on-create="onCreateMedicament"
                />
              </template>
            </BaseField>
            <BaseField label="Presentación" required :error="medErr(i, 'presentation')">
              <template #default="{ id }">
                <BaseInput
                  :id="id"
                  v-model="m.presentation"
                  placeholder="Comprimido 250 mg"
                  :invalid="!!medErr(i, 'presentation')"
                />
              </template>
            </BaseField>
            <BaseField label="Cantidad" required :error="medErr(i, 'quantity')">
              <template #default="{ id }">
                <BaseInput
                  :id="id"
                  v-model="m.quantity"
                  placeholder="Ej. 14"
                  inputmode="decimal"
                  :invalid="!!medErr(i, 'quantity')"
                />
              </template>
            </BaseField>
            <BaseField
              label="Posología"
              required
              hint="Dosis, frecuencia y duración"
              :error="medErr(i, 'posology')"
            >
              <template #default="{ id }">
                <BaseInput
                  :id="id"
                  v-model="m.posology"
                  placeholder="1 comp. cada 12h por 7 días"
                  :invalid="!!medErr(i, 'posology')"
                />
              </template>
            </BaseField>
          </div>
          <div class="med-obs">
            <BaseField label="Observación" hint="Nota específica de este medicamento (opcional)">
              <template #default="{ id }">
                <BaseInput
                  :id="id"
                  v-model="m.observation"
                  placeholder="Ej. administrar con alimento; suspender si hay vómito"
                />
              </template>
            </BaseField>
          </div>
        </div>
      </div>

      <button type="button" class="add-med" @click="addMed">
        <Plus :size="14" :stroke-width="1.8" />
        <span>Agregar otro medicamento</span>
      </button>
    </template>

    <template #footer-left>
      <span>
        {{ draft.medicaments.length }} medicamento{{ draft.medicaments.length === 1 ? '' : 's' }}
        · Se vinculará a la consulta actual
      </span>
    </template>
    <template #footer-actions>
      <button type="button" class="ds-btn ds-btn--ghost" @click="emit('close')">Cancelar</button>
      <button type="button" class="ds-btn ds-btn--solid" @click="save">
        {{ editingIndex !== null ? 'Guardar cambios' : 'Guardar plan terapéutico' }}
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

.grid-1 {
  display: grid;
  grid-template-columns: 1fr;
  gap: 18px;
  margin-bottom: 22px;
}

.med-obs {
  margin-top: 12px;
}

.meds-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.meds-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--warm-900);
}

.meds-count {
  font-size: 11.5px;
  color: var(--warm-500);
}

.meds-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.med-card {
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 11px;
  padding: 14px;
}

.med-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.med-num {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--amatista-100);
  color: var(--amatista-700);
  font-size: 11px;
  font-weight: 600;
  display: grid;
  place-items: center;
}

.med-name-preview {
  flex: 1;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--warm-600);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.med-remove {
  background: transparent;
  border: none;
  color: var(--warm-500);
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
}

.med-remove:hover {
  background: var(--warm-100);
  color: var(--danger-600);
}

.med-grid {
  display: grid;
  grid-template-columns: 2fr 1.5fr 140px 2fr;
  gap: 12px;
}

@media (width <= 980px) {
  .med-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (width <= 640px) {
  .med-grid {
    grid-template-columns: 1fr;
  }
}

.suggest-wrap {
  position: relative;
}

.suggest {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: var(--warm-50);
  border: 1px solid var(--warm-300);
  border-radius: 10px;
  box-shadow: 0 12px 30px rgb(0 0 0 / 12%);
  z-index: 10;
  max-height: 220px;
  overflow: auto;
}

.suggest-item {
  width: 100%;
  text-align: left;
  background: transparent;
  border: none;
  padding: 10px 12px;
  font-family: inherit;
  font-size: 12.5px;
  cursor: pointer;
  border-bottom: 1px solid var(--warm-200);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.suggest-item:last-child {
  border-bottom: none;
}

.suggest-item:hover {
  background: var(--amatista-50);
}

.suggest-name {
  font-weight: 500;
  color: var(--warm-900);
}

.suggest-hint {
  font-size: 11.5px;
  color: var(--warm-500);
}

.suggest-empty {
  padding: 10px 12px;
  font-size: 12px;
  color: var(--warm-500);
}

.suggest-empty strong {
  color: var(--warm-900);
}

.add-med {
  margin-top: 10px;
  width: 100%;
  background: transparent;
  border: 1.5px dashed var(--warm-300);
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 13px;
  color: var(--warm-700);
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
}

.add-med:hover {
  background: var(--warm-100);
  border-color: var(--amatista-500);
  color: var(--amatista-700);
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
}

.saved-chip {
  font-size: 12px;
  font-weight: 500;
  padding: 5px 10px;
  border-radius: var(--radius-pill);
  background: var(--success-50);
  color: oklch(40% 0.15 150deg);
  border: 1px solid oklch(85% 0.1 150deg);
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
  background: var(--danger-150);
  border-color: var(--danger-300);
  color: oklch(35% 0.15 25deg);
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
  background: rgb(255 255 255 / 18%);
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
  background: rgb(255 255 255 / 28%);
}
</style>
