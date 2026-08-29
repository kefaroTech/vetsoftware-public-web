import { storeToRefs } from 'pinia'
import { onMounted } from 'vue'
import { usePlansStore } from '../stores/plans.store'

/**
 * API estable del catálogo público para los componentes.
 *
 * Wrapper del store, en la línea de `useSpecies` / `useBreeds`: los componentes
 * no conocen el store, solo esto. `autoload` fuerza la recarga al montar, que es
 * la regla del repo para toda pantalla que se abre.
 */
export function usePlanes(autoload = true) {
  const store = usePlansStore()
  const { plans, currency, priceValidFrom, loading, error, loaded, recommended } =
    storeToRefs(store)

  if (autoload) {
    onMounted(() => {
      void store.load(true)
    })
  }

  return {
    plans,
    currency,
    priceValidFrom,
    loading,
    error,
    loaded,
    recommended,
    findByCode: store.findByCode,
    refresh: () => store.load(true),
  }
}
