import { ref } from 'vue'
import { laboratorioInternoApi } from '../api/laboratorioInterno.api'
import { BOARD_STATUSES } from '../types/lab'
import type { LaboratoryTestResponse } from '@/features/dashboard/views/consulta/nueva/types/laboratoryTest.types'
import type { LaboratoryTestStatus } from '@/types/domain'
import { getProblemDetailMessage } from '@/services/http/http.client'

/** Estado del tablero activo (Bandeja de muestras) + transiciones de estado. */
export function useLabQueue() {
  const items = ref<LaboratoryTestResponse[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function load() {
    loading.value = true
    error.value = null
    try {
      const page = await laboratorioInternoApi.search({
        statuses: BOARD_STATUSES,
        page: 0,
        pageSize: 200,
      })
      items.value = page.content
    } catch (e) {
      error.value = getProblemDetailMessage(e, 'No se pudo cargar la bandeja')
    } finally {
      loading.value = false
    }
  }

  /** Cambia el estado de una muestra y reconcilia la lista local. */
  async function transition(
    item: LaboratoryTestResponse,
    to: LaboratoryTestStatus,
  ): Promise<LaboratoryTestResponse> {
    const updated = await laboratorioInternoApi.changeStatus(item.id, to)
    const idx = items.value.findIndex((i) => i.id === item.id)
    if ((BOARD_STATUSES as string[]).includes(updated.status)) {
      if (idx >= 0) items.value.splice(idx, 1, updated)
      else items.value.push(updated)
    } else if (idx >= 0) {
      // COMPLETED / CANCELLED salen del tablero (van al histórico)
      items.value.splice(idx, 1)
    }
    return updated
  }

  return { items, loading, error, load, transition }
}
