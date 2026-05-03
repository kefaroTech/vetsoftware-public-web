import { http } from '@/services/http/http.client'
import type { City, Country, State } from '../types'

export const locationsApi = {
  async listCountries(): Promise<Country[]> {
    const { data } = await http.get<Country[]>('/countries')
    return data
  },

  async listStatesByCountry(countryId: number): Promise<State[]> {
    const { data } = await http.get<State[]>(`/countries/${countryId}/states`)
    return data
  },

  async listCitiesByState(stateId: number): Promise<City[]> {
    const { data } = await http.get<City[]>(`/states/${stateId}/cities`)
    return data
  },
}
