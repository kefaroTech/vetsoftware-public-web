import type { Owner, Animal } from '@/types/domain'
import { cities } from './geo'
import { species, breeds } from './species'

function findRequired<T>(items: readonly T[], predicate: (item: T) => boolean, label: string): T {
  const item = items.find(predicate)
  if (!item) throw new Error(`Missing required mock fixture: ${label}`)
  return item
}

const lima = findRequired(cities, (c) => c.name === 'Lima' && c.state?.name === 'Lima', 'Lima')
const miraflores = findRequired(cities, (c) => c.name === 'Miraflores', 'Miraflores')
const stgo = findRequired(cities, (c) => c.name === 'Santiago', 'Santiago')

const cat = findRequired(species, (s) => s.id === 'sp_cat', 'cat species')
const dog = findRequired(species, (s) => s.id === 'sp_dog', 'dog species')

const mestizoCat = findRequired(breeds, (b) => b.id === 'br_dom_short', 'domestic shorthair breed')
const labrador = findRequired(breeds, (b) => b.id === 'br_lab', 'labrador breed')
const mestizoDog = findRequired(breeds, (b) => b.id === 'br_mestizo_dog', 'mixed dog breed')
const poodle = findRequired(breeds, (b) => b.id === 'br_poodle', 'poodle breed')
const persa = findRequired(breeds, (b) => b.id === 'br_persa', 'persian breed')

export const mockOwners: Owner[] = [
  {
    id: 'own_001',
    name: 'Carla Mendoza Ríos',
    document: 'DNI 45.231.908',
    phone: '+51 987 654 321',
    email: 'carla.mendoza@gmail.com',
    address: 'Av. Salaverry 2580, Dpto 502',
    city: lima,
    pets: ['ani_001', 'ani_002'],
    createdAt: '2024-03-12',
  },
  {
    id: 'own_002',
    name: 'Carla Vásquez Soto',
    document: 'DNI 41.118.220',
    phone: '+51 998 112 304',
    email: 'cvasquez@outlook.com',
    address: 'Calle Las Begonias 142',
    city: miraflores,
    pets: ['ani_003'],
    createdAt: '2023-09-04',
  },
  {
    id: 'own_003',
    name: 'Carlos Mendoza Paredes',
    document: 'DNI 47.882.011',
    phone: '+51 955 700 218',
    email: 'carlos.m@vetcorreo.com',
    address: 'Jr. Lampa 658',
    city: lima,
    pets: ['ani_004', 'ani_005', 'ani_006'],
    createdAt: '2022-11-22',
  },
  {
    id: 'own_004',
    name: 'Andrés Pizarro Vega',
    document: 'DNI 73.001.288',
    phone: '+51 922 451 077',
    email: 'andres.pizarro@gmail.com',
    address: 'Av. Brasil 1820',
    city: lima,
    pets: [],
    createdAt: '2026-04-28',
  },
  {
    id: 'own_005',
    name: 'María Fernanda Ruiz',
    document: 'DNI 50.412.755',
    phone: '+56 9 5544 7711',
    email: 'mfruiz@example.com',
    address: 'Av. Apoquindo 4500',
    city: stgo,
    pets: ['ani_007'],
    createdAt: '2024-07-18',
  },
  {
    id: 'own_006',
    name: 'Luis Paredes Quispe',
    document: 'DNI 42.665.301',
    phone: '+51 988 201 514',
    email: 'lparedes@correo.pe',
    address: 'Av. Javier Prado 1880',
    city: lima,
    pets: ['ani_008'],
    createdAt: '2023-02-14',
  },
]

export const mockAnimals: Animal[] = [
  {
    id: 'ani_001',
    code: 'VTR-0182',
    name: 'Luna',
    specie: cat,
    breed: mestizoCat,
    gender: 'FEMALE',
    bod: '2022-03-14',
    color: 'Atigrado gris',
    weight: 4.2,
    weightType: 'KILOGRAMS',
    size: 28,
    animalType: 'NONE',
    reproductiveState: 'STERILIZED',
    deceased: false,
    ownerId: 'own_001',
    lastVisit: 'Hace 2 meses',
  },
  {
    id: 'ani_002',
    code: 'VTR-0093',
    name: 'Rocco',
    specie: dog,
    breed: labrador,
    gender: 'MALE',
    bod: '2019-07-02',
    color: 'Dorado',
    weight: 32,
    weightType: 'KILOGRAMS',
    animalType: 'NONE',
    reproductiveState: 'NO_STERILIZED',
    deceased: false,
    ownerId: 'own_001',
    lastVisit: 'Hace 8 meses',
  },
  {
    id: 'ani_003',
    code: 'VTR-0211',
    name: 'Mishi',
    specie: cat,
    breed: persa,
    gender: 'FEMALE',
    bod: '2024-01-10',
    weight: 3.1,
    weightType: 'KILOGRAMS',
    animalType: 'NONE',
    reproductiveState: 'NO_STERILIZED',
    deceased: false,
    ownerId: 'own_002',
    lastVisit: 'Hace 3 semanas',
  },
  {
    id: 'ani_004',
    code: 'VTR-0044',
    name: 'Toby',
    specie: dog,
    breed: mestizoDog,
    gender: 'MALE',
    bod: '2014-05-20',
    weight: 18,
    weightType: 'KILOGRAMS',
    animalType: 'NONE',
    reproductiveState: 'STERILIZED',
    deceased: false,
    ownerId: 'own_003',
    lastVisit: 'Hace 1 mes',
  },
  {
    id: 'ani_005',
    code: 'VTR-0301',
    name: 'Kira',
    specie: dog,
    breed: poodle,
    gender: 'FEMALE',
    bod: '2021-11-30',
    weight: 6.5,
    weightType: 'KILOGRAMS',
    animalType: 'NONE',
    reproductiveState: 'STERILIZED',
    deceased: false,
    ownerId: 'own_003',
    lastVisit: 'Hace 5 meses',
  },
  {
    id: 'ani_006',
    code: 'VTR-0019',
    name: 'Lola',
    specie: dog,
    breed: mestizoDog,
    gender: 'FEMALE',
    bod: '2009-08-12',
    weight: 14,
    weightType: 'KILOGRAMS',
    animalType: 'NONE',
    reproductiveState: 'STERILIZED',
    deceased: true,
    ownerId: 'own_003',
    lastVisit: 'Hace 2 años',
  },
  {
    id: 'ani_007',
    code: 'VTR-0405',
    name: 'Coco',
    specie: dog,
    breed: poodle,
    gender: 'MALE',
    bod: '2020-04-04',
    weight: 5.4,
    weightType: 'KILOGRAMS',
    animalType: 'NONE',
    reproductiveState: 'NO_STERILIZED',
    deceased: false,
    ownerId: 'own_005',
    lastVisit: 'Hace 6 meses',
  },
  {
    id: 'ani_008',
    code: 'VTR-0508',
    name: 'Maxi',
    specie: dog,
    breed: labrador,
    gender: 'MALE',
    bod: '2018-09-16',
    weight: 28,
    weightType: 'KILOGRAMS',
    animalType: 'NONE',
    reproductiveState: 'STERILIZED',
    deceased: false,
    ownerId: 'own_006',
    lastVisit: 'Hace 4 meses',
  },
]

export function searchOwners(query: string, limit = 8): Owner[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return mockOwners
    .filter((o) => [o.name, o.document, o.phone, o.email].some((f) => f.toLowerCase().includes(q)))
    .slice(0, limit)
}

export function petsForOwner(ownerId: string): Animal[] {
  return mockAnimals.filter((a) => a.ownerId === ownerId)
}
