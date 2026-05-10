import { surgeryTypeApi } from '../api/surgeryType.api'
import { createCatalog } from './useCatalog'

export const useSurgeryTypes = createCatalog({
  fetcher: () => surgeryTypeApi.listAll(),
  creator: (data) => surgeryTypeApi.create(data),
  errorMessage: 'No se pudieron cargar los tipos de cirugía.',
})
