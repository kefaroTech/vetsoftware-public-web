<script setup lang="ts">
import LegalDocumentPage from '../components/LegalDocumentPage.vue'

/**
 * `/legal/terminos` — los Términos del Servicio.
 *
 * <p>Sin `guestOnly`, por el mismo motivo que la política: quien ya contrató
 * tiene que poder releer lo que aceptó sin que un guard lo devuelva al tablero.
 */
</script>

<template>
  <LegalDocumentPage code="TERMS_OF_SERVICE" />
</template>
