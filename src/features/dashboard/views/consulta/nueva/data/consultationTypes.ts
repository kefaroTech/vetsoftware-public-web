import type { ConsultationType } from '@/types/domain'

export const consultationTypes: ConsultationType[] = [
  { id: 'ct_routine', name: 'Control de rutina' },
  { id: 'ct_emerg', name: 'Emergencia' },
  { id: 'ct_followup', name: 'Seguimiento' },
  { id: 'ct_vacc', name: 'Vacunación' },
  { id: 'ct_pre_op', name: 'Prequirúrgica' },
  { id: 'ct_post_op', name: 'Postquirúrgica' },
  { id: 'ct_dental', name: 'Odontología' },
  { id: 'ct_derma', name: 'Dermatología' },
]
