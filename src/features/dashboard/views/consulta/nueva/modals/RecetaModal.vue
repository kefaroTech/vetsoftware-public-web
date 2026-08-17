<script setup lang="ts">
import { nextRowUid } from '@/composables/rowUid'
import { computed, reactive, ref, watch } from 'vue'
import { Pill, Plus, Trash2 } from 'lucide-vue-next'
import ModalShell from '@/components/ui/ModalShell.vue'
import ExistingItemsSection from '../components/ExistingItemsSection.vue'
import BaseField from '@/components/ui/BaseField.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'
import SearchableSelect from '@/components/ui/SearchableSelect.vue'
import type { Animal, Prescription, MedicamentPrescription } from '@/types/domain'
import type { PrescriptionDraftItem } from '../composables/useNuevaConsultaDraft'
import { todayISO, formatDateLong, formatDateShort } from '@/composables/format'
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
  /** Clave estable de la fila; nace vacia, no hay dato del que derivarla. */
  uid: number
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
  return {
    uid: nextRowUid(),
    medicamentId: '',
    presentation: '',
    quantity: '',
    posology: '',
    observation: '',
  }
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
      uid: nextRowUid(),
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
      <div v-if="medsError" class="ds-catalog-error">{{ medsError }}</div>

      <ExistingItemsSection
        :items="props.existing"
        title="Ya agregados"
        noun="plan terapéutico"
        :editing-index="editingIndex"
        @edit="startEditing"
        @remove="emit('remove-existing', $event)"
      >
        <template #main="{ item }">
          {{ formatDateShort(item.date) }} ·
          {{ item.medicaments[0]?.name || 'Plan terapéutico' }}
        </template>
        <template #sub="{ item }">
          {{ item.medicaments.length }} medicamento{{ item.medicaments.length === 1 ? '' : 's' }}
        </template>
      </ExistingItemsSection>

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

      <div class="ds-block-head">
        <div class="ds-item-label">Medicamentos prescritos</div>
        <div class="ds-hint">{{ draft.medicaments.length }} en el plan</div>
      </div>

      <div class="ds-stack ds-stack--10">
        <div v-for="(m, i) in draft.medicaments" :key="m.uid" class="med-card">
          <div class="med-head">
            <div class="med-num ds-tone--accent">{{ i + 1 }}</div>
            <div class="med-name-preview ds-truncate ds-meta-dark ds-meta-dark--sm">
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
.grid-1 {
  display: grid;
  grid-template-columns: 1fr;
  gap: 18px;
  margin-bottom: 22px;
}

.med-obs {
  margin-top: 12px;
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

/* El par fondo+texto lo pone `.ds-tone--accent`. */
.med-num {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  font-size: 11px;
  font-weight: 600;
  display: grid;
  place-items: center;
}

/* El recorte lo pone `.ds-truncate` y el par color+tamaño `.ds-meta-dark`
   + `--sm`; aquí queda el reparto y el peso. */
.med-name-preview {
  flex: 1;
  font-weight: 500;
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
</style>
