import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { effectScope, nextTick, ref } from 'vue'
import type { CatalogoComercial, PaqueteCatalogo } from '@/features/asistente/types/catalogo.types'
import { useSemillaDeSeleccion } from '@/features/landing/composables/useSemillaDeSeleccion'
import { useSeleccionPortadaStore } from '@/features/landing/stores/seleccionPortada.store'
import type { PublicPlan } from '@/features/landing/types/plans.types'
import { catalogoEmbudo, PACK_BARRIO } from '../helpers/catalogo-embudo'

/**
 * EL ORDEN DE PRECEDENCIA DE LA SEMILLA, MEDIDO SIN LA PANTALLA DELANTE.
 *
 * <p>Esto NO duplica `planes-semilla-portada.spec.ts`: aquella prueba la
 * pantalla montada —que las fuentes lleguen bien cableadas— y esta la regla
 * sola, cuál gana a cuál. Incluida la portada que entrega lista vacía: «lo
 * quité todo», que no es lo mismo que no venir de la portada.
 */

const PACK_DINERO: PaqueteCatalogo = {
  ...PACK_BARRIO,
  code: 'PACK_MONEY',
  nombre: 'Mostrador',
  componentes: ['CORE', 'CASH_REGISTER', 'INVOICING'],
  recommended: false,
}

/** Los módulos de cada paquete una vez descontados núcleo y capacidades. */
const DEL_BARRIO = ['SCHEDULING', 'CLINICAL_HISTORY']
const DEL_DINERO = ['CASH_REGISTER', 'INVOICING']

function plan(code: string, recommended: boolean): PublicPlan {
  return {
    code,
    name: code,
    tagline: '',
    monthlyFromAmount: 189_000,
    annualFromAmount: 1_733_000,
    setupAmount: 0,
    taxRate: 19,
    taxTreatment: 'TAXED',
    includes: [],
    capacities: [],
    recommended,
  }
}

const PLANES = [plan('PACK_MONEY', false), plan('PACK_CLINIC', true)]

const CATALOGO = catalogoEmbudo({ paquetes: [PACK_DINERO, PACK_BARRIO] })

interface Entradas {
  catalogo?: CatalogoComercial | null
  planPedido?: string | null
  planDeLaIntencion?: string | null | undefined
}

/**
 * `watch` fuera de un componente necesita un ámbito que lo sostenga; sin él el
 * observador queda sin dueño y no se detiene al acabar la prueba.
 */
function sembrar({ catalogo = CATALOGO, planPedido = null, planDeLaIntencion }: Entradas = {}) {
  const catalogoRef = ref<CatalogoComercial | null>(catalogo)
  const sembradas = vi.fn<(codigos: readonly string[]) => void>()
  const scope = effectScope()

  scope.run(() => {
    useSemillaDeSeleccion({
      catalogo: catalogoRef,
      plans: PLANES,
      planPedido,
      planDeLaIntencion,
      sembrar: sembradas,
    })
  })

  return {
    catalogoRef,
    sembradas,
    detener: () => scope.stop(),
    ultima: () => sembradas.mock.calls.at(-1)?.[0] ?? null,
  }
}

describe('de dónde sale la primera selección de `/planes`', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('el `?plan=` de la URL le gana a la portada, a la intención y al recomendado', () => {
    useSeleccionPortadaStore().entregar(['LAB'])

    const { ultima, detener } = sembrar({
      planPedido: 'PACK_MONEY',
      planDeLaIntencion: 'PACK_CLINIC',
    })

    expect(ultima()).toEqual(DEL_DINERO)
    detener()
  })

  it('sin `?plan=`, lo que se marcó en la portada le gana a la intención y al recomendado', () => {
    useSeleccionPortadaStore().entregar(['CASH_REGISTER'])

    const { ultima, detener } = sembrar({ planDeLaIntencion: 'PACK_MONEY' })

    expect(ultima()).toEqual(['CASH_REGISTER'])
    detener()
  })

  it('la portada que entrega lista vacía es una decisión: no vuelve ninguna casilla', () => {
    useSeleccionPortadaStore().entregar([])

    const { sembradas, ultima, detener } = sembrar({ planDeLaIntencion: 'PACK_MONEY' })

    expect(sembradas).toHaveBeenCalledTimes(1)
    expect(ultima()).toEqual([])
    detener()
  })

  it('sin portada, manda la intención guardada por encima del recomendado', () => {
    const { ultima, detener } = sembrar({ planDeLaIntencion: 'PACK_MONEY' })

    expect(ultima()).toEqual(DEL_DINERO)
    detener()
  })

  it('sin nada que traiga el visitante, siembra el paquete que el negocio destaca', () => {
    const { ultima, detener } = sembrar()

    expect(ultima()).toEqual(DEL_BARRIO)
    detener()
  })

  it('un `?plan=` que el catálogo no publica cae al recomendado en vez de no sembrar', () => {
    const { ultima, detener } = sembrar({ planPedido: 'PACK_QUE_NO_EXISTE' })

    expect(ultima()).toEqual(DEL_BARRIO)
    detener()
  })

  it('sin catálogo todavía no siembra, y siembra en cuanto llega', async () => {
    const { catalogoRef, sembradas, ultima, detener } = sembrar({ catalogo: null })

    expect(sembradas).not.toHaveBeenCalled()

    catalogoRef.value = CATALOGO
    await nextTick()

    expect(ultima()).toEqual(DEL_BARRIO)
    detener()
  })

  it('siembra una sola vez: el catálogo que vuelve a llegar no deshace lo marcado', async () => {
    const { catalogoRef, sembradas, detener } = sembrar()

    expect(sembradas).toHaveBeenCalledTimes(1)

    catalogoRef.value = catalogoEmbudo({ paquetes: [PACK_DINERO] })
    await nextTick()

    expect(sembradas).toHaveBeenCalledTimes(1)
    detener()
  })

  it('un catálogo sin paquetes no siembra: la elección sigue abierta cuando lleguen', async () => {
    const { catalogoRef, sembradas, ultima, detener } = sembrar({
      catalogo: catalogoEmbudo({ paquetes: [] }),
    })

    expect(sembradas).not.toHaveBeenCalled()

    catalogoRef.value = CATALOGO
    await nextTick()

    expect(ultima()).toEqual(DEL_BARRIO)
    detener()
  })

  it('la entrega de la portada se consume al recogerla', () => {
    useSeleccionPortadaStore().entregar(['CASH_REGISTER'])

    const primera = sembrar()
    expect(primera.ultima()).toEqual(['CASH_REGISTER'])
    expect(useSeleccionPortadaStore().modulos).toBeNull()
    primera.detener()

    const segunda = sembrar()
    expect(segunda.ultima()).toEqual(DEL_BARRIO)
    segunda.detener()
  })
})
