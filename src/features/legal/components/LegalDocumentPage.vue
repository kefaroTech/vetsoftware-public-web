<script setup lang="ts">
import { computed } from 'vue'
import { PawPrint } from 'lucide-vue-next'
import LegalDocumentBody from './LegalDocumentBody.vue'
import { useLegalDocuments } from '../composables/useLegalDocuments'
import { LEGAL_DOCUMENTS } from '../content/legal.content'
import type { LegalDocumentCode } from '../types/legal.types'

/**
 * El armazón de una página legal: marca, salto de bloque, documento y pie.
 *
 * <p>Las dos páginas legales son la misma pantalla con distinto documento, así
 * que el armazón se escribe una vez. Cada vista sólo dice qué `code` pinta.
 *
 * <p>El enlace del pie al OTRO documento no es cortesía: la casilla de
 * consentimiento nombra los dos, y quien llega a uno tiene que poder leer el
 * otro sin volver atrás con el navegador.
 */
const props = defineProps<{ code: LegalDocumentCode }>()

const { documento } = useLegalDocuments([props.code])

const doc = computed(() => documento(props.code))

/** El otro documento, para el enlace del pie. */
const otro = computed(() =>
  props.code === 'PRIVACY_POLICY'
    ? { ruta: 'legal-terminos', titulo: LEGAL_DOCUMENTS.TERMS_OF_SERVICE.title }
    : { ruta: 'legal-privacidad', titulo: LEGAL_DOCUMENTS.PRIVACY_POLICY.title },
)
</script>

<template>
  <div class="pub-scope pub-doc-stage">
    <!-- §2.4.1 Bypass Blocks. Primer elemento focalizable: antes de la marca. -->
    <a class="pub-skip" href="#contenido">Saltar al contenido</a>

    <header class="pub-doc-topbar">
      <RouterLink :to="{ name: 'landing' }" class="pub-doc-brand">
        <PawPrint :size="18" aria-hidden="true" />
        VetSoftware
      </RouterLink>
    </header>

    <main id="contenido" class="pub-doc-page" tabindex="-1">
      <!-- Sin `v-if` el documento no existe en el primer pintado: la carga pasa
           por el seam asíncrono de `legal.source.ts`, que hoy resuelve en un
           microtask y mañana por red. -->
      <LegalDocumentBody v-if="doc" :doc="doc" />

      <div class="pub-doc-foot">
        <RouterLink :to="{ name: otro.ruta }">{{ otro.titulo }}</RouterLink>
        <RouterLink :to="{ name: 'landing' }">Volver al inicio</RouterLink>
      </div>
    </main>
  </div>
</template>

<style scoped>
/* El destino del salto no es focalizable por naturaleza: sin `tabindex="-1"` el
   hash mueve el scroll pero deja el foco en el `<body>`, y la siguiente
   tabulación vuelve a la barra — el bloque no se ha saltado. */
.pub-doc-page:focus {
  outline: none;
}
</style>
