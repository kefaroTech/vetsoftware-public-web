import { storeToRefs } from 'pinia'
import { useCajaStore } from '../stores/caja.store'
import type { CashMovementType, CashPaymentMethod } from '../types/caja'

const money = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

/** Formatea un monto en pesos (sin decimales, como el resto del POS). */
export function formatMoney(value: number | null | undefined): string {
  return money.format(value ?? 0)
}

const METHOD_LABELS: Record<CashPaymentMethod, string> = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia',
}

const TYPE_LABELS: Record<CashMovementType, string> = {
  SALE_IN: 'Venta',
  OPEN_ACCOUNT_IN: 'Abono',
  MANUAL_IN: 'Ingreso',
  WITHDRAWAL: 'Retiro',
  EXPENSE: 'Gasto',
  VOID_OUT: 'Reversa',
}

export function methodLabel(method: CashPaymentMethod): string {
  return METHOD_LABELS[method]
}

export function movementTypeLabel(type: CashMovementType): string {
  return TYPE_LABELS[type]
}

/** ¿El movimiento entra (+) o sale (−) de la caja? */
export function isInflow(type: CashMovementType): boolean {
  return type === 'SALE_IN' || type === 'OPEN_ACCOUNT_IN' || type === 'MANUAL_IN'
}

export function useCaja() {
  const store = useCajaStore()
  const {
    current,
    loading,
    error,
    history,
    historyTotal,
    historyPage,
    historyPageSize,
    historyTotalPages,
    historyLoading,
    openSessions,
    openSessionsLoading,
    openSessionsLoaded,
    isOpen,
    expectedByMethod,
  } = storeToRefs(store)
  return {
    current,
    loading,
    error,
    history,
    historyTotal,
    historyPage,
    historyPageSize,
    historyTotalPages,
    historyLoading,
    openSessions,
    openSessionsLoading,
    openSessionsLoaded,
    isOpen,
    expectedByMethod,
    loadCurrent: store.loadCurrent,
    open: store.open,
    addMovement: store.addMovement,
    close: store.close,
    loadHistory: store.loadHistory,
    loadOpenSessions: store.loadOpenSessions,
    setHistoryPage: store.setHistoryPage,
    exportArqueo: store.exportArqueo,
  }
}
