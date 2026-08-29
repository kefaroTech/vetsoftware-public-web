<script setup lang="ts">
/**
 * El pie de la landing.
 *
 * ── Por qué «Privacidad» y «Términos» son TEXTO y no enlaces ───────────────
 * Antes eran `href="#" @click.prevent`. Un enlace que no navega falla §2.4.4 y,
 * peor, le enseña al usuario que los enlaces de esta web no funcionan — con lo
 * que deja de pulsar los que sí. La solución de un enlace muerto no es dejarlo:
 * es **quitar el enlace y dejar el texto** hasta que la página exista.
 *
 * Y son texto, no desaparecen, porque en una landing comercial en Colombia el
 * tratamiento de datos es una obligación legal (Ley 1581 de 2012), no decoración
 * de pie de página: la casilla del paso de contratación enlaza a ellas, así que
 * **tienen que existir antes de que el flujo de contratación se publique**.
 *
 * «Soporte» sí navega, porque `mailto:` es un destino real.
 */
</script>

<template>
  <footer class="land-footer">
    <p class="land-footer-legal">
      <span>© 2026 VetSoftware · Colombia</span>
    </p>
    <p class="land-footer-links">
      <span class="land-footer-soon">Privacidad</span>
      <span class="land-footer-soon">Términos</span>
      <a href="mailto:soporte@vetsoftware.co">Soporte</a>
    </p>
  </footer>
</template>

<style scoped>
.land-footer {
  position: relative;
  z-index: 1;
  padding: 26px clamp(20px, 5vw, 44px);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-top: 1px solid var(--pub-line);
  font-size: 12.5px;

  /* `--pub-ink-400` mide 4,05:1 sobre blanco: falla §1.4.3 AA para texto
     normal, y este pie es de 12,5 px. `--pub-ink-500` mide 6,12:1. */
  color: var(--pub-ink-500);
}

.land-footer-legal,
.land-footer-links {
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 18px;
}

.land-footer-links a {
  color: var(--pub-ink-500);
  text-decoration: underline;
}

.land-footer-links a:hover {
  color: var(--pub-ame-700);
}

/* Pendiente de que exista la página. Texto, no enlace: ver el comentario de
   arriba. */
.land-footer-soon {
  color: var(--pub-ink-500);
}
</style>
