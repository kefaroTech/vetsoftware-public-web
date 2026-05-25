import { http } from '@/services/http/http.client'
import type {
  ClinicalEventResponse,
  ClinicalEventType,
} from '@/features/historia-clinica/types/historia'

export interface AgendaListParams {
  from?: string // ISO yyyy-MM-dd
  to?: string // ISO yyyy-MM-dd
  types?: ClinicalEventType[]
}

function buildQuery(params: AgendaListParams): Record<string, string> {
  const q: Record<string, string> = {}
  if (params.from) q.from = params.from
  if (params.to) q.to = params.to
  if (params.types && params.types.length > 0) q.types = params.types.join(',')
  return q
}

export const agendaApi = {
  async listInRange(params: AgendaListParams = {}): Promise<ClinicalEventResponse[]> {
    const { data } = await http.get<ClinicalEventResponse[]>('/clinical-history', {
      params: buildQuery(params),
    })
    return data
  },
}
