import { http } from '@/services/http/http.client'

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

export const countryApi = {
  async listAll(): Promise<CountryResponse[]> {
    const { data } = await http.get<CountryResponse[]>('/countries')
    return data
  },
}

export const stateApi = {
  async listByCountry(countryId: number): Promise<StateResponse[]> {
    const { data } = await http.get<StateResponse[]>(`/countries/${countryId}/states`)
    return data
  },
}

export const cityApi = {
  async listByState(stateId: number): Promise<CityResponse[]> {
    const { data } = await http.get<CityResponse[]>(`/states/${stateId}/cities`)
    return data
  },
}
