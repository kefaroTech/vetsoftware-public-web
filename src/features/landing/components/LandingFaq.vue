<script setup lang="ts">
/**
 * §E — preguntas frecuentes.
 *
 * Seis `<details>`/`<summary>` NATIVOS. No es un acordeón a mano: el nativo trae
 * el teclado, el estado expandido y el anuncio del lector sin una línea de
 * JavaScript, y es lo que el APG recomienda para «Disclosure». Un acordeón
 * propio significaría escribir y mantener `aria-expanded`, `aria-controls`, el
 * manejo de Enter/Espacio y el orden de foco, para acabar en lo mismo.
 *
 * Ninguna respuesta promete «30 días»: la prueba vence POR LÍNEA y las fechas
 * reales se ven al contratar.
 */
const preguntas = [
  {
    q: '¿Tengo que poner una tarjeta para probarlo?',
    a: 'No. La prueba no pide datos de pago.',
  },
  {
    q: '¿Qué pasa cuando se acaba la prueba?',
    a: 'Te avisamos por correo antes. Cada módulo tiene su propia fecha, y las verás todas cuando contrates.',
  },
  { q: '¿Puedo cambiar de plan después?', a: 'Sí. Escríbenos y lo ajustamos.' },
  { q: '¿Sirve para varias sedes?', a: 'Sí. Las sedes se cuentan y se cobran por sede.' },
  { q: '¿Emite factura electrónica DIAN?', a: 'Sí, con tu resolución de facturación.' },
  {
    q: '¿Dónde están mis datos?',
    a: 'En Colombia, cifrados, y son tuyos. Puedes pedir que te los exportemos.',
  },
]
</script>

<template>
  <section class="pub-section" aria-labelledby="faq-titulo">
    <div class="pub-section-head">
      <h2 id="faq-titulo">Preguntas que nos hacen siempre</h2>
    </div>

    <div class="land-faq">
      <details v-for="p in preguntas" :key="p.q" class="land-faq-item">
        <summary class="land-faq-q">{{ p.q }}</summary>
        <p class="land-faq-a">{{ p.a }}</p>
      </details>
    </div>
  </section>
</template>

<style scoped>
.land-faq {
  max-width: 760px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.land-faq-item {
  border: 1px solid var(--pub-line);
  border-radius: 12px;
  background: var(--pub-surface);
  padding: 4px 18px;
}

/* 44 px de alto: el objetivo táctil de un desplegable en móvil no puede ser la
   altura de una línea de texto. */
.land-faq-q {
  display: flex;
  align-items: center;
  min-height: 48px;
  font-size: 14.5px;
  font-weight: 600;
  color: var(--pub-ink-900);
  cursor: pointer;
}

.land-faq-a {
  margin: 0 0 14px;
  font-size: 13.5px;
  line-height: 1.6;
  color: var(--pub-ink-600);
}
</style>
