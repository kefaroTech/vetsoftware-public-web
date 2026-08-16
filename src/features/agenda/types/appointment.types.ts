import type { AppointmentStatus } from '../types/appointment'

export interface AppointmentListParams {
  from?: string // yyyy-MM-dd (inclusive)
  to?: string // yyyy-MM-dd (inclusive)
  employeeId?: number
  status?: AppointmentStatus
}
