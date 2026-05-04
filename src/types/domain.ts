export interface Country {
  id: string
  name: string
}

export interface State {
  id: string
  name: string
  country: Country
}

export interface City {
  id: string
  name: string
  state?: State
}

export interface Specie {
  id: string
  name: string
}

export interface Breed {
  id: string
  name: string
  specieId: string
}

export type Gender = 'MALE' | 'FEMALE'

export type WeightUnit = 'GRAMS' | 'POUNDS' | 'KILOGRAMS'

export type AnimalType = 'SERVICE' | 'SUPPORT' | 'NONE'

export type ReproductiveState = 'STERILIZED' | 'NO_STERILIZED' | 'UNKNOWN'

export interface Owner {
  id: string
  name: string
  document: string
  phone: string
  email: string
  address: string
  city: City | null
  pets: string[]
  createdAt?: string
}

export interface Animal {
  id: string
  code: string
  name: string
  specie: Specie
  breed: Breed
  gender: Gender
  bod: string
  color?: string
  weight: number
  weightType: WeightUnit
  size?: number
  animalType: AnimalType
  reproductiveState: ReproductiveState
  deceased: boolean
  ownerId: string
  lastVisit?: string
}

export interface ConsultationType {
  id: string
  name: string
}

export interface Consultation {
  id?: string
  code?: string
  date: string
  type: ConsultationType | null
  anamnesis: string
  diagnosis: string
  diagnosticPlan: string
  therapeuticPlan: string
  nextControlDate: string
  nextControlNotes: string
  ownerId: string
  animalId: string
  createdBy?: string
}
