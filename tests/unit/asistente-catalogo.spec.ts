import { beforeEach, describe, expect, it, vi } from 'vitest'
import { componer, fetchCatalogo } from '@/features/asistente/api/catalogo.source'
import {
  arrastraAlMarcar,
  caeAlQuitar,
  sugerenciasDe,
} from '@/features/asistente/composables/dependencias'
import { GRUPO_POR_CODIGO } from '@/features/asistente/content/catalogo.content'
import type {
  PublicCatalogItemResponse,
  PublicCatalogResponse,
} from '@/features/asistente/types/catalogo.types'
import { http } from '@/services/http/http.client'

/**
 * El seam del catálogo: la traducción de `GET /catalog` a lo que ve la pantalla.
 *
 * <p>Antes esta muestra era `CATALOGO_FIXTURE`, un sustituto de 428 líneas que
 * copiaba la semilla entera. Se borró con el corte a red, y con él se fueron los
 * casos que solo contaban sus filas —«trece módulos», «nueve requisitos»—: eran
 * un censo del sustituto, no una afirmación sobre `componer`, y reescribirlos
 * contra la muestra de aquí abajo sería probar que el fichero de prueba dice lo
 * que el fichero de prueba dice.
 *
 * <p>Lo que sí se conserva entero es la LÓGICA, que es lo que el corte no movió:
 * de qué campo sale el precio anual, cómo se traduce «sin prueba», y que los
 * arcos editoriales se concatenan a los del contrato sin fundirse con ellos.
 */

vi.mock('@/services/http/http.client', () => ({
  http: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}))

const get = vi.mocked(http.get)

function articulo(over: Partial<PublicCatalogItemResponse> = {}): PublicCatalogItemResponse {
  return {
    code: 'CORE',
    name: 'Núcleo',
    description: 'Lo mínimo de toda cuenta',
    mandatory: true,
    trialDays: null,
    monthlyAmount: 39000,
    annualAmount: 390000,
    setupAmount: null,
    taxRate: 19,
    taxTreatment: null,
    selfServiceEligible: true,
    ...over,
  }
}

/**
 * Una muestra pequeña y **deliberadamente torcida**: el anual de
 * `CLINICAL_HISTORY` no es ningún múltiplo de su mensual. Sin esa torsión, el
 * caso del precio anual pasaría en verde con una implementación que multiplicara
 * —que es exactamente el defecto que este repositorio ya publicó una vez.
 */
const MUESTRA: PublicCatalogResponse = {
  currency: 'COP',
  priceValidFrom: '2026-01-01',
  modules: [
    articulo(),
    articulo({
      code: 'CLINICAL_HISTORY',
      name: 'Historia clínica',
      mandatory: false,
      monthlyAmount: 49000,
      annualAmount: 500000,
      trialDays: 30,
    }),
    articulo({
      code: 'CASH_REGISTER',
      name: 'Caja',
      mandatory: false,
      trialDays: 14,
    }),
    articulo({
      code: 'ELECTRONIC_INVOICING',
      name: 'Facturación electrónica',
      mandatory: false,
      trialDays: null,
    }),
    articulo({ code: 'OPEN_ACCOUNTS', name: 'Cuentas abiertas', mandatory: false }),
    articulo({ code: 'INVENTORY', name: 'Inventario', mandatory: false }),
  ],
  oneTimeItems: [
    // ⚠️ No es relleno. `DATA_MIGRATION` llega con `selfServiceEligible = false`
    // y es de los artículos cuyo nombre más se parece a lo que un prospecto
    // escribe («que me migren los datos del sistema que uso hoy»). Si el seam lo
    // tirara aquí, el paso que descarta lo no contratable no tendría nada que
    // descartar y sería un filtro muerto.
    articulo({
      code: 'DATA_MIGRATION',
      name: 'Migración de datos',
      mandatory: false,
      selfServiceEligible: false,
    }),
  ],
  capacities: [
    {
      code: 'EXTRA_USER',
      name: 'Persona adicional',
      description: null,
      mandatory: false,
      unit: 'USER',
      monthlyIncludedQuantity: 1,
      annualIncludedQuantity: null,
      monthlyUnitAmount: 12000,
      annualUnitAmount: null,
      taxRate: 19,
      taxTreatment: null,
      selfServiceEligible: false,
    },
  ],
  packs: [
    {
      code: 'PACK_CLINICA',
      name: 'Paquete Clínica',
      tagline: 'Lo esencial de una clínica',
      monthlyAmount: 120000,
      annualAmount: 1200000,
      setupAmount: null,
      taxRate: 19,
      taxTreatment: null,
      componentCodes: ['CORE', 'CLINICAL_HISTORY', 'CASH_REGISTER'],
    },
  ],
  requirements: [
    { itemCode: 'OPEN_ACCOUNTS', requiredItemCode: 'CASH_REGISTER' },
    { itemCode: 'ELECTRONIC_INVOICING', requiredItemCode: 'CASH_REGISTER' },
  ],
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('el seam pide el catálogo a la red', () => {
  it('llama a GET /catalog sin levantar el velo global', async () => {
    get.mockResolvedValueOnce({ data: MUESTRA } as never)
    const catalogo = await fetchCatalogo('MENSUAL')

    const [url, config] = get.mock.calls[0]!
    expect(url).toBe('/catalog')
    // El catálogo se carga al montar `/planes`, la primera pantalla que ve un
    // visitante anónimo. Un overlay `inset: 0` con `cursor: wait` sobre la
    // portada es la peor primera impresión posible.
    expect(config?.skipGlobalLoader).toBe(true)
    expect(catalogo.articulos.length).toBe(7)
  })

  it('propaga el aborto sin llegar a pedir nada', async () => {
    const controlador = new AbortController()
    controlador.abort()

    await expect(fetchCatalogo('MENSUAL', controlador.signal)).rejects.toBeTruthy()
    expect(get).not.toHaveBeenCalled()
  })
})

describe('la composición del catálogo', () => {
  it('el precio ANUAL sale del campo anual, nunca del mensual multiplicado', () => {
    // Es literalmente el defecto que este repositorio ya publicó una vez: una
    // extrapolación anual por diez calculada en cliente. El 500.000 de la
    // muestra no es ningún múltiplo del 49.000, así que solo lee bien quien lee
    // el campo.
    const mensual = componer(MUESTRA, 'MENSUAL')
    const anual = componer(MUESTRA, 'ANUAL')

    expect(mensual.articulos.find((a) => a.code === 'CLINICAL_HISTORY')?.importe).toBe(49000)
    expect(anual.articulos.find((a) => a.code === 'CLINICAL_HISTORY')?.importe).toBe(500000)
  })

  it('«sin prueba» llega como null y no como cero', () => {
    // La política del catálogo es un arco exclusivo: ELIGIBLE exige días > 0 y
    // NEVER_FREE los exige nulos. Un cero de relleno haría que la pantalla
    // escribiera «0 días gratis» donde la verdad es «sin prueba», y esa
    // diferencia es la mitad de la comparación con el paquete.
    const catalogo = componer(MUESTRA, 'MENSUAL')
    expect(catalogo.articulos.find((a) => a.code === 'ELECTRONIC_INVOICING')?.trialDays).toBeNull()
    expect(catalogo.articulos.find((a) => a.code === 'CASH_REGISTER')?.trialDays).toBe(14)
  })

  it('los artículos de pago único NO se tiran: son lo que el filtro tiene que descartar', () => {
    const catalogo = componer(MUESTRA, 'MENSUAL')
    const migracion = catalogo.articulos.find((a) => a.code === 'DATA_MIGRATION')

    expect(migracion).toBeDefined()
    expect(migracion?.vendible).toBe(false)
  })

  it('marca como NO vendible lo que la autocontratación rechazaría', () => {
    const catalogo = componer(MUESTRA, 'MENSUAL')
    expect(catalogo.capacidades.find((c) => c.code === 'EXTRA_USER')?.vendible).toBe(false)
  })

  it('lo incluido existe en los dos ciclos aunque el ciclo no publique tramo', () => {
    // `annualIncludedQuantity` es `null` en la muestra. Cero, no `undefined`:
    // la frase de capacidades lo lee y un hueco la dejaría sin decir nada.
    expect(componer(MUESTRA, 'MENSUAL').capacidades[0]!.incluido).toBe(1)
    expect(componer(MUESTRA, 'ANUAL').capacidades[0]!.incluido).toBe(0)
  })

  it('añade los RECOMMENDS editoriales, que el contrato NO publica', () => {
    // `PublicCatalogRequirementResponse` solo trae `itemCode` y
    // `requiredItemCode`: sin tipo de arco. Los cuatro RECOMMENDS de la semilla
    // no viajan, y sin ellos la pantalla no puede distinguir «arrastra» de
    // «sugiere» — que es lo único que impide que un upsell se lea como un
    // requisito técnico.
    const catalogo = componer(MUESTRA, 'MENSUAL')

    expect(catalogo.arcos.filter((a) => a.tipo === 'REQUIRES').length).toBe(
      MUESTRA.requirements.length,
    )
    expect(catalogo.arcos.filter((a) => a.tipo === 'RECOMMENDS').length).toBe(4)
  })

  it('cuelga de cada arco la nota que escribió el negocio', () => {
    const catalogo = componer(MUESTRA, 'MENSUAL')
    const arco = catalogo.arcos.find(
      (a) => a.desde === 'OPEN_ACCOUNTS' && a.hacia === 'CASH_REGISTER',
    )
    expect(arco?.note).toBe('Las cuentas abiertas se cierran cobrando en caja')
  })

  it('CORE no tiene grupo, y el contenido declara trece que sí', () => {
    // CORE es `is_core`: entra siempre y no es una casilla. Si tuviera grupo
    // aparecería como algo que se puede desmarcar, y no se puede.
    const catalogo = componer(MUESTRA, 'MENSUAL')

    expect(catalogo.articulos.find((a) => a.code === 'CORE')?.grupo).toBeNull()
    expect(catalogo.articulos.find((a) => a.code === 'CORE')?.obligatorio).toBe(true)
    expect(Object.keys(GRUPO_POR_CODIGO).length).toBe(13)
  })
})

describe('el grafo, recorrido en el front antes de pedir nada', () => {
  const CATALOGO = componer(MUESTRA, 'MENSUAL')

  it('marcar Cuentas abiertas arrastra Caja, y lo dice antes de pedirlo', () => {
    expect(arrastraAlMarcar('OPEN_ACCOUNTS', ['CORE'], CATALOGO)).toEqual(['CASH_REGISTER'])
  })

  it('quitar Caja se lleva todo lo que depende de ella, transitivamente', () => {
    const caidos = caeAlQuitar(
      'CASH_REGISTER',
      ['CORE', 'CASH_REGISTER', 'OPEN_ACCOUNTS', 'ELECTRONIC_INVOICING'],
      CATALOGO,
    )
    expect(caidos.sort()).toEqual(['ELECTRONIC_INVOICING', 'OPEN_ACCOUNTS'])
  })

  it('un RECOMMENDS se sugiere y NO se arrastra', () => {
    // Inventario RECOMIENDA Caja. Marcarlo no la añade.
    expect(arrastraAlMarcar('INVENTORY', ['CORE'], CATALOGO)).toEqual([])
    expect(sugerenciasDe(['CORE', 'INVENTORY'], CATALOGO).map((a) => a.hacia)).toEqual([
      'CASH_REGISTER',
    ])
  })

  it('no sugiere lo que ya está en el carrito', () => {
    expect(sugerenciasDe(['CORE', 'INVENTORY', 'CASH_REGISTER'], CATALOGO)).toEqual([])
  })
})
