<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Bug, X, Pencil } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import BaseField from '@/features/dashboard/components/ui/BaseField.vue'
import BaseInput from '@/features/dashboard/components/ui/BaseInput.vue'
import BaseSelect from '@/features/dashboard/components/ui/BaseSelect.vue'
import BaseTextarea from '@/features/dashboard/components/ui/BaseTextarea.vue'
import DateInput from '@/features/dashboard/components/ui/DateInput.vue'
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

function cancelEditing() {
  editingIndex.value = null
  resetDraft()
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
      <section v-if="props.existing.length > 0 && editingIndex === null" class="existing-section">
        <h4 class="existing-title">Ya agregadas ({{ props.existing.length }})</h4>
        <ul class="existing-list">
          <li v-for="(item, idx) in props.existing" :key="idx" class="existing-card">
            <div class="existing-summary">
              <div class="existing-main">
                {{ formatDateShort(item.date) }} · {{ typeLabel(item.type) }}
              </div>
              <div class="existing-sub">{{ item.product }}</div>
            </div>
            <span v-if="item.savedId" class="saved-chip">✓ Guardado</span>
            <template v-else>
              <button
                type="button"
                class="edit-existing"
                :class="{ active: editingIndex === idx }"
                aria-label="Editar desparasitación"
                :disabled="editingIndex !== null && editingIndex !== idx"
                @click="editingIndex === idx ? cancelEditing() : startEditing(idx)"
              >
                <Pencil :size="14" :stroke-width="1.7" />
              </button>
              <button
                type="button"
                class="remove-existing"
                aria-label="Eliminar desparasitación"
                :disabled="editingIndex !== null"
                @click="emit('remove-existing', idx)"
              >
                <X :size="14" :stroke-width="1.7" />
              </button>
            </template>
          </li>
        </ul>
      </section>

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
      <button type="button" class="btn-ghost" @click="emit('close')">Cancelar</button>
      <button type="button" class="btn-primary" @click="save">
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
