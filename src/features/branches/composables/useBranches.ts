import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useBranchStore } from '../stores/branch.store'

/** Valor de BaseSelect para "Todas las sedes" (BaseSelect maneja value string, no null). */
export const ALL_BRANCHES = ''

/**
 * Wrapper del store de sucursales (patrón de catálogo). Expone las opciones para el selector (solo sedes
 * ACTIVAS + "Todas las sedes"), el v-model string para BaseSelect y la selección persistida.
 */
export function useBranches() {
  const store = useBranchStore()
  const { branches, loading, error, selectedBranchId } = storeToRefs(store)

  const activeBranches = computed(() => branches.value.filter((b) => b.active))

  const options = computed(() => [
    { value: ALL_BRANCHES, label: 'Todas las sedes' },
    ...activeBranches.value.map((b) => ({ value: String(b.id), label: b.name })),
  ])

  // v-model string para BaseSelect: id -> string, null -> ''.
  const selectedValue = computed({
    get: () => (selectedBranchId.value == null ? ALL_BRANCHES : String(selectedBranchId.value)),
    set: (v: string) => store.setSelectedBranch(v === ALL_BRANCHES ? null : Number(v)),
  })

  // El selector solo tiene sentido en empresas multi-sede (≥2 sedes activas).
  const hasMultipleBranches = computed(() => activeBranches.value.length > 1)

  onMounted(() => {
    void store.fetchAll()
  })

  return {
    options,
    selectedValue,
    selectedBranchId,
    hasMultipleBranches,
    loading,
    error,
    setSelectedBranch: store.setSelectedBranch,
    refresh: () => store.fetchAll(true),
  }
}
