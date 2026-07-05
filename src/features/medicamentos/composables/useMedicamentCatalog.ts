import { storeToRefs } from 'pinia'
import { useMedicamentCatalogStore } from '../stores/medicamentCatalog.store'

/** Wrapper estable del store del catálogo de medicamentos (ver CLAUDE.md: store + composable). */
export function useMedicamentCatalog() {
  const store = useMedicamentCatalogStore()
  const { items, disabled, loading, error } = storeToRefs(store)
  return {
    items,
    disabled,
    loading,
    error,
    reload: store.reload,
    loadDisabled: store.loadDisabled,
    create: store.create,
    update: store.update,
    remove: store.remove,
    enable: store.enable,
  }
}
