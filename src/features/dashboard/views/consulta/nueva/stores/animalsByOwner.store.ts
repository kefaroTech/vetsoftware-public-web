import { defineStore } from 'pinia'
import { animalApi } from '../api/animal.api'
import { mapAnimalResponse } from '../api/animal.mapper'
import type { Animal } from '@/types/domain'

/**
 * Cache global de mascotas por propietario. La caché vive en el store (singleton
 * Pinia); la reactividad por-componente la maneja el composable useAnimalsByOwner.
 */
export const useAnimalsByOwnerStore = defineStore('animalsByOwner', () => {
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

  function getCached(ownerId: string): Animal[] | undefined {
    return cache.get(ownerId)
  }
  function setCached(ownerId: string, animals: Animal[]): void {
    cache.set(ownerId, animals)
  }
  function invalidate(ownerId: string): void {
    cache.delete(ownerId)
  }

  return { load, getCached, setCached, invalidate }
})
