<script setup lang="ts">
import LegalDocumentPage from '../components/LegalDocumentPage.vue'

/**
 * `/legal/privacidad` — la Política de Tratamiento de Datos Personales.
 *
 * <p>La ruta NO lleva `guestOnly`, a diferencia del resto de la zona pública.
 * Un cliente con sesión iniciada tiene el mismo derecho a releer la política que
 * un prospecto —de hecho más, porque ya autorizó bajo ella—, y `guestOnly` lo
 * mandaría al tablero. El derecho a conocer del artículo 8 no se pierde al
 * iniciar sesión.
 */
</script>

<template>
  <LegalDocumentPage code="PRIVACY_POLICY" />
</template>
