import { onMounted, ref, watch, type Ref } from 'vue'
import { animalApi } from '../api/animal.api'
import { mapAnimalResponse } from '../api/animal.mapper'
import type { Animal } from '@/types/domain'

const cache = new Map<string, Animal[]>()
const inFlight = new Map<string, Promise<Animal[]>>()

async function load(ownerId: string): Promise<Animal[]> {
  const cached = cache.get(ownerId)
  if (cached) return cached
  const pending = inFlight.get(ownerId)
  if (pending) return pending
  const id = Number(ownerId)
  if (!Number.isFinite(id)) return []
  const promise = animalApi
    .listByOwner(id)
    .then((list) => list.map(mapAnimalResponse))
    .then((animals) => {
      cache.set(ownerId, animals)
      inFlight.delete(ownerId)
      return animals
    })
    .catch((e) => {
      inFlight.delete(ownerId)
      throw e
    })
  inFlight.set(ownerId, promise)
  return promise
}

export function useAnimalsByOwner(ownerId: Ref<string>) {
  const list = ref<Animal[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function refresh(id: string) {
    if (!id) {
      list.value = []
      error.value = null
      return
    }
    loading.value = true
    error.value = null
    try {
      list.value = await load(id)
    } catch {
      list.value = []
      error.value = 'No se pudieron cargar las mascotas del propietario.'
    } finally {
      loading.value = false
    }
  }

  function addPet(pet: Animal) {
    const ownerKey = pet.ownerId
    const next = [pet, ...(cache.get(ownerKey) ?? [])]
    cache.set(ownerKey, next)
    if (ownerKey === ownerId.value) list.value = next
  }

  function invalidate(id: string = ownerId.value) {
    cache.delete(id)
  }

  onMounted(() => {
    if (ownerId.value) refresh(ownerId.value)
  })

  watch(ownerId, (id) => {
    refresh(id)
  })

  return { list, loading, error, refresh, addPet, invalidate }
}
