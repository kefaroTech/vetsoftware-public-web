import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  medicamentApi,
  type CreateMedicamentPayload,
  type MedicamentResponse,
  type UpdateMedicamentPayload,
} from '@/features/dashboard/views/consulta/nueva/api/medicament.api'
import { getProblemDetailMessage } from '@/services/http/http.client'

/**
 * Catálogo de medicamentos para la pantalla de administración. Lista los disponibles
 * (globales + propios) como "activos" y los pausados propios para reactivar.
 */
export const useMedicamentCatalogStore = defineStore('medicamentCatalog', () => {
  const items = ref<MedicamentResponse[]>([])
  const disabled = ref<MedicamentResponse[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  function upsert(item: MedicamentResponse): void {
    const idx = items.value.findIndex((m) => m.id === item.id)
    if (idx >= 0) items.value.splice(idx, 1, item)
    else items.value = [item, ...items.value]
  }

  async function loadActive(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      items.value = await medicamentApi.listAvailable()
    } catch (e) {
      error.value = getProblemDetailMessage(e, 'No se pudieron cargar los medicamentos')
    } finally {
      loading.value = false
    }
  }

  /** Recarga forzada al abrir la pantalla (no cachear datos de pantalla). */
  function reload(): Promise<void> {
    return loadActive()
  }

  async function loadDisabled(): Promise<void> {
    disabled.value = await medicamentApi.listDisabled()
  }

  async function create(payload: CreateMedicamentPayload): Promise<MedicamentResponse> {
    const created = await medicamentApi.create(payload)
    upsert(created)
    return created
  }

  async function update(id: number, payload: UpdateMedicamentPayload): Promise<MedicamentResponse> {
    const updated = await medicamentApi.update(id, payload)
    upsert(updated)
    return updated
  }

  async function remove(id: number): Promise<void> {
    await medicamentApi.remove(id)
    items.value = items.value.filter((m) => m.id !== id)
  }

  async function enable(id: number): Promise<MedicamentResponse> {
    const enabled = await medicamentApi.enable(id)
    disabled.value = disabled.value.filter((m) => m.id !== id)
    upsert(enabled)
    return enabled
  }

  return {
    items,
    disabled,
    loading,
    error,
    loadActive,
    reload,
    loadDisabled,
    create,
    update,
    remove,
    enable,
  }
})
