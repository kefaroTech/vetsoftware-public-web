<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Scissors } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import BaseField from '@/features/dashboard/components/ui/BaseField.vue'
import BaseInput from '@/features/dashboard/components/ui/BaseInput.vue'
import BaseTextarea from '@/features/dashboard/components/ui/BaseTextarea.vue'
import DateInput from '@/features/dashboard/components/ui/DateInput.vue'
import SearchableSelect from '@/features/dashboard/components/ui/SearchableSelect.vue'
import type { Animal, Surgery } from '@/types/domain'
import { todayISO, formatDateLong } from '../composables/format'
import { useSurgeryTypes } from '../composables/useSurgeryTypes'

const props = defineProps<{
  open: boolean
  pet: Animal | null
}>()

const emit = defineEmits<{
  save: [item: Surgery]
  close: []
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

watch(
  () => props.open,
  (open) => {
    if (open) {
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
  },
)

const subtitle = computed(() => {
  const p = props.pet
  const head = p ? `${p.name} · ${p.specie?.name ?? ''}` : ''
  return `${head ? head + ' · ' : ''}Hoy, ${formatDateLong(draft.date)}`
})

const errors = computed(() => ({
  surgeryTypeId: !draft.surgeryTypeId ? 'Selecciona un tipo' : null,
  description:
    draft.description.trim().length < 4
      ? 'Mínimo 4 caracteres'
      : null,
}))

const valid = computed<boolean>(
  () => !errors.value.surgeryTypeId && !errors.value.description,
)

function err<K extends keyof typeof errors.value>(k: K): string | undefined {
  if (!submitted.value) return undefined
  return errors.value[k] ?? undefined
}

async function onCreateSurgeryType(data: {
  name: string
  description: string
}) {
  const created = await createSurgeryType(data)
  return {
    value: String(created.id),
    label: created.name,
    hint: created.description ?? undefined,
  }
}

function save() {
  submitted.value = true
  if (!valid.value) return
  const item: Surgery = {
    date: draft.date,
    surgeryTypeId: draft.surgeryTypeId,
    description: draft.description.trim(),
    medicament: draft.medicament.trim(),
    observations: draft.observations.trim(),
    complications: draft.complications.trim(),
  }
  emit('save', item)
}
</script>

<template>
  <ModalShell
    :open="open"
    :icon="Scissors"
    title="Cirugía"
    :subtitle="subtitle"
    :width="1080"
    @close="emit('close')"
  >
    <template #body>
      <div v-if="typesError" class="catalog-error">{{ typesError }}</div>

      <div class="grid-2">
        <BaseField label="Fecha programada" required>
          <template #default>
            <DateInput v-model="draft.date" />
          </template>
        </BaseField>
        <BaseField
          label="Tipo de cirugía"
          required
          :error="err('surgeryTypeId')"
        >
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

      <BaseField
        label="Descripción del procedimiento"
        required
        :error="err('description')"
      >
        <template #default="{ id }">
          <BaseTextarea
            :id="id"
            v-model="draft.description"
            :rows="3"
            placeholder="Detalle del procedimiento, técnica, abordaje…"
          />
        </template>
      </BaseField>

      <BaseField
        label="Anestesia / Premedicación"
        hint="Protocolo y dosis"
      >
        <template #default="{ id }">
          <BaseInput
            :id="id"
            v-model="draft.medicament"
            placeholder="Ej. Acepromacina 0.05 mg/kg + Propofol"
          />
        </template>
      </BaseField>

      <div class="grid-2">
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
      <span>1 cirugía · Se vinculará a la consulta</span>
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
.catalog-error {
  background: oklch(94% 0.06 25);
  border: 1px solid oklch(85% 0.10 25);
  color: oklch(35% 0.15 25);
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 12.5px;
  margin-bottom: 14px;
}
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
