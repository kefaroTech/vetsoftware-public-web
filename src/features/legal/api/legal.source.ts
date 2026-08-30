import { LEGAL_DOCUMENTS } from '../content/legal.content'
import type {
  LegalAcceptanceRef,
  LegalDocument,
  LegalDocumentCode,
  LegalDocumentVersionResponse,
} from '../types/legal.types'

/**
 * EL SEAM de los textos legales.
 *
 * <p>Es la única función del front que sabe de dónde sale un texto legal. Hoy
 * devuelve `content/legal.content.ts`, y no es una decisión de comodidad: es lo
 * único que hoy funciona.
 *
 * ── Por qué NO llama al backend, aunque el endpoint exista ─────────────────
 * `GET /legal-documents/{code}/current` existe desde el changeset 353, pero es
 * inalcanzable para el público de estas páginas, y por DOS motivos
 * independientes que hay que arreglar los dos:
 *
 *  1. La ruta no está en `PublicRoutes.BUSINESS`, así que el `AuthFilter` la
 *     rechaza sin JWT antes de llegar al controlador.
 *  2. `FindCurrentLegalDocumentUseCase` exige
 *     `hasRole('SYSTEM') or (hasAuthority('legaldocument.read') and
 *     @authz.isMyCompany(#companyId))`. Un prospecto sin cuenta no tiene ninguna
 *     de las dos cosas.
 *
 * Un prospecto que va a marcar una casilla de consentimiento es, por definición,
 * anónimo: si la política se pidiera por red, la página se quedaría en blanco
 * con un 401 y la casilla enlazaría a nada. Llamar igualmente «por si acaso»
 * sería peor que no llamar: el interceptor de axios levanta el loader global y
 * un 401 en la zona pública manda a login.
 *
 * ── Qué hay que cambiar aquí cuando el backend abra la ruta ────────────────
 * Sustituir el cuerpo por la petición y mapear con {@link desdeRespuesta}. La
 * firma —asíncrona, con `signal`— ya es la que va a necesitar, y por eso se
 * escribe así desde ahora: las pantallas que la consumen ya nacen con sus
 * estados de carga y de error en su sitio.
 */
export async function fetchLegalDocument(
  code: LegalDocumentCode,
  signal?: AbortSignal,
): Promise<LegalDocument> {
  // El `await` de un microtask no es decorativo: garantiza que ningún consumidor
  // pueda depender de que el documento esté disponible de forma síncrona en el
  // mismo tick, que es lo que dejaría de ser cierto con red detrás.
  await Promise.resolve()
  if (signal?.aborted) throw signal.reason instanceof Error ? signal.reason : new Error('cancelado')
  return LEGAL_DOCUMENTS[code]
}

/**
 * Traduce la respuesta del backend a la referencia que viaja con una aceptación.
 *
 * <p>Se escribe y se prueba ANTES de que haya red porque es la mitad del
 * mecanismo que decide si un consentimiento prueba algo: `documentVersion` es la
 * versión de negocio (la columna `document_version`), NUNCA el `version` de
 * bloqueo optimista, y confundirlas guardaría en la aceptación un número que no
 * identifica ningún texto.
 *
 * <p>`contentHash` no entra en la referencia a propósito: la huella la calcula
 * el dominio del backend sobre el `content` que él guarda, y este front no tiene
 * ese `content` byte a byte mientras el texto viva en `legal.content.ts`.
 * Inventar aquí un hash local produciría una huella que no coincide con ninguna
 * fila —exactamente la divergencia que la columna existe para impedir—. Cuando
 * el documento se publique en el backend, la huella se toma de la respuesta.
 */
export function desdeRespuesta(res: LegalDocumentVersionResponse): LegalAcceptanceRef {
  return {
    code: res.code as LegalDocumentCode,
    kind: res.kind,
    documentVersion: res.documentVersion,
    effectiveFrom: res.effectiveFrom,
  }
}
