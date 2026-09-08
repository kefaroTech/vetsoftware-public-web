<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { PawPrint, Pencil, TriangleAlert } from 'lucide-vue-next'
import ModalShell from '@/components/ui/ModalShell.vue'
import PetForm from '@/features/dashboard/views/consulta/nueva/components/PetForm.vue'
import { animalApi } from '@/features/dashboard/views/consulta/nueva/api/animal.api'
import {
  buildCreateAnimalRequest,
  buildUpdateAnimalRequest,
  mapAnimalResponse,
} from '@/features/dashboard/views/consulta/nueva/api/animal.mapper'
import type { AnimalResponse } from '@/features/dashboard/views/consulta/nueva/types/animal.types'
import type { PetDraft } from '@/features/dashboard/views/consulta/nueva/composables/useNuevaConsultaDraft'
import { getProblemDetailMessage } from '@/services/http/http.client'
import { scrollToFirstError } from '@/composables/scrollToError'
import type { Animal } from '@/types/domain'

const props = defineProps<{
  open: boolean
  ownerId: string
  petId?: number | null
}>()

const emit = defineEmits<{
  close: []
  saved: [pet: Animal]
}>()

const isEditing = computed(() => props.petId != null)

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
const loadingPet = ref(false)
const loadError = ref<string | null>(null)
const submitError = ref<string | null>(null)
const saving = ref(false)

// La mascota cargada al abrir en edición: `PetForm` no edita `deceased`/`deceasedDate`, y hay
// que preservarlos tal cual en vez de dejar que `buildUpdateAnimalRequest` los resetee.
const loadedPet = ref<AnimalResponse | null>(null)

watch(
  () => [props.open, props.petId] as const,
  async ([open, petId]) => {
    if (!open) return
    submitError.value = null
    loadError.value = null
    loadedPet.value = null
    if (petId == null) {
      draft.value = emptyPetDraft()
      return
    }
    loadingPet.value = true
    draft.value = emptyPetDraft()
    try {
      const p = await animalApi.findById(petId)
      loadedPet.value = p
      draft.value = {
        name: p.name,
        chipNumber: p.code ?? '',
        specieId: String(p.specie.id),
        breedId: String(p.breed.id),
        gender: p.gender,
        colorId: String(p.color.id),
        bod: p.bod,
        animalType: p.animalType,
        weight: p.weight != null ? String(p.weight) : '',
        weightType: p.weightType,
        size: p.size != null ? String(p.size) : '',
        reproductiveState: p.reproductiveState,
      }
    } catch (e) {
      loadError.value = getProblemDetailMessage(e, 'No se pudo cargar la mascota.')
    } finally {
      loadingPet.value = false
    }
  },
  { immediate: true },
)

async function save() {
  if (saving.value || loadingPet.value) return
  if (formRef.value && !formRef.value.validate()) {
    submitError.value = 'Revisa los campos marcados antes de continuar.'
    void scrollToFirstError()
    return
  }
  saving.value = true
  submitError.value = null
  try {
    let result: AnimalResponse
    if (isEditing.value && props.petId != null && loadedPet.value) {
      const payload = buildUpdateAnimalRequest(draft.value, props.ownerId, {
        deceased: loadedPet.value.deceased,
        deceasedDate: loadedPet.value.deceasedDate,
      })
      result = await animalApi.update(props.petId, payload)
    } else {
      const payload = buildCreateAnimalRequest(draft.value, props.ownerId)
      result = await animalApi.create(payload)
    }
    emit('saved', mapAnimalResponse(result))
    emit('close')
  } catch (e: unknown) {
    submitError.value = getProblemDetailMessage(
      e,
      'No se pudo guardar la mascota. Intenta nuevamente.',
    )
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <ModalShell
    :open="open"
    :title="isEditing ? 'Editar mascota' : 'Nueva mascota'"
    :subtitle="
      isEditing ? 'Actualiza los datos de la mascota.' : 'Registra una mascota para este cliente.'
    "
    :icon="isEditing ? Pencil : PawPrint"
    accent="amatista"
    :width="680"
    @close="emit('close')"
  >
    <template #body>
      <div v-if="loadError" class="form-banner ds-flex-row" role="alert">
        <TriangleAlert :size="14" :stroke-width="1.7" />
        <span>{{ loadError }}</span>
      </div>
      <div v-else-if="loadingPet" class="loading-note">Cargando datos de la mascota…</div>
      <template v-else>
        <div v-if="submitError" class="form-banner ds-flex-row" role="alert">
          <TriangleAlert :size="14" :stroke-width="1.7" />
          <span>{{ submitError }}</span>
        </div>
        <PetForm ref="formRef" v-model="draft" />
      </template>
    </template>

    <template #footer-actions>
      <button type="button" class="ds-btn ds-btn--ghost" :disabled="saving" @click="emit('close')">
        Cancelar
      </button>
      <button
        type="button"
        class="ds-btn ds-btn--solid"
        :disabled="saving || loadingPet || !!loadError"
        @click="save"
      >
        {{ saving ? 'Guardando…' : isEditing ? 'Guardar cambios' : 'Crear mascota' }}
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
.form-banner {
  padding: 10px 12px;
  border-radius: 9px;
  font-size: 12.5px;
  background: var(--danger-150);
  border: 1px solid var(--danger-border);
  color: var(--danger-950);
  margin-bottom: 14px;
}

.loading-note {
  padding: 24px 0;
  text-align: center;
  color: var(--warm-500);
  font-size: 13px;
}
</style>
