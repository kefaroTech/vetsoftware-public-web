import { defineStore } from 'pinia'
import { ref } from 'vue'
import { branchApi, type BranchResponse, type SaveBranchRequest } from '../api/branch.api'
import { getProblemDetailMessage } from '@/services/http/http.client'

/** Sede operativa seleccionada (contexto multi-sucursal). null = "Todas las sedes". */
const SELECTED_BRANCH_KEY = 'vetsoft.branch'

function loadSelected(): number | null {
  const raw = localStorage.getItem(SELECTED_BRANCH_KEY)
  if (!raw) return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

export const useBranchStore = defineStore('branch', () => {
  const branches = ref<BranchResponse[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const loaded = ref(false)
  // Sede seleccionada, persistida entre sesiones. null = todas las sedes.
  const selectedBranchId = ref<number | null>(loadSelected())

  // Promesa in-flight para deduplicar fetches concurrentes (patrón de catálogo).
  let inFlight: Promise<void> | null = null

  async function fetchAll(force = false): Promise<void> {
    if (loaded.value && !force) return
    if (inFlight) return inFlight
    loading.value = true
    error.value = null
    inFlight = branchApi
      .listAll()
      .then((list) => {
        branches.value = list
        loaded.value = true
        // Si la sede persistida ya no existe o fue desactivada, se limpia (cae a "Todas").
        if (
          selectedBranchId.value != null &&
          !list.some((b) => b.id === selectedBranchId.value && b.active)
        ) {
          setSelectedBranch(null)
        }
      })
      .catch((e) => {
        // Sin permiso de lectura de sucursales u otro error: el selector simplemente no se mostrará.
        error.value = getProblemDetailMessage(e, 'No se pudieron cargar las sucursales')
      })
      .finally(() => {
        loading.value = false
        inFlight = null
      })
    return inFlight
  }

  /** Inserta/actualiza una sede en la cache local (mantiene el selector en sync tras un alta/edición). */
  function upsert(saved: BranchResponse): void {
    const idx = branches.value.findIndex((b) => b.id === saved.id)
    if (idx >= 0) branches.value.splice(idx, 1, saved)
    else branches.value.push(saved)
  }

  async function createBranch(payload: SaveBranchRequest): Promise<BranchResponse> {
    const saved = await branchApi.create(payload)
    upsert(saved)
    return saved
  }

  async function updateBranch(id: number, payload: SaveBranchRequest): Promise<BranchResponse> {
    const saved = await branchApi.update(id, payload)
    upsert(saved)
    return saved
  }

  async function setBranchActive(id: number, active: boolean): Promise<BranchResponse> {
    const saved = active ? await branchApi.activate(id) : await branchApi.deactivate(id)
    upsert(saved)
    // Si se desactivó la sede que estaba seleccionada como contexto, cae a "Todas las sedes".
    if (!saved.active && selectedBranchId.value === id) setSelectedBranch(null)
    return saved
  }

  function setSelectedBranch(id: number | null): void {
    selectedBranchId.value = id
    if (id == null) localStorage.removeItem(SELECTED_BRANCH_KEY)
    else localStorage.setItem(SELECTED_BRANCH_KEY, String(id))
  }

  /** Limpia la cache (no la selección persistida) — usar al cerrar sesión. */
  function clear(): void {
    branches.value = []
    loaded.value = false
    error.value = null
  }

  return {
    branches,
    loading,
    error,
    loaded,
    selectedBranchId,
    fetchAll,
    setSelectedBranch,
    createBranch,
    updateBranch,
    setBranchActive,
    clear,
  }
})

/**
 * Accesor NO reactivo de la sede seleccionada, para la capa api (fuera de componentes).
 * Espeja el patrón de `getCurrentCompanyId()`: llama al store dentro de la función (Pinia ya activo).
 */
export function getSelectedBranchId(): number | null {
  return useBranchStore().selectedBranchId
}
