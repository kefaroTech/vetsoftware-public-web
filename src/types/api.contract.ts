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
import type { CashTerminal } from '../features/caja/types/cashTerminal.types'
import type {
  AppointmentResponse,
  CancelAppointmentRequest,
  CreateAppointmentRequest,
  RescheduleAppointmentRequest,
  UpdateAppointmentRequest,
} from '../features/agenda/types/appointment'
import type { LoginEmployeeRequest, MeResponse, TokenResponse } from '../features/auth/types/index'
import type { BranchResponse, SaveBranchRequest } from '../features/branches/types/branch.types'
import type {
  CashMovementView,
  CashSessionCountView,
  CashSessionView,
  CloseCashSessionRequest,
  OpenCashSessionRequest,
  RegisterCashMovementRequest,
} from '../features/caja/types/caja'
import type {
  AccountsPayableAging,
  BranchSummary,
  GoodsReceipt,
  GoodsReceiptLine,
  GoodsReceiptLineRequest,
  ProductSummary,
  PurchaseBook,
  PurchaseOrder,
  PurchaseOrderLine,
  PurchaseOrderLineRequest,
  RegisterSupplierPaymentRequest,
  Supplier,
  SupplierInvoice,
  SupplierInvoicePayment,
  SupplierRequest,
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
} from '../features/dashboard/views/consulta/nueva/types/animal.types'
import type { AnimalColorResponse } from '../features/animal-colors/types/animal-colors.types'
import type { BreedResponse } from '../features/breeds/types/breeds.types'
import type {
  ConsultationResponse,
  ConsultationTypeSummary,
  CreateConsultationPayload,
} from '../features/dashboard/views/consulta/nueva/types/consultation.types'
import type { ConsultationTypeResponse } from '../features/consultation-types/types/consultation-types.types'
import type { DewormingResponse } from '../features/dashboard/views/consulta/nueva/types/deworming.types'
import type {
  DiagnosticImagingResponse,
  DiagnosticImagingTypeSummary,
} from '../features/dashboard/views/consulta/nueva/types/diagnosticImaging.types'
import type { DiagnosticImagingTypeResponse } from '../features/diagnostic-imaging-types/types/diagnostic-imaging-types.types'
import type {
  CityResponse,
  CountryResponse,
  CountrySummary,
  StateResponse,
  StateSummary,
} from '../features/dashboard/views/consulta/nueva/types/geo.types'
import type { HospitalizationResponse } from '../features/dashboard/views/consulta/nueva/types/hospitalization.types'
import type {
  LaboratoryTestResponse,
  LaboratoryTestTypeSummary,
} from '../features/dashboard/views/consulta/nueva/types/laboratoryTest.types'
import type { MedicamentResponse } from '../features/dashboard/views/consulta/nueva/types/medicament.types'
import type {
  CreateMedicamentPrescriptionPayload,
  MedicamentPrescriptionResponse,
} from '../features/dashboard/views/consulta/nueva/types/medicamentPrescription.types'
import type {
  CitySummary,
  CreateOwnerRequest,
  OwnerResponse,
  UpdateOwnerRequest,
} from '../features/dashboard/views/consulta/nueva/types/owner.types'
import type { PrescriptionResponse } from '../features/dashboard/views/consulta/nueva/types/prescription.types'
import type {
  SpaResponse,
  SpaTypeSummary,
} from '../features/dashboard/views/consulta/nueva/types/spa.types'
import type { SpaTypeResponse } from '../features/spa-types/types/spa-types.types'
import type { SpecieResponse } from '../features/species/types/species.types'
import type {
  SurgeryResponse,
  SurgeryTypeSummary,
} from '../features/dashboard/views/consulta/nueva/types/surgery.types'
import type { SurgeryTypeResponse } from '../features/surgery-types/types/surgery-types.types'
import type {
  VaccinationResponse,
  VaccinationTypeSummary,
} from '../features/dashboard/views/consulta/nueva/types/vaccination.types'
import type { VaccinationTypeResponse } from '../features/vaccination-types/types/vaccination-types.types'
import type {
  CreateWeightRecordRequest,
  WeightRecordResponse,
} from '../features/dashboard/views/consulta/nueva/types/weightRecord.types'
import type {
  CreateEmployeeRequest,
  EmployeeResponse,
  UpdateEmployeeRequest,
} from '../features/employees/types/employee.types'
import type {
  EmployeeBranchesResponse,
  SetEmployeeBranchesRequest,
} from '../features/employees/types/employeeBranches.types'
import type {
  CreateEmployeeRoleRequest,
  EmployeeRoleResponse,
} from '../features/employees/types/employeeRoles.types'
import type { CompanyResponse } from '../features/empresa/types/company.types'
import type {
  SetSystemConfigurationRequest,
  SystemConfigurationResponse,
} from '../features/facturacion/types/systemConfig.types'
import type {
  CompanyTaxProfileResponse,
  CustomerSnapshot,
  DianProviderConfigResponse,
  EconomicActivity,
  ElectronicDocumentResponse,
  IssuerSnapshot,
  NumberingResolutionResponse,
  ReconciliationResponse,
  SalesBookResponse,
  SaveCompanyTaxProfileRequest,
  SaveDianProviderConfigRequest,
  SaveNumberingResolutionRequest,
  SaveWithholdingConfigRequest,
  WithholdingConfigResponse,
} from '../features/facturacion/types/facturacion'
import type {
  ClinicalEvent,
  ClinicalEventResponse,
} from '../features/historia-clinica/types/historia'
import type {
  CreateHospitalizationMedicationPayload,
  HospitalizationMedicationResponse,
} from '../features/hospitalizacion/types/hospitalizationMedication.types'
import type { HospitalizationObservationResponse } from '../features/hospitalizacion/types/hospitalizationObservation.types'
import type {
  CreateHospitalizationProcedurePayload,
  HospitalizationProcedureResponse,
} from '../features/hospitalizacion/types/hospitalizationProcedure.types'
import type { HospitalizationProgressNoteResponse } from '../features/hospitalizacion/types/hospitalizationProgressNote.types'
import type { MedicationScheduleResponse } from '../features/hospitalizacion/types/medicationSchedule.types'
import type { ProcedureScheduleResponse } from '../features/hospitalizacion/types/procedureSchedule.types'
import type { LaboratoryTestFileResponse } from '../features/laboratorio/types/laboratoryTestFile.types'
import type {
  City,
  RegisterUserRequest,
  RegistrationResponse,
  State,
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
import type { RegisterPosSaleRequest } from '../features/tienda/types/posSale.types'
import type {
  AdjustStockPayload,
  ConsumeStockPayload,
  ExpiringLotView,
  InventoryAlertsView,
  InventoryCountLineView,
  InventoryCountView,
  InventoryValuationView,
  ProductValuationView,
  PurchaseView,
  ReceiveStockPayload,
  RecordCountPayload,
  StockLotView,
  StockMovementView,
  StockView,
  TransferStockPayload,
} from '../features/tienda/types/inventory'
import type {
  ProductResponse,
  PromotionPayload,
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
 * Campos que el contrato garantiza y este repositorio declara nulables.
 *
 * <p>Desde que los DTO de salida llevan requiredMode, el contrato sí dice qué garantiza devolver
 * el servidor. Declarar nulable aquí un campo garantizado obliga a comprobaciones
 * que nunca se cumplen y, peor, esconde que los dos fronts describían el mismo endpoint de forma
 * distinta.
 */
type NullableWhereRequired<Local, Name extends keyof Schemas> = {
  [K in RequiredKeys<Schemas[Name]> & keyof Local]: null extends Local[K] ? K : never
}[RequiredKeys<Schemas[Name]> & keyof Local]

/**
 * `true` si el tipo local encaja con el esquema; si no, **los nombres de los campos que fallan**.
 * Es a propósito: el error de compilación los nombra uno a uno en vez de decir «no asignable»,
 * que obligaría a comparar cuarenta campos a ojo.
 */
export type MatchesContract<Local, Name extends keyof Schemas> = [
  | UnknownFields<Local, Name>
  | MismatchedFields<Local, Name>
  | MissingRequiredFields<Local, Name>
  | NullableWhereRequired<Local, Name>,
] extends [never]
  ? true
  : | UnknownFields<Local, Name>
    | MismatchedFields<Local, Name>
    | MissingRequiredFields<Local, Name>
    | NullableWhereRequired<Local, Name>

/** Rompe la compilación si el tipo no encaja; el error nombra los campos culpables. */
type Expect<T extends true> = T

/**
 * Las ataduras: una por cada tipo de este repositorio con un esquema homónimo en el contrato.
 * `api-contract.spec.ts` falla si aparece un tipo nuevo y nadie lo ata aquí, que es lo que evita
 * que esta lista envejezca en silencio.
 */
// No se atan, y el motivo importa:
//
//   · SupplierInvoiceRequest, ProductPayload, PurchaseOrderRequest, ServicePayload y TaxPayload
//     son UN tipo para dos esquemas: el alta no admite `version` y la edición la exige (bloqueo
//     optimista). Ninguna de las dos aserciones seria cierta; atarlos pide antes partir el tipo
//     en dos, que es un cambio con sus propios sitios de llamada.
//   · GoodsReceiptRequest declara `branchId` opcional y el servidor lo exige, pero no es un
//     defecto: la sede la inyecta `withBranchBody` en la capa de API, asi que el tipo que se
//     afirmaria aqui no es el que viaja.
export type ContractAssertions = [
  Expect<MatchesContract<ElectronicDocumentResponse, 'ElectronicDocumentDto'>>,
  Expect<MatchesContract<SupplierInvoice, 'SupplierInvoiceResponse'>>,
  Expect<MatchesContract<CreateConsultationPayload, 'CreateConsultationRequest'>>,
  Expect<MatchesContract<DianProviderConfigResponse, 'DianProviderConfigDto'>>,
  Expect<MatchesContract<Supplier, 'SupplierResponse'>>,
  Expect<MatchesContract<GoodsReceipt, 'GoodsReceiptResponse'>>,
  Expect<MatchesContract<PurchaseOrder, 'PurchaseOrderResponse'>>,
  Expect<MatchesContract<SaveNumberingResolutionRequest, 'UpdateNumberingResolutionRequest'>>,
  Expect<
    MatchesContract<
      CreateHospitalizationMedicationPayload,
      'CreateHospitalizationMedicationRequest'
    >
  >,
  Expect<
    MatchesContract<CreateHospitalizationProcedurePayload, 'CreateHospitalizationProcedureRequest'>
  >,
  Expect<MatchesContract<SaveDianProviderConfigRequest, 'UpdateDianProviderConfigRequest'>>,
  Expect<MatchesContract<SaveCompanyTaxProfileRequest, 'UpdateCompanyTaxProfileRequest'>>,
  Expect<MatchesContract<PromotionPayload, 'UpdatePromotionRequest'>>,
  Expect<MatchesContract<SupplierRequest, 'CreateSupplierRequest'>>,
  Expect<MatchesContract<SupplierInvoicePayment, 'SupplierInvoicePaymentResponse'>>,
  Expect<MatchesContract<ReconciliationResponse, 'ReconciliationDto'>>,
  Expect<MatchesContract<PurchaseOrderLine, 'PurchaseOrderLineResponse'>>,
  Expect<MatchesContract<GoodsReceiptLine, 'GoodsReceiptLineResponse'>>,
  Expect<MatchesContract<CustomerSnapshot, 'CustomerDto'>>,
  Expect<MatchesContract<WithholdingConfigResponse, 'WithholdingConfigDto'>>,
  Expect<MatchesContract<ClinicalEvent, 'ClinicalEventResponse'>>,
  Expect<MatchesContract<CashTerminal, 'CashTerminalDto'>>,
  Expect<
    MatchesContract<CreateMedicamentPrescriptionPayload, 'UpdateMedicamentPrescriptionRequest'>
  >,
  Expect<MatchesContract<IssuerSnapshot, 'IssuerDto'>>,
  Expect<MatchesContract<SalesBookResponse, 'SalesBookDto'>>,
  Expect<MatchesContract<ReceiveStockPayload, 'ReceiveStockRequest'>>,
  Expect<MatchesContract<SaveBranchRequest, 'UpdateBranchRequest'>>,
  Expect<MatchesContract<SystemConfigurationResponse, 'SystemConfigurationDto'>>,
  Expect<MatchesContract<AdjustStockPayload, 'AdjustStockRequest'>>,
  Expect<MatchesContract<TransferStockPayload, 'TransferStockRequest'>>,
  Expect<MatchesContract<PurchaseBook, 'PurchaseBookDto'>>,
  Expect<MatchesContract<ConsumeStockPayload, 'ConsumeStockRequest'>>,
  Expect<MatchesContract<AccountsPayableAging, 'AccountsPayableAgingResponse'>>,
  Expect<MatchesContract<SaveWithholdingConfigRequest, 'SetWithholdingConfigRequest'>>,
  Expect<MatchesContract<EconomicActivity, 'EconomicActivitySummary'>>,
  Expect<MatchesContract<State, 'StateResponse'>>,
  Expect<MatchesContract<City, 'CityResponse'>>,
  Expect<MatchesContract<RecordCountPayload, 'RecordCountRequest'>>,
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
