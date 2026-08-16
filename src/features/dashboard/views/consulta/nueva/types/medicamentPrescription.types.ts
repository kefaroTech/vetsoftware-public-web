export interface CreateMedicamentPrescriptionPayload {
  medicamentId: number
  presentation: string
  quantity: number
  posology: string
  observation: string | null
  prescriptionId: number
}

export interface MedicamentPrescriptionResponse {
  id: number
  medicamentId: number
  name: string
  presentation: string
  quantity: number
  posology: string
  observation: string | null
  createdDate: string
}
