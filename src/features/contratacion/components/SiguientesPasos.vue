<script setup lang="ts">
import { CalendarDays, Users, Wallet } from 'lucide-vue-next'
import { RouterLink } from 'vue-router'

/**
 * «Tres cosas que hacer ahora» — el bloque que convierte una compra en un uso.
 *
 * Es el paso que peor se resuelve siempre: se pone un «¡Gracias por tu compra!»
 * y se deja al usuario delante de una pantalla vacía. Un tablero vacío es la
 * peor primera pantalla posible después de contratar.
 *
 * Están en el orden en que una clínica arranca de verdad, y cada tarjeta es un
 * `<article>` con `<h3>` y **un solo** enlace, cuyo texto es la acción completa
 * («Invita a tu equipo»), no «Ir». Lo que NO va aquí: confeti, un contador de
 * días de prueba, y un botón «Ir al tablero» como única acción.
 */
const pasos = [
  {
    icon: Users,
    titulo: 'Invita a tu equipo',
    texto: 'Para que cada persona entre con su usuario',
    ruta: 'empleados',
  },
  {
    icon: CalendarDays,
    titulo: 'Crea tu primera cita',
    texto: 'La agenda del día empieza aquí',
    ruta: 'agenda',
  },
  {
    icon: Wallet,
    titulo: 'Configura tu caja',
    texto: 'Antes del primer cobro del mostrador',
    ruta: 'caja',
  },
]
</script>

<template>
  <div class="pasos">
    <article v-for="p in pasos" :key="p.titulo" class="ds-card pasos-card">
      <component :is="p.icon" :size="20" :stroke-width="1.7" aria-hidden="true" />
      <h3 class="pasos-title">{{ p.titulo }}</h3>
      <p class="ds-meta pasos-text">{{ p.texto }}</p>
      <RouterLink :to="{ name: p.ruta }" class="ds-btn ds-btn--ghost pasos-cta">
        {{ p.titulo }}
      </RouterLink>
    </article>
  </div>
</template>

<style scoped>
.pasos {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.pasos-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
}

.pasos-title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
}

.pasos-text {
  margin: 0;
}

.pasos-cta {
  margin-top: 6px;
  text-decoration: none;
}

@media (width <= 860px) {
  .pasos {
    grid-template-columns: 1fr;
  }
}
</style>
