import { describe, expect, it } from 'vitest'
import {
  lineasDeContratacion,
  lineasDePrueba,
  pruebaUniforme,
} from '@/features/contratacion/api/contratacion.source'
import type { FuenteDeLineas } from '@/features/contratacion/api/contratacion.source'
import {
  cestaDeCotizacion,
  modulosDelPaquete,
} from '@/features/landing/composables/cotizadorLineas'
import { PLANS_CONTENT } from '@/features/landing/content/plans.content'
import type { PublicPlan } from '@/features/landing/types/plans.types'
import { PACK_BARRIO, catalogoEmbudo } from '../helpers/catalogo-embudo'
import { exigir } from '../helpers/exigir'

/**
 * Lo que sale del catálogo transcrito y llega —o no— al servidor.
 *
 * <p>Estas dos funciones eran el tramo que nadie cubría con una prueba unitaria:
 * solo las tocaba el spec de Playwright, que necesita servidor y navegador. Y son
 * justo donde se manifestaba el defecto de los códigos, porque
 * `lineasDeContratacion` manda el `code` del plan al servidor tal cual.
 */

function paquete(p: PublicPlan): FuenteDeLineas {
  return { clase: 'PAQUETE', plan: p }
}

const CATALOGO = catalogoEmbudo()
const MODULOS: FuenteDeLineas = { clase: 'MODULOS', catalogo: CATALOGO }

function plan(code: string): PublicPlan {
  const encontrado = PLANS_CONTENT.plans.find((p) => p.code === code)
  if (!encontrado) throw new Error(`El catálogo transcrito no tiene «${code}»`)
  return encontrado
}

describe('lineasDeContratacion · lo que de verdad viaja en la oferta', () => {
  it('manda el código del PAQUETE, que es un artículo contratable del catálogo', () => {
    // La regresión con nombre propio. Aquí viajaba `ESENCIAL` / `CLINICA` /
    // `CADENA`, y `findPublishedIdByCode` no resuelve ninguno: la oferta entera
    // se rechazaba con «Unknown or unavailable catalog item code» después de que
    // el prospecto ya se hubiera registrado.
    for (const p of PLANS_CONTENT.plans) {
      const lineas = lineasDeContratacion({ modulos: [], sedes: 1, usuarios: 1 }, paquete(p))
      expect(lineas[0], `la primera línea de «${p.code}»`).toEqual({ code: p.code, quantity: 1 })
      expect(p.code).toMatch(/^PACK_/)
    }
  })

  it('con las sedes y las personas incluidas no manda ninguna línea de capacidad', () => {
    // El caso normal del embudo: el paquete y nada más. Una línea de capacidad de
    // sobra no es inofensiva — el servidor no emitiría renglón por ella y sí
    // puede tumbar la petición completa.
    const p = plan('PACK_CLINIC')
    const sedes = exigir(
      p.capacities.find((c) => c.unit === 'BRANCH'),
      "p.capacities.find((c) => c.unit === 'BRANCH')",
    ).included
    const usuarios = exigir(
      p.capacities.find((c) => c.unit === 'USER'),
      "p.capacities.find((c) => c.unit === 'USER')",
    ).included

    expect(lineasDeContratacion({ modulos: [], sedes, usuarios }, paquete(p))).toEqual([
      { code: 'PACK_CLINIC', quantity: 1 },
    ])
  })

  it('al pasar de lo incluido nombra el ARTÍCULO que vende la unidad, no el eje', () => {
    // `USER` y `BRANCH` son ejes de capacidad, no códigos de artículo: mandarlos
    // era la otra mitad del mismo defecto.
    const p = plan('PACK_CLINIC')
    const sedes =
      exigir(
        p.capacities.find((c) => c.unit === 'BRANCH'),
        "p.capacities.find((c) => c.unit === 'BRANCH')",
      ).included + 1
    const usuarios =
      exigir(
        p.capacities.find((c) => c.unit === 'USER'),
        "p.capacities.find((c) => c.unit === 'USER')",
      ).included + 2

    const codigos = lineasDeContratacion({ modulos: [], sedes, usuarios }, paquete(p)).map(
      (l) => l.code,
    )
    expect(codigos).toContain('EXTRA_USER')
    expect(codigos).toContain('EXTRA_BRANCH')
    expect(codigos).not.toContain('USER')
    expect(codigos).not.toContain('BRANCH')
  })

  /**
   * ESTA ES LA MITAD QUE FALTABA, y faltaba de una forma concreta: el caso de
   * arriba hace `.map((l) => l.code)` y tira las cantidades. Con solo esos tres
   * casos, cambiar `quantity: cantidad` por `cantidad - capacidad.included`
   * —«mandar lo extra», que es lo que el nombre de la variable invita a pensar—
   * dejaba la suite ENTERA en verde: los códigos siguen siendo los mismos.
   *
   * <p>Y el error no se ve por ningún lado hasta la factura. `TieredPrice.of`
   * resta lo incluido otra vez (`billableQuantity`), así que la clínica que pide
   * 4 personas sobre 2 incluidas pagaría 0 unidades adicionales en vez de 4, con
   * un total del servidor más bajo que el estimado que acaba de aceptar.
   */
  it('la cantidad que viaja es la CONTRATADA, nunca la extra', () => {
    const p = plan('PACK_CLINIC')
    const incluidasUsuarios = exigir(
      p.capacities.find((c) => c.unit === 'USER'),
      "p.capacities.find((c) => c.unit === 'USER')",
    ).included
    const incluidasSedes = exigir(
      p.capacities.find((c) => c.unit === 'BRANCH'),
      "p.capacities.find((c) => c.unit === 'BRANCH')",
    ).included
    const usuarios = incluidasUsuarios + 4
    const sedes = incluidasSedes + 3

    const porCodigo = new Map(
      lineasDeContratacion({ modulos: [], sedes, usuarios }, paquete(p)).map((l) => [
        l.code,
        l.quantity,
      ]),
    )

    expect(porCodigo.get('EXTRA_USER'), 'lo contratado, no lo extra').toBe(usuarios)
    expect(porCodigo.get('EXTRA_BRANCH'), 'lo contratado, no lo extra').toBe(sedes)
    // Escrito aparte y a propósito: es el valor concreto que produciría el
    // defecto, y sin esta línea el caso pasaría con cualquier fórmula que
    // casualmente diera el mismo número.
    expect(porCodigo.get('EXTRA_USER')).not.toBe(usuarios - incluidasUsuarios)
    expect(porCodigo.get('EXTRA_BRANCH')).not.toBe(sedes - incluidasSedes)
    // El paquete siempre va con uno: no se multiplica por sedes ni por personas.
    expect(porCodigo.get('PACK_CLINIC')).toBe(1)
  })

  /**
   * La tercera regla del encabezado de `lineasDeContratacion`, y la única que
   * ninguna prueba miraba en los tres planes a la vez: **los módulos nunca
   * viajan**. Son componentes del paquete y su precio ya está dentro del precio
   * de entrada; `findPublishedIdByCode` los resolvería sin rechistar —aceptan un
   * `MODULE` que cuelgue de un paquete publicado— y el servidor los cobraría una
   * segunda vez.
   *
   * <p>Se deriva de `plan.includes`, no de una lista escrita a mano: un módulo
   * nuevo en el catálogo entra solo en esta comprobación.
   */
  it('ningún módulo del paquete viaja como línea propia, en ninguno de los planes', () => {
    for (const p of PLANS_CONTENT.plans) {
      const capacidades = p.capacities
      const sedes = (capacidades.find((c) => c.unit === 'BRANCH')?.included ?? 0) + 5
      const usuarios = (capacidades.find((c) => c.unit === 'USER')?.included ?? 0) + 5

      const codigos = lineasDeContratacion({ modulos: [], sedes, usuarios }, paquete(p)).map(
        (l) => l.code,
      )
      const modulos = p.includes.map((i) => i.code)

      expect(p.includes.length, `«${p.code}» debería traer módulos`).toBeGreaterThan(0)
      for (const modulo of modulos) {
        expect(
          codigos,
          `«${p.code}» manda el módulo «${modulo}» y lo cobraría dos veces`,
        ).not.toContain(modulo)
      }
      // Y no hay ninguna línea de más: paquete + los dos ejes que la pantalla
      // pregunta, y nada más. Un `code` inesperado tumbaría la oferta entera.
      expect([...codigos].sort()).toEqual([p.code, 'EXTRA_BRANCH', 'EXTRA_USER'].sort())
    }
  })
})

describe('lineasDeContratacion · la rama de los módulos sueltos', () => {
  it('sin paquete, cada módulo marcado viaja como línea propia junto al núcleo', () => {
    // Es la inversión exacta de la regla de la rama del paquete, y tiene que
    // serlo: sin un paquete que los contenga, no mandar los módulos contrataría
    // un núcleo pelado cobrando lo que el prospecto vio por su selección.
    const lineas = lineasDeContratacion(
      { modulos: ['CASH_REGISTER'], sedes: 1, usuarios: 1 },
      MODULOS,
    )

    expect(lineas).toContainEqual({ code: 'CORE', quantity: 1 })
    expect(lineas).toContainEqual({ code: 'CASH_REGISTER', quantity: 1 })
    // Y ni un módulo que nadie marcó: cada línea es una afirmación sobre lo que
    // la clínica compra.
    expect(lineas.map((l) => l.code)).not.toContain('SCHEDULING')
  })

  it('solo el núcleo es una compra válida, no una cesta vacía', () => {
    expect(lineasDeContratacion({ modulos: [], sedes: 1, usuarios: 1 }, MODULOS)).toEqual([
      { code: 'CORE', quantity: 1 },
    ])
  })

  it('cuando la selección reproduce un paquete, vuelve a viajar la línea de PAQUETE', () => {
    // El modelo híbrido (decisión D4): los paquetes sembrados llevan entre un
    // 14 % y un 18 % de descuento sobre la suma de sus piezas, así que cotizar
    // las piezas de una combinación que existe como paquete le subiría el precio
    // al cliente en silencio.
    const modulos = modulosDelPaquete(PACK_BARRIO, CATALOGO)
    const lineas = lineasDeContratacion({ modulos, sedes: 1, usuarios: 1 }, MODULOS)

    expect(lineas).toContainEqual({ code: PACK_BARRIO.code, quantity: 1 })
  })

  /**
   * La regla que el docblock de `lineasDeContratacion` protege en las DOS
   * ramas, y la única que no se puede perder al abrir la modular: un paquete
   * junto a un componente suyo son dos cobros por lo mismo, y el servidor los
   * rechaza con un 400 cuyo cuerpo no dice cuál línea sobró.
   */
  it('nunca manda un paquete y una pieza suya en la misma cesta', () => {
    const modulos = modulosDelPaquete(PACK_BARRIO, CATALOGO)
    const codigos = lineasDeContratacion({ modulos, sedes: 1, usuarios: 1 }, MODULOS).map(
      (l) => l.code,
    )

    expect(modulos.length, 'el paquete de prueba debería traer módulos').toBeGreaterThan(0)
    expect(codigos).toContain(PACK_BARRIO.code)
    for (const modulo of [...modulos, 'CORE']) {
      expect(
        codigos,
        `«${modulo}» cuelga de ${PACK_BARRIO.code} y se cobraría dos veces`,
      ).not.toContain(modulo)
    }
  })

  it('la capacidad viaja con las unidades que PASAN de lo incluido, no con el total', () => {
    // Y no contradice la regla de la rama del paquete: son dos artículos. El
    // `EXTRA_*` tiene `included_quantity = 0` —lo incluido vive en el
    // `CAPACITY_*` del mismo eje—, así que el servidor cobra todas las unidades
    // que reciba en esa línea. Ver `unidadesExtra`.
    const porCodigo = new Map(
      lineasDeContratacion({ modulos: [], sedes: 1, usuarios: 5 }, MODULOS).map((l) => [
        l.code,
        l.quantity,
      ]),
    )

    // El catálogo de prueba incluye 1 usuario en el `CAPACITY_USER` y el núcleo
    // contrata uno más: dos incluidos, así que de cinco se cobran tres.
    expect(porCodigo.get('EXTRA_USER')).toBe(3)
    expect(porCodigo.get('EXTRA_USER')).not.toBe(5)
    // Una sede, que es justo lo incluido: no viaja ninguna línea.
    expect(porCodigo.has('EXTRA_BRANCH')).toBe(false)
  })

  /**
   * La condición de la que depende que la pantalla y la factura digan lo mismo.
   * Si alguien reimplementara aquí las reglas de la cesta «con el mismo
   * criterio» en vez de llamar a la misma función, el día que una de las dos
   * cambie el prospecto vería un precio y se le cobraría otro — y nada se
   * pondría rojo.
   */
  it('la cesta que se contrata es EXACTAMENTE la que se cotizó', () => {
    for (const seleccion of [
      { modulos: [], sedes: 1, usuarios: 1 },
      { modulos: ['CASH_REGISTER', 'INVOICING'], sedes: 2, usuarios: 7 },
      { modulos: modulosDelPaquete(PACK_BARRIO, CATALOGO), sedes: 1, usuarios: 1 },
    ]) {
      expect(lineasDeContratacion(seleccion, MODULOS)).toEqual(
        cestaDeCotizacion(seleccion, CATALOGO).lineas,
      )
    }
  })
})

describe('lineasDePrueba · la prueba que el catálogo concede de verdad', () => {
  it('un módulo NEVER_FREE no recibe días de prueba', () => {
    // `ELECTRONIC_INVOICING` viaja dentro de `PACK_FULL` y el catálogo lo marca
    // NEVER_FREE. La landing prometía 14 días gratis sobre él.
    const linea = lineasDePrueba(plan('PACK_FULL'), '2026-08-29').find(
      (l) => l.code === 'ELECTRONIC_INVOICING',
    )
    expect(linea, 'PACK_FULL debería incluir la facturación electrónica').toBeDefined()
    expect(exigir(linea, 'linea').trialDays, 'la DIAN no tiene prueba').toBeNull()
    // Sin prueba, la fecha de fin es el propio día de alta — que es justo por lo
    // que la tabla NO la pinta y escribe «Sin prueba» en su lugar.
    expect(exigir(linea, 'linea').trialEndDate).toBe('2026-08-29')
  })

  it('lleva los días junto a la fecha, para poder distinguir «sin prueba» de «acaba hoy»', () => {
    const lineas = lineasDePrueba(plan('PACK_CLINIC'), '2026-08-29')
    const caja = exigir(
      lineas.find((l) => l.code === 'CASH_REGISTER'),
      "lineas.find((l) => l.code === 'CASH_REGISTER')",
    )
    const agenda = exigir(
      lineas.find((l) => l.code === 'SCHEDULING'),
      "lineas.find((l) => l.code === 'SCHEDULING')",
    )

    expect(caja.trialDays).toBe(14)
    expect(caja.trialEndDate).toBe('2026-09-12')
    expect(agenda.trialDays).toBe(30)
    expect(agenda.trialEndDate).toBe('2026-09-28')
  })

  it('ordena por fecha de fin ascendente: lo primero que se acaba va primero', () => {
    const fechas = lineasDePrueba(plan('PACK_FULL'), '2026-08-29').map((l) => l.trialEndDate)
    expect([...fechas]).toEqual([...fechas].sort())
  })

  it('un plan con pruebas escalonadas no es uniforme', () => {
    expect(pruebaUniforme(lineasDePrueba(plan('PACK_CLINIC'), '2026-08-29'))).toBe(false)
  })
})
