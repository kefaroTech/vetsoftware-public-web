import type { ArcoDependencia, CatalogoComercial } from '../types/catalogo.types'

/**
 * El grafo de dependencias, recorrido en el front.
 *
 * ── Por qué ESTO sí puede vivir fuera del seam y el precio no ───────────────
 * La regla es «un precio que se pinta es un precio que calculó el servidor». Un
 * arco no es un precio: es una relación publicada en `GET /catalog` que el
 * propio contrato dice que hay que recorrer en anchura porque **no publica el
 * cierre transitivo**. Recorrerlo aquí no produce ninguna cifra; solo decide qué
 * casillas se marcan y qué aviso se enseña **antes** de pedir nada.
 *
 * <p>Y hace falta que sea antes: sin esto, el usuario marca «Cuentas abiertas»,
 * la petición vuelve con Caja dentro y 46.000 pesos más en el total, y quien
 * navega con lector se los encuentra sin saber de dónde salieron. El aviso
 * inline que este módulo alimenta es lo que convierte esa sorpresa en una
 * explicación — y la explicación la escribió el negocio, no nosotros.
 *
 * <p>El servidor vuelve a cerrar los `REQUIRES` de todas formas. Que las dos
 * capas hagan el mismo recorrido no es duplicación ociosa: aquí decide lo que se
 * ve, allí decide lo que se cobra, y solo lo segundo es vinculante.
 */

/** Recorre `REQUIRES` en anchura con conjunto de visitados y devuelve lo AÑADIDO. */
function cerrar(
  semillas: readonly string[],
  dentro: Set<string>,
  catalogo: CatalogoComercial,
): string[] {
  const anadidos: string[] = []
  const cola = [...semillas]
  const visitados = new Set<string>()

  while (cola.length > 0) {
    const code = cola.shift()
    if (code === undefined || visitados.has(code)) continue
    visitados.add(code)
    for (const arco of catalogo.arcos) {
      if (arco.tipo !== 'REQUIRES' || arco.desde !== code || dentro.has(arco.hacia)) continue
      dentro.add(arco.hacia)
      anadidos.push(arco.hacia)
      cola.push(arco.hacia)
    }
  }
  return anadidos
}

/**
 * Qué arrastraría marcar `code`, con la cadena ENTERA.
 *
 * <p>`EXTRA_STORAGE → LAB_IMAGING → CLINICAL_HISTORY` son tres saltos, y el
 * aviso tiene que nombrar todo lo que se añadió — no solo el primer eslabón.
 * **Con conjunto de visitados aunque la semilla verificara a mano que no hay
 * ciclos**: un catálogo puede cambiar sin que este código se entere, y un bucle
 * infinito en la pantalla que decide una compra no se paga por ahorrar tres
 * líneas.
 */
export function arrastraAlMarcar(
  code: string,
  seleccion: readonly string[],
  catalogo: CatalogoComercial,
): string[] {
  const dentro = new Set([...seleccion, code])
  return cerrar([code], dentro, catalogo)
}

/**
 * Qué se caería al desmarcar `code`: lo que depende de él, transitivamente.
 *
 * <p>Es la dirección contraria y **ahí sí hay confirmación**: quitar Caja cuando
 * Cuentas abiertas depende de ella se lleva las dos, y eso destruye algo que el
 * usuario eligió a propósito. Auto-añadir una consecuencia obligatoria es
 * razonable —no hay otra respuesta posible que «vale»—; auto-destruir una
 * elección, no.
 */
export function caeAlQuitar(
  code: string,
  seleccion: readonly string[],
  catalogo: CatalogoComercial,
): string[] {
  const caidos: string[] = []
  const cola = [code]
  const visitados = new Set<string>()
  const dentro = new Set(seleccion)

  while (cola.length > 0) {
    const actual = cola.shift()
    if (actual === undefined || visitados.has(actual)) continue
    visitados.add(actual)
    for (const arco of catalogo.arcos) {
      if (arco.tipo !== 'REQUIRES' || arco.hacia !== actual) continue
      if (!dentro.has(arco.desde) || visitados.has(arco.desde)) continue
      caidos.push(arco.desde)
      cola.push(arco.desde)
    }
  }
  return caidos
}

/**
 * Los `RECOMMENDS` aplicables: se sugieren, **jamás se añaden**.
 *
 * <p>Que el catálogo distinga los dos tipos de arco y la interfaz los pintara
 * igual sería tirar la única información que lo hace legible. Un `RECOMMENDS`
 * que se auto-añade es un upsell disfrazado de requisito técnico, y eso se
 * detecta y se castiga.
 */
export function sugerenciasDe(
  seleccion: readonly string[],
  catalogo: CatalogoComercial,
): ArcoDependencia[] {
  const dentro = new Set(seleccion)
  return catalogo.arcos.filter(
    (a) => a.tipo === 'RECOMMENDS' && dentro.has(a.desde) && !dentro.has(a.hacia),
  )
}
