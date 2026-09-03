import type { SelfServeQuoteLineRequest } from '@/features/suscripcion/types/cotizaciones.types'
import type {
  CapacidadCatalogo,
  CatalogoComercial,
  PaqueteCatalogo,
} from '@/features/asistente/types/catalogo.types'

/**
 * Qué cesta se manda a cotizar, a partir de lo que el visitante marcó.
 *
 * <p>Puro y fuera de todo componente: no hay estado, no hay red y no hay ni una
 * cifra. Decide **códigos y cantidades**; el importe lo pone el servidor.
 */

/** El eje de una capacidad que la pantalla pregunta (sedes, personas). */
export type EjeCapacidad = 'BRANCH' | 'USER'

/** La selección del cotizador, sin nada de presentación. */
export interface SeleccionCotizador {
  /** Códigos de módulo marcados. El núcleo NO va aquí: entra siempre. */
  modulos: readonly string[]
  sedes: number
  usuarios: number
}

export interface CestaCotizada {
  lineas: SelfServeQuoteLineRequest[]
  /**
   * El paquete que la selección reproduce, o `null` si se cotiza suelto. Lo
   * necesita la pantalla para explicar el salto de precio al desmarcar.
   */
  paquete: PaqueteCatalogo | null
}

/**
 * Los componentes de un paquete que son MÓDULOS, que es lo único comparable
 * contra las casillas.
 *
 * <p>Se descartan dos clases y las dos van en todos los paquetes: el núcleo, que
 * no es una casilla, y las capacidades (`CAPACITY_*`), que son unidades incluidas
 * y tampoco lo son. Sin descartarlas, ninguna selección coincidiría jamás con
 * ningún paquete y el descuento no se aplicaría nunca.
 *
 * <p>La lista de capacidades sale del propio catálogo en vez de un prefijo de
 * código: el prefijo es una convención de la semilla y esto es un dato.
 */
export function modulosDelPaquete(paquete: PaqueteCatalogo, catalogo: CatalogoComercial): string[] {
  const capacidades = new Set(catalogo.capacidades.map((c) => c.code))
  const nucleos = new Set(articulosDelNucleo(catalogo).map((a) => a.code))
  return paquete.componentes.filter((c) => !capacidades.has(c) && !nucleos.has(c))
}

/** Los artículos del mínimo estructural: se cobran siempre y no son casillas. */
function articulosDelNucleo(catalogo: CatalogoComercial) {
  return catalogo.articulos.filter((a) => a.obligatorio)
}

function mismosCodigos(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false
  const enB = new Set(b)
  return a.every((code) => enB.has(code))
}

/**
 * El paquete que reproduce EXACTAMENTE esta selección, o `null`.
 *
 * <p><b>Por qué gana el paquete cuando coincide.</b> Los paquetes sembrados
 * llevan entre un 14 % y un 18 % de descuento sobre la suma de sus piezas.
 * Cotizar las piezas sueltas de una combinación que existe como paquete le
 * subiría el precio al cliente en silencio, y sería un precio que la contratación
 * tampoco le haría —el paso vinculante cotiza lo mismo que esto—.
 *
 * <p>Se exige además que el paquete tenga precio en el ciclo elegido: sin fila de
 * precio el servidor no lo resuelve y la cesta entera se cae con un 400 que no
 * dice cuál línea sobró.
 */
export function paqueteQueCoincide(
  modulos: readonly string[],
  catalogo: CatalogoComercial,
): PaqueteCatalogo | null {
  if (modulos.length === 0) return null
  return (
    catalogo.paquetes.find(
      (p) => p.importe !== null && mismosCodigos(modulos, modulosDelPaquete(p, catalogo)),
    ) ?? null
  )
}

/**
 * Las unidades del eje que el núcleo ya trae, y por tanto no se cotizan.
 *
 * <p><b>Es `included_quantity` MÁS la unidad que el núcleo contrata</b>, que es
 * como el backend calcula el techo de una concesión
 * (`CapacityGrantLine.ceiling() = included_quantity + quantity`). Con la tarifa
 * vigente da una sede y dos personas, que es lo que la portada promete.
 *
 * <p>El artículo que trae lo incluido (`CAPACITY_*`) y el que cobra las unidades
 * de más (`EXTRA_*`) son dos artículos distintos del mismo eje, y se distinguen
 * por lo único que el contrato publica sobre ellos: el segundo es contratable
 * suelto y el primero no.
 */
export function incluidasDelEje(catalogo: CatalogoComercial, eje: EjeCapacidad): number {
  const base = catalogo.capacidades.find((c) => c.unit === eje && !c.vendible)
  return base ? base.incluido + 1 : 0
}

/** El artículo con el que se cobran las unidades por encima de lo incluido. */
export function extraDelEje(
  catalogo: CatalogoComercial,
  eje: EjeCapacidad,
): CapacidadCatalogo | null {
  return catalogo.capacidades.find((c) => c.unit === eje && c.vendible) ?? null
}

/**
 * Cuántas unidades de `EXTRA_*` se contratan.
 *
 * <p><b>Son las que pasan de lo incluido, no el total.</b> La tarifa da a los
 * `EXTRA_*` `included_quantity = 0` —lo incluido vive en el `CAPACITY_*` del
 * mismo eje—, así que el servidor cobra todas las unidades que reciba en esa
 * línea: mandar cuatro sedes cuando una va incluida cobraría cuatro.
 */
export function unidadesExtra(contratadas: number, incluidas: number): number {
  return Math.max(0, Math.trunc(contratadas) - incluidas)
}

function lineaDeEje(
  catalogo: CatalogoComercial,
  eje: EjeCapacidad,
  contratadas: number,
): SelfServeQuoteLineRequest | null {
  const extra = extraDelEje(catalogo, eje)
  if (!extra) return null
  const unidades = unidadesExtra(contratadas, incluidasDelEje(catalogo, eje))
  return unidades > 0 ? { code: extra.code, quantity: unidades } : null
}

/**
 * La cesta que se manda a `POST /quotes/preview`.
 *
 * <p>Dos formas, y la elección es la del modelo híbrido: **una línea de paquete**
 * cuando las casillas reproducen uno, y `núcleo + cada módulo marcado` cuando no.
 * Nunca las dos cosas: un paquete y una pieza suya en la misma cesta son dos
 * cobros por lo mismo y el servidor los rechaza —con un cuerpo que no dice cuál
 * sobraba—, así que el conflicto se evita aquí y no se descubre allí.
 *
 * <p>Los módulos se mandan en el orden del catálogo y no en el de marcado: es el
 * orden en que el desglose los va a enseñar.
 */
export function cestaDeCotizacion(
  seleccion: SeleccionCotizador,
  catalogo: CatalogoComercial,
): CestaCotizada {
  const paquete = paqueteQueCoincide(seleccion.modulos, catalogo)
  const marcados = new Set(seleccion.modulos)

  const lineas: SelfServeQuoteLineRequest[] = paquete
    ? [{ code: paquete.code, quantity: 1 }]
    : [
        ...articulosDelNucleo(catalogo).map((a) => ({ code: a.code, quantity: 1 })),
        ...catalogo.articulos
          .filter((a) => !a.obligatorio && marcados.has(a.code))
          .map((a) => ({ code: a.code, quantity: 1 })),
      ]

  for (const linea of [
    lineaDeEje(catalogo, 'BRANCH', seleccion.sedes),
    lineaDeEje(catalogo, 'USER', seleccion.usuarios),
  ]) {
    if (linea) lineas.push(linea)
  }

  return { lineas, paquete }
}
