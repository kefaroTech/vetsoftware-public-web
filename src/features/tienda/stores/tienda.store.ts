import { defineStore } from 'pinia'
import { ref } from 'vue'
import { productApi } from '../api/product.api'
import { serviceApi } from '../api/service.api'
import { promotionApi } from '../api/promotion.api'
import { productCategoryApi } from '../api/productCategory.api'
import { serviceCategoryApi } from '../api/serviceCategory.api'
import { taxApi } from '../api/tax.api'
import type { TaxPayload } from '../types/tax.types'
import { inventoryApi } from '../api/inventory.api'
import { useCancellableLatest } from '@/composables/useLatestOnly'
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

/**
 * Tope de `productIds` por petición a `GET /inventory/stock`: el backend responde
 * 400 si se pasa. Quien pida más lotes trocea; no se sube «por si acaso».
 */
const STOCK_IDS_PER_REQUEST = 200

/**
 * Tamaño de página del barrido completo del inventario. Se pedía 500 y el backend
 * lo recortaba a 200 en silencio, así que el bucle daba 2,5× más vueltas de las
 * que su autor creía. Se pide lo que de verdad se sirve.
 */
const STOCK_PAGE_SIZE = 200

/**
 * Cota del barrido completo: 20 × 200 = 4.000 SKU. Un `do…while` sin techo contra
 * unos datos inesperados (o un `totalPages` mal calculado) cuelga la pantalla
 * pidiendo páginas para siempre.
 */
const MAX_STOCK_PAGES = 20

function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size))
  return out
}

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
  /**
   * Alcance de lo que hay en `stockByProduct`.
   *
   * `null` = se barrió el inventario COMPLETO de la sede, así que un producto que
   * no esté en el mapa es un producto con saldo cero. Un `Set` = solo se consultó
   * el saldo de esos ids (carga por `productIds`), y de todo lo demás **no se sabe
   * nada**: ahí «no está en el mapa» NO significa cero. Sin esta distinción, la
   * carga parcial pintaría agotado cualquier producto cuyo saldo no se ha pedido.
   */
  const stockKnownIds = ref<Set<number> | null>(null)
  /** Progreso del barrido completo, para que una espera larga no sea un velo mudo. */
  const stockProgress = ref<{ page: number; totalPages: number } | null>(null)
  /** El barrido completo topó con `MAX_STOCK_PAGES`: hay saldo que no se cargó. */
  const stockTruncated = ref(false)
  // F5: valuación + alertas de la sede activa.
  const valuation = ref<InventoryValuationView | null>(null)
  const alerts = ref<InventoryAlertsView | null>(null)

  // Dos lecturas con clave (la sede) que se recargan al cambiarla: cada una
  // cancela la suya y descarta la respuesta que dejó de ser la última.
  const stockTurn = useCancellableLatest()
  const insightsTurn = useCancellableLatest()

  const loading = ref(false)
  const error = ref<string | null>(null)
  let loadedOnce = false
  let inFlight: Promise<void> | null = null
  // Cache aparte de la carga acotada (`ensureCatalogs`): categorías + impuestos.
  let catalogsLoadedOnce = false
  let catalogsInFlight: Promise<void> | null = null

  /**
   * Carga el saldo de inventario de una sede y lo indexa por producto. Trae una página grande (el catálogo de una
   * sede rara vez supera unos cientos de SKU); si el backend reporta más, se recorren las páginas restantes.
   * branchId null (admin "Todas") deja el mapa vacío: el stock es por sede, no agregable en esta vista.
   */
  async function loadStock(branchId: number | null): Promise<void> {
    // Cambiar de sede mientras el bucle de páginas está en curso dejaba que el
    // mapa de la sede anterior pisara al nuevo. Abortar además corta las páginas
    // que queden por pedir, que pueden ser muchas.
    const turno = stockTurn.begin()
    stockBranchId.value = branchId
    stockTruncated.value = false
    if (branchId == null) {
      stockByProduct.value = {}
      stockKnownIds.value = null
      stockProgress.value = null
      stockLoading.value = false
      return
    }
    stockLoading.value = true
    try {
      const map: Record<number, StockView> = {}
      let page = 0
      let totalPages = 1
      do {
        const res = await inventoryApi.searchStock(
          { branchId, page, pageSize: STOCK_PAGE_SIZE },
          turno.signal,
        )
        if (!turno.isCurrent()) return
        for (const row of res.content) map[row.productId] = row
        totalPages = res.totalPages
        page += 1
        stockProgress.value = { page, totalPages: Math.min(totalPages, MAX_STOCK_PAGES) }
      } while (page < totalPages && page < MAX_STOCK_PAGES)
      // Se avisa en vez de callar: con el mapa incompleto, la vista pintaría
      // ceros de productos cuyo saldo simplemente no llegó a pedirse.
      stockTruncated.value = page >= MAX_STOCK_PAGES && page < totalPages
      stockByProduct.value = map
      stockKnownIds.value = null // barrido completo: lo que no está, está a cero
    } catch {
      if (!turno.isCurrent()) return
      // Sin permiso (inventory.read) u otro fallo: dejamos el mapa vacío sin romper POS/cuentas. La vista de
      // Inventario ya gatea su UI de stock en el permiso, así que no muestra ceros engañosos.
      stockByProduct.value = {}
      stockKnownIds.value = null
    } finally {
      if (turno.isCurrent()) {
        stockLoading.value = false
        stockProgress.value = null
      }
    }
  }

  /**
   * Saldo SOLO de los productos indicados, para quien pinta un puñado de líneas y
   * no necesita el inventario entero de la sede (el punto de venta).
   *
   * Sustituye, en ese caso, al barrido de N páginas de `loadStock`: se piden los
   * ids que faltan, troceados al tope de 200 que impone el backend, y el resultado
   * se FUNDE con lo ya conocido en vez de reemplazarlo — llamarla dos veces con
   * filtros distintos suma, no borra lo anterior.
   *
   * Los ids solo se marcan como conocidos cuando su lote ha respondido: si el turno
   * se cancela a mitad, lo no resuelto sigue siendo desconocido y se volverá a pedir.
   */
  async function loadStockFor(branchId: number | null, productIds: number[]): Promise<void> {
    if (branchId == null) {
      stockTurn.begin()
      stockBranchId.value = branchId
      stockByProduct.value = {}
      stockKnownIds.value = null
      stockLoading.value = false
      return
    }
    // Otra sede: el saldo cacheado es de un almacén distinto y no vale nada.
    if (stockBranchId.value !== branchId) {
      stockByProduct.value = {}
      stockKnownIds.value = new Set<number>()
      stockBranchId.value = branchId
    } else if (stockKnownIds.value === null) {
      // Ya hay barrido completo de esta sede: no falta nada por pedir.
      return
    }
    const known = stockKnownIds.value ?? new Set<number>()
    const pending = [...new Set(productIds)].filter((id) => !known.has(id))
    if (pending.length === 0) return

    const turno = stockTurn.begin()
    stockLoading.value = true
    /**
     * Acumulador de este barrido, y va FUERA del bucle a proposito.
     *
     * Antes se construia DENTRO, leyendo `stockKnownIds.value` — que se reasigna
     * al final de cada vuelta. Por el arco de vuelta del `for`, el tipo estrechado
     * de `stockKnownIds.value` pasaba a depender del de la constante que se estaba
     * declarando, y esa del de el: ese ciclo era el TS7022 que dejaba `vue-tsc` en
     * rojo. Sacarlo fuera lo deshace de raiz, y de paso ahorra copiar el Set entero
     * una vez por lote.
     */
    const conocidos = new Set<number>(known)
    try {
      for (const lote of chunk(pending, STOCK_IDS_PER_REQUEST)) {
        const res = await inventoryApi.searchStock(
          { branchId, productIds: lote, page: 0, pageSize: STOCK_IDS_PER_REQUEST },
          turno.signal,
        )
        if (!turno.isCurrent()) return
        const map = { ...stockByProduct.value }
        for (const row of res.content) map[row.productId] = row
        stockByProduct.value = map
        for (const id of lote) conocidos.add(id)
        // Copia nueva en cada publicacion: quien observe el ref necesita otra
        // referencia para reaccionar, y `conocidos` sigue mutando en la vuelta
        // siguiente.
        stockKnownIds.value = new Set(conocidos)
      }
    } catch {
      if (!turno.isCurrent()) return
      // Mismo criterio que `loadStock`: sin permiso o con fallo, no se inventa saldo.
      // Los ids del lote que falló siguen siendo desconocidos, así que la vista
      // muestra «sin dato» y no un cero que no ha comprobado nadie.
    } finally {
      if (turno.isCurrent()) stockLoading.value = false
    }
  }

  /**
   * ¿Se ha consultado el saldo de este producto en la sede activa?
   *
   * `false` significa «todavía no lo sé», no «no hay». Quien pinte stock tiene que
   * preguntarlo antes de tratar la ausencia en el mapa como un cero.
   */
  function isStockKnown(productId: number): boolean {
    return stockKnownIds.value === null || stockKnownIds.value.has(productId)
  }

  /**
   * Saldo + insights de una sede tras una escritura de inventario.
   *
   * Las dos recargas dependen de la escritura —que ya terminó— pero NO una de la
   * otra, así que van a la vez y la espera pasa de la suma al máximo (#254).
   * Ninguna de las dos propaga error: cada una traga el suyo y deja su parte
   * vacía, así que `all` aquí no puede descartar el resultado de la otra.
   */
  function reloadBranchStock(branchId: number | null): Promise<void> {
    return Promise.all([loadStock(branchId), loadInventoryInsights(branchId)]).then(() => undefined)
  }

  async function receiveStock(payload: ReceiveStockPayload): Promise<void> {
    await inventoryApi.receive(payload)
    await reloadBranchStock(payload.branchId ?? stockBranchId.value)
  }
  async function adjustStock(payload: AdjustStockPayload): Promise<void> {
    await inventoryApi.adjust(payload)
    await reloadBranchStock(payload.branchId ?? stockBranchId.value)
  }
  async function transferStock(payload: TransferStockPayload): Promise<void> {
    await inventoryApi.transfer(payload)
    await reloadBranchStock(stockBranchId.value)
  }
  async function setMinStock(
    productId: number,
    branchId: number | null,
    minStock: number,
  ): Promise<void> {
    await inventoryApi.setMinStock(productId, branchId, minStock)
    await loadStock(branchId ?? stockBranchId.value)
  }

  /** F5: valuación + alertas de la sede (tragan errores/403 para no romper la vista). */
  async function loadInventoryInsights(branchId: number | null): Promise<void> {
    const turno = insightsTurn.begin()
    if (branchId == null) {
      valuation.value = null
      alerts.value = null
      return
    }
    // Las dos son independientes y cada una TOLERA su propio fallo (un 403 de
    // valuación no debe borrar las alertas), así que `allSettled` y no `all`:
    // con `all` el primer rechazo descartaría el resultado de la otra y la
    // pantalla perdería media cabecera por un permiso que sí tiene (#254).
    const [v, a] = await Promise.allSettled([
      inventoryApi.valuation(branchId, turno.signal),
      inventoryApi.alerts(branchId, 30, turno.signal),
    ])
    if (!turno.isCurrent()) return
    valuation.value = v.status === 'fulfilled' ? v.value : null
    alerts.value = a.status === 'fulfilled' ? a.value : null
  }

  /** F6: consumo clínico manual; recarga stock + insights de la sede. */
  async function consumeStock(payload: ConsumeStockPayload): Promise<void> {
    await inventoryApi.consume(payload)
    await reloadBranchStock(payload.branchId ?? stockBranchId.value)
  }

  /** Conteo físico/cíclico: concilia (genera ADJUSTMENT_IN/OUT por diferencia) y recarga stock + insights. */
  async function recordCount(payload: RecordCountPayload): Promise<InventoryCountView> {
    const view = await inventoryApi.recordCount(payload)
    await reloadBranchStock(payload.branchId ?? stockBranchId.value)
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
   * Solo lo acotado: categorías de producto, categorías de servicio e impuestos.
   *
   * Es lo único que necesita un formulario de catálogo para pintar sus selectores,
   * y son decenas de filas. `ensureLoaded()` traía además los tres catálogos
   * grandes —productos, servicios y promociones, sin paginar— así que abrir el
   * modal de un impuesto pagaba el catálogo entero de la tienda.
   *
   * Si `fetchAll()` ya corrió (o está en vuelo), esto no pide nada: comparte su
   * resultado, que es un superconjunto.
   */
  function ensureCatalogs(): Promise<void> {
    if (loadedOnce || catalogsLoadedOnce) return Promise.resolve()
    if (inFlight) return inFlight
    if (catalogsInFlight) return catalogsInFlight
    catalogsInFlight = (async () => {
      try {
        const [pc, sc, tx] = await Promise.all([
          productCategoryApi.listAll(),
          serviceCategoryApi.listAll(),
          taxApi.listAll(),
        ])
        productCategories.value = pc
        serviceCategories.value = sc
        taxes.value = tx
        catalogsLoadedOnce = true
      } catch (e) {
        error.value = getProblemDetailMessage(e, 'No se pudo cargar el catálogo de la tienda')
      } finally {
        catalogsInFlight = null
      }
    })()
    return catalogsInFlight
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
  async function updateProductCategory(
    id: number,
    name: string,
    description: string,
    version: number,
  ) {
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
  async function updateServiceCategory(
    id: number,
    name: string,
    description: string,
    version: number,
  ) {
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
    stockProgress,
    stockTruncated,
    valuation,
    alerts,
    loadStock,
    loadStockFor,
    isStockKnown,
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
    ensureCatalogs,
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
