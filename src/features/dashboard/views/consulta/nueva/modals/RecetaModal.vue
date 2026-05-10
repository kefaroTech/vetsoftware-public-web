<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Pill, Plus, Trash2 } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import BaseField from '@/features/dashboard/components/ui/BaseField.vue'
import BaseInput from '@/features/dashboard/components/ui/BaseInput.vue'
import BaseTextarea from '@/features/dashboard/components/ui/BaseTextarea.vue'
import type { Animal, Prescription, MedicamentPrescription } from '@/types/domain'
import { todayISO, formatDateLong } from '../composables/format'

const props = defineProps<{
  open: boolean
  pet: Animal | null
}>()

const emit = defineEmits<{
  save: [prescription: Prescription]
  close: []
}>()

interface MedDraft {
  name: string
  presentation: string
  quantity: string
  posology: string
}

interface MedCatalogEntry {
  name: string
  presentation: string
  posology: string
  quantity: number
}

const MED_CATALOG: MedCatalogEntry[] = [
  { name: 'Amoxicilina + Clavulánico', presentation: 'Comprimido 250 mg', posology: '1 comp. cada 12h por 7 días', quantity: 14 },
  { name: 'Meloxicam', presentation: 'Suspensión oral 1.5 mg/ml', posology: '0.1 mg/kg cada 24h por 5 días', quantity: 1 },
  { name: 'Metronidazol', presentation: 'Comprimido 250 mg', posology: '1 comp. cada 12h por 5 días', quantity: 10 },
  { name: 'Omeprazol', presentation: 'Cápsula 20 mg', posology: '1 cáp. cada 24h en ayunas por 10 días', quantity: 10 },
  { name: 'Sucralfato', presentation: 'Suspensión 200 mg/ml', posology: '1 ml cada 8h antes de las comidas', quantity: 1 },
  { name: 'Maropitant', presentation: 'Comprimido 16 mg', posology: '1 comp. cada 24h por 3 días', quantity: 3 },
]

function emptyMed(): MedDraft {
  return { name: '', presentation: '', quantity: '', posology: '' }
}

const draft = reactive({
  date: todayISO(),
  diagnosis: '',
  observations: '',
  medicaments: [emptyMed()] as MedDraft[],
})

const submitted = ref(false)
const searchIdx = ref<number | null>(null)

watch(
  () => props.open,
  (open) => {
    if (open) {
      Object.assign(draft, {
        date: todayISO(),
        diagnosis: '',
        observations: '',
        medicaments: [emptyMed()],
      })
      submitted.value = false
      searchIdx.value = null
    }
  },
)

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
    diagnosis: !draft.diagnosis.trim()
      ? 'Indica el diagnóstico'
      : draft.diagnosis.trim().length < 3
        ? 'Mínimo 3 caracteres'
        : null,
    medicaments: draft.medicaments.map((m) => ({
      name: !m.name.trim() ? 'Indica el medicamento' : null,
      presentation: !m.presentation.trim() ? 'Indica la presentación' : null,
      quantity: !m.quantity.trim()
        ? 'Indica la cantidad'
        : Number(m.quantity.replace(',', '.')) <= 0
          ? 'Cantidad inválida'
          : null,
      posology: !m.posology.trim() ? 'Indica la posología' : null,
    })),
  }
  return e
})

const valid = computed<boolean>(() => {
  if (errors.value.diagnosis) return false
  return errors.value.medicaments.every(
    (m) => !m.name && !m.presentation && !m.quantity && !m.posology,
  )
})

function addMed() {
  draft.medicaments.push(emptyMed())
}
function removeMed(i: number) {
  if (draft.medicaments.length === 1) return
  draft.medicaments.splice(i, 1)
}

function pickFromCatalog(i: number, item: MedCatalogEntry) {
  draft.medicaments[i] = {
    name: item.name,
    presentation: item.presentation,
    quantity: String(item.quantity),
    posology: item.posology,
  }
  searchIdx.value = null
}

function onSuggestBlur() {
  setTimeout(() => {
    searchIdx.value = null
  }, 150)
}

function showSuggestionsFor(i: number) {
  return searchIdx.value === i && draft.medicaments[i].name.trim().length >= 1
}

function suggestionsFor(i: number) {
  const q = draft.medicaments[i].name.trim().toLowerCase()
  return MED_CATALOG.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 5)
}

function save() {
  submitted.value = true
  if (!valid.value) return
  const prescription: Prescription = {
    date: draft.date,
    diagnosis: draft.diagnosis.trim(),
    observations: draft.observations.trim(),
    medicaments: draft.medicaments.map<MedicamentPrescription>((m) => ({
      name: m.name.trim(),
      presentation: m.presentation.trim(),
      quantity: Number(m.quantity.replace(',', '.')),
      posology: m.posology.trim(),
    })),
  }
  emit('save', prescription)
}

function err<K extends 'diagnosis'>(k: K): string | undefined {
  if (!submitted.value) return undefined
  return errors.value[k] ?? undefined
}

function medErr(i: number, k: keyof MedDraft): string | undefined {
  if (!submitted.value) return undefined
  return errors.value.medicaments[i]?.[k] ?? undefined
}
</script>

<template>
  <ModalShell
    :open="open"
    :icon="Pill"
    title="Receta médica"
    :subtitle="subtitle"
    :width="1280"
    @close="emit('close')"
  >
    <template #body>
      <div class="grid-2">
        <BaseField
          label="Diagnóstico"
          required
          hint="Se imprime en la receta"
          :error="err('diagnosis')"
        >
          <template #default="{ id }">
            <BaseTextarea
              :id="id"
              v-model="draft.diagnosis"
              :rows="2"
              placeholder="Ej. Gastroenteritis aguda inespecífica"
            />
          </template>
        </BaseField>
        <BaseField
          label="Observaciones"
          hint="Indicaciones adicionales para el propietario"
        >
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
        <div class="meds-count">{{ draft.medicaments.length }} en la receta</div>
      </div>

      <div class="meds-list">
        <div
          v-for="(m, i) in draft.medicaments"
          :key="i"
          class="med-card"
        >
          <div class="med-head">
            <div class="med-num">{{ i + 1 }}</div>
            <div class="med-name-preview">
              {{ m.name || 'Nuevo medicamento' }}
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
            <BaseField
              label="Nombre del medicamento"
              required
              :error="medErr(i, 'name')"
            >
              <template #default="{ id }">
                <div
                  class="suggest-wrap"
                  @focusin="searchIdx = i"
                  @focusout="onSuggestBlur"
                >
                  <BaseInput
                    :id="id"
                    v-model="m.name"
                    placeholder="Ej. Amoxicilina"
                    :invalid="!!medErr(i, 'name')"
                  />
                  <div v-if="showSuggestionsFor(i)" class="suggest">
                    <button
                      v-for="(c, ci) in suggestionsFor(i)"
                      :key="ci"
                      type="button"
                      class="suggest-item"
                      @mousedown.prevent="pickFromCatalog(i, c)"
                    >
                      <div class="suggest-name">{{ c.name }}</div>
                      <div class="suggest-hint">{{ c.presentation }}</div>
                    </button>
                    <div
                      v-if="suggestionsFor(i).length === 0"
                      class="suggest-empty"
                    >
                      Sin coincidencias · se guardará como
                      <strong>"{{ m.name.trim() }}"</strong>
                    </div>
                  </div>
                </div>
              </template>
            </BaseField>
            <BaseField
              label="Presentación"
              required
              :error="medErr(i, 'presentation')"
            >
              <template #default="{ id }">
                <BaseInput
                  :id="id"
                  v-model="m.presentation"
                  placeholder="Comprimido 250 mg"
                  :invalid="!!medErr(i, 'presentation')"
                />
              </template>
            </BaseField>
            <BaseField
              label="Cantidad"
              required
              :error="medErr(i, 'quantity')"
            >
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
        </div>
      </div>

      <button type="button" class="add-med" @click="addMed">
        <Plus :size="14" :stroke-width="1.8" />
        <span>Agregar otro medicamento</span>
      </button>
    </template>

    <template #footer-left>
      <span>
        {{ draft.medicaments.length }} medicamento{{
          draft.medicaments.length === 1 ? '' : 's'
        }}
        · Se vinculará a la consulta actual
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
        Guardar receta
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  margin-bottom: 22px;
}
@media (max-width: 880px) {
  .grid-2 {
    grid-template-columns: 1fr;
  }
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
  color: oklch(50% 0.18 25);
}
.med-grid {
  display: grid;
  grid-template-columns: 2fr 1.5fr 140px 2fr;
  gap: 12px;
}
@media (max-width: 980px) {
  .med-grid {
    grid-template-columns: 1fr 1fr;
  }
}
@media (max-width: 640px) {
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
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.12);
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
