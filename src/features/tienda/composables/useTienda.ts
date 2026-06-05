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
    loading,
    error,
    ensureLoaded: store.ensureLoaded,
    refresh: store.refresh,
    createProduct: store.createProduct,
    updateProduct: store.updateProduct,
    removeProduct: store.removeProduct,
    createService: store.createService,
    updateService: store.updateService,
    removeService: store.removeService,
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
  }
}
