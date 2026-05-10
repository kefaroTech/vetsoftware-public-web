import { vaccinationTypeApi } from '../api/vaccinationType.api'
import { createCatalog } from './useCatalog'

export const useVaccinationTypes = createCatalog({
  fetcher: () => vaccinationTypeApi.listAll(),
  creator: (data) => vaccinationTypeApi.create(data),
  errorMessage: 'No se pudieron cargar los tipos de vacuna.',
})
