import { surgeryTypeApi } from '../api/surgery-types.api'
import { createCatalog } from '@/composables/useCatalog'

export const useSurgeryTypes = createCatalog({
  fetcher: () => surgeryTypeApi.listAll(),
  creator: (data) => surgeryTypeApi.create(data),
  errorMessage: 'No se pudieron cargar los tipos de cirugía.',
})
