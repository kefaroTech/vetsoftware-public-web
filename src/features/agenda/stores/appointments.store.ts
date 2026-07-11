import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { appointmentApi } from '../api/appointment.api'
import type {
  AppointmentResponse,
  AppointmentStatus,
  CancelAppointmentRequest,
  CreateAppointmentRequest,
  RescheduleAppointmentRequest,
  UpdateAppointmentRequest,
} from '../types/appointment'
import { getProblemDetailMessage } from '@/services/http/http.client'
import { useBranchStore } from '@/features/branches/stores/branch.store'

export type OriginFilter = 'ALL' | 'APPOINTMENTS' | 'CLINICAL'

/**
 * Estado global de la Agenda de citas. La lista se pide por rango (from/to,
 * fechas inclusive) + filtros server-side (vet, estado). El rango lo fija la
 * vista a partir del cursor; los filtros disparan un refetch automático.
 */
export const useAppointmentsStore = defineStore('appointments', () => {
  const appointments = ref<AppointmentResponse[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Rango activo (lo fija la vista según el cursor del calendario).
  const from = ref<string>('')
  const to = ref<string>('')

  // Filtros
  const vetFilter = ref<number | 'ALL'>('ALL')
  const statusFilter = ref<AppointmentStatus | 'ALL'>('ALL')
  const originFilter = ref<OriginFilter>('ALL')

  function setRange(f: string, t: string): void {
    from.value = f
    to.value = t
  }

  async function load(): Promise<void> {
    if (!from.value || !to.value) return
    loading.value = true
    error.value = null
    try {
      const data = await appointmentApi.list({
        from: from.value,
        to: to.value,
        employeeId: vetFilter.value === 'ALL' ? undefined : vetFilter.value,
        status: statusFilter.value === 'ALL' ? undefined : statusFilter.value,
      })
      appointments.value = data.filter((a) => a.enabled !== false)
    } catch (e) {
      error.value = getProblemDetailMessage(e, 'No se pudieron cargar las citas')
      appointments.value = []
    } finally {
      loading.value = false
    }
  }

  async function create(payload: CreateAppointmentRequest): Promise<AppointmentResponse> {
    const created = await appointmentApi.create(payload)
    await load()
    return created
  }

  async function update(
    id: number,
    payload: UpdateAppointmentRequest,
  ): Promise<AppointmentResponse> {
    const updated = await appointmentApi.update(id, payload)
    await load()
    return updated
  }

  async function reschedule(
    id: number,
    payload: RescheduleAppointmentRequest,
  ): Promise<AppointmentResponse> {
    const updated = await appointmentApi.reschedule(id, payload)
    await load()
    return updated
  }

  async function changeStatus(
    id: number,
    status: AppointmentStatus,
  ): Promise<AppointmentResponse> {
    const updated = await appointmentApi.changeStatus(id, { status })
    await load()
    return updated
  }

  async function cancel(
    id: number,
    payload: CancelAppointmentRequest,
  ): Promise<AppointmentResponse> {
    const updated = await appointmentApi.cancel(id, payload)
    await load()
    return updated
  }

  async function remove(id: number): Promise<void> {
    await appointmentApi.remove(id)
    await load()
  }

  // Vet/estado son filtros server-side → recargar cuando cambian.
  watch([vetFilter, statusFilter], () => {
    void load()
  })
  // Multi-sucursal: la sede seleccionada es contexto server-side → recargar al cambiarla.
  watch(
    () => useBranchStore().selectedBranchId,
    () => {
      void load()
    },
  )
  // El rango (from/to) lo fija la vista, que dispara load() explícitamente al
  // montar y al navegar — así la pantalla SIEMPRE recarga al abrirse (no se usa
  // caché del store aunque el rango no haya cambiado entre visitas).

  return {
    appointments,
    loading,
    error,
    from,
    to,
    vetFilter,
    statusFilter,
    originFilter,
    setRange,
    load,
    create,
    update,
    reschedule,
    changeStatus,
    cancel,
    remove,
  }
})
