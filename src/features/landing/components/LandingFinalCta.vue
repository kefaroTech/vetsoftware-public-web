<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { irAAncla } from '../composables/anclaConFoco'

/**
 * §F — el cierre.
 *
 * Repite las dos acciones del hero al final del recorrido, para quien leyó la
 * página entera y no quiere volver arriba. Los dos son enlaces reales, con su
 * destino, y ninguno envuelve más texto que su propio rótulo.
 *
 * ── Por qué el primario cambió de destino ───────────────────────────────────
 * Apuntaba a los paquetes, igual que el del hero, y con el mismo rótulo: dos
 * botones sólidos morados —la máxima prominencia de la página— enseñando que la
 * unidad de compra es el paquete. Ahora devuelve a la caja de arranque, que es
 * el camino principal. Sube por ancla y no por ruta a propósito: el cotizador
 * está en esta misma página, y hacerle navegar a `/planes` a quien acaba de leer
 * la landing entera le costaría una carga para llegar al mismo campo.
 *
 * <p>Y el rótulo de los paquetes deja de ser «Ver los planes», que era idéntico
 * al del hero yendo a otro sitio (§2.4.4: fuera de contexto no se podía saber a
 * cuál se iba). Este navega a `/planes`; ya no hay ningún otro que se llame así.
 */
</script>

<template>
  <section class="pub-section" aria-labelledby="cierre-titulo">
    <div class="pub-section-head">
      <h2 id="cierre-titulo">Empieza hoy. Sin tarjeta.</h2>
      <p>Creas tu clínica, verificas el correo y ya estás dentro.</p>
    </div>
    <div class="land-cta-row">
      <a
        href="#cotizador"
        class="land-cta land-cta--primary"
        @click="irAAncla('cotizador', $event)"
      >
        Cuéntanos qué necesitas
      </a>
      <RouterLink :to="{ name: 'planes' }" class="land-cta land-cta--ghost">
        Ver los tres paquetes
      </RouterLink>
    </div>
  </section>
</template>

<style scoped>
.land-cta-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
}

.land-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  padding: 0 26px;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  text-decoration: none;
}

.land-cta--primary {
  background: linear-gradient(180deg, var(--pub-ame-600), var(--pub-ame-700));
  color: var(--pub-surface);
  box-shadow: var(--pub-btn-shadow);
}

.land-cta--ghost {
  background: rgb(255 255 255 / 70%);
  border: 1px solid var(--pub-line-strong);
  color: var(--pub-ink-700);
}
</style>
