export type EmployeeStatus = 'ACTIVE' | 'INACTIVE'

export interface EmployeeRole {
  employeeRoleId: number
  id: number
  name: string
  code: string
}

export interface Employee {
  id: number
  employeeCode: string
  name: string
  email: string
  enabled: boolean
  companyId: number
  createdDate: string
  roles: EmployeeRole[]
  initials: string
}

export interface Country {
  id: string
  name: string
}

export interface State {
  id: string
  name: string
  country: Country
}

export interface City {
  id: string
  name: string
  state?: State
}

export interface Specie {
  id: string
  name: string
}

export interface Breed {
  id: string
  name: string
  specieId: string
}

export type Gender = 'MALE' | 'FEMALE'

export type WeightUnit = 'GRAMS' | 'POUNDS' | 'KILOGRAMS'

export type AnimalType = 'SERVICE' | 'SUPPORT' | 'NONE'

export type ReproductiveState = 'STERILIZED' | 'NO_STERILIZED' | 'UNKNOWN'

export interface Owner {
  id: string
  name: string
  document: string
  phone: string
  email: string
  address: string
  city: City | null
  pets: string[]
  createdAt?: string
}

export interface Animal {
  id: string
  code: string
  name: string
  specie: Specie
  breed: Breed
  gender: Gender
  bod: string
  color?: string
  weight: number
  weightType: WeightUnit
  size?: number
  animalType: AnimalType
  reproductiveState: ReproductiveState
  deceased: boolean
  ownerId: string
  lastVisit?: string
}

export interface ConsultationType {
  id: string
  name: string
}

export interface Consultation {
  id?: string
  code?: string
  date: string
  type: ConsultationType | null
  anamnesis: string
  diagnosis: string
  diagnosticPlan: string
  therapeuticPlan: string
  nextControlDate: string
  nextControlNotes: string
  ownerId: string
  animalId: string
  createdBy?: string
}

// ─── Items vinculados a la consulta ────────────────────────────────

export type HospitalizationType = 'OUTPATIENT' | 'HOSPITALIZATION'
export type ReasonLeaving =
  | 'MEDICAL_DISCHARGE'
  | 'HOME_TREATMENT'
  | 'TRANSFER'
  | 'TUTOR_WISH'
  | 'ADMIN'
  | 'DEATH'
  | 'EUTHANASIA'
export type DewormingType = 'INTERNAL' | 'EXTERNAL' | 'MIX' | 'OTHER'

export interface MedicamentPrescription {
  name: string
  presentation: string
  quantity: number
  posology: string
}

export interface Prescription {
  date: string
  diagnosis: string
  observations: string
  medicaments: MedicamentPrescription[]
}

// Espejo de com.vetsoftware.app.laboratorytest.domain.LaboratoryTestStatus
export type LaboratoryTestStatus =
  | 'PENDING_COLLECTION'
  | 'PENDING_PROCESSING'
  | 'IN_PROGRESS'
  | 'PENDING_VALIDATION'
  | 'COMPLETED'
  | 'CANCELLED'

// Espejo de com.vetsoftware.app.laboratorytest.domain.LaboratoryTestPriority
export type LaboratoryTestPriority = 'NORMAL' | 'URGENTE'

export interface LaboratoryTest {
  date: string
  testTypeId: string
  quantity: number
  diagnosis: string
  status: LaboratoryTestStatus
}

export interface DiagnosticImaging {
  date: string
  diagnosticImagingTypeId: string
  studyType: string
  clinicalSigns: string
  diagnosis: string
  observations: string
}

export interface Vaccination {
  date: string
  vaccinationTypeId: string
  lot: string
  notes: string
  nextVaccination: string
}

export interface Hospitalization {
  date: string
  startDate: string
  endDate: string
  type: HospitalizationType
  reasonLeaving: ReasonLeaving | ''
  reason: string
  observations: string
}

export interface Deworming {
  date: string
  lastDeworming: string
  type: DewormingType
  product: string
  dosage: string
  nextControl: string
  observations: string
}

export interface Surgery {
  date: string
  surgeryTypeId: string
  description: string
  medicament: string
  observations: string
  complications: string
}

// Catálogos creables inline
export interface TestType {
  id: string
  name: string
  description?: string
}
export interface DiagnosticImagingType {
  id: string
  name: string
  description?: string
}
export interface VaccinationType {
  id: string
  name: string
  description?: string
}
export interface SurgeryType {
  id: string
  name: string
  description?: string
}
export interface SpaType {
  id: string
  name: string
  description?: string
}

// Spa es una acción standalone (no vinculada a Consultation)
export interface Spa {
  date: string
  spaTypeId: string
  reason: string
  details: string
  observations: string
}
