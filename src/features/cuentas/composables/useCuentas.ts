import { storeToRefs } from 'pinia'
import { useCuentasStore } from '../stores/cuentas.store'

/** Wrapper sobre el store de Pinia `cuentas` (mantiene la API previa). */
export function useCuentas() {
  const store = useCuentasStore()
  const {
    accounts,
    loading,
    error,
    charges,
    payments,
    detailLoading,
    petsInCharges,
    chargesByPet,
  } = storeToRefs(store)

  return {
    accounts,
    loading,
    error,
    charges,
    payments,
    detailLoading,
    petsInCharges,
    chargesByPet,
    ensureLoaded: store.ensureLoaded,
    loadAccounts: store.loadAccounts,
    loadDetail: store.loadDetail,
    refreshAccount: store.refreshAccount,
    findOpenAccountByOwner: store.findOpenAccountByOwner,
    openAccount: store.openAccount,
    addProductCharge: store.addProductCharge,
    addServiceCharge: store.addServiceCharge,
    addGeneralCharge: store.addGeneralCharge,
    addChargesBatch: store.addChargesBatch,
    addPayment: store.addPayment,
    removeCharge: store.removeCharge,
  }
}
