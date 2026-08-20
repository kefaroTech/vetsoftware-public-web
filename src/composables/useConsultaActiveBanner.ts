import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useNuevaConsultaDraft } from '@/features/dashboard/views/consulta/nueva/composables/useNuevaConsultaDraft'
import { useConsultaActiveBannerStore } from '@/stores/consultaActiveBanner.store'
import { useAuthStore } from '@/features/auth/stores/auth.store'

export function useConsultaActiveBanner() {
  const store = useConsultaActiveBannerStore()
  const auth = useAuthStore()
  const draft = useNuevaConsultaDraft()
  const route = useRoute()

  const isInsideWizard = computed(
    () => route.name === 'consulta-nueva' || route.name === 'consulta-nueva-exito',
  )

  // Auto-resetear el dismiss cuando vuelve al wizard o cambia el owner
  watch([() => draft.state.owner?.id, isInsideWizard], ([_ownerId, inside]) => {
    if (inside) store.reset()
  })

  // `isAuthenticated` es la primera condición y no una comodidad: el banner se monta
  // fuera del RouterView, de modo que sin ella se pintaba sobre la propia pantalla de
  // login —con el nombre de la mascota y el del propietario del turno anterior— sin
  // que nadie hubiera iniciado sesión. App.vue ya no lo monta sin sesión; esto lo
  // sostiene igual si mañana se monta desde otro sitio.
  const visible = computed<boolean>(
    () => auth.isAuthenticated && !!draft.state.owner && !isInsideWizard.value && !store.dismissed,
  )

  function dismiss() {
    store.dismiss()
  }

  return { visible, dismiss, draft }
}
