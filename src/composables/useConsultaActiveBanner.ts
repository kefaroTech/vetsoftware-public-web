import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useNuevaConsultaDraft } from '@/features/dashboard/views/consulta/nueva/composables/useNuevaConsultaDraft'

const dismissed = ref(false)

export function useConsultaActiveBanner() {
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
      if (inside) dismissed.value = false
    },
  )

  const visible = computed<boolean>(
    () => !!draft.state.owner && !isInsideWizard.value && !dismissed.value,
  )

  function dismiss() {
    dismissed.value = true
  }

  return { visible, dismiss, draft }
}
