<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Pill } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import BaseField from '@/features/dashboard/components/ui/BaseField.vue'
import BaseInput from '@/features/dashboard/components/ui/BaseInput.vue'
import BaseTextarea from '@/features/dashboard/components/ui/BaseTextarea.vue'
import { getProblemDetailMessage } from '@/services/http/http.client'
import { useMedicamentCatalog } from '../composables/useMedicamentCatalog'
import type { MedicamentResponse } from '@/features/dashboard/views/consulta/nueva/types/medicament.types'
import { scrollToFirstError } from '@/composables/scrollToError'

const props = defineProps<{
  open: boolean
  initial: MedicamentResponse | null
}>()

const emit = defineEmits<{
  close: []
  saved: [item: MedicamentResponse]
}>()

const store = useMedicamentCatalog()

interface Draft {
  name: string
  description: string
}

const draft = reactive<Draft>({ name: '', description: '' })

type FieldKey = 'name' | 'description'
const touched = reactive<Record<FieldKey, boolean>>({ name: false, description: false })
function resetTouched() {
  ;(Object.keys(touched) as FieldKey[]).forEach((k) => (touched[k] = false))
}
function markTouched(field: FieldKey) {
  touched[field] = true
}

const busy = ref(false)
const saveError = ref<string | null>(null)

const isEdit = computed(() => props.initial !== null)

watch(
  () => props.open,
  (open) => {
    if (!open) return
    resetTouched()
    saveError.value = null
    if (props.initial) {
      draft.name = props.initial.name
      draft.description = props.initial.description ?? ''
    } else {
      draft.name = ''
      draft.description = ''
    }
  },
)

const errors = computed(() => ({
  name: draft.name.trim().length < 2 ? 'Mínimo 2 caracteres' : null,
  description: draft.description.length > 500 ? 'Máximo 500 caracteres' : null,
}))

function err(field: FieldKey): string | undefined {
  return touched[field] ? (errors.value[field] ?? undefined) : undefined
}

const isValid = computed(() => Object.values(errors.value).every((e) => e === null))

function validate(): boolean {
  ;(Object.keys(touched) as FieldKey[]).forEach((k) => (touched[k] = true))
  return isValid.value
}
defineExpose({ validate })

async function submit() {
  if (busy.value) return
  if (!validate()) {
    scrollToFirstError()
    return
  }
  busy.value = true
  saveError.value = null
  const payload = { name: draft.name.trim(), description: draft.description.trim() }
  try {
    const saved = props.initial
      ? await store.update(props.initial.id, payload)
      : await store.create(payload)
    emit('saved', saved)
    emit('close')
  } catch (e) {
    saveError.value = getProblemDetailMessage(e, 'No se pudo guardar el medicamento')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <ModalShell
    :open="open"
    :title="isEdit ? 'Editar medicamento' : 'Nuevo medicamento'"
    subtitle="Catálogo de medicamentos"
    :icon="Pill"
    :width="480"
    @close="emit('close')"
  >
    <template #body>
      <div v-if="saveError" class="ds-banner ds-banner--error">{{ saveError }}</div>
      <div class="form">
        <BaseField label="Nombre" required :error="err('name')">
          <template #default="{ id }">
            <BaseInput
              :id="id"
              v-model="draft.name"
              :invalid="!!err('name')"
              placeholder="Ej. Amoxicilina + Clavulánico"
              @blur="markTouched('name')"
            />
          </template>
        </BaseField>
        <BaseField
          label="Descripción"
          hint="Opcional. Notas de referencia sobre el fármaco."
          :error="err('description')"
        >
          <template #default="{ id }">
            <BaseTextarea
              :id="id"
              v-model="draft.description"
              :rows="2"
              :invalid="!!err('description')"
              placeholder="Ej. Antibiótico betalactámico de amplio espectro."
            />
          </template>
        </BaseField>
        <p class="note">
          La presentación, cantidad y posología se indican al recetar; aquí solo se registra el
          medicamento del catálogo.
        </p>
      </div>
    </template>

    <template #footer-actions>
      <button type="button" class="ds-btn ds-btn--ghost ds-btn--lg" @click="emit('close')">
        Cancelar
      </button>
      <button
        type="button"
        class="ds-btn ds-btn--primary ds-btn--lg"
        :disabled="busy"
        @click="submit"
      >
        {{ busy ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear medicamento' }}
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.note {
  margin: 0;
  font-size: 12.5px;
  color: var(--warm-500);
  line-height: 1.55;
}
</style>
