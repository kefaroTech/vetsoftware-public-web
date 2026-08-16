import { vaccinationTypeApi } from '../api/vaccination-types.api'
import { createCatalog } from '@/composables/useCatalog'

export const useVaccinationTypes = createCatalog({
  fetcher: () => vaccinationTypeApi.listAll(),
  creator: (data) => vaccinationTypeApi.create(data),
  errorMessage: 'No se pudieron cargar los tipos de vacuna.',
})
