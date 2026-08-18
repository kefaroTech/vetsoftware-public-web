<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Scissors } from 'lucide-vue-next'
import ModalShell from '@/components/ui/ModalShell.vue'
import ExistingItemsSection from '../components/ExistingItemsSection.vue'
import BaseField from '@/components/ui/BaseField.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'
import DateInput from '@/components/ui/DateInput.vue'
import SearchableSelect from '@/components/ui/SearchableSelect.vue'
import type { Animal, Surgery } from '@/types/domain'
import type { SurgeryDraftItem } from '../composables/useNuevaConsultaDraft'
import { todayISO, formatDateLong, formatDateShort } from '@/composables/format'
import { useSurgeryTypes } from '@/features/surgery-types/composables/useSurgeryTypes'
import { scrollToFirstError } from '@/composables/scrollToError'

const props = defineProps<{
  open: boolean
  pet: Animal | null
  existing: SurgeryDraftItem[]
}>()

const emit = defineEmits<{
  save: [item: Surgery]
  close: []
  'remove-existing': [index: number]
  'update-existing': [index: number, item: Surgery]
}>()

const {
  options: typeOptions,
  loading: loadingTypes,
  error: typesError,
  create: createSurgeryType,
} = useSurgeryTypes()

const draft = reactive({
  date: todayISO(),
  surgeryTypeId: '',
  description: '',
  medicament: '',
  observations: '',
  complications: '',
})
const submitted = ref(false)
const editingIndex = ref<number | null>(null)

function resetDraft() {
  Object.assign(draft, {
    date: todayISO(),
    surgeryTypeId: '',
    description: '',
    medicament: '',
    observations: '',
    complications: '',
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
    surgeryTypeId: item.surgeryTypeId,
    description: item.description,
    medicament: item.medicament,
    observations: item.observations,
    complications: item.complications,
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
  surgeryTypeId: !draft.surgeryTypeId ? 'Selecciona un tipo' : null,
  description: draft.description.trim().length < 4 ? 'Mínimo 4 caracteres' : null,
}))

const valid = computed<boolean>(() => !errors.value.surgeryTypeId && !errors.value.description)

function err<K extends keyof typeof errors.value>(k: K): string | undefined {
  if (!submitted.value) return undefined
  return errors.value[k] ?? undefined
}

function typeLabel(id: string): string {
  return typeOptions.value.find((o) => o.value === id)?.label ?? 'Tipo no encontrado'
}

function truncate(s: string, max = 60): string {
  if (!s) return ''
  return s.length > max ? s.slice(0, max - 1) + '…' : s
}

async function onCreateSurgeryType(data: { name: string; description: string }) {
  const created = await createSurgeryType(data)
  return {
    value: String(created.id),
    label: created.name,
    hint: created.description ?? undefined,
  }
}

// Un formulario nuevo "vacío" (nada escrito) no cuenta como ítem a agregar.
function isNewDraftEmpty(): boolean {
  return (
    !draft.surgeryTypeId &&
    !draft.description.trim() &&
    !draft.medicament.trim() &&
    !draft.observations.trim() &&
    !draft.complications.trim()
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
  const item: Surgery = {
    date: draft.date,
    surgeryTypeId: draft.surgeryTypeId,
    description: draft.description.trim(),
    medicament: draft.medicament.trim(),
    observations: draft.observations.trim(),
    complications: draft.complications.trim(),
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
    :icon="Scissors"
    title="Programar cirugía"
    :subtitle="subtitle"
    accent="danger"
    :width-vw="90"
    :height-vh="90"
    @close="emit('close')"
  >
    <template #body>
      <div v-if="typesError" class="ds-catalog-error">{{ typesError }}</div>

      <ExistingItemsSection
        :items="props.existing"
        title="Ya agregadas"
        noun="cirugía"
        :editing-index="editingIndex"
        @edit="startEditing"
        @remove="emit('remove-existing', $event)"
      >
        <template #main="{ item }">
          {{ formatDateShort(item.date) }} ·
          {{ typeLabel(item.surgeryTypeId) }}
        </template>
        <template #sub="{ item }">{{ truncate(item.description) }}</template>
      </ExistingItemsSection>

      <div class="grid-2 ds-grid-2">
        <BaseField label="Fecha programada" required>
          <template #default>
            <DateInput v-model="draft.date" />
          </template>
        </BaseField>
        <BaseField label="Tipo de cirugía" required :error="err('surgeryTypeId')">
          <template #default>
            <SearchableSelect
              v-model="draft.surgeryTypeId"
              :options="typeOptions"
              :loading="loadingTypes"
              placeholder="Selecciona el tipo"
              create-label="Crear tipo de cirugía"
              :invalid="!!err('surgeryTypeId')"
              :on-create="onCreateSurgeryType"
            />
          </template>
        </BaseField>
      </div>

      <BaseField label="Descripción del procedimiento" required :error="err('description')">
        <template #default="{ id }">
          <BaseTextarea
            :id="id"
            v-model="draft.description"
            :rows="3"
            placeholder="Detalle del procedimiento, técnica, abordaje…"
          />
        </template>
      </BaseField>

      <BaseField label="Anestesia / Premedicación" hint="Protocolo y dosis">
        <template #default="{ id }">
          <BaseInput
            :id="id"
            v-model="draft.medicament"
            placeholder="Ej. Acepromacina 0.05 mg/kg + Propofol"
          />
        </template>
      </BaseField>

      <div class="grid-2 ds-grid-2">
        <BaseField label="Observaciones">
          <template #default="{ id }">
            <BaseTextarea
              :id="id"
              v-model="draft.observations"
              :rows="3"
              placeholder="Cuidados pre/postoperatorios, antibiótico…"
            />
          </template>
        </BaseField>
        <BaseField label="Complicaciones">
          <template #default="{ id }">
            <BaseTextarea
              :id="id"
              v-model="draft.complications"
              :rows="3"
              placeholder="Si hubo complicaciones intra o post-operatorias"
            />
          </template>
        </BaseField>
      </div>
    </template>

    <template #footer-left>
      <span v-if="editingIndex !== null">Editando cirugía existente</span>
      <span v-else>1 cirugía · Se vinculará a la consulta</span>
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
/* Único añadido sobre `.ds-grid-2`: el gap simétrico (la primitiva usa 14/16). */
.grid-2 {
  gap: 14px;
}

/* El hueco hacia el bloque siguiente lo pone el hermano y no el `margin-bottom`
   de la rejilla: separa las dos intenciones (gap propio vs. separación entre
   bloques) y deja de repetir el mismo par en los cuatro modales. */
.grid-2 + .field {
  margin-top: 14px;
}

/* La segunda rejilla cierra el cuerpo del modal: no tiene hermano siguiente que
   ponga el hueco, así que conserva el suyo. */
.grid-2:last-child {
  margin-bottom: 14px;
}
</style>
