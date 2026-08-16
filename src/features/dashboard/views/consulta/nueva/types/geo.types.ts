export interface CountryResponse {
  id: number
  name: string
  createdDate: string
}

export interface CountrySummary {
  id: number
  name: string
}

export interface StateSummary {
  id: number
  name: string
}

export interface StateResponse {
  id: number
  name: string
  country: CountrySummary
  createdDate: string
}

export interface CityResponse {
  id: number
  name: string
  state: StateSummary
  createdDate: string
}
