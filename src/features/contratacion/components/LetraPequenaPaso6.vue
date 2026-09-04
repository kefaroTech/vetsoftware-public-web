<script setup lang="ts">
/**
 * La letra pequeña del paso vinculante: dos frases que tienen que estar delante
 * de quien va a confirmar, y ninguna de las dos es decorativa.
 *
 * ── Los documentos legales YA están publicados ─────────────────────────────
 * Este bloque decía «Todavía no están publicadas en la web: pídenoslas en
 * soporte@…», y llevaba siendo mentira desde que existen `/legal/terminos` y
 * `/legal/privacidad`: la casilla de encima las enlaza por su nombre y con su
 * versión. Dos frases contradictorias sobre la misma obligación legal (Ley 1581
 * de 2012), a un centímetro una de otra, en la pantalla que decide la compra —y
 * la que pedía escribir un correo es la que hace abandonar.
 *
 * <p>No se repiten aquí los enlaces: serían un segundo par al mismo destino en
 * la lista de enlaces de un lector de pantalla. Se dice dónde están, y solo
 * cuando la casilla está pintada — sin ella (sin permiso, o sin precio) no hay
 * nada que enlazar arriba y la frase señalaría al vacío.
 *
 * ── Por qué la baja se explica aquí ────────────────────────────────────────
 * La vía «Reversible» de WCAG §3.3.4 no se puede reclamar —no hay superficie de
 * baja en el producto—, así que la pantalla no promete «cancela cuando quieras».
 * Dice lo que es verdad: escríbenos y lo hacemos.
 *
 * Vive en su propio componente y no en la vista porque la vista roza el techo de
 * 500 líneas de `css:budget`, y porque esto es texto que se revisa con legal, no
 * lógica de la pantalla.
 */
defineProps<{
  /**
   * Si arriba se está pintando `LegalConsentCheckbox`. Es lo que decide si la
   * primera frase tiene a qué referirse: la vista la esconde cuando falta el
   * permiso o falta el precio, y entonces no hay casilla ni enlaces.
   */
  conCasilla: boolean
}>()
</script>

<template>
  <p v-if="conCasilla" class="ds-meta ds-meta--sm">
    Los dos documentos están enlazados en la casilla de arriba y se abren en una pestaña nueva: los
    puedes leer sin perder nada de esta pantalla.
  </p>

  <p class="ds-meta ds-meta--sm">
    Durante la prueba no se cobra nada. Si quieres darte de baja antes de que empiece el cobro,
    escríbenos a <a href="mailto:soporte@kefaro.tech">soporte@kefaro.tech</a> y lo hacemos.
  </p>
</template>
