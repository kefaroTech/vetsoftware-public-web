export interface CashTerminal {
  id: number
  branchId: number
  name: string
  code: string
  active: boolean
  createdAt: string
}

export interface SaveCashTerminalRequest {
  branchId: number
  name: string
  code: string
}
