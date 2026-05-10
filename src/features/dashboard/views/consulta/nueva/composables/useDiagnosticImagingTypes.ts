import { diagnosticImagingTypeApi } from '../api/diagnosticImagingType.api'
import { createCatalog } from './useCatalog'

export const useDiagnosticImagingTypes = createCatalog({
  fetcher: () => diagnosticImagingTypeApi.listAll(),
  creator: (data) => diagnosticImagingTypeApi.create(data),
  errorMessage: 'No se pudieron cargar los tipos de imagen diagnóstica.',
})
