import { http } from '@/services/http/http.client'
import type {
  AppointmentResponse,
  AppointmentStatus,
  CancelAppointmentRequest,
  ChangeStatusRequest,
  CreateAppointmentRequest,
  RescheduleAppointmentRequest,
  UpdateAppointmentRequest,
} from '../types/appointment'

export interface AppointmentListParams {
  from?: string // yyyy-MM-dd (inclusive)
  to?: string // yyyy-MM-dd (inclusive)
  employeeId?: number
  status?: AppointmentStatus
}

function buildQuery(params: AppointmentListParams): Record<string, string> {
  const q: Record<string, string> = {}
  if (params.from) q.from = params.from
  if (params.to) q.to = params.to
  if (params.employeeId != null) q.employeeId = String(params.employeeId)
  if (params.status) q.status = params.status
  return q
}

export const appointmentApi = {
  async list(params: AppointmentListParams = {}): Promise<AppointmentResponse[]> {
    const { data } = await http.get<AppointmentResponse[]>('/appointments', {
      params: buildQuery(params),
    })
    return data
  },

  async findById(id: number): Promise<AppointmentResponse> {
    const { data } = await http.get<AppointmentResponse>(`/appointments/${id}`)
    return data
  },

  async create(payload: CreateAppointmentRequest): Promise<AppointmentResponse> {
    const { data } = await http.post<AppointmentResponse>('/appointments', payload)
    return data
  },

  async update(id: number, payload: UpdateAppointmentRequest): Promise<AppointmentResponse> {
    const { data } = await http.put<AppointmentResponse>(`/appointments/${id}`, payload)
    return data
  },

  async reschedule(
    id: number,
    payload: RescheduleAppointmentRequest,
  ): Promise<AppointmentResponse> {
    const { data } = await http.patch<AppointmentResponse>(
      `/appointments/${id}/reschedule`,
      payload,
    )
    return data
  },

  async changeStatus(id: number, payload: ChangeStatusRequest): Promise<AppointmentResponse> {
    const { data } = await http.patch<AppointmentResponse>(
      `/appointments/${id}/status`,
      payload,
    )
    return data
  },

  async cancel(id: number, payload: CancelAppointmentRequest): Promise<AppointmentResponse> {
    const { data } = await http.patch<AppointmentResponse>(
      `/appointments/${id}/cancel`,
      payload,
    )
    return data
  },

  async remove(id: number): Promise<void> {
    await http.delete(`/appointments/${id}`)
  },
}
