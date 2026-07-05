import { onMounted, ref, watch, type Ref } from 'vue'
import { useAnimalsByOwnerStore } from '../stores/animalsByOwner.store'
import type { Animal } from '@/types/domain'

/**
 * Estado reactivo por-componente de las mascotas de un propietario. La caché
 * compartida vive en el store Pinia `animalsByOwner`.
 */
export function useAnimalsByOwner(ownerId: Ref<string>) {
  const store = useAnimalsByOwnerStore()
  const list = ref<Animal[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function refresh(id: string, force = false) {
    if (!id) {
      list.value = []
      error.value = null
      return
    }
    loading.value = true
    error.value = null
    try {
      list.value = await store.load(id, force)
    } catch {
      list.value = []
      error.value = 'No se pudieron cargar las mascotas del propietario.'
    } finally {
      loading.value = false
    }
  }

  function addPet(pet: Animal) {
    const ownerKey = pet.ownerId
    const next = [pet, ...(store.getCached(ownerKey) ?? [])]
    store.setCached(ownerKey, next)
    if (ownerKey === ownerId.value) list.value = next
  }

  function invalidate(id: string = ownerId.value) {
    store.invalidate(id)
  }

  // Al abrir la pantalla (montaje) o al cambiar de propietario, se recarga desde
  // el backend (force) para no mostrar mascotas cacheadas de una visita previa.
  onMounted(() => {
    if (ownerId.value) refresh(ownerId.value, true)
  })

  watch(ownerId, (id) => {
    refresh(id, true)
  })

  return { list, loading, error, refresh, addPet, invalidate }
}
