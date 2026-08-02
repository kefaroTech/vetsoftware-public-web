<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Shield, Plus, Trash2, X, Pencil } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import BaseField from '@/features/dashboard/components/ui/BaseField.vue'
import BaseInput from '@/features/dashboard/components/ui/BaseInput.vue'
import BaseTextarea from '@/features/dashboard/components/ui/BaseTextarea.vue'
import DateInput from '@/features/dashboard/components/ui/DateInput.vue'
import SearchableSelect from '@/features/dashboard/components/ui/SearchableSelect.vue'
import type { Animal, Vaccination } from '@/types/domain'
import type { VaccinationDraftItem } from '../composables/useNuevaConsultaDraft'
import { todayISO, formatDateLong, formatDateShort } from '../composables/format'
import { useVaccinationTypes } from '../composables/useVaccinationTypes'
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
      vaccinationTypeId: item.vaccinationTypeId,
      lot: item.lot,
      notes: item.notes,
      nextVaccination: item.nextVaccination,
    },
  ]
  editingIndex.value = idx
  submitted.value = false
}

function cancelEditing() {
  editingIndex.value = null
  resetDraft()
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
      <div v-if="typesError" class="catalog-error">{{ typesError }}</div>

      <section v-if="props.existing.length > 0 && editingIndex === null" class="existing-section">
        <h4 class="existing-title">Ya aplicadas ({{ props.existing.length }})</h4>
        <ul class="existing-list">
          <li v-for="(item, idx) in props.existing" :key="idx" class="existing-card">
            <div class="existing-summary">
              <div class="existing-main">
                {{ formatDateShort(item.date) }} ·
                {{ typeLabel(item.vaccinationTypeId) }}
              </div>
              <div class="existing-sub">Lote: {{ item.lot || '—' }}</div>
            </div>
            <span v-if="item.savedId" class="saved-chip">✓ Guardado</span>
            <template v-else>
              <button
                type="button"
                class="edit-existing"
                :class="{ active: editingIndex === idx }"
                aria-label="Editar vacuna"
                :disabled="editingIndex !== null && editingIndex !== idx"
                @click="editingIndex === idx ? cancelEditing() : startEditing(idx)"
              >
                <Pencil :size="14" :stroke-width="1.7" />
              </button>
              <button
                type="button"
                class="remove-existing"
                aria-label="Eliminar vacuna"
                :disabled="editingIndex !== null"
                @click="emit('remove-existing', idx)"
              >
                <X :size="14" :stroke-width="1.7" />
              </button>
            </template>
          </li>
        </ul>
      </section>

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
      <button type="button" class="btn-ghost" @click="emit('close')">Cancelar</button>
      <button type="button" class="btn-primary" @click="save">
        {{ editingIndex !== null ? 'Guardar cambios' : 'Registrar vacunación' }}
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
.catalog-error {
  background: oklch(94% 0.06 25deg);
  border: 1px solid oklch(85% 0.1 25deg);
  color: oklch(35% 0.15 25deg);
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
  color: oklch(50% 0.18 25deg);
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
  background: oklch(94% 0.06 150deg);
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
  background: oklch(94% 0.06 25deg);
  border-color: oklch(85% 0.1 25deg);
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
