export type EmployeeStatus = 'ACTIVE' | 'INACTIVE'

// Estado del ciclo de invitación (ortogonal a enabled y a mustChangePassword): INVITED = creado por un
// admin y aún no ha iniciado sesión; ACTIVE = ya inició sesión (o es el dueño auto-registrado).
export type EmployeeInvitationStatus = 'INVITED' | 'ACTIVE'

export interface EmployeeRole {
  employeeRoleId: number
  id: number
  name: string
  code: string
}

// Sede (sucursal) a la que pertenece un empleado, tal como llega en el listado/detalle.
export interface EmployeeBranch {
  id: number
  name: string
}

export interface Employee {
  id: number
  employeeCode: string
  name: string
  email: string
  enabled: boolean
  // true = debe cambiar la contraseña temporal en el primer login (se limpia al cambiarla).
  mustChangePassword: boolean
  // Estado de la invitación: pasa a ACTIVE en el primer login del empleado.
  status: EmployeeInvitationStatus
  companyId: number
  createdDate: string
  roles: EmployeeRole[]
  branches: EmployeeBranch[]
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
  code: string | null
  name: string
  specie: Specie
  breed: Breed
  gender: Gender
  bod: string
  color?: string
  // Peso actual derivado del último registro de peso (null si aún no hay registros).
  weight: number | null
  weightMeasuredAt?: string | null
  weightType: WeightUnit
  size?: number
  animalType: AnimalType
  reproductiveState: ReproductiveState
  // Hecho clínico: el animal murió. No es una baja lógica — su historia sigue viva.
  deceased: boolean
  // Baja lógica (soft-delete) del backend: `false` = dado de baja, no es un paciente
  // activo. Mismo criterio que `Employee.enabled` y que el resto de entidades del
  // tenant (productos/servicios «pausados», roles, hospitalizaciones).
  enabled: boolean
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

// ─── Hospitalización: plan de tratamiento (sala de internados) ─────────
// Espejo de los enums Java en
// com.vetsoftware.app.hospitalizationmedication.domain.* (idénticos en
// hospitalizationprocedure.domain.*). Se envían como identificador al backend.
export type MedicationFrequency =
  'CONTINUOUS' | 'EVERY_4H' | 'EVERY_6H' | 'EVERY_8H' | 'EVERY_12H' | 'EVERY_24H' | 'SINGLE'
// FIJO | INTERVALO — define cómo se recalculan las tomas tardías
export type GuidelineType = 'FIXED' | 'INTERVAL'
// DIAS | TOMAS | INDEF
export type DurationMeasure = 'DAYS' | 'DOSES' | 'INDEFINITE'

export interface MedicamentPrescription {
  // Referencia al catálogo de medicamentos (FK). `name` es el snapshot para mostrar.
  medicamentId: number
  name: string
  presentation: string
  quantity: number
  posology: string
  // Observación por medicamento (opcional).
  observation?: string
}

export interface Prescription {
  date: string
  // El diagnóstico ya no se captura en la receta: es el de la consulta a la que pertenece.
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
  // Sede de la muestra (multi-sucursal). Si falta, al persistir se usa la sede del menú principal.
  branchId?: number | null
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
  // Peso opcional al ingreso (en la unidad preferida de la mascota) → historial de peso.
  weight: string
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
