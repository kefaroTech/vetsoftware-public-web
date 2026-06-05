import { http } from '@/services/http/http.client'
import type {
  PageResponse,
  ProductPayload,
  ProductResponse,
  ProductSearchCriteria,
} from '../types/tienda'

export const productApi = {
  async listAll(): Promise<ProductResponse[]> {
    const { data } = await http.get<ProductResponse[]>('/products')
    return data
  },

  async search(criteria: ProductSearchCriteria): Promise<PageResponse<ProductResponse>> {
    const params: Record<string, string | number> = {
      page: criteria.page ?? 0,
      pageSize: criteria.pageSize ?? 20,
    }
    if (criteria.name) params.name = criteria.name
    if (criteria.code) params.code = criteria.code
    if (criteria.productCategoryId != null) params.productCategoryId = criteria.productCategoryId
    if (criteria.taxId != null) params.taxId = criteria.taxId
    const { data } = await http.get<PageResponse<ProductResponse>>('/products/search', { params })
    return data
  },

  async findById(id: number): Promise<ProductResponse> {
    const { data } = await http.get<ProductResponse>(`/products/${id}`)
    return data
  },

  async create(payload: ProductPayload): Promise<ProductResponse> {
    const { data } = await http.post<ProductResponse>('/products', payload)
    return data
  },

  async update(id: number, payload: ProductPayload): Promise<ProductResponse> {
    const { data } = await http.put<ProductResponse>(`/products/${id}`, payload)
    return data
  },

  async remove(id: number): Promise<void> {
    await http.delete(`/products/${id}`)
  },
}
