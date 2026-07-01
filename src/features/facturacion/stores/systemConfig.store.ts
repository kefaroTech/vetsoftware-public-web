import { defineStore } from 'pinia'
import { ref } from 'vue'
import { systemConfigApi, UVT_PROPERTY } from '../api/systemConfig.api'

/**
 * Configuración general del sistema. Hoy solo el UVT vigente (COP), fuente de verdad del umbral de
 * Factura electrónica (> 5 UVT). Se carga una vez (cache) y se usa de forma reactiva vía `useFeUvt`.
 *
 * Default = UVT 2025 mientras carga el backend (o si la lectura falla por red/permiso): así el umbral
 * funciona desde el primer render sin bloquear, y se corrige solo al llegar el valor real.
 */
const DEFAULT_UVT = 49_799

export const useSystemConfigStore = defineStore('systemConfig', () => {
  const uvtValue = ref(DEFAULT_UVT)
  const loaded = ref(false)
  let inflight: Promise<void> | null = null

  async function load(): Promise<void> {
    try {
      const configs = await systemConfigApi.get()
      const uvt = configs?.find((c) => c.propertyName === UVT_PROPERTY)
      const parsed = Number(uvt?.value)
      if (Number.isFinite(parsed) && parsed > 0) uvtValue.value = parsed
      loaded.value = true
    } catch {
      // Sin permiso/red: se mantiene el default; no bloquea POS ni cierre de cuenta.
    }
  }

  function ensureLoaded(): Promise<void> {
    if (loaded.value) return Promise.resolve()
    if (!inflight) inflight = load().finally(() => (inflight = null))
    return inflight
  }

  return { uvtValue, loaded, ensureLoaded, load }
})
