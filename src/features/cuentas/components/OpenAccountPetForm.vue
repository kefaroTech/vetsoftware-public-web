<script setup lang="ts">
import { ref } from 'vue'
import { PawPrint } from 'lucide-vue-next'
import PetForm from '@/features/dashboard/views/consulta/nueva/components/PetForm.vue'
import { animalApi } from '@/features/dashboard/views/consulta/nueva/api/animal.api'
import { buildCreateAnimalRequest } from '@/features/dashboard/views/consulta/nueva/api/animal.mapper'
import { getProblemDetailMessage } from '@/services/http/http.client'
import { useToast } from '@/composables/useToast'
import type { PetDraft } from '@/features/dashboard/views/consulta/nueva/stores/nuevaConsultaDraft.store'

/**
 * Alta de mascota dentro de `OpenAccountModal`, para el caso en que el
 * propietario elegido todavía no la tiene registrada.
 *
 * El padre lo monta con `v-if`, así que el borrador arranca limpio en cada
 * apertura sin necesidad de resetearlo desde fuera.
 */
const props = defineProps<{ ownerId: number }>()
const emit = defineEmits<{ created: [pet: { id: number; name: string }]; cancel: [] }>()

const toast = useToast()

function defaultPetDraft(): PetDraft {
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

const petDraft = ref<PetDraft>(defaultPetDraft())
const petFormRef = ref<{ validate: () => boolean } | null>(null)
const busy = ref(false)
const error = ref<string | null>(null)

async function submit() {
  if (busy.value) return
  if (petFormRef.value && !petFormRef.value.validate()) {
    error.value = 'Revisa los campos marcados antes de continuar.'
    return
  }
  busy.value = true
  error.value = null
  try {
    const payload = buildCreateAnimalRequest(petDraft.value, String(props.ownerId))
    const created = await animalApi.create(payload)
    toast.success('Mascota registrada', `${created.name} quedó registrada y seleccionada.`)
    emit('created', { id: created.id, name: created.name })
  } catch (e) {
    error.value = getProblemDetailMessage(e, 'No se pudo registrar la mascota. Intenta nuevamente.')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="ds-stack ds-stack--14">
    <PetForm ref="petFormRef" :model-value="petDraft" />
    <p v-if="error" class="pet-err">{{ error }}</p>
    <div class="petcreate-actions">
      <button type="button" class="ds-btn ds-btn--ghost ds-btn--lg" @click="emit('cancel')">
        Cancelar
      </button>
      <button
        type="button"
        class="ds-btn ds-btn--primary ds-btn--lg"
        :disabled="busy"
        @click="submit"
      >
        <PawPrint :size="15" :stroke-width="1.9" />
        {{ busy ? 'Registrando…' : 'Registrar mascota' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Layout via primitivas: `.ds-stack--14` y `.ds-btn`. */
.petcreate-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 4px;
}
.pet-err {
  margin: 0;
  padding: 10px 12px;
  border-radius: 9px;
  font-size: 12.5px;
  background: var(--danger-100);
  border: 1px solid var(--danger-300);
  color: oklch(48% 0.16 25deg);
}
</style>
