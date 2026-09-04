import { CLAVES_POR_CODIGO } from '@/features/asistente/content/catalogo.content'

/**
 * Los módulos que menciona un texto escrito a mano, sin salir del navegador.
 *
 * <p>Es un eco barato del asistente, no un sustituto: el asistente razona y
 * explica módulo a módulo, pero para eso el relato tiene que viajar a un
 * encargado en EE. UU., y eso exige dos autorizaciones (Ley 1581, art. 9 y 26
 * lit. a) que no caben sobre el primer pliegue. Comparar aquí contra el
 * vocabulario del catálogo es la única forma de proponer algo en la portada.
 */

/**
 * Una clave se busca a PRINCIPIO DE PALABRA, nunca como subcadena suelta: así
 * «ahora» dejó de mencionar la agenda y «radiografías», la cartera.
 *
 * <p>El lookbehind sobre `\p{L}\p{N}` y no `\b`, porque el `\b` de JavaScript
 * cuenta como palabra solo `[A-Za-z0-9_]`: con él, «baño» tras una tilde o una
 * eñe partiría por la mitad.
 */
function patron(clave: string): RegExp {
  const escapada = clave.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(?<![\\p{L}\\p{N}])${escapada}`, 'iu')
}

const PATRONES: ReadonlyMap<string, readonly RegExp[]> = new Map(
  Object.entries(CLAVES_POR_CODIGO).map(([code, claves]) => [code, claves.map(patron)]),
)

/**
 * @param texto lo que el visitante escribió sobre su negocio
 * @param codigos los códigos vendibles del catálogo vigente, en su orden
 * @return los que el texto nombra, en el orden de `codigos`
 */
export function detectarModulos(texto: string, codigos: readonly string[]): string[] {
  const limpio = texto.trim()
  if (limpio.length === 0) return []
  return codigos.filter((code) => PATRONES.get(code)?.some((p) => p.test(limpio)) ?? false)
}
