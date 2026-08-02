import { http } from '@/services/http/http.client'
import type {
  AnimalType,
  Gender,
  ReproductiveState,
  WeightUnit,
} from '@/types/domain'

export interface AnimalSpecieSummary {
  id: number
  name: string
}
export interface AnimalBreedSummary {
  id: number
  name: string
}
export interface AnimalOwnerSummary {
  id: number
  name: string
  document: string
}
export interface AnimalColorSummary {
  id: number
  name: string
}
export interface AnimalCompanySummary {
  id: number
  name: string
  identifier: string
}

export interface AnimalResponse {
  id: number
  name: string
  code: string | null
  specie: AnimalSpecieSummary
  breed: AnimalBreedSummary
  owner: AnimalOwnerSummary
  gender: Gender
  weightType: WeightUnit
  animalType: AnimalType
  reproductiveState: ReproductiveState
  color: AnimalColorSummary
  bod: string
  // Peso ACTUAL derivado del último registro de peso (null si el animal aún no tiene registros).
  // La serie completa se consulta vía weightRecordApi. weightType es la unidad de ese último registro.
  weight: number | null
  weightMeasuredAt: string | null
  size: number | null
  deceased: boolean
  deceasedDate: string | null
  company: AnimalCompanySummary
  createdDate: string
}

export interface CreateAnimalRequest {
  name: string
  code: string | null
  specieId: number
  breedId: number
  ownerId: number
  gender: Gender
  weightType: WeightUnit
  animalType: AnimalType
  reproductiveState: ReproductiveState
  colorId: number
  bod: string | null
  // Peso inicial opcional: si viene, el backend lo registra como primer punto del historial de peso
  // (en la unidad weightType). El peso posterior se gestiona vía weightRecordApi.
  weight: number | null
  size: number | null
  deceased: boolean
  deceasedDate: string | null
}

export type UpdateAnimalRequest = CreateAnimalRequest

export const animalApi = {
  async create(payload: CreateAnimalRequest): Promise<AnimalResponse> {
    const { data } = await http.post<AnimalResponse>('/animals', payload)
    return data
  },

  async findById(id: number): Promise<AnimalResponse> {
    const { data } = await http.get<AnimalResponse>(`/animals/${id}`)
    return data
  },

  async listByOwner(ownerId: number): Promise<AnimalResponse[]> {
    const { data } = await http.get<AnimalResponse[]>(
      `/animals/by-owner/${ownerId}`,
    )
    return data
  },
}
