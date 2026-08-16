import type { CashTerminal, SaveCashTerminalRequest } from '../types/cashTerminal.types'
import { http } from '@/services/http/http.client'

export const cashTerminalApi = {
  async list(branchId: number, activeOnly = false): Promise<CashTerminal[]> {
    const { data } = await http.get<CashTerminal[]>('/cash-terminals', {
      params: { branchId, activeOnly },
    })
    return data
  },

  async create(payload: SaveCashTerminalRequest): Promise<CashTerminal> {
    const { data } = await http.post<CashTerminal>('/cash-terminals', payload)
    return data
  },

  async update(
    id: number,
    payload: Omit<SaveCashTerminalRequest, 'branchId'>,
  ): Promise<CashTerminal> {
    const { data } = await http.put<CashTerminal>(`/cash-terminals/${id}`, payload)
    return data
  },

  async setActive(id: number, active: boolean): Promise<CashTerminal> {
    const { data } = active
      ? await http.patch<CashTerminal>(`/cash-terminals/${id}/activate`)
      : await http.delete<CashTerminal>(`/cash-terminals/${id}`)
    return data
  },
}
