<script setup lang="ts">
import { useUnsavedChangesGuard } from '@/composables/useUnsavedChangesGuard'
import { nextRowUid } from '@/composables/rowUid'
import { computed, reactive, ref, watch } from 'vue'
import { Beaker, Plus, X } from 'lucide-vue-next'
import ModalShell from '@/components/ui/ModalShell.vue'
import BaseField from '@/components/ui/BaseField.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'
import DateInput from '@/components/ui/DateInput.vue'
import SearchableSelect from '@/components/ui/SearchableSelect.vue'
import PatientCascadePicker from '../components/PatientCascadePicker.vue'
import PatientFixedCard from '../components/PatientFixedCard.vue'
import BranchConfirmNotice from '@/features/dashboard/views/consulta/nueva/components/BranchConfirmNotice.vue'
import SampleCollectedToggle from '../components/SampleCollectedToggle.vue'
import { useAuth } from '@/features/auth/composables/useAuth'
import { useBranches } from '@/features/branches/composables/useBranches'
import { useTestTypes } from '@/features/laboratory-test-types/composables/useLaboratoryTestTypes'
import { todayISO } from '@/composables/format'
import { laboratoryTestApi } from '@/features/dashboard/views/consulta/nueva/api/laboratoryTest.api'
import type { LaboratoryTestResponse } from '@/features/dashboard/views/consulta/nueva/types/laboratoryTest.types'
import type { AnimalResponse } from '@/features/dashboard/views/consulta/nueva/types/animal.types'
import { scrollToFirstError } from '@/composables/scrollToError'
import { getProblemDetailMessage } from '@/services/http/http.client'

const props = defineProps<{
  open: boolean
  preSelectedAnimal?: AnimalResponse | null
  initial?: LaboratoryTestResponse | null
}>()
const emit = defineEmits<{
  close: []
  saved: [item: LaboratoryTestResponse]
}>()

const { companyId } = useAuth()
// Desplegable de sede: solo las sedes ASIGNADAS al usuario (aunque sea admin).
const { assignedBranches, selectedBranchId } = useBranches()
const {
  options: testOptions,
  loading: loadingTypes,
  error: typesError,
  create: createTestType,
} = useTestTypes()

interface TestRow {
  /** Clave estable de la fila; la fila nace vacia. Ver `rowUid`. */
  uid: number
  testTypeId: string
  quantity: string
  diagnosis: string
}

function emptyRow(): TestRow {
  return { uid: nextRowUid(), testTypeId: '', quantity: '1', diagnosis: '' }
}

const isEdit = computed(() => props.initial != null)

const patientId = ref<number | null>(null)
const branchId = ref<number | null>(null)
const defaultBranchId = ref<number | null>(null)
const confirmingBranch = ref(false)
const draft = reactive({
  date: todayISO(),
  sampleCollected: false,
  rows: [emptyRow()] as TestRow[],
})
// En edicion el formulario nace lleno: solo avisa si hay captura nueva.
useUnsavedChangesGuard(
  () =>
    props.open &&
    !isEdit.value &&
    (patientId.value !== null ||
      draft.rows.some((r) => r.testTypeId !== '' || r.diagnosis.trim() !== '')),
)

const submitted = ref(false)
const saving = ref(false)
const saveError = ref<string | null>(null)

// Sede por defecto: la del menú si el usuario la tiene asignada; si no, su primera sede asignada.
function resolveDefaultBranch(): number | null {
  const ids = assignedBranches.value.map((b) => b.id)
  if (selectedBranchId.value != null && ids.includes(selectedBranchId.value))
    return selectedBranchId.value
  return assignedBranches.value[0]?.id ?? null
}
// Sede de la solicitud: solo se elige al crear y si el usuario tiene ≥2 sedes asignadas.
const showBranchField = computed(() => !isEdit.value && assignedBranches.value.length > 1)
const branchOptions = computed(() =>
  assignedBranches.value.map((b) => ({
    value: String(b.id),
    label: b.city?.name ? `${b.name} - ${b.city.name}` : b.name,
  })),
)
function branchName(id: number | null): string {
  return assignedBranches.value.find((b) => b.id === id)?.name ?? 'la sede'
}
// Hay que confirmar si (al crear) la sede elegida difiere de la sede por defecto.
const needsBranchConfirm = computed(
  () =>
    !isEdit.value &&
    defaultBranchId.value != null &&
    branchId.value != null &&
    branchId.value !== defaultBranchId.value,
)

// Solo mostrar el toggle cuando aplica: en create siempre, en edit solo si el
// status actual sigue en alguno de los dos PENDING*. Si el examen ya está
// COMPLETED o CANCELLED, no degradar via este checkbox.
const showSampleCollected = computed(() => {
  if (!isEdit.value) return true
  const s = props.initial?.status
  return s === 'PENDING_COLLECTION' || s === 'PENDING_PROCESSING'
})

function reset() {
  if (props.initial) {
    patientId.value = props.initial.animal.id
    draft.date = props.initial.date
    draft.sampleCollected = props.initial.status === 'PENDING_PROCESSING'
    draft.rows = [
      {
        uid: nextRowUid(),
        testTypeId: String(props.initial.testType.id),
        quantity: String(props.initial.quantity),
        diagnosis: props.initial.diagnosis,
      },
    ]
  } else {
    patientId.value = props.preSelectedAnimal?.id ?? null
    draft.date = todayISO()
    draft.sampleCollected = false
    draft.rows = [emptyRow()]
  }
  submitted.value = false
  saveError.value = null
  confirmingBranch.value = false
  // Sede por defecto: la del menú si está asignada al usuario; si no, su primera sede asignada.
  defaultBranchId.value = resolveDefaultBranch()
  branchId.value = defaultBranchId.value
}

watch(
  () => props.open,
  (open) => {
    if (open) reset()
  },
)

// Default de sede cuando las sucursales llegan tarde.
watch(assignedBranches, () => {
  if (props.open && branchId.value == null) {
    defaultBranchId.value = resolveDefaultBranch()
    branchId.value = defaultBranchId.value
  }
})

const errors = computed(() => ({
  patient: patientId.value == null ? 'Selecciona un paciente' : null,
  rows: draft.rows.map((r) => ({
    testTypeId: !r.testTypeId ? 'Selecciona un tipo' : null,
    quantity: !r.quantity.trim() || Number(r.quantity) < 1 ? 'Cantidad inválida' : null,
    diagnosis: null, // Observaciones es opcional.
  })),
}))

const valid = computed(
  () =>
    !errors.value.patient &&
    errors.value.rows.every((r) => !r.testTypeId && !r.quantity && !r.diagnosis),
)

function addRow() {
  draft.rows.push(emptyRow())
}
function removeRow(uid: number) {
  if (draft.rows.length === 1) return
  draft.rows = draft.rows.filter((r) => r.uid !== uid)
}

function err(field: 'patient'): string | undefined {
  return submitted.value ? (errors.value[field] ?? undefined) : undefined
}
function rowErr(i: number, k: Exclude<keyof TestRow, 'uid'>): string | undefined {
  if (!submitted.value) return undefined
  return errors.value.rows[i]?.[k] ?? undefined
}

async function onCreateType(data: { name: string; description: string }) {
  const created = await createTestType(data)
  return {
    value: String(created.id),
    label: created.name,
    hint: created.description ?? undefined,
  }
}

function save() {
  submitted.value = true
  if (!valid.value || saving.value) {
    scrollToFirstError()
    return
  }
  if (companyId.value == null || patientId.value == null) {
    saveError.value = 'Faltan datos para guardar.'
    return
  }
  // Confirmación si la sede elegida difiere de la del menú principal (solo al crear).
  if (needsBranchConfirm.value && !confirmingBranch.value) {
    confirmingBranch.value = true
    return
  }
  void doSave()
}

async function doSave() {
  confirmingBranch.value = false
  const cid = companyId.value
  const pid = patientId.value
  if (cid == null || pid == null) {
    saveError.value = 'Faltan datos para guardar.'
    return
  }
  saving.value = true
  saveError.value = null
  try {
    if (props.initial) {
      const r = draft.rows[0]
      if (!r) {
        saveError.value = 'Agrega al menos un examen para guardar.'
        return
      }
      let updated = await laboratoryTestApi.update(props.initial.id, {
        date: draft.date,
        testTypeId: Number(r.testTypeId),
        quantity: Number(r.quantity),
        diagnosis: r.diagnosis.trim(),
        animalId: pid,
        consultationId: props.initial.consultation?.id ?? null,
        companyId: cid,
      })
      // Si el checkbox aplica y cambió respecto al status actual, dispara el
      // cambio via PATCH /status (el PUT no acepta status en este endpoint).
      if (showSampleCollected.value) {
        const desired = draft.sampleCollected ? 'PENDING_PROCESSING' : 'PENDING_COLLECTION'
        if (desired !== props.initial.status) {
          updated = await laboratoryTestApi.changeStatus(props.initial.id, desired)
        }
      }
      emit('saved', updated)
    } else {
      const status = draft.sampleCollected ? 'PENDING_PROCESSING' : 'PENDING_COLLECTION'
      for (const r of draft.rows) {
        const created = await laboratoryTestApi.create({
          date: draft.date,
          testTypeId: Number(r.testTypeId),
          quantity: Number(r.quantity),
          diagnosis: r.diagnosis.trim(),
          status,
          animalId: pid,
          consultationId: null,
          companyId: cid,
          branchId: branchId.value,
        })
        emit('saved', created)
      }
    }
    emit('close')
  } catch (e) {
    saveError.value = getProblemDetailMessage(e, 'No se pudo guardar la solicitud')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <ModalShell
    :open="open"
    :icon="Beaker"
    :title="isEdit ? 'Editar examen de laboratorio' : 'Nueva solicitud de laboratorio'"
    :subtitle="
      isEdit ? 'Modifica los datos del examen' : 'Crea una solicitud independiente de una consulta'
    "
    :width="900"
    @close="emit('close')"
  >
    <template #body>
      <BranchConfirmNotice
        v-if="confirmingBranch"
        :branch-name="branchName(branchId)"
        :default-branch-name="branchName(defaultBranchId)"
      />
      <template v-else>
        <div v-if="typesError" class="ds-banner ds-banner--sm ds-banner--error">
          {{ typesError }}
        </div>
        <div v-if="saveError" class="ds-banner ds-banner--sm ds-banner--error">{{ saveError }}</div>

        <BaseField
          v-if="!preSelectedAnimal && !isEdit"
          label="Paciente"
          required
          :error="err('patient')"
        >
          <PatientCascadePicker v-model="patientId" :invalid="!!err('patient')" />
        </BaseField>
        <PatientFixedCard v-else :summary="initial?.animal" :animal="preSelectedAnimal" />

        <BaseField label="Fecha" required>
          <DateInput v-model="draft.date" />
        </BaseField>

        <BaseField
          v-if="showBranchField"
          label="Sede"
          required
          hint="Por defecto, la sede seleccionada en el menú principal."
        >
          <BaseSelect
            :model-value="branchId != null ? String(branchId) : null"
            :options="branchOptions"
            placeholder="Selecciona una sede"
            @update:model-value="(v: string) => (branchId = Number(v))"
          />
        </BaseField>

        <div class="rows ds-stack">
          <div v-for="(row, i) in draft.rows" :key="row.uid" class="row-card">
            <div class="ds-block-head">
              <span class="row-num">Examen #{{ i + 1 }}</span>
              <button
                v-if="!isEdit && draft.rows.length > 1"
                type="button"
                class="remove"
                aria-label="Quitar"
                @click="removeRow(row.uid)"
              >
                <X :size="14" :stroke-width="1.8" />
              </button>
            </div>
            <div class="row-grid ds-grid-2">
              <BaseField label="Tipo de examen" required :error="rowErr(i, 'testTypeId')">
                <SearchableSelect
                  v-model="row.testTypeId"
                  :options="testOptions"
                  :loading="loadingTypes"
                  :invalid="!!rowErr(i, 'testTypeId')"
                  placeholder="Selecciona o crea un tipo"
                  :on-create="onCreateType"
                  create-label="Crear tipo de examen"
                />
              </BaseField>
              <BaseField label="Cantidad" required :error="rowErr(i, 'quantity')">
                <BaseInput
                  v-model="row.quantity"
                  type="number"
                  min="1"
                  :invalid="!!rowErr(i, 'quantity')"
                />
              </BaseField>
              <BaseField label="Observaciones" :error="rowErr(i, 'diagnosis')" class="ds-grid-span">
                <BaseTextarea
                  v-model="row.diagnosis"
                  :rows="2"
                  :invalid="!!rowErr(i, 'diagnosis')"
                  placeholder="Observaciones sobre el examen solicitado"
                />
              </BaseField>
            </div>
          </div>
        </div>

        <button
          v-if="!isEdit"
          type="button"
          class="add-row ds-tone--accent-outline"
          @click="addRow"
        >
          <Plus :size="14" :stroke-width="1.8" /> Agregar otro examen
        </button>

        <SampleCollectedToggle v-if="showSampleCollected" v-model="draft.sampleCollected" />
      </template>
    </template>

    <template #footer-actions>
      <template v-if="confirmingBranch">
        <button
          type="button"
          class="ds-btn ds-btn--ghost ds-btn--snug"
          :disabled="saving"
          @click="confirmingBranch = false"
        >
          Volver
        </button>
        <button
          type="button"
          class="ds-btn ds-btn--solid ds-btn--snug"
          :disabled="saving"
          @click="doSave"
        >
          Sí, usar esta sede
        </button>
      </template>
      <template v-else>
        <button
          type="button"
          class="ds-btn ds-btn--ghost ds-btn--snug"
          :disabled="saving"
          @click="emit('close')"
        >
          Cancelar
        </button>
        <button
          type="button"
          class="ds-btn ds-btn--solid ds-btn--snug"
          :disabled="saving"
          @click="save"
        >
          {{ saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Guardar solicitud' }}
        </button>
      </template>
    </template>
  </ModalShell>
</template>

<style scoped>
/* Añadidos sobre `.ds-stack`: gap propio y el hueco hacia el bloque anterior. */
.rows {
  gap: 12px;
  margin-top: 14px;
}

/* Único añadido sobre `.ds-grid-2`: el gap de fila propio de estas fichas. */
.row-grid {
  gap: 12px 16px;
}

.row-card {
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 12px;
  padding: 14px;
}

.row-num {
  font-size: 12px;
  color: var(--warm-600);
  font-weight: 500;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.remove {
  background: transparent;
  border: 1px solid var(--warm-200);
  width: 26px;
  height: 26px;
  border-radius: 7px;
  color: var(--warm-600);
  cursor: pointer;
  display: grid;
  place-items: center;
}

.remove:hover {
  background: var(--danger-100);
  color: oklch(45% 0.18 25deg);
  border-color: var(--danger-400);
}

.add-row {
  margin-top: 12px;
  background: transparent;
  border: 1px dashed var(--warm-300);
  color: var(--amatista-700);
  padding: 8px 14px;
  border-radius: 9px;
  font-family: inherit;
  font-size: 12.5px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

/* El estado `:hover` lo pinta `.ds-tone--accent-outline:hover:not(:disabled)`
   (primitives.css) — aplicada desde el marcado, ver arriba. */
</style>
