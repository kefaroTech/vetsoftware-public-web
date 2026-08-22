import { http } from '@/services/http/http.client'
import type { CreateDebtOpenAccountRequest, DebtResponse } from '../types/cuentas'

export const debtOpenAccountApi = {
  async listByOpenAccount(accountId: number): Promise<DebtResponse[]> {
    const { data } = await http.get<DebtResponse[]>(
      `/debt-open-accounts/by-open-account/${accountId}`,
    )
    return data
  },
  /**
   * El abono no declara sede: el contrato no la trae y el backend la resuelve desde la propia
   * cuenta (`CashRegisterAdapter.resolveBranch`), que es la fuente correcta para un movimiento
   * de caja.
   */
  async create(payload: CreateDebtOpenAccountRequest): Promise<DebtResponse> {
    const { data } = await http.post<DebtResponse>('/debt-open-accounts', payload)
    return data
  },
  /** Anula un abono con motivo obligatorio (requiere permiso elevado debtOpenAccount.delete). */
  async voidPayment(id: number, reason: string, expectedVersion?: number): Promise<DebtResponse> {
    const { data } = await http.patch<DebtResponse>(`/debt-open-accounts/${id}/void`, {
      reason,
      expectedVersion,
    })
    return data
  },
}
