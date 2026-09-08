import { describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { useModuloEstado } from '@/features/entitlements/composables/useModuloEstado'
import { useModulosStore } from '@/features/entitlements/stores/modulos.store'
import type { ModuleShowcaseResponse } from '@/features/entitlements/types/modulos.types'

/**
 * El estado degradado de un módulo, resuelto en el cliente a partir del escaparate de
 * `GET /subscriptions/modules`. Se prueba montando un componente mínimo (`onMounted` solo corre
 * dentro de una instancia) con el store YA poblado, para que el `cargar()` automático no dispare
 * una llamada de red durante la prueba.
 */

function montar(moduleCode: string) {
  let resultado!: ReturnType<typeof useModuloEstado>
  const wrapper = mount(
    defineComponent({
      setup() {
        resultado = useModuloEstado(moduleCode)
        return () => null
      },
    }),
  )
  return { wrapper, resultado }
}

function sembrar(...modulos: ModuleShowcaseResponse[]) {
  useModulosStore().modulos = modulos
}

function modulo(over: Partial<ModuleShowcaseResponse> = {}): ModuleShowcaseResponse {
  return {
    code: 'LAB_IMAGING',
    name: 'Laboratorio e imagen',
    state: 'FREE_LIMITED',
    ceilings: [],
    ...over,
  }
}

describe('useModuloEstado · sin dato no se asume degradado (R14)', () => {
  it('un módulo ausente del escaparate es FULL, nunca READ_ONLY por omisión', () => {
    sembrar()
    const { resultado } = montar('SCHEDULING')

    expect(resultado.estado.value).toBe('FULL')
    expect(resultado.esSoloLectura.value).toBe(false)
    expect(resultado.banner.value).toBeNull()
  })
})

describe('useModuloEstado · FREE_LIMITED', () => {
  it('bajo el umbral: sin banner', () => {
    sembrar(
      modulo({
        ceilings: [{ dimensionCode: 'ANIMAL', used: 10, limit: 100, enforcement: 'BLOCK' }],
      }),
    )
    const { resultado } = montar('LAB_IMAGING')

    expect(resultado.estado.value).toBe('FREE_LIMITED')
    expect(resultado.banner.value).toBeNull()
  })

  it('al 80 % del techo: banner de aviso', () => {
    sembrar(
      modulo({
        ceilings: [{ dimensionCode: 'ANIMAL', used: 80, limit: 100, enforcement: 'BLOCK' }],
      }),
    )
    const { resultado } = montar('LAB_IMAGING')

    expect(resultado.banner.value?.tono).toBe('warning')
  })

  it('techo agotado con enforcement BLOCK: hay texto de tope', () => {
    sembrar(
      modulo({
        ceilings: [{ dimensionCode: 'ANIMAL', used: 100, limit: 100, enforcement: 'BLOCK' }],
      }),
    )
    const { resultado } = montar('LAB_IMAGING')

    expect(resultado.techoAlcanzadoTexto.value).toContain('Llegaste al tope gratuito')
    expect(resultado.techoAlcanzadoTexto.value).toContain('(100)')
  })

  it('techo agotado con enforcement WARN: no hay texto de tope', () => {
    sembrar(
      modulo({
        ceilings: [{ dimensionCode: 'ANIMAL', used: 100, limit: 100, enforcement: 'WARN' }],
      }),
    )
    const { resultado } = montar('LAB_IMAGING')

    expect(resultado.techoAlcanzadoTexto.value).toBeNull()
  })
})

describe('useModuloEstado · READ_ONLY', () => {
  it('bloquea la creación y pinta el banner persistente en tono error', () => {
    sembrar(modulo({ state: 'EXPIRED_READ_ONLY', name: 'Laboratorio e imagen' }))
    const { resultado } = montar('LAB_IMAGING')

    expect(resultado.estado.value).toBe('READ_ONLY')
    expect(resultado.esSoloLectura.value).toBe(true)
    expect(resultado.banner.value?.tono).toBe('error')
    expect(resultado.banner.value?.texto).toContain('Laboratorio e imagen')
    expect(resultado.banner.value?.texto).toContain('consultar e imprimir')
  })
})
