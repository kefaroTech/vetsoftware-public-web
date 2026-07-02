import type { Animal } from '@/types/domain'
import type { AnimalResponse, CreateAnimalRequest } from './animal.api'
import type { PetDraft } from '../composables/useNuevaConsultaDraft'

export function mapAnimalResponse(r: AnimalResponse): Animal {
  return {
    id: String(r.id),
    code: r.code,
    name: r.name,
    specie: { id: String(r.specie.id), name: r.specie.name },
    breed: {
      id: String(r.breed.id),
      name: r.breed.name,
      specieId: String(r.specie.id),
    },
    gender: r.gender,
    bod: r.bod,
    color: r.color?.name,
    weight: r.weight,
    weightMeasuredAt: r.weightMeasuredAt,
    weightType: r.weightType,
    size: r.size ?? undefined,
    animalType: r.animalType,
    reproductiveState: r.reproductiveState,
    deceased: r.deceased,
    ownerId: String(r.owner.id),
  }
}

export function buildCreateAnimalRequest(
  p: PetDraft,
  ownerId: string,
  companyId: number,
): CreateAnimalRequest {
  if (!p.gender || !p.reproductiveState) {
    throw new Error('Pet draft is incomplete')
  }
  const code = p.chipNumber.trim() || `VTR-${String(Date.now()).slice(-6)}`
  // El backend ahora almacena el peso como decimal (BigDecimal) → no redondeamos; conserva la
  // precisión clínica. Se registra como primer punto del historial de peso del animal.
  const weightNum = p.weight.trim() ? Number(p.weight.replace(',', '.')) : null
  const sizeNum = p.size.trim()
    ? Math.round(Number(p.size.replace(',', '.')))
    : null
  return {
    name: p.name.trim(),
    code,
    specieId: Number(p.specieId),
    breedId: Number(p.breedId),
    ownerId: Number(ownerId),
    gender: p.gender,
    weightType: p.weightType,
    animalType: p.animalType,
    reproductiveState: p.reproductiveState,
    colorId: Number(p.colorId),
    bod: p.bod || null,
    weight: weightNum,
    size: sizeNum,
    deceased: false,
    deceasedDate: null,
    companyId,
  }
}
