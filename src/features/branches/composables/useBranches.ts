import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useBranchStore } from '../stores/branch.store'
import { useAuthorization } from '@/features/auth/composables/useAuthorization'

/** Valor de BaseSelect para "Todas las sedes" (BaseSelect maneja value string, no null). */
export const ALL_BRANCHES = ''

/**
 * Wrapper del store de sucursales (patrón de catálogo). Expone las opciones para el selector, el v-model string
 * para BaseSelect y la selección persistida.
 *
 * Multi-sucursal: las opciones se acotan al alcance del usuario. El admin ve todas las sedes activas + "Todas las
 * sedes" (null = sin filtro). Un no-admin ve SOLO sus sedes activas asignadas y NO tiene "Todas" — el backend
 * rechaza operar/listar sin `branchId` cuando tiene varias, así que siempre debe haber una sede concreta elegida.
 */
export function useBranches() {
  const store = useBranchStore()
  const { branches, loading, error, selectedBranchId } = storeToRefs(store)
  const { branchIds } = useAuthorization()

  const activeBranches = computed(() => branches.value.filter((b) => b.active))
  // Sedes visibles para el selector global: siempre las asignadas explícitamente al empleado.
  const visibleBranches = computed(() =>
    activeBranches.value.filter((b) => branchIds.value.includes(b.id)),
  )
  // Sedes asignadas al usuario (activas ∩ me.branchIds), también usadas por formularios de creación.
  const assignedBranches = computed(() =>
    activeBranches.value.filter((b) => branchIds.value.includes(b.id)),
  )

  const options = computed(() => {
    const branchOpts = visibleBranches.value.map((b) => ({
      value: String(b.id),
      // Nombre de la sede + ciudad ("Principal - Bogotá") para desambiguar sedes homónimas en distintas ciudades.
      label: b.city?.name ? `${b.name} - ${b.city.name}` : b.name,
    }))
    return branchOpts
  })

  // v-model string para BaseSelect: id -> string, null -> ''.
  const selectedValue = computed({
    get: () => (selectedBranchId.value == null ? ALL_BRANCHES : String(selectedBranchId.value)),
    set: (v: string) => store.setSelectedBranch(v === ALL_BRANCHES ? null : Number(v)),
  })

  // El selector se muestra si el usuario tiene al menos una sede visible.
  const hasBranches = computed(() => visibleBranches.value.length > 0)
  // Multi-sede real (≥2 sedes visibles): p.ej. para decidir si mostrar el selector de sede en formularios.
  const hasMultipleBranches = computed(() => visibleBranches.value.length > 1)

  // El invariante "nunca sin sede concreta, nunca una fuera del alcance" ya NO vive aquí: lo
  // garantiza el store (`resolveSelectedBranch`), que además lo dispara al abrirse la sesión.
  // Mientras estuvo en este `watch` solo se cumplía a partir del montaje de este composable, y
  // hasta entonces `selectedBranchId` era null de verdad: las escrituras de esa ventana salían
  // sin `branchId` y volvían como 400 (issue #201).
  onMounted(() => {
    void store.fetchAll()
  })

  return {
    options,
    visibleBranches,
    assignedBranches,
    selectedValue,
    selectedBranchId,
    hasBranches,
    hasMultipleBranches,
    loading,
    error,
    setSelectedBranch: store.setSelectedBranch,
    refresh: () => store.fetchAll(true),
  }
}
