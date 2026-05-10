import { testTypeApi } from '../api/testType.api'
import { createCatalog } from './useCatalog'

export const useTestTypes = createCatalog({
  fetcher: () => testTypeApi.listAll(),
  creator: (data) => testTypeApi.create(data),
  errorMessage: 'No se pudieron cargar los tipos de examen.',
})
