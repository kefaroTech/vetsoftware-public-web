import { defineStore } from 'pinia'
import { ref } from 'vue'

// Ancho del rollo de la impresora térmica. No hay forma fiable de detectarlo desde el navegador
// (la plataforma web no expone la impresora ni su papel), así que es una preferencia POR DISPOSITIVO
// que el usuario elige una vez y queda guardada en localStorage (la impresora es física al equipo).
export type ReceiptWidth = '58' | '80'

const STORAGE_KEY = 'vetrina:receipt-width'

export const useReceiptSettingsStore = defineStore('receiptSettings', () => {
  const stored = localStorage.getItem(STORAGE_KEY)
  const width = ref<ReceiptWidth>(stored === '58' ? '58' : '80')

  function setWidth(w: ReceiptWidth): void {
    width.value = w
    localStorage.setItem(STORAGE_KEY, w)
  }

  return { width, setWidth }
})
