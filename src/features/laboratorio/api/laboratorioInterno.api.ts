import { http } from '@/services/http/http.client'
import { withBranchParam } from '@/features/branches/api/branchContext'
import { laboratoryTestApi } from '@/features/dashboard/views/consulta/nueva/api/laboratoryTest.api'
import type { LaboratoryTestResponse } from '@/features/dashboard/views/consulta/nueva/types/laboratoryTest.types'
import type { LabSearchCriteria, PageResponse } from '../types/lab'

/**
 * API del Laboratorio interno. Opera sobre los mismos LaboratoryTest del backend,
 * usando el endpoint paginado/scoped por empresa GET /laboratory-tests/search y el
 * cambio de estado PATCH /laboratory-tests/{id}/status.
 */
export const laboratorioInternoApi = {
  async search(criteria: LabSearchCriteria): Promise<PageResponse<LaboratoryTestResponse>> {
    const params: Record<string, string | number> = {
      page: criteria.page ?? 0,
      pageSize: criteria.pageSize ?? 20,
    }
    if (criteria.statuses && criteria.statuses.length > 0) {
      params.statuses = criteria.statuses.join(',')
    }
    if (criteria.animalId != null) params.animalId = criteria.animalId
    if (criteria.testTypeId != null) params.testTypeId = criteria.testTypeId
    if (criteria.prioridad) params.prioridad = criteria.prioridad
    if (criteria.dateFrom) params.dateFrom = criteria.dateFrom
    if (criteria.dateTo) params.dateTo = criteria.dateTo

    // Scoped por sede: se envía la sede seleccionada en el menú principal (contexto multi-sucursal).
    const { data } = await http.get<PageResponse<LaboratoryTestResponse>>(
      '/laboratory-tests/search',
      { params: withBranchParam(params) },
    )
    return data
  },

  // Transiciones de estado (reutiliza el cliente compartido).
  changeStatus: laboratoryTestApi.changeStatus,
}
