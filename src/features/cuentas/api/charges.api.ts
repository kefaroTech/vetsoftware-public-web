import { http } from '@/services/http/http.client'
import type {
  CreateGeneralChargePayload,
  CreateProductChargePayload,
  CreateServiceChargePayload,
  GeneralChargeResponse,
  ProductChargeResponse,
  ServiceChargeResponse,
} from '../types/cuentas'

export const productChargeApi = {
  async listByOpenAccount(accountId: number): Promise<ProductChargeResponse[]> {
    const { data } = await http.get<ProductChargeResponse[]>(
      `/product-charge-open-accounts/by-open-account/${accountId}`,
    )
    return data
  },
  async create(payload: CreateProductChargePayload): Promise<ProductChargeResponse> {
    const { data } = await http.post<ProductChargeResponse>('/product-charge-open-accounts', payload)
    return data
  },
  /** Anula un cargo con motivo obligatorio (queda visible tachado; permiso chargeOpenAccount.delete). */
  async voidCharge(id: number, reason: string, expectedVersion?: number): Promise<ProductChargeResponse> {
    const { data } = await http.patch<ProductChargeResponse>(
      `/product-charge-open-accounts/${id}/void`, { reason, expectedVersion },
    )
    return data
  },
}

export const serviceChargeApi = {
  async listByOpenAccount(accountId: number): Promise<ServiceChargeResponse[]> {
    const { data } = await http.get<ServiceChargeResponse[]>(
      `/service-charge-open-accounts/by-open-account/${accountId}`,
    )
    return data
  },
  async create(payload: CreateServiceChargePayload): Promise<ServiceChargeResponse> {
    const { data } = await http.post<ServiceChargeResponse>('/service-charge-open-accounts', payload)
    return data
  },
  /** Anula un cargo con motivo obligatorio (queda visible tachado; permiso chargeOpenAccount.delete). */
  async voidCharge(id: number, reason: string, expectedVersion?: number): Promise<ServiceChargeResponse> {
    const { data } = await http.patch<ServiceChargeResponse>(
      `/service-charge-open-accounts/${id}/void`, { reason, expectedVersion },
    )
    return data
  },
}

export const generalChargeApi = {
  async listByOpenAccount(accountId: number): Promise<GeneralChargeResponse[]> {
    const { data } = await http.get<GeneralChargeResponse[]>(
      `/general-charge-open-accounts/by-open-account/${accountId}`,
    )
    return data
  },
  async create(payload: CreateGeneralChargePayload): Promise<GeneralChargeResponse> {
    const { data } = await http.post<GeneralChargeResponse>('/general-charge-open-accounts', payload)
    return data
  },
  /** Anula un cargo con motivo obligatorio (queda visible tachado; permiso chargeOpenAccount.delete). */
  async voidCharge(id: number, reason: string, expectedVersion?: number): Promise<GeneralChargeResponse> {
    const { data } = await http.patch<GeneralChargeResponse>(
      `/general-charge-open-accounts/${id}/void`, { reason, expectedVersion },
    )
    return data
  },
}
