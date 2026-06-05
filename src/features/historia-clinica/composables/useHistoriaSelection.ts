import { useHistoriaSelectionStore } from '../stores/historiaSelection.store'

export function useHistoriaSelection() {
  const store = useHistoriaSelectionStore()
  return {
    state: store.state,
    setOwner: store.setOwner,
    setPet: store.setPet,
    reset: store.reset,
  }
}
