/** Sucursal (sede) de la empresa. GET /branches devuelve activas e inactivas; el selector filtra activas. */
export interface BranchResponse {
  id: number
  name: string
  code: string
  address: string | null
  phone: string | null
  city: { id: number; name: string }
  active: boolean
}

/** Payload de creación/edición de sede. `companyId` lo deriva el backend del JWT (nunca del cliente). */
export interface SaveBranchRequest {
  name: string
  code: string
  address?: string | null
  phone?: string | null
  cityId: number
}
