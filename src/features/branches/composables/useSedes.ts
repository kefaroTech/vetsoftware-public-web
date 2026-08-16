import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useBranchStore } from '../stores/branch.store'
import type { SaveBranchRequest } from '../types/branch.types'

/** Code de la sede sembrada por defecto (backfill migración 180). Se marca como "Principal" (solo lectura). */
export const PRINCIPAL_BRANCH_CODE = 'PRINCIPAL'

/**
 * Composable de administración de sedes (sección Empresa). A diferencia de {@link useBranches} (que
 * alimenta el selector con solo las activas), aquí se listan TODAS las sedes (activas e inactivas) y se
 * exponen las acciones de escritura. Reusa el store para no duplicar la cache que ve el selector.
 */
export function useSedes() {
  const store = useBranchStore()
  const { branches, loading, error } = storeToRefs(store)

  // Orden estable: activas primero, luego por nombre.
  const sedes = computed(() =>
    [...branches.value].sort(
      (a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name),
    ),
  )
  const activeCount = computed(() => branches.value.filter((b) => b.active).length)
  const activeSedes = computed(() => branches.value.filter((b) => b.active))

  function isPrincipal(code: string): boolean {
    return code.toUpperCase() === PRINCIPAL_BRANCH_CODE
  }

  onMounted(() => {
    void store.fetchAll()
  })

  return {
    sedes,
    activeSedes,
    activeCount,
    loading,
    error,
    isPrincipal,
    create: (payload: SaveBranchRequest) => store.createBranch(payload),
    update: (id: number, payload: SaveBranchRequest) => store.updateBranch(id, payload),
    setActive: (id: number, active: boolean) => store.setBranchActive(id, active),
    refresh: () => store.fetchAll(true),
  }
}
