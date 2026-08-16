<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Bug } from 'lucide-vue-next'
import ModalShell from '@/components/ui/ModalShell.vue'
import ExistingItemsSection from '../components/ExistingItemsSection.vue'
import BaseField from '@/components/ui/BaseField.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'
import DateInput from '@/components/ui/DateInput.vue'
import type { Animal, Deworming, DewormingType } from '@/types/domain'
import type { DewormingDraftItem } from '../composables/useNuevaConsultaDraft'
import { todayISO, formatDateLong, formatDateShort } from '../composables/format'
import { scrollToFirstError } from '@/composables/scrollToError'

const props = defineProps<{
  open: boolean
  pet: Animal | null
  existing: DewormingDraftItem[]
}>()

const emit = defineEmits<{
  save: [item: Deworming]
  close: []
  'remove-existing': [index: number]
  'update-existing': [index: number, item: Deworming]
}>()

const typeOptions = [
  { value: 'INTERNAL', label: 'Interna' },
  { value: 'EXTERNAL', label: 'Externa' },
  { value: 'MIX', label: 'Mixta' },
  { value: 'OTHER', label: 'Otra' },
]

const draft = reactive({
  date: todayISO(),
  lastDeworming: '',
  type: 'INTERNAL' as DewormingType,
  product: '',
  dosage: '',
  nextControl: '',
  observations: '',
})
const submitted = ref(false)
const editingIndex = ref<number | null>(null)

function resetDraft() {
  Object.assign(draft, {
    date: todayISO(),
    lastDeworming: '',
    type: 'INTERNAL',
    product: '',
    dosage: '',
    nextControl: '',
    observations: '',
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
    lastDeworming: item.lastDeworming,
    type: item.type,
    product: item.product,
    dosage: item.dosage,
    nextControl: item.nextControl,
    observations: item.observations,
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
  product: !draft.product.trim() ? 'Indica el producto' : null,
  dosage: !draft.dosage.trim() ? 'Indica la dosis' : null,
  lastDeworming:
    draft.lastDeworming && draft.lastDeworming > draft.date
      ? 'No puede ser posterior a la aplicación'
      : null,
  nextControl:
    draft.nextControl && draft.nextControl < draft.date
      ? 'Debe ser posterior a la aplicación'
      : null,
}))

const valid = computed<boolean>(() => Object.values(errors.value).every((e) => !e))

function err<K extends keyof typeof errors.value>(k: K): string | undefined {
  if (!submitted.value) return undefined
  return errors.value[k] ?? undefined
}

function typeLabel(t: DewormingType): string {
  return typeOptions.find((o) => o.value === t)?.label ?? t
}

// Un formulario nuevo "vacío" (nada escrito) no cuenta como ítem a agregar.
function isNewDraftEmpty(): boolean {
  return !draft.product.trim() && !draft.dosage.trim() && !draft.observations.trim()
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
  const item: Deworming = {
    date: draft.date,
    lastDeworming: draft.lastDeworming,
    type: draft.type,
    product: draft.product.trim(),
    dosage: draft.dosage.trim(),
    nextControl: draft.nextControl,
    observations: draft.observations.trim(),
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
    :icon="Bug"
    title="Registrar desparasitación"
    :subtitle="subtitle"
    :width-vw="90"
    :height-vh="90"
    @close="emit('close')"
  >
    <template #body>
      <ExistingItemsSection
        :items="props.existing"
        title="Ya agregadas"
        noun="desparasitación"
        :editing-index="editingIndex"
        @edit="startEditing"
        @remove="emit('remove-existing', $event)"
      >
        <template #main="{ item }"
          >{{ formatDateShort(item.date) }} · {{ typeLabel(item.type) }}</template
        >
        <template #sub="{ item }">{{ item.product }}</template>
      </ExistingItemsSection>

      <div class="grid-2">
        <BaseField label="Fecha de aplicación" required>
          <template #default>
            <DateInput v-model="draft.date" />
          </template>
        </BaseField>
        <BaseField label="Tipo" required :error="err('type')">
          <template #default="{ id }">
            <BaseSelect
              :id="id"
              v-model="draft.type"
              :options="typeOptions"
              :invalid="!!err('type')"
            />
          </template>
        </BaseField>
        <BaseField label="Producto" required :error="err('product')">
          <template #default="{ id }">
            <BaseInput
              :id="id"
              v-model="draft.product"
              placeholder="Ej. Drontal Plus"
              :invalid="!!err('product')"
            />
          </template>
        </BaseField>
        <BaseField label="Dosis" required :error="err('dosage')">
          <template #default="{ id }">
            <BaseInput
              :id="id"
              v-model="draft.dosage"
              placeholder="Ej. 1 comp. por cada 10 kg"
              :invalid="!!err('dosage')"
            />
          </template>
        </BaseField>
        <BaseField label="Última desparasitación" hint="Si se conoce" :error="err('lastDeworming')">
          <template #default>
            <DateInput
              v-model="draft.lastDeworming"
              :max="draft.date"
              :invalid="!!err('lastDeworming')"
            />
          </template>
        </BaseField>
        <BaseField label="Próximo control" hint="Recomendado" :error="err('nextControl')">
          <template #default>
            <DateInput
              v-model="draft.nextControl"
              :min="draft.date"
              :invalid="!!err('nextControl')"
            />
          </template>
        </BaseField>
      </div>

      <BaseField label="Observaciones">
        <template #default="{ id }">
          <BaseTextarea
            :id="id"
            v-model="draft.observations"
            :rows="2"
            placeholder="Vía, indicaciones para el dueño…"
          />
        </template>
      </BaseField>
    </template>

    <template #footer-left>
      <span v-if="editingIndex !== null">Editando desparasitación existente</span>
      <span v-else>1 desparasitación · Se vinculará a la consulta</span>
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
