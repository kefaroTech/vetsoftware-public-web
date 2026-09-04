import { computed, ref, watch } from 'vue'
import { appointmentApi } from '@/features/agenda/api/appointment.api'
import { isoFromDate } from '@/features/agenda/composables/dateUtils'
import type { AppointmentResponse } from '@/features/agenda/types/appointment'
import { useBranchStore } from '@/features/branches/stores/branch.store'
import { useAuthorization } from '@/features/auth/composables/useAuthorization'
import { PERMISSIONS } from '@/constants/permissions'
import { useToast } from '@/composables/useToast'
import { getProblemDetailMessage } from '@/services/http/http.client'

const ERROR_TITLE = 'No se pudieron cargar las citas de hoy'

/**
 * Una cita puede no tener animal: la agendada a un contacto libre solo trae
 * `clientName`, y ahí ese nombre es todo el paciente que se conoce.
 */
export function appointmentSubject(appointment: AppointmentResponse): string {
  return appointment.animal?.name ?? appointment.clientName ?? ''
}

/**
 * Citas de hoy de la sede activa. Estado por instancia y no store de Pinia: no
 * sale del home, y compartir el de la agenda arrastraría sus filtros de
 * veterinario y de estado a unas cifras que se presentan como las del día.
 */
export function useTodayAgenda() {
  const toast = useToast()
  const branch = useBranchStore()
  const { can } = useAuthorization()
  const canRead = can(PERMISSIONS.APPOINTMENT_READ)

  const appointments = ref<AppointmentResponse[]>([])
  const loading = ref(false)
  const loaded = ref(false)
  const error = ref<string | null>(null)

  const ready = computed(() => loaded.value && error.value === null)

  async function refresh(): Promise<void> {
    if (!canRead.value) return
    const today = isoFromDate(new Date())
    loading.value = true
    error.value = null
    try {
      const list = await appointmentApi.list({ from: today, to: today })
      appointments.value = list
        .filter((a) => a.enabled !== false)
        .sort((a, b) => a.startAt.localeCompare(b.startAt))
      loaded.value = true
    } catch (e) {
      appointments.value = []
      error.value = getProblemDetailMessage(e, ERROR_TITLE)
      toast.errorFrom(ERROR_TITLE, e)
    } finally {
      loading.value = false
    }
  }

  // Ni el permiso ni la sede están resueltos al montar: `/auth/me` y el listado
  // de sedes llegan después. Sin observarlos, el tablero pediría las citas de
  // «todas las sedes» una sola vez y se quedaría con ellas.
  watch([canRead, () => branch.selectedBranchId], () => void refresh(), { immediate: true })

  return { appointments, canRead, loading, error, ready, refresh }
}
