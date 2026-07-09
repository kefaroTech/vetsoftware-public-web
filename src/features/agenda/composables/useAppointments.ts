import { storeToRefs } from 'pinia'
import { useAppointmentsStore } from '../stores/appointments.store'

/**
 * Wrapper del store de Pinia `appointments` (regla dura del CLAUDE.md:
 * estado global en Pinia + composable con storeToRefs).
 */
export function useAppointments() {
  const store = useAppointmentsStore()
  const { appointments, loading, error, from, to, vetFilter, statusFilter, originFilter } =
    storeToRefs(store)

  return {
    // estado
    appointments,
    loading,
    error,
    from,
    to,
    vetFilter,
    statusFilter,
    originFilter,
    // acciones
    setRange: store.setRange,
    load: store.load,
    create: store.create,
    update: store.update,
    reschedule: store.reschedule,
    changeStatus: store.changeStatus,
    cancel: store.cancel,
    remove: store.remove,
  }
}
