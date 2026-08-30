import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { fetchLegalDocument } from '../api/legal.source'
import { esBorrador, referenciaDe } from '../content/legal.content'
import type { LegalAcceptanceRef, LegalDocument, LegalDocumentCode } from '../types/legal.types'

/**
 * Los textos legales publicados.
 *
 * <p>Está en Pinia y no en un `ref()` a nivel de módulo porque lo consumen tres
 * sitios que no se conocen entre sí —las dos páginas legales y la casilla de
 * consentimiento, esté donde esté— y ese es exactamente el estado compartido que
 * la regla dura del repositorio manda a un store. La casilla necesita saber QUÉ
 * versión está enlazando; si cada componente cargara la suya, dos casillas de la
 * misma pantalla podrían referirse a versiones distintas.
 *
 * <p>`load(code, force)` deduplica por documento —la promesa en vuelo se guarda
 * por `code`, no una sola global— y vuelve a pedir cuando se fuerza, alineado
 * con «recargar siempre al abrir pantalla». Hoy detrás no hay red (ver
 * `legal.source.ts`), pero el comportamiento ya es el correcto para cuando la
 * haya.
 */
export const useLegalStore = defineStore('legal', () => {
  const documentos = ref<Partial<Record<LegalDocumentCode, LegalDocument>>>({})
  const loading = ref(false)
  const error = ref<unknown>(null)

  const inFlight = new Map<LegalDocumentCode, Promise<void>>()

  function documento(code: LegalDocumentCode): LegalDocument | null {
    return documentos.value[code] ?? null
  }

  /**
   * La referencia que viaja con una aceptación, o `null` si ese documento
   * todavía no se ha cargado.
   *
   * <p>Devolver `null` en vez de un objeto a medias es deliberado: quien recoge
   * un consentimiento tiene que poder distinguir «acepta la versión 1» de «no sé
   * qué versión está aceptando», y un `documentVersion: 0` de relleno haría esa
   * distinción imposible justo donde más importa.
   */
  function referencia(code: LegalDocumentCode): LegalAcceptanceRef | null {
    const doc = documento(code)
    return doc ? referenciaDe(doc) : null
  }

  /** `true` si algún documento cargado arrastra marcadores sin resolver. */
  const hayBorradores = computed(() =>
    Object.values(documentos.value).some((doc) => doc !== undefined && esBorrador(doc)),
  )

  async function load(code: LegalDocumentCode, force = false): Promise<void> {
    if (!force && documentos.value[code]) return
    const enCurso = inFlight.get(code)
    if (enCurso) return enCurso

    loading.value = true
    error.value = null
    const promesa = (async () => {
      try {
        // El `await` va en su propia línea, y no dentro del literal, a
        // propósito. `{ ...documentos.value, [code]: await fetch(...) }` evalúa
        // el `spread` ANTES de suspender: dos cargas en paralelo —que es
        // exactamente lo que hace la casilla de consentimiento, que pide los dos
        // documentos— capturarían las dos el mismo mapa vacío y la segunda
        // escritura borraría a la primera. La casilla se quedaba enlazando y
        // fechando un solo documento, en silencio, y así lo cazó
        // `legal-documents.spec.ts`.
        const doc = await fetchLegalDocument(code)
        documentos.value = { ...documentos.value, [code]: doc }
      } catch (e) {
        // El documento NO se borra al fallar una recarga: dejar en blanco una
        // política que ya estaba en pantalla es peor que mostrar la anterior,
        // porque el usuario se queda sin el texto que la casilla dice que ha
        // leído.
        error.value = e
      } finally {
        loading.value = false
        inFlight.delete(code)
      }
    })()
    inFlight.set(code, promesa)
    return promesa
  }

  return { documentos, loading, error, hayBorradores, documento, referencia, load }
})
