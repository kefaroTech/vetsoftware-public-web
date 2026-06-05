import { defineStore } from 'pinia'
import { ref } from 'vue'

/** Estado del "dismiss" del banner de consulta en curso. */
export const useConsultaActiveBannerStore = defineStore('consultaActiveBanner', () => {
  const dismissed = ref(false)

  function dismiss() {
    dismissed.value = true
  }
  function reset() {
    dismissed.value = false
  }

  return { dismissed, dismiss, reset }
})
