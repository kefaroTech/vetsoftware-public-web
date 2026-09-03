import { http } from '@/services/http/http.client'
import type { Ciclo } from '../../landing/types/plans.types'
import { ARCOS_EDITORIALES, GRUPO_POR_CODIGO, NOTA_DE_ARCO } from '../content/catalogo.content'
import type {
  ArcoDependencia,
  AreaCatalogo,
  ArticuloCatalogo,
  CapacidadCatalogo,
  CatalogoComercial,
  PaqueteCatalogo,
  PublicCatalogItemResponse,
  PublicCatalogResponse,
} from '../types/catalogo.types'

/**
 * EL SEAM DEL CATÁLOGO COMERCIAL.
 *
 * Es la única función de todo el front que sabe de dónde salen los 26 artículos,
 * y desde el corte a red los pide a `GET /catalog`.
 *
 * <p>El corte fue lo que su autor prometió: **una línea**. {@link componer} ya
 * trabajaba sobre la forma del contrato —no sobre la del sustituto—, la firma ya
 * era la que axios quería (`signal`), y ya devolvía una promesa, así que ningún
 * store, composable ni componente se enteró. El `await Promise.resolve()` que
 * fingía la asincronía se fue con el sustituto: ahora la asincronía es real.
 *
 * ── La otra mitad: qué NO se puede resolver aquí ────────────────────────────
 * `componer` mezcla dos fuentes, y el javadoc de `content/catalogo.content.ts`
 * dice cuál caduca cuándo. Resumido: los nueve `REQUIRES` **ya viajan** por el
 * contrato; el **tipo de arco** y la **nota en español** no, y los cuatro
 * `RECOMMENDS` por tanto tampoco. Mientras eso siga así, este seam los
 * concatena desde contenido local **marcados como tales**, y el día que el
 * contrato traiga `type` y `note` se borran dos líneas de aquí.
 */

/** El precio del ciclo pedido. `null` es «no se vende suelto en ese ciclo», no cero. */
function importeDelCiclo(
  ciclo: Ciclo,
  mensual: number | null,
  anual: number | null,
): number | null {
  return ciclo === 'ANUAL' ? anual : mensual
}

/**
 * Traduce la respuesta del contrato al catálogo que ven las pantallas.
 *
 * <p>Exportada, y a propósito: es la mitad del seam que se puede probar sin
 * fingir una red. Cuando el cuerpo de {@link fetchCatalogo} pase a llamar por
 * HTTP, esta función no se toca y sus pruebas siguen valiendo.
 */
export function componer(respuesta: PublicCatalogResponse, ciclo: Ciclo): CatalogoComercial {
  const comoArticulo = (m: PublicCatalogItemResponse): ArticuloCatalogo => ({
    code: m.code,
    nombre: m.name,
    // `description` es nulable en el contrato. La cadena vacía es lo correcto y
    // no un guion: esta descripción es además el FALLBACK de un motivo saneado,
    // y un «—» en cursiva bajo un módulo de 49.000 pesos no explica nada.
    descripcion: m.description ?? '',
    grupo: GRUPO_POR_CODIGO[m.code] ?? null,
    importe: importeDelCiclo(ciclo, m.monthlyAmount, m.annualAmount),
    trialDays: m.trialDays,
    obligatorio: m.mandatory,
    vendible: m.selfServiceEligible,
    areaCode: m.areaCode,
    shortLabel: m.shortLabel,
  })

  // ⚠️ Los DOS bloques, y `oneTimeItems` no es un adorno. `ONBOARDING` y
  // `DATA_MIGRATION` existen en el catálogo, llegan con
  // `selfServiceEligible = false` y **un modelo puede nombrarlos**: son los dos
  // artículos cuyo nombre más se parece a lo que un prospecto escribe («que me
  // migren los datos del sistema que uso hoy»). Si el seam los tirara aquí, el
  // paso que descarta lo no contratable no tendría nada que descartar y sería
  // un filtro muerto — verde en las pruebas y sin efecto en producción, que es
  // exactamente cómo un candado deja de estar puesto sin que nadie lo note.
  const articulos: ArticuloCatalogo[] = [
    ...respuesta.modules.map(comoArticulo),
    ...respuesta.oneTimeItems.map(comoArticulo),
  ]

  const capacidades: CapacidadCatalogo[] = respuesta.capacities.map((c) => ({
    code: c.code,
    nombre: c.name,
    unit: c.unit,
    // Lo incluido SÍ existe en los dos ciclos aunque la unidad adicional no
    // tenga precio en uno. Cero si el ciclo no publica tramo de entrada.
    incluido: (ciclo === 'ANUAL' ? c.annualIncludedQuantity : c.monthlyIncludedQuantity) ?? 0,
    vendible: c.selfServiceEligible,
  }))

  const paquetes: PaqueteCatalogo[] = respuesta.packs.map((p) => ({
    code: p.code,
    nombre: p.name,
    tagline: p.tagline,
    importe: importeDelCiclo(ciclo, p.monthlyAmount, p.annualAmount),
    componentes: p.componentCodes,
    recommended: p.recommended,
  }))

  // Los REQUIRES del servidor, más los RECOMMENDS editoriales. El orden importa
  // poco, pero la procedencia no: el primer bloque es contrato y el segundo es
  // contenido, y el día que se fundan hay que borrar el segundo, no mezclarlos.
  const arcos: ArcoDependencia[] = [
    ...respuesta.requirements.map<ArcoDependencia>((r) => ({
      desde: r.itemCode,
      hacia: r.requiredItemCode,
      tipo: 'REQUIRES',
      note: NOTA_DE_ARCO(r.itemCode, r.requiredItemCode),
    })),
    ...ARCOS_EDITORIALES,
  ]

  // El orden de `areas` llega resuelto por el `ORDER BY` del servidor y se copia
  // tal cual: no viaja ningún criterio con el que reordenarlo aquí.
  const areas: AreaCatalogo[] = respuesta.areas.map((a) => ({ code: a.code, nombre: a.name }))

  return {
    currency: respuesta.currency,
    priceValidFrom: respuesta.priceValidFrom,
    articulos,
    capacidades,
    paquetes,
    arcos,
    areas,
  }
}

/**
 * El catálogo comercial para un ciclo.
 *
 * @param ciclo
 *            el ciclo cuyo precio se quiere resolver. El catálogo trae los dos y
 *            aquí se elige uno; **no se deriva el anual del mensual**, que es
 *            exactamente el defecto que este repositorio ya publicó una vez.
 * @param signal
 *            para abortar. Viaja aunque hoy no haya nada que abortar, por el
 *            mismo motivo que en `plans.source.ts`: es el parámetro que axios va
 *            a querer, y añadirlo después cambiaría la firma que consumen el
 *            store y sus pruebas.
 */
export async function fetchCatalogo(
  ciclo: Ciclo,
  signal?: AbortSignal,
): Promise<CatalogoComercial> {
  if (signal?.aborted) throw signal.reason instanceof Error ? signal.reason : new Error('cancelado')

  // El velo global NO se levanta aquí, y no es una copia del asistente: el
  // catálogo se carga al montar `/planes`, que es la primera pantalla que ve un
  // visitante anónimo. Un overlay `inset: 0` con `cursor: wait` sobre la portada
  // es la peor primera impresión posible, y la sección ya tiene sus tres estados
  // (`loading`, `error`, dato) escritos para no necesitarlo.
  const { data } = await http.get<PublicCatalogResponse>('/catalog', {
    signal,
    skipGlobalLoader: true,
  })

  return componer(data, ciclo)
}
