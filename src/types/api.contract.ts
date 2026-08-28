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
import type { PageResponse } from './pagination'
import type { CashTerminal } from '../features/caja/types/cashTerminal.types'
import type {
  AppointmentResponse,
  CancelAppointmentRequest,
  CreateAppointmentRequest,
  RescheduleAppointmentRequest,
  UpdateAppointmentRequest,
} from '../features/agenda/types/appointment'
import type { CompanySettingDto } from '../features/agenda/types/companySetting.types'
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
  SupplierInvoiceSupplierSummary,
  SupplierRequest,
  SupplierSummary,
} from '../features/compras/types/compras'
import type {
  AnimalSummary,
  CompanySummary,
  CreateDebtOpenAccountRequest,
  CreateProductChargeOpenAccountRequest,
  CreateServiceChargeOpenAccountRequest,
  OpenAccountBranchSummary,
  OpenAccountEmployeeSummary,
  OpenAccountResponse,
  OwnerSummary,
  TaxSummary,
} from '../features/cuentas/types/cuentas'
import type {
  AnimalColorSummary,
  AnimalResponse,
  CreateAnimalRequest,
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
  EmployeeRoleSummary,
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
  IssueElectronicCreditNoteRequest,
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
import type {
  MedicationScheduleResponse,
  RescheduleMedicationScheduleResponse,
} from '../features/hospitalizacion/types/medicationSchedule.types'
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
  RolePermissionSummary,
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
 * Campos que el contrato declara y este repositorio no declara **en absoluto**.
 *
 * <p>Este era el agujero del propio guardián. Los cuatro conjuntos de arriba cruzan todos por
 * `keyof Local`, así que solo saben hablar de campos que este repositorio ya nombra: **omitir**
 * un campo entero les resultaba invisible. La petición de crear membresía declaraba `name` y
 * `status`, el contrato traía además `mandatory`, y su atadura pasaba en verde mientras cada
 * membresía creada o editada desde la consola se guardaba con `mandatory = false` sin que nadie
 * lo eligiera ni lo viera.
 *
 * <p>Aquel esquema ya no existe: el modelo de membresías se sustituyó por el de suscripciones.
 * El mecanismo sí sigue haciendo falta —el mismo fallo reaparece cada vez que el backend añade
 * un `boolean` primitivo a una petición—, y por eso el ejemplo se conserva.
 *
 * <p>Y no basta con mirar los `required` del contrato, que es lo que hace `MissingRequiredFields`:
 * `mandatory` **no** es `required` allí —springdoc solo marca lo que lleva `@NotNull` o
 * `@NotBlank`—, pero en el `record` de Java es un `boolean` primitivo. Un cuerpo JSON sin ese
 * campo no significa «déjalo como está»: significa `false`. Por eso este conjunto mira **todos**
 * los campos del esquema y no solo los exigidos.
 *
 * <p>`ToleratedGaps` descuenta la deuda que ya existía el día que esto se encendió: ver
 * `ContractGaps`.
 */
type UndeclaredFields<Local, Name extends keyof Schemas> = Exclude<
  keyof Schemas[Name],
  keyof Local | ToleratedGaps<Name>
>

/** El techo de deuda resuelto para un esquema concreto; `never` si el esquema no figura. */
type ToleratedGaps<Name extends keyof Schemas> = Name extends keyof ContractGaps
  ? ContractGaps[Name]
  : never

/**
 * Entradas del techo que este tipo ya no necesita, porque declara **todos** los campos que se le
 * perdonaban. Es lo que hace que el techo solo pueda bajar: quien termine de declarar un esquema
 * tiene que borrar su línea de `ContractGaps`, o el build no compila.
 *
 * <p>Pide declararlos todos, y no campo a campo, por un motivo concreto: hay esquemas atados por
 * **dos** tipos locales distintos que comparten una sola entrada del techo. Con la comprobación
 * campo a campo, el tipo que declarara más obligaría a borrar una línea que el otro todavía
 * necesita, y la entrada se quedaría sin forma válida de escribirse.
 */
type StaleGaps<Local, Name extends keyof Schemas> = [
  Exclude<ToleratedGaps<Name>, keyof Local>,
] extends [never]
  ? ToleratedGaps<Name>
  : never

/**
 * `true` si el tipo local encaja con el esquema; si no, **los nombres de los campos que fallan**.
 * Es a propósito: el error de compilación los nombra uno a uno en vez de decir «no asignable»,
 * que obligaría a comparar cuarenta campos a ojo.
 */
export type MatchesContract<Local, Name extends keyof Schemas> = [
  | UnknownFields<Local, Name>
  | MismatchedFields<Local, Name>
  | MissingRequiredFields<Local, Name>
  | NullableWhereRequired<Local, Name>
  | UndeclaredFields<Local, Name>
  | StaleGaps<Local, Name>,
] extends [never]
  ? true
  : | UnknownFields<Local, Name>
    | MismatchedFields<Local, Name>
    | MissingRequiredFields<Local, Name>
    | NullableWhereRequired<Local, Name>
    | UndeclaredFields<Local, Name>
    | StaleGaps<Local, Name>

/** Rompe la compilación si el tipo no encaja; el error nombra los campos culpables. */
type Expect<T extends true> = T

/**
 * Entradas del techo que ya no describen nada real: un esquema que el contrato dejó de traer, o
 * un campo que ese esquema ya no tiene. Es la otra forma de pudrirse —la silenciosa, la que deja
 * el repositorio afirmando por escrito algo falso— y por eso se comprueba aparte de `StaleGaps`,
 * que solo mira el lado del front.
 */
type RottenGapEntries = {
  [N in keyof ContractGaps]: N extends keyof Schemas
    ? [Exclude<ContractGaps[N], keyof Schemas[N]>] extends [never]
      ? never
      : N
    : N
}[keyof ContractGaps]

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
/**
 * **El techo de deuda, y solo baja.** Campos que el contrato declara y este repositorio todavía
 * no: la foto del día en que `UndeclaredFields` se encendió. Sin ella, encender la comprobación
 * habría dejado en rojo el build de los dos fronts de golpe, que es la forma segura de que a
 * alguien se le ocurra apagarla.
 *
 * <p>Se sostiene sola por los dos lados: `StaleGaps` obliga a borrar la línea en cuanto el tipo
 * local declara todo lo que se le perdonaba, y `RottenGapEntries` obliga a borrarla si el
 * esquema o el campo dejan de existir en el contrato. Añadir una entrada nueva es siempre un
 * acto deliberado que se ve en el diff — nunca algo que ocurra solo.
 *
 * <p>No todo lo de aquí es un defecto. `TokenResponse.refreshToken` se omite **a propósito**
 * (el backend lo emite en una cookie `HttpOnly` y el campo llega `null`), y los `enabled` de
 * los catálogos son inertes: sus entidades JPA llevan `@SQLRestriction("enabled = true")`, así
 * que por el cable nunca viaja otra cosa que `true`. Esa es justo la razón de que el techo
 * exista en vez de una prohibición seca.
 */
interface ContractGaps {
  // --- Peticiones: lo que este repositorio NUNCA envía -------------------------------
  // Son las peligrosas. Un campo que no se declara no se envía, y el servidor no recibe
  // «sin cambios» sino el valor por defecto de Java. Bajar una de estas líneas arregla un
  // defecto de verdad; bajar una de las de abajo solo enseña un dato más.
  //
  // **Este bloque está vacío y ese es el objetivo.** La última entrada era
  // `RegisterPosSaleRequest: 'branchId'` (issue #191): sin sede declarada, la venta del
  // POS se emitía y descontaba stock en la sede «Principal» del backend mientras la
  // pantalla mostraba el saldo de la sede activa. Hoy el tipo declara `branchId` y
  // `usePosSale` manda la sede del store. Si vuelve a hacer falta añadir algo aquí, que
  // se vea en el diff y se justifique.

  // --- Respuestas: lo que este repositorio no lee -------------------------------------
  // `CityResponse` y `StateResponse` están atados por dos tipos locales cada uno, así que
  // su entrada es la unión de lo que le falta a los dos. Ver `StaleGaps`.
  AnimalColorResponse: 'enabled'
  AppointmentResponse: 'branch'
  BranchResponse: 'company' | 'createdDate'
  BreedResponse: 'enabled'
  CityResponse: 'daneCode' | 'createdDate' | 'enabled'
  ConsultationResponse: 'enabled'
  ConsultationTypeResponse: 'enabled'
  CountryResponse: 'enabled'
  DewormingResponse: 'enabled'
  DiagnosticImagingResponse: 'status' | 'enabled'
  DiagnosticImagingTypeResponse: 'company' | 'general' | 'enabled'
  ElectronicDocumentDto: 'branchId'
  EmployeeRoleResponse: 'enabled'
  GoodsReceiptResponse: 'company' | 'createdDate' | 'createdBy' | 'updatedDate' | 'updatedBy'
  LaboratoryTestFileResponse: 'storageKey' | 'bucket'
  LaboratoryTestResponse: 'enabled'
  MedicamentPrescriptionResponse: 'prescription' | 'enabled'
  ModuleResponse: 'enabled'
  OpenAccountResponse: 'reversed' | 'reversedAt'
  OwnerResponse: 'enabled'
  PermissionResponse: 'enabled'
  PrescriptionResponse: 'enabled'
  ProductResponse: 'baseUnitMeasureCode' | 'updatedDate' | 'updatedBy'
  PurchaseOrderResponse: 'company' | 'createdDate' | 'createdBy' | 'updatedDate' | 'updatedBy'
  RolePermissionResponse: 'enabled'
  ServiceResponse: 'updatedDate' | 'updatedBy'
  SpaResponse: 'status' | 'enabled'
  SpaTypeResponse: 'enabled'
  SpecieResponse: 'enabled'
  StateResponse: 'daneCode' | 'createdDate' | 'enabled'
  SubModuleResponse: 'enabled'
  SupplierInvoiceResponse: 'company' | 'createdDate' | 'createdBy' | 'updatedDate' | 'updatedBy'
  SupplierResponse: 'company' | 'createdDate' | 'updatedDate' | 'updatedBy'
  SurgeryResponse: 'status' | 'enabled'
  SurgeryTypeResponse: 'enabled'
  TaxResponse: 'updatedDate' | 'updatedBy'
  TokenResponse: 'refreshToken'
  VaccinationResponse: 'route' | 'applicationSite' | 'enabled'
  VaccinationTypeResponse: 'enabled'
}

export type ContractAssertions = [
  Expect<[RottenGapEntries] extends [never] ? true : RottenGapEntries>,
  // La envoltura de página, atada por una de sus 38 instanciaciones (BE-21). El generador emite
  // un esquema por tipo de contenido —`PageResponseOwnerResponse`, `PageResponseStockView`…— y
  // ninguno se llama `PageResponse` a secas, así que la regla de los homónimos no la alcanzaba y
  // los cinco campos de `PageResponse<T>` eran los únicos del repositorio sin nada que los atara
  // al servidor. Renombrar `content` o `totalElements` en el backend no rompía nada: devolvía
  // `undefined` en los ~26 sitios que los leen. Una instanciación basta, porque los cinco campos
  // los declara la envoltura y no el contenido.
  Expect<MatchesContract<PageResponse<OwnerResponse>, 'PageResponseOwnerResponse'>>,
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
    MatchesContract<CreateMedicamentPrescriptionPayload, 'CreateMedicamentPrescriptionRequest'>
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
  Expect<MatchesContract<CompanySettingDto, 'CompanySettingDto'>>,
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
  Expect<MatchesContract<CreateDebtOpenAccountRequest, 'CreateDebtOpenAccountRequest'>>,
  Expect<MatchesContract<CreateEmployeeRequest, 'CreateEmployeeRequest'>>,
  Expect<MatchesContract<CreateEmployeeRoleRequest, 'CreateEmployeeRoleRequest'>>,
  Expect<MatchesContract<CreateOwnerRequest, 'CreateOwnerRequest'>>,
  Expect<
    MatchesContract<CreateProductChargeOpenAccountRequest, 'CreateProductChargeOpenAccountRequest'>
  >,
  Expect<MatchesContract<CreateRolePermissionRequest, 'CreateRolePermissionRequest'>>,
  Expect<MatchesContract<CreateRoleRequest, 'CreateRoleRequest'>>,
  Expect<
    MatchesContract<CreateServiceChargeOpenAccountRequest, 'CreateServiceChargeOpenAccountRequest'>
  >,
  Expect<MatchesContract<CreateWeightRecordRequest, 'CreateWeightRecordRequest'>>,
  Expect<MatchesContract<DewormingResponse, 'DewormingResponse'>>,
  Expect<MatchesContract<DiagnosticImagingResponse, 'DiagnosticImagingResponse'>>,
  Expect<MatchesContract<DiagnosticImagingTypeResponse, 'DiagnosticImagingTypeResponse'>>,
  Expect<MatchesContract<DiagnosticImagingTypeSummary, 'DiagnosticImagingTypeSummary'>>,
  Expect<MatchesContract<EmployeeBranchesResponse, 'EmployeeBranchesResponse'>>,
  Expect<MatchesContract<EmployeeResponse, 'EmployeeResponse'>>,
  Expect<MatchesContract<EmployeeRoleResponse, 'EmployeeRoleResponse'>>,
  Expect<MatchesContract<EmployeeRoleSummary, 'EmployeeRoleSummary'>>,
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
  Expect<MatchesContract<IssueElectronicCreditNoteRequest, 'IssueElectronicCreditNoteRequest'>>,
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
  Expect<MatchesContract<OpenAccountBranchSummary, 'OpenAccountBranchSummary'>>,
  Expect<MatchesContract<OpenAccountEmployeeSummary, 'OpenAccountEmployeeSummary'>>,
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
  Expect<
    MatchesContract<RescheduleMedicationScheduleResponse, 'RescheduleMedicationScheduleResponse'>
  >,
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
  Expect<MatchesContract<RolePermissionSummary, 'RolePermissionSummary'>>,
  Expect<MatchesContract<SubModuleResponse, 'SubModuleResponse'>>,
  Expect<MatchesContract<SupplierInvoiceSupplierSummary, 'SupplierInvoiceSupplierSummary'>>,
  Expect<MatchesContract<SupplierSummary, 'SupplierSummary'>>,
  Expect<MatchesContract<SurgeryResponse, 'SurgeryResponse'>>,
  Expect<MatchesContract<SurgeryTypeResponse, 'SurgeryTypeResponse'>>,
  Expect<MatchesContract<SurgeryTypeSummary, 'SurgeryTypeSummary'>>,
  Expect<MatchesContract<SyncRolePermissionsRequest, 'SyncRolePermissionsRequest'>>,
  Expect<MatchesContract<TaxResponse, 'TaxResponse'>>,
  Expect<MatchesContract<TaxSummary, 'TaxSummary'>>,
  Expect<MatchesContract<TokenResponse, 'TokenResponse'>>,
  Expect<MatchesContract<UpdateAppointmentRequest, 'UpdateAppointmentRequest'>>,
  Expect<MatchesContract<UpdateEmployeeRequest, 'UpdateEmployeeRequest'>>,
  Expect<MatchesContract<UpdateOwnerRequest, 'UpdateOwnerRequest'>>,
  Expect<MatchesContract<UpdateRoleRequest, 'UpdateRoleRequest'>>,
  Expect<MatchesContract<VaccinationResponse, 'VaccinationResponse'>>,
  Expect<MatchesContract<VaccinationTypeResponse, 'VaccinationTypeResponse'>>,
  Expect<MatchesContract<VaccinationTypeSummary, 'VaccinationTypeSummary'>>,
  Expect<MatchesContract<WeightRecordResponse, 'WeightRecordResponse'>>,
]
