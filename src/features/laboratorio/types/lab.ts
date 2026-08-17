import type { LaboratoryTestPriority, LaboratoryTestStatus } from '@/types/domain'

export interface LabSearchCriteria {
  statuses?: LaboratoryTestStatus[]
  animalId?: number | null
  testTypeId?: number | null
  prioridad?: LaboratoryTestPriority | null
  dateFrom?: string | null
  dateTo?: string | null
  page?: number // 0-based (lo que espera el backend)
  pageSize?: number
}

/** Columnas del tablero activo (Bandeja de muestras), en orden. */
export const BOARD_COLUMNS: { status: LaboratoryTestStatus; label: string }[] = [
  { status: 'PENDING_COLLECTION', label: 'Por recolectar' },
  { status: 'PENDING_PROCESSING', label: 'En cola' },
  { status: 'IN_PROGRESS', label: 'En proceso' },
  { status: 'PENDING_VALIDATION', label: 'Por validar' },
]

export const BOARD_STATUSES: LaboratoryTestStatus[] = BOARD_COLUMNS.map((c) => c.status)

/** Código legible derivado del id + año (el backend no persiste un code propio). */
export function labCode(id: number, isoDate: string): string {
  const year = isoDate?.slice(0, 4) || '----'
  return `M-${year}-${String(id).padStart(4, '0')}`
}
