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

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
}

/** Tiempo transcurrido en la unidad más grande que aplique: min → h → d. */
export function formatDuration(openedAt: string, closedAt: string | null): string {
  const start = new Date(openedAt).getTime()
  const end = closedAt ? new Date(closedAt).getTime() : Date.now()
  const minutes = Math.max(0, Math.floor((end - start) / 60_000))

  if (minutes < 60) return minutes + ' min'

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (hours < 24) return hours + ' h' + (remainingMinutes ? ' ' + remainingMinutes + ' min' : '')

  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  return days + ' d' + (remainingHours ? ' ' + remainingHours + ' h' : '')
}

/** El backend puede no traer el nombre; el id siempre identifica la fila. */
export function employeeLabel(employeeName: string | null, employeeId: number | null): string {
  if (employeeName?.trim()) return employeeName
  return employeeId == null ? '—' : 'Empleado #' + employeeId
}

export function branchLabel(branchName: string | null, branchId: number): string {
  return branchName?.trim() || 'Sede #' + branchId
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
