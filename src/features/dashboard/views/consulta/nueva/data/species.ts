import type { Specie, Breed } from '@/types/domain'

export const species: Specie[] = [
  { id: 'sp_dog', name: 'Canino' },
  { id: 'sp_cat', name: 'Felino' },
  { id: 'sp_rabbit', name: 'Conejo' },
  { id: 'sp_bird', name: 'Ave' },
  { id: 'sp_rodent', name: 'Roedor' },
  { id: 'sp_reptile', name: 'Reptil' },
  { id: 'sp_other', name: 'Otro' },
]

export const breeds: Breed[] = [
  { id: 'br_lab', name: 'Labrador retriever', specieId: 'sp_dog' },
  { id: 'br_gold', name: 'Golden retriever', specieId: 'sp_dog' },
  { id: 'br_bulldog', name: 'Bulldog', specieId: 'sp_dog' },
  { id: 'br_poodle', name: 'Poodle', specieId: 'sp_dog' },
  { id: 'br_chihuahua', name: 'Chihuahua', specieId: 'sp_dog' },
  { id: 'br_pastor', name: 'Pastor alemán', specieId: 'sp_dog' },
  { id: 'br_mestizo_dog', name: 'Mestizo', specieId: 'sp_dog' },

  { id: 'br_dom_short', name: 'Mestizo doméstico', specieId: 'sp_cat' },
  { id: 'br_persa', name: 'Persa', specieId: 'sp_cat' },
  { id: 'br_siames', name: 'Siamés', specieId: 'sp_cat' },
  { id: 'br_main', name: 'Maine Coon', specieId: 'sp_cat' },

  { id: 'br_holland', name: 'Holland Lop', specieId: 'sp_rabbit' },
  { id: 'br_rabbit_other', name: 'Otro', specieId: 'sp_rabbit' },

  { id: 'br_bird_canario', name: 'Canario', specieId: 'sp_bird' },
  { id: 'br_bird_periquito', name: 'Periquito', specieId: 'sp_bird' },
  { id: 'br_bird_other', name: 'Otro', specieId: 'sp_bird' },

  { id: 'br_hamster', name: 'Hámster', specieId: 'sp_rodent' },
  { id: 'br_cobaya', name: 'Cobaya', specieId: 'sp_rodent' },

  { id: 'br_iguana', name: 'Iguana', specieId: 'sp_reptile' },
  { id: 'br_tortuga', name: 'Tortuga', specieId: 'sp_reptile' },

  { id: 'br_other', name: 'Otro', specieId: 'sp_other' },
]
