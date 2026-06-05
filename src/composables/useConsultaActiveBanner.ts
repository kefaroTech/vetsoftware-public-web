import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useNuevaConsultaDraft } from '@/features/dashboard/views/consulta/nueva/composables/useNuevaConsultaDraft'
import { useConsultaActiveBannerStore } from '@/stores/consultaActiveBanner.store'

export function useConsultaActiveBanner() {
  const store = useConsultaActiveBannerStore()
  const draft = useNuevaConsultaDraft()
  const route = useRoute()

  const isInsideWizard = computed(
    () =>
      route.name === 'consulta-nueva' || route.name === 'consulta-nueva-exito',
  )

  // Auto-resetear el dismiss cuando vuelve al wizard o cambia el owner
  watch(
    [() => draft.state.owner?.id, isInsideWizard],
    ([_ownerId, inside]) => {
      if (inside) store.reset()
    },
  )

  const visible = computed<boolean>(
    () => !!draft.state.owner && !isInsideWizard.value && !store.dismissed,
  )

  function dismiss() {
    store.dismiss()
  }

  return { visible, dismiss, draft }
}
