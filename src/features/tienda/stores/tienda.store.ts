import { defineStore } from 'pinia'
import { ref } from 'vue'
import { productApi } from '../api/product.api'
import { serviceApi } from '../api/service.api'
import { promotionApi } from '../api/promotion.api'
import { productCategoryApi } from '../api/productCategory.api'
import { serviceCategoryApi } from '../api/serviceCategory.api'
import { taxApi, type TaxPayload } from '../api/tax.api'
import { inventoryApi } from '../api/inventory.api'
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
import type {
  AdjustStockPayload,
  ConsumeStockPayload,
  InventoryAlertsView,
  InventoryCountView,
  InventoryValuationView,
  ReceiveStockPayload,
  RecordCountPayload,
  StockView,
  TransferStockPayload,
} from '../types/inventory'

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

  // Ítems PAUSADOS (enabled=false). Se cargan bajo demanda al abrir la vista "Pausados".
  const pausedProducts = ref<ProductResponse[]>([])
  const pausedServices = ref<ServiceResponse[]>([])
  const pausedTaxes = ref<TaxResponse[]>([])

  // Inventario por sede (F4): saldo de la sede activa, indexado por productId. El stock ya no vive en el producto.
  const stockByProduct = ref<Record<number, StockView>>({})
  const stockBranchId = ref<number | null>(null)
  const stockLoading = ref(false)
  // F5: valuación + alertas de la sede activa.
  const valuation = ref<InventoryValuationView | null>(null)
  const alerts = ref<InventoryAlertsView | null>(null)

  const loading = ref(false)
  const error = ref<string | null>(null)
  let loadedOnce = false
  let inFlight: Promise<void> | null = null

  /**
   * Carga el saldo de inventario de una sede y lo indexa por producto. Trae una página grande (el catálogo de una
   * sede rara vez supera unos cientos de SKU); si el backend reporta más, se recorren las páginas restantes.
   * branchId null (admin "Todas") deja el mapa vacío: el stock es por sede, no agregable en esta vista.
   */
  async function loadStock(branchId: number | null): Promise<void> {
    stockBranchId.value = branchId
    if (branchId == null) {
      stockByProduct.value = {}
      return
    }
    stockLoading.value = true
    try {
      const map: Record<number, StockView> = {}
      const pageSize = 500
      let page = 0
      let totalPages = 1
      do {
        const res = await inventoryApi.searchStock({ branchId, page, pageSize })
        for (const row of res.content) map[row.productId] = row
        totalPages = res.totalPages
        page += 1
      } while (page < totalPages)
      stockByProduct.value = map
    } catch {
      // Sin permiso (inventory.read) u otro fallo: dejamos el mapa vacío sin romper POS/cuentas. La vista de
      // Inventario ya gatea su UI de stock en el permiso, así que no muestra ceros engañosos.
      stockByProduct.value = {}
    } finally {
      stockLoading.value = false
    }
  }

  async function receiveStock(payload: ReceiveStockPayload): Promise<void> {
    await inventoryApi.receive(payload)
    await loadStock(payload.branchId ?? stockBranchId.value)
    await loadInventoryInsights(payload.branchId ?? stockBranchId.value)
  }
  async function adjustStock(payload: AdjustStockPayload): Promise<void> {
    await inventoryApi.adjust(payload)
    await loadStock(payload.branchId ?? stockBranchId.value)
    await loadInventoryInsights(payload.branchId ?? stockBranchId.value)
  }
  async function transferStock(payload: TransferStockPayload): Promise<void> {
    await inventoryApi.transfer(payload)
    await loadStock(stockBranchId.value)
    await loadInventoryInsights(stockBranchId.value)
  }
  async function setMinStock(productId: number, branchId: number | null, minStock: number): Promise<void> {
    await inventoryApi.setMinStock(productId, branchId, minStock)
    await loadStock(branchId ?? stockBranchId.value)
  }

  /** F5: valuación + alertas de la sede (tragan errores/403 para no romper la vista). */
  async function loadInventoryInsights(branchId: number | null): Promise<void> {
    if (branchId == null) {
      valuation.value = null
      alerts.value = null
      return
    }
    try {
      valuation.value = await inventoryApi.valuation(branchId)
    } catch {
      valuation.value = null
    }
    try {
      alerts.value = await inventoryApi.alerts(branchId, 30)
    } catch {
      alerts.value = null
    }
  }

  /** F6: consumo clínico manual; recarga stock + insights de la sede. */
  async function consumeStock(payload: ConsumeStockPayload): Promise<void> {
    await inventoryApi.consume(payload)
    await loadStock(payload.branchId ?? stockBranchId.value)
    await loadInventoryInsights(payload.branchId ?? stockBranchId.value)
  }

  /** Conteo físico/cíclico: concilia (genera ADJUSTMENT_IN/OUT por diferencia) y recarga stock + insights. */
  async function recordCount(payload: RecordCountPayload): Promise<InventoryCountView> {
    const view = await inventoryApi.recordCount(payload)
    await loadStock(payload.branchId ?? stockBranchId.value)
    await loadInventoryInsights(payload.branchId ?? stockBranchId.value)
    return view
  }

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

  /**
   * Recarga forzada desde el backend, para el montaje de las pantallas de tienda
   * (regla: cada pantalla trae datos frescos al abrirse). Reutiliza la petición
   * in-flight de `ensureLoaded` para deduplicar; `ensureLoaded` sigue sirviendo
   * la caché a los modales que solo necesitan el catálogo presente.
   */
  function reload(): Promise<void> {
    loadedOnce = false
    return ensureLoaded()
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
  /** Carga (bajo demanda) los productos pausados para la vista de reactivación. */
  async function loadPausedProducts() {
    pausedProducts.value = await productApi.listDisabled()
  }
  /** Reactiva un producto pausado: sale de la lista de pausados y vuelve al catálogo activo. */
  async function enableProduct(id: number) {
    const activated = await productApi.enable(id)
    removeFrom(pausedProducts, id)
    upsert(products, activated)
    return activated
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
  async function loadPausedServices() {
    pausedServices.value = await serviceApi.listDisabled()
  }
  async function enableService(id: number) {
    const activated = await serviceApi.enable(id)
    removeFrom(pausedServices, id)
    upsert(services, activated)
    return activated
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
  async function updateProductCategory(id: number, name: string, description: string, version: number) {
    const updated = await productCategoryApi.update(id, { name, description, version })
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
  async function updateServiceCategory(id: number, name: string, description: string, version: number) {
    const updated = await serviceCategoryApi.update(id, { name, description, version })
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
  async function loadPausedTaxes() {
    pausedTaxes.value = await taxApi.listDisabled()
  }
  async function enableTax(id: number) {
    const activated = await taxApi.enable(id)
    removeFrom(pausedTaxes, id)
    upsert(taxes, activated)
    return activated
  }

  return {
    products,
    services,
    promotions,
    productCategories,
    serviceCategories,
    taxes,
    pausedProducts,
    pausedServices,
    pausedTaxes,
    stockByProduct,
    stockBranchId,
    stockLoading,
    valuation,
    alerts,
    loadStock,
    loadInventoryInsights,
    receiveStock,
    adjustStock,
    transferStock,
    setMinStock,
    consumeStock,
    recordCount,
    loading,
    error,
    ensureLoaded,
    reload,
    refresh: fetchAll,
    createProduct,
    updateProduct,
    removeProduct,
    loadPausedProducts,
    enableProduct,
    createService,
    updateService,
    removeService,
    loadPausedServices,
    enableService,
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
    loadPausedTaxes,
    enableTax,
  }
})
