import type { TaxScheme } from '../types/tienda'

export interface TaxPayload {
  name: string
  percentage: number
  taxScheme: TaxScheme
  /** Solo en UPDATE (PUT). El CREATE (POST) no la envía. */
  version?: number
}
