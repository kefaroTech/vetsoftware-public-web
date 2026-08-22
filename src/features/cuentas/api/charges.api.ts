import { http } from '@/services/http/http.client'
import { withBranchBody } from '@/features/branches/api/branchContext'
import type {
  CreateGeneralChargePayload,
  CreateProductChargeOpenAccountRequest,
  CreateServiceChargeOpenAccountRequest,
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
  /**
   * Cobra un producto contra una cuenta abierta. El cuerpo pasa por `withBranchBody`, que le
   * añade la sede activa (`useBranchStore().selectedBranchId`) cuando el llamador no fija una.
   *
   * Era el único cliente de escritura con sede que no pasaba por la envoltura, y el cargo
   * viajaba sin `branchId`: el backend solo la deduce si el empleado tiene UNA sede, y con dos
   * o más responde 400 `branchId is required` (`Authz.resolveAccessibleBranch`). Va aquí y no
   * en cada llamada del store porque `productChargeApi.create` es el único punto por el que
   * pasan los tres caminos que crean cargos de producto (`addProductCharge`, `addChargeUnit` y
   * `addChargesBatch`), y un cuarto llamador futuro queda cubierto sin acordarse de nada.
   * Issue #193.
   */
  async create(payload: CreateProductChargeOpenAccountRequest): Promise<ProductChargeResponse> {
    const { data } = await http.post<ProductChargeResponse>(
      '/product-charge-open-accounts',
      withBranchBody(payload),
    )
    return data
  },
  /** Anula un cargo con motivo obligatorio (queda visible tachado; permiso chargeOpenAccount.delete). */
  async voidCharge(
    id: number,
    reason: string,
    expectedVersion?: number,
  ): Promise<ProductChargeResponse> {
    const { data } = await http.patch<ProductChargeResponse>(
      `/product-charge-open-accounts/${id}/void`,
      { reason, expectedVersion },
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
  /**
   * El cargo de servicio NO declara sede y no debe hacerlo: el esquema del contrato
   * (`CreateServiceChargeOpenAccountRequest`) no la trae y `ServiceChargeOpenAccountController`
   * no llama a `resolveAccessibleBranch` — un servicio no mueve inventario, así que no hay nada
   * que localizar en una sede. Mismo caso en el cargo general y en el abono.
   */
  async create(payload: CreateServiceChargeOpenAccountRequest): Promise<ServiceChargeResponse> {
    const { data } = await http.post<ServiceChargeResponse>(
      '/service-charge-open-accounts',
      payload,
    )
    return data
  },
  /** Anula un cargo con motivo obligatorio (queda visible tachado; permiso chargeOpenAccount.delete). */
  async voidCharge(
    id: number,
    reason: string,
    expectedVersion?: number,
  ): Promise<ServiceChargeResponse> {
    const { data } = await http.patch<ServiceChargeResponse>(
      `/service-charge-open-accounts/${id}/void`,
      { reason, expectedVersion },
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
    const { data } = await http.post<GeneralChargeResponse>(
      '/general-charge-open-accounts',
      payload,
    )
    return data
  },
  /** Anula un cargo con motivo obligatorio (queda visible tachado; permiso chargeOpenAccount.delete). */
  async voidCharge(
    id: number,
    reason: string,
    expectedVersion?: number,
  ): Promise<GeneralChargeResponse> {
    const { data } = await http.patch<GeneralChargeResponse>(
      `/general-charge-open-accounts/${id}/void`,
      { reason, expectedVersion },
    )
    return data
  },
}
