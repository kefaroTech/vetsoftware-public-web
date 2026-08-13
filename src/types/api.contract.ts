/**
 * Ata los tipos escritos a mano al contrato del backend (TR-01).
 *
 * <p>Este repositorio declara ~470 interfaces que espejan los DTOs del servidor y nada las ataba
 * a él: renombrar un campo en un `record` de Java compilaba, desplegaba y fallaba en el navegador
 * del veterinario como `undefined`. Aquí ese fallo pasa a ser un error de compilación.
 *
 * <p><b>Por qué afirmar en vez de sustituir.</b> Lo evidente sería borrar las interfaces y usar
 * `components['schemas'][...]`. No se hace porque springdoc no marca ningún campo como requerido
 * —un `record` de Java no dice nada sobre nulabilidad—, así que **el esquema generado es
 * enteramente opcional**: adoptarlo cambiaría ~470 tipos precisos por 470 donde cada acceso
 * necesita `?.`. Eso es perder información, no ganarla. Afirmar conserva los tipos escritos a
 * mano —con su documentación de negocio— y detecta lo que de verdad rompe la pantalla.
 *
 * <p><b>Qué comprueba.</b> Tres cosas, y solo tres, porque son las que el contrato sabe expresar:
 *
 * <ol>
 *   <li><b>Campos que no existen.</b> Si este repositorio declara un campo que el contrato no
 *       tiene, es un campo inventado, renombrado en el backend o eliminado — y en runtime vale
 *       `undefined`. Es el fallo que describe TR-01.</li>
 *   <li><b>Tipos primitivos incompatibles</b>, incluidos los enums: un campo que el backend
 *       declara como una unión cerrada y aquí se escribió como `string` acepta valores que el
 *       servidor rechazará.</li>
 *   <li><b>Campos obligatorios declarados opcionales.</b> springdoc deriva `required` de las
 *       anotaciones de validación de los DTO de entrada, así que en 187 esquemas de petición sí
 *       sabe qué exige el servidor. Declararlo opcional aquí deja construir una petición
 *       incompleta que compila y se rechaza con un 400.</li>
 * </ol>
 *
 * <p><b>Qué NO comprueba, a propósito.</b> La nulabilidad de las <em>respuestas</em>: los DTO de
 * salida son `record` sin anotaciones, así que el contrato no dice qué garantiza devolver el
 * servidor y ninguno de sus 400 esquemas de respuesta trae `required`. Tampoco la forma de los
 * campos anidados, porque cada tipo anidado tiene su propia atadura en la lista de abajo y se
 * comprueba ahí; compararla aquí solo produciría falsos positivos, ya que el generador emite
 * `campo?: string` donde este repositorio escribe `string | null` y esa diferencia no dice nada
 * sobre el backend.
 */
import type { components } from './api.generated'
import type {
  AppointmentResponse,
  CancelAppointmentRequest,
  CreateAppointmentRequest,
  RescheduleAppointmentRequest,
  UpdateAppointmentRequest,
} from '../features/agenda/types/appointment'
import type { LoginEmployeeRequest, MeResponse, TokenResponse } from '../features/auth/types/index'
import type { BranchResponse } from '../features/branches/api/branch.api'
import type {
  CashMovementView,
  CashSessionCountView,
  CashSessionView,
  CloseCashSessionRequest,
  OpenCashSessionRequest,
  RegisterCashMovementRequest,
} from '../features/caja/types/caja'
import type {
  BranchSummary,
  GoodsReceiptLineRequest,
  ProductSummary,
  PurchaseOrderLineRequest,
  RegisterSupplierPaymentRequest,
  SupplierSummary,
} from '../features/compras/types/compras'
import type {
  AnimalSummary,
  CompanySummary,
  EmployeeSummary,
  OpenAccountResponse,
  OwnerSummary,
  TaxSummary,
} from '../features/cuentas/types/cuentas'
import type {
  AnimalColorSummary,
  AnimalResponse,
  CreateAnimalRequest,
  UpdateAnimalRequest,
} from '../features/dashboard/views/consulta/nueva/api/animal.api'
import type { AnimalColorResponse } from '../features/dashboard/views/consulta/nueva/api/animalColor.api'
import type { BreedResponse } from '../features/dashboard/views/consulta/nueva/api/breed.api'
import type {
  ConsultationResponse,
  ConsultationTypeSummary,
} from '../features/dashboard/views/consulta/nueva/api/consultation.api'
import type { ConsultationTypeResponse } from '../features/dashboard/views/consulta/nueva/api/consultationType.api'
import type { DewormingResponse } from '../features/dashboard/views/consulta/nueva/api/deworming.api'
import type {
  DiagnosticImagingResponse,
  DiagnosticImagingTypeSummary,
} from '../features/dashboard/views/consulta/nueva/api/diagnosticImaging.api'
import type { DiagnosticImagingTypeResponse } from '../features/dashboard/views/consulta/nueva/api/diagnosticImagingType.api'
import type {
  CityResponse,
  CountryResponse,
  CountrySummary,
  StateResponse,
  StateSummary,
} from '../features/dashboard/views/consulta/nueva/api/geo.api'
import type { HospitalizationResponse } from '../features/dashboard/views/consulta/nueva/api/hospitalization.api'
import type {
  LaboratoryTestResponse,
  LaboratoryTestTypeSummary,
} from '../features/dashboard/views/consulta/nueva/api/laboratoryTest.api'
import type { MedicamentResponse } from '../features/dashboard/views/consulta/nueva/api/medicament.api'
import type { MedicamentPrescriptionResponse } from '../features/dashboard/views/consulta/nueva/api/medicamentPrescription.api'
import type {
  CitySummary,
  CreateOwnerRequest,
  OwnerResponse,
  UpdateOwnerRequest,
} from '../features/dashboard/views/consulta/nueva/api/owner.api'
import type { PrescriptionResponse } from '../features/dashboard/views/consulta/nueva/api/prescription.api'
import type {
  SpaResponse,
  SpaTypeSummary,
} from '../features/dashboard/views/consulta/nueva/api/spa.api'
import type { SpaTypeResponse } from '../features/dashboard/views/consulta/nueva/api/spaType.api'
import type { SpecieResponse } from '../features/dashboard/views/consulta/nueva/api/species.api'
import type {
  SurgeryResponse,
  SurgeryTypeSummary,
} from '../features/dashboard/views/consulta/nueva/api/surgery.api'
import type { SurgeryTypeResponse } from '../features/dashboard/views/consulta/nueva/api/surgeryType.api'
import type {
  VaccinationResponse,
  VaccinationTypeSummary,
} from '../features/dashboard/views/consulta/nueva/api/vaccination.api'
import type { VaccinationTypeResponse } from '../features/dashboard/views/consulta/nueva/api/vaccinationType.api'
import type {
  CreateWeightRecordRequest,
  WeightRecordResponse,
} from '../features/dashboard/views/consulta/nueva/api/weightRecord.api'
import type {
  CreateEmployeeRequest,
  EmployeeResponse,
  UpdateEmployeeRequest,
} from '../features/employees/api/employee.api'
import type {
  EmployeeBranchesResponse,
  SetEmployeeBranchesRequest,
} from '../features/employees/api/employeeBranches.api'
import type {
  CreateEmployeeRoleRequest,
  EmployeeRoleResponse,
} from '../features/employees/api/employeeRoles.api'
import type { CompanyResponse } from '../features/empresa/api/company.api'
import type { SetSystemConfigurationRequest } from '../features/facturacion/api/systemConfig.api'
import type {
  CompanyTaxProfileResponse,
  NumberingResolutionResponse,
} from '../features/facturacion/types/facturacion'
import type { ClinicalEventResponse } from '../features/historia-clinica/types/historia'
import type { HospitalizationMedicationResponse } from '../features/hospitalizacion/api/hospitalizationMedication.api'
import type { HospitalizationObservationResponse } from '../features/hospitalizacion/api/hospitalizationObservation.api'
import type { HospitalizationProcedureResponse } from '../features/hospitalizacion/api/hospitalizationProcedure.api'
import type { HospitalizationProgressNoteResponse } from '../features/hospitalizacion/api/hospitalizationProgressNote.api'
import type { MedicationScheduleResponse } from '../features/hospitalizacion/api/medicationSchedule.api'
import type { ProcedureScheduleResponse } from '../features/hospitalizacion/api/procedureSchedule.api'
import type { LaboratoryTestFileResponse } from '../features/laboratorio/api/laboratoryTestFile.api'
import type {
  RegisterUserRequest,
  RegistrationResponse,
} from '../features/registration/types/index'
import type {
  CreateRolePermissionRequest,
  CreateRoleRequest,
  ModuleResponse,
  PermissionResponse,
  RolePermissionResponse,
  RoleResponse,
  SubModuleResponse,
  SyncRolePermissionsRequest,
  UpdateRoleRequest,
} from '../features/roles/types/index'
import type { RegisterPosSaleRequest } from '../features/tienda/api/posSale.api'
import type {
  ExpiringLotView,
  InventoryAlertsView,
  InventoryCountLineView,
  InventoryCountView,
  InventoryValuationView,
  ProductValuationView,
  PurchaseView,
  StockLotView,
  StockMovementView,
  StockView,
} from '../features/tienda/types/inventory'
import type {
  ProductResponse,
  PromotionResponse,
  ServiceResponse,
  TaxResponse,
} from '../features/tienda/types/tienda'
export type Schemas = components['schemas']

/** Lo que el contrato sabe comparar campo a campo. Lo demás se comprueba por su propia atadura. */
type Comparable = string | number | boolean

/** Campos que este repositorio declara y el contrato del backend no tiene. */
type UnknownFields<Local, Name extends keyof Schemas> = Exclude<keyof Local, keyof Schemas[Name]>

/** Campos primitivos presentes en ambos lados cuyo tipo no encaja, ignorando la nulabilidad. */
type MismatchedFields<Local, Name extends keyof Schemas> = {
  [K in Extract<keyof Local, keyof Schemas[Name]>]: NonNullable<Schemas[Name][K]> extends Comparable
    ? NonNullable<Local[K]> extends NonNullable<Schemas[Name][K]>
      ? never
      : K
    : never
}[Extract<keyof Local, keyof Schemas[Name]>]

/** Claves que un tipo declara sin `?`. */
type RequiredKeys<T> = { [K in keyof T]-?: object extends Pick<T, K> ? never : K }[keyof T]

/**
 * Campos que el contrato exige y este repositorio declara opcionales.
 *
 * <p>Solo aplica a las peticiones: springdoc deriva `required` de las anotaciones de validación
 * (`@NotNull`, `@NotBlank`) de los DTO de entrada, y hoy lo hace en 187 esquemas. Declarar
 * opcional aquí un campo que el servidor exige deja construir una petición incompleta que
 * compila y se rechaza con un 400 en producción. Los DTO de salida no traen esta información
 * —un `record` de Java no dice qué garantiza devolver—, así que ahí este conjunto siempre está
 * vacío y no afirma nada de más.
 */
type MissingRequiredFields<Local, Name extends keyof Schemas> = Exclude<
  RequiredKeys<Schemas[Name]> & keyof Local,
  RequiredKeys<Local>
>

/**
 * `true` si el tipo local encaja con el esquema; si no, **los nombres de los campos que fallan**.
 * Es a propósito: el error de compilación los nombra uno a uno en vez de decir «no asignable»,
 * que obligaría a comparar cuarenta campos a ojo.
 */
export type MatchesContract<Local, Name extends keyof Schemas> = [
  UnknownFields<Local, Name> | MismatchedFields<Local, Name> | MissingRequiredFields<Local, Name>,
] extends [never]
  ? true
  : UnknownFields<Local, Name> | MismatchedFields<Local, Name> | MissingRequiredFields<Local, Name>

/** Rompe la compilación si el tipo no encaja; el error nombra los campos culpables. */
type Expect<T extends true> = T

/**
 * Las ataduras: una por cada tipo de este repositorio con un esquema homónimo en el contrato.
 * `api-contract.spec.ts` falla si aparece un tipo nuevo y nadie lo ata aquí, que es lo que evita
 * que esta lista envejezca en silencio.
 */
export type ContractAssertions = [
  Expect<MatchesContract<AnimalColorResponse, 'AnimalColorResponse'>>,
  Expect<MatchesContract<AnimalColorSummary, 'AnimalColorSummary'>>,
  Expect<MatchesContract<AnimalResponse, 'AnimalResponse'>>,
  Expect<MatchesContract<AnimalSummary, 'AnimalSummary'>>,
  Expect<MatchesContract<AppointmentResponse, 'AppointmentResponse'>>,
  Expect<MatchesContract<BranchResponse, 'BranchResponse'>>,
  Expect<MatchesContract<BranchSummary, 'BranchSummary'>>,
  Expect<MatchesContract<BreedResponse, 'BreedResponse'>>,
  Expect<MatchesContract<CancelAppointmentRequest, 'CancelAppointmentRequest'>>,
  Expect<MatchesContract<CashMovementView, 'CashMovementView'>>,
  Expect<MatchesContract<CashSessionCountView, 'CashSessionCountView'>>,
  Expect<MatchesContract<CashSessionView, 'CashSessionView'>>,
  Expect<MatchesContract<CityResponse, 'CityResponse'>>,
  Expect<MatchesContract<CitySummary, 'CitySummary'>>,
  Expect<MatchesContract<ClinicalEventResponse, 'ClinicalEventResponse'>>,
  Expect<MatchesContract<CloseCashSessionRequest, 'CloseCashSessionRequest'>>,
  Expect<MatchesContract<CompanyResponse, 'CompanyResponse'>>,
  Expect<MatchesContract<CompanySummary, 'CompanySummary'>>,
  Expect<MatchesContract<CompanyTaxProfileResponse, 'CompanyTaxProfileResponse'>>,
  Expect<MatchesContract<ConsultationResponse, 'ConsultationResponse'>>,
  Expect<MatchesContract<ConsultationTypeResponse, 'ConsultationTypeResponse'>>,
  Expect<MatchesContract<ConsultationTypeSummary, 'ConsultationTypeSummary'>>,
  Expect<MatchesContract<CountryResponse, 'CountryResponse'>>,
  Expect<MatchesContract<CountrySummary, 'CountrySummary'>>,
  Expect<MatchesContract<CreateAnimalRequest, 'CreateAnimalRequest'>>,
  Expect<MatchesContract<CreateAppointmentRequest, 'CreateAppointmentRequest'>>,
  Expect<MatchesContract<CreateEmployeeRequest, 'CreateEmployeeRequest'>>,
  Expect<MatchesContract<CreateEmployeeRoleRequest, 'CreateEmployeeRoleRequest'>>,
  Expect<MatchesContract<CreateOwnerRequest, 'CreateOwnerRequest'>>,
  Expect<MatchesContract<CreateRolePermissionRequest, 'CreateRolePermissionRequest'>>,
  Expect<MatchesContract<CreateRoleRequest, 'CreateRoleRequest'>>,
  Expect<MatchesContract<CreateWeightRecordRequest, 'CreateWeightRecordRequest'>>,
  Expect<MatchesContract<DewormingResponse, 'DewormingResponse'>>,
  Expect<MatchesContract<DiagnosticImagingResponse, 'DiagnosticImagingResponse'>>,
  Expect<MatchesContract<DiagnosticImagingTypeResponse, 'DiagnosticImagingTypeResponse'>>,
  Expect<MatchesContract<DiagnosticImagingTypeSummary, 'DiagnosticImagingTypeSummary'>>,
  Expect<MatchesContract<EmployeeBranchesResponse, 'EmployeeBranchesResponse'>>,
  Expect<MatchesContract<EmployeeResponse, 'EmployeeResponse'>>,
  Expect<MatchesContract<EmployeeRoleResponse, 'EmployeeRoleResponse'>>,
  Expect<MatchesContract<EmployeeSummary, 'EmployeeSummary'>>,
  Expect<MatchesContract<ExpiringLotView, 'ExpiringLotView'>>,
  Expect<MatchesContract<GoodsReceiptLineRequest, 'GoodsReceiptLineRequest'>>,
  Expect<MatchesContract<HospitalizationMedicationResponse, 'HospitalizationMedicationResponse'>>,
  Expect<MatchesContract<HospitalizationObservationResponse, 'HospitalizationObservationResponse'>>,
  Expect<MatchesContract<HospitalizationProcedureResponse, 'HospitalizationProcedureResponse'>>,
  Expect<
    MatchesContract<HospitalizationProgressNoteResponse, 'HospitalizationProgressNoteResponse'>
  >,
  Expect<MatchesContract<HospitalizationResponse, 'HospitalizationResponse'>>,
  Expect<MatchesContract<InventoryAlertsView, 'InventoryAlertsView'>>,
  Expect<MatchesContract<InventoryCountLineView, 'InventoryCountLineView'>>,
  Expect<MatchesContract<InventoryCountView, 'InventoryCountView'>>,
  Expect<MatchesContract<InventoryValuationView, 'InventoryValuationView'>>,
  Expect<MatchesContract<LaboratoryTestFileResponse, 'LaboratoryTestFileResponse'>>,
  Expect<MatchesContract<LaboratoryTestResponse, 'LaboratoryTestResponse'>>,
  Expect<MatchesContract<LaboratoryTestTypeSummary, 'LaboratoryTestTypeSummary'>>,
  Expect<MatchesContract<LoginEmployeeRequest, 'LoginEmployeeRequest'>>,
  Expect<MatchesContract<MeResponse, 'MeResponse'>>,
  Expect<MatchesContract<MedicamentPrescriptionResponse, 'MedicamentPrescriptionResponse'>>,
  Expect<MatchesContract<MedicamentResponse, 'MedicamentResponse'>>,
  Expect<MatchesContract<MedicationScheduleResponse, 'MedicationScheduleResponse'>>,
  Expect<MatchesContract<ModuleResponse, 'ModuleResponse'>>,
  Expect<MatchesContract<NumberingResolutionResponse, 'NumberingResolutionResponse'>>,
  Expect<MatchesContract<OpenAccountResponse, 'OpenAccountResponse'>>,
  Expect<MatchesContract<OpenCashSessionRequest, 'OpenCashSessionRequest'>>,
  Expect<MatchesContract<OwnerResponse, 'OwnerResponse'>>,
  Expect<MatchesContract<OwnerSummary, 'OwnerSummary'>>,
  Expect<MatchesContract<PermissionResponse, 'PermissionResponse'>>,
  Expect<MatchesContract<PrescriptionResponse, 'PrescriptionResponse'>>,
  Expect<MatchesContract<ProcedureScheduleResponse, 'ProcedureScheduleResponse'>>,
  Expect<MatchesContract<ProductResponse, 'ProductResponse'>>,
  Expect<MatchesContract<ProductSummary, 'ProductSummary'>>,
  Expect<MatchesContract<ProductValuationView, 'ProductValuationView'>>,
  Expect<MatchesContract<PromotionResponse, 'PromotionResponse'>>,
  Expect<MatchesContract<PurchaseOrderLineRequest, 'PurchaseOrderLineRequest'>>,
  Expect<MatchesContract<PurchaseView, 'PurchaseView'>>,
  Expect<MatchesContract<RegisterCashMovementRequest, 'RegisterCashMovementRequest'>>,
  Expect<MatchesContract<RegisterPosSaleRequest, 'RegisterPosSaleRequest'>>,
  Expect<MatchesContract<RegisterSupplierPaymentRequest, 'RegisterSupplierPaymentRequest'>>,
  Expect<MatchesContract<RegisterUserRequest, 'RegisterUserRequest'>>,
  Expect<MatchesContract<RegistrationResponse, 'RegistrationResponse'>>,
  Expect<MatchesContract<RescheduleAppointmentRequest, 'RescheduleAppointmentRequest'>>,
  Expect<MatchesContract<RolePermissionResponse, 'RolePermissionResponse'>>,
  Expect<MatchesContract<RoleResponse, 'RoleResponse'>>,
  Expect<MatchesContract<ServiceResponse, 'ServiceResponse'>>,
  Expect<MatchesContract<SetEmployeeBranchesRequest, 'SetEmployeeBranchesRequest'>>,
  Expect<MatchesContract<SetSystemConfigurationRequest, 'SetSystemConfigurationRequest'>>,
  Expect<MatchesContract<SpaResponse, 'SpaResponse'>>,
  Expect<MatchesContract<SpaTypeResponse, 'SpaTypeResponse'>>,
  Expect<MatchesContract<SpaTypeSummary, 'SpaTypeSummary'>>,
  Expect<MatchesContract<SpecieResponse, 'SpecieResponse'>>,
  Expect<MatchesContract<StateResponse, 'StateResponse'>>,
  Expect<MatchesContract<StateSummary, 'StateSummary'>>,
  Expect<MatchesContract<StockLotView, 'StockLotView'>>,
  Expect<MatchesContract<StockMovementView, 'StockMovementView'>>,
  Expect<MatchesContract<StockView, 'StockView'>>,
  Expect<MatchesContract<SubModuleResponse, 'SubModuleResponse'>>,
  Expect<MatchesContract<SupplierSummary, 'SupplierSummary'>>,
  Expect<MatchesContract<SurgeryResponse, 'SurgeryResponse'>>,
  Expect<MatchesContract<SurgeryTypeResponse, 'SurgeryTypeResponse'>>,
  Expect<MatchesContract<SurgeryTypeSummary, 'SurgeryTypeSummary'>>,
  Expect<MatchesContract<SyncRolePermissionsRequest, 'SyncRolePermissionsRequest'>>,
  Expect<MatchesContract<TaxResponse, 'TaxResponse'>>,
  Expect<MatchesContract<TaxSummary, 'TaxSummary'>>,
  Expect<MatchesContract<TokenResponse, 'TokenResponse'>>,
  Expect<MatchesContract<UpdateAnimalRequest, 'UpdateAnimalRequest'>>,
  Expect<MatchesContract<UpdateAppointmentRequest, 'UpdateAppointmentRequest'>>,
  Expect<MatchesContract<UpdateEmployeeRequest, 'UpdateEmployeeRequest'>>,
  Expect<MatchesContract<UpdateOwnerRequest, 'UpdateOwnerRequest'>>,
  Expect<MatchesContract<UpdateRoleRequest, 'UpdateRoleRequest'>>,
  Expect<MatchesContract<VaccinationResponse, 'VaccinationResponse'>>,
  Expect<MatchesContract<VaccinationTypeResponse, 'VaccinationTypeResponse'>>,
  Expect<MatchesContract<VaccinationTypeSummary, 'VaccinationTypeSummary'>>,
  Expect<MatchesContract<WeightRecordResponse, 'WeightRecordResponse'>>,
]
