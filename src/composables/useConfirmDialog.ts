import { storeToRefs } from 'pinia'
import { useConfirmDialogStore } from '@/stores/confirmDialog.store'

export type { ConfirmOptions, ConfirmSegment } from '@/stores/confirmDialog.store'

/**
 * Fachada del único diálogo de confirmación. Las vistas solo necesitan
 * `confirm()`; el resto del estado lo consume `AppConfirmDialog`, montado una
 * sola vez en `App.vue`.
 */
export function useConfirmDialog() {
  const store = useConfirmDialogStore()
  const state = storeToRefs(store)
  return {
    ...state,
    confirm: store.confirm,
    accept: store.accept,
    cancel: store.cancel,
  }
}
