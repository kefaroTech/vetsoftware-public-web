<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Beaker, Plus, X } from 'lucide-vue-next'
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

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{
  close: []
  created: [item: LaboratoryTestResponse]
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

const patientId = ref<number | null>(null)
const draft = reactive({
  date: todayISO(),
  rows: [emptyRow()] as TestRow[],
})
const submitted = ref(false)
const saving = ref(false)
const saveError = ref<string | null>(null)

function reset() {
  patientId.value = null
  draft.date = todayISO()
  draft.rows = [emptyRow()]
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
    diagnosis: !r.diagnosis.trim() ? 'Indica el diagnóstico presuntivo' : null,
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
  if (!valid.value || saving.value) return
  const cid = companyId.value
  const pid = patientId.value
  if (cid == null || pid == null) {
    saveError.value = 'Faltan datos para guardar.'
    return
  }
  saving.value = true
  saveError.value = null
  try {
    let lastCreated: LaboratoryTestResponse | null = null
    for (const r of draft.rows) {
      lastCreated = await laboratoryTestApi.create({
        date: draft.date,
        testTypeId: Number(r.testTypeId),
        quantity: Number(r.quantity),
        diagnosis: r.diagnosis.trim(),
        animalId: pid,
        consultationId: null,
        companyId: cid,
      })
      if (lastCreated) emit('created', lastCreated)
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
    title="Nueva solicitud de laboratorio"
    subtitle="Crea una solicitud independiente de una consulta"
    :width="900"
    @close="emit('close')"
  >
    <template #body>
      <div v-if="typesError" class="banner error">{{ typesError }}</div>
      <div v-if="saveError" class="banner error">{{ saveError }}</div>

      <BaseField label="Paciente" required :error="err('patient')">
        <PatientCascadePicker
          v-model="patientId"
          :invalid="!!err('patient')"
        />
      </BaseField>

      <BaseField label="Fecha" required>
        <DateInput v-model="draft.date" />
      </BaseField>

      <div class="rows">
        <div v-for="(row, i) in draft.rows" :key="i" class="row-card">
          <div class="row-head">
            <span class="row-num">Examen #{{ i + 1 }}</span>
            <button
              v-if="draft.rows.length > 1"
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
            <BaseField label="Diagnóstico presuntivo" required :error="rowErr(i, 'diagnosis')" class="full">
              <BaseTextarea
                v-model="row.diagnosis"
                :rows="2"
                :invalid="!!rowErr(i, 'diagnosis')"
                placeholder="Sospecha clínica que motiva el examen"
              />
            </BaseField>
          </div>
        </div>
      </div>

      <button type="button" class="add-row" @click="addRow">
        <Plus :size="14" :stroke-width="1.8" /> Agregar otro examen
      </button>
    </template>

    <template #footer-actions>
      <button type="button" class="btn-ghost" :disabled="saving" @click="emit('close')">
        Cancelar
      </button>
      <button type="button" class="btn-primary" :disabled="saving" @click="save">
        {{ saving ? 'Guardando…' : 'Guardar solicitud' }}
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
</style>
