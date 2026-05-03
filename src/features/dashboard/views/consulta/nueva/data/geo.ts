import type { Country, State, City } from '@/types/domain'

export const countries: Country[] = [
  { id: '1', name: 'Perú' },
  { id: '2', name: 'Chile' },
  { id: '3', name: 'Colombia' },
  { id: '4', name: 'México' },
  { id: '5', name: 'Argentina' },
]

export const states: State[] = [
  { id: '11', name: 'Lima', country: countries[0] },
  { id: '12', name: 'Arequipa', country: countries[0] },
  { id: '13', name: 'Cusco', country: countries[0] },
  { id: '14', name: 'Piura', country: countries[0] },
  { id: '21', name: 'Región Metropolitana', country: countries[1] },
  { id: '22', name: 'Valparaíso', country: countries[1] },
  { id: '31', name: 'Bogotá D.C.', country: countries[2] },
  { id: '32', name: 'Antioquia', country: countries[2] },
  { id: '41', name: 'Ciudad de México', country: countries[3] },
  { id: '42', name: 'Jalisco', country: countries[3] },
  { id: '51', name: 'Buenos Aires (CABA)', country: countries[4] },
  { id: '52', name: 'Córdoba', country: countries[4] },
]

export const cities: City[] = [
  { id: '101', name: 'Lima', state: states[0] },
  { id: '102', name: 'Callao', state: states[0] },
  { id: '103', name: 'Miraflores', state: states[0] },
  { id: '104', name: 'Arequipa', state: states[1] },
  { id: '105', name: 'Cusco', state: states[2] },
  { id: '106', name: 'Piura', state: states[3] },
  { id: '107', name: 'Santiago', state: states[4] },
  { id: '108', name: 'Valparaíso', state: states[5] },
  { id: '109', name: 'Bogotá', state: states[6] },
  { id: '110', name: 'Medellín', state: states[7] },
  { id: '111', name: 'Ciudad de México', state: states[8] },
  { id: '112', name: 'Guadalajara', state: states[9] },
  { id: '113', name: 'CABA', state: states[10] },
  { id: '114', name: 'Córdoba', state: states[11] },
]
