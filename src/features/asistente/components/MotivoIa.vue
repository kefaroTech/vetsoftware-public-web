<script setup lang="ts">
/**
 * El motivo que escribió el asistente, bajo el nombre del módulo.
 *
 * ── Cuatro decisiones tipográficas, y ninguna es decorativa ─────────────────
 *
 *  1. **Sin comillas, sin `<blockquote>`, sin `<q>`, sin icono de bocadillo.**
 *     Todo eso enmarca el texto como una declaración de alguien autorizado.
 *     Esto es una anotación sobre de dónde salió la línea, no una declaración.
 *  2. **Cursiva, 12,5 px, `--pub-ink-600`.** Registro de nota al margen. Nunca
 *     el peso ni el tamaño del nombre del módulo o del precio: **lo generado no
 *     puede competir visualmente con el dato verificado.**
 *  3. **Interpolación, jamás `v-html`.** El texto viene de una entrada de
 *     usuario procesada por un tercero: es el vector de XSS de manual, y aquí
 *     además hay un modelo en medio al que se le puede pedir que escriba
 *     marcado. El saneamiento del servidor es la primera defensa; esto es que no
 *     haya segunda oportunidad.
 *  4. **`--pub-ink-600` y no más claro.** `--pub-ink-400` y `--pub-ink-300` no
 *     son colores de texto en este sistema.
 *
 * <p>Y la regla de fondo, que es la que evita la promesa contractual: **el
 * motivo explica de dónde salió la línea, no qué va a conseguir el cliente.**
 * Es una traza de la decisión, no una propuesta de valor. Redactado así no
 * puede prometer nada, porque no habla del futuro.
 */
defineProps<{ texto: string }>()
</script>

<template>
  <p class="mia">{{ texto }}</p>
</template>

<style scoped>
.mia {
  margin: 3px 0 0;
  font-size: 12.5px;
  font-style: italic;
  line-height: 1.45;
  color: var(--pub-ink-600);
}
</style>
