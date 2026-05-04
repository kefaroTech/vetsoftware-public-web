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
  code: string
  specie: AnimalSpecieSummary
  breed: AnimalBreedSummary
  owner: AnimalOwnerSummary
  gender: Gender
  weightType: WeightUnit
  animalType: AnimalType
  reproductiveState: ReproductiveState
  color: AnimalColorSummary
  bod: string
  weight: number
  size: number | null
  deceased: boolean
  deceasedDate: string | null
  company: AnimalCompanySummary
  createdDate: string
}

export interface CreateAnimalRequest {
  name: string
  code: string
  specieId: number
  breedId: number
  ownerId: number
  gender: Gender
  weightType: WeightUnit
  animalType: AnimalType
  reproductiveState: ReproductiveState
  colorId: number
  bod: string | null
  weight: number
  size: number | null
  deceased: boolean
  deceasedDate: string | null
  companyId: number
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
}
