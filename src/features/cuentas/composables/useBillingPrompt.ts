import { useBillingPromptStore, type BillingPromptOptions } from '../stores/billingPrompt.store'

export type { BillingPromptOptions }

/** Abre el modal global de facturación (montado vía BillingPromptHost en App.vue). */
export function openBilling(opts: BillingPromptOptions): void {
  useBillingPromptStore().open(opts)
}

export function closeBilling(): void {
  useBillingPromptStore().close()
}

export function finishBilling(): void {
  useBillingPromptStore().finish()
}

export function useBillingPrompt() {
  const store = useBillingPromptStore()
  return {
    state: store.state,
    openBilling: store.open,
    closeBilling: store.close,
    finishBilling: store.finish,
  }
}
