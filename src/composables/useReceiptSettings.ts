import { storeToRefs } from 'pinia'
import { useReceiptSettingsStore, type ReceiptWidth } from '@/stores/receiptSettings.store'

export type { ReceiptWidth }

export function useReceiptSettings() {
  const store = useReceiptSettingsStore()
  const { width } = storeToRefs(store)
  return { width, setWidth: store.setWidth }
}
