<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Syringe, PawPrint } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import BaseField from '@/features/dashboard/components/ui/BaseField.vue'
import BaseInput from '@/features/dashboard/components/ui/BaseInput.vue'
import BaseTextarea from '@/features/dashboard/components/ui/BaseTextarea.vue'
import DateInput from '@/features/dashboard/components/ui/DateInput.vue'
import SearchableSelect from '@/features/dashboard/components/ui/SearchableSelect.vue'
import PatientCascadePicker from '../components/PatientCascadePicker.vue'
import { useAuth } from '@/features/auth/composables/useAuth'
import { useVaccinationTypes } from '@/features/vaccination-types/composables/useVaccinationTypes'
import { todayISO } from '@/features/dashboard/views/consulta/nueva/composables/format'
import { vaccinationApi } from '@/features/dashboard/views/consulta/nueva/api/vaccination.api'
import type { VaccinationResponse } from '@/features/dashboard/views/consulta/nueva/types/vaccination.types'
import type { AnimalResponse } from '@/features/dashboard/views/consulta/nueva/types/animal.types'
import { scrollToFirstError } from '@/composables/scrollToError'

const props = defineProps<{
  open: boolean
  preSelectedAnimal?: AnimalResponse | null
  initial?: VaccinationResponse | null
}>()
const emit = defineEmits<{
  close: []
  saved: [item: VaccinationResponse]
}>()

const { companyId } = useAuth()
const {
  options: typeOptions,
  loading: loadingTypes,
  error: typesError,
  create: createType,
} = useVaccinationTypes()

function plusOneYear(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  const next = new Date(y + 1, (m ?? 1) - 1, d ?? 1)
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`
}

const isEdit = computed(() => props.initial != null)

const patientId = ref<number | null>(null)
const draft = reactive({
  date: todayISO(),
  typeId: '',
  lot: '',
  notes: '',
  nextVaccination: plusOneYear(todayISO()),
})
const submitted = ref(false)
const saving = ref(false)
const saveError = ref<string | null>(null)

function reset() {
  if (props.initial) {
    patientId.value = props.initial.animal.id
    draft.date = props.initial.date
    draft.typeId = String(props.initial.vaccinationType.id)
    draft.lot = props.initial.lot
    draft.notes = props.initial.notes
    draft.nextVaccination = props.initial.nextVaccination ?? ''
  } else {
    patientId.value = props.preSelectedAnimal?.id ?? null
    const today = todayISO()
    draft.date = today
    draft.typeId = ''
    draft.lot = ''
    draft.notes = ''
    draft.nextVaccination = plusOneYear(today)
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
  typeId: !draft.typeId ? 'Selecciona el tipo de vacuna' : null,
  lot: !draft.lot.trim() ? 'Indica el lote' : null,
}))

const valid = computed(() => !errors.value.patient && !errors.value.typeId && !errors.value.lot)

function err(field: keyof typeof errors.value): string | undefined {
  return submitted.value ? (errors.value[field] ?? undefined) : undefined
}

async function onCreateType(data: { name: string; description: string }) {
  const created = await createType(data)
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
  const payload = {
    date: draft.date,
    vaccinationTypeId: Number(draft.typeId),
    lot: draft.lot.trim(),
    notes: draft.notes.trim(),
    nextVaccination: draft.nextVaccination || null,
    animalId: pid,
    consultationId: props.initial?.consultation?.id ?? null,
    companyId: cid,
  }
  try {
    const result = props.initial
      ? await vaccinationApi.update(props.initial.id, payload)
      : await vaccinationApi.create(payload)
    emit('saved', result)
    emit('close')
  } catch (e) {
    saveError.value = e instanceof Error ? e.message : 'No se pudo guardar la vacunación'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <ModalShell
    :open="open"
    :icon="Syringe"
    :title="isEdit ? 'Editar vacunación' : 'Nueva vacunación'"
    :subtitle="
      isEdit
        ? 'Modifica los datos de la aplicación'
        : 'Registra una aplicación independiente de una consulta'
    "
    :width="820"
    @close="emit('close')"
  >
    <template #body>
      <div v-if="typesError" class="ds-banner ds-banner--sm ds-banner--error">{{ typesError }}</div>
      <div v-if="saveError" class="ds-banner ds-banner--sm ds-banner--error">{{ saveError }}</div>

      <BaseField
        v-if="!preSelectedAnimal && !isEdit"
        label="Paciente"
        required
        :error="err('patient')"
      >
        <PatientCascadePicker v-model="patientId" :invalid="!!err('patient')" />
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

      <div class="grid">
        <BaseField label="Fecha de aplicación" required>
          <DateInput v-model="draft.date" />
        </BaseField>
        <BaseField label="Tipo de vacuna" required :error="err('typeId')">
          <SearchableSelect
            v-model="draft.typeId"
            :options="typeOptions"
            :loading="loadingTypes"
            :invalid="!!err('typeId')"
            placeholder="Selecciona o crea"
            :on-create="onCreateType"
            create-label="Crear tipo de vacuna"
          />
        </BaseField>
        <BaseField label="Lote" required :error="err('lot')">
          <BaseInput v-model="draft.lot" :invalid="!!err('lot')" />
        </BaseField>
        <BaseField label="Próxima aplicación">
          <DateInput v-model="draft.nextVaccination" />
        </BaseField>
        <BaseField label="Notas" class="full">
          <BaseTextarea v-model="draft.notes" :rows="2" />
        </BaseField>
      </div>
    </template>

    <template #footer-actions>
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
        {{ saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Guardar vacunación' }}
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
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

.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px 16px;
  margin-top: 14px;
}
.grid .full {
  grid-column: 1 / -1;
}

@media (width <= 760px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
