import { defineStore } from 'pinia'
import { ref } from 'vue'
import { branchApi, type BranchResponse } from '../api/branch.api'
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

  return { branches, loading, error, loaded, selectedBranchId, fetchAll, setSelectedBranch, clear }
})

/**
 * Accesor NO reactivo de la sede seleccionada, para la capa api (fuera de componentes).
 * Espeja el patrón de `getCurrentCompanyId()`: llama al store dentro de la función (Pinia ya activo).
 */
export function getSelectedBranchId(): number | null {
  return useBranchStore().selectedBranchId
}
