<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Shield, Plus, Trash2 } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import BaseField from '@/features/dashboard/components/ui/BaseField.vue'
import BaseInput from '@/features/dashboard/components/ui/BaseInput.vue'
import BaseTextarea from '@/features/dashboard/components/ui/BaseTextarea.vue'
import DateInput from '@/features/dashboard/components/ui/DateInput.vue'
import SearchableSelect from '@/features/dashboard/components/ui/SearchableSelect.vue'
import type { Animal, Vaccination } from '@/types/domain'
import { todayISO, formatDateLong } from '../composables/format'
import { useVaccinationTypes } from '../composables/useVaccinationTypes'

const props = defineProps<{
  open: boolean
  pet: Animal | null
}>()

const emit = defineEmits<{
  save: [items: Vaccination[]]
  close: []
}>()

interface VacDraft {
  vaccinationTypeId: string
  lot: string
  notes: string
  nextVaccination: string
}

const {
  options: typeOptions,
  loading: loadingTypes,
  error: typesError,
  create: createVaccinationType,
} = useVaccinationTypes()

function plusOneYearISO(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return ''
  const next = new Date(y + 1, m - 1, d)
  const yyyy = next.getFullYear()
  const mm = String(next.getMonth() + 1).padStart(2, '0')
  const dd = String(next.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function emptyVac(): VacDraft {
  return {
    vaccinationTypeId: '',
    lot: '',
    notes: '',
    nextVaccination: plusOneYearISO(todayISO()),
  }
}

const draft = reactive({
  date: todayISO(),
  vaccinations: [emptyVac()] as VacDraft[],
})
const submitted = ref(false)

watch(
  () => props.open,
  (open) => {
    if (open) {
      draft.date = todayISO()
      draft.vaccinations = [emptyVac()]
      submitted.value = false
    }
  },
)

watch(
  () => draft.date,
  (newDate, oldDate) => {
    if (!newDate || !oldDate) return
    const oldNext = plusOneYearISO(oldDate)
    const newNext = plusOneYearISO(newDate)
    draft.vaccinations.forEach((v) => {
      if (v.nextVaccination === oldNext) v.nextVaccination = newNext
    })
  },
)

const subtitle = computed(() => {
  const p = props.pet
  const head = p ? `${p.name} · ${p.specie?.name ?? ''}` : ''
  return `${head ? head + ' · ' : ''}Hoy, ${formatDateLong(draft.date)}`
})

const errors = computed(() => ({
  vaccinations: draft.vaccinations.map((v) => ({
    vaccinationTypeId: !v.vaccinationTypeId ? 'Selecciona un tipo' : null,
    lot: !v.lot.trim() ? 'Indica el lote' : null,
    nextVaccination: null,
  })),
}))

const valid = computed<boolean>(() =>
  errors.value.vaccinations.every(
    (v) => !v.vaccinationTypeId && !v.lot && !v.nextVaccination,
  ),
)

type VacErrKey = 'vaccinationTypeId' | 'lot' | 'nextVaccination'

function vacErr(i: number, k: VacErrKey): string | undefined {
  if (!submitted.value) return undefined
  return errors.value.vaccinations[i]?.[k] ?? undefined
}

function addVac() {
  draft.vaccinations.push(emptyVac())
}
function removeVac(i: number) {
  if (draft.vaccinations.length === 1) return
  draft.vaccinations.splice(i, 1)
}

async function onCreateVaccinationType(data: {
  name: string
  description: string
}) {
  const created = await createVaccinationType(data)
  return {
    value: String(created.id),
    label: created.name,
    hint: created.description ?? undefined,
  }
}

function save() {
  submitted.value = true
  if (!valid.value) return
  const items: Vaccination[] = draft.vaccinations.map((v) => ({
    date: draft.date,
    vaccinationTypeId: v.vaccinationTypeId,
    lot: v.lot.trim(),
    notes: v.notes.trim(),
    nextVaccination: v.nextVaccination,
  }))
  emit('save', items)
}
</script>

<template>
  <ModalShell
    :open="open"
    :icon="Shield"
    title="Vacunación"
    :subtitle="subtitle"
    :width="1160"
    @close="emit('close')"
  >
    <template #body>
      <div v-if="typesError" class="catalog-error">{{ typesError }}</div>

      <div class="row-date">
        <BaseField label="Fecha de aplicación" required>
          <template #default>
            <DateInput v-model="draft.date" />
          </template>
        </BaseField>
      </div>

      <div class="vacs-list">
        <div v-for="(v, i) in draft.vaccinations" :key="i" class="vac-card">
          <div class="vac-head">
            <div class="vac-num">{{ i + 1 }}</div>
            <div class="vac-title">Vacuna {{ i + 1 }}</div>
            <button
              v-if="draft.vaccinations.length > 1"
              type="button"
              class="remove"
              aria-label="Quitar vacuna"
              @click="removeVac(i)"
            >
              <Trash2 :size="14" :stroke-width="1.7" />
            </button>
          </div>
          <div class="vac-grid">
            <BaseField
              label="Tipo de vacuna"
              required
              :error="vacErr(i, 'vaccinationTypeId')"
            >
              <template #default>
                <SearchableSelect
                  v-model="v.vaccinationTypeId"
                  :options="typeOptions"
                  :loading="loadingTypes"
                  placeholder="Selecciona la vacuna"
                  create-label="Crear tipo de vacuna"
                  :invalid="!!vacErr(i, 'vaccinationTypeId')"
                  :on-create="onCreateVaccinationType"
                />
              </template>
            </BaseField>
            <BaseField label="Lote" required :error="vacErr(i, 'lot')">
              <template #default="{ id }">
                <BaseInput
                  :id="id"
                  v-model="v.lot"
                  placeholder="Ej. ABC-2024-12"
                  :invalid="!!vacErr(i, 'lot')"
                />
              </template>
            </BaseField>
            <BaseField label="Próxima dosis" hint="Auto: hoy + 1 año">
              <template #default>
                <DateInput v-model="v.nextVaccination" :min="draft.date" />
              </template>
            </BaseField>
            <BaseField label="Notas">
              <template #default="{ id }">
                <BaseTextarea
                  :id="id"
                  v-model="v.notes"
                  :rows="2"
                  placeholder="Reacciones, vía de aplicación, indicaciones…"
                />
              </template>
            </BaseField>
          </div>
        </div>
      </div>

      <button type="button" class="add-btn" @click="addVac">
        <Plus :size="14" :stroke-width="1.8" />
        <span>Agregar otra vacuna</span>
      </button>
    </template>

    <template #footer-left>
      <span>
        {{ draft.vaccinations.length }} vacuna{{
          draft.vaccinations.length === 1 ? '' : 's'
        }}
        · Se vinculará a la consulta
      </span>
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
        Registrar vacunación
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
.row-date {
  max-width: 280px;
  margin-bottom: 14px;
}
.vacs-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.vac-card {
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 11px;
  padding: 14px;
}
.vac-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.vac-num {
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
.vac-title {
  flex: 1;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--warm-600);
}
.remove {
  background: transparent;
  border: none;
  color: var(--warm-500);
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
}
.remove:hover {
  background: var(--warm-100);
  color: oklch(50% 0.18 25);
}
.vac-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 2fr;
  gap: 12px;
}
@media (max-width: 980px) {
  .vac-grid {
    grid-template-columns: 1fr 1fr;
  }
}
@media (max-width: 640px) {
  .vac-grid {
    grid-template-columns: 1fr;
  }
}
.add-btn {
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
.add-btn:hover {
  background: var(--warm-100);
  border-color: var(--amatista-500);
  color: var(--amatista-700);
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
