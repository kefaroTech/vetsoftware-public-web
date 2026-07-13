import { defineStore } from 'pinia'
import { ref } from 'vue'
import { employeeApi } from '@/features/employees/api/employee.api'
import { getProblemDetailMessage } from '@/services/http/http.client'
import { apptInitials } from '../types/appointment'

export interface Vet {
  id: number
  name: string
  initials: string
  /** Sedes asignadas al veterinario (para filtrar por la sede elegida en la cita). */
  branchIds: number[]
}

/**
 * Cache de veterinarios asignables (empleados con rol VET) de la empresa.
 * Compartido entre el filtro de la agenda y el modal de citas.
 */
export const useVetsStore = defineStore('agendaVets', () => {
  const vets = ref<Vet[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  let inFlight: Promise<void> | null = null

  async function load(force = false): Promise<void> {
    // Dedup de llamadas concurrentes (una sola petición aunque varios componentes la pidan a la vez).
    if (inFlight) return inFlight
    // La caché solo aplica cuando NO se fuerza: al abrir la pantalla/modal se llama con force=true y siempre recarga.
    if (!force && vets.value.length > 0) return
    loading.value = true
    error.value = null
    inFlight = employeeApi
      .listByCompany()
      .then((list) => {
        vets.value = list
          .filter((e) => e.roles.some((r) => r.code === 'VET'))
          .map((e) => ({
            id: e.id,
            name: e.name,
            initials: apptInitials(e.name),
            branchIds: e.branches.map((b) => b.id),
          }))
      })
      .catch((e) => {
        error.value = getProblemDetailMessage(e, 'No se pudieron cargar los veterinarios')
        vets.value = []
      })
      .finally(() => {
        loading.value = false
        inFlight = null
      })
    return inFlight
  }

  function findById(id: number | null | undefined): Vet | null {
    if (id == null) return null
    return vets.value.find((v) => v.id === id) ?? null
  }

  return { vets, loading, error, load, findById }
})
