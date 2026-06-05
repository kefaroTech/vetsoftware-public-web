import { ref } from 'vue'
import { productApi } from '../api/product.api'
import { serviceApi } from '../api/service.api'
import { promotionApi } from '../api/promotion.api'
import { productCategoryApi } from '../api/productCategory.api'
import { serviceCategoryApi } from '../api/serviceCategory.api'
import { taxApi } from '../api/tax.api'
import { getProblemDetailMessage } from '@/services/http/http.client'
import type {
  CategoryResponse,
  ProductPayload,
  ProductResponse,
  PromotionPayload,
  PromotionResponse,
  ServicePayload,
  ServiceResponse,
  TaxResponse,
} from '../types/tienda'

/**
 * Store GLOBAL de la Tienda (catálogos + promos), module-scoped según la
 * convención del repo (sin Pinia). El estado vive a nivel de módulo para que el
 * POS, Inventario, Servicios y Promociones compartan siempre el mismo catálogo
 * actualizado al navegar entre pestañas.
 */

const products = ref<ProductResponse[]>([])
const services = ref<ServiceResponse[]>([])
const promotions = ref<PromotionResponse[]>([])
const productCategories = ref<CategoryResponse[]>([])
const serviceCategories = ref<CategoryResponse[]>([])
const taxes = ref<TaxResponse[]>([])

const loading = ref(false)
const error = ref<string | null>(null)
let loadedOnce = false
let inFlight: Promise<void> | null = null

async function fetchAll(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    const [p, s, promo, pc, sc, tx] = await Promise.all([
      productApi.listAll(),
      serviceApi.listAll(),
      promotionApi.listAll(),
      productCategoryApi.listAll(),
      serviceCategoryApi.listAll(),
      taxApi.listAll(),
    ])
    products.value = p
    services.value = s
    promotions.value = promo
    productCategories.value = pc
    serviceCategories.value = sc
    taxes.value = tx
    loadedOnce = true
  } catch (e) {
    error.value = getProblemDetailMessage(e, 'No se pudo cargar el catálogo de la tienda')
  } finally {
    loading.value = false
  }
}

function ensureLoaded(): Promise<void> {
  if (loadedOnce) return Promise.resolve()
  if (inFlight) return inFlight
  inFlight = fetchAll().finally(() => {
    inFlight = null
  })
  return inFlight
}

function upsert<T extends { id: number }>(list: { value: T[] }, item: T): void {
  const idx = list.value.findIndex((x) => x.id === item.id)
  if (idx >= 0) list.value.splice(idx, 1, item)
  else list.value = [item, ...list.value]
}

function removeFrom<T extends { id: number }>(list: { value: T[] }, id: number): void {
  list.value = list.value.filter((x) => x.id !== id)
}

export function useTienda() {
  return {
    // estado
    products,
    services,
    promotions,
    productCategories,
    serviceCategories,
    taxes,
    loading,
    error,

    // carga
    ensureLoaded,
    refresh: fetchAll,

    // productos
    async createProduct(payload: ProductPayload) {
      const created = await productApi.create(payload)
      upsert(products, created)
      return created
    },
    async updateProduct(id: number, payload: ProductPayload) {
      const updated = await productApi.update(id, payload)
      upsert(products, updated)
      return updated
    },
    async removeProduct(id: number) {
      await productApi.remove(id)
      removeFrom(products, id)
    },

    // servicios
    async createService(payload: ServicePayload) {
      const created = await serviceApi.create(payload)
      upsert(services, created)
      return created
    },
    async updateService(id: number, payload: ServicePayload) {
      const updated = await serviceApi.update(id, payload)
      upsert(services, updated)
      return updated
    },
    async removeService(id: number) {
      await serviceApi.remove(id)
      removeFrom(services, id)
    },

    // promociones
    async createPromotion(payload: PromotionPayload) {
      const created = await promotionApi.create(payload)
      upsert(promotions, created)
      return created
    },
    async updatePromotion(id: number, payload: PromotionPayload) {
      const updated = await promotionApi.update(id, payload)
      upsert(promotions, updated)
      return updated
    },
    async removePromotion(id: number) {
      await promotionApi.remove(id)
      removeFrom(promotions, id)
    },

    // categorías de producto
    async createProductCategory(name: string, description: string) {
      const created = await productCategoryApi.create({ name, description })
      upsert(productCategories, created)
      return created
    },
    async updateProductCategory(id: number, name: string, description: string) {
      const updated = await productCategoryApi.update(id, { name, description })
      upsert(productCategories, updated)
      return updated
    },
    async removeProductCategory(id: number) {
      await productCategoryApi.remove(id)
      removeFrom(productCategories, id)
    },

    // categorías de servicio
    async createServiceCategory(name: string, description: string) {
      const created = await serviceCategoryApi.create({ name, description })
      upsert(serviceCategories, created)
      return created
    },
    async updateServiceCategory(id: number, name: string, description: string) {
      const updated = await serviceCategoryApi.update(id, { name, description })
      upsert(serviceCategories, updated)
      return updated
    },
    async removeServiceCategory(id: number) {
      await serviceCategoryApi.remove(id)
      removeFrom(serviceCategories, id)
    },
  }
}
