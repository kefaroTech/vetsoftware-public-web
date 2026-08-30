/**
 * Los textos legales, del lado del front.
 *
 * ── Por qué estos tipos espejan `legal_document_versions` y no otra cosa ────
 * El backend versiona los textos legales desde el changeset 353: cada
 * publicación es una fila inmutable con `code`, `document_version`, `kind`,
 * `content` y un `content_hash` SHA-256 que el dominio calcula sobre el propio
 * contenido. Un texto no se edita, se sucede. Ese mecanismo solo sirve para algo
 * si la aceptación guarda **qué versión** se aceptó; si el front renderiza una
 * política que el backend no sabe versionar, el consentimiento no prueba nada.
 *
 * Por eso aquí conviven dos formas y no una:
 *
 *  - {@link LegalDocument} — el documento tal como esta aplicación lo pinta:
 *    secciones, encabezados y bloques. Es lo que hace legible un texto largo.
 *  - {@link PublicLegalDocumentResponse} — el espejo exacto de la respuesta del
 *    backend, atado al contrato en `api.contract.ts`. No lo consume ninguna
 *    pantalla todavía (ver `legal.source.ts`), y aun así se declara: es lo que
 *    hace que un cambio de forma en la tabla rompa este build en vez de romper
 *    la aceptación en producción.
 */

/**
 * Espejo literal de `LegalDocumentKind` (el enum Java del backend).
 *
 * <p>Se replica entero aunque este front solo publique dos de los cinco: la
 * regla del repositorio es copiar el enum del dominio tal cual, y un enum
 * recortado deja de fallar al compilar el día que el backend manda otro valor.
 */
export type LegalDocumentKind =
  'TERMS' | 'PRIVACY_POLICY' | 'DATA_PROCESSING_AGREEMENT' | 'PRIVACY_NOTICE' | 'COMMITMENT_ANNEX'

/**
 * Los `code` que esta aplicación publica hoy.
 *
 * <p>`code` es la identidad estable del documento a lo largo de sus versiones;
 * `kind` es su naturaleza. El backend los guarda por separado a propósito, así
 * que aquí también.
 */
export type LegalDocumentCode = 'TERMS_OF_SERVICE' | 'PRIVACY_POLICY'

/** Un bloque de texto dentro de una sección. */
export type LegalBlock =
  | { kind: 'p'; text: string }
  | { kind: 'ul'; items: string[] }
  | { kind: 'dl'; items: { term: string; desc: string }[] }
  /** Recuadro destacado: lo que un lector no puede pasar por alto. */
  | { kind: 'nota'; text: string }

/**
 * Una sección con su encabezado.
 *
 * <p>`id` no es decorativo: es el ancla del índice y el `aria-labelledby` de la
 * sección. Un documento legal largo sin índice ni jerarquía de encabezados es
 * inaccesible aunque el contraste sea perfecto (§2.4.6, §2.4.10, §1.3.1).
 */
export interface LegalSection {
  id: string
  heading: string
  blocks: LegalBlock[]
}

/** Un documento legal, tal como esta aplicación lo pinta y lo versiona. */
export interface LegalDocument {
  code: LegalDocumentCode
  kind: LegalDocumentKind
  title: string
  /** La versión DE NEGOCIO, la misma que el backend llama `documentVersion`. */
  documentVersion: number
  /** ISO `yyyy-MM-dd`, como `effective_from`. */
  effectiveFrom: string
  /** Una frase que resume el documento; se pinta bajo el `<h1>`. */
  resumen: string
  sections: LegalSection[]
}

/**
 * Lo que una aceptación tiene que guardar para probar QUÉ se aceptó.
 *
 * <p>Es la pieza que viaja con el consentimiento. Sin ella, «el usuario aceptó
 * la política» es una afirmación sin referente: la política de hoy no es la de
 * dentro de seis meses, y el backend guarda las dos.
 */
export interface LegalAcceptanceRef {
  code: LegalDocumentCode
  kind: LegalDocumentKind
  documentVersion: number
  effectiveFrom: string
}

/**
 * Espejo de `PublicLegalDocumentResponse` del backend.
 *
 * <p>Todos los campos son obligatorios salvo `supersededAt`, que es justamente
 * el que distingue la versión vigente de las sucedidas.
 *
 * <p><b>Es la vista PÚBLICA, y por eso NO lleva `publishedBySystemUserId`.</b>
 * La ruta que este front consume —`GET /legal-documents/{code}/current`— es
 * anónima, y el backend le responde `PublicLegalDocumentResponse`
 * precisamente para no publicar el id del administrador de plataforma que firmó
 * la publicación: es un identificador interno y enumerable que no le sirve de
 * nada a quien lee el aviso de privacidad.
 *
 * <p><b>No lo vuelvas a añadir.</b> El campo sigue existiendo en
 * `LegalDocumentVersionResponse`, que es lo que devuelven las TRES operaciones
 * autenticadas del mismo controller (publicar, releer por huella y listar
 * versiones) y lo que espeja la consola de plataforma. Que la consola lo declare
 * y este front no, no es una divergencia a corregir: es la diferencia entre la
 * vista autenticada y la pública.
 */
export interface PublicLegalDocumentResponse {
  id: number
  code: string
  documentVersion: number
  kind: LegalDocumentKind
  title: string
  content: string
  /** SHA-256 del contenido: la huella con la que se prueba qué texto se aceptó. */
  contentHash: string
  publishedAt: string
  effectiveFrom: string
  supersededAt?: string | null
  current: boolean
  createdDate: string
}
