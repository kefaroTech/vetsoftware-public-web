import { storeToRefs } from 'pinia'
import { useTiendaStore } from '../stores/tienda.store'

/**
 * Wrapper sobre el store de Pinia `tienda`. Devuelve los refs de estado (vía
 * storeToRefs) + las acciones, manteniendo la API previa de `useTienda`.
 */
export function useTienda() {
  const store = useTiendaStore()
  const {
    products,
    services,
    promotions,
    productCategories,
    serviceCategories,
    taxes,
    pausedProducts,
    pausedServices,
    pausedTaxes,
    loading,
    error,
  } = storeToRefs(store)

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
    loading,
    error,
    ensureLoaded: store.ensureLoaded,
    refresh: store.refresh,
    createProduct: store.createProduct,
    updateProduct: store.updateProduct,
    removeProduct: store.removeProduct,
    loadPausedProducts: store.loadPausedProducts,
    enableProduct: store.enableProduct,
    createService: store.createService,
    updateService: store.updateService,
    removeService: store.removeService,
    loadPausedServices: store.loadPausedServices,
    enableService: store.enableService,
    createPromotion: store.createPromotion,
    updatePromotion: store.updatePromotion,
    removePromotion: store.removePromotion,
    createProductCategory: store.createProductCategory,
    updateProductCategory: store.updateProductCategory,
    removeProductCategory: store.removeProductCategory,
    createServiceCategory: store.createServiceCategory,
    updateServiceCategory: store.updateServiceCategory,
    removeServiceCategory: store.removeServiceCategory,
    createTax: store.createTax,
    updateTax: store.updateTax,
    removeTax: store.removeTax,
    loadPausedTaxes: store.loadPausedTaxes,
    enableTax: store.enableTax,
  }
}
