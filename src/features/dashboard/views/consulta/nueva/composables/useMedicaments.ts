import { medicamentApi } from '../api/medicament.api'
import { createCatalog } from './useCatalog'

/**
 * Catálogo creable de medicamentos para el picker de la receta (plan terapéutico).
 * Lista los disponibles (globales + propios) y permite crear uno nuevo inline.
 */
export const useMedicaments = createCatalog({
  fetcher: () => medicamentApi.listAvailable(),
  creator: (data) => medicamentApi.create(data),
  errorMessage: 'No se pudieron cargar los medicamentos.',
})
