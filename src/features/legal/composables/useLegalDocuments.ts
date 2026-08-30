import { storeToRefs } from 'pinia'
import { computed, onMounted } from 'vue'
import { useLegalStore } from '../stores/legal.store'
import type { LegalDocumentCode } from '../types/legal.types'

/**
 * API estable de los textos legales para los componentes.
 *
 * <p>Wrapper del store, en la línea de `usePlanes` / `useSpecies`: los
 * componentes no conocen el store, solo esto.
 *
 * @param codes
 *            los documentos que esta pantalla necesita. La casilla de
 *            consentimiento pide los dos que enlaza; cada página legal, el suyo.
 * @param autoload
 *            fuerza la recarga al montar, que es la regla del repositorio para
 *            toda pantalla o modal que se abre.
 */
export function useLegalDocuments(codes: LegalDocumentCode[], autoload = true) {
  const store = useLegalStore()
  const { loading, error, hayBorradores } = storeToRefs(store)

  if (autoload) {
    onMounted(() => {
      for (const code of codes) void store.load(code, true)
    })
  }

  /** Los documentos pedidos, en el orden en que se pidieron, ya cargados. */
  const documentos = computed(() =>
    codes.map((code) => store.documento(code)).filter((doc) => doc !== null),
  )

  return {
    documentos,
    loading,
    error,
    hayBorradores,
    documento: store.documento,
    referencia: store.referencia,
    refresh: () => Promise.all(codes.map((code) => store.load(code, true))),
  }
}
