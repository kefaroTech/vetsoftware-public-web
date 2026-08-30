import { PRIVACIDAD } from './privacidad.content'
import { tienePendientes } from './responsable'
import { TERMINOS } from './terminos.content'
import type { LegalAcceptanceRef, LegalDocument, LegalDocumentCode } from '../types/legal.types'

/**
 * EL REGISTRO DE TEXTOS LEGALES — CONTENIDO, NO CONTRATO.
 *
 * <p>Mismo reparto que `plans.content.ts`: el texto es una decisión editorial y
 * jurídica que se escribe aquí, y `legal.source.ts` es el único punto del front
 * que sabe de dónde sale. Cuando `GET /legal-documents/{code}/current` se abra a
 * peticiones anónimas, cambia esa función y no cambia nada más.
 *
 * <p>Las claves son los `code` del backend, no rutas ni identificadores propios:
 * es lo que hace que «la política que el usuario aceptó» y «la fila de
 * `legal_document_versions`» nombren la misma cosa.
 */
export const LEGAL_DOCUMENTS: Record<LegalDocumentCode, LegalDocument> = {
  PRIVACY_POLICY: PRIVACIDAD,
  TERMS_OF_SERVICE: TERMINOS,
}

/**
 * Todo el texto del documento aplanado, incluidos el título y el resumen.
 *
 * <p>Existe para poder preguntarle cosas al documento entero sin recorrer la
 * estructura en cada sitio: hoy solo lo usa {@link esBorrador}, y esa es
 * exactamente la razón por la que la comprobación no depende de conocer qué
 * campos existen. Si mañana se añade un bloque nuevo a `LegalBlock` y alguien
 * olvida contemplarlo aquí, el `switch` deja de compilar.
 */
export function textoPlano(doc: LegalDocument): string {
  const partes: string[] = [doc.title, doc.resumen]
  for (const section of doc.sections) {
    partes.push(section.heading)
    for (const block of section.blocks) {
      switch (block.kind) {
        case 'p':
        case 'nota':
          partes.push(block.text)
          break
        case 'ul':
          partes.push(...block.items)
          break
        case 'dl':
          partes.push(...block.items.map((i) => `${i.term}: ${i.desc}`))
          break
      }
    }
  }
  return partes.join('\n')
}

/**
 * `true` mientras el documento arrastre algún marcador sin resolver.
 *
 * <p>No es una bandera que alguien tenga que acordarse de bajar: se deduce del
 * propio texto. El día que el último `pendiente(...)` de `responsable.ts` se
 * sustituya por el dato real, esto pasa a `false` y el recuadro rojo de la
 * cabecera desaparece solo.
 */
export function esBorrador(doc: LegalDocument): boolean {
  return tienePendientes(textoPlano(doc))
}

/**
 * La referencia que una aceptación tiene que guardar.
 *
 * <p>Es deliberadamente un objeto nuevo y no el documento entero: lo que viaja
 * con el consentimiento es la identidad de la versión, no medio megabyte de
 * texto. El texto se recupera después por `code` y versión.
 */
export function referenciaDe(doc: LegalDocument): LegalAcceptanceRef {
  return {
    code: doc.code,
    kind: doc.kind,
    documentVersion: doc.documentVersion,
    effectiveFrom: doc.effectiveFrom,
  }
}
