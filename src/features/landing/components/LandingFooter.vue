<script setup lang="ts">
import { irAAncla } from '../composables/anclaConFoco'

/**
 * El pie de la landing.
 *
 * ── Por qué «Privacidad» y «Términos» siguen aquí ──────────────────────────
 * El copy aprobado del rediseño deja el pie en marca, paquetes, preguntas y
 * soporte. Los dos enlaces legales se conservan igual: en una landing comercial
 * en Colombia el tratamiento de datos es una obligación legal (Ley 1581 de
 * 2012), y el artículo 2.2.2.25.3.1 del Decreto 1074 de 2015 exige que la
 * política sea conocible. La casilla del paso de contratación enlaza a estas
 * mismas dos páginas.
 */
</script>

<template>
  <footer class="land-footer">
    <p class="land-footer-legal">Lumbre · Colombia</p>
    <p class="land-footer-links">
      <a href="#planes" @click="irAAncla('planes', $event)">Paquetes</a>
      <a href="#preguntas" @click="irAAncla('preguntas', $event)">Preguntas</a>
      <RouterLink :to="{ name: 'legal-privacidad' }">Privacidad</RouterLink>
      <RouterLink :to="{ name: 'legal-terminos' }">Términos</RouterLink>
      <a href="mailto:soporte@kefaro.tech">soporte@kefaro.tech</a>
    </p>
  </footer>
</template>

<style scoped>
.land-footer {
  position: relative;
  z-index: 1;
  max-width: 1120px;
  margin: 0 auto;
  padding: 56px 32px 40px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  font-size: 13px;

  /* `--pub-ink-400` mide 3,94:1 sobre blanco: falla §1.4.3 AA para texto
     normal. `--pub-ink-500` mide 5,96:1. */
  color: var(--pub-ink-500);
}

.land-footer-legal,
.land-footer-links {
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 20px;
}

.land-footer-links a {
  color: var(--pub-ink-500);
  text-decoration: underline;
}

.land-footer-links a:hover {
  color: var(--pub-ame-700);
}
</style>
