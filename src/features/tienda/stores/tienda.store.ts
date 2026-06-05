import { defineStore } from 'pinia'
import { ref } from 'vue'
import { productApi } from '../api/product.api'
import { serviceApi } from '../api/service.api'
import { promotionApi } from '../api/promotion.api'
import { productCategoryApi } from '../api/productCategory.api'
import { serviceCategoryApi } from '../api/serviceCategory.api'
import { taxApi, type TaxPayload } from '../api/tax.api'
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

function upsert<T extends { id: number }>(list: { value: T[] }, item: T): void {
  const idx = list.value.findIndex((x) => x.id === item.id)
  if (idx >= 0) list.value.splice(idx, 1, item)
  else list.value = [item, ...list.value]
}

function removeFrom<T extends { id: number }>(list: { value: T[] }, id: number): void {
  list.value = list.value.filter((x) => x.id !== id)
}

/**
 * Store GLOBAL de la Tienda (catálogos + promos). El estado vive en Pinia para
 * que POS, Inventario, Servicios y Promociones compartan siempre el mismo
 * catálogo al navegar entre pestañas.
 */
export const useTiendaStore = defineStore('tienda', () => {
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

  async function createProduct(payload: ProductPayload) {
    const created = await productApi.create(payload)
    upsert(products, created)
    return created
  }
  async function updateProduct(id: number, payload: ProductPayload) {
    const updated = await productApi.update(id, payload)
    upsert(products, updated)
    return updated
  }
  async function removeProduct(id: number) {
    await productApi.remove(id)
    removeFrom(products, id)
  }

  async function createService(payload: ServicePayload) {
    const created = await serviceApi.create(payload)
    upsert(services, created)
    return created
  }
  async function updateService(id: number, payload: ServicePayload) {
    const updated = await serviceApi.update(id, payload)
    upsert(services, updated)
    return updated
  }
  async function removeService(id: number) {
    await serviceApi.remove(id)
    removeFrom(services, id)
  }

  async function createPromotion(payload: PromotionPayload) {
    const created = await promotionApi.create(payload)
    upsert(promotions, created)
    return created
  }
  async function updatePromotion(id: number, payload: PromotionPayload) {
    const updated = await promotionApi.update(id, payload)
    upsert(promotions, updated)
    return updated
  }
  async function removePromotion(id: number) {
    await promotionApi.remove(id)
    removeFrom(promotions, id)
  }

  async function createProductCategory(name: string, description: string) {
    const created = await productCategoryApi.create({ name, description })
    upsert(productCategories, created)
    return created
  }
  async function updateProductCategory(id: number, name: string, description: string) {
    const updated = await productCategoryApi.update(id, { name, description })
    upsert(productCategories, updated)
    return updated
  }
  async function removeProductCategory(id: number) {
    await productCategoryApi.remove(id)
    removeFrom(productCategories, id)
  }

  async function createServiceCategory(name: string, description: string) {
    const created = await serviceCategoryApi.create({ name, description })
    upsert(serviceCategories, created)
    return created
  }
  async function updateServiceCategory(id: number, name: string, description: string) {
    const updated = await serviceCategoryApi.update(id, { name, description })
    upsert(serviceCategories, updated)
    return updated
  }
  async function removeServiceCategory(id: number) {
    await serviceCategoryApi.remove(id)
    removeFrom(serviceCategories, id)
  }

  async function createTax(payload: TaxPayload) {
    const created = await taxApi.create(payload)
    upsert(taxes, created)
    return created
  }
  async function updateTax(id: number, payload: TaxPayload) {
    const updated = await taxApi.update(id, payload)
    upsert(taxes, updated)
    return updated
  }
  async function removeTax(id: number) {
    await taxApi.remove(id)
    removeFrom(taxes, id)
  }

  return {
    products,
    services,
    promotions,
    productCategories,
    serviceCategories,
    taxes,
    loading,
    error,
    ensureLoaded,
    refresh: fetchAll,
    createProduct,
    updateProduct,
    removeProduct,
    createService,
    updateService,
    removeService,
    createPromotion,
    updatePromotion,
    removePromotion,
    createProductCategory,
    updateProductCategory,
    removeProductCategory,
    createServiceCategory,
    updateServiceCategory,
    removeServiceCategory,
    createTax,
    updateTax,
    removeTax,
  }
})
