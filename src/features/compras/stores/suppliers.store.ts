import { defineStore } from 'pinia'
import { ref } from 'vue'
import { suppliersApi, type SupplierSearchParams } from '../api/suppliers.api'
import { getProblemDetailMessage } from '@/services/http/http.client'
import type { Supplier, SupplierRequest } from '../types/compras'

/**
 * Store de Proveedores. Mantiene la página de resultados (búsqueda server-side) y la lista completa para selects.
 * Regla de recarga al abrir: las vistas/modales fuerzan `search`/`loadAll(true)` en su montaje / al abrir.
 */
export const useSuppliersStore = defineStore('suppliers', () => {
  const items = ref<Supplier[]>([])
  const total = ref(0)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const all = ref<Supplier[]>([])
  let allLoaded = false

  async function search(params: SupplierSearchParams = {}): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const page = await suppliersApi.search(params)
      items.value = page.content
      total.value = page.totalElements
    } catch (e) {
      error.value = getProblemDetailMessage(e, 'No se pudieron cargar los proveedores')
    } finally {
      loading.value = false
    }
  }

  async function loadAll(force = false): Promise<Supplier[]> {
    if (allLoaded && !force) return all.value
    all.value = await suppliersApi.listAll()
    allLoaded = true
    return all.value
  }

  async function create(payload: SupplierRequest): Promise<Supplier> {
    const created = await suppliersApi.create(payload)
    allLoaded = false
    return created
  }

  async function update(id: number, payload: SupplierRequest & { version: number }): Promise<Supplier> {
    const updated = await suppliersApi.update(id, payload)
    allLoaded = false
    return updated
  }

  async function remove(id: number): Promise<void> {
    await suppliersApi.remove(id)
    allLoaded = false
  }

  return { items, total, loading, error, all, search, loadAll, create, update, remove }
})
