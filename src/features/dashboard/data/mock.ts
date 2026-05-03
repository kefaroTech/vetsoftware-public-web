export interface MockUser {
  firstName: string
  lastName: string
  role: string
  clinic: string
}

export interface MockPatient {
  name: string
  species: 'Canino' | 'Felino' | 'Otro'
  ageYears: number
  ownerName: string
}

export type ConsultationStatus = 'en_curso' | 'programada' | 'completada'

export interface MockConsultation {
  id: string
  patient: MockPatient
  reason: string
  dayLabel: string
  timeLabel: string
  status: ConsultationStatus
}

export interface MockDayStats {
  total: number
  inProgress: number
  pending: number
  completed: number
}

export const mockUser: MockUser = {
  firstName: 'Mariana',
  lastName: 'Rojas',
  role: 'Veterinaria',
  clinic: 'Clínica Norte',
}

export const mockDayStats: MockDayStats = {
  total: 8,
  inProgress: 1,
  pending: 5,
  completed: 2,
}

export const mockRecentConsultations: MockConsultation[] = [
  {
    id: 'c1',
    patient: { name: 'Luna', species: 'Felino', ageYears: 4, ownerName: 'Carla Mendoza' },
    reason: 'Control vacunación',
    dayLabel: 'Hoy',
    timeLabel: '09:30',
    status: 'en_curso',
  },
  {
    id: 'c2',
    patient: { name: 'Rocco', species: 'Canino', ageYears: 7, ownerName: 'Luis Paredes' },
    reason: 'Cojera pata trasera',
    dayLabel: 'Hoy',
    timeLabel: '11:00',
    status: 'programada',
  },
  {
    id: 'c3',
    patient: { name: 'Mishi', species: 'Felino', ageYears: 2, ownerName: 'Andrea Solís' },
    reason: 'Esterilización post-op',
    dayLabel: 'Ayer',
    timeLabel: '16:20',
    status: 'completada',
  },
  {
    id: 'c4',
    patient: { name: 'Toby', species: 'Canino', ageYears: 11, ownerName: 'Jorge Vargas' },
    reason: 'Chequeo geriátrico',
    dayLabel: 'Ayer',
    timeLabel: '14:00',
    status: 'completada',
  },
]
