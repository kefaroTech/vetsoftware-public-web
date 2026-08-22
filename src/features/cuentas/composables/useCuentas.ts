import { storeToRefs } from 'pinia'
import { useCuentasStore } from '../stores/cuentas.store'

/** Wrapper sobre el store de Pinia `cuentas` (mantiene la API previa). */
export function useCuentas() {
  const store = useCuentasStore()
  const {
    accounts,
    loading,
    error,
    summary,
    charges,
    payments,
    detailLoading,
    taxBreakdown,
    petsInCharges,
    chargesByPet,
  } = storeToRefs(store)

  return {
    accounts,
    loading,
    error,
    summary,
    charges,
    payments,
    detailLoading,
    taxBreakdown,
    petsInCharges,
    chargesByPet,
    searchPage: store.searchPage,
    loadSummary: store.loadSummary,
    loadDetail: store.loadDetail,
    fetchAccount: store.fetchAccount,
    refreshAccount: store.refreshAccount,
    findOpenAccountByOwner: store.findOpenAccountByOwner,
    openAccount: store.openAccount,
    addProductCharge: store.addProductCharge,
    addServiceCharge: store.addServiceCharge,
    addGeneralCharge: store.addGeneralCharge,
    addChargeUnit: store.addChargeUnit,
    addGeneralChargeNoRefresh: store.addGeneralChargeNoRefresh,
    addChargesBatch: store.addChargesBatch,
    addPayment: store.addPayment,
    addPaymentNoRefresh: store.addPaymentNoRefresh,
    changeAccountStatus: store.changeAccountStatus,
    voidPayment: store.voidPayment,
    voidCharge: store.voidCharge,
  }
}
