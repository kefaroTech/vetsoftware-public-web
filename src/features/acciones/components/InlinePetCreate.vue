<script setup lang="ts">
/**
 * Alta de mascota dentro del selector de paciente. Hermana de
 * `InlineOwnerCreate`: mismo contrato (`created` / `cancel`) y el mismo motivo
 * para existir aparte — su borrador, su validación y su POST no los comparte
 * con la cascada que la monta.
 */
import { ref } from 'vue'
import { TriangleAlert } from 'lucide-vue-next'
import PetForm from '@/features/dashboard/views/consulta/nueva/components/PetForm.vue'
import { animalApi } from '@/features/dashboard/views/consulta/nueva/api/animal.api'
import { buildCreateAnimalRequest } from '@/features/dashboard/views/consulta/nueva/api/animal.mapper'
import type { AnimalResponse } from '@/features/dashboard/views/consulta/nueva/types/animal.types'
import type { PetDraft } from '@/features/dashboard/views/consulta/nueva/composables/useNuevaConsultaDraft'
import { getProblemDetailMessage } from '@/services/http/http.client'
import type { Owner } from '@/types/domain'

const props = defineProps<{
  /** Propietario al que se registra la mascota. */
  ownerId: Owner['id']
}>()

const emit = defineEmits<{
  created: [animal: AnimalResponse]
  cancel: []
}>()

/** Espejo de `nuevaConsultaDraft.store`: el picker no persiste su borrador. */
function emptyPetDraft(): PetDraft {
  return {
    name: '',
    chipNumber: '',
    specieId: '',
    breedId: '',
    gender: '',
    colorId: '',
    bod: '',
    animalType: 'NONE',
    weight: '',
    weightType: 'KILOGRAMS',
    size: '',
    reproductiveState: '',
  }
}

const draft = ref<PetDraft>(emptyPetDraft())
const formRef = ref<{ validate: () => boolean } | null>(null)
const submitError = ref<string | null>(null)
const saving = ref(false)

async function save() {
  if (formRef.value && !formRef.value.validate()) {
    submitError.value = 'Revisa los campos marcados antes de continuar.'
    return
  }
  saving.value = true
  submitError.value = null
  try {
    const payload = buildCreateAnimalRequest(draft.value, props.ownerId)
    const created = await animalApi.create(payload)
    emit('created', created)
  } catch (e: unknown) {
    submitError.value = getProblemDetailMessage(
      e,
      'No se pudo registrar la mascota. Intenta nuevamente.',
    )
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div v-if="submitError" class="form-banner ds-flex-row" role="alert">
    <TriangleAlert :size="14" :stroke-width="1.7" />
    <span>{{ submitError }}</span>
  </div>
  <PetForm ref="formRef" v-model="draft" />
  <div class="form-actions ds-actions">
    <button type="button" class="ds-btn ds-btn--ghost" @click="emit('cancel')">Cancelar</button>
    <button type="button" class="ds-btn ds-btn--solid" :disabled="saving" @click="save">
      {{ saving ? 'Guardando…' : 'Crear y seleccionar' }}
    </button>
  </div>
</template>

<style scoped>
.form-banner {
  padding: 10px 12px;
  border-radius: 9px;
  font-size: 12.5px;
  background: var(--danger-150);
  border: 1px solid var(--danger-300);
  color: oklch(35% 0.15 25deg);
}

/* Único añadido sobre `.ds-actions`: estos dos botones respiran algo más. */
.form-actions {
  gap: 10px;
}
</style>
