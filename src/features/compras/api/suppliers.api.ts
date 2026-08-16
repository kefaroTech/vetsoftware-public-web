import type { SupplierSearchParams } from '../types/suppliers.types'
import { http } from '@/services/http/http.client'
import type { PageResponse } from '@/types/pagination'
import type { Supplier, SupplierRequest } from '../types/compras'

// Proveedores (backend: /suppliers). CRUD company-scoped, búsqueda paginada server-side.

export const suppliersApi = {
  async search(params: SupplierSearchParams = {}): Promise<PageResponse<Supplier>> {
    const { data } = await http.get<PageResponse<Supplier>>('/suppliers/search', { params })
    return data
  },

  /** Lista completa (para selects de proveedor). */
  async listAll(): Promise<Supplier[]> {
    const { data } = await http.get<Supplier[]>('/suppliers')
    return data
  },

  async findById(id: number): Promise<Supplier> {
    const { data } = await http.get<Supplier>(`/suppliers/${id}`)
    return data
  },

  async create(payload: SupplierRequest): Promise<Supplier> {
    const { data } = await http.post<Supplier>('/suppliers', payload)
    return data
  },

  async update(id: number, payload: SupplierRequest & { version: number }): Promise<Supplier> {
    const { data } = await http.put<Supplier>(`/suppliers/${id}`, payload)
    return data
  },

  async remove(id: number): Promise<void> {
    await http.delete(`/suppliers/${id}`)
  },
}
