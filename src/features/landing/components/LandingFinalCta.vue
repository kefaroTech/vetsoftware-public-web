<script setup lang="ts">
import { irAAncla } from '../composables/anclaConFoco'

/**
 * §F — el cierre.
 *
 * Una sola acción, la misma del hero: quien leyó la página entera no necesita
 * volver arriba. Sube por ancla y no por ruta a propósito —el cotizador está en
 * esta misma página—, así que navegar a `/planes` le costaría una carga entera
 * para llegar al mismo campo.
 */
</script>

<template>
  <section class="pub-section" aria-labelledby="cierre-titulo">
    <div class="land-cierre">
      <div class="pub-section-head">
        <h2 id="cierre-titulo">Marca lo tuyo. Deja el resto.</h2>
        <p>
          Empieza con dos módulos si eso es lo que usas y añade el resto cuando haga falta. La
          prueba corre por módulo y verás cada fecha antes de confirmar.
        </p>
      </div>
      <a href="#cotizador" class="land-cta" @click="irAAncla('cotizador', $event)">
        Armar mi propuesta
      </a>
    </div>
  </section>
</template>

<style scoped>
.land-cierre {
  padding: 52px 40px;
  border-radius: 20px;
  border: 1px solid var(--pub-tint-bd);
  background: linear-gradient(160deg, var(--pub-tint-50), var(--pub-tint-100));
  text-align: center;
}

.land-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 52px;
  padding: 0 30px;
  border-radius: 12px;
  background: linear-gradient(180deg, var(--pub-ame-600), var(--pub-ame-700));
  color: var(--pub-surface);
  font-size: 15.5px;
  font-weight: 600;
  text-decoration: none;
  box-shadow: var(--pub-btn-shadow);
}
</style>
