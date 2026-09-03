<script setup lang="ts">
/**
 * §C — «Un día, de principio a fin».
 *
 * Es una lista ORDENADA de verdad (`<ol>`), no cuatro `<div>` con un número
 * dibujado: aquí el número es información —el orden de los pasos— y un lector de
 * pantalla tiene que poder anunciarlo. El marcador visible es un punto y no una
 * cifra, así que el orden viaja por el `<ol>` y por la hora, nunca por CSS.
 */
const pasos = [
  { hora: '8:00', titulo: 'Llega el primer paciente.', texto: 'Está en la agenda desde ayer.' },
  {
    hora: '8:15',
    titulo: 'La consulta.',
    texto: 'Anotas peso, motivo y tratamiento. La historia se escribe sola.',
  },
  {
    hora: '8:40',
    titulo: 'El cobro.',
    texto: 'La consulta pasa a la cuenta del propietario. Facturas si hace falta.',
  },
  {
    hora: '20:00',
    titulo: 'Cierras caja.',
    texto: 'Cuadra, porque nadie tuvo que apuntar nada en un papel.',
  },
]
</script>

<template>
  <section class="pub-section" aria-labelledby="dia-titulo">
    <div class="pub-section-head">
      <h2 id="dia-titulo">Un día, de principio a fin</h2>
    </div>

    <ol class="land-flow">
      <li v-for="p in pasos" :key="p.hora" class="land-flow-step">
        <p class="land-flow-hora">{{ p.hora }}</p>
        <p class="land-flow-titulo">{{ p.titulo }}</p>
        <p class="land-flow-text">{{ p.texto }}</p>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.land-flow {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 26px 0;
}

.land-flow-step {
  position: relative;
  padding: 18px 22px 0 0;
  border-top: 2px solid var(--pub-line-strong);
}

.land-flow-step::before {
  content: '';
  position: absolute;
  top: -5px;
  left: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--pub-ame-700);
}

.land-flow-hora {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: var(--pub-ame-700);
  font-variant-numeric: tabular-nums;
}

.land-flow-titulo {
  margin: 7px 0 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--pub-ink-900);
}

.land-flow-text {
  margin: 6px 0 0;
  font-size: 13.5px;
  line-height: 1.6;
  color: var(--pub-ink-600);
}

@media (width <= 720px) {
  .land-flow {
    grid-template-columns: 1fr;
  }
}
</style>
