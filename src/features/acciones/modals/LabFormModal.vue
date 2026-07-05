<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Beaker, Check, PawPrint, Plus, X } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import BaseField from '@/features/dashboard/components/ui/BaseField.vue'
import BaseInput from '@/features/dashboard/components/ui/BaseInput.vue'
import BaseTextarea from '@/features/dashboard/components/ui/BaseTextarea.vue'
import DateInput from '@/features/dashboard/components/ui/DateInput.vue'
import SearchableSelect from '@/features/dashboard/components/ui/SearchableSelect.vue'
import PatientCascadePicker from '../components/PatientCascadePicker.vue'
import { useAuth } from '@/features/auth/composables/useAuth'
import { useTestTypes } from '@/features/dashboard/views/consulta/nueva/composables/useTestTypes'
import { todayISO } from '@/features/dashboard/views/consulta/nueva/composables/format'
import {
  laboratoryTestApi,
  type LaboratoryTestResponse,
} from '@/features/dashboard/views/consulta/nueva/api/laboratoryTest.api'
import type { AnimalResponse } from '@/features/dashboard/views/consulta/nueva/api/animal.api'
import { scrollToFirstError } from '@/composables/scrollToError'

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
const {
  options: testOptions,
  loading: loadingTypes,
  error: typesError,
  create: createTestType,
} = useTestTypes()

interface TestRow {
  testTypeId: string
  quantity: string
  diagnosis: string
}

function emptyRow(): TestRow {
  return { testTypeId: '', quantity: '1', diagnosis: '' }
}

const isEdit = computed(() => props.initial != null)

const patientId = ref<number | null>(null)
const draft = reactive({
  date: todayISO(),
  sampleCollected: false,
  rows: [emptyRow()] as TestRow[],
})
const submitted = ref(false)
const saving = ref(false)
const saveError = ref<string | null>(null)

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
}

watch(
  () => props.open,
  (open) => {
    if (open) reset()
  },
)

const errors = computed(() => ({
  patient: patientId.value == null ? 'Selecciona un paciente' : null,
  rows: draft.rows.map((r) => ({
    testTypeId: !r.testTypeId ? 'Selecciona un tipo' : null,
    quantity:
      !r.quantity.trim() || Number(r.quantity) < 1 ? 'Cantidad inválida' : null,
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
function removeRow(i: number) {
  if (draft.rows.length === 1) return
  draft.rows.splice(i, 1)
}

function err(field: 'patient'): string | undefined {
  return submitted.value ? errors.value[field] ?? undefined : undefined
}
function rowErr(i: number, k: keyof TestRow): string | undefined {
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

async function save() {
  submitted.value = true
  if (!valid.value || saving.value) {
    scrollToFirstError()
    return
  }
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
      const r = draft.rows[0]!
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
        const desired = draft.sampleCollected
          ? 'PENDING_PROCESSING'
          : 'PENDING_COLLECTION'
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
        })
        emit('saved', created)
      }
    }
    emit('close')
  } catch (e) {
    saveError.value =
      e instanceof Error ? e.message : 'No se pudo guardar la solicitud'
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
    :subtitle="isEdit ? 'Modifica los datos del examen' : 'Crea una solicitud independiente de una consulta'"
    :width="900"
    @close="emit('close')"
  >
    <template #body>
      <div v-if="typesError" class="banner error">{{ typesError }}</div>
      <div v-if="saveError" class="banner error">{{ saveError }}</div>

      <BaseField v-if="!preSelectedAnimal && !isEdit" label="Paciente" required :error="err('patient')">
        <PatientCascadePicker
          v-model="patientId"
          :invalid="!!err('patient')"
        />
      </BaseField>
      <div v-else-if="isEdit && initial" class="patient-fixed">
        <div class="paw"><PawPrint :size="14" :stroke-width="1.7" /></div>
        <div class="info">
          <div class="name">{{ initial.animal.name }}</div>
          <div class="meta">{{ initial.animal.code }}</div>
        </div>
      </div>
      <div v-else-if="preSelectedAnimal" class="patient-fixed">
        <div class="paw"><PawPrint :size="14" :stroke-width="1.7" /></div>
        <div class="info">
          <div class="name">{{ preSelectedAnimal.name }}</div>
          <div class="meta">
            {{ preSelectedAnimal.specie.name }} · {{ preSelectedAnimal.breed.name }}
            <span v-if="preSelectedAnimal.owner"> · {{ preSelectedAnimal.owner.name }}</span>
          </div>
        </div>
      </div>

      <BaseField label="Fecha" required>
        <DateInput v-model="draft.date" />
      </BaseField>

      <div class="rows">
        <div v-for="(row, i) in draft.rows" :key="i" class="row-card">
          <div class="row-head">
            <span class="row-num">Examen #{{ i + 1 }}</span>
            <button
              v-if="!isEdit && draft.rows.length > 1"
              type="button"
              class="remove"
              aria-label="Quitar"
              @click="removeRow(i)"
            >
              <X :size="14" :stroke-width="1.8" />
            </button>
          </div>
          <div class="row-grid">
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
            <BaseField label="Observaciones" :error="rowErr(i, 'diagnosis')" class="full">
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

      <button v-if="!isEdit" type="button" class="add-row" @click="addRow">
        <Plus :size="14" :stroke-width="1.8" /> Agregar otro examen
      </button>

      <label
        v-if="showSampleCollected"
        class="sample-collected"
        :class="{ checked: draft.sampleCollected }"
      >
        <span class="cb-box" :class="{ checked: draft.sampleCollected }">
          <Check v-if="draft.sampleCollected" :size="12" :stroke-width="3" />
        </span>
        <input
          v-model="draft.sampleCollected"
          type="checkbox"
          class="sr-only"
        />
        <div>
          <div class="title">La muestra ya fue recolectada</div>
          <div class="desc">
            Marca esta opción si la muestra está tomada y solo falta procesarla en
            laboratorio. El estado pasará a
            <strong>Pendiente por procesar</strong>.
          </div>
        </div>
      </label>
    </template>

    <template #footer-actions>
      <button type="button" class="btn-ghost" :disabled="saving" @click="emit('close')">
        Cancelar
      </button>
      <button type="button" class="btn-primary" :disabled="saving" @click="save">
        {{ saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Guardar solicitud' }}
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
.banner.error {
  background: oklch(95% 0.06 25);
  border: 1px solid oklch(85% 0.12 25);
  color: oklch(40% 0.18 25);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 12.5px;
  margin-bottom: 12px;
}
.patient-fixed {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--warm-100);
  border: 1px solid var(--warm-200);
  border-radius: 9px;
  padding: 10px 12px;
}
.patient-fixed .paw {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: var(--amatista-100);
  color: var(--amatista-700);
  display: grid;
  place-items: center;
}
.patient-fixed .name {
  font-size: 13px;
  font-weight: 500;
  color: var(--warm-900);
}
.patient-fixed .meta {
  font-size: 11.5px;
  color: var(--warm-500);
  margin-top: 2px;
}
.rows {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 14px;
}
.row-card {
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 12px;
  padding: 14px;
}
.row-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
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
  background: oklch(95% 0.06 25);
  color: oklch(45% 0.18 25);
  border-color: oklch(85% 0.12 25);
}
.row-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 16px;
}
.row-grid .full {
  grid-column: 1 / -1;
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
.add-row:hover {
  border-color: var(--amatista-500);
  background: var(--amatista-50);
}
.btn-ghost,
.btn-primary {
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  padding: 8px 14px;
  border-radius: 9px;
  cursor: pointer;
  border: 1px solid transparent;
}
.btn-ghost {
  background: transparent;
  border-color: var(--warm-200);
  color: var(--warm-700);
}
.btn-ghost:hover:not(:disabled) {
  background: var(--warm-100);
}
.btn-primary {
  background: var(--amatista-700);
  color: white;
}
.btn-primary:hover:not(:disabled) {
  filter: brightness(1.05);
}
.btn-primary:disabled,
.btn-ghost:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.sample-collected {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  background: var(--warm-100);
  border: 1.5px solid var(--warm-200);
  border-radius: 10px;
  cursor: pointer;
  margin-top: 12px;
  position: relative;
  transition: border-color 0.15s ease, background 0.12s ease;
}
.sample-collected:hover {
  border-color: var(--amatista-300);
}
.sample-collected.checked {
  background: linear-gradient(135deg, oklch(95% 0.06 80), oklch(96% 0.02 var(--hue)));
  border-color: oklch(70% 0.13 75);
}
.cb-box {
  width: 18px;
  height: 18px;
  border-radius: 5px;
  border: 1.5px solid var(--warm-300);
  background: var(--warm-50);
  display: grid;
  place-items: center;
  flex-shrink: 0;
  margin-top: 1px;
  color: white;
  transition: background 0.12s ease, border-color 0.12s ease;
}
.sample-collected:hover .cb-box:not(.checked) {
  border-color: var(--amatista-400);
}
.cb-box.checked {
  background: oklch(58% 0.16 75);
  border-color: oklch(58% 0.16 75);
}
.sample-collected .title {
  font-size: 13.5px;
  font-weight: 500;
  color: var(--warm-900);
  line-height: 1.3;
}
.sample-collected .desc {
  font-size: 12px;
  color: var(--warm-600);
  margin-top: 3px;
  line-height: 1.5;
}
.sample-collected .desc strong {
  color: oklch(40% 0.13 75);
  font-weight: 600;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
