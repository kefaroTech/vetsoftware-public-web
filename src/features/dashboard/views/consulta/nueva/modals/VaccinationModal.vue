<script setup lang="ts">
import { nextRowUid } from '@/composables/rowUid'
import { computed, reactive, ref, watch } from 'vue'
import { Shield, Plus, Trash2 } from 'lucide-vue-next'
import ModalShell from '@/components/ui/ModalShell.vue'
import ExistingItemsSection from '../components/ExistingItemsSection.vue'
import BaseField from '@/components/ui/BaseField.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'
import DateInput from '@/components/ui/DateInput.vue'
import SearchableSelect from '@/components/ui/SearchableSelect.vue'
import type { Animal, Vaccination } from '@/types/domain'
import type { VaccinationDraftItem } from '../composables/useNuevaConsultaDraft'
import { todayISO, formatDateLong, formatDateShort } from '@/composables/format'
import { useVaccinationTypes } from '@/features/vaccination-types/composables/useVaccinationTypes'
import { scrollToFirstError } from '@/composables/scrollToError'

const props = defineProps<{
  open: boolean
  pet: Animal | null
  existing: VaccinationDraftItem[]
}>()

const emit = defineEmits<{
  save: [items: Vaccination[]]
  close: []
  'remove-existing': [index: number]
  'update-existing': [index: number, vaccination: Vaccination]
}>()

interface VacDraft {
  /** Clave estable de la fila; nace vacia, no hay dato del que derivarla. */
  uid: number
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
    uid: nextRowUid(),
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
const editingIndex = ref<number | null>(null)

function resetDraft() {
  draft.date = todayISO()
  draft.vaccinations = [emptyVac()]
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
  draft.date = item.date
  draft.vaccinations = [
    {
      uid: nextRowUid(),
      vaccinationTypeId: item.vaccinationTypeId,
      lot: item.lot,
      notes: item.notes,
      nextVaccination: item.nextVaccination,
    },
  ]
  editingIndex.value = idx
  submitted.value = false
}

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
  errors.value.vaccinations.every((v) => !v.vaccinationTypeId && !v.lot && !v.nextVaccination),
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

function typeLabel(id: string): string {
  return typeOptions.value.find((o) => o.value === id)?.label ?? 'Tipo no encontrado'
}

async function onCreateVaccinationType(data: { name: string; description: string }) {
  const created = await createVaccinationType(data)
  return {
    value: String(created.id),
    label: created.name,
    hint: created.description ?? undefined,
  }
}

// Un formulario nuevo "vacío" (nada escrito) no cuenta como ítem a agregar.
function isNewDraftEmpty(): boolean {
  return draft.vaccinations.every((v) => !v.vaccinationTypeId && !v.lot.trim() && !v.notes.trim())
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
  const items: Vaccination[] = draft.vaccinations.map((v) => ({
    date: draft.date,
    vaccinationTypeId: v.vaccinationTypeId,
    lot: v.lot.trim(),
    notes: v.notes.trim(),
    nextVaccination: v.nextVaccination,
  }))
  if (editingIndex.value !== null) {
    const first = items[0]
    if (!first) return
    emit('update-existing', editingIndex.value, first)
    editingIndex.value = null
    resetDraft()
  } else {
    emit('save', items)
  }
}
</script>

<template>
  <ModalShell
    :open="open"
    :icon="Shield"
    title="Aplicar vacuna"
    :subtitle="subtitle"
    :width-vw="90"
    :height-vh="90"
    @close="emit('close')"
  >
    <template #body>
      <div v-if="typesError" class="ds-catalog-error">{{ typesError }}</div>

      <ExistingItemsSection
        :items="props.existing"
        title="Ya aplicadas"
        noun="vacuna"
        :editing-index="editingIndex"
        @edit="startEditing"
        @remove="emit('remove-existing', $event)"
      >
        <template #main="{ item }">
          {{ formatDateShort(item.date) }} ·
          {{ typeLabel(item.vaccinationTypeId) }}
        </template>
        <template #sub="{ item }">Lote: {{ item.lot || '—' }}</template>
      </ExistingItemsSection>

      <div class="row-date">
        <BaseField label="Fecha de aplicación" required>
          <template #default>
            <DateInput v-model="draft.date" />
          </template>
        </BaseField>
      </div>

      <div class="ds-stack ds-stack--10">
        <div v-for="(v, i) in draft.vaccinations" :key="v.uid" class="vac-card">
          <div class="vac-head">
            <div class="vac-num ds-tone--accent">{{ i + 1 }}</div>
            <div class="vac-title ds-meta-dark ds-meta-dark--sm">Vacuna {{ i + 1 }}</div>
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
            <BaseField label="Tipo de vacuna" required :error="vacErr(i, 'vaccinationTypeId')">
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
            <BaseField label="Notas" class="notes-field">
              <template #default="{ id }">
                <BaseTextarea
                  :id="id"
                  v-model="v.notes"
                  :rows="3"
                  placeholder="Reacciones, vía de aplicación, indicaciones…"
                />
              </template>
            </BaseField>
          </div>
        </div>
      </div>

      <button v-if="editingIndex === null" type="button" class="add-btn" @click="addVac">
        <Plus :size="14" :stroke-width="1.8" />
        <span>Agregar otra vacuna</span>
      </button>
    </template>

    <template #footer-left>
      <span v-if="editingIndex !== null">Editando vacuna existente</span>
      <span v-else>
        {{ draft.vaccinations.length }} vacuna{{ draft.vaccinations.length === 1 ? '' : 's' }}
        · Se vinculará a la consulta
      </span>
    </template>
    <template #footer-actions>
      <button type="button" class="ds-btn ds-btn--ghost" @click="emit('close')">Cancelar</button>
      <button type="button" class="ds-btn ds-btn--solid" @click="save">
        {{ editingIndex !== null ? 'Guardar cambios' : 'Registrar vacunación' }}
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
.row-date {
  max-width: 280px;
  margin-bottom: 14px;
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

/* El par fondo+texto lo pone `.ds-tone--accent`. */
.vac-num {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  font-size: 11px;
  font-weight: 600;
  display: grid;
  place-items: center;
}

/* Residuo sobre `.ds-meta-dark` + `--sm` (warm-600 / 12,5px). */
.vac-title {
  flex: 1;
  font-weight: 500;
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
  color: var(--danger-600);
}

.vac-grid {
  display: grid;
  grid-template-columns: minmax(280px, 2fr) minmax(180px, 1fr) minmax(220px, 1fr);
  gap: 16px 18px;
}

.notes-field {
  grid-column: 1 / -1;
}

@media (width <= 980px) {
  .vac-grid {
    grid-template-columns: 1fr 1fr;
  }

  .notes-field {
    grid-column: 1 / -1;
  }
}

@media (width <= 640px) {
  .vac-grid {
    grid-template-columns: 1fr;
  }

  .notes-field {
    grid-column: auto;
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
</style>
