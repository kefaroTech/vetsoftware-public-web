<script setup lang="ts">
/**
 * El pie de la landing.
 *
 * ── «Privacidad» y «Términos» YA SON ENLACES ───────────────────────────────
 * Antes eran `href="#" @click.prevent`, y después texto plano. El texto plano
 * era la decisión correcta mientras las páginas no existían: un enlace que no
 * navega falla §2.4.4 y, peor, le enseña al usuario que los enlaces de esta web
 * no funcionan — con lo que deja de pulsar los que sí. La solución de un enlace
 * muerto nunca fue dejarlo, sino quitar el enlace **hasta que la página
 * exista**.
 *
 * Ya existen (`/legal/privacidad` y `/legal/terminos`), así que vuelven a ser
 * enlaces. En una landing comercial en Colombia el tratamiento de datos es una
 * obligación legal (Ley 1581 de 2012), no decoración de pie de página: el
 * artículo 2.2.2.25.3.1 del Decreto 1074 de 2015 exige que la política sea
 * conocible, y la casilla del paso de contratación enlaza a las mismas dos
 * páginas.
 *
 * «Soporte» sigue navegando, porque `mailto:` es un destino real.
 */
</script>

<template>
  <footer class="land-footer">
    <p class="land-footer-legal">
      <span>© 2026 VetSoftware · Colombia</span>
    </p>
    <p class="land-footer-links">
      <RouterLink :to="{ name: 'legal-privacidad' }">Privacidad</RouterLink>
      <RouterLink :to="{ name: 'legal-terminos' }">Términos</RouterLink>
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
</style>
