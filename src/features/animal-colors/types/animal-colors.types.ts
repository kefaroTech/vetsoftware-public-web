export interface AnimalColorSpecieSummary {
  id: number
  name: string
}

export interface AnimalColorResponse {
  id: number
  name: string
  specie: AnimalColorSpecieSummary
  createdDate: string
}
