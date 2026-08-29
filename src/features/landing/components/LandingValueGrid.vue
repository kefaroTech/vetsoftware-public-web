<script setup lang="ts">
import { CalendarDays, ClipboardList, Package, Wallet } from 'lucide-vue-next'

/**
 * §B — «Lo que dejas de hacer a mano».
 *
 * El verbo es el de la clínica, no el de la plataforma: «gestión de módulos» no
 * le dice nada a una auxiliar; «la historia queda escrita» sí.
 *
 * Cada tarjeta es un `<article>` con su `<h3>` y **ningún enlace**. Ninguna
 * tarjeta de esta página es un enlace entero.
 */
const tarjetas = [
  {
    icon: CalendarDays,
    titulo: 'La agenda del día, sin llamadas cruzadas',
    texto:
      'Ves quién viene, a qué hora y con quién. Si el hueco ya está ocupado, la cita no se agenda.',
  },
  {
    icon: ClipboardList,
    titulo: 'La historia queda escrita',
    texto:
      'Lo que anotas en la consulta se guarda en la historia del paciente. Sin pasar nada a limpio después.',
  },
  {
    icon: Wallet,
    titulo: 'El mostrador cuadra',
    texto: 'Cobras, cierras caja y sabes qué entró. Con factura electrónica DIAN cuando toca.',
  },
  {
    icon: Package,
    titulo: 'El inventario avisa antes',
    texto: 'Sabes qué se está acabando antes de que se acabe delante del cliente.',
  },
]
</script>

<template>
  <section class="pub-section" aria-labelledby="valor-titulo">
    <div class="pub-section-head">
      <h2 id="valor-titulo">Lo que dejas de hacer a mano</h2>
    </div>

    <div class="land-value-grid">
      <article v-for="t in tarjetas" :key="t.titulo" class="land-value-card">
        <span class="land-value-chip">
          <component :is="t.icon" :size="19" :stroke-width="1.7" aria-hidden="true" />
        </span>
        <h3 class="land-value-title">{{ t.titulo }}</h3>
        <p class="land-value-text">{{ t.texto }}</p>
      </article>
    </div>
  </section>
</template>

<style scoped>
.land-value-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.land-value-card {
  padding: 24px 22px;
  border-radius: 14px;
  border: 1px solid var(--pub-line);
  background: var(--pub-surface);
  box-shadow: 0 8px 20px -16px rgb(91 33 182 / 20%);
}

.land-value-chip {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #f3e8ff, #e9d5ff);
  border: 1px solid #ecd9fb;
  color: var(--pub-ame-700);
}

.land-value-title {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.01em;
  margin: 14px 0 0;
  color: var(--pub-ink-900);
}

.land-value-text {
  font-size: 13.5px;
  line-height: 1.55;
  color: var(--pub-ink-600);
  margin: 7px 0 0;
}

@media (width <= 720px) {
  .land-value-grid {
    grid-template-columns: 1fr;
  }
}
</style>
