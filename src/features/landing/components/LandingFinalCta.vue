<script setup lang="ts">
import { RouterLink } from 'vue-router'

/**
 * §F — el cierre.
 *
 * Repite las dos acciones del hero al final del recorrido, para quien leyó la
 * página entera y no quiere volver arriba. Los dos son enlaces reales, con su
 * destino, y ninguno envuelve más texto que su propio rótulo.
 */
</script>

<template>
  <section class="pub-section" aria-labelledby="cierre-titulo">
    <div class="pub-section-head">
      <h2 id="cierre-titulo">Empieza hoy. Sin tarjeta.</h2>
      <p>Creas tu clínica, verificas el correo y ya estás dentro.</p>
    </div>
    <div class="land-cta-row">
      <RouterLink :to="{ name: 'planes' }" class="land-cta land-cta--primary">
        Ver los planes
      </RouterLink>
      <RouterLink :to="{ name: 'login' }" class="land-cta land-cta--ghost">
        Ya tengo cuenta
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
  background: linear-gradient(180deg, #9333ea, #7e22ce);
  color: #fff;
  box-shadow: var(--pub-btn-shadow);
}

.land-cta--ghost {
  background: rgb(255 255 255 / 70%);
  border: 1px solid #e6ddf0;
  color: var(--pub-ink-700);
}
</style>
