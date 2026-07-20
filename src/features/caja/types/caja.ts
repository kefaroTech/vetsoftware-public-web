// Tipos de Caja / arqueo (punto 5). Espejan los DTOs del backend (feature cashregister).

export type CashSessionStatus = 'OPEN' | 'CLOSED'
export type CashPaymentMethod = 'CASH' | 'CARD' | 'TRANSFER'
export type CashMovementType =
  | 'SALE_IN'
  | 'OPEN_ACCOUNT_IN'
  | 'MANUAL_IN'
  | 'WITHDRAWAL'
  | 'EXPENSE'
  | 'VOID_OUT'
export type CashReferenceType = 'POS_DOCUMENT' | 'OPEN_ACCOUNT_PAYMENT' | 'MANUAL'

/** Tipos manuales que el operador puede registrar desde la UI. */
export type ManualMovementType = 'MANUAL_IN' | 'WITHDRAWAL' | 'EXPENSE'

export interface MethodTotal {
  method: CashPaymentMethod
  expectedAmount: number
}

export interface CashMovementView {
  id: number | null
  type: CashMovementType
  method: CashPaymentMethod
  amount: number
  referenceType: CashReferenceType
  referenceId: number | null
  createdByEmployeeId: number | null
  createdAt: string
  note: string | null
}

export interface CashSessionCountView {
  method: CashPaymentMethod
  expectedAmount: number
  countedAmount: number
  difference: number
}

export interface CashSessionView {
  id: number
  branchId: number
  branchName: string | null
  terminalId: number
  terminal: string
  status: CashSessionStatus
  openedByEmployeeId: number | null
  openedByEmployeeName: string | null
  openedAt: string
  openingFloat: number
  closingTotal: number | null
  closedByEmployeeId: number | null
  closedByEmployeeName: string | null
  closedAt: string | null
  note: string | null
  version: number
  totals: MethodTotal[]
  movements: CashMovementView[]
  counts: CashSessionCountView[]
}

export interface OpenCashSessionRequest {
  branchId: number
  terminalId: number
  openingFloat: number
  note?: string | null
}

export interface RegisterCashMovementRequest {
  type: ManualMovementType
  method: CashPaymentMethod
  amount: number
  note?: string | null
}

export interface CloseCashCountLine {
  method: CashPaymentMethod
  countedAmount: number
}

export interface CloseCashSessionRequest {
  counts: CloseCashCountLine[]
  note?: string | null
}

export interface PageResponse<T> {
  content: T[]
  page: number
  pageSize: number
  totalElements: number
  totalPages: number
}
