<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { BedDouble } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import ExistingItemsSection from '../components/ExistingItemsSection.vue'
import BaseField from '@/features/dashboard/components/ui/BaseField.vue'
import BaseInput from '@/features/dashboard/components/ui/BaseInput.vue'
import BaseSelect from '@/features/dashboard/components/ui/BaseSelect.vue'
import BaseTextarea from '@/features/dashboard/components/ui/BaseTextarea.vue'
import DateInput from '@/features/dashboard/components/ui/DateInput.vue'
import type { Animal, Hospitalization, HospitalizationType, ReasonLeaving } from '@/types/domain'
import type { HospitalizationDraftItem } from '../composables/useNuevaConsultaDraft'
import { todayISO, formatDateLong, formatDateShort, weightUnitLabel } from '../composables/format'
import { scrollToFirstError } from '@/composables/scrollToError'

const props = defineProps<{
  open: boolean
  pet: Animal | null
  existing: HospitalizationDraftItem[]
}>()

const emit = defineEmits<{
  save: [item: Hospitalization]
  close: []
  'remove-existing': [index: number]
  'update-existing': [index: number, item: Hospitalization]
}>()

const typeOptions = [
  { value: 'OUTPATIENT', label: 'Ambulatoria' },
  { value: 'HOSPITALIZATION', label: 'Hospitalización' },
]

const reasonLeavingOptions = [
  { value: '', label: 'Aún no aplica' },
  { value: 'MEDICAL_DISCHARGE', label: 'Alta médica' },
  { value: 'HOME_TREATMENT', label: 'Tratamiento en casa' },
  { value: 'TRANSFER', label: 'Traslado' },
  { value: 'TUTOR_WISH', label: 'Decisión del tutor' },
  { value: 'ADMIN', label: 'Administrativa' },
  { value: 'DEATH', label: 'Muerte' },
  { value: 'EUTHANASIA', label: 'Eutanasia' },
]

const draft = reactive({
  date: todayISO(),
  startDate: todayISO(),
  endDate: '',
  type: 'HOSPITALIZATION' as HospitalizationType,
  reasonLeaving: '' as ReasonLeaving | '',
  reason: '',
  observations: '',
  weight: '',
})
const submitted = ref(false)
const editingIndex = ref<number | null>(null)

function resetDraft() {
  Object.assign(draft, {
    date: todayISO(),
    startDate: todayISO(),
    endDate: '',
    type: 'HOSPITALIZATION',
    reasonLeaving: '',
    reason: '',
    observations: '',
    weight: '',
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
    startDate: item.startDate,
    endDate: item.endDate,
    type: item.type,
    reasonLeaving: item.reasonLeaving,
    reason: item.reason,
    observations: item.observations,
    weight: item.weight ?? '',
  })
  editingIndex.value = idx
  submitted.value = false
}

const subtitle = computed(() => {
  const p = props.pet
  const head = p ? `${p.name} · ${p.specie?.name ?? ''}` : ''
  return `${head ? head + ' · ' : ''}Hoy, ${formatDateLong(draft.date)}`
})

const errors = computed(() => ({
  type: !draft.type ? 'Selecciona el tipo' : null,
  reason: draft.reason.trim().length < 4 ? 'Indica el motivo (mínimo 4 caracteres)' : null,
  endDate:
    draft.endDate && draft.endDate < draft.startDate
      ? 'Debe ser igual o posterior al ingreso'
      : null,
}))

const valid = computed<boolean>(
  () => !errors.value.type && !errors.value.reason && !errors.value.endDate,
)

function err<K extends keyof typeof errors.value>(k: K): string | undefined {
  if (!submitted.value) return undefined
  return errors.value[k] ?? undefined
}

function typeLabel(t: HospitalizationType): string {
  return typeOptions.find((o) => o.value === t)?.label ?? t
}

// Un formulario nuevo "vacío" (nada escrito) no cuenta como ítem a agregar.
function isNewDraftEmpty(): boolean {
  return !draft.reason.trim() && !draft.observations.trim() && !draft.weight.trim()
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
  const item: Hospitalization = {
    date: draft.date,
    startDate: draft.startDate,
    endDate: draft.endDate,
    type: draft.type,
    reasonLeaving: draft.reasonLeaving,
    reason: draft.reason.trim(),
    observations: draft.observations.trim(),
    weight: draft.weight.trim(),
  }
  if (editingIndex.value !== null) {
    emit('update-existing', editingIndex.value, item)
    editingIndex.value = null
    resetDraft()
  } else {
    emit('save', item)
  }
}
</script>

<template>
  <ModalShell
    :open="open"
    :icon="BedDouble"
    title="Ingresar a hospitalización"
    :subtitle="subtitle"
    accent="warn"
    :width-vw="90"
    :height-vh="90"
    @close="emit('close')"
  >
    <template #body>
      <ExistingItemsSection
        :items="props.existing"
        title="Ya agregadas"
        noun="hospitalización"
        :editing-index="editingIndex"
        @edit="startEditing"
        @remove="emit('remove-existing', $event)"
      >
        <template #main="{ item }"
          >{{ formatDateShort(item.startDate) }} · {{ typeLabel(item.type) }}</template
        >
        <template #sub="{ item }">{{ item.reason }}</template>
      </ExistingItemsSection>

      <div class="grid-2">
        <BaseField label="Tipo" required :error="err('type')">
          <template #default="{ id }">
            <BaseSelect
              :id="id"
              v-model="draft.type"
              :options="typeOptions"
              placeholder="Selecciona el tipo"
              :invalid="!!err('type')"
            />
          </template>
        </BaseField>
        <BaseField label="Fecha de ingreso" required>
          <template #default>
            <DateInput v-model="draft.startDate" />
          </template>
        </BaseField>
        <BaseField
          label="Fecha de alta"
          hint="Opcional · si ya fue dado de alta"
          :error="err('endDate')"
        >
          <template #default>
            <DateInput v-model="draft.endDate" :min="draft.startDate" :invalid="!!err('endDate')" />
          </template>
        </BaseField>
        <BaseField label="Motivo del alta" hint="Si aplica">
          <template #default="{ id }">
            <BaseSelect :id="id" v-model="draft.reasonLeaving" :options="reasonLeavingOptions" />
          </template>
        </BaseField>
        <BaseField label="Peso al ingreso" hint="Opcional · se registra en el historial de peso">
          <template #default="{ id }">
            <BaseInput
              :id="id"
              v-model="draft.weight"
              inputmode="decimal"
              placeholder="Ej. 12.5"
              :suffix="props.pet ? weightUnitLabel(props.pet.weightType) : undefined"
            />
          </template>
        </BaseField>
      </div>

      <BaseField label="Motivo de hospitalización" required :error="err('reason')">
        <template #default="{ id }">
          <BaseTextarea
            :id="id"
            v-model="draft.reason"
            :rows="3"
            placeholder="Ej. Gastroenteritis hemorrágica con deshidratación severa"
          />
        </template>
      </BaseField>

      <BaseField label="Observaciones">
        <template #default="{ id }">
          <BaseTextarea
            :id="id"
            v-model="draft.observations"
            :rows="3"
            placeholder="Plan terapéutico, monitoreo, indicaciones…"
          />
        </template>
      </BaseField>
    </template>

    <template #footer-left>
      <span v-if="editingIndex !== null">Editando hospitalización existente</span>
      <span v-else>1 hospitalización · Se vinculará a la consulta</span>
    </template>
    <template #footer-actions>
      <button type="button" class="ds-btn ds-btn--ghost" @click="emit('close')">Cancelar</button>
      <button type="button" class="ds-btn ds-btn--solid" @click="save">
        {{ editingIndex !== null ? 'Guardar cambios' : 'Guardar' }}
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-bottom: 14px;
}

@media (width <= 720px) {
  .grid-2 {
    grid-template-columns: 1fr;
  }
}
</style>
