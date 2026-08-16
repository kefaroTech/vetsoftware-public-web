import { ref } from 'vue'
import { clinicalHistoryApi } from '../api/clinicalHistory.api'
import type { ClinicalHistoryParams } from '../types/clinicalHistory.types'

export function useClinicalHistoryExport() {
  const exporting = ref(false)
  const error = ref<string | null>(null)

  async function exportPdf(
    animalId: number,
    params: ClinicalHistoryParams = {},
    filenameHint?: string,
  ) {
    exporting.value = true
    error.value = null
    try {
      const blob = await clinicalHistoryApi.exportPdf(animalId, params)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filenameHint ?? `historia-clinica-${animalId}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      error.value = 'No se pudo exportar la historia clínica.'
    } finally {
      exporting.value = false
    }
  }

  return { exporting, error, exportPdf }
}
