import { ref } from 'vue'
import { prescriptionApi } from '../api/prescription.api'

/**
 * Imprime el PDF de la fórmula médica veterinaria (GET /prescriptions/{id}/export.pdf):
 * carga el PDF en un iframe oculto y abre el diálogo de impresión del navegador (NO lo descarga).
 * Reutilizable desde la pantalla de éxito de la consulta y desde el detalle en la historia clínica.
 */
export function usePrescriptionExport() {
  const exporting = ref(false)
  const error = ref<string | null>(null)

  async function exportPdf(id: number) {
    exporting.value = true
    error.value = null
    try {
      const blob = await prescriptionApi.exportPdf(id)
      const url = URL.createObjectURL(blob)

      const iframe = document.createElement('iframe')
      iframe.style.position = 'fixed'
      iframe.style.right = '0'
      iframe.style.bottom = '0'
      iframe.style.width = '0'
      iframe.style.height = '0'
      iframe.style.border = '0'
      iframe.setAttribute('aria-hidden', 'true')

      let cleaned = false
      const cleanup = () => {
        if (cleaned) return
        cleaned = true
        URL.revokeObjectURL(url)
        iframe.remove()
      }

      iframe.onload = () => {
        // Pequeño delay: el visor de PDF necesita un instante tras cargar para imprimir bien.
        window.setTimeout(() => {
          const win = iframe.contentWindow
          if (!win) {
            cleanup()
            return
          }
          win.addEventListener('afterprint', cleanup)
          win.focus()
          win.print()
          // Fallback de limpieza por si 'afterprint' no dispara (algunos visores de PDF).
          window.setTimeout(cleanup, 60000)
        }, 250)
      }

      iframe.src = url
      document.body.appendChild(iframe)
    } catch {
      error.value = 'No se pudo generar la receta.'
    } finally {
      exporting.value = false
    }
  }

  return { exporting, error, exportPdf }
}
