<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Bug } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import BaseField from '@/features/dashboard/components/ui/BaseField.vue'
import BaseInput from '@/features/dashboard/components/ui/BaseInput.vue'
import BaseSelect from '@/features/dashboard/components/ui/BaseSelect.vue'
import BaseTextarea from '@/features/dashboard/components/ui/BaseTextarea.vue'
import DateInput from '@/features/dashboard/components/ui/DateInput.vue'
import type { Animal, Deworming, DewormingType } from '@/types/domain'
import { todayISO, formatDateLong } from '../composables/format'

const props = defineProps<{
  open: boolean
  pet: Animal | null
}>()

const emit = defineEmits<{
  save: [item: Deworming]
  close: []
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

watch(
  () => props.open,
  (open) => {
    if (open) {
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
  },
)

const subtitle = computed(() => {
  const p = props.pet
  const head = p ? `${p.name} · ${p.specie?.name ?? ''}` : ''
  return `${head ? head + ' · ' : ''}Hoy, ${formatDateLong(draft.date)}`
})

const errors = computed(() => ({
  type: !draft.type ? 'Selecciona el tipo' : null,
  product: !draft.product.trim() ? 'Indica el producto' : null,
  dosage: !draft.dosage.trim() ? 'Indica la dosis' : null,
}))

const valid = computed<boolean>(
  () => !errors.value.type && !errors.value.product && !errors.value.dosage,
)

function err<K extends keyof typeof errors.value>(k: K): string | undefined {
  if (!submitted.value) return undefined
  return errors.value[k] ?? undefined
}

function save() {
  submitted.value = true
  if (!valid.value) return
  const item: Deworming = {
    date: draft.date,
    lastDeworming: draft.lastDeworming,
    type: draft.type,
    product: draft.product.trim(),
    dosage: draft.dosage.trim(),
    nextControl: draft.nextControl,
    observations: draft.observations.trim(),
  }
  emit('save', item)
}
</script>

<template>
  <ModalShell
    :open="open"
    :icon="Bug"
    title="Desparasitación"
    :subtitle="subtitle"
    :width="1040"
    @close="emit('close')"
  >
    <template #body>
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
        <BaseField label="Última desparasitación" hint="Si se conoce">
          <template #default>
            <DateInput v-model="draft.lastDeworming" :max="draft.date" />
          </template>
        </BaseField>
        <BaseField label="Próximo control" hint="Recomendado">
          <template #default>
            <DateInput v-model="draft.nextControl" :min="draft.date" />
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
      <span>1 desparasitación · Se vinculará a la consulta</span>
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
        Guardar
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
@media (max-width: 720px) {
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
</style>
