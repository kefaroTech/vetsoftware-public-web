import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { useAnimalsByOwner } from '@/features/dashboard/views/consulta/nueva/composables/useAnimalsByOwner'
import type { AnimalResponse } from '@/features/dashboard/views/consulta/nueva/types/animal.types'
import type { Animal } from '@/types/domain'

/**
 * `updatePet` y `removePet`: mismo criterio de caché que
 * `addPet` — mutan el store compartido y solo tocan `list` si el propietario activo es el dueño
 * de la mascota afectada.
 */

const listByOwner = vi.fn()

vi.mock('@/features/dashboard/views/consulta/nueva/api/animal.api', () => ({
  animalApi: {
    listByOwner: (...args: unknown[]) => listByOwner(...args),
  },
}))

function animalResponse(over: Partial<AnimalResponse> = {}): AnimalResponse {
  return {
    id: 1,
    name: 'Firulais',
    code: null,
    specie: { id: 1, name: 'Perro' },
    breed: { id: 1, name: 'Criollo' },
    owner: { id: 9, name: 'Ana Restrepo', document: '123456' },
    gender: 'MALE',
    weightType: 'KILOGRAMS',
    animalType: 'NONE',
    reproductiveState: 'STERILIZED',
    color: { id: 1, name: 'Negro' },
    bod: '2022-01-01',
    weight: 12,
    weightMeasuredAt: '2026-01-01',
    size: 40,
    deceased: false,
    deceasedDate: null,
    company: { id: 1, name: 'Clínica', identifier: '900123' },
    createdDate: '2026-01-01T00:00:00',
    enabled: true,
    ...over,
  }
}

function pet(over: Partial<Animal> = {}): Animal {
  return {
    id: '1',
    code: null,
    name: 'Firulais',
    specie: { id: '1', name: 'Perro' },
    breed: { id: '1', name: 'Criollo', specieId: '1' },
    gender: 'MALE',
    bod: '2022-01-01',
    weight: 12,
    weightType: 'KILOGRAMS',
    animalType: 'NONE',
    reproductiveState: 'STERILIZED',
    deceased: false,
    enabled: true,
    ownerId: '9',
    ...over,
  }
}

/** Host mínimo: el composable usa `onMounted`, así que necesita un componente real. */
function montar(ownerId: string) {
  let api: ReturnType<typeof useAnimalsByOwner> | null = null
  const Host = defineComponent({
    setup() {
      api = useAnimalsByOwner(ref(ownerId))
      return () => h('div')
    },
  })
  const wrapper = mount(Host)
  return {
    wrapper,
    api: () => {
      if (!api) throw new Error('useAnimalsByOwner no se inicializó')
      return api
    },
  }
}

describe('useAnimalsByOwner — updatePet', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reemplaza la mascota editada sin alterar las demás', async () => {
    listByOwner.mockResolvedValueOnce([
      animalResponse({ id: 1, name: 'Firulais' }),
      animalResponse({ id: 2, name: 'Michi' }),
    ])
    const { api } = montar('9')
    await flushPromises()

    api().updatePet(pet({ id: '1', name: 'Firulais Editado' }))

    expect(api().list.value.map((p) => p.name)).toEqual(['Firulais Editado', 'Michi'])
  })

  it('una edición de otro propietario no toca la lista activa', async () => {
    listByOwner.mockResolvedValueOnce([animalResponse({ id: 1, name: 'Firulais' })])
    const { api } = montar('9')
    await flushPromises()

    api().updatePet(pet({ id: '1', name: 'Otro dueño', ownerId: '99' }))

    expect(api().list.value.map((p) => p.name)).toEqual(['Firulais'])
  })
})

describe('useAnimalsByOwner — removePet', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('quita la mascota eliminada sin alterar las demás', async () => {
    listByOwner.mockResolvedValueOnce([
      animalResponse({ id: 1, name: 'Firulais' }),
      animalResponse({ id: 2, name: 'Michi' }),
    ])
    const { api } = montar('9')
    await flushPromises()

    api().removePet(pet({ id: '1', name: 'Firulais' }))

    expect(api().list.value.map((p) => p.name)).toEqual(['Michi'])
  })

  it('un borrado de otro propietario no toca la lista activa', async () => {
    listByOwner.mockResolvedValueOnce([animalResponse({ id: 1, name: 'Firulais' })])
    const { api } = montar('9')
    await flushPromises()

    api().removePet(pet({ id: '1', name: 'Firulais', ownerId: '99' }))

    expect(api().list.value.map((p) => p.name)).toEqual(['Firulais'])
  })
})
