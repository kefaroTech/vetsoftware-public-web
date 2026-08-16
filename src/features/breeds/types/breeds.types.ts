export interface BreedSpecieSummary {
  id: number
  name: string
}

export interface BreedResponse {
  id: number
  name: string
  specie: BreedSpecieSummary
  createdDate: string
}
