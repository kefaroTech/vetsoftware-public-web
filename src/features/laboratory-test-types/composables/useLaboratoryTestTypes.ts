import { testTypeApi } from '../api/laboratory-test-types.api'
import { createCatalog } from '@/composables/useCatalog'

export const useTestTypes = createCatalog({
  fetcher: () => testTypeApi.listAll(),
  creator: (data) => testTypeApi.create(data),
  errorMessage: 'No se pudieron cargar los tipos de examen.',
})
