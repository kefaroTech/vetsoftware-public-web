import { diagnosticImagingTypeApi } from '../api/diagnostic-imaging-types.api'
import { createCatalog } from '@/composables/useCatalog'

export const useDiagnosticImagingTypes = createCatalog({
  fetcher: () => diagnosticImagingTypeApi.listAll(),
  creator: (data) => diagnosticImagingTypeApi.create(data),
  errorMessage: 'No se pudieron cargar los tipos de imagen diagnóstica.',
})
