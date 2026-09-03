<script setup lang="ts">
/**
 * §B — el modelo modular, en cuatro frases.
 *
 * Cada tarjeta es un `<article>` con su `<h3>` y **ningún enlace**. Ninguna
 * tarjeta de esta página es un enlace entero.
 *
 * <p>La tercera tarjeta NO promete que dar de baja un módulo lo saque del
 * siguiente cobro: facturación no cumple hoy esa regla, y anunciarla es un
 * compromiso comercial que la plataforma no puede honrar. Lo mismo vale para
 * las respuestas 2 y 3 de `LandingFaq.vue`.
 */
const tarjetas = [
  {
    titulo: 'Pagas por módulo, no por plan',
    texto:
      'Cada módulo tiene su precio y su casilla. Si tu clínica no hospitaliza, no hay una línea de hospitalización en tu recibo.',
  },
  {
    titulo: 'Empiezas por dos y creces cuando toque',
    texto:
      'Muchas clínicas arrancan con agenda e historia clínica. El resto se enciende el mes que haga falta.',
  },
  {
    titulo: 'Quitar módulos no te cambia de plan',
    texto:
      'Si dejas de usar el spa en temporada baja, escríbenos y lo damos de baja. El resto de tu clínica sigue igual.',
  },
  {
    titulo: 'Nada agrupado a la fuerza',
    texto: 'No hay módulo que solo se venda acompañado de otros tres que no necesitas.',
  },
]
</script>

<template>
  <section class="pub-section" aria-labelledby="valor-titulo">
    <div class="pub-section-head">
      <h2 id="valor-titulo">Ni más ni menos de lo que necesitas</h2>
    </div>

    <div class="land-value-grid">
      <article v-for="t in tarjetas" :key="t.titulo" class="land-value-card">
        <h3 class="land-value-title">{{ t.titulo }}</h3>
        <p class="land-value-text">{{ t.texto }}</p>
      </article>
    </div>
  </section>
</template>

<style scoped>
.land-value-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.land-value-card {
  padding: 22px 20px;
  border-radius: 15px;
  border: 1px solid var(--pub-line);
  background: var(--pub-surface);
}

.land-value-title {
  margin: 0;
  font-size: 15.5px;
  font-weight: 600;
  line-height: 1.35;
  letter-spacing: -0.01em;
  color: var(--pub-ink-900);
}

.land-value-text {
  margin: 9px 0 0;
  font-size: 13.5px;
  line-height: 1.6;
  color: var(--pub-ink-600);
  text-wrap: pretty;
}

@media (width <= 720px) {
  .land-value-grid {
    grid-template-columns: 1fr;
  }
}
</style>
