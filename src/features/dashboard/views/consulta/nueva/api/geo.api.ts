import type { CountryResponse, StateResponse, CityResponse } from '../types/geo.types'
import { http } from '@/services/http/http.client'

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
