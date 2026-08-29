<script setup lang="ts">
/**
 * §C — «Un día, de principio a fin».
 *
 * Es una lista ORDENADA de verdad (`<ol>`), no cuatro `<div>` con un número
 * dibujado: aquí el número es información —el orden de los pasos— y un lector de
 * pantalla tiene que poder anunciarlo. El círculo numerado que se ve es el
 * marcador de la lista, estilizado con un contador CSS, así que el dato viaja
 * una sola vez.
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
        <p class="land-flow-head">
          <span class="land-flow-hora">{{ p.hora }}</span>
          <span class="land-flow-titulo">{{ p.titulo }}</span>
        </p>
        <p class="land-flow-text">{{ p.texto }}</p>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.land-flow {
  counter-reset: paso;
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
}

.land-flow-step {
  counter-increment: paso;
  position: relative;
  padding-top: 46px;
}

.land-flow-step::before {
  content: counter(paso);
  position: absolute;
  top: 0;
  left: 0;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--pub-ame-700);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
}

.land-flow-head {
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: baseline;
}

.land-flow-hora {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--pub-ame-700);
  font-variant-numeric: tabular-nums;
}

.land-flow-titulo {
  font-size: 14.5px;
  font-weight: 700;
  color: var(--pub-ink-900);
}

.land-flow-text {
  margin: 6px 0 0;
  font-size: 13px;
  line-height: 1.55;
  color: var(--pub-ink-600);
}

@media (width <= 900px) {
  .land-flow {
    grid-template-columns: 1fr;
    gap: 22px;
  }

  .land-flow-step {
    padding: 0 0 0 46px;
    min-height: 32px;
  }
}
</style>
