import { spaTypeApi } from '../api/spaType.api'
import { createCatalog } from './useCatalog'

export const useSpaTypes = createCatalog({
  fetcher: () => spaTypeApi.listAll(),
  creator: (data) => spaTypeApi.create(data),
  errorMessage: 'No se pudieron cargar los tipos de spa.',
})
