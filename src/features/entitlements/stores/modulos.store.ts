import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getProblemDetailMessage } from '@/services/http/http.client'
import { modulosApi } from '../api/modulos.api'
import type { ModuleShowcaseResponse } from '../types/modulos.types'

/**
 * El escaparate de módulos de la cuenta. Un solo store: lo consumen tanto «Tus módulos» (la
 * pantalla de compra) como `useModuloEstado` (el gating transversal de cada pantalla clínica),
 * y las dos necesitan ver exactamente los mismos datos — pedirlo dos veces desincronizaría el
 * estado que una pantalla ve del que ve la otra.
 */
export const useModulosStore = defineStore('entitlementsModulos', () => {
  const modulos = ref<ModuleShowcaseResponse[]>([])
  const cargando = ref(false)
  const error = ref<string | null>(null)

  let inFlight: Promise<void> | null = null

  async function fetch(): Promise<void> {
    cargando.value = true
    error.value = null
    try {
      modulos.value = await modulosApi.listAll()
    } catch (e: unknown) {
      modulos.value = []
      error.value = getProblemDetailMessage(e, 'No se pudieron cargar tus módulos')
    } finally {
      cargando.value = false
    }
  }

  async function cargar(force = false): Promise<void> {
    if (inFlight) return inFlight
    if (!force && modulos.value.length > 0) return
    inFlight = fetch().finally(() => {
      inFlight = null
    })
    return inFlight
  }

  function porCodigo(code: string): ModuleShowcaseResponse | undefined {
    return modulos.value.find((m) => m.code === code)
  }

  return { modulos, cargando, error, cargar, porCodigo }
})
