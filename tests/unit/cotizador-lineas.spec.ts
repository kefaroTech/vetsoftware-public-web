import { describe, expect, it } from 'vitest'
import type {
  ArticuloCatalogo,
  CapacidadCatalogo,
  CatalogoComercial,
  PaqueteCatalogo,
} from '@/features/asistente/types/catalogo.types'
import {
  cestaDeCotizacion,
  incluidasDelEje,
  modulosDelPaquete,
  paqueteQueCoincide,
  unidadesExtra,
} from '@/features/landing/composables/cotizadorLineas'

/**
 * La cesta que viaja a `POST /quotes/preview`.
 *
 * <p>Aquí no se comprueba ni un importe —eso lo pone el servidor— sino las tres
 * decisiones que sí toma el cliente y que el servidor no puede corregir: qué
 * artículo se nombra, cuántas unidades se piden de él, y si la selección se
 * cotiza como paquete o suelta. Las tres se pagan en dinero cuando se equivocan,
 * y las tres se rechazan con el mismo cuerpo mudo cuando el error es de forma.
 */

function articulo(over: Partial<ArticuloCatalogo> = {}): ArticuloCatalogo {
  return {
    code: 'SCHEDULING',
    nombre: 'Agenda de citas',
    descripcion: '',
    grupo: null,
    importe: 35_000,
    trialDays: 30,
    obligatorio: false,
    vendible: true,
    areaCode: 'PATIENT_CARE',
    shortLabel: 'Agenda de citas',
    ...over,
  }
}

function capacidad(over: Partial<CapacidadCatalogo> = {}): CapacidadCatalogo {
  return {
    code: 'EXTRA_BRANCH',
    nombre: 'Sede adicional',
    unit: 'BRANCH',
    incluido: 0,
    vendible: true,
    ...over,
  }
}

const PACK_CLINIC: PaqueteCatalogo = {
  code: 'PACK_CLINIC',
  nombre: 'Consulta de barrio',
  tagline: 'Agenda, historia clínica, vacunación y mostrador',
  importe: 189_000,
  // Como los sembrados: el núcleo y una capacidad viajan dentro de los tres.
  componentes: [
    'CORE',
    'SCHEDULING',
    'CLINICAL_HISTORY',
    'VACCINATION_DEWORMING',
    'CASH_REGISTER',
    'CAPACITY_TERMINAL',
  ],
  recommended: true,
}

const MODULOS_DEL_PACK = [
  'SCHEDULING',
  'CLINICAL_HISTORY',
  'VACCINATION_DEWORMING',
  'CASH_REGISTER',
]

function catalogo(over: Partial<CatalogoComercial> = {}): CatalogoComercial {
  return {
    currency: 'COP',
    priceValidFrom: '2026-08-27',
    articulos: [
      articulo({ code: 'CORE', nombre: 'Núcleo: clientes y mascotas', obligatorio: true }),
      articulo(),
      articulo({ code: 'CLINICAL_HISTORY', nombre: 'Historia clínica y consultas' }),
      articulo({ code: 'VACCINATION_DEWORMING', nombre: 'Vacunación y desparasitación' }),
      articulo({ code: 'CASH_REGISTER', nombre: 'Caja y punto de venta' }),
      articulo({ code: 'INVENTORY', nombre: 'Inventario y kardex' }),
    ],
    capacidades: [
      capacidad({ code: 'CAPACITY_BRANCH', nombre: 'Sede incluida', incluido: 0, vendible: false }),
      capacidad(),
      capacidad({
        code: 'CAPACITY_USER',
        nombre: 'Usuario incluido',
        unit: 'USER',
        incluido: 1,
        vendible: false,
      }),
      capacidad({ code: 'EXTRA_USER', nombre: 'Usuario adicional', unit: 'USER', incluido: 0 }),
      capacidad({
        code: 'CAPACITY_TERMINAL',
        nombre: 'Terminal incluida',
        unit: 'TERMINAL',
        incluido: 0,
        vendible: false,
      }),
    ],
    paquetes: [PACK_CLINIC],
    arcos: [],
    areas: [{ code: 'PATIENT_CARE', nombre: 'Atención a los pacientes' }],
    ...over,
  }
}

describe('el paquete gana cuando la selección lo reproduce', () => {
  it('compara solo los componentes de tipo módulo, ignorando núcleo y capacidades', () => {
    expect(modulosDelPaquete(PACK_CLINIC, catalogo())).toEqual(MODULOS_DEL_PACK)
  })

  it('cotiza UNA línea de paquete cuando los módulos marcados coinciden exactamente', () => {
    const { lineas, paquete } = cestaDeCotizacion(
      { modulos: MODULOS_DEL_PACK, sedes: 1, usuarios: 1 },
      catalogo(),
    )

    expect(lineas).toEqual([{ code: 'PACK_CLINIC', quantity: 1 }])
    expect(paquete?.code).toBe('PACK_CLINIC')
  })

  /**
   * El rechazo que este caso previene es mudo: el servidor contesta el mismo
   * cuerpo para «paquete y pieza suya» que para cualquier otro dato inválido, así
   * que si esta cesta se llegara a formar, el cotizador se quedaría sin cifra y
   * sin forma de saber por qué.
   */
  it('nunca manda un paquete junto a una pieza suya', () => {
    const { lineas } = cestaDeCotizacion(
      { modulos: MODULOS_DEL_PACK, sedes: 4, usuarios: 5 },
      catalogo(),
    )
    const codigos = lineas.map((l) => l.code)

    expect(codigos).toContain('PACK_CLINIC')
    for (const componente of PACK_CLINIC.componentes) {
      expect(codigos).not.toContain(componente)
    }
  })

  it('vuelve a líneas de módulo en cuanto se desmarca una casilla', () => {
    const { lineas, paquete } = cestaDeCotizacion(
      {
        modulos: ['SCHEDULING', 'CLINICAL_HISTORY', 'VACCINATION_DEWORMING'],
        sedes: 1,
        usuarios: 1,
      },
      catalogo(),
    )

    expect(paquete).toBeNull()
    expect(lineas).toEqual([
      { code: 'CORE', quantity: 1 },
      { code: 'SCHEDULING', quantity: 1 },
      { code: 'CLINICAL_HISTORY', quantity: 1 },
      { code: 'VACCINATION_DEWORMING', quantity: 1 },
    ])
  })

  it('marcar un módulo de MÁS tampoco es el paquete', () => {
    expect(paqueteQueCoincide([...MODULOS_DEL_PACK, 'INVENTORY'], catalogo())).toBeNull()
  })

  /**
   * Un paquete sin precio en el ciclo elegido no lo resuelve el servidor y tumba
   * la cesta entera. Cotizar sus piezas sueltas sube el precio, pero es una cifra
   * que existe; la alternativa es ninguna.
   */
  it('no cotiza como paquete uno que no tiene precio en el ciclo elegido', () => {
    const sinPrecio = catalogo({ paquetes: [{ ...PACK_CLINIC, importe: null }] })

    expect(paqueteQueCoincide(MODULOS_DEL_PACK, sinPrecio)).toBeNull()
    expect(
      cestaDeCotizacion({ modulos: MODULOS_DEL_PACK, sedes: 1, usuarios: 1 }, sinPrecio).lineas,
    ).toHaveLength(5)
  })

  it('la selección vacía es legítima: solo el núcleo', () => {
    const { lineas, paquete } = cestaDeCotizacion(
      { modulos: [], sedes: 1, usuarios: 1 },
      catalogo(),
    )

    expect(lineas).toEqual([{ code: 'CORE', quantity: 1 }])
    expect(paquete).toBeNull()
  })
})

describe('las capacidades: qué artículo y cuántas unidades', () => {
  /**
   * Lo incluido vive en el `CAPACITY_*` del eje —una sede, dos personas con la
   * tarifa vigente— y NO en el `EXTRA_*`, que llega con `included_quantity = 0`.
   * Es toda la razón por la que la cantidad de la línea son las unidades de más y
   * no el total contratado: el servidor cobra íntegro lo que reciba ahí.
   */
  it('lee lo incluido del artículo del eje que no se vende suelto', () => {
    expect(incluidasDelEje(catalogo(), 'BRANCH')).toBe(1)
    expect(incluidasDelEje(catalogo(), 'USER')).toBe(2)
  })

  it('cobra por las unidades que pasan de lo incluido, no por el total', () => {
    expect(unidadesExtra(4, 1)).toBe(3)
    expect(unidadesExtra(1, 1)).toBe(0)
    expect(unidadesExtra(0, 1)).toBe(0)
  })

  it('añade una línea por eje, con el artículo adicional del catálogo', () => {
    const { lineas } = cestaDeCotizacion({ modulos: [], sedes: 4, usuarios: 3 }, catalogo())

    expect(lineas).toEqual([
      { code: 'CORE', quantity: 1 },
      { code: 'EXTRA_BRANCH', quantity: 3 },
      { code: 'EXTRA_USER', quantity: 1 },
    ])
  })

  it('no manda la capacidad que no se pasa de lo incluido', () => {
    const { lineas } = cestaDeCotizacion({ modulos: [], sedes: 1, usuarios: 2 }, catalogo())

    expect(lineas.map((l) => l.code)).toEqual(['CORE'])
  })

  it('un paquete sí viaja con las capacidades adicionales', () => {
    const { lineas } = cestaDeCotizacion(
      { modulos: MODULOS_DEL_PACK, sedes: 2, usuarios: 2 },
      catalogo(),
    )

    expect(lineas).toEqual([
      { code: 'PACK_CLINIC', quantity: 1 },
      { code: 'EXTRA_BRANCH', quantity: 1 },
    ])
  })
})
