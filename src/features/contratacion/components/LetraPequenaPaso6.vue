<script setup lang="ts">
/**
 * La letra pequeña del paso vinculante: dos frases que tienen que estar delante
 * de quien va a confirmar, y ninguna de las dos es decorativa.
 *
 * ── Por qué no hay enlace a los documentos legales ─────────────────────────
 * Las dos páginas legales TODAVÍA NO EXISTEN. Un enlace que no navega falla
 * §2.4.4 y, peor, enseña al usuario que los enlaces de esta web no funcionan. En
 * Colombia el tratamiento de datos es una obligación legal (Ley 1581 de 2012),
 * así que esto es una dependencia de publicación y no un detalle de diseño: este
 * paso no se puede publicar sin ellas. Mientras tanto se dice cómo pedirlas.
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
</script>

<template>
  <p class="ds-meta ds-meta--sm">
    Todavía no están publicadas en la web: pídenoslas en
    <a href="mailto:soporte@vetsoftware.co">soporte@vetsoftware.co</a> y te las enviamos antes de
    que confirmes.
  </p>

  <p class="ds-meta ds-meta--sm">
    Durante la prueba no se cobra nada. Si quieres darte de baja antes de que empiece el cobro,
    escríbenos a <a href="mailto:soporte@vetsoftware.co">soporte@vetsoftware.co</a> y lo hacemos.
  </p>
</template>
