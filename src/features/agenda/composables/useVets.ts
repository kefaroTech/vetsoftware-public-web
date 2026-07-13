import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useVetsStore } from '../stores/vets.store'

/** Wrapper del store de veterinarios asignables (empleados con rol VET). */
export function useVets(autoload = true) {
  const store = useVetsStore()
  const { vets, loading, error } = storeToRefs(store)

  if (autoload) {
    // Siempre recargar al abrir la pantalla (force): los empleados con rol VET pueden haber cambiado
    // (nuevos veterinarios, asignaciones de rol). No se usa la caché.
    onMounted(() => void store.load(true))
  }

  return {
    vets,
    loading,
    error,
    load: store.load,
    findById: store.findById,
  }
}
